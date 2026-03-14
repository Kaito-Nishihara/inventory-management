// ============================================================
// CPU 限界ストレステスト
// Docker の CPU 制約が本当に効いているかを検証する
//
// 実行例:
//   docker compose -f compose.yml -f compose.loadtest.yml \
//     --profile loadtest run --rm k6 run /scripts/stress.js
//
// 目的:
//   VU を段階的に増やし続けて、CPU 100% に張り付く瞬間を観測する。
//   別ターミナルで docker stats を眺めながら実行すると効果的。
// ============================================================

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// --- カスタムメトリクス ---
const errorRate = new Rate("error_rate");
const reqDuration = new Trend("req_duration", true);
const totalRequests = new Counter("total_requests");

// --- 環境変数 ---
const CATALOG_URL = __ENV.CATALOG_BASE_URL || "http://catalog-api:8080";
const IDENTITY_URL = __ENV.IDENTITY_BASE_URL || "http://identity-api:8080";

// --- テストオプション ---
// think time なし、VU を限界まで積み上げる
export const options = {
  scenarios: {
    // Catalog API に集中砲火（DB + CPU に最も負荷がかかる）
    catalog_stress: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 20 },   // ウォームアップ
        { duration: "20s", target: 50 },   // じわじわ
        { duration: "20s", target: 100 },  // 本格的に攻める
        { duration: "30s", target: 200 },  // 限界突破
        { duration: "30s", target: 300 },  // さらに上げる
        { duration: "1m", target: 300 },   // ピークを維持
        { duration: "20s", target: 0 },    // クールダウン
      ],
      exec: "hammerCatalog",
    },
    // Identity API にも並行して負荷をかける
    identity_stress: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 5 },
        { duration: "20s", target: 20 },
        { duration: "20s", target: 50 },
        { duration: "30s", target: 80 },
        { duration: "30s", target: 100 },
        { duration: "1m", target: 100 },
        { duration: "20s", target: 0 },
      ],
      exec: "hammerIdentity",
    },
  },
  // しきい値は設けない（目的は限界を見ることなので）
  thresholds: {},
};

// ============================================================
// Catalog API 集中砲火
// 検索 + ソート + ページネーションを思考時間なしで連打
// ============================================================
export function hammerCatalog() {
  const actions = [
    // キーワード検索（DBフルスキャン系）
    () => http.get(`${CATALOG_URL}/products?q=Product&pageSize=50`),
    () => http.get(`${CATALOG_URL}/products?q=Bulk&pageSize=50`),
    // ソート（ORDER BY 系）
    () => http.get(`${CATALOG_URL}/products?sort=-price&pageSize=50`),
    () => http.get(`${CATALOG_URL}/products?sort=name&pageSize=50`),
    // 大きいページ番号（OFFSET 系）
    () => http.get(`${CATALOG_URL}/products?page=${Math.floor(Math.random() * 500) + 1}&pageSize=50`),
    // カテゴリ一覧
    () => http.get(`${CATALOG_URL}/categories`),
    // 商品詳細（ID 直指定）
    () => {
      const listRes = http.get(`${CATALOG_URL}/products?pageSize=1`);
      if (listRes.status === 200) {
        const body = JSON.parse(listRes.body);
        if (body.items && body.items.length > 0) {
          return http.get(`${CATALOG_URL}/products/${body.items[0].id}`);
        }
      }
      return listRes;
    },
  ];

  // ランダムにアクションを選んで実行
  const action = actions[Math.floor(Math.random() * actions.length)];
  const res = action();

  totalRequests.add(1);
  reqDuration.add(res.timings.duration);
  errorRate.add(res.status !== 200);

  // 思考時間なし = CPU を休ませない
}

// ============================================================
// Identity API 集中砲火
// ユーザー登録 + ログインを連打（bcrypt/パスワードハッシュで CPU を焼く）
// ============================================================
export function hammerIdentity() {
  const email = `stress_${__VU}_${__ITER}_${Date.now()}@test.com`;
  const password = "StressTest1234Aa";

  // 登録（パスワードハッシュ生成 = CPU 負荷大）
  const regRes = http.post(
    `${IDENTITY_URL}/auth/register`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } }
  );
  totalRequests.add(1);
  reqDuration.add(regRes.timings.duration);

  if (regRes.status === 201) {
    // ログイン（パスワード検証 = CPU 負荷大）
    const loginRes = http.post(
      `${IDENTITY_URL}/auth/login`,
      JSON.stringify({ email, password }),
      { headers: { "Content-Type": "application/json" } }
    );
    totalRequests.add(1);
    reqDuration.add(loginRes.timings.duration);
    errorRate.add(loginRes.status !== 200);
  } else {
    errorRate.add(true);
  }

  // 思考時間なし
}
