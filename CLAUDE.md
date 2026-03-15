# CLAUDE.md — inventory-management

## プロジェクト概要
React + .NET 10 + PostgreSQL のマイクロサービス構成による在庫管理システム。
Docker Compose でローカル開発を行い、GitHub Actions で CI を回す。

## ディレクトリ構成
```
apps/web/                  … React フロントエンド（Vite + TypeScript）
services/
  identity/Identity.Api/   … 認証・ユーザー管理
  catalog/Catalog.Api/     … 商品・在庫管理（gRPC サーバー）
  order/Order.Api/         … 注文管理（gRPC クライアント）
  common/Backend.Validation/ … 共通バリデーション・認証ライブラリ
tests/
  Chapter7.E2E.Tests/      … E2E テスト（C#）
docs/                      … 章ごとのドキュメント + DB スキーマ自動生成
loadtest/                  … k6 負荷テストスクリプト
scripts/                   … DB ドキュメント生成等のユーティリティ
infra/                     … Terraform 構成
```

## 技術スタック
| レイヤー | 技術 | バージョン |
|---------|------|-----------|
| フロントエンド | React + Vite + TypeScript | React 19, Vite 8, TS 5.9 |
| バックエンド | ASP.NET Core | .NET 10 |
| DB | PostgreSQL + EF Core | PostgreSQL 16, EF Core 9 |
| gRPC | Grpc.AspNetCore | 2.71.0 |
| テスト（バックエンド） | xUnit | 2.9.3 |
| テスト（フロント） | Vitest + Playwright | — |
| CI | GitHub Actions | — |

## Docker Compose
| サービス | コンテナ名 | ポート | 用途 |
|---------|-----------|--------|------|
| web | inv-web | 3000 | フロントエンド |
| identity-api | inv-identity-api | 5001 | 認証 API |
| catalog-api | inv-catalog-api | 5002 (REST) / 5004 (gRPC) | 商品・在庫 API |
| order-api | inv-order-api | 5003 | 注文 API |
| postgres | inv-postgres | 5432 | データベース |
| kuma | inv-kuma | 3001 | Uptime Kuma（ヘルスチェック監視） |

```bash
# 通常起動
docker compose up -d --build

# 負荷テスト（S1 相当: 1コア / 1.75GB）
docker compose -f compose.yml -f compose.loadtest.yml up -d --build

# S2 相当
APP_CPUS=2 APP_MEMORY=3.5g docker compose -f compose.yml -f compose.loadtest.yml up -d
```

## .NET サービスの内部構造（共通パターン）
```
ServiceName.Api/
├─ Application/      … サービス層（ユースケース、ドメインごとに分割）
├─ Domain/           … エンティティ、集約
├─ Infrastructure/   … DbContext、リポジトリ、マイグレーション、外部クライアント
├─ Controllers/      … REST エンドポイント
├─ Grpc/             … gRPC サービス実装
├─ Security/         … 認可ポリシー、JWT 設定
├─ Protos/           … gRPC proto 定義
└─ Program.cs        … DI・ミドルウェア構成
```

## フロントエンドの内部構造
```
apps/web/src/
├─ api/              … OpenAPI 生成クライアント + HTTP ユーティリティ
├─ components/       … 再利用可能な UI コンポーネント
├─ features/         … 機能ごとのロジック（auth, catalog, inventory, order）
├─ pages/            … ルートページ
├─ routes/           … ルーティング設定
├─ stories/          … Storybook ストーリー
└─ test/             … テストユーティリティ
```

## データベース
- 全サービスで 1 つの PostgreSQL データベース `invdb` を共有し、スキーマで分離
- 各サービスの DbContext: `Infrastructure/` 配下
- マイグレーションは起動時に `db.Database.MigrateAsync()` で自動適用
- 接続文字列: `ConnectionStrings__IdentityDb` / `CatalogDb` / `OrderDb`

## gRPC 通信
- Catalog API が gRPC サーバー（ポート 8081）、Order API がクライアント
- Proto 定義: `services/catalog/Catalog.Api/Protos/inventory.proto`
- メソッド: `Reserve()` / `Release()`（在庫引当・解放）

## OpenAPI / SDK 生成
- 各サービスが `MapOpenApi()` でスペックを公開（Development 環境のみ）
- SDK 生成: `@hey-api/openapi-ts`（`npm run openapi:identity`）
- 生成先: `apps/web/src/api/identity/`

## テスト実行
```bash
# バックエンド（Docker 経由）
docker compose --profile test run --rm test-runner

# バックエンド（直接）
dotnet test inventory-management.sln

# フロント単体テスト
cd apps/web && npm run test:unit

# フロント E2E
cd apps/web && npm run test:e2e
```

## CI（GitHub Actions）
- **ci.yml**: Web（lint → test → build）→ .NET（restore → test）→ E2E
- **db-docs.yml**: マイグレーション適用 → `docs/db/` にスキーマドキュメント自動生成 → auto-commit

## 命名規則
- **ブランチ**: `chapter-XX-<topic>`（例: `chapter-22-unified-problem-details`）
- **コミットメッセージ**: 日本語で内容を記述
- **CI 自動コミット**: `docs(db): ... [skip ci]`
- **C# クラス**: PascalCase、インターフェースは `I` プレフィックス
- **C# 非同期メソッド**: `Async` サフィックス（例: `GetActiveListAsync`）
- **DTO**: `sealed record` を使用
- **フロント**: ファイル名 camelCase、コンポーネント PascalCase

## 認証・認可
- JWT Bearer 認証（開発用秘密鍵はハードコード）
- Policy ベース認可（`CatalogPolicies.CatalogAdmin` 等）
- 共通バリデーション: `Backend.Validation` の `AddUnifiedApiValidation()` 拡張

## Issue 管理
- `chapter:XX` ラベルで章番号を紐付け
- `area:*` ラベルで領域を分類（frontend, authz, validation 等）
- 受け入れ条件はチェックボックス形式で記載

## 負荷テスト
- `compose.loadtest.yml` で CPU / メモリ制約を付与
- k6 スクリプト: `loadtest/main.js`（通常負荷）、`loadtest/stress.js`（ストレス）
- 実行: `./loadtest/run.sh [s1|s2|s3]`

## Agent Teams（並列開発）
本プロジェクトは Claude Code Agent Teams による並列開発に対応している。

### チーム構成
| ロール | 担当領域 | 対象ディレクトリ |
|--------|---------|-----------------|
| Lead | 全体統括・統合・コンフリクト解決 | 全体 |
| Backend | .NET サービス実装（Identity, Catalog, Order） | `services/` |
| Frontend | React UI・コンポーネント・ルーティング | `apps/web/src/` |
| QA | テスト（単体・E2E・負荷） | `apps/web/e2e/`, `tests/`, `loadtest/` |

### ファイル割り当てルール
- **Backend** は `services/` 配下のみ編集可能
- **Frontend** は `apps/web/src/` 配下のみ編集可能
- **QA** は テスト関連ファイルのみ編集可能
- **共通ファイル**（`CLAUDE.md`, `compose.yml`, `.github/`）は **Lead のみ** が編集
- `services/common/Backend.Validation/` は Backend が編集し、Lead がレビュー

### 並列開発の進め方
1. Lead が Issue/タスクを分析し、Backend・Frontend・QA に作業を割り当てる
2. 各 Teammate が担当ディレクトリ内で独立して実装する
3. Lead が結果を統合し、コンフリクトがあれば解決する
4. Lead が `dotnet test` と `npm run test:unit` で統合テストを実行する

### 注意事項
- 同一ファイルを複数 Teammate が編集しないこと
- gRPC Proto 定義（`Protos/`）の変更は Backend が行い、Lead が統合する
- DB マイグレーションは 1 Teammate のみが作成する（競合防止）
- コミットメッセージ・コード中コメントは日本語で書くこと
