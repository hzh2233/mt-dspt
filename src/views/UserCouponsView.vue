<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Ticket, Calendar, Clock, Check, Warning } from '@element-plus/icons-vue'
import { couponApi } from '@/services/api'
import type { UserCoupon } from '@/types/api'

// 响应式数据
const allCoupons = ref<UserCoupon[]>([])
const loading = ref(false)
const activeTab = ref('unused')

// 优惠券状态枚举
const COUPON_STATUS = {
  UNUSED: 1,
  USED: 2,
  EXPIRED: 3
} as const

// 标签页配置
const tabs = [
  { 
    key: 'unused', 
    label: '未使用', 
    status: COUPON_STATUS.UNUSED,
    color: '#67C23A'
  },
  { 
    key: 'used', 
    label: '已使用', 
    status: COUPON_STATUS.USED,
    color: '#909399'
  },
  { 
    key: 'expired', 
    label: '已过期', 
    status: COUPON_STATUS.EXPIRED,
    color: '#F56C6C'
  }
]

// 计算属性：根据当前标签页过滤优惠券
const filteredCoupons = computed(() => {
  const currentTab = tabs.find(tab => tab.key === activeTab.value)
  if (!currentTab) {
    console.warn('未找到当前标签页配置:', activeTab.value)
    return []
  }
  
  const filtered = allCoupons.value.filter(coupon => {
    // 确保状态匹配
    const statusMatch = coupon.status === currentTab.status
    console.log(`优惠券 ${coupon.id} 状态: ${coupon.status}, 期望状态: ${currentTab.status}, 匹配: ${statusMatch}`)
    return statusMatch
  })
  
  console.log(`当前标签页: ${activeTab.value}, 过滤后的优惠券数量: ${filtered.length}`)
  return filtered
})

// 计算属性：各状态优惠券数量
const couponCounts = computed(() => {
  const counts: Record<number, number> = {
    [COUPON_STATUS.UNUSED]: 0,
    [COUPON_STATUS.USED]: 0,
    [COUPON_STATUS.EXPIRED]: 0
  }
  
  allCoupons.value.forEach(coupon => {
    if (coupon.status in counts) {
      counts[coupon.status]++
    }
  })
  
  return counts
})

// 获取指定状态的优惠券数量
const getCouponCount = (status: number) => {
  return couponCounts.value[status] || 0
}

// 加载所有用户优惠券
const loadAllUserCoupons = async () => {
  try {
    loading.value = true
    console.log('开始加载用户优惠券...')
    
    const couponList = await couponApi.getUserCoupons()
    console.log('获取到的优惠券数据:', couponList)
    
    // 确保每个优惠券都有正确的状态
    allCoupons.value = couponList.map(coupon => {
      // 验证并修正状态
      let finalStatus = coupon.status
      
      // 如果状态不在有效范围内，根据过期时间重新计算
      if (![COUPON_STATUS.UNUSED, COUPON_STATUS.USED, COUPON_STATUS.EXPIRED].includes(coupon.status as 1 | 2 | 3)) {
        const now = new Date()
        const expireTime = new Date(coupon.expireTime)
        finalStatus = expireTime < now ? COUPON_STATUS.EXPIRED : COUPON_STATUS.UNUSED
        console.warn(`优惠券 ${coupon.id} 状态异常 (${coupon.status})，重新计算为: ${finalStatus}`)
      }
      
      return {
        ...coupon,
        status: finalStatus
      }
    })
    
    console.log('处理后的优惠券数据:', allCoupons.value)
    console.log('各状态数量统计:', couponCounts.value)
    
  } catch (error) {
    console.error('加载优惠券失败:', error)
    ElMessage.error('加载优惠券失败，请稍后重试')
    allCoupons.value = []
  } finally {
    loading.value = false
  }
}

// 处理标签页切换
const handleTabChange = (tabKey: string) => {
  console.log('切换到标签页:', tabKey)
  activeTab.value = tabKey
}

// 格式化优惠券类型和面值
const formatCouponValue = (type: number, value: number) => {
  if (type === 1) {
    return `¥${value}`
  } else if (type === 2) {
    return `${(value * 10).toFixed(1)}折`
  }
  return '未知'
}

// 格式化优惠券类型描述
const formatCouponTypeDesc = (type: number) => {
  return type === 1 ? '满减券' : type === 2 ? '折扣券' : '优惠券'
}

// 格式化最低使用金额
const formatMinAmount = (minAmount: number) => {
  return minAmount > 0 ? `满¥${minAmount}可用` : '无门槛'
}

// 格式化日期
const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  } catch {
    return '无效日期'
  }
}

// 获取优惠券状态信息
const getCouponStatusInfo = (status: number) => {
  switch (status) {
    case COUPON_STATUS.UNUSED:
      return { text: '未使用', type: 'success', icon: Ticket, color: '#67C23A' }
    case COUPON_STATUS.USED:
      return { text: '已使用', type: 'info', icon: Check, color: '#909399' }
    case COUPON_STATUS.EXPIRED:
      return { text: '已过期', type: 'danger', icon: Clock, color: '#F56C6C' }
    default:
      return { text: '未知状态', type: 'warning', icon: Warning, color: '#E6A23C' }
  }
}

// 检查优惠券是否即将过期（7天内）
const isExpiringSoon = (expireTime: string, status: number) => {
  if (status !== COUPON_STATUS.UNUSED) return false
  
  try {
    const expire = new Date(expireTime)
    const now = new Date()
    const diffDays = Math.ceil((expire.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays <= 7 && diffDays > 0
  } catch {
    return false
  }
}

// 监听activeTab变化，用于调试
watch(activeTab, (newTab, oldTab) => {
  console.log(`标签页从 ${oldTab} 切换到 ${newTab}`)
  console.log(`当前过滤的优惠券:`, filteredCoupons.value)
})

// 组件挂载时加载数据
onMounted(() => {
  console.log('UserCouponsView 组件已挂载，开始加载数据')
  loadAllUserCoupons()
})
</script>

<template>
  <div class="user-coupons-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">
          <el-icon><Ticket /></el-icon>
        </div>
        <div class="header-text">
          <h1>我的优惠券</h1>
          <p>查看和管理您的所有优惠券</p>
        </div>
      </div>
    </div>

    <!-- 优惠券容器 -->
    <div class="coupons-container">
      <!-- 标签页导航 -->
      <el-tabs 
        v-model="activeTab" 
        class="coupon-tabs" 
        @tab-change="handleTabChange"
        type="card"
      >
        <el-tab-pane 
          v-for="tab in tabs" 
          :key="tab.key"
          :name="tab.key"
          :label="`${tab.label} (${getCouponCount(tab.status)})`"
        >
          <!-- 标签页内容 -->
          <div v-loading="loading" class="tab-content">
            <!-- 空状态 -->
            <div v-if="filteredCoupons.length === 0 && !loading" class="empty-state">
              <el-icon class="empty-icon"><Ticket /></el-icon>
              <p class="empty-text">暂无{{ tab.label }}的优惠券</p>
              <p class="empty-desc">快去领取更多优惠券吧~</p>
            </div>
            
            <!-- 优惠券列表 -->
            <div v-else class="coupons-grid">
              <div 
                v-for="coupon in filteredCoupons" 
                :key="`${coupon.id}-${coupon.status}`"
                class="coupon-card"
                :class="`status-${coupon.status}`"
              >
                <!-- 即将过期警告 -->
                <div 
                  v-if="isExpiringSoon(coupon.expireTime, coupon.status)" 
                  class="expire-warning"
                >
                  <el-icon><Warning /></el-icon>
                  即将过期
                </div>
                
                <!-- 优惠券头部 -->
                <div class="coupon-header">
                  <div class="coupon-value">
                    <div class="value-main">
                      {{ formatCouponValue(coupon.coupon?.type || 1, coupon.coupon?.value || 0) }}
                    </div>
                    <div class="value-desc">
                      {{ formatCouponTypeDesc(coupon.coupon?.type || 1) }}
                    </div>
                  </div>
                  <div class="coupon-status">
                    <el-tag 
                      :type="getCouponStatusInfo(coupon.status).type" 
                      size="small"
                      class="status-tag"
                    >
                      <el-icon>
                        <component :is="getCouponStatusInfo(coupon.status).icon" />
                      </el-icon>
                      {{ getCouponStatusInfo(coupon.status).text }}
                    </el-tag>
                  </div>
                </div>

                <!-- 优惠券内容 -->
                <div class="coupon-content">
                  <div class="coupon-title">
                    {{ coupon.coupon?.title || '优惠券' }}
                  </div>
                  <div class="coupon-condition">
                    {{ formatMinAmount(coupon.coupon?.minAmount || 0) }}
                  </div>
                  <div class="coupon-description" v-if="coupon.coupon?.description">
                    {{ coupon.coupon.description }}
                  </div>
                </div>

                <!-- 优惠券底部 -->
                <div class="coupon-footer">
                  <div class="coupon-time">
                    <el-icon><Calendar /></el-icon>
                    <div class="time-info">
                      <div class="time-label">有效期至</div>
                      <div class="time-value">{{ formatDate(coupon.expireTime) }}</div>
                    </div>
                  </div>
                  
                  <!-- 已使用标记 -->
                  <div v-if="coupon.status === COUPON_STATUS.USED" class="used-mark">
                    <el-icon><Check /></el-icon>
                    <span>已使用</span>
                  </div>
                  
                  <!-- 已过期标记 -->
                  <div v-if="coupon.status === COUPON_STATUS.EXPIRED" class="expired-mark">
                    <el-icon><Clock /></el-icon>
                    <span>已过期</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<style scoped>
.user-coupons-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.page-header {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.header-text h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #2c3e50;
}

.header-text p {
  margin: 0;
  color: #7f8c8d;
  font-size: 16px;
}

.coupons-container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.coupon-tabs {
  --el-tabs-header-height: 50px;
}

.coupon-tabs :deep(.el-tabs__header) {
  margin-bottom: 30px;
}

.coupon-tabs :deep(.el-tabs__nav-wrap) {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 4px;
}

.coupon-tabs :deep(.el-tabs__item) {
  border: none;
  border-radius: 8px;
  margin: 0 4px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.coupon-tabs :deep(.el-tabs__item.is-active) {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.tab-content {
  min-height: 400px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #909399;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-text {
  font-size: 18px;
  margin: 0 0 8px 0;
  font-weight: 500;
}

.empty-desc {
  font-size: 14px;
  margin: 0;
  opacity: 0.7;
}

.coupons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.coupon-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 2px solid transparent;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.coupon-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.coupon-card.status-1 {
  border-color: #67C23A;
}

.coupon-card.status-1::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #67C23A, #85ce61);
}

.coupon-card.status-2 {
  border-color: #909399;
  opacity: 0.8;
}

.coupon-card.status-2::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #909399, #b1b3b8);
}

.coupon-card.status-3 {
  border-color: #F56C6C;
  opacity: 0.7;
}

.coupon-card.status-3::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #F56C6C, #f78989);
}

.expire-warning {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #ff4757;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 1;
}

.coupon-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.coupon-value {
  flex: 1;
}

.value-main {
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  line-height: 1;
  margin-bottom: 4px;
}

.value-desc {
  font-size: 14px;
  color: #7f8c8d;
  font-weight: 500;
}

.coupon-status {
  margin-left: 16px;
}

.status-tag {
  font-weight: 500;
  border: none;
  color: white !important;
}

.status-tag.el-tag--success {
  background: #67C23A !important;
  color: white !important;
}

.status-tag.el-tag--info {
  background: #909399 !important;
  color: white !important;
}

.status-tag.el-tag--danger {
  background: #F56C6C !important;
  color: white !important;
}

.status-tag.el-tag--warning {
  background: #E6A23C !important;
  color: white !important;
}

.status-tag .el-icon {
  margin-right: 4px;
}

.coupon-content {
  margin-bottom: 16px;
}

.coupon-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
  line-height: 1.4;
}

.coupon-condition {
  font-size: 14px;
  color: #e74c3c;
  font-weight: 500;
  margin-bottom: 8px;
}

.coupon-description {
  font-size: 12px;
  color: #95a5a6;
  line-height: 1.4;
}

.coupon-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #ecf0f1;
}

.coupon-time {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #7f8c8d;
  font-size: 12px;
}

.time-info {
  display: flex;
  flex-direction: column;
}

.time-label {
  font-size: 11px;
  opacity: 0.8;
}

.time-value {
  font-weight: 500;
  margin-top: 2px;
}

.used-mark,
.expired-mark {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
}

.used-mark {
  color: #909399;
}

.expired-mark {
  color: #F56C6C;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .user-coupons-view {
    padding: 16px;
  }
  
  .page-header {
    padding: 20px;
    margin-bottom: 20px;
  }
  
  .header-content {
    gap: 16px;
  }
  
  .header-icon {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }
  
  .header-text h1 {
    font-size: 24px;
  }
  
  .coupons-container {
    padding: 20px;
  }
  
  .coupons-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .coupon-card {
    padding: 16px;
  }
  
  .value-main {
    font-size: 28px;
  }
}

@media (max-width: 480px) {
  .coupon-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .coupon-status {
    margin-left: 0;
    align-self: flex-start;
  }
  
  .coupon-footer {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
}
</style>