<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { SuccessFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import axios from 'axios'

const router = useRouter()
const loading = ref(true)
const paymentStatus = ref('')
const orderId = ref('')

// 检查支付状态
const checkPaymentStatus = async () => {
  try {
    // 从URL参数获取订单号
    const urlParams = new URLSearchParams(window.location.search)
    const outTradeNo = urlParams.get('out_trade_no')
    
    if (!outTradeNo) {
      ElMessage.error('订单号不存在')
      router.push('/')
      return
    }
    
    orderId.value = outTradeNo
    
    // 查询支付状态
    const response = await axios.get(`/api/order/status?orderId=${outTradeNo}`)
    
    if (response.data.status === 'TRADE_SUCCESS') {
      paymentStatus.value = 'success'
      // 保存支付成功信息到localStorage
      localStorage.setItem('lastOrderId', outTradeNo)
      localStorage.setItem('paymentStatus', 'success')
      
      // 跳转到支付成功页面
      setTimeout(() => {
        router.push('/order/success')
      }, 2000)
    } else {
      paymentStatus.value = 'failed'
      ElMessage.error('支付失败')
    }
  } catch (error) {
    console.error('查询支付状态失败:', error)
    paymentStatus.value = 'failed'
    ElMessage.error('查询支付状态失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  checkPaymentStatus()
})
</script>

<template>
  <div class="payment-callback-view">
    <div class="callback-container" v-loading="loading">
      <div v-if="!loading">
        <div v-if="paymentStatus === 'success'" class="success-content">
          <el-icon class="success-icon"><SuccessFilled /></el-icon>
          <h2>支付成功</h2>
          <p>订单号：{{ orderId }}</p>
          <p>正在跳转到成功页面...</p>
        </div>
        
        <div v-else-if="paymentStatus === 'failed'" class="failed-content">
          <el-icon class="failed-icon"><CircleCloseFilled /></el-icon>
          <h2>支付失败</h2>
          <p>订单号：{{ orderId }}</p>
          <el-button type="primary" @click="router.push('/')">
            返回首页
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.payment-callback-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f7fa;

  .callback-container {
    background: white;
    padding: 60px 40px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    text-align: center;
    min-width: 400px;

    .success-content {
      .success-icon {
        font-size: 64px;
        color: #67c23a;
        margin-bottom: 20px;
      }

      h2 {
        color: #67c23a;
        margin-bottom: 20px;
      }

      p {
        color: #666;
        margin: 10px 0;
      }
    }

    .failed-content {
      .failed-icon {
        font-size: 64px;
        color: #f56c6c;
        margin-bottom: 20px;
      }

      h2 {
        color: #f56c6c;
        margin-bottom: 20px;
      }

      p {
        color: #666;
        margin: 10px 0 20px;
      }
    }
  }
}
</style>