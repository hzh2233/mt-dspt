<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/order'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Delete, Loading, Service, RefreshRight, ChatDotRound, Warning, List, Clock, Money, Location, CreditCard, Check, Document, User } from '@element-plus/icons-vue'
import { orderApi } from '@/services/api'
import request from '@/utils/request'
import type { Order } from '@/types/api'

// 后端订单数据类型
interface BackendOrder {
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

const orderStore = useOrderStore()
const router = useRouter()
const loading = ref(false)
const loadingMore = ref(false)
const orders = ref<BackendOrder[]>([])
const orderItems = ref<Record<number, OrderItem[]>>({})

// 分页相关状态
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const hasMore = ref(true)
const isLoadingMore = ref(false)

// 订单状态映射
const getOrderStatusText = (status: number) => {
  const statusMap: Record<number, { text: string; color: string; textColor: string }> = {
    0: { text: '待付款', color: '#FFF2E8', textColor: '#E6A23C' },
    1: { text: '待发货', color: '#E8F4FD', textColor: '#409EFF' },
    2: { text: '已发货', color: '#F0F9FF', textColor: '#67C23A' },
    3: { text: '已完成', color: '#F4F4F5', textColor: '#909399' },
    4: { text: '已取消', color: '#FEF0F0', textColor: '#F56C6C' },
    5: { text: '退款中', color: '#FDF6EC', textColor: '#E6A23C' },
    6: { text: '已退款', color: '#F4F4F5', textColor: '#909399' }
  }
  return statusMap[status] || { text: '未知状态', color: '#F4F4F5', textColor: '#909399' }
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
const parseShippingAddress = (address: BackendOrder['shippingAddress']) => {
  if (!address) return '未设置收货地址'
  
  const { provinceName = '', cityName = '', districtName = '', detailAddress = '' } = address
  return `${provinceName}${cityName}${districtName} ${detailAddress}`.trim()
}

// 获取收货人信息
const getReceiverInfo = (address: BackendOrder['shippingAddress']) => {
  if (!address) return { receiver: '未设置', phone: '未设置' }
  
  const { receiver = '未设置', phone = '未设置' } = address
  return { receiver, phone }
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

// 获取订单列表
const fetchOrders = async (page: number = 1, append: boolean = false) => {
  try {
    if (page === 1) {
      loading.value = true
    } else {
      loadingMore.value = true
      isLoadingMore.value = true
    }
    
    // 使用新的分页接口
    const response = await request.get('/orders/page', {
      params: {
        pageNum: page,
        pageSize: pageSize.value
      }
    })
    
    const newOrders = (response as any).records || []
    total.value = (response as any).total || 0
    
    // 为每个订单获取商品详情
    for (const order of newOrders) {
      await fetchOrderItems(order.orderId)
    }
    
    if (append) {
      orders.value = [...orders.value, ...newOrders]
    } else {
      orders.value = newOrders
    }
    
    // 更新订单列表
    
    // 更新分页状态
    currentPage.value = page
    hasMore.value = orders.value.length < total.value
    
  } catch (error) {
    console.error('获取订单列表失败:', error)
    ElMessage.error('获取订单列表失败')
  } finally {
    loading.value = false
    loadingMore.value = false
    isLoadingMore.value = false
  }
}

// 加载更多订单
const loadMoreOrders = async () => {
  if (!hasMore.value || isLoadingMore.value) {
    return
  }
  
  await fetchOrders(currentPage.value + 1, true)
}

// 刷新订单列表
const refreshOrders = () => {
  currentPage.value = 1
  hasMore.value = true
  fetchOrders(1, false)
}

// 滚动监听
const handleScroll = () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight
  
  // 当滚动到距离底部100px时触发加载更多
  if (scrollTop + windowHeight >= documentHeight - 100) {
    loadMoreOrders()
  }
}

// 页面挂载时获取订单数据并添加滚动监听
onMounted(() => {
  fetchOrders()
  window.addEventListener('scroll', handleScroll)
})

// 页面卸载时移除滚动监听
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})



// 删除订单
const deleteOrder = async (orderId: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这个订单吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await orderApi.delete(orderId.toString())
    ElMessage.success('订单删除成功')
    
    // 重新获取订单列表
    await fetchOrders()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除订单失败:', error)
      ElMessage.error('删除订单失败')
    }
  }
}

// 申请退款
const applyRefund = async (orderId: number) => {
  try {
    await ElMessageBox.confirm('确定要申请退款吗？退款申请提交后将由客服审核处理。', '申请退款', {
      confirmButtonText: '确定申请',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 这里应该调用退款API，暂时模拟
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('退款申请已提交，请耐心等待客服审核')
    
    // 重新获取订单列表
    await fetchOrders()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('申请退款失败:', error)
      ElMessage.error('申请退款失败')
    }
  }
}

// 联系客服
const contactService = (orderId: number) => {
  ElMessage.info(`正在为您转接客服，订单号：${orderId}`)
  // 这里可以集成在线客服系统
}

// 确认收货
const confirmReceipt = async (orderId: number) => {
  try {
    await ElMessageBox.confirm('确认已收到商品吗？确认后订单将完成。', '确认收货', {
      confirmButtonText: '确认收货',
      cancelButtonText: '取消',
      type: 'info'
    })
    
    // 这里应该调用确认收货API，暂时模拟
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('确认收货成功')
    
    // 重新获取订单列表
    await fetchOrders()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('确认收货失败:', error)
      ElMessage.error('确认收货失败')
    }
  }
}

// 取消订单
const cancelOrder = async (orderId: number) => {
  try {
    await ElMessageBox.confirm('确定要取消这个订单吗？', '取消订单', {
      confirmButtonText: '确定取消',
      cancelButtonText: '不取消',
      type: 'warning'
    })
    
    // 这里应该调用取消订单API，暂时模拟
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('订单已取消')
    
    // 重新获取订单列表
    await fetchOrders()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消订单失败:', error)
      ElMessage.error('取消订单失败')
    }
  }
}

// 获取订单商品详情
const fetchOrderItems = async (orderId: number) => {
  try {
    const response = await request.get('/orderItems/detail', {
      params: { orderId }
    })
    orderItems.value[orderId] = response.data || response || []
  } catch (error) {
    console.error(`获取订单${orderId}商品详情失败:`, error)
    orderItems.value[orderId] = []
  }
}

// 跳转到订单详情页
const goToOrderDetail = (order: BackendOrder) => {
  // 将订单数据存储到sessionStorage，供详情页使用
  const orderDetail = {
    ...order,
    items: orderItems.value[order.orderId] || []
  }
  sessionStorage.setItem('orderDetail', JSON.stringify(orderDetail))
  // 跳转到订单详情页（在当前标签页打开）
  router.push(`/order-detail/${order.orderId}`)
}

// 根据订单状态显示可用操作
const getAvailableActions = (status: number) => {
  switch (status) {
    case 0: // 待付款
      return ['pay', 'cancel', 'contact']
    case 1: // 待发货
      return ['contact', 'refund']
    case 2: // 已发货
      return ['confirm', 'contact', 'refund']
    case 3: // 已完成
      return ['contact', 'delete']
    case 4: // 已取消
      return ['delete', 'contact']
    case 5: // 退款中
      return ['contact']
    case 6: // 已退款
      return ['delete', 'contact']
    default:
      return ['contact']
  }
}
</script>

<template>
  <div class="orders-view">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <el-icon class="title-icon"><List /></el-icon>
          我的订单
        </h1>
        <div class="order-stats">
          <span class="stats-item">共 {{ total }} 个订单</span>
        </div>
      </div>
      <div class="header-actions">
        <el-button :icon="Refresh" @click="refreshOrders" :loading="loading" type="primary">刷新</el-button>
      </div>
    </div>
    
    <el-card v-if="loading" class="loading-card">
      <div class="loading-container">
        <el-skeleton :rows="3" animated />
      </div>
    </el-card>

    <div v-else-if="orders.length === 0" class="empty-orders">
      <el-empty description="暂无订单记录">
        <template #image>
          <el-icon class="empty-icon"><Warning /></el-icon>
        </template>
      </el-empty>
      <el-button type="primary" size="large" @click="$router.push('/products')">去购物</el-button>
    </div>

    <div v-else class="orders-list">
      <el-card v-for="order in orders" :key="order.orderId" class="order-card" shadow="hover" @click="goToOrderDetail(order)">
        <div class="order-header">
          <div class="order-info">
            <div class="order-id-section">
              <span class="order-id">订单号: {{ order.orderId }}</span>
              <el-tag 
                :style="{
                  backgroundColor: getOrderStatusText(order.status).color,
                  color: getOrderStatusText(order.status).textColor,
                  border: 'none'
                }"
                size="small"
                class="status-tag"
              >
                {{ getOrderStatusText(order.status).text }}
              </el-tag>
            </div>
            <div class="order-meta">
              <span class="order-date">
                <el-icon><Clock /></el-icon>
                下单时间: {{ formatTime(order.orderTime) }}
              </span>
              <span class="order-amount">
                <el-icon><Money /></el-icon>
                订单金额: <strong class="amount-text">¥{{ order.totalAmount.toFixed(2) }}</strong>
              </span>
            </div>
            <div class="order-details" v-if="order.shippingAddress || order.paymentMethod">
              <div v-if="order.shippingAddress" class="address-info">
                <div class="receiver-info">
                  <el-icon><User /></el-icon>
                  收货人: {{ getReceiverInfo(order.shippingAddress).receiver }}
                  <span class="phone-number">{{ getReceiverInfo(order.shippingAddress).phone }}</span>
                </div>
                <div class="shipping-address">
                  <el-icon><Location /></el-icon>
                  收货地址: {{ parseShippingAddress(order.shippingAddress) }}
                </div>
              </div>
              <span v-if="order.paymentMethod" class="payment-method">
                <el-icon><CreditCard /></el-icon>
                支付方式: {{ formatPaymentMethod(order.paymentMethod) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 订单商品信息 -->
        <div class="order-items" v-if="orderItems[order.orderId] && orderItems[order.orderId].length > 0">
          <div class="item-header">
            <span class="item-title">商品信息</span>
          </div>
          <div class="item-content">
            <div class="product-item" v-for="item in orderItems[order.orderId].slice(0, 1)" :key="item.itemId">
              <div class="product-image">
                <img :src="item.good.coverUrl" :alt="item.good.goodName" />
              </div>
              <div class="product-info">
                <div class="product-name">{{ item.good.goodName }}</div>
                <div class="product-desc">{{ item.good.description }}</div>
                <div class="product-price">
                  <span class="unit-price">¥{{ item.unitPrice.toFixed(2) }}</span>
                  <span class="quantity">x{{ item.quantity }}</span>
                  <span class="subtotal">小计: ¥{{ item.subtotal.toFixed(2) }}</span>
                </div>
              </div>
            </div>
            <div v-if="orderItems[order.orderId].length > 1" class="more-items">
              <span>等{{ orderItems[order.orderId].length }}件商品</span>
            </div>
          </div>
        </div>
        <div v-else class="order-items-placeholder">
          <el-alert
            title="商品详情"
            description="正在加载商品信息..."
            type="info"
            :closable="false"
            show-icon
          />
        </div>

        <el-divider class="order-divider" />

        <div class="order-footer">
          <div class="order-summary">
            <div class="summary-item">
              <span class="label">订单状态:</span>
              <el-tag 
                :style="{
                  backgroundColor: getOrderStatusText(order.status).color,
                  color: getOrderStatusText(order.status).textColor,
                  border: 'none'
                }"
                size="small"
              >
                {{ getOrderStatusText(order.status).text }}
              </el-tag>
            </div>
            <div class="summary-item total-amount">
              <span class="label">实付金额:</span>
              <span class="amount">¥{{ order.totalAmount.toFixed(2) }}</span>
            </div>
          </div>
          
          <div class="order-actions">
            <!-- 根据订单状态显示不同操作按钮 -->
            <template v-for="action in getAvailableActions(order.status)" :key="action">
              <el-button 
                v-if="action === 'pay'" 
                type="primary" 
                size="small"
                @click.stop="$router.push(`/payment/${order.orderId}`)"
              >
                立即支付
              </el-button>
              
              <el-button 
                v-if="action === 'cancel'" 
                type="warning" 
                size="small"
                :icon="Warning"
                @click.stop="cancelOrder(order.orderId)"
              >
                取消订单
              </el-button>
              
              <el-button 
                v-if="action === 'confirm'" 
                type="success" 
                size="small"
                :icon="Check"
                @click.stop="confirmReceipt(order.orderId)"
              >
                确认收货
              </el-button>
              
              <el-button 
                v-if="action === 'refund'" 
                type="warning" 
                size="small"
                :icon="RefreshRight"
                @click.stop="applyRefund(order.orderId)"
              >
                申请退款
              </el-button>
              
              <el-button 
                v-if="action === 'contact'" 
                type="info" 
                size="small"
                :icon="ChatDotRound"
                @click.stop="contactService(order.orderId)"
              >
                联系客服
              </el-button>
              
              <el-button 
                v-if="action === 'delete'" 
                type="danger" 
                size="small"
                :icon="Delete"
                @click.stop="deleteOrder(order.orderId)"
              >
                删除订单
              </el-button>
            </template>
          </div>
        </div>
      </el-card>
      
      <!-- 加载更多提示 -->
      <div v-if="loadingMore" class="loading-more">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>加载更多订单中...</span>
      </div>
      
      <!-- 没有更多数据提示 -->
      <div v-else-if="!hasMore && orders.length > 0" class="no-more">
        <el-icon><Check /></el-icon>
        <span>已加载全部订单</span>
      </div>
      
      <!-- 订单统计信息 -->
      <div v-if="orders.length > 0" class="orders-summary">
        <div class="summary-stats">
          <span class="stats-item">
            <el-icon><Document /></el-icon>
            已显示 {{ orders.length }} / {{ total }} 条订单
          </span>
          <span class="stats-item">
            <el-icon><Money /></el-icon>
            总金额: ¥{{ orders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(2) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.orders-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
}

/* 页面头部样式 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 32px;
  color: #409eff;
}

.order-stats {
  display: flex;
  gap: 16px;
}

.stats-item {
  color: #606266;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 加载和空状态样式 */
.loading-card {
  margin-top: 20px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.loading-container {
  padding: 40px;
}

.empty-orders {
  text-align: center;
  padding: 60px 40px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 64px;
  color: #e6a23c;
}

.empty-orders .el-button {
  margin-top: 24px;
  padding: 12px 32px;
  font-size: 16px;
}

/* 订单列表样式 */
.orders-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.order-card {
  border-radius: 16px;
  border: none;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  cursor: pointer;
}

.order-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

/* 订单头部样式 */
.order-header {
  margin-bottom: 20px;
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-id-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.order-id {
  font-weight: 600;
  font-size: 16px;
  color: #2c3e50;
  font-family: 'Monaco', 'Menlo', monospace;
}

.status-tag {
  font-weight: 600;
  border: none;
  padding: 6px 12px;
  border-radius: 20px;
}

.order-meta {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.order-date,
.order-amount {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #606266;
  font-size: 14px;
}

.amount-text {
  color: #f56c6c;
  font-size: 18px;
  font-weight: 700;
}

.order-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.address-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.receiver-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  font-size: 14px;
}

.phone-number {
  color: #409eff;
  font-weight: 500;
  margin-left: 8px;
}

.shipping-address,
.payment-method {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  font-size: 14px;
}

/* 订单商品样式 */
.order-items {
  margin: 16px 0;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}

.item-header {
  background: #f8f9fa;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
}

.item-title {
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
}

.item-content {
  padding: 16px;
}

.product-item {
  display: flex;
  gap: 12px;
  align-items: center;
}

.product-image {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-name {
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-desc {
  color: #909399;
  font-size: 12px;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-price {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.unit-price {
  color: #f56c6c;
  font-weight: 600;
}

.quantity {
  color: #909399;
}

.subtotal {
  color: #2c3e50;
  font-weight: 600;
}

.more-items {
  text-align: center;
  color: #909399;
  font-size: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #ebeef5;
}

.order-items-placeholder {
  margin: 16px 0;
}

.order-divider {
  margin: 20px 0;
  border-color: #ebeef5;
}

/* 订单底部样式 */
.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.order-summary {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-item .label {
  color: #606266;
  font-size: 14px;
}

.total-amount .amount {
  color: #f56c6c;
  font-size: 20px;
  font-weight: 700;
}

.order-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.order-actions .el-button {
  border-radius: 20px;
  padding: 8px 16px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.order-actions .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 加载更多和统计样式 */
.loading-more {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 32px;
  color: #909399;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  margin-top: 16px;
}

.loading-icon {
  animation: rotate 2s linear infinite;
  font-size: 18px;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.no-more {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 24px;
  color: #67c23a;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  margin-top: 16px;
  border: 2px dashed #67c23a;
}

.orders-summary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 16px;
  margin-top: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.summary-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  flex-wrap: wrap;
}

.summary-stats .stats-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .orders-view {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    padding: 20px;
  }
  
  .header-actions {
    align-self: stretch;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .order-id-section {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .order-meta {
    flex-direction: column;
    gap: 8px;
  }
  
  .order-footer {
    flex-direction: column;
    align-items: stretch;
  }
  
  .order-summary {
    flex-direction: column;
    gap: 12px;
  }
  
  .order-actions {
    justify-content: center;
  }
  
  .summary-stats {
    flex-direction: column;
    gap: 16px;
  }
}

@media (max-width: 480px) {
  .orders-view {
    padding: 12px;
  }
  
  .page-header {
    padding: 16px;
  }
  
  .order-actions .el-button {
    flex: 1;
    min-width: 0;
  }
  
  .order-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 8px;
  }
}
</style>