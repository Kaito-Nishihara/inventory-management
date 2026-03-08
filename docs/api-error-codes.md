# APIエラーコード一覧

全APIのエラーは `ProblemDetails` 形式で返却し、`extensions.code` にアプリケーション固有コードを格納します。

## 形式
- HTTP Status: `4xx/5xx`
- Body: `application/problem+json`
- 主要フィールド:
  - `type`
  - `title`
  - `status`
  - `detail`（必要時）
  - `code`（`extensions.code`）
  - `errors`（バリデーション時）

## コード一覧
- `validation_error`
- `duplicate_email`
- `invalid_credentials`
- `invalid_or_expired_refresh_token`
- `product_not_found`
- `order_not_found`
- `invalid_quantity`
- `invalid_request`
- `invalid_status`
- `invalid_transition`
- `invalid_on_hand`
- `insufficient_available`
- `insufficient_stock`
- `version_conflict`
- `concurrency_conflict`
- `inventory_release_failed`
- `transfer_not_found`
- `location_not_found`

