import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types/api'

export const useUserStore = defineStore('user', () => {
  // 用户信息
  const userInfo = ref<User>({
    id: '',
    username: '',
    avatar: '',
    token: ''
  })

  // 登录状态
  const isLoggedIn = ref(false)

  // 初始化用户状态
  const initUserState = () => {
    const token = localStorage.getItem('token')
    const userInfoStr = localStorage.getItem('userInfo')
    
    if (token && userInfoStr) {
      try {
        const parsedUserInfo = JSON.parse(userInfoStr)
        userInfo.value = parsedUserInfo
        isLoggedIn.value = true
      } catch (error) {
        console.error('解析用户信息失败', error)
        clearUserState()
      }
    }
  }

  // 设置用户信息
  const setUserInfo = (user: User) => {
    userInfo.value = user
    isLoggedIn.value = true
    
    // 保存到本地存储
    localStorage.setItem('token', user.token)
    localStorage.setItem('userInfo', JSON.stringify(user))
  }

  // 清除用户状态
  const clearUserState = () => {
    userInfo.value = {
      id: '',
      username: '',
      avatar: '',
      token: ''
    }
    isLoggedIn.value = false
    
    // 清除本地存储
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  // 登出
  const logout = () => {
    clearUserState()
  }

  return {
    userInfo,
    isLoggedIn,
    initUserState,
    setUserInfo,
    clearUserState,
    logout
  }
})