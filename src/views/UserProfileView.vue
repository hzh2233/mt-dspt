<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Location, Document, Check, ShoppingCart, Plus, Ticket, ArrowRight, Setting, Lock, Bell, Star, Edit, Camera, Phone, ChatDotRound } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/order'
import { useCartStore } from '@/stores/cart'
import { userApi, addressApi, orderApi } from '@/services/api'
import { useRouter } from 'vue-router'
import type { BackendAddress, AddressRequest } from '@/types/api'

const userStore = useUserStore()
const orderStore = useOrderStore()
const router = useRouter()
const cartStore = useCartStore()

// 用户信息表单
const userForm = reactive({
  nickname: userStore.userInfo.nickname || '',
  phone: userStore.userInfo.phone || '',
  avatarUrl: userStore.userInfo.avatarUrl || ''
})

// 监听用户信息变化，更新表单
watch(() => userStore.userInfo, (newUserInfo) => {
  userForm.nickname = newUserInfo.nickname || ''
  userForm.phone = newUserInfo.phone || ''
  if (!avatarFile.value) {
    userForm.avatarUrl = newUserInfo.avatarUrl || ''
  }
}, { deep: true })

// 头像文件
const avatarFile = ref<File | null>(null)
// 头像相关状态
const avatarLoading = ref(false)
const showAvatarSaveBtn = ref(false)
const newAvatarUrl = ref('')

// 加载状态
const loading = ref(false)

// 地址相关状态
const editingAddress = ref<BackendAddress | null>(null)
const showAddressDialog = ref(false)

// 地址表单
const addressForm = reactive({
  receiver: '',
  phone: '',
  provinceCode: '',
  provinceName: '',
  cityCode: '',
  cityName: '',
  districtCode: '',
  districtName: '',
  detailAddress: '',
  isDefault: 0,
  tag: '家',
  region: ''
})

// 地址相关状态变量
const addressLoading = ref(false)
const addresses = ref<BackendAddress[]>([])

// 地址选择器的值
const selectedRegion = ref<{
  provinceCode: string
  provinceName: string
  cityCode: string
  cityName: string
  districtCode: string
  districtName: string
} | null>(null)

// 订单统计数据
const orderStats = ref({
  totalOrders: 0,
  pendingOrders: 0,
  completedOrders: 0
})

// 统计数据
const stats = computed(() => {
  return {
    totalOrders: orderStats.value.totalOrders,
    pendingOrders: orderStats.value.pendingOrders,
    completedOrders: orderStats.value.completedOrders,
    cartItems: cartStore.totalItems
  }
})

// 加载地址列表
const loadAddresses = async () => {
  try {
    addressLoading.value = true
    const addressList = await addressApi.getList()
    addresses.value = addressList
  } catch (error) {
    console.error('加载地址失败', error)
    ElMessage.error('加载地址列表失败')
  } finally {
    addressLoading.value = false
  }
}

// 获取订单统计数据
const loadOrderStats = async () => {
  try {
    // 获取所有订单
    const allOrdersResponse = await orderApi.getList({ page: 1, size: 1000 })
    const orders = allOrdersResponse.records || []
    
    // 计算统计数据
    orderStats.value = {
      totalOrders: orders.length,
      pendingOrders: orders.filter((o: any) => o.status === 1).length, // 1表示待发货
      completedOrders: orders.filter((o: any) => o.status === 3).length // 3表示已完成
    }
  } catch (error) {
    console.error('获取订单统计失败:', error)
    ElMessage.error('获取订单统计失败')
  }
}

// 在组件挂载时获取数据
onMounted(async () => {
  await loadOrderStats()
  cartStore.initCart()
  await loadAddresses()
})

// 更新用户信息（不包含头像）
const updateUserInfo = async () => {
  loading.value = true
  
  try {
    const updateData: { nickname: string, phone: string, avatarUrl?: string } = {
      nickname: userForm.nickname,
      phone: userForm.phone
    }
    
    // 保持当前的头像URL
    const currentAvatarUrl = userStore.userInfo.avatarUrl
    if (currentAvatarUrl && currentAvatarUrl.trim() !== '') {
      updateData.avatarUrl = currentAvatarUrl
    }
    
    const updatedUser = await userApi.updateUserInfo(updateData)
    
    userStore.setUserInfo({
      ...userStore.userInfo,
      nickname: userForm.nickname,
      phone: userForm.phone
    })
    
    ElMessage.success('个人信息更新成功')
  } catch (error) {
    console.error('更新失败', error)
    ElMessage.error('更新个人信息失败')
  } finally {
    loading.value = false
  }
}

// 跳转到优惠券页面
const goToCoupons = () => {
  router.push('/user/coupons')
}

// 跳转到地址管理页面
const goToAddressManagement = () => {
  router.push('/user/address')
}

// 跳转到收藏页面
const goToFavorites = () => {
  router.push('/user/favorites')
}

// 跳转到账户安全页面
const goToSecurity = () => {
  router.push('/user/security')
}

// 跳转到订单页面
const goToOrders = () => {
  router.push('/user/orders')
}

// 跳转到我的评价页面
const goToComments = () => {
  router.push('/user/comments')
}

// 上传头像
const handleAvatarUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }

  const isLt20M = file.size / 1024 / 1024 < 20
  if (!isLt20M) {
    ElMessage.error('图片大小不能超过20MB')
    return false
  }

  avatarFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    userForm.avatarUrl = e.target?.result as string
    showAvatarSaveBtn.value = true
  }
  reader.readAsDataURL(file)
  
  ElMessage.success('头像已选择，点击保存按钮完成上传')
  return false
}

// 保存头像
const saveAvatar = async () => {
  if (!avatarFile.value) {
    ElMessage.error('请先选择头像')
    return
  }

  avatarLoading.value = true
  try {
    const result = await userApi.uploadAvatar(avatarFile.value)
    newAvatarUrl.value = result.avatarUrl
    
    // 更新用户信息中的头像URL
    const updateData = {
      nickname: userStore.userInfo.nickname || '',
      phone: userStore.userInfo.phone || '',
      avatarUrl: result.avatarUrl
    }
    
    await userApi.updateUserInfo(updateData)
    
    // 更新本地状态
    userStore.setUserInfo({
      ...userStore.userInfo,
      avatarUrl: result.avatarUrl
    })
    
    userForm.avatarUrl = result.avatarUrl
    avatarFile.value = null
    showAvatarSaveBtn.value = false
    
    ElMessage.success('头像保存成功')
  } catch (error) {
    console.error('头像保存失败', error)
    ElMessage.error('头像保存失败')
  } finally {
    avatarLoading.value = false
  }
}
</script>

<template>
  <div class="profile-view">
    <!-- 顶部背景区域 -->
    <div class="profile-hero">
      <div class="hero-background"></div>
      <div class="hero-content">
        <div class="user-avatar-section">
          <div class="avatar-container">
            <el-avatar 
              :size="120" 
              :src="userForm.avatarUrl || '/default-avatar.png'"
              class="user-avatar"
            >
              <el-icon><User /></el-icon>
            </el-avatar>
            <el-upload
              :show-file-list="false"
              :before-upload="handleAvatarUpload"
              accept="image/*"
              class="avatar-upload"
            >
              <div class="upload-overlay">
                <el-icon><Camera /></el-icon>
              </div>
            </el-upload>
            <!-- 头像保存按钮 -->
            <el-button 
              v-if="showAvatarSaveBtn"
              type="primary"
              size="small"
              :loading="avatarLoading"
              @click="saveAvatar"
              class="avatar-save-btn"
            >
              保存头像
            </el-button>
          </div>
          <div class="user-info">
            <h2 class="user-name">{{ userStore.userInfo.nickname || '用户' }}</h2>
            <p class="user-phone">{{ userStore.userInfo.phone || '未设置手机号' }}</p>
            <div class="user-level">
              <el-tag type="warning" effect="light" size="large">
                <el-icon><Star /></el-icon>
                普通会员
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="profile-content">
      <!-- 统计数据卡片 -->
      <div class="stats-section">
        <el-row :gutter="24">
          <el-col :xs="12" :sm="6">
            <div class="stat-card" @click="goToOrders">
              <div class="stat-icon orders">
                <el-icon><Document /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.totalOrders }}</div>
                <div class="stat-label">全部订单</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon pending">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.pendingOrders }}</div>
                <div class="stat-label">待发货</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon completed">
                <el-icon><Check /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.completedOrders }}</div>
                <div class="stat-label">已完成</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="stat-card">
              <div class="stat-icon cart">
                <el-icon><ShoppingCart /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.cartItems }}</div>
                <div class="stat-label">购物车</div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 快捷功能区 -->
      <div class="quick-actions-section">
        <h3 class="section-title">快捷功能</h3>
        <el-row :gutter="24">
          <el-col :xs="12" :sm="8" :md="6">
            <div class="action-card address" @click="goToAddressManagement">
              <div class="action-icon">
                <el-icon><Location /></el-icon>
              </div>
              <div class="action-content">
                <div class="action-title">收货地址</div>
                <div class="action-desc">管理收货地址</div>
              </div>
              <div class="action-arrow">
                <el-icon><ArrowRight /></el-icon>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="action-card favorites" @click="goToFavorites">
              <div class="action-icon">
                <el-icon><Star /></el-icon>
              </div>
              <div class="action-content">
                <div class="action-title">我的收藏</div>
                <div class="action-desc">收藏的商品</div>
              </div>
              <div class="action-arrow">
                <el-icon><ArrowRight /></el-icon>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="action-card security" @click="goToSecurity">
              <div class="action-icon">
                <el-icon><Lock /></el-icon>
              </div>
              <div class="action-content">
                <div class="action-title">账户安全</div>
                <div class="action-desc">密码设置</div>
              </div>
              <div class="action-arrow">
                <el-icon><ArrowRight /></el-icon>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="action-card coupons" @click="goToCoupons">
              <div class="action-icon">
                <el-icon><Ticket /></el-icon>
              </div>
              <div class="action-content">
                <div class="action-title">优惠券</div>
                <div class="action-desc">我的优惠券</div>
              </div>
              <div class="action-arrow">
                <el-icon><ArrowRight /></el-icon>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="action-card comments" @click="goToComments">
              <div class="action-icon">
                <el-icon><ChatDotRound /></el-icon>
              </div>
              <div class="action-content">
                <div class="action-title">我的评价</div>
                <div class="action-desc">查看我的评价</div>
              </div>
              <div class="action-arrow">
                <el-icon><ArrowRight /></el-icon>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 个人信息编辑 -->
      <div class="profile-edit-section">
        <h3 class="section-title">个人信息</h3>
        <div class="edit-card">
          <el-form :model="userForm" label-width="100px" class="profile-form">
            <el-form-item label="昵称">
              <el-input 
                v-model="userForm.nickname" 
                placeholder="请输入昵称"
                :prefix-icon="User"
                class="form-input"
              />
            </el-form-item>
            <el-form-item label="手机号">
              <el-input 
                v-model="userForm.phone" 
                placeholder="请输入手机号"
                :prefix-icon="Phone"
                class="form-input"
              />
            </el-form-item>
            <el-form-item>
              <el-button 
                type="primary" 
                @click="updateUserInfo" 
                :loading="loading"
                size="large"
                class="save-btn"
              >
                保存修改
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <!-- 服务支持 -->
      <div class="service-section">
        <h3 class="section-title">服务支持</h3>
        <el-row :gutter="24">
          <el-col :xs="24" :sm="12">
            <div class="service-card">
              <div class="service-header">
                <div class="service-icon">
                  <el-icon><Setting /></el-icon>
                </div>
                <div class="service-title">客户服务</div>
              </div>
              <div class="service-list">
                <div class="service-item">
                  <el-icon><Document /></el-icon>
                  <span>帮助中心</span>
                </div>
                <div class="service-item">
                  <el-icon><User /></el-icon>
                  <span>在线客服</span>
                </div>
                <div class="service-item">
                  <el-icon><Check /></el-icon>
                  <span>售后服务</span>
                </div>
              </div>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12">
            <div class="membership-card">
              <div class="membership-header">
                <div class="membership-icon">
                  <el-icon><Star /></el-icon>
                </div>
                <div class="membership-title">会员特权</div>
              </div>
              <div class="membership-content">
                <div class="membership-level">
                  <div class="level-badge">普通会员</div>
                  <div class="level-desc">继续购物升级会员等级</div>
                </div>
                <div class="privilege-list">
                  <div class="privilege-item">
                    <el-icon><Ticket /></el-icon>
                    <span>专属优惠券</span>
                  </div>
                  <div class="privilege-item">
                    <el-icon><ShoppingCart /></el-icon>
                    <span>免费配送</span>
                  </div>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.profile-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
}

.profile-hero {
  position: relative;
  padding: 60px 0 40px;
  overflow: hidden;
  
  .hero-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%);
    
    &::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
      animation: float 6s ease-in-out infinite;
    }
  }
  
  .hero-content {
    position: relative;
    z-index: 2;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
  }
  
  .user-avatar-section {
    display: flex;
    align-items: center;
    gap: 32px;
    
    @media (max-width: 768px) {
      flex-direction: column;
      text-align: center;
      gap: 24px;
    }
  }
  
  .avatar-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    
    .user-avatar {
      border: 4px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(10px);
    }
    
    .avatar-upload {
      position: absolute;
      bottom: 12px;
      right: 0;
      
      .upload-overlay {
        width: 36px;
        height: 36px;
        background: #409eff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
        transition: all 0.3s ease;
        
        &:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(64, 158, 255, 0.6);
        }
      }
    }
    
    .avatar-save-btn {
      background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
      border: none;
      border-radius: 20px;
      padding: 8px 20px;
      font-size: 12px;
      font-weight: 600;
      color: white;
      box-shadow: 0 4px 12px rgba(103, 194, 58, 0.4);
      transition: all 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(103, 194, 58, 0.6);
      }
      
      &.is-loading {
        opacity: 0.8;
      }
    }
  }
  
  .user-info {
    color: white;
    
    .user-name {
      font-size: 32px;
      font-weight: 600;
      margin: 0 0 8px 0;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    .user-phone {
      font-size: 16px;
      opacity: 0.9;
      margin: 0 0 16px 0;
    }
    
    .user-level {
      .el-tag {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        backdrop-filter: blur(10px);
        
        .el-icon {
          margin-right: 4px;
        }
      }
    }
  }
}

.profile-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px 60px;
  position: relative;
  z-index: 2;
  margin-top: -20px;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: white;
  margin: 0 0 24px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.stats-section {
  margin-bottom: 48px;
  
  .stat-card {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 16px;
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.3s ease;
    cursor: pointer;
    
    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
    }
    
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      color: white;
      
      &.orders {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      
      &.pending {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }
      
      &.completed {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      }
      
      &.cart {
        background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      }
    }
    
    .stat-info {
      .stat-number {
        font-size: 28px;
        font-weight: 700;
        color: #2c3e50;
        line-height: 1;
      }
      
      .stat-label {
        font-size: 14px;
        color: #7f8c8d;
        margin-top: 4px;
      }
    }
  }
}

.quick-actions-section {
  margin-bottom: 48px;
  
  .action-card {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 16px;
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.3s ease;
    cursor: pointer;
    margin-bottom: 16px;
    
    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
    }
    
    .action-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      color: white;
    }
    
    &.address .action-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    &.favorites .action-icon {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    
    &.security .action-icon {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }
    
    &.coupons .action-icon {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    }
    
    &.comments .action-icon {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    }
    
    .action-content {
      flex: 1;
      
      .action-title {
        font-size: 16px;
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 4px;
      }
      
      .action-desc {
        font-size: 14px;
        color: #7f8c8d;
      }
    }
    
    .action-arrow {
      color: #bdc3c7;
      font-size: 16px;
    }
  }
}

.profile-edit-section {
  margin-bottom: 48px;
  
  .edit-card {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 16px;
    padding: 32px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    
    .profile-form {
      .form-input {
        .el-input__wrapper {
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
      }
      
      .save-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 12px;
        padding: 12px 32px;
        font-weight: 600;
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
        
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(102, 126, 234, 0.6);
        }
      }
    }
  }
}

.service-section {
  .service-card, .membership-card {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    height: 100%;
    
    .service-header, .membership-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      
      .service-icon, .membership-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 18px;
      }
      
      .service-title, .membership-title {
        font-size: 18px;
        font-weight: 600;
        color: #2c3e50;
      }
    }
    
    .service-list {
      .service-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
        color: #5a6c7d;
        border-bottom: 1px solid #f0f2f5;
        
        &:last-child {
          border-bottom: none;
        }
        
        .el-icon {
          color: #667eea;
        }
      }
    }
    
    .membership-content {
      .membership-level {
        text-align: center;
        margin-bottom: 20px;
        
        .level-badge {
          display: inline-block;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        
        .level-desc {
          font-size: 14px;
          color: #7f8c8d;
        }
      }
      
      .privilege-list {
        .privilege-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          color: #5a6c7d;
          
          .el-icon {
            color: #667eea;
          }
        }
      }
    }
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

@media (max-width: 768px) {
  .profile-content {
    padding: 0 16px 40px;
  }
  
  .section-title {
    font-size: 20px;
  }
  
  .stats-section .stat-card {
    padding: 16px;
    
    .stat-icon {
      width: 40px;
      height: 40px;
      font-size: 18px;
    }
    
    .stat-info .stat-number {
      font-size: 24px;
    }
  }
  
  .quick-actions-section .action-card {
    padding: 16px;
    
    .action-icon {
      width: 40px;
      height: 40px;
      font-size: 18px;
    }
  }
  
  .profile-edit-section .edit-card {
    padding: 24px;
  }
}
</style>