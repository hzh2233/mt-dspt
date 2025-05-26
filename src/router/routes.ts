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
    meta: { title: '购物车' }
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
    meta: { title: '订单完成', requiresAuth: true }
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
    path: '/user/profile',
    name: 'user-profile',
    component: () => import('@/views/UserProfileView.vue'),
    meta: { title: '个人中心', requiresAuth: true }
  }
]