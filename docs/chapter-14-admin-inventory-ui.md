# 第14章: ロケーション在庫管理（倉庫・店舗連携）

第13章までの「商品単位在庫」に加えて、第14章では「どこの拠点に何個あるか」を扱うロケーション在庫を導入します。

## 14-1. この章のゴール

- ロケーションマスタ（倉庫 / 店舗 / 仕掛 / 返品）を扱える
- 商品ごとのロケーション在庫を参照できる
- 倉庫→店舗の拠点間移動をステータス管理できる
- 移動履歴を参照できる

## 14-2. 実装内容

### バックエンド（Catalog API）

- `GET /admin/inventory/locations`
  - 有効ロケーション一覧
- `GET /admin/inventory/{productId}/location-stocks`
  - 商品別のロケーション在庫
- `POST /admin/inventory/transfers`
  - 移動指示を作成（移動元/移動先/数量/メモ）
- `POST /admin/inventory/transfers/{transferId}/ship`
  - 移動指示を出荷済みに更新（この時点で移動元在庫を減算）
- `POST /admin/inventory/transfers/{transferId}/receive`
  - 出荷済みを入荷済みに更新（この時点で移動先在庫を加算）
- `POST /admin/inventory/transfers/{transferId}/cancel`
  - 移動指示を取消
- `GET /admin/inventory/{productId}/transfers?take=10`
  - 商品別の移動履歴（ステータス: `移動指示` / `出荷済み` / `入荷済み` / `取消`）

### フロントエンド（Admin UI）

- 画面ルート: `/admin/inventory`（admin ロール限定）
- 画面構成:
  - 商品選択
  - ロケーション在庫表示
  - 倉庫→店舗の移動指示フォーム
  - 移動履歴

## 14-3. 追加/更新ファイル

更新:

- `services/catalog/Catalog.Api/Application/Inventory/*`
- `services/catalog/Catalog.Api/Controllers/AdminInventoryController.cs`
- `services/catalog/Catalog.Api/Infrastructure/CatalogSeed.cs`
- `services/catalog/Catalog.Api/Infrastructure/Repositories/LocationInventoryRepository.cs`
- `services/catalog/Catalog.Api/Program.cs`
- `apps/web/src/pages/AdminInventoryPage.tsx`
- `apps/web/src/routes/AppRouter.tsx`
- `apps/web/src/features/inventory/types.ts`
- `apps/web/e2e/admin-inventory.spec.ts`
- `services/catalog/Catalog.Api.Tests/CatalogApiTests.cs`

## 14-4. 動作確認ポイント

- admin で `/admin/inventory` にアクセスできる
- user で `/admin/inventory` は `/products` へ遷移する
- 商品選択でロケーション別在庫が表示される
- 移動指示作成では在庫が即時に動かない
- 出荷確定で移動元在庫が減る
- 入荷確定で移動先在庫が増える
- 移動履歴に記録が表示される
