import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../components/ui/Button"
import type { ProductListResponse, ProductResponse } from "../features/catalog/types"
import type { AuthAuditLogResponse, InventoryTransactionResponse } from "../features/inventory/types"

type AdminInventoryAuditPageProps = {
  onLogout: () => void
  fetchProductsPage: (query: {
    q?: string
    categoryId?: string
    sort?: string
    page: number
    pageSize: number
  }) => Promise<ProductListResponse>
  fetchTransactions: (productId: string, take?: number, fromDate?: string, toDate?: string) => Promise<InventoryTransactionResponse[]>
  fetchAuthAuditLogs: (take?: number, fromDate?: string, toDate?: string) => Promise<AuthAuditLogResponse[]>
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getAuditActionLabel(action: string): string {
  if (action === "login") return "ログイン"
  if (action === "refresh") return "リフレッシュ"
  if (action === "revoke") return "リボーク"
  return action
}

function AdminInventoryAuditPage({
  onLogout,
  fetchProductsPage,
  fetchTransactions,
  fetchAuthAuditLogs,
}: AdminInventoryAuditPageProps) {
  const navigate = useNavigate()
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState(() => {
    const value = new Date()
    value.setDate(value.getDate() - 7)
    return toDateInputValue(value)
  })
  const [toDate, setToDate] = useState(() => toDateInputValue(new Date()))
  const [transactions, setTransactions] = useState<InventoryTransactionResponse[]>([])
  const [auditLogs, setAuditLogs] = useState<AuthAuditLogResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedProduct = useMemo(
    () => products.find((x) => x.id === selectedProductId) ?? null,
    [products, selectedProductId],
  )

  const loadProducts = useCallback(async () => {
    const result = await fetchProductsPage({ page: 1, pageSize: 30, sort: "newest" })
    setProducts(result.items)
    if (!selectedProductId && result.items.length > 0) {
      setSelectedProductId(result.items[0].id)
    }
  }, [fetchProductsPage, selectedProductId])

  const loadAuditData = useCallback(async () => {
    if (!selectedProductId) {
      setTransactions([])
      setAuditLogs([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const [transactionRows, authRows] = await Promise.all([
        fetchTransactions(selectedProductId, 50, fromDate || undefined, toDate || undefined),
        fetchAuthAuditLogs(50, fromDate || undefined, toDate || undefined),
      ])
      setTransactions(transactionRows)
      setAuditLogs(authRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : "履歴取得に失敗しました。")
    } finally {
      setIsLoading(false)
    }
  }, [fetchAuthAuditLogs, fetchTransactions, fromDate, selectedProductId, toDate])

  useEffect(() => {
    void loadProducts().catch((err) => {
      setError(err instanceof Error ? err.message : "商品一覧の取得に失敗しました。")
    })
  }, [loadProducts])

  useEffect(() => {
    void loadAuditData()
  }, [loadAuditData])

  return (
    <main className="min-h-screen bg-zinc-900 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-700/50 bg-zinc-900/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-zinc-400">Admin</p>
            <h1 className="text-lg font-semibold text-white">在庫履歴・監査ログ</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/products")}>商品一覧</Button>
            <Button onClick={() => navigate("/admin/products")}>商品管理</Button>
            <Button onClick={() => navigate("/admin/inventory")}>在庫管理</Button>
            <Button onClick={() => navigate("/admin/inventory/operations")}>在庫操作</Button>
            <Button onClick={onLogout} variant="ghost">
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-4 px-6 py-8">
        <section className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5">
          <h2 className="text-base font-semibold">フィルタ</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto]">
            <label className="text-sm">
              商品
              <select
                value={selectedProductId ?? ""}
                onChange={(event) => setSelectedProductId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              開始日
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
              />
            </label>
            <label className="text-sm">
              終了日
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
              />
            </label>
            <div className="flex items-end">
              <Button onClick={() => void loadAuditData()} disabled={isLoading || !selectedProductId}>
                {isLoading ? "取得中..." : "再取得"}
              </Button>
            </div>
          </div>
          {selectedProduct && (
            <p className="mt-3 text-xs text-zinc-400">
              対象商品: {selectedProduct.name} / 在庫: {selectedProduct.onHand} / 販売可能: {selectedProduct.available}
            </p>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5">
            <h2 className="text-base font-semibold">在庫トランザクション</h2>
            <ul className="mt-3 space-y-2">
              {transactions.map((item) => (
                <li key={item.id} className="rounded-lg border border-zinc-700/45 bg-zinc-900/55 px-3 py-2 text-xs">
                  <p>{new Date(item.createdAtUtc).toLocaleString("ja-JP")}</p>
                  <p>
                    種別: {item.type} / 変動: {item.quantityDelta >= 0 ? "+" : ""}
                    {item.quantityDelta} / 在庫後: {item.onHandAfter} / 引当後: {item.reservedAfter}
                  </p>
                  {item.note && <p className="text-zinc-400">メモ: {item.note}</p>}
                </li>
              ))}
              {!isLoading && transactions.length === 0 && (
                <li className="text-sm text-zinc-400">在庫トランザクションがありません。</li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5">
            <h2 className="text-base font-semibold">認証監査ログ</h2>
            <ul className="mt-3 space-y-2">
              {auditLogs.map((item) => (
                <li key={item.id} className="rounded-lg border border-zinc-700/45 bg-zinc-900/55 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <p>{new Date(item.createdAtUtc).toLocaleString("ja-JP")}</p>
                    <span className={item.success ? "text-emerald-300" : "text-rose-300"}>{item.success ? "成功" : "失敗"}</span>
                  </div>
                  <p>
                    操作: {getAuditActionLabel(item.action)}
                    {item.userId ? ` / userId: ${item.userId}` : ""}
                  </p>
                  {item.detail && <p className="text-zinc-400">詳細: {item.detail}</p>}
                </li>
              ))}
              {!isLoading && auditLogs.length === 0 && (
                <li className="text-sm text-zinc-400">認証監査ログがありません。</li>
              )}
            </ul>
          </div>
        </section>
      </div>

      {error && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[min(90vw,720px)] -translate-x-1/2 rounded-xl border border-red-500/40 bg-red-950/80 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}
    </main>
  )
}

export default AdminInventoryAuditPage
export type { AdminInventoryAuditPageProps }
