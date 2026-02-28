export type OrderStatusMeta = {
  label: string
  className: string
}

const STATUS_META: Record<string, OrderStatusMeta> = {
  accepted: {
    label: "受付",
    className: "border-sky-400/40 bg-sky-950/40 text-sky-200",
  },
  shipped: {
    label: "出荷",
    className: "border-amber-400/40 bg-amber-950/40 text-amber-200",
  },
  completed: {
    label: "完了",
    className: "border-emerald-400/40 bg-emerald-950/40 text-emerald-200",
  },
  cancelled: {
    label: "キャンセル",
    className: "border-rose-400/40 bg-rose-950/40 text-rose-200",
  },
}

export function getOrderStatusMeta(status: string): OrderStatusMeta {
  return STATUS_META[status] ?? {
    label: status,
    className: "border-zinc-500/45 bg-zinc-800/70 text-zinc-200",
  }
}
