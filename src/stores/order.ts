import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Order, OrderItem } from '@/types/api'

export const useOrderStore = defineStore('order', () => {
  // 订单列表
  const orders = ref<Order[]>([])

  // 添加订单
  const addOrder = (order: Order) => {
    orders.value.push(order)
    saveOrders()
  }

  // 更新订单状态
  const updateOrderStatus = (orderId: string, status: string) => {
    const order = orders.value.find(o => o.id === orderId)
    if (order) {
      order.status = status as any
      saveOrders()
    }
  }

  // 申请退货退款
  const requestRefund = (orderId: string, itemId: number) => {
    const order = orders.value.find(o => o.id === orderId)
    if (order) {
      const item = order.items.find(i => i.id === itemId)
      if (item) {
        item.refundStatus = 'pending'
        saveOrders()
      }
    }
  }

  // 删除订单
  const deleteOrder = (orderId: string) => {
    const index = orders.value.findIndex(order => order.id === orderId)
    if (index !== -1) {
      orders.value.splice(index, 1)
      saveOrders()
    }
  }

  // 保存订单到本地存储
  const saveOrders = () => {
    localStorage.setItem('orders', JSON.stringify(orders.value))
  }

  // 从本地存储加载订单
  const loadOrders = () => {
    const ordersStr = localStorage.getItem('orders')
    if (ordersStr) {
      orders.value = JSON.parse(ordersStr)
    }
  }

  // 初始化时加载订单
  loadOrders()

  return {
    orders,
    addOrder,
    updateOrderStatus,
    requestRefund,
    deleteOrder,
    saveOrders,
    loadOrders
  }
})