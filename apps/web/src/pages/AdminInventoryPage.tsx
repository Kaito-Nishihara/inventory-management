import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../components/ui/Button"
import type { ProductListResponse, ProductResponse } from "../features/catalog/types"
import type {
  LocationInventoryStockResponse,
  LocationInventoryTransferResponse,
  StockLocationResponse,
} from "../features/inventory/types"

type TransferDraft = {
  productId: string
  fromLocationId: string
  toLocationId: string
  quantity: number
  note?: string
}

type TransferResult = {
  ok: boolean
  code?: string
  message: string
  transferId?: string
}

type TransferActionResult = {
  ok: boolean
  code?: string
  message: string
}

type AdminInventoryPageProps = {
  onLogout: () => void
  fetchProductsPage: (query: {
    q?: string
    categoryId?: string
    sort?: string
    page: number
    pageSize: number
  }) => Promise<ProductListResponse>
  fetchStockLocations: () => Promise<StockLocationResponse[]>
  fetchLocationStocks: (productId: string) => Promise<LocationInventoryStockResponse[]>
  fetchLocationTransfers: (productId: string, take?: number) => Promise<LocationInventoryTransferResponse[]>
  createLocationTransfer: (draft: TransferDraft) => Promise<TransferResult>
  shipLocationTransfer: (transferId: string) => Promise<TransferActionResult>
  receiveLocationTransfer: (transferId: string) => Promise<TransferActionResult>
  cancelLocationTransfer: (transferId: string) => Promise<TransferActionResult>
}

function getStatusClass(status: string): string {
  if (status === "移動指示") return "border-sky-500/40 bg-sky-950/30 text-sky-200"
  if (status === "出荷済み") return "border-amber-500/40 bg-amber-950/30 text-amber-200"
  if (status === "入荷済み") return "border-emerald-500/40 bg-emerald-950/30 text-emerald-200"
  return "border-zinc-500/45 bg-zinc-800/70 text-zinc-200"
}

function AdminInventoryPage({
  onLogout,
  fetchProductsPage,
  fetchStockLocations,
  fetchLocationStocks,
  fetchLocationTransfers,
  createLocationTransfer,
  shipLocationTransfer,
  receiveLocationTransfer,
  cancelLocationTransfer,
}: AdminInventoryPageProps) {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState("")
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [locations, setLocations] = useState<StockLocationResponse[]>([])
  const [stocks, setStocks] = useState<LocationInventoryStockResponse[]>([])
  const [transfers, setTransfers] = useState<LocationInventoryTransferResponse[]>([])
  const [fromLocationId, setFromLocationId] = useState("")
  const [toLocationId, setToLocationId] = useState("")
  const [quantityText, setQuantityText] = useState("1")
  const [note, setNote] = useState("")
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isLoadingStocks, setIsLoadingStocks] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingTransferId, setPendingTransferId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const selectedProduct = useMemo(() => products.find((x) => x.id === selectedProductId) ?? null, [products, selectedProductId])

  const locationNameMap = useMemo(() => {
    return locations.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = `${item.name} (${item.code})`
      return acc
    }, {})
  }, [locations])

  const totalOnHand = useMemo(() => stocks.reduce((sum, item) => sum + item.onHand, 0), [stocks])
  const totalInTransitOut = useMemo(() => stocks.reduce((sum, item) => sum + item.inTransitOut, 0), [stocks])
  const totalInTransitIn = useMemo(() => stocks.reduce((sum, item) => sum + item.inTransitIn, 0), [stocks])
  const warehouseOptions = useMemo(() => locations.filter((x) => x.type === "warehouse"), [locations])
  const nonWarehouseOptions = useMemo(() => locations.filter((x) => x.type !== "warehouse"), [locations])

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

  const loadLocations = useCallback(async () => {
    try {
      const rows = await fetchStockLocations()
      setLocations(rows)
      const warehouse = rows.find((x) => x.type === "warehouse")
      const store = rows.find((x) => x.type === "store")
      if (warehouse) setFromLocationId(warehouse.id)
      if (store) setToLocationId(store.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "ロケーション一覧の取得に失敗しました。")
    }
  }, [fetchStockLocations])

  const loadProductInventory = useCallback(async () => {
    if (!selectedProductId) {
      setStocks([])
      setTransfers([])
      return
    }

    setIsLoadingStocks(true)
    setError(null)
    try {
      const [stockRows, transferRows] = await Promise.all([
        fetchLocationStocks(selectedProductId),
        fetchLocationTransfers(selectedProductId, 20),
      ])
      setStocks(stockRows)
      setTransfers(transferRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : "ロケーション在庫の取得に失敗しました。")
    } finally {
      setIsLoadingStocks(false)
    }
  }, [fetchLocationStocks, fetchLocationTransfers, selectedProductId])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  useEffect(() => {
    void loadLocations()
  }, [loadLocations])

  useEffect(() => {
    void loadProductInventory()
  }, [loadProductInventory])

  const handleCreateTransfer = async () => {
    if (!selectedProduct) return

    const quantity = Number(quantityText)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("移動数量は1以上で指定してください。")
      return
    }
    if (!fromLocationId || !toLocationId) {
      setError("移動元・移動先ロケーションを選択してください。")
      return
    }
    if (fromLocationId === toLocationId) {
      setError("移動元と移動先は別ロケーションを選択してください。")
      return
    }

    setIsSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const result = await createLocationTransfer({
        productId: selectedProduct.id,
        fromLocationId,
        toLocationId,
        quantity,
        note: note.trim() || undefined,
      })
      setMessage(result.message)
      if (result.ok) {
        setNote("")
        setQuantityText("1")
        await loadProductInventory()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTransferAction = async (transferId: string, action: "ship" | "receive" | "cancel") => {
    setPendingTransferId(transferId)
    setError(null)
    setMessage(null)
    try {
      const result =
        action === "ship"
          ? await shipLocationTransfer(transferId)
          : action === "receive"
            ? await receiveLocationTransfer(transferId)
            : await cancelLocationTransfer(transferId)
      setMessage(result.message)
      if (result.ok) {
        await loadProductInventory()
      }
    } finally {
      setPendingTransferId(null)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-900 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-700/50 bg-zinc-900/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-zinc-400">Admin</p>
            <h1 className="text-lg font-semibold text-white">ロケーション在庫管理</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/products")}>商品一覧</Button>
            <Button onClick={() => navigate("/admin/products")}>商品管理</Button>
            <Button onClick={() => navigate("/admin/inventory/operations")}>在庫操作</Button>
            <Button onClick={() => navigate("/admin/inventory/audit")}>在庫監査</Button>
            <Button onClick={() => navigate("/orders")}>注文履歴</Button>
            <Button onClick={onLogout} variant="ghost">
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1.2fr_1.6fr]">
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
                    <p className="text-xs text-zinc-400">SKU在庫(合計): {product.onHand} / 販売可能: {product.available}</p>
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

        <section className="space-y-4">
          <div className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5">
            <h2 className="text-base font-semibold">ロケーション在庫</h2>
            {!selectedProduct && <p className="mt-3 text-sm text-zinc-300">左の一覧から商品を選択してください。</p>}
            {selectedProduct && (
              <div className="mt-3">
                <p className="text-sm text-zinc-300">
                  対象商品: <span className="font-semibold text-zinc-100">{selectedProduct.name}</span>
                </p>
                <p className="text-xs text-zinc-400">
                  ロケーション合計在庫: {totalOnHand} / 移動中出荷: {totalInTransitOut} / 移動中入荷: {totalInTransitIn}
                </p>
                {isLoadingStocks ? (
                  <p className="mt-3 text-sm text-zinc-300">ロケーション在庫を読み込み中...</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {stocks.map((stock) => (
                      <div key={stock.locationId} className="rounded-lg border border-zinc-600/45 bg-zinc-900/55 px-3 py-2 text-sm">
                        <p className="font-medium text-zinc-100">
                          {stock.locationName} ({stock.locationCode}) / {stock.locationType}
                        </p>
                        <p className="text-xs text-zinc-400">
                          在庫: {stock.onHand} / 移動中出荷: {stock.inTransitOut} / 移動中入荷: {stock.inTransitIn} / Version: {stock.version}
                        </p>
                      </div>
                    ))}
                    {stocks.length === 0 && <p className="text-sm text-zinc-300">ロケーション在庫がありません。</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5">
            <h2 className="text-base font-semibold">拠点間移動指示（倉庫→店舗）</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                移動元
                <select
                  value={fromLocationId}
                  onChange={(event) => setFromLocationId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
                >
                  <option value="">選択してください</option>
                  {warehouseOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                移動先
                <select
                  value={toLocationId}
                  onChange={(event) => setToLocationId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
                >
                  <option value="">選択してください</option>
                  {nonWarehouseOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </label>
            </div>

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
                  placeholder="店舗補充 / 欠品対応 など"
                  className="mt-1 w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
            </div>

            <Button className="mt-4" variant="primary" disabled={!selectedProduct || isSubmitting} onClick={() => void handleCreateTransfer()}>
              {isSubmitting ? "登録中..." : "移動指示を作成する"}
            </Button>
          </div>

          <div className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5">
            <h2 className="text-base font-semibold">移動履歴</h2>
            <ul className="mt-3 space-y-2">
              {transfers.map((item) => (
                <li key={item.id} className="rounded-lg border border-zinc-700/45 bg-zinc-900/55 px-3 py-2 text-xs text-zinc-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p>{new Date(item.createdAtUtc).toLocaleString("ja-JP")}</p>
                    <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${getStatusClass(item.status)}`}>{item.status}</span>
                  </div>
                  <p className="mt-1">
                    {locationNameMap[item.fromLocationId] ?? item.fromLocationId} →{" "}
                    {locationNameMap[item.toLocationId] ?? item.toLocationId} / 数量: {item.quantity}
                  </p>
                  {item.shippedAtUtc && <p className="text-zinc-400">出荷: {new Date(item.shippedAtUtc).toLocaleString("ja-JP")}</p>}
                  {item.receivedAtUtc && <p className="text-zinc-400">入荷: {new Date(item.receivedAtUtc).toLocaleString("ja-JP")}</p>}
                  {item.note && <p className="text-zinc-400">メモ: {item.note}</p>}
                  <div className="mt-2 flex gap-2">
                    {item.status === "移動指示" && (
                      <>
                        <Button disabled={pendingTransferId === item.id} onClick={() => void handleTransferAction(item.id, "ship")}>
                          出荷確定
                        </Button>
                        <Button disabled={pendingTransferId === item.id} onClick={() => void handleTransferAction(item.id, "cancel")}>
                          取消
                        </Button>
                      </>
                    )}
                    {item.status === "出荷済み" && (
                      <Button disabled={pendingTransferId === item.id} onClick={() => void handleTransferAction(item.id, "receive")}>
                        入荷確定
                      </Button>
                    )}
                  </div>
                </li>
              ))}
              {transfers.length === 0 && <li className="text-sm text-zinc-400">移動履歴はまだありません。</li>}
            </ul>
          </div>
        </section>
      </div>

      {error && (
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

export default AdminInventoryPage
