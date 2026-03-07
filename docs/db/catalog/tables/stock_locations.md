# catalog.stock_locations

## Columns

| Name | Type | Nullable | Default | PK |
|---|---|---|---|---|
| Id | uuid | NO | (none) | YES |
| Code | character varying(50) | NO | (none) | NO |
| Name | character varying(100) | NO | (none) | NO |
| Type | character varying(50) | NO | (none) | NO |
| IsActive | boolean | NO | (none) | NO |
| CreatedAtUtc | timestamp with time zone | NO | (none) | NO |

## Indexes

| Name | Definition |
|---|---|
| IX_stock_locations_Code | CREATE UNIQUE INDEX "IX_stock_locations_Code" ON catalog.stock_locations USING btree ("Code") |
| PK_stock_locations | CREATE UNIQUE INDEX "PK_stock_locations" ON catalog.stock_locations USING btree ("Id") |

## Foreign Keys

| Constraint | Column | References |
|---|---|---|
| (none) | (none) | (none) |
