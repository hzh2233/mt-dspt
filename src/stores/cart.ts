import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CartItem } from '@/types/api'

export const useCartStore = defineStore('cart', () => {
  // 购物车商品列表
  const items = ref<CartItem[]>([])

  // 初始化购物车
  const initCart = () => {
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
  const saveCart = () => {
    localStorage.setItem('cartItems', JSON.stringify(items.value))
  }

  // 添加商品到购物车
  const addItem = (item: CartItem) => {
    const existingItem = items.value.find(i => i.id === item.id)
    
    if (existingItem) {
      existingItem.quantity += item.quantity
    } else {
      items.value.push(item)
    }
    
    saveCart()
  }

  // 更新商品数量
  const updateItemQuantity = (itemId: number, quantity: number) => {
    const item = items.value.find(i => i.id === itemId)
    if (item) {
      item.quantity = Math.max(1, quantity)
      saveCart()
    }
  }

  // 移除商品
  const removeItem = (itemId: number) => {
    const index = items.value.findIndex(i => i.id === itemId)
    if (index !== -1) {
      items.value.splice(index, 1)
      saveCart()
    }
  }

  // 清空购物车
  const clearCart = () => {
    items.value = []
    saveCart()
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
    totalItems,
    totalPrice,
    initCart,
    addItem,
    updateItemQuantity,
    removeItem,
    clearCart
  }
})