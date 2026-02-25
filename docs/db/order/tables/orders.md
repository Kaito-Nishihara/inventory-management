# order.orders

## Columns

| Name | Type | Nullable | Default | PK |
|---|---|---|---|---|
| Id | uuid | NO | (none) | YES |
| UserId | character varying(128) | NO | (none) | NO |
| Status | character varying(32) | NO | (none) | NO |
| CreatedAtUtc | timestamp with time zone | NO | (none) | NO |
| UpdatedAtUtc | timestamp with time zone | NO | (none) | NO |

## Indexes

| Name | Definition |
|---|---|
| PK_orders | CREATE UNIQUE INDEX "PK_orders" ON "order".orders USING btree ("Id") |

## Foreign Keys

| Constraint | Column | References |
|---|---|---|
| (none) | (none) | (none) |
