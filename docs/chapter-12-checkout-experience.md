# 第12章: チェックアウト専用ページ化と体験強化（注文サマリー/再試行/結果表示）

第11章で商品一覧の探索体験を強化しました。  
第12章では、注文確定時のUXを実務向けに改善します。

## 12-1. この章のゴール

- 注文導線を `商品一覧` と `チェックアウト` で分離する
- 複数商品の注文結果を商品単位で表示する
- 成功/失敗/処理中を明確に表示する
- 失敗商品のみ再試行できるようにする
- 成功分のみカートから除外する
- 注文前サマリー（点数/合計金額/明細）を表示する

## 12-2. 実装内容

### チェックアウト専用ページ化

ECサイトと同様に、`/products` は商品閲覧とカート投入に限定し、  
注文確定処理は `/checkout` に集約しました。

- `/products`: 商品検索・絞り込み・カート追加
- `/checkout`: 数量調整・削除・合計金額表示・注文確定・再試行

これにより、画面責務が明確になり、今後の配送先入力や決済追加も拡張しやすくなります。

### 注文結果の可視化

チェックアウト後に、商品ごとの結果を表示します。

- `processing`: 注文処理中
- `success`: 注文作成成功
- `failed`: 注文失敗（例: 在庫不足）

結果は `productId` 単位で管理し、メッセージも個別表示します。

### 失敗商品のみ再試行

直前結果から `failed` な商品IDだけ抽出し、
再試行ボタンでその商品だけ再度 `POST /orders` を実行します。

### カート後処理

- 成功した商品: カートから除外
- 失敗した商品: カートに残す

これにより一部失敗時も、ユーザーは失敗分だけ再対応できます。

## 12-3. 追加した主なファイル

- `apps/web/src/pages/CheckoutPage.tsx`
- `apps/web/src/features/order/checkoutSummary.ts`
- `apps/web/src/features/order/checkoutSummary.test.ts`

更新:

- `apps/web/src/routes/AppRouter.tsx`
- `apps/web/src/pages/ProductsPage.tsx`
- `apps/web/src/App.test.tsx`

## 12-4. 動作確認ポイント

- `/products` から `/checkout` に遷移して注文できる
- `/checkout` で数量変更/削除/合計金額が確認できる
- 複数商品の注文時、商品ごとの成功/失敗が見える
- 注文中は `処理中` として表示される
- 一部失敗時に `失敗分のみ再試行` ができる
- 成功分だけカートから消え、失敗分は残る

## 12-5. テスト

- Frontend Lint: `npm run lint`
- Frontend Unit Test: `npm run test:unit`
- Frontend E2E: `npm run test:e2e`

## 12-6. 関連Issue

- https://github.com/Kaito-Nishihara/inventory-management/issues/13
