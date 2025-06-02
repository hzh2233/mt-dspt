<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton } from 'element-plus'
import { CircleCheck, ShoppingBag, House } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

// 订单数据
const orderInfo = ref({
  orderId: '',
  paymentMethod: '支付宝',
  paymentTime: new Date().toLocaleString(),
  username: userStore.userInfo.nickname || '游客'
})

// 在组件挂载时获取支付信息
onMounted(() => {
  // 从localStorage获取订单信息
  const lastOrderId = localStorage.getItem('lastOrderId')
  const paymentStatus = localStorage.getItem('paymentStatus')
  
  // 从URL参数获取订单号（支付宝回调可能直接跳转到这里）
  const urlParams = new URLSearchParams(window.location.search)
  const urlOrderId = urlParams.get('orderId') || urlParams.get('out_trade_no')
  
  // 设置订单号，如果都没有就显示默认信息
  orderInfo.value.orderId = lastOrderId || urlOrderId || '订单已完成'
  
  // 清理localStorage中的支付状态
  if (paymentStatus === 'success') {
    localStorage.removeItem('paymentStatus')
  }
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
    <div class="success-container">
      <div class="success-content">
        <div class="success-icon">
          <el-icon color="#67c23a" :size="80"><CircleCheck /></el-icon>
        </div>
        
        <h1 class="success-title">🎉 支付成功！</h1>
        <p class="success-subtitle">感谢您的购买，订单处理中</p>
        
        <div class="order-info">
          <div class="info-item">
            <span class="label">订单号：</span>
            <span class="value">{{ orderInfo.orderId }}</span>
          </div>
          <div class="info-item">
            <span class="label">支付方式：</span>
            <span class="value">{{ orderInfo.paymentMethod }}</span>
          </div>
          <div class="info-item">
            <span class="label">完成时间：</span>
            <span class="value">{{ orderInfo.paymentTime }}</span>
          </div>
        </div>
        
        <div class="tips">
          <p>✅ 您的订单已提交成功</p>
          <p>📦 我们会尽快为您安排发货</p>
          <p>📱 您可以在个人中心查看订单详情</p>
        </div>
        
        <div class="action-buttons">
          <el-button type="primary" size="large" :icon="ShoppingBag" @click="viewOrders">
            查看我的订单
          </el-button>
          <el-button size="large" :icon="House" @click="goToHome">
            返回首页
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.success-view {
  min-height: calc(100vh - 120px);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  
  .success-container {
    width: 100%;
    max-width: 500px;
    
    .success-content {
      background: white;
      border-radius: 20px;
      padding: 40px 30px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      position: relative;
      overflow: hidden;
      
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #67c23a, #85ce61);
      }
      
      .success-icon {
        margin-bottom: 20px;
        animation: bounce 1s ease-in-out;
      }
      
      .success-title {
        font-size: 28px;
        color: #2c3e50;
        margin-bottom: 8px;
        font-weight: 600;
      }
      
      .success-subtitle {
        color: #67c23a;
        font-size: 16px;
        margin-bottom: 30px;
        font-weight: 500;
      }
      
      .order-info {
        background: #f8f9fa;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 25px;
        
        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          
          &:last-child {
            margin-bottom: 0;
          }
          
          .label {
            color: #666;
            font-size: 14px;
          }
          
          .value {
            color: #2c3e50;
            font-weight: 500;
            font-size: 14px;
          }
        }
      }
      
      .tips {
        margin-bottom: 30px;
        
        p {
          color: #666;
          font-size: 14px;
          margin: 8px 0;
          line-height: 1.5;
        }
      }
      
      .action-buttons {
        display: flex;
        flex-direction: column;
        gap: 12px;
        
        .el-button {
          border-radius: 25px;
          font-weight: 500;
          
          &.el-button--primary {
            background: linear-gradient(45deg, #67c23a, #85ce61);
            border: none;
            
            &:hover {
              background: linear-gradient(45deg, #5daf34, #7bc95f);
            }
          }
          
          &:not(.el-button--primary) {
            color: #666;
            border-color: #ddd;
            
            &:hover {
              color: #67c23a;
              border-color: #67c23a;
            }
          }
        }
      }
    }
  }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

@media (max-width: 768px) {
  .success-view {
    padding: 10px;
    
    .success-container {
      .success-content {
        padding: 30px 20px;
        
        .success-title {
          font-size: 24px;
        }
        
        .action-buttons {
          .el-button {
            width: 100%;
          }
        }
      }
    }
  }
}
</style>