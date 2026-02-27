import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import App from "./App"
import { postAuthLogin } from "./api/identity"
import { client } from "./api/identity/client.gen"

vi.mock("./api/identity", () => ({
  postAuthLogin: vi.fn(),
}))

vi.mock("./api/identity/client.gen", () => ({
  client: {
    setConfig: vi.fn(),
  },
}))

describe("App login", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.url

      if (url.includes("/categories")) {
        return new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }

      if (url.includes("/products?")) {
        return new Response(
          JSON.stringify({
            items: [],
            totalCount: 0,
            page: 1,
            pageSize: 20,
            totalPages: 0,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      return new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("stores JWT and navigates to product list when login succeeds", async () => {
    vi.mocked(postAuthLogin).mockResolvedValue({
      data: {
        accessToken: "access-token-for-test-1234567890",
        refreshToken: "refresh-token",
      },
      response: {
        ok: true,
        status: 200,
      } as Response,
      error: undefined,
    })

    render(<App />)

    await userEvent.click(screen.getByRole("button", { name: "ログインする" }))

    await waitFor(() => {
      expect(postAuthLogin).toHaveBeenCalledTimes(1)
    })

    expect(client.setConfig).toHaveBeenCalledWith({ baseUrl: "http://localhost:5001" })
    expect(localStorage.getItem("inventory.jwt")).toBe("access-token-for-test-1234567890")
    await waitFor(() => {
      expect(screen.getByText("商品一覧")).toBeInTheDocument()
    })
    expect(globalThis.fetch).toHaveBeenCalledWith("http://localhost:5002/categories", {
      headers: {
        Authorization: "Bearer access-token-for-test-1234567890",
      },
    })
  })

  it("shows validation error when backend returns 401", async () => {
    vi.mocked(postAuthLogin).mockResolvedValue({
      data: undefined,
      response: {
        ok: false,
        status: 401,
      } as Response,
      error: undefined,
    })

    render(<App />)

    await userEvent.click(screen.getByRole("button", { name: "ログインする" }))

    await waitFor(() => {
      expect(postAuthLogin).toHaveBeenCalledTimes(1)
    })

    expect(
      screen.getByText("メールアドレスまたはパスワードが正しくありません。"),
    ).toBeInTheDocument()
    expect(localStorage.getItem("inventory.jwt")).toBeNull()
  })
})
