# inventory-management

React + .NET 10 + PostgreSQL で構成した、在庫管理を題材にしたサンプルシステムです。  
ユーザー向け購入導線と、管理者向けの商品/在庫/注文運用を段階的に実装しています。

- English: [README.en.md](README.en.md)

## 技術スタック

- Frontend: React (Vite) + Tailwind CSS
- Backend: .NET 10 Web API
- Database: PostgreSQL 16
- Auth: JWT (Identity Service)
- Inter-service: gRPC (Order -> Catalog)
- Infra: Docker Compose
- Monitoring (local): Uptime Kuma

## リポジトリ構成

```text
inventory-management/
├─ apps/
│  └─ web/                    # React frontend
├─ services/
│  ├─ identity/Identity.Api/  # 認証・ユーザー管理
│  ├─ catalog/Catalog.Api/    # 商品・在庫管理
│  └─ order/Order.Api/        # 注文管理
├─ tests/
│  └─ Chapter7.E2E.Tests/     # E2Eテスト
├─ scripts/                   # 補助スクリプト（E2E, DB docs生成など）
├─ docs/                      # 各章ドキュメント / DB定義書
├─ compose.yml
└─ inventory-management.sln
```

## 起動方法

```bash
docker compose up -d --build
```

主なエンドポイント:

- Web: `http://localhost:3000`
- Identity API: `http://localhost:5001`
- Catalog API: `http://localhost:5002`
- Order API: `http://localhost:5003`
- Uptime Kuma: `http://localhost:3001`

## テスト

### .NET テスト

```bash
docker compose --profile test run --rm test-runner
```

### フロント単体テスト

```bash
cd apps/web
npm run test:unit
```

### フロントE2E

```bash
cd apps/web
npm run test:e2e
```

## DB定義書の自動生成

GitHub Actions `db-docs` で PostgreSQL から定義書を生成します。

- 出力先: `docs/db/`
- 形式:
  - テーブル定義: `docs/db/{schema}/tables/*.md`
  - ER図 (DBML): `docs/db/{schema}/er.dbml`

## 章ドキュメント

- [第10章: Catalog/Order連携のフロント導線追加](docs/chapter-10-frontend-catalog-order-flow.md)
