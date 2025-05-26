<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useOrderStore } from '@/stores/order'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Delete } from '@element-plus/icons-vue'
import { orderApi } from '@/services/api'
import type { Order } from '@/types/api'

const orderStore = useOrderStore()
const loading = ref(false)
const orders = ref<Order[]>([])

// 获取订单列表
const fetchOrders = async () => {
  try {
    loading.value = true
    const response = await orderApi.getList()
    orders.value = response.orders || []
  } catch (error) {
    console.error('获取订单列表失败:', error)
    ElMessage.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

const refreshOrders = () => {
  fetchOrders()
}

// 页面挂载时获取订单数据
onMounted(() => {
  fetchOrders()
})



// 删除订单
const deleteOrder = async (orderId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这个订单吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await orderApi.delete(orderId)
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
</script>

<template>
  <div class="orders-view">
    <div class="page-header">
      <h1 class="page-title">我的订单</h1>
      <el-button :icon="Refresh" @click="refreshOrders" :loading="loading">刷新</el-button>
    </div>
    
    <el-card v-if="loading" class="loading-card">
      <div class="loading-container">
        <el-skeleton :rows="3" animated />
      </div>
    </el-card>

    <div v-else-if="orders.length === 0" class="empty-orders">
      <el-empty description="暂无订单记录" />
      <el-button type="primary" @click="$router.push('/products')">去购物</el-button>
    </div>

    <div v-else class="orders-list">
      <el-card v-for="order in orders" :key="order.id" class="order-card">
        <div class="order-header">
          <div class="order-info">
            <span class="order-id">订单号: {{ order.id }}</span>
            <span class="order-date">下单时间: {{ order.date }}</span>
            <span class="order-address" v-if="order.address">收货地址: {{ order.address.region.join('') }}{{ order.address.detailAddress }}</span>
            <span class="order-phone" v-if="order.phone">联系电话: {{ order.phone }}</span>
          </div>
          <div class="order-status">{{ order.status }}</div>
        </div>

        <el-divider />

        <div class="order-items">
          <div v-for="item in order.items" :key="item.id" class="order-item">
            <div class="item-image">
              <el-image :src="item.image" fit="cover" :alt="item.title">
                <template #error>
                  <div class="image-placeholder">暂无图片</div>
                </template>
              </el-image>
            </div>
            <div class="item-info">
              <div class="item-title">{{ item.title }}</div>
              <div class="item-price">¥{{ item.price }} × {{ item.quantity }}</div>
            </div>
          </div>
        </div>

        <el-divider />

        <div class="order-footer">
          <div class="order-total">
            <span>支付方式: {{ order.paymentMethod }}</span>
            <span>订单金额: <strong>¥{{ order.totalAmount }}</strong></span>
          </div>
          <div class="order-actions">
            <el-button type="danger" size="small" :icon="Delete" @click="deleteOrder(order.id)">删除订单</el-button>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.orders-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.loading-card,
.empty-orders {
  margin-top: 20px;
  padding: 40px 0;
  text-align: center;
}

.empty-orders .el-button {
  margin-top: 20px;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.order-card {
  margin-bottom: 0;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.order-id {
  font-weight: bold;
  color: #303133;
}

.order-date {
  color: #909399;
  font-size: 14px;
}

.order-status {
  color: #67c23a;
  font-weight: bold;
}

.order-items {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 15px;
}

.item-image {
  width: 80px;
  height: 80px;
  overflow: hidden;
  border-radius: 4px;
  flex-shrink: 0;
}

.item-image .el-image {
  width: 100%;
  height: 100%;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
  color: #909399;
  font-size: 12px;
}

.item-info {
  flex-grow: 1;
}

.item-title {
  font-weight: bold;
  margin-bottom: 5px;
}

.item-price {
  color: #606266;
  font-size: 14px;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-total {
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: #606266;
}

.order-total strong {
  color: #f56c6c;
  font-size: 18px;
}

@media (max-width: 768px) {
  .order-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .order-actions {
    align-self: flex-end;
  }
}
</style>