# 第2章 開発基盤を固める（Compose / 疎通 / 監視）

第1章で「何を作るか（要件）」と「どう分けるか（アーキテクチャ）」を固定しました。  
第2章では、実装に入る前に **迷わない開発の土台** を作ります。

この章のゴールは次の3つです。

- リポジトリ構成を決める（どこに何があるか）
- ローカル開発環境を起動できる（`PostgreSQL` / 各サービス）
- フロントから`API`に繋がる状態を作る（疎通まで）

## 2-1. 採用構成（現時点）

- Frontend: React + Tailwind CSS（Vite）
- Backend: .NET 10 Web API（Identity / Catalog / Order）
- DB: PostgreSQL 16
- Monitoring: Uptime Kuma（ローカル監視）
- 起動方式: Docker Compose

## 2-2. リポジトリ構成（Monorepo）

今回は 1つのリポジトリにフロントとバックエンドをまとめます。  
下記のような構成で作成します。

```plaintext
inventory-management/
├─ apps/
│  └─ web/
│
├─ services/
│  ├─ identity/
│  │  └─ Identity.Api/
│  ├─ catalog/
│  │  └─ Catalog.Api/
│  └─ order/
│     └─ Order.Api/
│
├─ infra/
├─ compose.yml
├─ inventory-management.sln
└─ .gitignore
```

- Domain：ルール（在庫計算・状態遷移など）
- Application：ユースケース（注文作成、在庫引当など）
- Infrastructure：DBや外部I/O（EF Core、Postgres）
- Api：HTTP/gRPCの入口

## 2-3. Docker Compose

[compose.yml](https://github.com/Kaito-Nishihara/inventory-management/blob/main/compose.yml) で以下を起動する。

- web
- identity-api
- catalog-api
- order-api
- postgres
- kuma（監視UI）

起動：

```bash
docker compose up -d
```

確認：

```bash
docker ps
```

起動できていることを確認できました。

```plaintext
PS C:\github\inventory-management> docker ps
CONTAINER ID   IMAGE                               COMMAND                   CREATED              STATUS                        PORTS                    NAMES
55fb63f6d272   inventory-management-web            "docker-entrypoint.s…"   About a minute ago   Up About a minute             0.0.0.0:3000->3000/tcp   inv-web
bc5863fba3b2   louislam/uptime-kuma:1              "/usr/bin/dumb-init …"   About a minute ago   Up About a minute (healthy)   0.0.0.0:3001->3001/tcp   inv-kuma
7f04f20511a9   inventory-management-order-api      "dotnet Order.Api.dll"   About a minute ago   Up About a minute             0.0.0.0:5003->8080/tcp   inv-order-api
fa2afa99cc86   inventory-management-identity-api   "dotnet Identity.Api…"   About a minute ago   Up About a minute             0.0.0.0:5001->8080/tcp   inv-identity-api
b7be7fdd3809   inventory-management-catalog-api    "dotnet Catalog.Api.…"   About a minute ago   Up About a minute             0.0.0.0:5002->8080/tcp   inv-catalog-api
4f4224927014   postgres:16                         "docker-entrypoint.s…"   About a minute ago   Up About a minute             0.0.0.0:5432->5432/tcp   inv-postgres
```

## 2-4. ヘルスチェックと監視

ここまでで `docker compose up -d` により

- Web
- 3つのAPI
- PostgreSQL
- Uptime Kuma

が起動できました。

しかし、実務で「起動できた」だけでは不十分です。

- 本当に動いているのか？
- 落ちたら気づけるのか？
- 依存先（DB）に繋がっているのか？

を 常に確認できる仕組み が必要になります。

そこで、各APIに `/health` を用意し、`Uptime Kuma` で監視しています。

各APIのProgram.csにヘルスチェック用のエンドポイントを追加します。

```csharp:Program.cs
app.MapGet("/health", () => Results.Ok("Healthy"))
    .WithName("Health");
```

## 2-5. まとめ

この章では、実装に入る前の「土台」を固定しました。

- リポジトリ構成（Monorepo構成）
- 起動方式（Docker Compose）
- ローカル開発環境（PostgreSQL + 各API + Web）
- 監視導入（Uptime Kuma）
- ヘルスチェック（/health）

次章ではいよいよ、

- `Identity Service`
- JWTログイン
- ユーザー / 管理者のロール管理

を実装し、システムに認証機能を追加します。

## 対応PR

- 未作成（この章単体のPRなし）
