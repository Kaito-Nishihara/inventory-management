import { expect, test } from "@playwright/test"

function createJwt(role: "admin" | "user"): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payload = btoa(
    JSON.stringify({
      role,
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": role,
      sub: "2",
    }),
  )
  return `${header}.${payload}.signature`
}

test("login succeeds and stores jwt in localStorage", async ({ page }) => {
  const token = createJwt("admin")
  await page.route("**://localhost:5001/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ accessToken: token, refreshToken: "refresh-token" }),
    })
  })
  await page.route("**://localhost:5002/categories", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })
  await page.route("**://localhost:5002/products?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 }),
    })
  })

  await page.goto("/")

  await page.getByRole("button", { name: "ログインする" }).click()

  await expect(page.getByRole("heading", { name: "商品一覧" })).toBeVisible()

  const savedToken = await page.evaluate(() => localStorage.getItem("inventory.jwt"))
  expect(savedToken).toBeTruthy()
})

test("login fails with invalid credentials", async ({ page }) => {
  await page.route("**://localhost:5001/auth/login", async (route) => {
    await route.fulfill({ status: 401, contentType: "application/json", body: "{}" })
  })

  await page.goto("/")

  await page.getByLabel("メールアドレス").fill("invalid@test.com")
  await page.getByLabel("パスワード").fill("invalid")
  await page.getByRole("button", { name: "ログインする" }).click()

  await expect(page.getByText("メールアドレスまたはパスワードが正しくありません。")).toBeVisible()
  const token = await page.evaluate(() => localStorage.getItem("inventory.jwt"))
  expect(token).toBeNull()
})
