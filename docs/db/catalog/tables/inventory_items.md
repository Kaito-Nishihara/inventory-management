# catalog.inventory_items

## Columns

| Name | Type | Nullable | Default | PK |
|---|---|---|---|---|
| ProductId | uuid | NO | (none) | YES |
| OnHand | integer | NO | (none) | NO |
| Reserved | integer | NO | (none) | NO |
| Version | integer | NO | (none) | NO |
| UpdatedAtUtc | timestamp with time zone | NO | (none) | NO |

## Indexes

| Name | Definition |
|---|---|
| PK_inventory_items | CREATE UNIQUE INDEX "PK_inventory_items" ON catalog.inventory_items USING btree ("ProductId") |

## Foreign Keys

| Constraint | Column | References |
|---|---|---|
| FK_inventory_items_products_ProductId | ProductId | catalog.products(Id) |
