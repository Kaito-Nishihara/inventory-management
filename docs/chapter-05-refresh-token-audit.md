# 第5章 セッション強化（Refresh Token / 失効 / 監査ログ）

第4章では DB連携ログインまで実装しました。  
第5章では、セッション運用で必要になる次の3点を追加します。

- Refresh Token の発行
- Refresh Token の失効（revoke）
- 認証イベントの監査ログ保存

## 5-1. この章のゴール

- `POST /auth/login` で `accessToken + refreshToken` を返す
- `POST /auth/refresh` でトークン再発行できる
- `POST /auth/revoke` で refresh token を失効できる
- `identity.auth_audit_logs` に認証イベントを保存する

## 5-2. Domain モデルを追加

リフレッシュトークンと監査ログをエンティティ化します。

```csharp:RefreshToken.cs
public class RefreshToken
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string TokenHash { get; private set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; private set; }
    public DateTime? RevokedAtUtc { get; private set; }

    public static RefreshToken Create(Guid userId, string tokenHash, DateTime expiresAtUtc) { ... }
    public bool IsActive(DateTime nowUtc) { ... }
    public void Revoke(DateTime nowUtc, string? replacedByTokenHash = null) { ... }
}
```

```csharp:AuthAuditLog.cs
public class AuthAuditLog
{
    public Guid Id { get; private set; }
    public Guid? UserId { get; private set; }
    public string Action { get; private set; } = string.Empty;
    public bool Success { get; private set; }
    public string? Detail { get; private set; }
}
```

## 5-3. DbContext と Repository

`IdentityDbContext` にテーブルを追加します。

```csharp:IdentityDbContext.cs
public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
public DbSet<AuthAuditLog> AuthAuditLogs => Set<AuthAuditLog>();
```

Repository は責務ごとに分離します。

- `IRefreshTokenRepository`
- `IAuthAuditLogRepository`

## 5-4. TokenService を拡張

アクセストークンだけでなく、refresh token 生成とハッシュ化を追加します。

```csharp:ITokenService.cs
string GenerateAccessToken(User user);
string GenerateRefreshToken();
string HashToken(string token);
```

## 5-5. AuthService にユースケース追加

`IAuthService` を次の形へ拡張します。

```csharp:IAuthService.cs
Task<AuthTokensResult?> LoginAsync(LoginCommand command, CancellationToken cancellationToken = default);
Task<AuthTokensResult?> RefreshAsync(RefreshCommand command, CancellationToken cancellationToken = default);
Task<bool> RevokeAsync(RevokeCommand command, CancellationToken cancellationToken = default);
```

実装ポイント:

- login 成功時に refresh token を生成してハッシュ保存
- refresh 時に旧トークンを revoke し、新トークンを発行（ローテーション）
- revoke 時にトークンを無効化
- login/refresh/revoke の成功/失敗を監査ログへ保存

## 5-6. AuthController にAPI追加

```csharp:AuthController.cs
[HttpPost("refresh")]
public async Task<ActionResult<AuthTokensResponse>> Refresh([FromBody] RefreshRequest request, CancellationToken cancellationToken)
{
    ...
}

[HttpPost("revoke")]
public async Task<IActionResult> Revoke([FromBody] RevokeRequest request, CancellationToken cancellationToken)
{
    ...
}
```

## 5-7. Program.cs のDI登録

```csharp:Program.cs
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<IAuthAuditLogRepository, AuthAuditLogRepository>();
builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
```

## 5-8. テスト（4章対応を含む）

Identity 統合テスト:

- register でユーザー作成できる
- DBに保存され、`PasswordHash` が平文でない
- login で `accessToken + refreshToken` 取得できる
- refresh -> revoke -> refresh で最後は `401` になる

Catalog 統合テスト（継続）:

- 未認証 `401`
- user ロール `403`
- admin ロール `200`

実行:

```bash
dotnet test inventory-management.sln
```

## 対応PR

- https://github.com/Kaito-Nishihara/inventory-management/pull/2
