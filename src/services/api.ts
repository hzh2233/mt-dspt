import request from '@/utils/request'
import type { User, Product, CartItem, BackendCartItem, CartResponse, Order, Address, LoginResponse, GoodType, BackendAddress, AddressRequest, Coupon, UserCoupon, AvailableCoupon, CouponCalculation, Favorite, FavoriteRequest, CaptchaResponse } from '@/types/api'

// 用户相关API
export const userApi = {
  // 用户登录
  login(phone: string, password?: string, code?: string, captchaCode?: string, captchaKey?: string): Promise<{ token: string, userInfo: any }> {
    return request.post('/user/login', { phone, password, code, captchaCode, captchaKey }).then((response: any) => {
      const token = response as string
      return { token, userInfo: null }
    })
  },

  // 用户注册
  register(phone: string, password: string, verificationCode: string, captchaCode: string, captchaKey: string, nickname: string): Promise<{ token: string, userInfo: any }> {
    return request.post('/user/register', { phone, password, verificationCode, captchaCode, captchaKey, nickname }).then((response: any) => {
      const token = response as string
      return { token, userInfo: null }
    })
  },

  // 获取验证码
  getVerificationCode(phone: string): Promise<void> {
    return request.get('/user/code', { params: { phone } })
  },

  // 获取图形验证码
  getCaptcha(): Promise<CaptchaResponse> {
    return request.get('/user/captcha').then((response: any) => {
      return response.data || response
    })
  },

  // 获取用户信息
  getUserInfo(): Promise<{ id: number, phone: string, avatarUrl: string, nickname: string }> {
    return request.get('/user/info').then((response: any) => {
      return response.data || response
    })
  },

  // 更新用户信息
  updateUserInfo(userInfo: { nickname?: string, avatarUrl?: string, phone?: string }): Promise<any> {
    return request.put('/user/update', userInfo).then((response: any) => {
      return response.data || response
    })
  },

  // 上传头像
  uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData()
    formData.append('avatar', file)
    return request.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }).then((response: any) => {
      // 响应拦截器已经返回了data字段，response就是URL字符串
      return { avatarUrl: response }
    })
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
    return request.get('/products', { params }).then((response: any) => {
      // 映射后端字段到前端期望的字段
      const items = response.records || []
      const mappedProducts = items.map((item: any) => ({
        id: item.goodId,
        title: item.goodName,
        price: item.price,
        image: item.coverUrl?.trim(),
        description: item.description,
        stock: item.stock,
        category: item.categoryId
      }))
      
      return {
        products: mappedProducts,
        total: response.total || 0
      }
    })
  },

  // 获取商品详情
  getDetail(id: number): Promise<Product> {
    return request.get(`/products/detail?id=${id}`).then((response: any) => {
      // 映射后端字段到前端期望的字段
      return {
        id: response.goodId,
        title: response.goodName,
        price: response.price,
        image: response.coverUrl?.trim(),
        description: response.description,
        stock: response.stock,
        category: response.categoryId
      }
    })
  },

  // 搜索商品
  search(params: {
    keyword?: string
    pageNum?: number
    pageSize?: number
    minPrice?: number
    maxPrice?: number
    sort?: string
  }): Promise<{ products: Product[], total: number }> {
    return request.get('/products/search', { params }).then((response: any) => {
      // 映射后端字段到前端期望的字段
      const mappedProducts = response.records.map((item: any) => ({
        id: item.goodId,
        title: item.goodName,
        price: item.price,
        image: item.coverUrl?.trim(),
        description: item.description,
        stock: item.stock,
        category: item.categoryId
      }))
      
      return {
        products: mappedProducts,
        total: response.total
      }
    })
  },

  // 获取推荐商品
  getRecommended(params?: {
    pageNum?: number
    pageSize?: number
  }): Promise<{ products: Product[], total: number }> {
    return request.get('/products/recommend', { params }).then((response: any) => {
      // 映射后端字段到前端期望的字段
      const mappedProducts = response.records.map((item: any) => ({
        id: item.goodId,
        title: item.goodName,
        price: item.price,
        image: item.coverUrl?.trim(), // 去除可能的空格
        description: item.description,
        stock: item.stock,
        category: item.categoryId
      }))
      
      return {
        products: mappedProducts,
        total: response.total
      }
    })
  },

  // 获取分类商品
  getByCategory(params: {
    category: number
    pageNum?: number
    pageSize?: number
  }): Promise<{ products: Product[], total: number }> {
    return request.get('/products/category', { params }).then((response: any) => {
      // 映射后端字段到前端期望的字段
      const mappedProducts = response.records.map((item: any) => ({
        id: item.goodId,
        title: item.goodName,
        price: item.price,
        image: item.coverUrl?.trim(),
        description: item.description,
        stock: item.stock,
        category: item.categoryId
      }))
      
      return {
        products: mappedProducts,
        total: response.total
      }
    })
  }
}

// 购物车相关API
export const cartApi = {
  // 获取购物车列表
  getCart(): Promise<CartItem[]> {
    return request.get('/cart/list').then((response: any) => {
      // 将后端返回的购物车数据转换为前端需要的格式
      const cartData = response.data || response
      return cartData.map((item: CartResponse) => ({
        id: item.cartId, // 使用购物车ID而不是商品ID
        productId: item.productId, // 保留商品ID用于其他用途
        title: item.product?.goodName || '',
        price: item.unitPrice,
        image: item.product?.coverUrl?.trim() || '',
        quantity: item.quantity
      }))
    })
  },

  // 获取购物车分页列表
  getCartWithPagination(params: {
    page?: number
    size?: number
  }): Promise<{ items: CartItem[], total: number, current: number, size: number }> {
    return request.get('/cart/list/page', { params }).then((response: any) => {
      // 将后端返回的分页购物车数据转换为前端需要的格式
      const pageData = response.data || response
      const items = (pageData.records || []).map((item: CartResponse) => ({
        id: item.cartId, // 使用购物车ID而不是商品ID
        productId: item.productId, // 保留商品ID用于其他用途
        title: item.product?.goodName || '',
        price: item.unitPrice,
        image: item.product?.coverUrl?.trim() || '',
        quantity: item.quantity
      }))
      
      return {
        items,
        total: pageData.total || 0,
        current: pageData.current || 1,
        size: pageData.size || 10
      }
    })
  },

  // 添加商品到购物车
  addToCart(productId: number, quantity: number, unitPrice: number): Promise<void> {
    return request.post('/cart/add', {
      productId,
      quantity,
      unitPrice
    })
  },

  // 更新购物车商品数量
  updateCartItem(productId: number, quantity: number): Promise<void> {
    return request.put('/cart/update', {
      productId,
      quantity
    })
  },

  // 删除购物车商品
  removeFromCart(cartId: number): Promise<void> {
    return request.delete(`/cart/remove/${cartId}`)
  },

  // 批量删除购物车商品
  removeBatchFromCart(cartIds: number[]): Promise<void> {
    return request.delete('/cart/removeBatch', {
      data: { cartIds }
    })
  },

  // 清空购物车
  clearCart(): Promise<void> {
    return request.delete('/cart/clear')
  }
}

// 订单相关API
export const orderApi = {
  // 创建订单
  create(orderData: {
    addressId: number
    couponId?: number | null
    items: {
      productId: number
      quantity: number
    }[]
    actualPayAmount: number
  }): Promise<{ orderId: string }> {
    return request.post('/orders/create', orderData).then((response: any) => {
      // json-bigint已经将大整数订单ID作为字符串处理，避免精度丢失
      return { orderId: response }
    })
  },

  // 获取订单列表
  getList(params?: {
    status?: number
    page?: number
    size?: number
  }): Promise<{ orders: Order[], total: number }> {
    return request.get('/orders/list', { params })
  },

  // 获取订单详情
  getDetail(orderId: string | number): Promise<Order> {
    return request.get('/orders/detail', { params: { orderId: orderId.toString() } })
  },

  // 取消订单
  cancel(orderId: number): Promise<void> {
    return request.put('/orders/cancel', { orderId: orderId.toString() })
  },

  // 确认收货
  confirm(orderId: number): Promise<void> {
    return request.put('/orders/confirm', { orderId: orderId.toString() })
  },

  // 申请退货退款
  requestRefund(orderId: string, itemId: number, reason: string): Promise<void> {
    return request.post('/orders/refund', { orderId: orderId.toString(), itemId, reason })
  },

  // 删除订单
  delete(orderId: string): Promise<void> {
    return request.delete('/orders/delete', { data: { orderId: orderId.toString() } })
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
    return request.get('/payment/status', { params: { orderId: orderId.toString() } })
  }
}

// 地址相关API
export const addressApi = {
  // 获取用户地址列表
  getList(): Promise<BackendAddress[]> {
    return request.get('/user-address/list').then((response: any) => {
      return response.data || response
    })
  },

  // 添加地址
  add(address: AddressRequest): Promise<BackendAddress> {
    return request.post('/user-address/add', address).then((response: any) => {
      return response.data || response
    })
  },

  // 更新地址
  update(addressId: number, address: AddressRequest): Promise<BackendAddress> {
    return request.put('/user-address/update', address).then((response: any) => {
      return response.data || response
    })
  },

  // 删除地址
  delete(addressId: number): Promise<void> {
    return request.delete(`/user-address/delete/${addressId}`)
  },

  // 设置默认地址
  setDefault(addressId: number): Promise<void> {
    return request.put(`/user-address/set-default/${addressId}`)
  },

  getDefault(): Promise<BackendAddress> {
    return request.get('/user-address/default')
  }
}

// 商品分类相关API
export const goodTypeApi = {
  // 获取商品分类列表
  getList(): Promise<GoodType[]> {
    return request.get('/goodType/list')
  }
}

// 优惠券相关API
export const couponApi = {
  // 获取可领取的优惠券列表
  getAvailableCoupons(): Promise<AvailableCoupon[]> {
    return request.get('/coupon/available').then((response: any) => {
      const coupons = response.data || response
      // 将后端数据转换为前端需要的格式
      return coupons.map((coupon: any) => ({
        ...coupon,
        remainingCount: coupon.total, // 将total映射为remainingCount
        canReceive: coupon.total > 0, // 根据库存判断是否可领取
        received: false // 默认未领取，实际状态需要后端提供
      }))
    })
  },

  // 领取优惠券
  receiveCoupon(couponId: number): Promise<void> {
    return request.post('/coupon/receive', { couponId })
  },

  // 获取用户的优惠券列表
  getUserCoupons(): Promise<UserCoupon[]> {
    return request.get('/coupon/user-coupons').then((response: any) => {
      const data = response.data || response
      // 将后端返回的优惠券数据映射为UserCoupon格式
      return data.map((item: any) => {
        // 根据过期时间和其他条件判断优惠券状态
        let status = 1 // 默认未使用
        const now = new Date()
        const endTime = new Date(item.endTime)
        
        if (endTime < now) {
          status = 3 // 已过期
        }
        // 注意：这里无法判断是否已使用，需要后端提供实际的使用状态
        // 如果后端有status字段，应该使用 item.status
        
        return {
          id: item.id,
          userId: 1, // 临时用户ID，实际应该从用户信息获取
          couponId: item.id,
          status: item.status || status, // 优先使用后端返回的状态，否则使用计算的状态
          receiveTime: item.startTime,
          expireTime: item.endTime,
          coupon: {
            id: item.id,
            title: item.title,
            type: item.type,
            value: item.value,
            minAmount: item.minAmount,
            startTime: item.startTime,
            endTime: item.endTime,
            total: item.total,
            description: item.description
          }
        }
      })
    })
  },

  // 获取可用于订单的优惠券
  getUsableCoupons(totalAmount: number): Promise<UserCoupon[]> {
    return request.get('/coupon/usable', { 
      params: { totalAmount } 
    }).then((response: any) => {
      return response.data || response
    })
  },

  // 计算优惠券优惠金额
  calculateDiscount(couponId: number, totalAmount: number): Promise<CouponCalculation> {
    return request.post('/coupon/calculate', { 
      couponId, 
      totalAmount 
    }).then((response: any) => {
      return response.data || response
    })
  },

  // 使用优惠券（在订单中）
  useCoupon(couponId: number, orderId: string): Promise<void> {
    return request.post('/coupon/use', { couponId, orderId })
  }
}

// 收藏相关API
export const favoriteApi = {
  // 添加收藏
  addFavorite(productId: number): Promise<void> {
    return request.post('/favorite/add', null, {
      params: { productId }
    })
  },

  // 取消收藏
  removeFavorite(productId: number): Promise<void> {
    return request.delete('/favorite/remove', {
      params: { productId }
    })
  },

  // 获取收藏列表
  getFavorites(params?: {
    page?: number
    size?: number
  }): Promise<{ favorites: Favorite[], total: number }> {
    return request.get('/favorite/list', { params }).then((response: any) => {
      const data = response.data || response
      // 映射后端字段到前端期望的字段
      const favorites = (data.records || data).map((item: any) => ({
        id: item.favoriteId || item.id,
        userId: item.userId,
        productId: item.good?.goodId || item.productId,
        createTime: item.collectedAt || item.createTime,
        product: item.good ? {
          id: item.good.goodId,
          title: item.good.goodName,
          price: item.good.price,
          image: item.good.coverUrl?.trim(),
          description: item.good.description,
          stock: item.good.stock,
          category: item.good.categoryId
        } : undefined
      }))
      
      return {
        favorites,
        total: data.total || favorites.length
      }
    })
  },

  // 检查商品是否已收藏
  checkFavorite(productId: number): Promise<{ isFavorite: boolean }> {
    return request.get('/favorite/check', { 
      params: { productId } 
    }).then((response: any) => {
      return { isFavorite: response.data || response || false }
    })
  }
}