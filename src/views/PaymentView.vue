<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { paymentApi, orderApi } from '@/services/api'
import type { Order } from '@/types/api'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()
const userStore = useUserStore()

const orderId = String(route.params.orderId)
const loading = ref(false)

// 订单数据
const orderInfo = ref<Order | null>(null)


// 获取订单详情
const fetchOrderDetail = async (orderId: string) => {
  loading.value = true
  try {
    orderInfo.value = await orderApi.getDetail(orderId)
  } catch (error) {
    console.error('获取订单详情失败:', error)
    ElMessage.error('订单不存在或已失效')
    router.push('/cart')
  } finally {
    loading.value = false
  }
}

// 在组件挂载时获取订单详情
onMounted(() => {
  fetchOrderDetail(orderId)
})

// 支付方式
const paymentMethod = ref('')

const handlePayment = async () => {
  if (!paymentMethod.value) {
    ElMessage.warning('请选择支付方式')
    return
  }

  if (!orderInfo.value) {
    ElMessage.error('订单信息不存在')
    return
  }

  loading.value = true

  try {
    // 调用支付API
    await paymentApi.processPayment(orderInfo.value.id, paymentMethod.value)
    
    // 保存支付信息，用于在成功页面显示
    localStorage.setItem('lastPaymentMethod', paymentMethod.value)
    localStorage.setItem('lastOrderAmount', String(orderInfo.value.totalAmount))
    localStorage.setItem('lastOrderItems', JSON.stringify(orderInfo.value.items))
    localStorage.setItem('lastOrderAddress', JSON.stringify(orderInfo.value.address))
    localStorage.setItem('lastOrderPhone', orderInfo.value.phone)
    
    // 支付成功后从购物车中移除已购买的商品
    orderInfo.value.items.forEach(item => {
      cartStore.removeItem(item.id)
    })
    
    ElMessage.success('支付成功')
    router.push('/order/success')
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
    <el-card class="payment-card" v-if="orderInfo">
      <template #header>
        <div class="card-header">
          <span>订单支付</span>
        </div>
      </template>

      <div class="order-info" v-if="orderInfo">
        <p class="order-id">订单号：{{ orderInfo.id }}</p>
        <!-- <p class="order-time">创建时间：{{ orderInfo.createTime }}</p> -->
        <p class="order-address">收货地址：{{ orderInfo.address.region.join('') }}{{ orderInfo.address.detailAddress }}</p>
        <p class="order-phone">联系电话：{{ orderInfo.phone }}</p>
        <p class="order-amount">支付金额：<span class="price">¥{{ orderInfo.totalAmount }}</span></p>
      </div>

      <div class="payment-methods">
        <h3>选择支付方式</h3>
        <el-radio-group v-model="paymentMethod">
          <el-radio label="alipay">
            <div class="payment-method-item">
              <el-icon><Money /></el-icon>
              <span>支付宝</span>
            </div>
          </el-radio>
          <el-radio label="wechat">
            <div class="payment-method-item">
              <el-icon><ChatDotRound /></el-icon>
              <span>微信支付</span>
            </div>
          </el-radio>
          <el-radio label="unionpay">
            <div class="payment-method-item">
              <el-icon><CreditCard /></el-icon>
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
        >
          立即支付
        </el-button>
      </div>
    </el-card>
    
    <el-empty v-else-if="!loading" description="订单不存在" />
  </div>
</template>

<style scoped lang="scss">
.payment-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);

  .payment-card {
    width: 100%;
    max-width: 600px;

    .order-info {
      padding: 20px;
      background-color: #f5f7fa;
      border-radius: 4px;
      margin-bottom: 30px;

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

    .payment-methods {
      margin-bottom: 30px;

      h3 {
        margin: 0 0 20px;
        font-size: 16px;
        color: #333;
      }

      .el-radio-group {
        display: flex;
        gap: 20px;
      }

      .payment-method-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px;

        .el-icon {
          font-size: 20px;
        }
      }
    }

    .payment-action {
      text-align: center;

      .el-button {
        min-width: 200px;
      }
    }
  }
}
</style>