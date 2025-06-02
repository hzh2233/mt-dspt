<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Present, Calendar, Ticket } from '@element-plus/icons-vue'
import { couponApi } from '@/services/api'
import type { AvailableCoupon } from '@/types/api'

const coupons = ref<AvailableCoupon[]>([])
const loading = ref(false)
const receivingCoupons = ref<Set<number>>(new Set())

// 加载可领取的优惠券
const loadCoupons = async () => {
  try {
    loading.value = true
    const couponList = await couponApi.getAvailableCoupons()
    coupons.value = couponList
  } catch (error) {
    console.error('加载优惠券失败:', error)
    ElMessage.error('加载优惠券失败')
  } finally {
    loading.value = false
  }
}

// 领取优惠券
const receiveCoupon = async (coupon: AvailableCoupon) => {
  if (!coupon.canReceive || coupon.received || receivingCoupons.value.has(coupon.id)) {
    return
  }

  try {
    receivingCoupons.value.add(coupon.id)
    await couponApi.receiveCoupon(coupon.id)
    
    // 更新优惠券状态
    coupon.received = true
    coupon.canReceive = false
    coupon.remainingCount = Math.max(0, coupon.remainingCount - 1)
    
    ElMessage.success('领取成功！')
  } catch (error) {
    console.error('领取优惠券失败:', error)
    ElMessage.error('领取优惠券失败')
  } finally {
    receivingCoupons.value.delete(coupon.id)
  }
}

// 格式化优惠券类型
const formatCouponType = (type: number, value: number) => {
  if (type === 1) {
    return `满减 ¥${value}`
  } else if (type === 2) {
    return `${(value * 10).toFixed(1)}折`
  }
  return '未知类型'
}

// 格式化最低使用金额
const formatMinAmount = (minAmount: number) => {
  return minAmount > 0 ? `满¥${minAmount}可用` : '无门槛'
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 获取优惠券状态文本
const getCouponStatusText = (coupon: AvailableCoupon) => {
  if (coupon.received) {
    return '已领取'
  }
  if (!coupon.canReceive) {
    return '已抢完'
  }
  if (coupon.remainingCount <= 0) {
    return '已抢完'
  }
  return '立即领取'
}

// 获取优惠券状态类型
const getCouponStatusType = (coupon: AvailableCoupon) => {
  if (coupon.received) {
    return 'info'
  }
  if (!coupon.canReceive || coupon.remainingCount <= 0) {
    return 'info'
  }
  return 'primary'
}

// 检查优惠券是否可以领取
const canReceiveCoupon = (coupon: AvailableCoupon) => {
  return coupon.canReceive && !coupon.received && coupon.remainingCount > 0
}

onMounted(() => {
  loadCoupons()
})
</script>

<template>
  <div class="coupons-view">
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">
          <el-icon><Present /></el-icon>
        </div>
        <div class="header-text">
          <h1>优惠券中心</h1>
          <p>领取专属优惠，享受更多实惠</p>
        </div>
      </div>
    </div>

    <div class="coupons-container">
      <el-row :gutter="20" v-loading="loading">
        <el-col 
          :xs="24" 
          :sm="12" 
          :md="8" 
          :lg="6" 
          v-for="coupon in coupons" 
          :key="coupon.id"
          class="coupon-col"
        >
          <div class="coupon-card" :class="{ 'received': coupon.received, 'unavailable': !canReceiveCoupon(coupon) }">
            <div class="coupon-header">
              <div class="coupon-type">
                <el-icon><Ticket /></el-icon>
                <span>{{ formatCouponType(coupon.type, coupon.value) }}</span>
              </div>
              <div class="coupon-remaining" v-if="coupon.remainingCount > 0">
                剩余 {{ coupon.remainingCount }}
              </div>
            </div>

            <div class="coupon-content">
              <div class="coupon-title">{{ coupon.title }}</div>
              <div class="coupon-desc" v-if="coupon.description">
                {{ coupon.description }}
              </div>
              <div class="coupon-condition">
                {{ formatMinAmount(coupon.minAmount) }}
              </div>
            </div>

            <div class="coupon-footer">
              <div class="coupon-time">
                <el-icon><Calendar /></el-icon>
                <span>{{ formatDate(coupon.startTime) }} - {{ formatDate(coupon.endTime) }}</span>
              </div>
              <el-button
                :type="getCouponStatusType(coupon)"
                :disabled="!canReceiveCoupon(coupon)"
                :loading="receivingCoupons.has(coupon.id)"
                @click="receiveCoupon(coupon)"
                class="receive-btn"
              >
                {{ getCouponStatusText(coupon) }}
              </el-button>
            </div>
          </div>
        </el-col>
      </el-row>

      <div v-if="!loading && coupons.length === 0" class="empty-state">
        <el-icon class="empty-icon"><Present /></el-icon>
        <p>暂无可领取的优惠券</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coupons-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.page-header {
  margin-bottom: 30px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.header-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #ff6b6b, #feca57);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(255, 107, 107, 0.3);
}

.header-icon .el-icon {
  font-size: 40px;
  color: white;
}

.header-text h1 {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-text p {
  margin: 0;
  font-size: 16px;
  color: #666;
}

.coupons-container {
  max-width: 1200px;
  margin: 0 auto;
}

.coupon-col {
  margin-bottom: 20px;
}

.coupon-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.coupon-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3);
}

.coupon-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.coupon-card.received {
  background: #f8f9fa;
  border-color: #e9ecef;
}

.coupon-card.received::before {
  background: #6c757d;
}

.coupon-card.unavailable {
  background: #f8f9fa;
  border-color: #e9ecef;
}

.coupon-card.unavailable::before {
  background: #6c757d;
}

.coupon-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.coupon-type {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 18px;
  color: #2c3e50;
}

.coupon-type .el-icon {
  color: #ff6b6b;
}

.coupon-remaining {
  background: linear-gradient(135deg, #ff6b6b, #feca57);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.coupon-content {
  margin-bottom: 20px;
}

.coupon-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
}

.coupon-desc {
  font-size: 14px;
  color: #6c757d;
  margin-bottom: 8px;
  line-height: 1.4;
}

.coupon-condition {
  font-size: 14px;
  color: #ff6b6b;
  font-weight: 500;
}

.coupon-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.coupon-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6c757d;
  flex: 1;
}

.coupon-time .el-icon {
  color: #48dbfb;
}

.receive-btn {
  border-radius: 20px;
  padding: 8px 20px;
  font-weight: 600;
  min-width: 80px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 64px;
  color: #e9ecef;
  margin-bottom: 20px;
}

.empty-state p {
  font-size: 16px;
  color: #6c757d;
  margin: 0;
}

@media (max-width: 768px) {
  .coupons-view {
    padding: 10px;
  }
  
  .header-content {
    flex-direction: column;
    text-align: center;
    padding: 20px;
  }
  
  .header-text h1 {
    font-size: 24px;
  }
  
  .coupon-footer {
    flex-direction: column;
    gap: 12px;
  }
  
  .receive-btn {
    width: 100%;
  }
}
</style>