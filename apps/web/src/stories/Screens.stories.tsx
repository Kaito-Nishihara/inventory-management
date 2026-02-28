import type { Meta, StoryObj } from "@storybook/react-vite"
import type { FormEvent } from "react"
import { MemoryRouter } from "react-router-dom"
import LoginPage from "../pages/LoginPage"
import CheckoutPage from "../pages/CheckoutPage"
import OrdersPage from "../pages/OrdersPage"
import ProductsPage from "../pages/ProductsPage"
import type { CategoryResponse, ProductListResponse, ProductResponse } from "../features/catalog/types"
import type { OrderResponse } from "../features/order/types"

const categories: CategoryResponse[] = [
  { id: "all", key: "all", name: "すべて", sortOrder: 0 },
  { id: "cat-1", key: "pc", name: "周辺機器", sortOrder: 1 },
  { id: "cat-2", key: "display", name: "ディスプレイ", sortOrder: 2 },
]

const products: ProductResponse[] = [
  {
    id: "p-1",
    categoryId: "cat-1",
    categoryKey: "pc",
    categoryName: "周辺機器",
    name: "メカニカルキーボード",
    description: "80%配列のメカニカルキーボード",
    price: 12800,
    onHand: 25,
    reserved: 2,
    available: 23,
    version: 1,
  },
  {
    id: "p-2",
    categoryId: "cat-2",
    categoryKey: "display",
    categoryName: "ディスプレイ",
    name: "27インチモニター",
    description: "QHD IPSモニター",
    price: 39800,
    onHand: 10,
    reserved: 1,
    available: 9,
    version: 1,
  },
]

const orderList: OrderResponse[] = [
  {
    id: "8f4f1bb8-8eaf-4e2d-9ec6-c52a49d2f001",
    userId: "2",
    status: "accepted",
    createdAtUtc: "2026-02-28T08:30:00Z",
    updatedAtUtc: "2026-02-28T08:30:00Z",
    items: [{ productId: "p-1", quantity: 1 }],
  },
  {
    id: "8f4f1bb8-8eaf-4e2d-9ec6-c52a49d2f002",
    userId: "2",
    status: "shipped",
    createdAtUtc: "2026-02-28T07:10:00Z",
    updatedAtUtc: "2026-02-28T09:00:00Z",
    items: [{ productId: "p-2", quantity: 1 }],
  },
]

const fetchCategories = async (): Promise<CategoryResponse[]> => categories

const fetchProductsPage = async (): Promise<ProductListResponse> => ({
  items: products,
  totalCount: products.length,
  page: 1,
  pageSize: 20,
  totalPages: 1,
})

const fetchOrders = async (): Promise<OrderResponse[]> => orderList

const fetchOrderById = async (orderId: string): Promise<OrderResponse> =>
  orderList.find((x) => x.id === orderId) ?? orderList[0]

const onSubmit = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault()
}

const meta = {
  title: "Screens/Actual",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const LoginIdle: Story = {
  render: () => (
    <LoginPage
      identityBaseUrl="http://localhost:5001"
      email="admin@test.com"
      password="password"
      status="idle"
      error={null}
      tokenPreview={null}
      adminEmail="admin@test.com"
      userEmail="user@test.com"
      onEmailChange={() => {}}
      onPasswordChange={() => {}}
      onPreset={() => {}}
      onSubmit={onSubmit}
    />
  ),
}

export const LoginError: Story = {
  render: () => (
    <LoginPage
      identityBaseUrl="http://localhost:5001"
      email="admin@test.com"
      password="wrong-password"
      status="error"
      error="メールアドレスまたはパスワードが正しくありません。"
      tokenPreview={null}
      adminEmail="admin@test.com"
      userEmail="user@test.com"
      onEmailChange={() => {}}
      onPasswordChange={() => {}}
      onPreset={() => {}}
      onSubmit={onSubmit}
    />
  ),
}

export const Products: Story = {
  render: () => (
    <MemoryRouter>
      <ProductsPage
        cartCount={2}
        onLogout={() => {}}
        onAddToCart={() => {}}
        fetchCategories={fetchCategories}
        fetchProductsPage={fetchProductsPage}
      />
    </MemoryRouter>
  ),
}

export const Checkout: Story = {
  render: () => (
    <MemoryRouter>
      <CheckoutPage
        cartItems={[
          { productId: "p-1", name: "メカニカルキーボード", price: 12800, available: 23, quantity: 1 },
          { productId: "p-2", name: "27インチモニター", price: 39800, available: 9, quantity: 1 },
        ]}
        isCheckoutLoading={false}
        onLogout={() => {}}
        onRemoveFromCart={() => {}}
        onCartQuantityChange={() => {}}
        onCheckout={async () => ({ results: [], message: "モック表示です。" })}
      />
    </MemoryRouter>
  ),
}

export const Orders: Story = {
  render: () => (
    <MemoryRouter>
      <OrdersPage onLogout={() => {}} fetchOrders={fetchOrders} fetchOrderById={fetchOrderById} />
    </MemoryRouter>
  ),
}
