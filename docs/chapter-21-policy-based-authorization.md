# 第21章 認可モデルをPolicyベースへ移行し権限表を固定する

## 背景
`[Authorize(Roles = "admin")]` のようなロール文字列直書きは、API追加時や将来の権限拡張時に破綻しやすくなります。  
この章では、API境界の認可を Policy へ統一し、権限表を固定します。

## 目的
- Policy定義を導入する
- 各APIにPolicyを適用する
- 権限マトリクスをドキュメント化する
- 回帰テストで境界を固定する

## 実装内容
1. 共通ロール定数 `AppRoles` を追加（`admin`, `user`）
2. 各サービスにPolicy定義を追加
   - Catalog: `catalog.admin`
   - Order: `orders.read`, `orders.manage`
   - Identity: `identity.auth-audit.read`
3. `Program.cs` の `AddAuthorization` でPolicy登録
4. Controllerの `[Authorize]` を `Policy` 指定に置換
5. Order APIに回帰テストを追加
   - `user` が `/admin/orders/{id}/status` へアクセスすると `403 Forbidden`

## 権限マトリクス
| サービス | API | Policy | 許可ロール |
|---|---|---|---|
| Catalog | `/admin/products/**` | `catalog.admin` | `admin` |
| Catalog | `/admin/inventory/**` | `catalog.admin` | `admin` |
| Order | `/orders/**` | `orders.read` | 認証済みユーザー（`user`, `admin`） |
| Order | `/admin/orders/**` | `orders.manage` | `admin` |
| Identity | `/admin/auth-audit-logs` | `identity.auth-audit.read` | `admin` |

## 動作確認
- `dotnet test services/catalog/Catalog.Api.Tests/Catalog.Api.Tests.csproj` : 成功
- `dotnet test services/order/Order.Api.Tests/Order.Api.Tests.csproj` : 成功
- `dotnet test services/identity/Identity.Api.Tests/Identity.Api.Tests.csproj` : 成功

