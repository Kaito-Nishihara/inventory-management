import { expect, test } from "@playwright/test"

test("login succeeds and stores jwt in localStorage", async ({ page }) => {
  await page.goto("/")

  await page.getByRole("button", { name: "ログインする" }).click()

  await expect(page.getByRole("heading", { name: "商品一覧" })).toBeVisible()

  const token = await page.evaluate(() => localStorage.getItem("inventory.jwt"))
  expect(token).toBeTruthy()
})

test("login fails with invalid credentials", async ({ page }) => {
  await page.goto("/")

  await page.getByLabel("メールアドレス").fill("invalid@test.com")
  await page.getByLabel("パスワード").fill("invalid")
  await page.getByRole("button", { name: "ログインする" }).click()

  await expect(page.getByText("メールアドレスまたはパスワードが正しくありません。")).toBeVisible()
  const token = await page.evaluate(() => localStorage.getItem("inventory.jwt"))
  expect(token).toBeNull()
})
