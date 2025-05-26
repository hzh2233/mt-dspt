// API统一响应类型定义
export interface ApiResponse<T = any> {
  // 返回码
  code: number
  // 返回消息
  message: string
  // 返回数据
  data: T
}

// 用户相关类型
export interface User {
  id: string
  username: string
  avatar: string
  token: string
}

// 商品相关类型
export interface Product {
  id: number
  title: string
  price: number
  image: string
  description?: string
  category?: string
  sales?: number
  stock?: number // 添加 stock 属性
  specs?: { name: string; value: string }[] // 添加 specs 属性
}

// 购物车商品类型
export interface CartItem {
  id: number
  title: string
  price: number
  image: string
  quantity: number
}

// 订单状态枚举
export enum OrderStatus {
  PENDING_PAYMENT = '待付款',
  PENDING_SHIPMENT = '待发货',
  SHIPPED = '已发货',
  COMPLETED = '已完成',
  CANCELLED = '已取消'
}

// 订单商品类型
export interface OrderItem {
  id: number
  title: string
  price: number
  quantity: number
  image: string
  // 退货退款状态
  refundStatus?: 'none' | 'pending' | 'approved' | 'rejected'
}

// 订单类型
export interface Order {
  id: string
  date: string
  totalAmount: number
  status: OrderStatus
  paymentMethod: string
  items: OrderItem[]
  address: {
    region: string[]
    detailAddress: string
  }
  phone: string
}

// 地址类型
export interface Address {
  name: string
  phone: string
  region: string[]
  detailAddress: string
}