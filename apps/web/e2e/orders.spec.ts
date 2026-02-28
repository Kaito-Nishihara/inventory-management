import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("inventory.jwt", "e2e-dummy-token")
  })
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
      }),
    })
  })

  await page.goto("/orders")
  await expect(page.getByRole("heading", { name: "注文履歴" })).toBeVisible()
  await expect(page.getByText("受付")).toBeVisible()
  await page.getByRole("button", { name: "詳細を表示" }).click()
  await expect(page.getByText("ステータス")).toBeVisible()
  await expect(page.getByText("出荷")).toBeVisible()
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
