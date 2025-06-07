import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/SearchView.vue'),
    meta: { title: '搜索' }
  },
  {
    path: '/products',
    name: 'products',
    component: () => import('@/views/ProductsView.vue'),
    meta: { title: '商品列表' }
  },
  {
    path: '/product/:id',
    name: 'product-detail',
    component: () => import('@/views/ProductDetailView.vue'),
    meta: { title: '商品详情' }
  },
  {
    path: '/cart',
    name: 'cart',
    component: () => import('@/views/CartView.vue'),
    meta: { title: '购物车', requiresAuth: true }
  },
  {
    path: '/checkout',
    name: 'checkout',
    component: () => import('@/views/CheckoutView.vue'),
    meta: { title: '订单结算', requiresAuth: true }
  },
  {
    path: '/payment/:orderId',
    name: 'payment',
    component: () => import('@/views/PaymentView.vue'),
    meta: { title: '订单支付', requiresAuth: true }
  },
  {
    path: '/order/success',
    name: 'order-success',
    component: () => import('@/views/OrderSuccessView.vue'),
    meta: { title: '订单完成' }
  },
  {
    path: '/alipay/toSuccess',
    name: 'payment-callback',
    component: () => import('@/views/PaymentCallbackView.vue'),
    meta: { title: '支付回调' }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { title: '注册' }
  },
  {
    path: '/user/orders',
    name: 'user-orders',
    component: () => import('@/views/UserOrdersView.vue'),
    meta: { title: '我的订单', requiresAuth: true }
  },
  {
    path: '/order-detail/:orderId',
    name: 'order-detail',
    component: () => import('@/views/OrderDetailView.vue'),
    meta: { title: '订单详情', requiresAuth: true }
  },
  {
    path: '/user/profile',
    name: 'user-profile',
    component: () => import('@/views/UserProfileView.vue'),
    meta: { title: '个人中心', requiresAuth: true }
  },
  {
    path: '/coupons',
    name: 'coupons',
    component: () => import('@/views/CouponsView.vue'),
    meta: { title: '优惠券中心' }
  },
  {
    path: '/user/coupons',
    name: 'user-coupons',
    component: () => import('@/views/UserCouponsView.vue'),
    meta: { title: '我的优惠券', requiresAuth: true }
  },
  {
    path: '/user/address',
    name: 'user-address',
    component: () => import('@/views/UserAddressView.vue'),
    meta: { title: '收货地址管理', requiresAuth: true }
  },
  {
    path: '/user/favorites',
    name: 'user-favorites',
    component: () => import('@/views/UserFavoritesView.vue'),
    meta: { title: '我的收藏', requiresAuth: true }
  },
  {
    path: '/user/security',
    name: 'user-security',
    component: () => import('@/views/UserSecurityView.vue'),
    meta: { title: '账户安全', requiresAuth: true }
  },
  {
    path: '/product/:id/comments',
    name: 'comments',
    component: () => import('@/views/CommentsView.vue'),
    meta: { title: '商品评价' }
  },
  {
    path: '/user/comments',
    name: 'user-comments',
    component: () => import('@/views/UserCommentsView.vue'),
    meta: { title: '我的评价', requiresAuth: true }
  },
  {
    path: '/create-comment',
    name: 'create-comment',
    component: () => import('@/views/CreateCommentView.vue'),
    meta: { requiresAuth: true }
  }
]