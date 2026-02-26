# 第9章 フロントログイン画面とOpenAPI連携

第8章まででバックエンドの認証・在庫・注文の基盤が整いました。  
この章では、フロントエンドから `Identity API` に接続し、**ログインUI + JWT取得** を実装します。

## 9-1. この章のゴール

- ログイン画面を実装する
- `Identity API` の `/auth/login` を OpenAPI クライアント経由で呼び出す
- JWT を `localStorage` に保存する
- 成功 / 失敗状態をUIに反映する
- 単体テストとE2Eを追加する

## 9-2. なぜ OpenAPI 連携にするのか

フロントから直接 `fetch` を書く方式は、API変更時に型ズレが起きやすくなります。  
本章では **OpenAPI -> SDK生成** を使い、契約を型で固定します。

- 契約変更を型エラーで検知できる
- リクエスト/レスポンスの実装ブレを減らせる
- フロントとバックエンドの境界を明確に保てる

## 9-3. SDK生成（@hey-api/openapi-ts）

`apps/web` で OpenAPI からクライアントを生成します。

```ts:apps/web/openapi-ts.config.ts
import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  input: "http://localhost:5001/openapi/v1.json",
  output: "src/api/identity",
  plugins: ["@hey-api/client-fetch"],
})
```

`package.json` に生成コマンドを追加:

```json:apps/web/package.json
{
  "scripts": {
    "openapi:identity": "openapi-ts"
  }
}
```

## 9-4. ログイン画面の実装

`App.tsx` で OpenAPI 生成SDKの `postAuthLogin` を呼び出します。

```tsx:apps/web/src/App.tsx
const { data, error: responseError, response } = await postAuthLogin({
  body: { email, password },
})

if (response?.status === 401) {
  throw new Error("メールアドレスまたはパスワードが正しくありません。")
}

if (!response?.ok || responseError) {
  throw new Error(`ログインに失敗しました (${response?.status ?? "unknown"})`)
}

localStorage.setItem("inventory.jwt", data.accessToken)
```

UIはコンポーネント分割しています。

- `LoginHeader`
- `LoginPresetButtons`
- `LoginForm`
- `LoginAlerts`
- `LoginFooterHints`

## 9-5. CORS対応（Identity API）

フロント(`http://localhost:3000`)からの呼び出しを許可します。

```csharp:services/identity/Identity.Api/Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins("http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

app.UseCors("Frontend");
```

## 9-6. テスト戦略（単体 + E2E）

### 単体テスト（Vitest）

`App.test.tsx` で次を検証:

- 成功時: JWT保存 + 成功メッセージ表示
- 401時: エラーメッセージ表示 + JWT未保存

```bash
cd apps/web
npm run test:unit
```

### E2E（Playwright）

`e2e/login.spec.ts` で次を検証:

- 正常ログイン
- 不正ログイン

```bash
cd apps/web
npm run test:e2e
```

## 9-7. Dockerでの動作確認

```bash
docker compose up -d --build
```

確認ポイント:

- `http://localhost:3000` でログイン画面表示
- `POST /auth/login` 成功時に `inventory.jwt` が保存される
- 不正資格情報でエラー表示される

## 9-8. まとめ

この章で、フロントの認証入口を実装し、OpenAPI契約に基づいた安全なAPI連携に移行しました。  
次章以降は、この認証基盤の上で `Catalog / Order` の画面導線を拡張していきます。

## 対応PR

- https://github.com/Kaito-Nishihara/inventory-management/pull/10
