# 第22章 入力バリデーションとProblemDetailsレスポンスを共通化する

## 目的
- 入力バリデーション失敗時の返却形式を統一する
- 業務エラー（競合・不正遷移など）も `ProblemDetails` で返却する
- 主要エラーコード一覧を明文化する

## 対応内容
1. `Backend.Validation` に共通エラーコード定義 `ApiErrorCodes` を追加
2. `ControllerBase` 用の `ToProblem(...)` 拡張を追加
3. `AddUnifiedApiValidation()` を `ValidationProblemDetails` 返却へ変更
   - `extensions.code = validation_error`
4. Catalog / Order / Identity のControllerエラー返却を `ProblemDetails` に統一
5. APIテストを追加・更新し、`code` を検証
6. 主要エラーコード一覧を `docs/api-error-codes.md` に追加

## 返却例
```json
{
  "type": "https://httpstatuses.com/409",
  "title": "Conflict",
  "status": 409,
  "code": "insufficient_available"
}
```

## 動作確認
- `dotnet test services/catalog/Catalog.Api.Tests/Catalog.Api.Tests.csproj`
- `dotnet test services/order/Order.Api.Tests/Order.Api.Tests.csproj --no-build`
- `dotnet test services/identity/Identity.Api.Tests/Identity.Api.Tests.csproj`

