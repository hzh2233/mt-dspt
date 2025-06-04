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
  id: number
  phone: string // 手机号（登录用）
  password: string
  avatarUrl: string | null
  nickname: string | null // 用户名/昵称
  status: number
  createTime: string | null
  latestTime: string | null
  token?: string // token可选，因为获取用户信息时可能不返回token
}

// 登录响应类型 - 后端返回标准API响应格式，data字段包含token字符串
export type LoginResponse = ApiResponse<string>

// 图形验证码响应类型
export interface CaptchaResponse {
  key: string // 验证码key
  image: string // 验证码图片的base64或URL
}

// 商品相关类型
export interface Product {
  id: number
  title: string
  price: number
  image: string
  description?: string
  category?: number // 修改为number类型，对应分类ID
  sales?: number
  stock?: number // 添加 stock 属性
  specs?: { name: string; value: string }[] // 添加 specs 属性
}

// 购物车商品类型（前端显示用）
export interface CartItem {
  id: number // 购物车ID
  productId: number // 商品ID
  title: string
  price: number
  image: string
  quantity: number
}

// 后端购物车项类型（对应Cart实体）
export interface BackendCartItem {
  cartId?: number
  userId: number
  productId: number
  quantity: number
  unitPrice: number
}

// 购物车API响应类型
export interface CartResponse {
  cartId: number
  userId: number
  productId: number
  quantity: number
  unitPrice: number
  // 关联的商品信息
  product?: {
    goodId: number
    goodName: string
    coverUrl: string
    price: number
    stock: number
  }
}

// 订单状态枚举
export enum OrderStatus {
  PENDING_PAYMENT = '待付款',
  PENDING_SHIPMENT = '待发货',
  SHIPPED = '已发货',
  COMPLETED = '已完成',
  CANCELLED = '已取消',
  REFUNDED = '已退款'
}

// 订单商品类型
export interface OrderItem {
  id: number // 购物车ID或临时ID
  productId: number // 商品ID
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
  orderId: string | number
  date: string
  orderTime?: string
  totalAmount: number
  status: OrderStatus | number
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
  id?: number // 地址ID，新增时可选
  userId?: number // 用户ID，由后端自动设置
  receiver: string // 收货人姓名
  phone: string // 手机号
  provinceCode: string // 省份代码
  provinceName: string // 省份名称
  cityCode: string // 城市代码
  cityName: string // 城市名称
  districtCode: string // 区县代码
  districtName: string // 区县名称
  detailAddress: string // 详细地址
  isDefault: number // 是否默认地址 0-否 1-是
  tag?: string // 地址标签（家/公司/学校）
  
  // 兼容旧版本的字段（用于前端显示）
  name?: string // 兼容字段，映射到receiver
  region?: string[] // 兼容字段，用于级联选择器
}

// 后端地址响应类型
export interface BackendAddress {
  id: number
  userId: number
  receiver: string
  phone: string
  provinceCode: string
  provinceName: string
  cityCode: string
  cityName: string
  districtCode: string
  districtName: string
  detailAddress: string
  isDefault: number
  tag: string
}

// 地址请求类型
export interface AddressRequest {
  id?: number
  receiver: string
  phone: string
  provinceCode: string
  provinceName: string
  cityCode: string
  cityName: string
  districtCode: string
  districtName: string
  detailAddress: string
  isDefault: number
  tag?: string
}

// 商品分类类型
export interface GoodType {
  categoryId: number
  categoryName: string
  icon?: string
}

// 优惠券相关类型
// 优惠券基础信息
export interface Coupon {
  id: number
  title: string // 名称（如"新客立减券"）
  type: number // 类型：1-满减 2-折扣
  value: number // 面值（满减金额/折扣率）
  minAmount: number // 最低使用金额
  startTime: string // 有效期开始
  endTime: string // 有效期结束
  total: number // 发放总量
  description?: string // 优惠券描述
}

// 用户持有的优惠券
export interface UserCoupon {
  id: number
  userId: number
  couponId: number
  status: number // 状态：1-未用 2-已用 3-过期
  receiveTime: string // 领取时间
  expireTime: string // 过期时间
  coupon?: Coupon // 关联的优惠券信息
}

// 可领取的优惠券（包含领取状态）
export interface AvailableCoupon extends Coupon {
  canReceive: boolean // 是否可以领取
  received: boolean // 是否已领取
  remainingCount: number // 剩余数量
}

// 优惠券使用计算结果
export interface CouponCalculation {
  couponId: number
  discountAmount: number // 优惠金额
  finalAmount: number // 最终金额
  applicable: boolean // 是否可用
  reason?: string // 不可用原因
}

// 收藏相关类型
// 收藏信息
export interface Favorite {
  id: number // 收藏ID
  userId: number // 用户ID
  productId: number // 商品ID
  createTime: string // 收藏时间
  product?: Product // 关联的商品信息
}

// 收藏请求类型
export interface FavoriteRequest {
  productId: number // 商品ID
}