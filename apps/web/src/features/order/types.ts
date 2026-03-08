export type OrderItemResponse = {
  productId: string
  quantity: number
}

export type OrderResponse = {
  id: string
  userId: string
  status: string
  createdAtUtc: string
  updatedAtUtc: string
  items: OrderItemResponse[]
  statusHistories?: OrderStatusHistoryResponse[]
}

export type OrderStatusHistoryResponse = {
  id: string
  status: string
  note: string
  createdAtUtc: string
}
