# 第11章: Catalog商品一覧/詳細APIのフロント実装（検索・ソート・カテゴリ）

第10章で商品一覧〜カート〜注文の最小導線を実装しました。  
第11章では、商品数が増えても使える一覧体験を実装します。

## 11-1. この章のゴール

- 商品詳細API（`GET /products/{id}`）をフロントで利用する
- 商品一覧に検索・ソート・カテゴリ絞り込みを追加する
- フィルタ状態をURLクエリに保存し、再読み込み時も復元する
- 条件0件時の空状態UIを表示する
- フィルタロジックの単体テストを追加する

## 11-2. 実装ポイント

### カテゴリをDBマスタ化

カテゴリはフロントで推定せず、Catalog DBのマスタから取得します。

- テーブル: `catalog.categories`
- 商品: `catalog.products.category_id`（FK）
- API: `GET /categories`

フロントは `GET /categories` の結果をフィルタUIに反映し、  
カテゴリ名変更や追加をコード変更なしで運用できるようにします。

### 一覧フィルタ

- キーワード検索: `q`
- ソート: `sort`
  - `name-asc`
  - `price-asc`
  - `price-desc`
  - `stock-desc`
  - `newest`
- カテゴリ: `category`
  - `all`
  - `peripherals`
  - `display`
  - `other`

### URLクエリ同期

`useSearchParams` で一覧状態を管理し、
共有URL・再読込復元を可能にしています。

### 商品詳細画面

- ルート: `/products/:productId`
- API: `GET /products/{id}`
- 一覧へ戻る時はクエリを維持

## 11-3. 追加した主なファイル

- `apps/web/src/features/catalog/types.ts`
- `apps/web/src/features/catalog/productFilters.ts`
- `apps/web/src/features/catalog/productFilters.test.ts`
- `apps/web/src/pages/ProductDetailPage.tsx`

更新:

- `apps/web/src/pages/ProductsPage.tsx`
- `apps/web/src/routes/AppRouter.tsx`

## 11-4. 動作確認ポイント

- 一覧で検索/ソート/カテゴリ絞り込みが動作する
- URLクエリをコピーして開くと同じ表示状態になる
- 商品詳細に遷移できる
- 詳細から一覧に戻るとフィルタ状態が保持される
- 条件0件時に空状態UIが表示される

## 11-5. テスト

- Frontend Lint: `npm run lint`
- Frontend Unit Test: `npm run test:unit`

## 11-6. 関連Issue

- https://github.com/Kaito-Nishihara/inventory-management/issues/12
