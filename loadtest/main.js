// ============================================================
// k6 負荷テストスクリプト
// Azure App Service Standard プラン擬似環境向け
//
// 実行例:
//   docker compose -f compose.yml -f compose.loadtest.yml \
//     --profile loadtest run --rm k6 run /scripts/main.js
//
// テストシナリオ:
//   1. browse  : 商品一覧・詳細の閲覧 (読み取り中心)
//   2. search  : 商品検索 + カテゴリ絞り込み
//   3. order   : ログイン → 商品取得 → 注文作成 (書き込み)
// ============================================================

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// --- カスタムメトリクス ---
const errorRate = new Rate("error_rate");
const loginDuration = new Trend("login_duration", true);
const catalogDuration = new Trend("catalog_duration", true);
const orderDuration = new Trend("order_duration", true);

// --- 環境変数 ---
const IDENTITY_URL = __ENV.IDENTITY_BASE_URL || "http://identity-api:8080";
const CATALOG_URL = __ENV.CATALOG_BASE_URL || "http://catalog-api:8080";
const ORDER_URL = __ENV.ORDER_BASE_URL || "http://order-api:8080";

// --- テストオプション ---
// 段階的に負荷を上げるステージ構成
export const options = {
  scenarios: {
    // シナリオ 1: 商品閲覧 (全体の 60%)
    browse: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },  // ウォームアップ
        { duration: "1m", target: 30 },   // 徐々に上げる
        { duration: "2m", target: 50 },   // ピーク
        { duration: "30s", target: 0 },   // クールダウン
      ],
      exec: "browseProducts",
    },
    // シナリオ 2: 商品検索 (全体の 25%)
    search: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 5 },
        { duration: "1m", target: 15 },
        { duration: "2m", target: 25 },
        { duration: "30s", target: 0 },
      ],
      exec: "searchProducts",
    },
    // シナリオ 3: 注文フロー (全体の 15%)
    order: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 2 },
        { duration: "1m", target: 5 },
        { duration: "2m", target: 10 },
        { duration: "30s", target: 0 },
      ],
      exec: "orderFlow",
    },
  },
  thresholds: {
    // SLA 基準
    http_req_duration: ["p(95)<2000", "p(99)<5000"],  // 95%ile < 2s, 99%ile < 5s
    error_rate: ["rate<0.1"],                          // エラー率 10% 未満
    catalog_duration: ["p(95)<1500"],                  // カタログ API 95%ile < 1.5s
    order_duration: ["p(95)<3000"],                    // 注文 API 95%ile < 3s
  },
};

// --- ヘルパー関数 ---

// JSON POST リクエスト用ヘッダー
function jsonHeaders(token) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return { headers };
}

// ユーザー登録 + ログインしてトークンを取得
function loginAsTestUser(vuId) {
  const email = `loadtest_vu${vuId}_${Date.now()}@test.com`;
  const password = "LoadTest1234Aa";

  // 登録
  http.post(
    `${IDENTITY_URL}/auth/register`,
    JSON.stringify({ email, password }),
    jsonHeaders()
  );

  // ログイン
  const loginRes = http.post(
    `${IDENTITY_URL}/auth/login`,
    JSON.stringify({ email, password }),
    jsonHeaders()
  );

  loginDuration.add(loginRes.timings.duration);

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    return body.accessToken;
  }

  return null;
}

// 在庫のある商品をランダムに取得
function getAvailableProductId(token) {
  // ランダムなページから取得して分散させる
  const randomPage = Math.floor(Math.random() * 10) + 1;
  const res = http.get(
    `${CATALOG_URL}/products?page=${randomPage}&pageSize=20`,
    jsonHeaders(token)
  );

  if (res.status === 200) {
    const body = JSON.parse(res.body);
    if (body.items && body.items.length > 0) {
      // available > 0 の商品を探す
      const available = body.items.filter((p) => p.available > 0);
      if (available.length > 0) {
        return available[Math.floor(Math.random() * available.length)].id;
      }
      // なければ先頭を返す（409 になるが許容）
      return body.items[0].id;
    }
  }
  return null;
}

// ============================================================
// シナリオ 1: 商品閲覧
// ============================================================
export function browseProducts() {
  group("商品一覧の閲覧", () => {
    // ページ 1
    const listRes = http.get(`${CATALOG_URL}/products?page=1&pageSize=20`);
    catalogDuration.add(listRes.timings.duration);

    const listOk = check(listRes, {
      "商品一覧: ステータス 200": (r) => r.status === 200,
      "商品一覧: items が存在": (r) => {
        const body = JSON.parse(r.body);
        return body.items && body.items.length > 0;
      },
    });
    errorRate.add(!listOk);

    // レスポンスから商品IDを取得して詳細を見る
    if (listRes.status === 200) {
      const body = JSON.parse(listRes.body);
      if (body.items && body.items.length > 0) {
        // ランダムな商品の詳細を閲覧
        const randomProduct =
          body.items[Math.floor(Math.random() * body.items.length)];
        const detailRes = http.get(
          `${CATALOG_URL}/products/${randomProduct.id}`
        );
        catalogDuration.add(detailRes.timings.duration);

        const detailOk = check(detailRes, {
          "商品詳細: ステータス 200": (r) => r.status === 200,
        });
        errorRate.add(!detailOk);
      }

      // ページネーション: ランダムなページを閲覧
      if (body.totalPages > 1) {
        const randomPage =
          Math.floor(Math.random() * Math.min(body.totalPages, 50)) + 1;
        const pageRes = http.get(
          `${CATALOG_URL}/products?page=${randomPage}&pageSize=20`
        );
        catalogDuration.add(pageRes.timings.duration);
        errorRate.add(pageRes.status !== 200);
      }
    }
  });

  // カテゴリ一覧
  group("カテゴリ一覧の閲覧", () => {
    const catRes = http.get(`${CATALOG_URL}/categories`);
    catalogDuration.add(catRes.timings.duration);

    const catOk = check(catRes, {
      "カテゴリ一覧: ステータス 200": (r) => r.status === 200,
    });
    errorRate.add(!catOk);
  });

  sleep(Math.random() * 2 + 1); // 1〜3秒の思考時間
}

// ============================================================
// シナリオ 2: 商品検索
// ============================================================
const searchTerms = ["Product", "Item", "Test", "Sample", "Bulk"];

export function searchProducts() {
  group("商品検索", () => {
    // キーワード検索
    const keyword = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    const searchRes = http.get(
      `${CATALOG_URL}/products?q=${encodeURIComponent(keyword)}&pageSize=20`
    );
    catalogDuration.add(searchRes.timings.duration);

    const searchOk = check(searchRes, {
      "検索: ステータス 200": (r) => r.status === 200,
    });
    errorRate.add(!searchOk);
  });

  group("カテゴリ絞り込み", () => {
    // まずカテゴリ一覧を取得
    const catRes = http.get(`${CATALOG_URL}/categories`);
    if (catRes.status === 200) {
      const categories = JSON.parse(catRes.body);
      if (categories.length > 0) {
        const randomCat =
          categories[Math.floor(Math.random() * categories.length)];
        // カテゴリIDで絞り込み
        const filterRes = http.get(
          `${CATALOG_URL}/products?categoryId=${randomCat.id}&pageSize=20`
        );
        catalogDuration.add(filterRes.timings.duration);

        const filterOk = check(filterRes, {
          "カテゴリ絞り込み: ステータス 200": (r) => r.status === 200,
        });
        errorRate.add(!filterOk);
      }
    }
  });

  group("ソート", () => {
    const sortOptions = ["name", "-name", "price", "-price"];
    const sort = sortOptions[Math.floor(Math.random() * sortOptions.length)];
    const sortRes = http.get(
      `${CATALOG_URL}/products?sort=${sort}&pageSize=20`
    );
    catalogDuration.add(sortRes.timings.duration);
    errorRate.add(sortRes.status !== 200);
  });

  sleep(Math.random() * 2 + 1);
}

// ============================================================
// シナリオ 3: 注文フロー (ログイン → 商品取得 → 注文)
// ============================================================
export function orderFlow() {
  let token = null;

  group("ログイン", () => {
    token = loginAsTestUser(__VU);
    const loginOk = check(token, {
      "ログイン成功": (t) => t !== null,
    });
    errorRate.add(!loginOk);
  });

  if (!token) {
    sleep(1);
    return;
  }

  let productId = null;

  group("商品選択", () => {
    productId = getAvailableProductId(token);
    const productOk = check(productId, {
      "商品取得成功": (id) => id !== null,
    });
    errorRate.add(!productOk);
  });

  if (!productId) {
    sleep(1);
    return;
  }

  group("注文作成", () => {
    const orderRes = http.post(
      `${ORDER_URL}/orders`,
      JSON.stringify({
        productId: productId,
        quantity: 1,
      }),
      jsonHeaders(token)
    );
    orderDuration.add(orderRes.timings.duration);

    // 201 = 注文成功、409 = 在庫切れ（正常系として扱う）
    const orderOk = check(orderRes, {
      "注文: 正常応答 (201 or 409)": (r) =>
        r.status === 201 || r.status === 409,
    });
    errorRate.add(!orderOk);

    // 注文成功時は注文一覧を確認
    if (orderRes.status === 201) {
      const ordersRes = http.get(`${ORDER_URL}/orders`, jsonHeaders(token));
      orderDuration.add(ordersRes.timings.duration);

      check(ordersRes, {
        "注文一覧: ステータス 200": (r) => r.status === 200,
      });
    }
  });

  sleep(Math.random() * 3 + 2); // 2〜5秒の思考時間
}
