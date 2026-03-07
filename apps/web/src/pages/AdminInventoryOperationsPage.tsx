import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../components/ui/Button"
import type { ProductListResponse, ProductResponse } from "../features/catalog/types"
import type { InventoryOperationResult, InventoryOperationType, InventoryTransactionResponse } from "../features/inventory/types"

type InventoryOperationDraft = {
  productId: string
  quantity: number
  expectedVersion: number
  note?: string
}

type InventoryAdjustDraft = {
  productId: string
  newOnHand: number
  expectedVersion: number
  note?: string
}

type AdminInventoryOperationsPageProps = {
  onLogout: () => void
  fetchProductsPage: (query: {
    q?: string
    categoryId?: string
    sort?: string
    page: number
    pageSize: number
  }) => Promise<ProductListResponse>
  receiveInventory: (draft: InventoryOperationDraft) => Promise<InventoryOperationResult>
  issueInventory: (draft: InventoryOperationDraft) => Promise<InventoryOperationResult>
  adjustInventory: (draft: InventoryAdjustDraft) => Promise<InventoryOperationResult>
  fetchTransactions: (productId: string, take?: number) => Promise<InventoryTransactionResponse[]>
}

const OPERATION_LABELS: Record<InventoryOperationType, string> = {
  receive: "入庫",
  issue: "出庫",
  adjust: "棚卸調整",
}

function getTransactionTypeLabel(type: string): string {
  if (type === "receive") return "入庫"
  if (type === "issue") return "出庫"
  if (type === "adjust") return "棚卸調整"
  if (type === "reserve") return "引当"
  if (type === "release") return "引当解除"
  return type
}

function getTransactionTypeClass(type: string): string {
  if (type === "receive") return "border-emerald-500/40 bg-emerald-950/30 text-emerald-200"
  if (type === "issue") return "border-rose-500/40 bg-rose-950/30 text-rose-200"
  if (type === "adjust") return "border-amber-500/40 bg-amber-950/30 text-amber-200"
  return "border-zinc-500/45 bg-zinc-800/70 text-zinc-200"
}

function AdminInventoryOperationsPage({
  onLogout,
  fetchProductsPage,
  receiveInventory,
  issueInventory,
  adjustInventory,
  fetchTransactions,
}: AdminInventoryOperationsPageProps) {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState("")
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [operationType, setOperationType] = useState<InventoryOperationType>("receive")
  const [quantityText, setQuantityText] = useState("1")
  const [newOnHandText, setNewOnHandText] = useState("0")
  const [note, setNote] = useState("")
  const [transactions, setTransactions] = useState<InventoryTransactionResponse[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isConflict, setIsConflict] = useState(false)

  const selectedProduct = useMemo(
    () => products.find((x) => x.id === selectedProductId) ?? null,
    [products, selectedProductId],
  )

  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true)
    setError(null)
    try {
      const result = await fetchProductsPage({
        q: keyword || undefined,
        page: 1,
        pageSize: 30,
      })
      setProducts(result.items)
      if (!selectedProductId && result.items.length > 0) {
        setSelectedProductId(result.items[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "商品一覧の取得に失敗しました。")
    } finally {
      setIsLoadingProducts(false)
    }
  }, [fetchProductsPage, keyword, selectedProductId])

  const loadTransactions = useCallback(async () => {
    if (!selectedProductId) {
      setTransactions([])
      return
    }

    setIsLoadingTransactions(true)
    setError(null)
    try {
      const rows = await fetchTransactions(selectedProductId, 20)
      setTransactions(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : "在庫履歴の取得に失敗しました。")
    } finally {
      setIsLoadingTransactions(false)
    }
  }, [fetchTransactions, selectedProductId])

  const reloadProductAndTransactions = useCallback(async () => {
    setError(null)
    setIsConflict(false)
    try {
      const [productResult] = await Promise.all([
        fetchProductsPage({
          q: keyword || undefined,
          page: 1,
          pageSize: 30,
        }),
        loadTransactions(),
      ])
      setProducts(productResult.items)
      setMessage("最新のデータを取得しました。")
    } catch (err) {
      setError(err instanceof Error ? err.message : "データの再取得に失敗しました。")
    }
  }, [fetchProductsPage, keyword, loadTransactions])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  useEffect(() => {
    void loadTransactions()
  }, [loadTransactions])

  const handleSubmit = async () => {
    if (!selectedProduct) return

    setIsSubmitting(true)
    setError(null)
    setMessage(null)
    setIsConflict(false)

    try {
      let result: InventoryOperationResult

      if (operationType === "adjust") {
        const newOnHand = Number(newOnHandText)
        if (!Number.isFinite(newOnHand) || newOnHand < 0) {
          setError("新しい在庫数は0以上で指定してください。")
          return
        }
        result = await adjustInventory({
          productId: selectedProduct.id,
          newOnHand,
          expectedVersion: selectedProduct.version,
          note: note.trim() || undefined,
        })
      } else {
        const quantity = Number(quantityText)
        if (!Number.isFinite(quantity) || quantity <= 0) {
          setError("数量は1以上で指定してください。")
          return
        }
        const operation = operationType === "receive" ? receiveInventory : issueInventory
        result = await operation({
          productId: selectedProduct.id,
          quantity,
          expectedVersion: selectedProduct.version,
          note: note.trim() || undefined,
        })
      }

      if (result.ok) {
        setMessage(result.message)
        setNote("")
        setQuantityText("1")
        // 商品リスト（バージョン含む）と履歴を再取得
        const productResult = await fetchProductsPage({
          q: keyword || undefined,
          page: 1,
          pageSize: 30,
        })
        setProducts(productResult.items)
        await loadTransactions()
      } else {
        if (result.code === "version_conflict") {
          setIsConflict(true)
        }
        setError(result.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "在庫操作に失敗しました。")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-900 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-700/50 bg-zinc-900/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-zinc-400">Admin</p>
            <h1 className="text-lg font-semibold text-white">在庫操作（入庫/出庫/棚卸）</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/products")}>商品一覧</Button>
            <Button onClick={() => navigate("/admin/inventory")}>ロケーション管理</Button>
            <Button onClick={() => navigate("/orders")}>注文履歴</Button>
            <Button onClick={onLogout} variant="ghost">
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1.2fr_1.6fr]">
        {/* 商品選択パネル */}
        <section className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5">
          <h2 className="text-base font-semibold">商品選択</h2>
          <div className="mt-3 flex gap-2">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="商品名で検索"
              className="w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-400/60"
            />
            <Button onClick={() => void loadProducts()}>検索</Button>
          </div>
          {isLoadingProducts && <p className="mt-3 text-sm text-zinc-300">商品を読み込み中...</p>}
          <ul className="mt-3 space-y-2">
            {products.map((product) => {
              const isSelected = selectedProductId === product.id
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    className={`w-full rounded-xl border px-3 py-3 text-left ${
                      isSelected
                        ? "border-zinc-200 bg-zinc-700/55"
                        : "border-zinc-600/45 bg-zinc-900/55 hover:bg-zinc-800/60"
                    }`}
                    onClick={() => setSelectedProductId(product.id)}
                  >
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-xs text-zinc-400">
                      在庫: {product.onHand} / 引当: {product.reserved} / 販売可能: {product.available} / v{product.version}
                    </p>
                  </button>
                </li>
              )
            })}
            {!isLoadingProducts && products.length === 0 && (
              <li className="rounded-xl border border-zinc-600/45 bg-zinc-900/55 px-4 py-3 text-sm text-zinc-300">
                該当する商品がありません。
              </li>
            )}
          </ul>
        </section>

        {/* 操作パネル */}
        <section className="space-y-4">
          {/* 在庫情報 */}
          <div className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5">
            <h2 className="text-base font-semibold">在庫情報</h2>
            {!selectedProduct && <p className="mt-3 text-sm text-zinc-300">左の一覧から商品を選択してください。</p>}
            {selectedProduct && (
              <div className="mt-3">
                <p className="text-sm text-zinc-300">
                  対象商品: <span className="font-semibold text-zinc-100">{selectedProduct.name}</span>
                </p>
                <div className="mt-2 grid grid-cols-4 gap-3">
                  <div className="rounded-lg border border-zinc-600/45 bg-zinc-900/55 px-3 py-2 text-center">
                    <p className="text-xs text-zinc-400">在庫数</p>
                    <p className="text-lg font-bold text-zinc-100">{selectedProduct.onHand}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-600/45 bg-zinc-900/55 px-3 py-2 text-center">
                    <p className="text-xs text-zinc-400">引当数</p>
                    <p className="text-lg font-bold text-zinc-100">{selectedProduct.reserved}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-600/45 bg-zinc-900/55 px-3 py-2 text-center">
                    <p className="text-xs text-zinc-400">販売可能</p>
                    <p className="text-lg font-bold text-zinc-100">{selectedProduct.available}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-600/45 bg-zinc-900/55 px-3 py-2 text-center">
                    <p className="text-xs text-zinc-400">バージョン</p>
                    <p className="text-lg font-bold text-zinc-100">{selectedProduct.version}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 在庫操作フォーム */}
          <div className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5">
            <h2 className="text-base font-semibold">在庫操作</h2>
            <div className="mt-3 flex gap-2">
              {(["receive", "issue", "adjust"] as InventoryOperationType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    operationType === type
                      ? "border-zinc-200 bg-zinc-700/55 text-white"
                      : "border-zinc-600/45 bg-zinc-900/55 text-zinc-300 hover:bg-zinc-800/60"
                  }`}
                  onClick={() => setOperationType(type)}
                >
                  {OPERATION_LABELS[type]}
                </button>
              ))}
            </div>

            {operationType === "adjust" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]">
                <label className="text-sm">
                  新しい在庫数
                  <input
                    type="number"
                    min={0}
                    value={newOnHandText}
                    onChange={(event) => setNewOnHandText(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
                <label className="text-sm">
                  メモ
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="棚卸調整の理由 など"
                    className="mt-1 w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
              </div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr]">
                <label className="text-sm">
                  数量
                  <input
                    type="number"
                    min={1}
                    value={quantityText}
                    onChange={(event) => setQuantityText(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
                <label className="text-sm">
                  メモ
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={operationType === "receive" ? "仕入先 / 発注番号 など" : "出荷先 / 理由 など"}
                    className="mt-1 w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <Button
                variant="primary"
                disabled={!selectedProduct || isSubmitting}
                onClick={() => void handleSubmit()}
              >
                {isSubmitting ? "処理中..." : `${OPERATION_LABELS[operationType]}を実行する`}
              </Button>
            </div>
          </div>

          {/* 競合時の再試行導線 */}
          {isConflict && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-950/30 p-5">
              <h3 className="text-sm font-semibold text-amber-200">バージョン競合が発生しました</h3>
              <p className="mt-1 text-xs text-amber-300/80">
                他のユーザーが在庫を更新しました。最新データを取得してから再度操作してください。
              </p>
              <Button className="mt-3" onClick={() => void reloadProductAndTransactions()}>
                最新データを取得する
              </Button>
            </div>
          )}

          {/* 在庫履歴 */}
          <div className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5">
            <h2 className="text-base font-semibold">在庫履歴</h2>
            {isLoadingTransactions && <p className="mt-3 text-sm text-zinc-300">履歴を読み込み中...</p>}
            <ul className="mt-3 space-y-2">
              {transactions.map((item) => (
                <li key={item.id} className="rounded-lg border border-zinc-700/45 bg-zinc-900/55 px-3 py-2 text-xs text-zinc-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p>{new Date(item.createdAtUtc).toLocaleString("ja-JP")}</p>
                    <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${getTransactionTypeClass(item.type)}`}>
                      {getTransactionTypeLabel(item.type)}
                    </span>
                  </div>
                  <p className="mt-1">
                    数量変動: <span className={item.quantityDelta >= 0 ? "text-emerald-300" : "text-rose-300"}>{item.quantityDelta >= 0 ? "+" : ""}{item.quantityDelta}</span>
                    {" / "}在庫後: {item.onHandAfter} / 引当後: {item.reservedAfter}
                  </p>
                  {item.note && <p className="text-zinc-400">メモ: {item.note}</p>}
                </li>
              ))}
              {!isLoadingTransactions && transactions.length === 0 && (
                <li className="text-sm text-zinc-400">在庫履歴はまだありません。</li>
              )}
            </ul>
          </div>
        </section>
      </div>

      {error && !isConflict && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[min(90vw,720px)] -translate-x-1/2 rounded-xl border border-red-500/40 bg-red-950/80 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}
      {message && (
        <div className="fixed bottom-4 left-1/2 z-40 w-[min(90vw,720px)] -translate-x-1/2 rounded-xl border border-zinc-500/40 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100">
          {message}
        </div>
      )}
    </main>
  )
}

export default AdminInventoryOperationsPage
export type { AdminInventoryOperationsPageProps, InventoryOperationDraft, InventoryAdjustDraft }
