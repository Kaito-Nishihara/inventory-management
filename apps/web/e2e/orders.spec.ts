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

test.beforeEach(async ({ page }) => {
  await page.addInitScript((token) => {
    localStorage.setItem("inventory.jwt", token)
  }, createJwt("admin"))
})

test("orders page shows history and detail with status labels", async ({ page }) => {
  await page.route("**://localhost:5003/orders", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "3d6f0d63-2f9a-4f27-b25b-53bc41f04001",
          userId: "2",
          status: "accepted",
          createdAtUtc: "2026-02-27T10:00:00Z",
          updatedAtUtc: "2026-02-27T10:00:00Z",
          items: [{ productId: "f4458e4c-9f68-45ea-9052-7f21b6771001", quantity: 2 }],
          statusHistories: [
            { id: "h-1", status: "accepted", note: "order_created", createdAtUtc: "2026-02-27T10:00:00Z" },
          ],
        },
      ]),
    })
  })

  await page.route("**://localhost:5003/orders/3d6f0d63-2f9a-4f27-b25b-53bc41f04001", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "3d6f0d63-2f9a-4f27-b25b-53bc41f04001",
        userId: "2",
        status: "shipped",
        createdAtUtc: "2026-02-27T10:00:00Z",
        updatedAtUtc: "2026-02-27T11:00:00Z",
        items: [{ productId: "f4458e4c-9f68-45ea-9052-7f21b6771001", quantity: 2 }],
        statusHistories: [
          { id: "h-1", status: "accepted", note: "order_created", createdAtUtc: "2026-02-27T10:00:00Z" },
          { id: "h-2", status: "shipped", note: "status_changed", createdAtUtc: "2026-02-27T11:00:00Z" },
        ],
      }),
    })
  })

  await page.goto("/orders")
  await expect(page.getByRole("heading", { name: "注文履歴" })).toBeVisible()
  await expect(page.getByText("受付")).toBeVisible()
  await page.getByRole("button", { name: "詳細を表示" }).click()
  await expect(page.getByText("ステータス")).toBeVisible()
  await expect(page.getByText("出荷")).toBeVisible()
  await expect(page.getByText("変更履歴")).toBeVisible()
  await expect(page.getByText("メモ: status_changed")).toBeVisible()
})

test("orders page shows error state when list api fails", async ({ page }) => {
  await page.route("**://localhost:5003/orders", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: "{}",
    })
  })

  await page.goto("/orders")
  await expect(page.getByText("APIエラーが発生しました (500)")).toBeVisible()
})

test("admin は注文ステータスを更新できる", async ({ page }) => {
  const orderId = "3d6f0d63-2f9a-4f27-b25b-53bc41f04002"

  await page.route("**://localhost:5003/orders", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: orderId,
          userId: "2",
          status: "accepted",
          createdAtUtc: "2026-02-27T10:00:00Z",
          updatedAtUtc: "2026-02-27T10:00:00Z",
          items: [{ productId: "f4458e4c-9f68-45ea-9052-7f21b6771001", quantity: 2 }],
          statusHistories: [
            { id: "h-1", status: "accepted", note: "order_created", createdAtUtc: "2026-02-27T10:00:00Z" },
          ],
        },
      ]),
    })
  })

  await page.route(`**://localhost:5003/orders/${orderId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: orderId,
        userId: "2",
        status: "accepted",
        createdAtUtc: "2026-02-27T10:00:00Z",
        updatedAtUtc: "2026-02-27T10:00:00Z",
        items: [{ productId: "f4458e4c-9f68-45ea-9052-7f21b6771001", quantity: 2 }],
        statusHistories: [
          { id: "h-1", status: "accepted", note: "order_created", createdAtUtc: "2026-02-27T10:00:00Z" },
        ],
      }),
    })
  })

  await page.route(`**://localhost:5003/admin/orders/${orderId}/status`, async (route) => {
    await route.fulfill({ status: 204, body: "" })
  })

  await page.goto("/orders")
  await page.getByRole("button", { name: "詳細を表示" }).click()
  await page.getByRole("button", { name: "出荷に更新" }).click()
  await expect(page.getByText("注文ステータスを「shipped」へ更新しました。")).toBeVisible()
})

test("admin の不正遷移時にエラーを表示できる", async ({ page }) => {
  const orderId = "3d6f0d63-2f9a-4f27-b25b-53bc41f04003"

  await page.route("**://localhost:5003/orders", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: orderId,
          userId: "2",
          status: "accepted",
          createdAtUtc: "2026-02-27T10:00:00Z",
          updatedAtUtc: "2026-02-27T10:00:00Z",
          items: [{ productId: "f4458e4c-9f68-45ea-9052-7f21b6771001", quantity: 2 }],
          statusHistories: [
            { id: "h-1", status: "accepted", note: "order_created", createdAtUtc: "2026-02-27T10:00:00Z" },
          ],
        },
      ]),
    })
  })

  await page.route(`**://localhost:5003/orders/${orderId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: orderId,
        userId: "2",
        status: "accepted",
        createdAtUtc: "2026-02-27T10:00:00Z",
        updatedAtUtc: "2026-02-27T10:00:00Z",
        items: [{ productId: "f4458e4c-9f68-45ea-9052-7f21b6771001", quantity: 2 }],
        statusHistories: [
          { id: "h-1", status: "accepted", note: "order_created", createdAtUtc: "2026-02-27T10:00:00Z" },
        ],
      }),
    })
  })

  await page.route(`**://localhost:5003/admin/orders/${orderId}/status`, async (route) => {
    await route.fulfill({ status: 409, contentType: "text/plain", body: '"invalid_transition"' })
  })

  await page.goto("/orders")
  await page.getByRole("button", { name: "詳細を表示" }).click()
  await page.getByRole("button", { name: "出荷に更新" }).click()
  await expect(page.getByText("不正なステータス遷移です。最新状態を確認してください。")).toBeVisible()
})
