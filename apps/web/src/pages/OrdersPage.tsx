import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../components/ui/Button"
import { getOrderStatusMeta } from "../features/order/orderStatus"
import { getAllowedOrderStatusTransitions } from "../features/order/orderStatusTransitions"
import type { OrderResponse } from "../features/order/types"

type OrdersPageProps = {
  isAdmin: boolean
  onLogout: () => void
  fetchOrders: () => Promise<OrderResponse[]>
  fetchOrderById: (orderId: string) => Promise<OrderResponse>
  changeOrderStatus: (orderId: string, nextStatus: string) => Promise<{ ok: boolean; message: string }>
}

function OrdersPage({ isAdmin, onLogout, fetchOrders, fetchOrderById, changeOrderStatus }: OrdersPageProps) {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [listStatus, setListStatus] = useState<"loading" | "success" | "error">("loading")
  const [listError, setListError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null)
  const [detailStatus, setDetailStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isStatusChanging, setIsStatusChanging] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    setListStatus("loading")
    setListError(null)
    setSelectedOrder(null)
    setDetailStatus("idle")
    setDetailError(null)
    setActionMessage(null)

    try {
      const data = await fetchOrders()
      setOrders(data)
      setListStatus("success")
    } catch (err) {
      setListStatus("error")
      setListError(err instanceof Error ? err.message : "注文履歴の取得に失敗しました。")
    }
  }, [fetchOrders])

  const loadOrderDetail = useCallback(async (orderId: string) => {
    setDetailStatus("loading")
    setDetailError(null)
    setActionMessage(null)

    try {
      const data = await fetchOrderById(orderId)
      setSelectedOrder(data)
      setDetailStatus("success")
    } catch (err) {
      setDetailStatus("error")
      setDetailError(err instanceof Error ? err.message : "注文詳細の取得に失敗しました。")
    }
  }, [fetchOrderById])

  const handleChangeStatus = useCallback(async (orderId: string, nextStatus: string) => {
    setIsStatusChanging(true)
    setDetailError(null)
    setActionMessage(null)
    try {
      const result = await changeOrderStatus(orderId, nextStatus)
      if (!result.ok) {
        setActionMessage(result.message)
        return
      }

      // 一覧と詳細を再取得（メッセージをクリアしないよう直接 fetch する）
      const [, detail] = await Promise.all([
        fetchOrders().then((data) => {
          setOrders(data)
        }).catch(() => { /* 一覧再取得失敗は無視 */ }),
        fetchOrderById(orderId).catch(() => null),
      ])
      if (detail) {
        setSelectedOrder(detail)
      }
      setActionMessage(result.message)
    } finally {
      setIsStatusChanging(false)
    }
  }, [changeOrderStatus, fetchOrders, fetchOrderById])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadOrders()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [loadOrders])

  return (
    <main className="min-h-screen bg-zinc-900 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-700/50 bg-zinc-900/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-zinc-400">Orders</p>
            <h1 className="text-lg font-semibold text-white">注文履歴</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/products")}>商品一覧</Button>
            <Button onClick={() => navigate("/checkout")}>注文ページ</Button>
            {isAdmin && <Button onClick={() => navigate("/admin/inventory")}>在庫操作</Button>}
            <Button onClick={onLogout} variant="ghost">
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">注文一覧</h2>
            <Button onClick={() => void loadOrders()}>再読み込み</Button>
          </div>

          {listStatus === "loading" && (
            <p className="rounded-xl border border-zinc-600/45 bg-zinc-900/55 px-4 py-3 text-sm text-zinc-300">
              注文履歴を読み込み中...
            </p>
          )}

          {listStatus === "error" && listError && (
            <p className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              {listError}
            </p>
          )}

          {listStatus === "success" && orders.length === 0 && (
            <p className="rounded-xl border border-zinc-600/45 bg-zinc-900/55 px-4 py-3 text-sm text-zinc-300">
              注文履歴はまだありません。
            </p>
          )}

          {listStatus === "success" && orders.length > 0 && (
            <ul className="space-y-3">
              {orders.map((order) => {
                const statusMeta = getOrderStatusMeta(order.status)
                return (
                  <li key={order.id} className="rounded-xl border border-zinc-600/45 bg-zinc-900/55 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-zinc-400">OrderId: {order.id}</p>
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-300">
                      {new Date(order.createdAtUtc).toLocaleString("ja-JP")}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">明細: {order.items.length}件</p>
                    <Button className="mt-3" onClick={() => void loadOrderDetail(order.id)}>
                      詳細を表示
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <aside className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5">
          <h2 className="text-base font-semibold text-white">注文詳細</h2>

          {detailStatus === "idle" && (
            <p className="mt-3 text-sm text-zinc-300">一覧から注文を選択すると詳細を表示します。</p>
          )}

          {detailStatus === "loading" && (
            <p className="mt-3 rounded-xl border border-zinc-600/45 bg-zinc-900/55 px-4 py-3 text-sm text-zinc-300">
              注文詳細を読み込み中...
            </p>
          )}

          {detailStatus === "error" && detailError && (
            <p className="mt-3 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              {detailError}
            </p>
          )}

          {detailStatus === "success" && selectedOrder && (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs text-zinc-400">OrderId</p>
                <p className="text-sm text-zinc-100">{selectedOrder.id}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">ステータス</p>
                <p className="text-sm text-zinc-100">{getOrderStatusMeta(selectedOrder.status).label}</p>
              </div>
              {isAdmin && (
                <div>
                  <p className="text-xs text-zinc-400">ステータス更新</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {getAllowedOrderStatusTransitions(selectedOrder.status).map((transition) => (
                      <Button
                        key={transition.nextStatus}
                        disabled={isStatusChanging}
                        onClick={() => void handleChangeStatus(selectedOrder.id, transition.nextStatus)}
                      >
                        {transition.label}
                      </Button>
                    ))}
                    {getAllowedOrderStatusTransitions(selectedOrder.status).length === 0 && (
                      <p className="text-sm text-zinc-400">この注文は遷移可能な次ステータスがありません。</p>
                    )}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-zinc-400">明細</p>
                <ul className="mt-2 space-y-2">
                  {selectedOrder.items.map((item) => (
                    <li key={item.productId} className="rounded-lg border border-zinc-600/45 bg-zinc-900/55 px-3 py-2 text-sm text-zinc-200">
                      ProductId: {item.productId} / 数量: {item.quantity}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs text-zinc-400">変更履歴</p>
                <ul className="mt-2 space-y-2">
                  {(selectedOrder.statusHistories ?? []).map((history) => (
                    <li key={history.id} className="rounded-lg border border-zinc-600/45 bg-zinc-900/55 px-3 py-2 text-sm text-zinc-200">
                      <p>{new Date(history.createdAtUtc).toLocaleString("ja-JP")} / {getOrderStatusMeta(history.status).label}</p>
                      <p className="text-zinc-400">メモ: {history.note}</p>
                    </li>
                  ))}
                  {(selectedOrder.statusHistories ?? []).length === 0 && (
                    <li className="text-sm text-zinc-400">履歴はありません。</li>
                  )}
                </ul>
              </div>
              {actionMessage && (
                <p className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
                  {actionMessage}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}

export default OrdersPage
