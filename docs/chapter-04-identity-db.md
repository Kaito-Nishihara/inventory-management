# 第4章 Identity をDB連携する（User保存 / パスワードハッシュ / EF Core）

第3章では JWT とロール境界を作りました。  
第4章では Identity を「固定ユーザー判定」から「DB連携 + ハッシュ検証」に進化させます。

## 4-1. この章のゴール

- ユーザーをDBに保存する
- パスワードをハッシュ化して保存する
- EF Core で `identity` スキーマを導入する
- 認証ロジックをオブジェクト指向で分離する

## 4-2. アーキテクチャ方針（OOP）

第4章では、Controller にビジネスロジックを持たせず、責務を分けます。

- `Controller`: HTTP入出力だけ
- `Application`: 認証ユースケース（Register/Login）
- `Domain`: `User` の状態と振る舞い
- `Infrastructure`: DBアクセス（Repository）と JWT 発行（TokenService）

構成イメージ:

```text
AuthController
  -> IAuthService (Application)
      -> IUserRepository (Infrastructure)
      -> IPasswordHasher<User>
      -> ITokenService (Infrastructure)
```

## 4-3. 依存パッケージ

`services/identity/Identity.Api/Identity.Api.csproj`

```xml
<ItemGroup>
  <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="10.0.3" />
  <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="9.0.1" />
  <PackageReference Include="Microsoft.EntityFrameworkCore.InMemory" Version="9.0.1" />
  <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="9.0.4" />
  <PackageReference Include="System.IdentityModel.Tokens.Jwt" Version="8.14.0" />
</ItemGroup>
```

用途:

- `Npgsql.EntityFrameworkCore.PostgreSQL`: PostgreSQL接続
- `Microsoft.EntityFrameworkCore.Design`: マイグレーション
- `Microsoft.EntityFrameworkCore.InMemory`: テスト用DB

## 4-4. Domain: User エンティティ

`User` はプロパティだけでなく、生成・正規化・状態変更の振る舞いを持ちます。

```csharp:User.cs
public class User
{
    public Guid Id { get; private set; }
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public string Role { get; private set; } = "user";

    public static User Create(string email, string role = "user") { ... }
    public static string NormalizeEmail(string email) { ... }
    public void SetPasswordHash(string passwordHash) { ... }
}
```

これでメール正規化やハッシュ設定ルールが散らばりません。

## 4-5. Infrastructure: DbContext（identity schema）

`IdentityDbContext` で `identity.users` を管理します。

```csharp:IdentityDbContext.cs
modelBuilder.HasDefaultSchema("identity");
modelBuilder.Entity<User>(entity =>
{
    entity.ToTable("users");
    entity.HasIndex(x => x.Email).IsUnique();
});
```

## 4-6. Application: AuthService

`AuthService` が Register/Login のユースケースを担当します。

```csharp:AuthService.cs
public class AuthService : IAuthService
{
    public async Task<RegisterResult> RegisterAsync(RegisterCommand command, CancellationToken ct = default)
    {
        var normalizedEmail = User.NormalizeEmail(command.Email);
        if (await _userRepository.ExistsByEmailAsync(normalizedEmail, ct))
            return new RegisterResult(RegisterStatus.Conflict);

        var user = User.Create(normalizedEmail, "user");
        user.SetPasswordHash(_passwordHasher.HashPassword(user, command.Password));
        await _userRepository.AddAsync(user, ct);
        return new RegisterResult(RegisterStatus.Created, user.Id);
    }

    public async Task<LoginResult?> LoginAsync(LoginCommand command, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByEmailAsync(User.NormalizeEmail(command.Email), ct);
        if (user is null) return null;

        var verify = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, command.Password);
        if (verify == PasswordVerificationResult.Failed) return null;

        return new LoginResult(_tokenService.Generate(user));
    }
}
```

## 4-7. Controller は薄く保つ

`AuthController` は `IAuthService` を呼ぶだけにします。

```csharp:AuthController.cs
[HttpPost("register")]
public async Task<IActionResult> Register(RegisterRequest request, CancellationToken ct)
{
    var result = await _authService.RegisterAsync(new RegisterCommand(request.Email, request.Password), ct);
    if (result.Status == RegisterStatus.Conflict) return Conflict("Email already exists");
    return CreatedAtAction(nameof(Register), new { userId = result.UserId }, null);
}
```

この形にすると、HTTP仕様変更があってもユースケース本体へ影響しにくくなります。

## 4-8. Program.cs のDI登録

`Program.cs` では層ごとの依存を明示します。

```csharp:Program.cs
builder.Services.AddDbContext<IdentityDbContext>(...);
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
```

さらに起動時に DB 初期化 + 初期ユーザー seed を行います。

## 4-9. パスワードハッシュの考え方

`IPasswordHasher<User>` を使います。

- 登録時: `HashPassword`
- ログイン時: `VerifyHashedPassword`

平文比較をしないことで、DB漏えい時の被害を抑えられます。

## 4-10. 動作確認ポイント

- `POST /auth/register` で新規作成できる
- DB の `identity.users` に保存される
- `PasswordHash` が平文ではない
- `POST /auth/login` で JWT が返る
- 第3章の Catalog 管理者APIがロール制御を維持する

## 4-11. xUnit テスト（実装反映済み）

Identity のテストは `WebApplicationFactory` + InMemory DB で検証します。

- `Register_StoresHashedPassword_AndLoginReturnsJwt`
- `Login_WithInvalidCredentials_ReturnsUnauthorized`

Catalog 側のロール制御テスト（401/403/200）は第3章のまま継続利用します。

実行:

```bash
dotnet test inventory-management.sln
```

## 4-12. この章で得られるメリット

- 認証データが永続化される
- パスワードの取り扱いが安全になる
- 認証ロジックの責務が分離され、保守しやすくなる
- 次章で refresh token や監査ログへ拡張しやすい

## 対応PR

- https://github.com/Kaito-Nishihara/inventory-management/pull/1
