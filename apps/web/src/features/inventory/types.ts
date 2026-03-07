export type InventoryTransactionResponse = {
  id: string
  productId: string
  type: string
  quantityDelta: number
  onHandAfter: number
  reservedAfter: number
  note?: string | null
  createdAtUtc: string
}

export type StockLocationResponse = {
  id: string
  code: string
  name: string
  type: string
}

export type LocationInventoryStockResponse = {
  locationId: string
  locationCode: string
  locationName: string
  locationType: string
  onHand: number
  version: number
  inTransitOut: number
  inTransitIn: number
}

export type LocationInventoryTransferResponse = {
  id: string
  productId: string
  fromLocationId: string
  toLocationId: string
  quantity: number
  status: string
  note?: string | null
  createdAtUtc: string
  shippedAtUtc?: string | null
  receivedAtUtc?: string | null
}

export type LocationTransferCreatedResponse = {
  transferId: string
}

export type InventoryOperationType = "receive" | "issue" | "adjust"

export type InventoryOperationResult = {
  ok: boolean
  code?: string
  message: string
}
