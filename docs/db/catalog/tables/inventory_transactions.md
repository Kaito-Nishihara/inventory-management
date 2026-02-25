# catalog.inventory_transactions

## Columns

| Name | Type | Nullable | Default | PK |
|---|---|---|---|---|
| Id | uuid | NO | (none) | YES |
| ProductId | uuid | NO | (none) | NO |
| Type | character varying(32) | NO | (none) | NO |
| QuantityDelta | integer | NO | (none) | NO |
| OnHandAfter | integer | NO | (none) | NO |
| ReservedAfter | integer | NO | (none) | NO |
| Note | character varying(512) | YES | (none) | NO |
| CreatedAtUtc | timestamp with time zone | NO | (none) | NO |

## Indexes

| Name | Definition |
|---|---|
| IX_inventory_transactions_CreatedAtUtc | CREATE INDEX "IX_inventory_transactions_CreatedAtUtc" ON catalog.inventory_transactions USING btree ("CreatedAtUtc") |
| IX_inventory_transactions_ProductId | CREATE INDEX "IX_inventory_transactions_ProductId" ON catalog.inventory_transactions USING btree ("ProductId") |
| PK_inventory_transactions | CREATE UNIQUE INDEX "PK_inventory_transactions" ON catalog.inventory_transactions USING btree ("Id") |

## Foreign Keys

| Constraint | Column | References |
|---|---|---|
| (none) | (none) | (none) |
