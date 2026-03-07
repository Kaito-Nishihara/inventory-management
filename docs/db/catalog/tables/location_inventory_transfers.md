# catalog.location_inventory_transfers

## Columns

| Name | Type | Nullable | Default | PK |
|---|---|---|---|---|
| Id | uuid | NO | (none) | YES |
| ProductId | uuid | NO | (none) | NO |
| FromLocationId | uuid | NO | (none) | NO |
| ToLocationId | uuid | NO | (none) | NO |
| Quantity | integer | NO | (none) | NO |
| Note | character varying(512) | YES | (none) | NO |
| CreatedAtUtc | timestamp with time zone | NO | (none) | NO |
| ReceivedAtUtc | timestamp with time zone | YES | (none) | NO |
| ShippedAtUtc | timestamp with time zone | YES | (none) | NO |
| Status | character varying(20) | NO | '移動指示'::character varying | NO |

## Indexes

| Name | Definition |
|---|---|
| IX_location_inventory_transfers_CreatedAtUtc | CREATE INDEX "IX_location_inventory_transfers_CreatedAtUtc" ON catalog.location_inventory_transfers USING btree ("CreatedAtUtc") |
| IX_location_inventory_transfers_FromLocationId | CREATE INDEX "IX_location_inventory_transfers_FromLocationId" ON catalog.location_inventory_transfers USING btree ("FromLocationId") |
| IX_location_inventory_transfers_ProductId | CREATE INDEX "IX_location_inventory_transfers_ProductId" ON catalog.location_inventory_transfers USING btree ("ProductId") |
| IX_location_inventory_transfers_Status | CREATE INDEX "IX_location_inventory_transfers_Status" ON catalog.location_inventory_transfers USING btree ("Status") |
| IX_location_inventory_transfers_ToLocationId | CREATE INDEX "IX_location_inventory_transfers_ToLocationId" ON catalog.location_inventory_transfers USING btree ("ToLocationId") |
| PK_location_inventory_transfers | CREATE UNIQUE INDEX "PK_location_inventory_transfers" ON catalog.location_inventory_transfers USING btree ("Id") |

## Foreign Keys

| Constraint | Column | References |
|---|---|---|
| (none) | (none) | (none) |
