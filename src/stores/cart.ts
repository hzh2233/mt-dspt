import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { cartApi } from '@/services/api'
import { useUserStore } from './user'
import type { CartItem } from '@/types/api'

export const useCartStore = defineStore('cart', () => {
  // 购物车商品列表
  const items = ref<CartItem[]>([])
  const loading = ref(false)

  // 获取用户store
  const userStore = useUserStore()

  // 初始化购物车
  const initCart = async () => {
    if (userStore.isLoggedIn && localStorage.getItem('token')) {
      // 用户已登录且有有效token，从后端获取购物车数据
      await loadCartFromServer()
    } else {
      // 用户未登录或无有效token，从本地存储获取
      loadCartFromLocal()
    }
  }

  // 从服务器加载购物车
  const loadCartFromServer = async () => {
    try {
      loading.value = true
      const cartData = await cartApi.getCart()
      items.value = cartData
    } catch (error) {
      console.error('获取购物车数据失败:', error)
      ElMessage.error('获取购物车数据失败')
      // 失败时尝试从本地加载
      loadCartFromLocal()
    } finally {
      loading.value = false
    }
  }

  // 从本地存储加载购物车
  const loadCartFromLocal = () => {
    const cartData = localStorage.getItem('cartItems')
    if (cartData) {
      try {
        items.value = JSON.parse(cartData)
      } catch (error) {
        console.error('解析购物车数据失败', error)
        items.value = []
      }
    }
  }

  // 保存购物车到本地存储
  const saveCartToLocal = () => {
    localStorage.setItem('cartItems', JSON.stringify(items.value))
  }

  // 同步本地购物车到服务器（用户登录后调用）
  const syncCartToServer = async () => {
    if (!userStore.isLoggedIn || !localStorage.getItem('token')) return

    try {
      // 如果本地购物车为空，不需要同步
      if (items.value.length === 0) {
        return
      }
      
      // 先清空服务器购物车
      await cartApi.clearCart()
      
      // 将本地购物车数据同步到服务器
      for (const item of items.value) {
        await cartApi.addToCart(item.productId, item.quantity, item.price)
      }
      
      // 清空本地存储
      localStorage.removeItem('cartItems')
      
      ElMessage.success('购物车数据已同步')
    } catch (error) {
      console.error('同步购物车失败:', error)
      ElMessage.error('同步购物车失败')
    }
  }

  // 添加商品到购物车
  const addItem = async (item: CartItem) => {
    const existingItem = items.value.find(i => i.productId === item.productId)
    
    if (userStore.isLoggedIn) {
      // 用户已登录，调用后端API
      try {
        if (existingItem) {
          // 更新数量
          const newQuantity = existingItem.quantity + item.quantity
          await cartApi.updateCartItem(item.productId, newQuantity)
          existingItem.quantity = newQuantity
        } else {
          // 添加新商品
          await cartApi.addToCart(item.productId, item.quantity, item.price)
          // 重新加载购物车以获取正确的cartId
          await loadCartFromServer()
        }
      } catch (error) {
        console.error('添加到购物车失败:', error)
        ElMessage.error('添加到购物车失败')
        return
      }
    } else {
      // 用户未登录，保存到本地
      if (existingItem) {
        existingItem.quantity += item.quantity
      } else {
        items.value.push(item)
      }
      saveCartToLocal()
    }
  }

  // 更新商品数量
  const updateItemQuantity = async (itemId: number, quantity: number) => {
    const item = items.value.find(i => i.id === itemId)
    if (!item) return

    const newQuantity = Math.max(1, quantity)
    
    if (userStore.isLoggedIn) {
      // 用户已登录，调用后端API
      try {
        await cartApi.updateCartItem(item.productId, newQuantity)
        item.quantity = newQuantity
      } catch (error) {
        console.error('更新购物车失败:', error)
        ElMessage.error('更新购物车失败')
      }
    } else {
      // 用户未登录，更新本地数据
      item.quantity = newQuantity
      saveCartToLocal()
    }
  }

  // 移除商品
  const removeItem = async (itemId: number) => {
    if (userStore.isLoggedIn) {
      // 用户已登录，调用后端API
      try {
        await cartApi.removeFromCart(itemId)
        const index = items.value.findIndex(i => i.id === itemId)
        if (index !== -1) {
          items.value.splice(index, 1)
        }
      } catch (error) {
        console.error('删除购物车商品失败:', error)
        ElMessage.error('删除购物车商品失败')
      }
    } else {
      // 用户未登录，删除本地数据
      const index = items.value.findIndex(i => i.id === itemId)
      if (index !== -1) {
        items.value.splice(index, 1)
        saveCartToLocal()
      }
    }
  }

  // 批量删除商品
  const removeBatchItems = async (itemIds: number[]) => {
    if (userStore.isLoggedIn) {
      // 用户已登录，调用后端API
      try {
        await cartApi.removeBatchFromCart(itemIds)
        items.value = items.value.filter(item => !itemIds.includes(item.id))
      } catch (error) {
        console.error('批量删除购物车商品失败:', error)
        ElMessage.error('批量删除购物车商品失败')
      }
    } else {
      // 用户未登录，删除本地数据
      items.value = items.value.filter(item => !itemIds.includes(item.id))
      saveCartToLocal()
    }
  }

  // 清空购物车
  const clearCart = async () => {
    if (userStore.isLoggedIn && localStorage.getItem('token')) {
      // 用户已登录且有有效token，调用后端API
      try {
        await cartApi.clearCart()
        items.value = []
      } catch (error) {
        console.error('清空购物车失败:', error)
        ElMessage.error('清空购物车失败')
      }
    } else {
      // 用户未登录或无有效token，清空本地数据
      items.value = []
      saveCartToLocal()
    }
  }

  // 计算购物车商品总数
  const totalItems = computed(() => {
    return items.value.reduce((total, item) => total + item.quantity, 0)
  })

  // 计算购物车商品总价
  const totalPrice = computed(() => {
    return items.value.reduce((total, item) => total + item.price * item.quantity, 0)
  })

  return {
    items,
    loading,
    totalItems,
    totalPrice,
    initCart,
    loadCartFromServer,
    syncCartToServer,
    addItem,
    updateItemQuantity,
    removeItem,
    removeBatchItems,
    clearCart
  }
})