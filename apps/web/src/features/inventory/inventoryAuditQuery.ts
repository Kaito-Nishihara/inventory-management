type InventoryAuditQueryInput = {
  take: number
  fromDate?: string
  toDate?: string
}

function toExclusiveEndDateIso(dateText: string): string {
  const date = new Date(`${dateText}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString()
}

export function buildInventoryAuditQuery(input: InventoryAuditQueryInput): string {
  const params = new URLSearchParams()
  params.set("take", String(input.take))

  if (input.fromDate) {
    params.set("fromUtc", `${input.fromDate}T00:00:00.000Z`)
  }

  if (input.toDate) {
    params.set("toUtc", toExclusiveEndDateIso(input.toDate))
  }

  return params.toString()
}
