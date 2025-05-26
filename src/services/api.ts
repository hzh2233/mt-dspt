import request from '@/utils/request'
import type { User, Product, CartItem, Order, Address } from '@/types/api'

// 用户相关API
export const userApi = {
  // 用户登录
  login(username: string, password: string): Promise<User> {
    return request.post('/user/login', { username, password })
  },

  // 用户注册
  register(username: string, password: string): Promise<User> {
    return request.post('/user/register', { username, password })
  },

  // 获取用户信息
  getUserInfo(): Promise<User> {
    return request.get('/user/info')
  },

  // 更新用户信息
  updateUserInfo(userInfo: Partial<User>): Promise<User> {
    return request.put('/user/info', userInfo)
  },

  // 用户登出
  logout(): Promise<void> {
    return request.post('/user/logout')
  }
}

// 商品相关API
export const productApi = {
  // 获取商品列表
  getProducts(params?: {
    category?: string
    keyword?: string
    page?: number
    size?: number
    sortBy?: string
    minPrice?: number
    maxPrice?: number
  }): Promise<{ products: Product[], total: number }> {
    return request.get('/products', { params })
  },

  // 获取商品详情
  getDetail(id: number): Promise<Product> {
    return request.get(`/products/${id}`)
  },

  // 搜索商品
  search(keyword: string): Promise<Product[]> {
    return request.get('/products/search', { params: { keyword } })
  },

  // 获取推荐商品
  getRecommended(): Promise<Product[]> {
    return request.get('/products/recommend')
  },

  // 获取分类商品
  getByCategory(category: string): Promise<Product[]> {
    return request.get('/products/category', { params: { category } })
  }
}

// 购物车相关API
export const cartApi = {
  // 获取购物车
  getCart(): Promise<CartItem[]> {
    return request.get('/cart')
  },

  // 添加到购物车
  addToCart(item: CartItem): Promise<void> {
    return request.post('/cart', item)
  },

  // 更新购物车商品数量
  updateCartItem(itemId: number, quantity: number): Promise<void> {
    return request.put(`/cart/${itemId}`, { quantity })
  },

  // 删除购物车商品
  removeFromCart(itemId: number): Promise<void> {
    return request.delete(`/cart/${itemId}`)
  },

  // 清空购物车
  clearCart(): Promise<void> {
    return request.delete('/cart')
  }
}

// 订单相关API
export const orderApi = {
  // 创建订单
  create(orderData: {
    items: CartItem[]
    address: Address
    paymentMethod: string
  }): Promise<Order> {
    return request.post('/orders', orderData)
  },

  // 获取订单列表
  getList(params?: {
    status?: string
    page?: number
    size?: number
  }): Promise<{ orders: Order[], total: number }> {
    return request.get('/orders', { params })
  },

  // 获取订单详情
  getDetail(orderId: string): Promise<Order> {
    return request.get(`/orders/${orderId}`)
  },

  // 取消订单
  cancel(orderId: string): Promise<void> {
    return request.put(`/orders/${orderId}/cancel`)
  },

  // 确认收货
  confirm(orderId: string): Promise<void> {
    return request.put(`/orders/${orderId}/confirm`)
  },

  // 申请退货退款
  requestRefund(orderId: string, itemId: number, reason: string): Promise<void> {
    return request.post(`/orders/${orderId}/refund`, { itemId, reason })
  },

  // 删除订单
  delete(orderId: string): Promise<void> {
    return request.delete(`/orders/${orderId}`)
  }
}

// 支付相关API
export const paymentApi = {
  // 处理支付
  processPayment(orderId: string, paymentMethod: string): Promise<{ paymentUrl?: string }> {
    return request.post('/payment', { orderId, paymentMethod })
  },

  // 查询支付状态
  getStatus(orderId: string): Promise<{ status: string }> {
    return request.get(`/payment/${orderId}/status`)
  }
}

// 地址相关API
export const addressApi = {
  // 获取用户地址列表
  getList(): Promise<Address[]> {
    return request.get('/addresses')
  },

  // 添加地址
  add(address: Address): Promise<Address> {
    return request.post('/addresses', address)
  },

  // 更新地址
  update(addressId: string, address: Address): Promise<Address> {
    return request.put(`/addresses/${addressId}`, address)
  },

  // 删除地址
  delete(addressId: string): Promise<void> {
    return request.delete(`/addresses/${addressId}`)
  }
}