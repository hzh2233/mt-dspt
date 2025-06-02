import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types/api'
import { userApi } from '@/services/api'
import { useCartStore } from './cart'

export const useUserStore = defineStore('user', () => {
  // 用户信息
  const userInfo = ref<User>({
    id: 0,
    nickname: '',
    password: '',
    status: 0,
    createTime: '',
    latestTime: '',
    phone: '',
    avatarUrl: ''
  })

  // 登录状态
  const isLoggedIn = ref(false)

  // 判断用户是否认证（已登录）
  const isAuthenticated = computed(() => isLoggedIn.value)

  // 初始化用户状态
  const initUserState = async () => {
    const token = localStorage.getItem('token')
    
    if (token) {
      try {
        // 使用token获取最新的用户信息
      const userData = await userApi.getUserInfo()
      userInfo.value = {
        ...userInfo.value,
        id: userData.id,
        phone: userData.phone,
        avatarUrl: userData.avatarUrl,
        nickname: userData.nickname
      }
      isLoggedIn.value = true
      } catch (error) {
        console.error('获取用户信息失败', error)
        clearUserState()
      }
    }
  }

  // 设置token并获取用户信息
  const setToken = async (token: string) => {
    // 先清除之前的状态
    clearUserState()
    
    // 保存token到本地存储
    localStorage.setItem('token', token)
    
    try {
      // 使用token通过/user/info接口获取用户信息
      const userData = await userApi.getUserInfo()
      userInfo.value = {
        ...userInfo.value,
        id: userData.id,
        phone: userData.phone,
        avatarUrl: userData.avatarUrl,
        nickname: userData.nickname
      }
      isLoggedIn.value = true
      
      // 登录成功后同步购物车
      const cartStore = useCartStore()
      await cartStore.syncCartToServer()
      
      return userData
    } catch (error) {
      console.error('获取用户信息失败', error)
      // 如果获取用户信息失败，清除token和状态
      clearUserState()
      throw error // 重新抛出错误，让调用者知道获取用户信息失败
    }
  }
  
  // 设置用户信息
  const setUserInfo = (userData: Partial<User>) => {
    userInfo.value = { ...userInfo.value, ...userData }
    isLoggedIn.value = true
  }

  // 清除用户状态
  const clearUserState = () => {
    userInfo.value = {
      id: 0,
      nickname: '',
      phone: '',
      password: '',
      avatarUrl: '',
      status: 0,
      createTime: '',
      latestTime: '',
    }
    isLoggedIn.value = false
    
    // 清除本地存储
    localStorage.removeItem('token')
  }

  // 登出
  const logout = async () => {
    try {
      // 调用后端登出接口
      await userApi.logout()
    } catch (error) {
      console.error('登出请求失败', error)
      // 即使后端请求失败，也要清除本地状态
    } finally {
      // 只清除用户状态，不清空购物车数据（购物车数据保存在数据库中）
      clearUserState()
    }
  }

  return {
    userInfo,
    isLoggedIn,
    isAuthenticated,
    initUserState,
    setToken,
    setUserInfo,
    clearUserState,
    logout
  }
})