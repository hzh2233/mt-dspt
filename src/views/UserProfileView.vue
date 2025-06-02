<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Location, Document, Check, ShoppingCart, Plus, Ticket, ArrowRight, Setting, Lock, Bell, Star } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/order'
import { useCartStore } from '@/stores/cart'
import { userApi, addressApi } from '@/services/api'
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
  if (!avatarFile.value) { // 只有在没有选择新头像时才更新
    userForm.avatarUrl = newUserInfo.avatarUrl || ''
  }
}, { deep: true })

// 头像文件
const avatarFile = ref<File | null>(null)

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

// 统计数据
const stats = computed(() => {
  const orders = orderStore.orders
  return {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === '待付款').length,
    completedOrders: orders.filter(o => o.status === '已完成').length,
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

// 在组件挂载时获取数据
onMounted(async () => {
  orderStore.loadOrders()
  cartStore.initCart()
  await loadAddresses()
})

// 更新用户信息
const updateUserInfo = async () => {
  loading.value = true
  
  try {
    let avatarUrl = userForm.avatarUrl
    
    // 如果有新的头像文件，先上传头像
    if (avatarFile.value) {
      try {
        const result = await userApi.uploadAvatar(avatarFile.value)
        avatarUrl = result.avatarUrl
        ElMessage.success('头像上传成功')
      } catch (error) {
        console.error('头像上传失败', error)
        ElMessage.error('头像上传失败')
        return // 头像上传失败则不继续更新其他信息
      }
    }
    
    // 调用API更新用户信息
    const updateData: { nickname: string, phone: string, avatarUrl?: string } = {
      nickname: userForm.nickname,
      phone: userForm.phone
    }
    
    // 只有当avatarUrl有值时才添加到更新数据中
    if (avatarUrl && avatarUrl.trim() !== '') {
      updateData.avatarUrl = avatarUrl
    }
    
    const updatedUser = await userApi.updateUserInfo(updateData)
    
    // 更新store中的用户信息
    userStore.setUserInfo({
      ...userStore.userInfo,
      nickname: userForm.nickname,
      phone: userForm.phone,
      avatarUrl: avatarUrl
    })
    
    // 更新表单中的头像URL为服务器返回的URL
    userForm.avatarUrl = avatarUrl
    
    // 清除本地头像文件
    avatarFile.value = null
    
    ElMessage.success('个人信息更新成功')
  } catch (error) {
    console.error('更新失败', error)
    ElMessage.error('更新个人信息失败')
  } finally {
    loading.value = false
  }
}

// 打开地址对话框
const openAddressDialog = (address?: BackendAddress) => {
  if (address) {
    editingAddress.value = address
    Object.assign(addressForm, {
      receiver: address.receiver,
      phone: address.phone,
      provinceCode: address.provinceCode,
      provinceName: address.provinceName,
      cityCode: address.cityCode,
      cityName: address.cityName,
      districtCode: address.districtCode,
      districtName: address.districtName,
      detailAddress: address.detailAddress,
      isDefault: address.isDefault,
      tag: address.tag
    })
    
    // 设置地址选择器的值
    selectedRegion.value = {
      provinceCode: address.provinceCode,
      provinceName: address.provinceName,
      cityCode: address.cityCode,
      cityName: address.cityName,
      districtCode: address.districtCode,
      districtName: address.districtName
    }
    
    // 设置region字段用于表单验证
    addressForm.region = `${address.provinceName}${address.cityName}${address.districtName}`
  } else {
    editingAddress.value = null
    Object.assign(addressForm, {
      receiver: userStore.userInfo.nickname || '',
      phone: userStore.userInfo.phone || '',
      provinceCode: '',
      provinceName: '',
      cityCode: '',
      cityName: '',
      districtCode: '',
      districtName: '',
      detailAddress: '',
      isDefault: 0,
      tag: '家',
      region: '' // 清空region字段
    })
    selectedRegion.value = null
  }
  showAddressDialog.value = true
}

// 地址表单引用
const addressFormRef = ref()

// 处理地址选择器变化
const handleRegionChange = (region: any) => {
  if (region) {
    Object.assign(addressForm, {
      provinceCode: region.provinceCode,
      provinceName: region.provinceName,
      cityCode: region.cityCode,
      cityName: region.cityName,
      districtCode: region.districtCode,
      districtName: region.districtName,
      region: `${region.provinceName}${region.cityName}${region.districtName}` // 更新region字段用于表单验证
    })
    console.log('地址选择器更新:', region)
    // 手动触发表单验证
    if (addressFormRef.value) {
      addressFormRef.value.validateField('region')
    }
  } else {
    // 清空地区信息
    Object.assign(addressForm, {
      provinceCode: '',
      provinceName: '',
      cityCode: '',
      cityName: '',
      districtCode: '',
      districtName: '',
      region: '' // 清空region字段
    })
    console.log('地址选择器清空')
    // 手动触发表单验证
    if (addressFormRef.value) {
      addressFormRef.value.validateField('region')
    }
  }
}

// 保存地址
const saveAddress = async () => {
  // 使用表单验证
  if (!addressFormRef.value) {
    ElMessage.error('表单未初始化')
    return
  }
  
  try {
    const valid = await addressFormRef.value.validate()
    if (!valid) {
      return
    }
  } catch (error) {
    console.log('表单验证失败:', error)
    return
  }

  addressLoading.value = true
  
  try {
    const addressData: AddressRequest = {
      receiver: addressForm.receiver,
      phone: addressForm.phone,
      provinceCode: addressForm.provinceCode,
      provinceName: addressForm.provinceName,
      cityCode: addressForm.cityCode,
      cityName: addressForm.cityName,
      districtCode: addressForm.districtCode,
      districtName: addressForm.districtName,
      detailAddress: addressForm.detailAddress,
      isDefault: addressForm.isDefault,
      tag: addressForm.tag
    }

    if (editingAddress.value) {
      // 更新地址 - 在请求体中包含地址ID
      const updateData = {
        ...addressData,
        id: editingAddress.value.id
      }
      await addressApi.update(editingAddress.value.id, updateData)
      ElMessage.success('地址更新成功')
    } else {
      // 新增地址
      await addressApi.add(addressData)
      ElMessage.success('地址添加成功')
    }
    
    // 重新加载地址列表
    await loadAddresses()
    showAddressDialog.value = false
  } catch (error) {
    console.error('保存地址失败', error)
    ElMessage.error('保存地址失败')
  } finally {
    addressLoading.value = false
  }
}

// 删除地址
const deleteAddress = async (address: BackendAddress) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个地址吗？',
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await addressApi.delete(address.id)
    ElMessage.success('地址删除成功')
    
    // 重新加载地址列表
    await loadAddresses()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除地址失败', error)
      ElMessage.error('删除地址失败')
    }
  }
}

// 设置默认地址
const setDefaultAddress = async (address: BackendAddress) => {
  try {
    await addressApi.setDefault(address.id)
    ElMessage.success('设置默认地址成功')
    
    // 重新加载地址列表
    await loadAddresses()
  } catch (error) {
    console.error('设置默认地址失败', error)
    ElMessage.error('设置默认地址失败')
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

// 上传头像
const handleAvatarUpload = (file: File) => {
  // 验证文件类型
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }

  // 验证文件大小（限制为20MB）
  const isLt20M = file.size / 1024 / 1024 < 20
  if (!isLt20M) {
    ElMessage.error('图片大小不能超过20MB')
    return false
  }

  // 保存文件到本地状态，创建预览URL
  avatarFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    userForm.avatarUrl = e.target?.result as string
  }
  reader.readAsDataURL(file)
  
  ElMessage.success('头像已选择，点击保存修改完成上传')
  return false // 阻止自动上传
}
</script>

<template>
  <div class="profile-view">
    <div class="profile-header">
      <h1 class="page-title">个人中心</h1>
      <p class="page-subtitle">管理您的个人信息和账户设置</p>
    </div>
    
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="12" :sm="8">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ stats.totalOrders }}</div>
            <div class="stat-label">总订单数</div>
          </div>
          <el-icon class="stat-icon"><Document /></el-icon>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ stats.completedOrders }}</div>
            <div class="stat-label">已完成</div>
          </div>
          <el-icon class="stat-icon"><Check /></el-icon>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ stats.cartItems }}</div>
            <div class="stat-label">购物车</div>
          </div>
          <el-icon class="stat-icon"><ShoppingCart /></el-icon>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 功能卡片区域 -->
    <el-row :gutter="20" class="quick-actions-row">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="action-card address-card" @click="goToAddressManagement">
          <div class="action-content">
            <div class="action-icon">
              <el-icon><Location /></el-icon>
            </div>
            <div class="action-info">
              <div class="action-title">收货地址</div>
              <div class="action-desc">管理您的收货地址</div>
            </div>
            <div class="action-arrow">
              <el-icon><ArrowRight /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="action-card favorites-card" @click="goToFavorites">
          <div class="action-content">
            <div class="action-icon">
              <el-icon><Star /></el-icon>
            </div>
            <div class="action-info">
              <div class="action-title">我的收藏</div>
              <div class="action-desc">查看收藏的商品</div>
            </div>
            <div class="action-arrow">
              <el-icon><ArrowRight /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="action-card security-card">
          <div class="action-content">
            <div class="action-icon">
              <el-icon><Lock /></el-icon>
            </div>
            <div class="action-info">
              <div class="action-title">账户安全</div>
              <div class="action-desc">密码和安全设置</div>
            </div>
            <div class="action-arrow">
              <el-icon><ArrowRight /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="action-card notification-card">
          <div class="action-content">
            <div class="action-icon">
              <el-icon><Bell /></el-icon>
            </div>
            <div class="action-info">
              <div class="action-title">消息通知</div>
              <div class="action-desc">通知偏好设置</div>
            </div>
            <div class="action-arrow">
              <el-icon><ArrowRight /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 服务与帮助 -->
    <el-row :gutter="20" class="service-row">
      <el-col :xs="24" :sm="12">
        <el-card class="service-card">
          <template #header>
            <div class="service-header">
              <el-icon class="service-icon"><Setting /></el-icon>
              <span class="service-title">客户服务</span>
            </div>
          </template>
          
          <div class="service-list">
            <div class="service-item">
              <div class="service-item-icon">
                <el-icon><Document /></el-icon>
              </div>
              <div class="service-item-info">
                <div class="service-item-title">帮助中心</div>
                <div class="service-item-desc">常见问题解答</div>
              </div>
            </div>
            
            <div class="service-item">
              <div class="service-item-icon">
                <el-icon><User /></el-icon>
              </div>
              <div class="service-item-info">
                <div class="service-item-title">在线客服</div>
                <div class="service-item-desc">7x24小时服务</div>
              </div>
            </div>
            
            <div class="service-item">
              <div class="service-item-icon">
                <el-icon><Check /></el-icon>
              </div>
              <div class="service-item-info">
                <div class="service-item-title">售后服务</div>
                <div class="service-item-desc">退换货服务</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12">
        <el-card class="membership-card">
          <template #header>
            <div class="membership-header">
              <el-icon class="membership-icon"><Ticket /></el-icon>
              <span class="membership-title">会员特权</span>
            </div>
          </template>
          
          <div class="membership-content">
            <div class="membership-level">
              <div class="level-badge">普通会员</div>
              <div class="level-desc">继续购物升级会员等级</div>
            </div>
            
            <div class="privilege-list">
              <div class="privilege-item">
                <el-icon class="privilege-icon"><Ticket /></el-icon>
                <span>专属优惠券</span>
              </div>
              <div class="privilege-item">
                <el-icon class="privilege-icon"><ShoppingCart /></el-icon>
                <span>免费配送</span>
              </div>
              <div class="privilege-item">
                <el-icon class="privilege-icon"><Check /></el-icon>
                <span>优先客服</span>
              </div>
            </div>
            
            <el-button type="primary" class="upgrade-btn" @click="goToCoupons">
              查看优惠券
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" class="content-row">
      <!-- 个人信息卡片 -->
      <el-col :xs="24">
        <el-card class="profile-card">
          <template #header>
            <div class="card-header">
              <el-icon><User /></el-icon>
              <span>个人信息</span>
            </div>
          </template>
          
          <div class="avatar-section">
            <el-upload
              class="avatar-uploader"
              action="#"
              :show-file-list="false"
              :before-upload="handleAvatarUpload"
            >
              <img v-if="userForm.avatarUrl" :src="userForm.avatarUrl" class="avatar" />
              <div v-else class="avatar-placeholder">
                <el-icon><Plus /></el-icon>
              </div>
            </el-upload>
            <div class="avatar-info">
              <h3>{{ userStore.userInfo.nickname }}</h3>
              <p>点击头像选择，保存修改时一起上传</p>
            </div>
          </div>
          
          <el-form :model="userForm" label-width="80px" class="user-form">
            <el-form-item label="用户名">
              <el-input v-model="userForm.nickname" placeholder="请输入用户名" />
            </el-form-item>
            
            <el-form-item label="手机号">
              <el-input v-model="userForm.phone" placeholder="请输入手机号" />
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="updateUserInfo" :loading="loading">
                保存修改
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

    </el-row>
    


  </div>
</template>

<style scoped lang="scss">
.profile-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.profile-header {
  text-align: center;
  margin-bottom: 30px;
  
  .page-title {
    font-size: 28px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 8px;
  }
  
  .page-subtitle {
    color: #909399;
    font-size: 14px;
  }
}

.stats-row {
  margin-bottom: 30px;
}

.quick-actions-row {
  margin-bottom: 30px;
}

.action-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  height: 100%;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    border-color: #409eff;
  }
  
  &.security-card:hover {
    border-color: #fa709a;
    box-shadow: 0 8px 25px rgba(250, 112, 154, 0.2);
  }
  
  &.address-card:hover {
    border-color: #4facfe;
    box-shadow: 0 8px 25px rgba(79, 172, 254, 0.2);
  }
  
  &.notification-card:hover {
    border-color: #a8edea;
    box-shadow: 0 8px 25px rgba(168, 237, 234, 0.2);
  }
  
  &.favorites-card:hover {
    border-color: #ffeaa7;
    box-shadow: 0 8px 25px rgba(255, 234, 167, 0.2);
  }
  
  .action-content {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 20px;
  }
  
  .action-icon {
    width: 50px;
    height: 50px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    
    .el-icon {
      font-size: 24px;
      color: white;
    }
  }
  
  &.address-card .action-icon {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }
  
  &.security-card .action-icon {
    background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  }
  
  &.notification-card .action-icon {
    background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
    
    .el-icon {
      color: #666;
    }
  }
  
  &.favorites-card .action-icon {
    background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
  }
  
  .action-info {
    flex: 1;
  }
  
  .action-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 4px;
  }
  
  .action-desc {
    font-size: 12px;
    color: #909399;
  }
  
  .action-arrow {
    .el-icon {
      font-size: 16px;
      color: #c0c4cc;
      transition: all 0.3s ease;
    }
  }
  
  &:hover .action-arrow .el-icon {
    color: #409eff;
    transform: translateX(3px);
  }
  
  &.security-card:hover .action-arrow .el-icon {
    color: #fa709a;
  }
  
  &.address-card:hover .action-arrow .el-icon {
    color: #4facfe;
  }
  
  &.notification-card:hover .action-arrow .el-icon {
    color: #a8edea;
  }
  
  &.favorites-card:hover .action-arrow .el-icon {
    color: #ffeaa7;
  }
}

.stat-card {
  text-align: center;
  position: relative;
  overflow: hidden;
  
  .stat-content {
    .stat-number {
      font-size: 24px;
      font-weight: 600;
      color: #409eff;
      margin-bottom: 5px;
    }
    
    .stat-label {
      font-size: 12px;
      color: #909399;
    }
  }
  
  .stat-icon {
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 24px;
    color: #e6f7ff;
  }
}

.content-row {
  margin-bottom: 20px;
}

.profile-card {
  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }
  
  .avatar-section {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 30px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
    
    .avatar-uploader {
      .avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
        cursor: pointer;
        border: 2px solid #dcdfe6;
        transition: border-color 0.3s;
        
        &:hover {
          border-color: #409eff;
        }
      }
      
      .avatar-placeholder {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: #f5f7fa;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: 2px dashed #dcdfe6;
        transition: all 0.3s;
        
        &:hover {
          border-color: #409eff;
          background: #ecf5ff;
        }
        
        .el-icon {
          font-size: 24px;
          color: #c0c4cc;
        }
      }
    }
    
    .avatar-info {
      h3 {
        margin: 0 0 5px 0;
        color: #303133;
      }
      
      p {
        margin: 0;
        color: #909399;
        font-size: 12px;
      }
    }
  }
}

.address-card {
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    > div {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }
  }
  
  .empty-addresses {
    text-align: center;
    padding: 40px 20px;
  }
  
  .address-list {
    .address-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 15px;
      border: 1px solid #ebeef5;
      border-radius: 8px;
      margin-bottom: 10px;
      transition: all 0.3s;
      
      &:hover {
        border-color: #409eff;
        box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
      }
      
      .address-info {
        flex: 1;
        
        .address-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .address-name {
          font-weight: 600;
          color: #303133;
          font-size: 16px;
        }
        
        .address-tags {
          display: flex;
          gap: 5px;
        }
        
        .address-detail {
          color: #606266;
          font-size: 14px;
          line-height: 1.5;
        }
      }
      
      .address-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-left: 15px;
        
        .el-button {
          margin: 0;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .profile-view {
    padding: 10px;
  }
  
  .avatar-section {
    flex-direction: column;
    text-align: center;
  }
  
  .address-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    
    .address-actions {
      align-self: flex-end;
    }
  }
}

/* 服务与帮助区域样式 */
.service-row {
  margin-bottom: 30px;
}

.service-card {
  border-radius: 12px;
  overflow: hidden;
}

.service-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.service-icon {
  font-size: 18px;
  color: #409eff;
}

.service-title {
  font-weight: 600;
  color: #303133;
}

.service-list {
  padding: 0;
}

.service-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.3s ease;
}

.service-item:last-child {
  border-bottom: none;
}

.service-item:hover {
  background: #f8f9fa;
  border-radius: 8px;
  padding-left: 8px;
  padding-right: 8px;
}

.service-item-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
}

.service-item-info {
  flex: 1;
}

.service-item-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 2px;
}

.service-item-desc {
  font-size: 12px;
  color: #909399;
}

/* 会员卡片样式 */
.membership-card {
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.membership-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.membership-icon {
  font-size: 18px;
  color: white;
}

.membership-title {
  font-weight: 600;
  color: white;
}

.membership-content {
  padding: 0;
}

.membership-level {
  text-align: center;
  margin-bottom: 20px;
}

.level-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.level-desc {
  font-size: 12px;
  opacity: 0.8;
}

.privilege-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.privilege-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.privilege-icon {
  font-size: 16px;
  opacity: 0.8;
}

.upgrade-btn {
  width: 100%;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-weight: 600;
}

.upgrade-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}
</style>