# order.order_items

## Columns

| Name | Type | Nullable | Default | PK |
|---|---|---|---|---|
| Id | uuid | NO | (none) | YES |
| OrderId | uuid | NO | (none) | NO |
| ProductId | uuid | NO | (none) | NO |
| Quantity | integer | NO | (none) | NO |
| CreatedAtUtc | timestamp with time zone | NO | (none) | NO |

## Indexes

| Name | Definition |
|---|---|
| IX_order_items_OrderId | CREATE INDEX "IX_order_items_OrderId" ON "order".order_items USING btree ("OrderId") |
| PK_order_items | CREATE UNIQUE INDEX "PK_order_items" ON "order".order_items USING btree ("Id") |

## Foreign Keys

| Constraint | Column | References |
|---|---|---|
| FK_order_items_orders_OrderId | OrderId | order.orders(Id) |
