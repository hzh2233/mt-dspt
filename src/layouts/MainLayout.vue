<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Search,
  ShoppingCart,
  User,
  HomeFilled,
  Goods,
  List,
  SwitchButton,
  ArrowDown
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const cartStore = useCartStore()

const activeIndex = ref(route.path)

// 初始化用户状态和购物车
onMounted(async () => {
  await userStore.initUserState()
  // 只在购物车相关页面才初始化购物车，避免不必要的接口调用
  const cartRelatedPages = ['/cart', '/checkout', '/user/profile']
  if (cartRelatedPages.some(page => route.path.startsWith(page))) {
    cartStore.initCart()
  }
})

// 监听路由变化，在需要时初始化购物车
watch(() => route.path, (newPath) => {
  activeIndex.value = newPath
  
  // 当用户导航到购物车相关页面时，确保购物车已初始化
  const cartRelatedPages = ['/cart', '/checkout', '/user/profile']
  if (cartRelatedPages.some(page => newPath.startsWith(page)) && userStore.isLoggedIn) {
    // 检查购物车是否已经初始化过（避免重复调用）
    if (cartStore.items.length === 0 && !cartStore.loading) {
      cartStore.initCart()
    }
  }
})



// 计算用户是否已登录
const isLoggedIn = computed(() => userStore.isLoggedIn)

// 处理登出
const handleLogout = async () => {
  await userStore.logout()
  router.push('/')
}

const handleSelect = (key: string) => {
  if (key === activeIndex.value) return;
  router.push(key)
}
</script>

<template>
  <el-container class="layout-container">
    <el-header class="modern-header">
      <div class="header-content">
        <!-- Logo区域 -->
        <div class="logo-section">
          <div class="logo">
            <span class="logo-text">易达交易平台</span>
          </div>
        </div>
        
        <!-- 导航菜单 -->
        <el-menu 
          :default-active="activeIndex" 
          class="main-menu" 
          mode="horizontal" 
          @select="handleSelect"
        >
          <el-menu-item index="/" class="nav-item">
            <el-icon class="nav-icon"><HomeFilled /></el-icon>
            <span class="nav-text">首页</span>
          </el-menu-item>
          <el-menu-item index="/products" class="nav-item">
            <el-icon class="nav-icon"><Goods /></el-icon>
            <span class="nav-text">商品列表</span>
          </el-menu-item>
          <el-menu-item index="/coupons" class="nav-item">
            <el-icon class="nav-icon"><Goods /></el-icon>
            <span class="nav-text">优惠券</span>
          </el-menu-item>
          <el-menu-item index="/cart" class="nav-item cart-item">
            <el-icon class="nav-icon"><ShoppingCart /></el-icon>
            <span class="nav-text">购物车</span>
            <el-badge v-if="cartStore.totalItems > 0" :value="cartStore.totalItems" class="cart-badge" />
          </el-menu-item>
        </el-menu>
        
        <!-- 用户区域 -->
        <div class="user-section">
          <!-- 未登录状态 -->
          <el-button v-if="!isLoggedIn" type="primary" class="login-btn" @click="router.push('/login')">
            <el-icon><User /></el-icon>
            <span>登录/注册</span>
          </el-button>
          
          <!-- 已登录状态 -->
          <el-dropdown v-else class="user-dropdown" trigger="hover">
            <div class="user-info">
              <el-avatar 
                :size="36" 
                :src="userStore.userInfo.avatarUrl" 
                class="user-avatar"
              >
                <el-icon><User /></el-icon>
              </el-avatar>
              <span class="user-name">{{ userStore.userInfo.nickname || '用户' }}</span>
              <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu class="user-dropdown-menu">
                <el-dropdown-item @click="router.push('/user/orders')">
                  <el-icon><List /></el-icon>
                  <span>我的订单</span>
                </el-dropdown-item>
                <el-dropdown-item @click="router.push('/user/profile')">
                  <el-icon><User /></el-icon>
                  <span>个人中心</span>
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  <span>退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </el-header>
    <el-main>
      <router-view />
    </el-main>
  </el-container>
</template>
<style scoped>
.layout-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
}

.modern-header {
  padding: 0;
  height: 80px !important;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  position: relative;
  z-index: 1000;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 30px;
  max-width: 1200px;
  margin: 0 auto;
}

.logo-section {
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
}

.logo-text {
  font-size: 26px;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  letter-spacing: 1.5px;
  font-family: 'Microsoft YaHei', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif;
}

.main-menu {
  flex: 1;
  display: flex;
  justify-content: center;
  background: transparent !important;
  border: none !important;
  margin: 0 40px;
}

.main-menu .el-menu-item {
  background: transparent !important;
  border: none !important;
  color: rgba(255, 255, 255, 0.9) !important;
  font-weight: 600;
  margin: 0 12px;
  border-radius: 10px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  height: 60px !important;
  line-height: 60px !important;
  font-family: 'Microsoft YaHei', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif;
}

.main-menu .el-menu-item:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  color: white !important;
  transform: translateY(-2px);
}

.main-menu .el-menu-item.is-active {
  background: rgba(255, 255, 255, 0.2) !important;
  color: white !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 0 20px !important;
  height: 60px !important;
}

.nav-icon {
  margin-right: 10px;
  font-size: 20px;
}

.nav-text {
  font-size: 17px;
  font-weight: 600;
}

.cart-item {
  position: relative;
}

.cart-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 1001;
  transform: scale(0.9);
}

.user-section {
  flex-shrink: 0;
}

.login-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  border-radius: 25px;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 15px;
  transition: all 0.3s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif;
}

.login-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.user-dropdown {
  cursor: pointer;
}

.user-info {
  display: flex;
  align-items: center;
  padding: 10px 20px;
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.user-info:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.user-avatar {
  margin-right: 10px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.user-name {
  color: white;
  font-weight: 600;
  margin-right: 10px;
  font-size: 15px;
  font-family: 'Microsoft YaHei', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif;
}

.dropdown-icon {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  transition: transform 0.3s ease;
}

.user-dropdown:hover .dropdown-icon {
  transform: rotate(180deg);
}

.user-dropdown-menu {
  margin-top: 8px;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.user-dropdown-menu .el-dropdown-item {
  padding: 12px 20px;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

.user-dropdown-menu .el-dropdown-item:hover {
  background: #f5f7fa;
  color: #409eff;
}

.user-dropdown-menu .el-dropdown-item .el-icon {
  margin-right: 8px;
  font-size: 16px;
}

.el-main {
  flex-grow: 1;
  padding: 20px 30px;
  background-color: #f5f7fa;
  width: 100%;
  box-sizing: border-box;
  overflow-y: auto;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    padding: 0 15px;
  }
  
  .main-menu {
    margin: 0 20px;
  }
  
  .nav-text {
    display: none;
  }
  
  .nav-item {
    padding: 0 8px !important;
  }
  
  .user-name {
    display: none;
  }
  
  .logo-text {
    font-size: 22px;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 0 10px;
  }
  
  .main-menu {
    margin: 0 10px;
  }
  
  .el-main {
    padding: 15px;
  }
}
</style>