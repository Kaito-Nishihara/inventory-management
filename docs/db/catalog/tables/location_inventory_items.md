# catalog.location_inventory_items

## Columns

| Name | Type | Nullable | Default | PK |
|---|---|---|---|---|
| Id | uuid | NO | (none) | YES |
| ProductId | uuid | NO | (none) | NO |
| LocationId | uuid | NO | (none) | NO |
| OnHand | integer | NO | (none) | NO |
| Version | integer | NO | (none) | NO |
| UpdatedAtUtc | timestamp with time zone | NO | (none) | NO |

## Indexes

| Name | Definition |
|---|---|
| IX_location_inventory_items_LocationId | CREATE INDEX "IX_location_inventory_items_LocationId" ON catalog.location_inventory_items USING btree ("LocationId") |
| IX_location_inventory_items_ProductId | CREATE INDEX "IX_location_inventory_items_ProductId" ON catalog.location_inventory_items USING btree ("ProductId") |
| IX_location_inventory_items_ProductId_LocationId | CREATE UNIQUE INDEX "IX_location_inventory_items_ProductId_LocationId" ON catalog.location_inventory_items USING btree ("ProductId", "LocationId") |
| PK_location_inventory_items | CREATE UNIQUE INDEX "PK_location_inventory_items" ON catalog.location_inventory_items USING btree ("Id") |

## Foreign Keys

| Constraint | Column | References |
|---|---|---|
| (none) | (none) | (none) |
