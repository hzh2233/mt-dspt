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
  SwitchButton
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const cartStore = useCartStore()

const activeIndex = ref(route.path)

// 初始化用户状态和购物车
onMounted(() => {
  userStore.initUserState()
  cartStore.initCart()
})

// 监听路由变化，更新activeIndex
watch(() => route.path, (newPath) => {
  activeIndex.value = newPath
})

// 计算用户是否已登录
const isLoggedIn = computed(() => userStore.isLoggedIn)

// 处理登出
const handleLogout = () => {
  userStore.logout()
  router.push('/')
}

const handleSelect = (key: string) => {
  if (key === activeIndex.value) return;
  router.push(key)
}
</script>

<template>
  <el-container class="layout-container">
    <el-header>
      <el-menu :default-active="activeIndex" class="main-menu" mode="horizontal" @select="handleSelect">
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          首页
        </el-menu-item>
        <el-menu-item index="/products">
          <el-icon><Goods /></el-icon>
          商品列表
        </el-menu-item>
        <el-menu-item index="/cart">
          <el-icon><ShoppingCart /></el-icon>
          购物车
          <!-- <el-badge v-if="cartStore.totalItems > 0" :value="cartStore.totalItems" class="cart-badge" /> -->
        </el-menu-item>
        <!-- 未登录状态显示登录/注册 -->
        <el-menu-item v-if="!isLoggedIn" index="/login" key="login-menu-item">
          <el-icon><User /></el-icon>
          登录/注册
        </el-menu-item>
        <!-- 已登录状态显示用户菜单 -->
        <el-sub-menu v-else index="user-menu" key="user-submenu">
          <template #title :key="userStore.userInfo.username">
            <div>
              <el-icon><User /></el-icon>
              <span>{{ userStore.userInfo.username }}</span>
            </div>
          </template>
          <el-menu-item index="/user/orders" key="user-orders-item">
            <el-icon><List /></el-icon>
            我的订单
          </el-menu-item>
          <el-menu-item index="/user/profile" key="user-profile-item">
            <el-icon><User /></el-icon>
            个人中心
          </el-menu-item>
          <el-menu-item @click="handleLogout" key="logout-item">
            <el-icon><SwitchButton /></el-icon>
            退出登录
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-header>
    <el-main>
      <router-view />
    </el-main>
  </el-container>
</template>
<style scoped>
.el-header,
.el-footer {
  flex-shrink: 0; /* Prevent header/footer from shrinking */
}
.layout-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden; /* Prevent horizontal scroll if something overflows internally */
}
.header {
  padding: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
}
.main-menu {
  display: flex;
  justify-content: flex-start;
  padding: 0 50px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
}
.cart-count {
  font-size: 12px;
  background-color: #f56c6c;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  margin-left: 5px;
}
.el-main {
  flex-grow: 1; /* Allow main content to take available space */
  padding: 20px 50px; /* Restore original padding */
  background-color: #f5f7fa;
  width: 100%; /* Ensure it tries to be full width within the flex column */
  box-sizing: border-box;
  overflow-y: auto; /* Allow vertical scrolling within main content */
}
.el-header {
  padding: 0;
  height: auto !important;
}

.search-bar-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 20px 0;
}

.search-bar {
  width: 60%;
  max-width: 600px;
  margin-right: 20px;
}

.logo {
  width: 100px;
  height: auto;
  margin-left: 20px;
}
</style>