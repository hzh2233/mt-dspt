<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

// 订单数据
const orderInfo = ref({
  id: 'ORDER' + Date.now(),
  totalAmount: localStorage.getItem('lastOrderAmount') || 0,
  paymentMethod: '',
  paymentTime: new Date().toLocaleString(),
  username: userStore.userInfo.username || '游客',
  address: JSON.parse(localStorage.getItem('lastOrderAddress') || '{}'), // 添加收货地址
  phone: localStorage.getItem('lastOrderPhone') || '' // 添加手机号
})

import { useOrderStore } from '@/stores/order'
import { type Order, OrderStatus } from '@/types/api' // 导入 OrderStatus

const orderStore = useOrderStore()

// 在组件挂载时获取支付信息
onMounted(() => {
  // 从localStorage获取支付方式
  const paymentMethod = localStorage.getItem('lastPaymentMethod') || '支付宝'
  
  // 根据支付方式显示对应的中文名称
  let paymentMethodName = '支付宝'
  if (paymentMethod === 'wechat') {
    paymentMethodName = '微信支付'
  } else if (paymentMethod === 'unionpay') {
    paymentMethodName = '银联支付'
  }
  
  orderInfo.value.paymentMethod = paymentMethodName
  
  // 从localStorage获取订单商品信息
  const orderItems = localStorage.getItem('lastOrderItems')
  let items = []
  if (orderItems) {
    try {
      items = JSON.parse(orderItems)
    } catch (error) {
      console.error('解析订单商品数据失败', error)
    }
  }

  // 保存订单数据
  const order: Order = { // 明确指定类型为 Order
    id: orderInfo.value.id,
    date: orderInfo.value.paymentTime,
    totalAmount: Number(localStorage.getItem('lastOrderAmount')) || 0,
    status: OrderStatus.COMPLETED, // 修改为 OrderStatus 枚举值
    paymentMethod: orderInfo.value.paymentMethod,
    items: items,
    address: orderInfo.value.address,
    phone: orderInfo.value.phone
  }
  orderStore.addOrder(order)
})

// 返回首页
const goToHome = () => {
  router.push('/')
}

// 查看订单
const viewOrders = () => {
  router.push('/user/orders')
}
</script>

<template>
  <div class="success-view">
    <el-card class="success-card">
      <div class="success-icon">
        <el-icon color="#67c23a" :size="64"><CircleCheck /></el-icon>
      </div>
      
      <h1 class="success-title">支付成功</h1>
      
      <div class="order-info">
        <p class="order-id">订单号：{{ orderInfo.id }}</p>
        <p class="order-amount">支付金额：<span class="price">¥{{ orderInfo.totalAmount }}</span></p>
        <p class="order-address">收货地址：{{ orderInfo.address.region.join('') }}{{ orderInfo.address.detailAddress }}</p>
        <p class="order-phone">联系电话：{{ orderInfo.phone }}</p>
        <p class="payment-method">支付方式：{{ orderInfo.paymentMethod }}</p>
        <p class="payment-time">支付时间：{{ orderInfo.paymentTime }}</p>
      </div>
      
      <div class="action-buttons">
        <el-button type="primary" @click="viewOrders">查看订单</el-button>
        <el-button @click="goToHome">返回首页</el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.success-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);
  
  .success-card {
    width: 100%;
    max-width: 600px;
    text-align: center;
    
    .success-icon {
      margin: 20px 0;
    }
    
    .success-title {
      font-size: 24px;
      color: #67c23a;
      margin-bottom: 30px;
    }
    
    .order-info {
      padding: 20px;
      background-color: #f5f7fa;
      border-radius: 4px;
      margin-bottom: 30px;
      text-align: left;
      
      p {
        margin: 10px 0;
        color: #666;
        
        &:first-child {
          margin-top: 0;
        }
        
        &:last-child {
          margin-bottom: 0;
        }
      }
      
      .price {
        color: #f56c6c;
        font-size: 20px;
        font-weight: bold;
      }
    }
    
    .action-buttons {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-bottom: 20px;
    }
  }
}
</style>