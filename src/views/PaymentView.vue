<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Money, ChatDotRound, CreditCard } from '@element-plus/icons-vue'
import { orderApi } from '@/services/api'
import type { Order } from '@/types/api'
import axios from 'axios'

const route = useRoute()
const router = useRouter()

const orderId = route.params.orderId as string
const loading = ref(false)
const orderLoading = ref(false)

// 支付方式
const paymentMethod = ref('alipay')

// 订单详情
const orderDetail = ref<Order | null>(null)

// 倒计时相关
const countdown = ref(0)
const countdownTimer = ref<ReturnType<typeof setInterval> | null>(null)

// 格式化订单创建时间
const formatOrderTime = (timeStr: string) => {
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 计算倒计时
const formatCountdown = computed(() => {
  const minutes = Math.floor(countdown.value / 60)
  const seconds = countdown.value % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

// 启动倒计时
const startCountdown = (orderTime: string) => {
  const orderDate = new Date(orderTime)
  const expireTime = new Date(orderDate.getTime() + 30 * 60 * 1000) // 30分钟后过期
  
  const updateCountdown = () => {
    const now = new Date()
    const remaining = Math.max(0, Math.floor((expireTime.getTime() - now.getTime()) / 1000))
    countdown.value = remaining
    
    if (remaining <= 0) {
      clearInterval(countdownTimer.value!)
      ElMessage.warning('订单已超时，请重新下单')
      router.push('/')
    }
  }
  
  updateCountdown()
  countdownTimer.value = setInterval(updateCountdown, 1000)
}

// 清理定时器
onUnmounted(() => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
  }
})

// 获取订单详情
const fetchOrderDetail = async () => {
  if (!orderId) {
    ElMessage.error('订单号无效')
    router.push('/')
    return
  }

  try {
    orderLoading.value = true
    const response = await orderApi.getDetail(orderId)
    orderDetail.value = response
    
    // 启动倒计时
    if (response.orderTime || response.date) {
      startCountdown(response.orderTime || response.date)
    }
  } catch (error) {
    console.error('获取订单详情失败:', error)
    ElMessage.error('获取订单详情失败')
    router.push('/')
  } finally {
    orderLoading.value = false
  }
}

// 在组件挂载时获取订单详情
onMounted(() => {
  fetchOrderDetail()
})

// 处理支付
const handlePayment = async () => {
  if (!paymentMethod.value) {
    ElMessage.warning('请选择支付方式')
    return
  }

  loading.value = true

  try {
    if (paymentMethod.value === 'alipay') {
      // 支付宝支付 - 确保订单号作为Long类型传递
      const token = localStorage.getItem('token')
      const response = await axios.post('/api/alipay/pay', 
        { orderId: orderId }, // 保持字符串类型，避免精度丢失
        { 
          headers: { authorization: token }, // 使用authorization而不是token
          responseType: 'text' 
        }
      )
      
      // 创建支付页面并跳转
      const blob = new Blob([response.data], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.location.href = url
    } else if (paymentMethod.value === 'wechat') {
      // 微信支付
      ElMessage.info('微信支付功能开发中')
    } else if (paymentMethod.value === 'unionpay') {
      // 银联支付
      ElMessage.info('银联支付功能开发中')
    } else {
      ElMessage.info('该支付方式暂未开放')
    }
  } catch (error) {
    console.error('支付失败:', error)
    ElMessage.error('支付失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="payment-view" v-loading="loading">
    <el-card class="payment-card">
      <template #header>
        <div class="card-header">
          <span>订单支付</span>
        </div>
      </template>

      <div class="order-info" v-loading="orderLoading">
        <div v-if="orderDetail" class="order-details">
          <div class="order-number">
            <h2>订单号：{{ orderDetail.orderId || orderDetail.id }}</h2>
          </div>
          <p class="order-time">创建时间：{{ formatOrderTime(orderDetail.orderTime || orderDetail.date) }}</p>
          <p class="order-amount">订单金额：¥{{ orderDetail.totalAmount?.toFixed(2) }}</p>
          <p class="order-status">订单状态：待支付</p>
          <div class="countdown-section">
            <p class="countdown-text">支付剩余时间：<span class="countdown-time">{{ formatCountdown }}</span></p>
          </div>
          
          <!-- 订单商品列表 -->
          <div class="order-items" v-if="orderDetail.items && orderDetail.items.length > 0">
            <h4>订单商品</h4>
            <div class="item-list">
              <div v-for="item in orderDetail.items" :key="item.id" class="order-item">
                <img :src="item.image" :alt="item.title" class="item-image" />
                <div class="item-info">
                  <p class="item-title">{{ item.title }}</p>
                  <p class="item-price">¥{{ item.price?.toFixed(2) }} × {{ item.quantity }}</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 收货地址 -->
          <div class="delivery-address" v-if="orderDetail.address">
            <h4>收货地址</h4>
            <p>{{ orderDetail.address.region?.join(' ') }} {{ orderDetail.address.detailAddress }}</p>
            <p v-if="orderDetail.phone">联系电话：{{ orderDetail.phone }}</p>
          </div>
        </div>
        <div v-else-if="!orderLoading" class="no-order">
          <p>订单信息加载失败</p>
        </div>
      </div>

      <div class="payment-methods">
        <h3>选择支付方式</h3>
        <el-radio-group v-model="paymentMethod" class="payment-radio-group">
          <el-radio label="alipay" class="payment-radio">
            <div class="payment-method-item">
              <el-icon class="payment-icon"><Money /></el-icon>
              <span>支付宝</span>
            </div>
          </el-radio>
          <el-radio label="wechat" class="payment-radio">
            <div class="payment-method-item">
              <el-icon class="payment-icon"><ChatDotRound /></el-icon>
              <span>微信支付</span>
            </div>
          </el-radio>
          <el-radio label="unionpay" class="payment-radio">
            <div class="payment-method-item">
              <el-icon class="payment-icon"><CreditCard /></el-icon>
              <span>银联支付</span>
            </div>
          </el-radio>
        </el-radio-group>
      </div>

      <div class="payment-action">
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          @click="handlePayment"
          class="pay-button"
        >
          确认付款
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.payment-view {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: calc(100vh - 200px);
  padding: 40px 20px;

  .payment-card {
    width: 100%;
    max-width: 600px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-radius: 12px;

    .card-header {
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }

    .order-info {
      padding: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      margin-bottom: 32px;
      color: white;

      .order-number {
        margin-bottom: 16px;
        
        h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      }

      p {
        margin: 8px 0;
        font-size: 16px;
        opacity: 0.9;

        &:last-child {
          margin-bottom: 0;
        }
      }

      .order-items {
        margin-top: 20px;
        
        h4 {
          margin: 0 0 12px;
          font-size: 16px;
          font-weight: 600;
        }
        
        .item-list {
          .order-item {
            display: flex;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            
            &:last-child {
              border-bottom: none;
            }
            
            .item-image {
              width: 50px;
              height: 50px;
              object-fit: cover;
              border-radius: 6px;
              margin-right: 12px;
            }
            
            .item-info {
              flex: 1;
              
              .item-title {
                margin: 0 0 4px;
                font-size: 14px;
                font-weight: 500;
              }
              
              .item-price {
                margin: 0;
                font-size: 13px;
                opacity: 0.8;
              }
            }
          }
        }
      }
      
      .delivery-address {
        margin-top: 20px;
        
        h4 {
          margin: 0 0 8px;
          font-size: 16px;
          font-weight: 600;
        }
        
        p {
          margin: 4px 0;
          font-size: 14px;
        }
      }
      
      .no-order {
        text-align: center;
        padding: 20px;
        
        p {
          font-size: 16px;
          opacity: 0.8;
        }
      }
      
      .countdown-section {
        margin-top: 16px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        
        .countdown-text {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          
          .countdown-time {
            color: #ffeb3b;
            font-size: 18px;
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          }
        }
      }
    }

    .payment-methods {
      margin-bottom: 32px;

      h3 {
        margin: 0 0 24px;
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }

      .payment-radio-group {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .payment-radio {
        border: 2px solid #e4e7ed;
        border-radius: 12px;
        padding: 16px 20px;
        transition: all 0.3s ease;
        margin: 0;
        width: 100%;
        
        &:hover {
          border-color: #409eff;
          background-color: #f0f9ff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
        }
        
        &.is-checked {
          border-color: #409eff;
          background-color: #f0f9ff;
          box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
        }
        
        // 隐藏默认的radio按钮
        :deep(.el-radio__input) {
          display: none;
        }
        
        :deep(.el-radio__label) {
          padding: 0;
          width: 100%;
        }
      }

      .payment-method-item {
        display: flex;
        align-items: center;
        gap: 16px;
        font-size: 16px;
        font-weight: 500;
        width: 100%;
        
        .payment-icon {
          font-size: 32px;
          color: #409eff;
          flex-shrink: 0;
        }
        
        span {
          flex: 1;
          text-align: left;
        }
      }
    }

    .payment-action {
      text-align: center;
      
      .pay-button {
        width: 100%;
        height: 50px;
        font-size: 18px;
        font-weight: 600;
        border-radius: 8px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        
        &:hover {
          background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
        }
      }
    }
  }
}
</style>