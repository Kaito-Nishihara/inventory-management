# identity.users

## Columns

| Name | Type | Nullable | Default | PK |
|---|---|---|---|---|
| Id | uuid | NO | (none) | YES |
| Email | character varying(256) | NO | (none) | NO |
| PasswordHash | text | NO | (none) | NO |
| Role | character varying(32) | NO | (none) | NO |
| CreatedAtUtc | timestamp with time zone | NO | (none) | NO |

## Indexes

| Name | Definition |
|---|---|
| IX_users_Email | CREATE UNIQUE INDEX "IX_users_Email" ON identity.users USING btree ("Email") |
| PK_users | CREATE UNIQUE INDEX "PK_users" ON identity.users USING btree ("Id") |

## Foreign Keys

| Constraint | Column | References |
|---|---|---|
| (none) | (none) | (none) |
