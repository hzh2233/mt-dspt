<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/order'
import { useCartStore } from '@/stores/cart'
import { userApi, addressApi } from '@/services/api'
import type { Address } from '@/types/api'

const userStore = useUserStore()
const orderStore = useOrderStore()
const cartStore = useCartStore()

// 用户信息表单
const userForm = reactive({
  username: userStore.userInfo.username || '',
  phone: '19890503274',
  avatar: userStore.userInfo.avatar || ''
})

// 地址列表
const addresses = ref<Address[]>([])
const showAddressDialog = ref(false)
const editingAddress = ref<Address | null>(null)

// 新增/编辑地址表单
const addressForm = reactive<Address>({
  name: '',
  phone: '',
  region: [],
  detailAddress: ''
})

// 城市选项
const cityOptions = [
  {
    value: '北京市',
    label: '北京市',
    children: [
      { value: '东城区', label: '东城区' },
      { value: '西城区', label: '西城区' },
      { value: '朝阳区', label: '朝阳区' },
      { value: '海淀区', label: '海淀区' },
      { value: '丰台区', label: '丰台区' }
    ]
  },
  {
    value: '上海市',
    label: '上海市',
    children: [
      { value: '黄浦区', label: '黄浦区' },
      { value: '徐汇区', label: '徐汇区' },
      { value: '长宁区', label: '长宁区' },
      { value: '静安区', label: '静安区' },
      { value: '浦东新区', label: '浦东新区' }
    ]
  },
  {
    value: '广东省',
    label: '广东省',
    children: [
      { value: '广州市', label: '广州市' },
      { value: '深圳市', label: '深圳市' },
      { value: '珠海市', label: '珠海市' },
      { value: '佛山市', label: '佛山市' },
      { value: '东莞市', label: '东莞市' }
    ]
  }
]

// 加载状态
const loading = ref(false)
const addressLoading = ref(false)

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

// 在组件挂载时获取数据
onMounted(async () => {
  await loadAddresses()
  orderStore.loadOrders()
  cartStore.initCart()
})

// 加载地址列表
const loadAddresses = async () => {
  try {
    // 从localStorage加载地址（实际项目中应该从API获取）
    const savedAddresses = localStorage.getItem('userAddresses')
    if (savedAddresses) {
      addresses.value = JSON.parse(savedAddresses)
    }
  } catch (error) {
    console.error('加载地址失败', error)
  }
}

// 更新用户信息
const updateUserInfo = async () => {
  loading.value = true
  
  try {
    // 实际项目中调用API更新用户信息
    // await userApi.updateUserInfo(userForm)
    
    // 模拟API请求延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 更新store中的用户信息
    userStore.setUserInfo({
      ...userStore.userInfo,
      username: userForm.username
    })
    
    ElMessage.success('个人信息更新成功')
  } catch (error) {
    console.error('更新失败', error)
  } finally {
    loading.value = false
  }
}

// 打开地址对话框
const openAddressDialog = (address?: Address) => {
  if (address) {
    editingAddress.value = address
    Object.assign(addressForm, address)
  } else {
    editingAddress.value = null
    Object.assign(addressForm, {
      name: userStore.userInfo.username || '',
      phone: '',
      region: [],
      detailAddress: ''
    })
  }
  showAddressDialog.value = true
}

// 保存地址
const saveAddress = async () => {
  addressLoading.value = true
  
  try {
    // 实际项目中调用API保存地址
    // if (editingAddress.value) {
    //   await addressApi.update(editingAddress.value.id, addressForm)
// } else {
//   await addressApi.add(addressForm)
    // }
    
    // 模拟API请求延迟
    await new Promise(resolve => setTimeout(resolve, 500))
    
    if (editingAddress.value) {
      // 更新地址
      const index = addresses.value.findIndex(a => a === editingAddress.value)
      if (index !== -1) {
        addresses.value[index] = { ...addressForm }
      }
    } else {
      // 新增地址
      addresses.value.push({ ...addressForm })
    }
    
    // 保存到localStorage
    localStorage.setItem('userAddresses', JSON.stringify(addresses.value))
    
    showAddressDialog.value = false
    ElMessage.success(editingAddress.value ? '地址更新成功' : '地址添加成功')
  } catch (error) {
    console.error('保存地址失败', error)
  } finally {
    addressLoading.value = false
  }
}

// 删除地址
const deleteAddress = async (address: Address) => {
  try {
    // 实际项目中调用API删除地址
    // await addressApi.delete(address.id)
    
    const index = addresses.value.indexOf(address)
    if (index !== -1) {
      addresses.value.splice(index, 1)
      localStorage.setItem('userAddresses', JSON.stringify(addresses.value))
      ElMessage.success('地址删除成功')
    }
  } catch (error) {
    console.error('删除地址失败', error)
  }
}

// 上传头像
const handleAvatarUpload = (file: File) => {
  // 实际项目中应该上传到服务器
  const reader = new FileReader()
  reader.onload = (e) => {
    userForm.avatar = e.target?.result as string
  }
  reader.readAsDataURL(file)
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
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ stats.totalOrders }}</div>
            <div class="stat-label">总订单数</div>
          </div>
          <el-icon class="stat-icon"><Document /></el-icon>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ stats.pendingOrders }}</div>
            <div class="stat-label">待付款</div>
          </div>
          <el-icon class="stat-icon"><Clock /></el-icon>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ stats.completedOrders }}</div>
            <div class="stat-label">已完成</div>
          </div>
          <el-icon class="stat-icon"><Check /></el-icon>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ stats.cartItems }}</div>
            <div class="stat-label">购物车</div>
          </div>
          <el-icon class="stat-icon"><ShoppingCart /></el-icon>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" class="content-row">
      <!-- 个人信息卡片 -->
      <el-col :xs="24" :lg="12">
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
              <img v-if="userForm.avatar" :src="userForm.avatar" class="avatar" />
              <div v-else class="avatar-placeholder">
                <el-icon><Plus /></el-icon>
              </div>
            </el-upload>
            <div class="avatar-info">
              <h3>{{ userStore.userInfo.username }}</h3>
              <p>点击头像更换</p>
            </div>
          </div>
          
          <el-form :model="userForm" label-width="80px" class="user-form">
            <el-form-item label="用户名">
              <el-input v-model="userForm.username" placeholder="请输入用户名" />
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
      
      <!-- 收货地址管理 -->
      <el-col :xs="24" :lg="12">
        <el-card class="address-card">
          <template #header>
            <div class="card-header">
              <el-icon><Location /></el-icon>
              <span>收货地址</span>
              <el-button type="primary" size="small" @click="openAddressDialog()">
                新增地址
              </el-button>
            </div>
          </template>
          
          <div v-if="addresses.length === 0" class="empty-addresses">
            <el-empty description="暂无收货地址" />
            <el-button type="primary" @click="openAddressDialog()">添加地址</el-button>
          </div>
          
          <div v-else class="address-list">
            <div v-for="(address, index) in addresses" :key="index" class="address-item">
              <div class="address-info">
                <div class="address-name">{{ address.name }} {{ address.phone }}</div>
                <div class="address-detail">
                  {{ address.region.join('') }} {{ address.detailAddress }}
                </div>
              </div>
              <div class="address-actions">
                <el-button size="small" @click="openAddressDialog(address)">编辑</el-button>
                <el-button size="small" type="danger" @click="deleteAddress(address)">删除</el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 地址编辑对话框 -->
    <el-dialog
      v-model="showAddressDialog"
      :title="editingAddress ? '编辑地址' : '新增地址'"
      width="500px"
    >
      <el-form :model="addressForm" label-width="80px">
        <el-form-item label="收货人" required>
          <el-input v-model="addressForm.name" placeholder="请输入收货人姓名" />
        </el-form-item>
        
        <el-form-item label="手机号" required>
          <el-input v-model="addressForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        
        <el-form-item label="所在地区" required>
          <el-cascader
            v-model="addressForm.region"
            :options="cityOptions"
            placeholder="请选择所在地区"
            style="width: 100%"
          />
        </el-form-item>
        
        <el-form-item label="详细地址" required>
          <el-input
            v-model="addressForm.detailAddress"
            type="textarea"
            :rows="3"
            placeholder="请输入详细地址"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showAddressDialog = false">取消</el-button>
        <el-button type="primary" @click="saveAddress" :loading="addressLoading">
          保存
        </el-button>
      </template>
    </el-dialog>
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
      align-items: center;
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
        
        .address-name {
          font-weight: 600;
          color: #303133;
          margin-bottom: 5px;
        }
        
        .address-detail {
          color: #606266;
          font-size: 14px;
        }
      }
      
      .address-actions {
        display: flex;
        gap: 8px;
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
</style>