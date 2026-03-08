type InventoryAuditQueryInput = {
  take: number
  fromDate?: string
  toDate?: string
}

export function buildInventoryAuditQuery(input: InventoryAuditQueryInput): string {
  const params = new URLSearchParams()
  params.set("take", String(input.take))

  if (input.fromDate) {
    params.set("fromUtc", `${input.fromDate}T00:00:00.000Z`)
  }

  if (input.toDate) {
    params.set("toUtc", `${input.toDate}T23:59:59.999Z`)
  }

  return params.toString()
}
