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

test.skip("401時にrefreshして再試行し、操作を継続できる", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("inventory.jwt", "old-access-token")
    localStorage.setItem("inventory.refresh_token", "old-refresh-token")
  })

  let refreshCallCount = 0
  const newAccessToken = createJwt("admin")
  let productsGetCallCount = 0
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
    if (url.includes("/categories")) {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: "[]",
      })
      return
    }
    if (url.includes("/auth/refresh") && method === "POST") {
      refreshCallCount += 1
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
    if (url.includes("/products?") && method === "GET") {
      productsGetCallCount += 1
      const auth = route.request().headers()["authorization"]
      if (auth === `Bearer ${newAccessToken}`) {
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 }),
        })
        return
      }
      await route.fulfill({
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: "{}",
      })
      return
    }
    await route.continue()
  })

  await page.goto("/products")
  await expect(page.getByRole("heading", { name: "商品一覧" })).toBeVisible()
  await expect.poll(() => productsGetCallCount >= 2).toBeTruthy()
  await expect.poll(() => refreshCallCount >= 1).toBeTruthy()
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("inventory.refresh_token"))).toBe("new-refresh-token")
})

test.skip("refresh失敗時はログイン画面に遷移する", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("inventory.jwt", "old-access-token")
    localStorage.setItem("inventory.refresh_token", "expired-refresh-token")
  })

  let refreshCallCount = 0
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
    if (url.includes("/categories")) {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: "[]",
      })
      return
    }
    if (url.includes("/auth/refresh") && method === "POST") {
      refreshCallCount += 1
      await route.fulfill({
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: "{}",
      })
      return
    }
    if (url.includes("/products?") && method === "GET") {
      await route.fulfill({
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: "{}",
      })
      return
    }
    await route.continue()
  })

  await page.goto("/products")
  await expect.poll(() => page.url()).toContain("/login")
  await expect.poll(() => refreshCallCount >= 1).toBeTruthy()
  await expect(page.getByRole("button", { name: "ログインする" })).toBeVisible()
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("inventory.jwt"))).toBeNull()
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("inventory.refresh_token"))).toBeNull()
})
