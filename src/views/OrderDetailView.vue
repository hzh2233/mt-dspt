<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Clock, Money, Location, CreditCard, User, Phone, Box, Van, Check, RefreshLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { orderApi } from '@/services/api'

// 订单数据类型
interface OrderDetail {
  orderId: number
  userId: number
  orderTime: string
  totalAmount: number
  status: number
  paymentMethod: string | null
  shippingAddress: {
    phone: string
    cityName: string
    receiver: string
    districtName: string
    provinceName: string
    detailAddress: string
  } | null
  items?: OrderItem[]
}

// 订单商品详情类型
interface OrderItem {
  itemId: number
  good: {
    goodId: number
    goodName: string
    description: string
    price: number
    stock: number
    categoryId: number
    coverUrl: string
    createdAt: string
  }
  quantity: number
  unitPrice: number
  subtotal: number
}

const route = useRoute()
const router = useRouter()
const orderId = route.params.orderId as string

const orderDetail = ref<OrderDetail | null>(null)
const loading = ref(false)

// 订单状态映射
const getOrderStatusText = (status: number) => {
  const statusMap: Record<number, { text: string; color: string; textColor: string }> = {
    0: { text: '待付款', color: '#FFF2E8', textColor: '#E6A23C' },
    1: { text: '待发货', color: '#E8F4FD', textColor: '#409EFF' },
    2: { text: '已发货', color: '#F0F9FF', textColor: '#67C23A' },
    3: { text: '已完成', color: '#F4F4F5', textColor: '#909399' },
    4: { text: '已取消', color: '#FEF0F0', textColor: '#F56C6C' },
    5: { text: '已退款', color: '#F4F4F5', textColor: '#909399' }
  }
  return statusMap[status] || { text: '未知状态', color: '#F4F4F5', textColor: '#909399' }
}

// 格式化时间
const formatTime = (timeStr: string) => {
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化支付方式
const formatPaymentMethod = (method: string | null) => {
  if (!method) return '未设置'
  const methodMap: Record<string, string> = {
    'alipay': '支付宝',
    'wechat': '微信支付',
    'bank': '银联支付'
  }
  return methodMap[method] || method
}

// 解析收货地址
const parseShippingAddress = (address: OrderDetail['shippingAddress']) => {
  if (!address) return '未设置收货地址'
  
  const { provinceName = '', cityName = '', districtName = '', detailAddress = '' } = address
  return `${provinceName}${cityName}${districtName} ${detailAddress}`.trim()
}

// 获取收货人信息
const getReceiverInfo = (address: OrderDetail['shippingAddress']) => {
  if (!address) return { receiver: '未设置', phone: '未设置' }
  
  const { receiver = '未设置', phone = '未设置' } = address
  return { receiver, phone }
}

// 计算商品总数量
const totalQuantity = computed(() => {
  if (!orderDetail.value?.items) return 0
  return orderDetail.value.items.reduce((sum, item) => sum + item.quantity, 0)
})

// 获取订单详情
const fetchOrderDetail = async () => {
  loading.value = true
  try {
    // 首先尝试从sessionStorage获取数据
    const cachedData = sessionStorage.getItem('orderDetail')
    if (cachedData) {
      const parsed = JSON.parse(cachedData)
      if (parsed.orderId.toString() === orderId) {
        orderDetail.value = parsed
        // 清除缓存数据
        sessionStorage.removeItem('orderDetail')
        return
      }
    }
    
    // 如果没有缓存数据，从API获取
    const response = await request.get(`/orders/${orderId}`)
    orderDetail.value = response.data || response
    
    // 获取订单商品详情
    if (orderDetail.value) {
      const itemsResponse = await request.get('/orderItems/detail', {
        params: { orderId: orderDetail.value.orderId }
      })
      orderDetail.value.items = itemsResponse.data || itemsResponse || []
    }
  } catch (error) {
    console.error('获取订单详情失败:', error)
    ElMessage.error('获取订单详情失败')
  } finally {
    loading.value = false
  }
}

// 返回订单列表页面
const goBack = () => {
  router.push('/user/orders')
}

// 处理退款
const handleRefund = async () => {
  if (!orderDetail.value) return
  
  try {
    await ElMessageBox.confirm(
      `确定要申请退款吗？退款金额为 ¥${orderDetail.value.totalAmount.toFixed(2)}`,
      '申请退款',
      {
        confirmButtonText: '确定退款',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 调用退款API
    await orderApi.refund(orderDetail.value.orderId.toString(), orderDetail.value.totalAmount)
    
    ElMessage.success('退款申请已提交，请等待处理')
    
    // 重新获取订单详情以更新状态
    await fetchOrderDetail()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('退款申请失败:', error)
      ElMessage.error('退款申请失败，请稍后重试')
    }
  }
}

// 页面挂载时获取数据
onMounted(() => {
  fetchOrderDetail()
})
</script>

<template>
  <div class="order-detail-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <el-button :icon="ArrowLeft" @click="goBack" type="primary" plain>
        返回订单列表
      </el-button>
      <h1 class="page-title">订单详情</h1>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="8" animated />
    </div>

    <!-- 订单详情内容 -->
    <div v-else-if="orderDetail" class="order-detail-content">
      <!-- 订单基本信息 -->
      <el-card class="order-info-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title">
              <el-icon><Box /></el-icon>
              订单信息
            </span>
            <el-tag 
              :style="{
                backgroundColor: getOrderStatusText(orderDetail.status).color,
                color: getOrderStatusText(orderDetail.status).textColor,
                border: 'none'
              }"
              size="large"
            >
              {{ getOrderStatusText(orderDetail.status).text }}
            </el-tag>
          </div>
        </template>
        
        <div class="order-basic-info">
          <div class="info-row">
            <span class="label">订单号:</span>
            <span class="value">{{ orderDetail.orderId }}</span>
          </div>
          <div class="info-row">
            <span class="label">
              <el-icon><Clock /></el-icon>
              下单时间:
            </span>
            <span class="value">{{ formatTime(orderDetail.orderTime) }}</span>
          </div>
          <div class="info-row">
            <span class="label">
              <el-icon><Money /></el-icon>
              订单金额:
            </span>
            <span class="value amount">¥{{ orderDetail.totalAmount.toFixed(2) }}</span>
          </div>
          <div class="info-row" v-if="orderDetail.paymentMethod">
            <span class="label">
              <el-icon><CreditCard /></el-icon>
              支付方式:
            </span>
            <span class="value">{{ formatPaymentMethod(orderDetail.paymentMethod) }}</span>
          </div>
        </div>
      </el-card>

      <!-- 收货信息 -->
      <el-card class="shipping-info-card" shadow="hover" v-if="orderDetail.shippingAddress">
        <template #header>
          <div class="card-header">
            <span class="card-title">
              <el-icon><Van /></el-icon>
              收货信息
            </span>
          </div>
        </template>
        
        <div class="shipping-info">
          <div class="receiver-section">
            <div class="info-row">
              <span class="label">
                <el-icon><User /></el-icon>
                收货人:
              </span>
              <span class="value">{{ getReceiverInfo(orderDetail.shippingAddress).receiver }}</span>
            </div>
            <div class="info-row">
              <span class="label">
                <el-icon><Phone /></el-icon>
                联系电话:
              </span>
              <span class="value phone">{{ getReceiverInfo(orderDetail.shippingAddress).phone }}</span>
            </div>
          </div>
          <div class="address-section">
            <div class="info-row">
              <span class="label">
                <el-icon><Location /></el-icon>
                收货地址:
              </span>
              <span class="value address">{{ parseShippingAddress(orderDetail.shippingAddress) }}</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 商品信息 -->
      <el-card class="items-info-card" shadow="hover" v-if="orderDetail.items && orderDetail.items.length > 0">
        <template #header>
          <div class="card-header">
            <span class="card-title">
              <el-icon><Box /></el-icon>
              商品信息 (共{{ totalQuantity }}件)
            </span>
          </div>
        </template>
        
        <div class="items-list">
          <div class="item-row" v-for="item in orderDetail.items" :key="item.itemId">
            <div class="item-image">
              <img :src="item.good.coverUrl" :alt="item.good.goodName" />
            </div>
            <div class="item-info">
              <div class="item-name">{{ item.good.goodName }}</div>
              <div class="item-desc">{{ item.good.description }}</div>
              <div class="item-price-info">
                <span class="unit-price">单价: ¥{{ item.unitPrice.toFixed(2) }}</span>
                <span class="quantity">数量: {{ item.quantity }}</span>
                <span class="subtotal">小计: ¥{{ item.subtotal.toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 订单总计 -->
        <div class="order-total">
          <div class="total-row">
            <span class="total-label">订单总计:</span>
            <span class="total-amount">¥{{ orderDetail.totalAmount.toFixed(2) }}</span>
          </div>
        </div>
      </el-card>

      <!-- 订单操作 -->
      <el-card class="actions-card" shadow="hover">
        <div class="order-actions">
          <el-button v-if="orderDetail.status === 0" type="primary" size="large">
            立即支付
          </el-button>
          <el-button v-if="orderDetail.status === 0" type="warning" size="large">
            取消订单
          </el-button>
          <el-button v-if="orderDetail.status === 2" type="success" size="large">
            确认收货
          </el-button>
          <el-button 
            v-if="orderDetail.status === 1 || orderDetail.status === 2 || orderDetail.status === 3" 
            type="danger" 
            size="large"
            :icon="RefreshLeft"
            @click="handleRefund"
          >
            申请退款
          </el-button>
          <el-button type="info" size="large">
            联系客服
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 订单不存在 -->
    <div v-else class="order-not-found">
      <el-empty description="订单不存在或已被删除">
        <el-button type="primary" @click="goBack">返回订单列表</el-button>
      </el-empty>
    </div>
  </div>
</template>

<style scoped>
.order-detail-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
}

/* 页面头部 */
.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

/* 加载状态 */
.loading-container {
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

/* 订单详情内容 */
.order-detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 卡片通用样式 */
.order-info-card,
.shipping-info-card,
.items-info-card,
.actions-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.order-info-card:hover,
.shipping-info-card:hover,
.items-info-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 订单基本信息 */
.order-basic-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.label {
  font-weight: 500;
  color: #606266;
  min-width: 100px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.value {
  color: #2c3e50;
  font-weight: 500;
}

.value.amount {
  color: #f56c6c;
  font-size: 18px;
  font-weight: 700;
}

.value.phone {
  color: #409eff;
  font-weight: 600;
}

.value.address {
  flex: 1;
  line-height: 1.5;
}

/* 收货信息 */
.shipping-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.receiver-section,
.address-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 商品信息 */
.items-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.item-row {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.item-image {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-name {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.4;
}

.item-desc {
  color: #909399;
  font-size: 14px;
  line-height: 1.4;
}

.item-price-info {
  display: flex;
  gap: 20px;
  align-items: center;
  font-size: 14px;
}

.unit-price {
  color: #606266;
}

.quantity {
  color: #909399;
}

.subtotal {
  color: #f56c6c;
  font-weight: 600;
}

/* 订单总计 */
.order-total {
  border-top: 2px solid #ebeef5;
  padding-top: 16px;
}

.total-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
}

.total-label {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.total-amount {
  font-size: 20px;
  font-weight: 700;
  color: #f56c6c;
}

/* 订单操作 */
.order-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.order-actions .el-button {
  border-radius: 20px;
  padding: 12px 24px;
  font-weight: 500;
}

/* 订单不存在 */
.order-not-found {
  padding: 60px 20px;
  text-align: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .order-detail-view {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .page-title {
    font-size: 20px;
  }
  
  .item-row {
    flex-direction: column;
    gap: 12px;
  }
  
  .item-image {
    width: 60px;
    height: 60px;
    align-self: flex-start;
  }
  
  .item-price-info {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
  
  .order-actions {
    flex-direction: column;
  }
  
  .order-actions .el-button {
    width: 100%;
  }
}
</style>