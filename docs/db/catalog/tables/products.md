# catalog.products

## Columns

| Name | Type | Nullable | Default | PK |
|---|---|---|---|---|
| Id | uuid | NO | (none) | YES |
| Name | character varying(200) | NO | (none) | NO |
| Description | character varying(2000) | NO | (none) | NO |
| Price | numeric(18,2) | NO | (none) | NO |
| IsPublished | boolean | NO | (none) | NO |
| CreatedAtUtc | timestamp with time zone | NO | (none) | NO |
| UpdatedAtUtc | timestamp with time zone | NO | (none) | NO |
| CategoryId | uuid | NO | '33333333-3333-3333-3333-333333333333'::uuid | NO |

## Indexes

| Name | Definition |
|---|---|
| IX_products_CategoryId | CREATE INDEX "IX_products_CategoryId" ON catalog.products USING btree ("CategoryId") |
| PK_products | CREATE UNIQUE INDEX "PK_products" ON catalog.products USING btree ("Id") |

## Foreign Keys

| Constraint | Column | References |
|---|---|---|
| FK_products_categories_CategoryId | CategoryId | catalog.categories(Id) |
