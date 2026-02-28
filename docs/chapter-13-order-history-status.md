# 第13章: 注文履歴と注文状態表示

第12章でチェックアウト専用ページを実装しました。  
第13章では、購入後に注文状況を追えるように `注文履歴ページ` を追加します。

## 13-1. この章のゴール

- 注文履歴一覧を表示できる
- 注文詳細でステータスと明細を確認できる
- 空状態とAPIエラー状態を表示できる
- 単体テストとE2Eテストを追加する

## 13-2. 実装内容

### ルーティング追加

- `GET /orders` を使う `OrdersPage` を追加
- 画面ルート: `/orders`
- `Products` と `Checkout` のヘッダーから遷移可能

### 一覧と詳細

- 一覧カードに以下を表示
  - OrderId
  - 作成日時
  - ステータス（受付/出荷/完了/キャンセル）
  - 明細件数
- `詳細を表示` で `GET /orders/{id}` を実行
- 右カラムに注文詳細（ステータス・明細）を表示

### ステータス表示の整理

`orderStatus.ts` で API ステータス値を画面表示用に変換します。

- `accepted` -> `受付`
- `shipped` -> `出荷`
- `completed` -> `完了`
- `cancelled` -> `キャンセル`

未知ステータスは文字列をそのまま表示します。

### 空状態/エラー状態

- 一覧0件: `注文履歴はまだありません。`
- 一覧API失敗: `APIエラーが発生しました (xxx)`
- 詳細取得失敗: 赤系アラートで表示

## 13-3. 追加/更新ファイル

追加:

- `apps/web/src/pages/OrdersPage.tsx`
- `apps/web/src/features/order/types.ts`
- `apps/web/src/features/order/orderStatus.ts`
- `apps/web/src/features/order/orderStatus.test.ts`
- `apps/web/e2e/orders.spec.ts`

更新:

- `apps/web/src/routes/AppRouter.tsx`
- `apps/web/src/pages/ProductsPage.tsx`
- `apps/web/src/pages/CheckoutPage.tsx`

## 13-4. 動作確認ポイント

- `/orders` で注文履歴一覧が表示される
- ステータスが日本語ラベルで識別できる
- 一覧から詳細表示で明細確認できる
- 一覧API失敗時にエラー表示される

## 13-5. テスト

- Frontend Lint: `npm run lint`
- Frontend Unit Test: `npm run test:unit`
- Frontend E2E: `npm run test:e2e`

## 13-6. 関連Issue

- https://github.com/Kaito-Nishihara/inventory-management/issues/14
