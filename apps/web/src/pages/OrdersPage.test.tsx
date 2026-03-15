import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import OrdersPage from "./OrdersPage"
import type { OrderResponse } from "../features/order/types"

const sampleOrder: OrderResponse = {
  id: "order-1",
  userId: "user-1",
  status: "accepted",
  createdAtUtc: "2024-01-01T00:00:00Z",
  updatedAtUtc: "2024-01-01T00:00:00Z",
  items: [{ productId: "prod-1", quantity: 2 }],
  statusHistories: [],
}

function renderOrdersPage(
  overrides: Partial<{
    fetchOrders: () => Promise<OrderResponse[]>
    fetchOrderById: (id: string) => Promise<OrderResponse>
    changeOrderStatus: (id: string, status: string) => Promise<{ ok: boolean; message: string }>
  }> = {},
) {
  const defaultProps = {
    isAdmin: true,
    onLogout: vi.fn(),
    fetchOrders: vi.fn<() => Promise<OrderResponse[]>>().mockResolvedValue([sampleOrder]),
    fetchOrderById: vi.fn<(id: string) => Promise<OrderResponse>>().mockResolvedValue(sampleOrder),
    changeOrderStatus: vi.fn<(id: string, status: string) => Promise<{ ok: boolean; message: string }>>().mockResolvedValue({ ok: true, message: "ステータスを更新しました。" }),
    ...overrides,
  }
  render(
    <MemoryRouter>
      <OrdersPage {...defaultProps} />
    </MemoryRouter>,
  )
  return defaultProps
}

describe("OrdersPage - changeOrderStatus", () => {
  it("ステータス変更成功後に selectedOrder が更新されてアクションメッセージが表示される", async () => {
    const updatedOrder: OrderResponse = { ...sampleOrder, status: "shipped" }
    const fetchOrderById = vi.fn<(id: string) => Promise<OrderResponse>>()
      .mockResolvedValueOnce(sampleOrder)
      .mockResolvedValueOnce(updatedOrder)

    renderOrdersPage({ fetchOrderById })

    // 詳細を開く
    await screen.findByText("詳細を表示")
    await userEvent.click(screen.getByText("詳細を表示"))

    await screen.findByText("ステータス更新")

    // ステータス変更ボタンをクリック（accepted → shipped）
    const changeBtn = screen.getByText("出荷に更新")
    await userEvent.click(changeBtn)

    await waitFor(() => {
      expect(screen.getByText("ステータスを更新しました。")).toBeInTheDocument()
    })

    // fetchOrderById が再取得のために呼ばれること
    expect(fetchOrderById).toHaveBeenCalledTimes(2)
  })

  it("ステータス変更失敗時にエラーメッセージが赤色で表示される", async () => {
    const changeOrderStatus = vi.fn<(id: string, status: string) => Promise<{ ok: boolean; message: string }>>()
      .mockResolvedValue({ ok: false, message: "権限がありません。" })

    renderOrdersPage({ changeOrderStatus })

    await screen.findByText("詳細を表示")
    await userEvent.click(screen.getByText("詳細を表示"))

    await screen.findByText("ステータス更新")
    await userEvent.click(screen.getByText("出荷に更新"))

    await waitFor(() => {
      expect(screen.getByText("権限がありません。")).toBeInTheDocument()
    })

    // エラーメッセージが赤色スタイルで表示されること
    const errorEl = screen.getByText("権限がありません。")
    expect(errorEl).toHaveClass("text-red-200")
  })

  it("ステータス変更成功後に fetchOrderById が失敗した場合はエラーメッセージが表示される", async () => {
    const fetchOrderById = vi.fn<(id: string) => Promise<OrderResponse>>()
      .mockResolvedValueOnce(sampleOrder)
      .mockRejectedValueOnce(new Error("詳細の取得に失敗しました。"))

    renderOrdersPage({ fetchOrderById })

    await screen.findByText("詳細を表示")
    await userEvent.click(screen.getByText("詳細を表示"))

    await screen.findByText("ステータス更新")
    await userEvent.click(screen.getByText("出荷に更新"))

    await waitFor(() => {
      expect(screen.getByText("詳細の取得に失敗しました。")).toBeInTheDocument()
    })
  })
})
