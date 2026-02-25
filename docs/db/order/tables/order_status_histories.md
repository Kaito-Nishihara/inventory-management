# order.order_status_histories

## Columns

| Name | Type | Nullable | Default | PK |
|---|---|---|---|---|
| Id | uuid | NO | (none) | YES |
| OrderId | uuid | NO | (none) | NO |
| Status | character varying(32) | NO | (none) | NO |
| Note | character varying(256) | NO | (none) | NO |
| CreatedAtUtc | timestamp with time zone | NO | (none) | NO |

## Indexes

| Name | Definition |
|---|---|
| IX_order_status_histories_OrderId | CREATE INDEX "IX_order_status_histories_OrderId" ON "order".order_status_histories USING btree ("OrderId") |
| PK_order_status_histories | CREATE UNIQUE INDEX "PK_order_status_histories" ON "order".order_status_histories USING btree ("Id") |

## Foreign Keys

| Constraint | Column | References |
|---|---|---|
| FK_order_status_histories_orders_OrderId | OrderId | order.orders(Id) |
