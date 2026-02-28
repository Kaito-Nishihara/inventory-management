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
}
