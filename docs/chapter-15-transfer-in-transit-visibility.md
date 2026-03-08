# 第15章: 移動中在庫の可視化（In-Transit）

第14章で拠点間移動をステータス化しました。  
第15章では、運用判断に必要な「移動中在庫」をロケーション在庫APIと管理UIに追加します。

このリポジトリでは第15章を次の2ステップで実装しています。

- 15-A: 移動中在庫の可視化（In-Transit）
- 15-B: 管理者の商品管理UI（作成/更新/公開切替）

## 15-1. この章のゴール

- ロケーション在庫に `移動中出荷` / `移動中入荷` を表示できる
- 出荷済み（未入荷）の移動数量を在庫照会に反映できる
- 出荷確定直後と入荷確定直後で値が正しく変化する

## 15-2. 仕様

- 集計対象は `出荷済み` ステータスのみ
- `移動中出荷`: 対象ロケーションを移動元に持つ出荷済み数量の合計
- `移動中入荷`: 対象ロケーションを移動先に持つ出荷済み数量の合計
- `移動指示` と `取消` と `入荷済み` は移動中在庫に含めない

## 15-3. API変更

- `GET /admin/inventory/{productId}/location-stocks`
  - 追加フィールド:
    - `inTransitOut`
    - `inTransitIn`

## 15-4. UI変更

- 管理画面 `/admin/inventory`
  - ロケーション合計行に移動中集計を表示
  - 各ロケーション行に `移動中出荷/移動中入荷` を表示

## 15-5. テスト観点

- 出荷確定後:
  - 移動元 `onHand` 減少
  - 移動元 `inTransitOut` 増加
  - 移動先 `inTransitIn` 増加
- 入荷確定後:
  - 移動先 `onHand` 増加
  - `inTransitOut/inTransitIn` が双方 0 に戻る

## 15-6. 追加対応（管理者の商品管理UI）

第15章の実運用拡張として、管理者が商品マスタを運用できる画面を追加しました。

- 画面ルート: `/admin/products`（admin ロール限定）
- 操作: 商品作成 / 商品更新 / 公開・非公開切替
- API: `GET /admin/products`, `POST /admin/products`, `PUT /admin/products/{id}`, `POST /admin/products/{id}/publish`
- エラー表示: `403` / `409` / `404` / バリデーションエラーをUI表示
- テスト: Unit + E2E + Catalog API テストを追加

## 15-7. 関連Issue

- https://github.com/Kaito-Nishihara/inventory-management/issues/18

## 15-8. 対応PR

- 移動中在庫の可視化: https://github.com/Kaito-Nishihara/inventory-management/pull/43
- 管理者の商品管理UI: https://github.com/Kaito-Nishihara/inventory-management/pull/46
