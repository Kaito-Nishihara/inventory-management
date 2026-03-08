import { expect, test } from "@playwright/test"

function createJwt(role: "admin" | "user"): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payload = btoa(
    JSON.stringify({
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": role,
      sub: "2",
    }),
  )
  return `${header}.${payload}.signature`
}

test.describe.configure({ mode: "serial" })

test("401発生時でも商品一覧画面の表示を継続できる", async ({ page }) => {
  const oldAccessToken = "old-access-token"
  const newAccessToken = createJwt("admin")
  let productsGetCallCount = 0
  let categoriesGetCallCount = 0

  await page.route("**/*", async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (method === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      })
      return
    }

    if (url.includes("/auth/login") && method === "POST") {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          accessToken: oldAccessToken,
          refreshToken: "old-refresh-token",
        }),
      })
      return
    }

    if (url.includes("/auth/refresh") && method === "POST") {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          accessToken: newAccessToken,
          refreshToken: "new-refresh-token",
        }),
      })
      return
    }

    if (url.includes("/categories") && method === "GET") {
      categoriesGetCallCount += 1
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: "[]",
      })
      return
    }

    if (url.includes("/products?") && method === "GET") {
      productsGetCallCount += 1
      const auth = route.request().headers()["authorization"]
      if (auth === `Bearer ${oldAccessToken}`) {
        await route.fulfill({
          status: 401,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: "{}",
        })
        return
      }
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 }),
      })
      return
    }

    await route.continue()
  })

  await page.goto("/")
  await page.getByRole("button", { name: "ログインする" }).click()

  await expect(page.getByRole("heading", { name: "商品一覧" })).toBeVisible()
  await expect.poll(() => page.url()).toContain("/products")
  await expect.poll(() => categoriesGetCallCount).toBeGreaterThanOrEqual(1)
  await expect.poll(() => productsGetCallCount).toBeGreaterThanOrEqual(1)
})

test("認証失敗時はログイン画面に留まる", async ({ page }) => {
  await page.route("**/*", async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (method === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      })
      return
    }

    if (url.includes("/auth/login") && method === "POST") {
      await route.fulfill({
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: "{}",
      })
      return
    }

    await route.continue()
  })

  await page.goto("/")
  await page.getByLabel("メールアドレス").fill("invalid@test.com")
  await page.getByLabel("パスワード").fill("invalid")
  await page.getByRole("button", { name: "ログインする" }).click()

  await expect.poll(() => page.url()).toContain("/login")
  await expect(page.getByText("メールアドレスまたはパスワードが正しくありません。")).toBeVisible()
})
