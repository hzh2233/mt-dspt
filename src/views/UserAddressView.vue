<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Location, Edit, Delete, Plus, Check, ArrowLeft } from '@element-plus/icons-vue'
import { addressApi } from '@/services/api'
import type { BackendAddress, AddressRequest } from '@/types/api'
import AddressSelector from '@/components/AddressSelector.vue'
import { useRouter } from 'vue-router'
import regionsData from '@/data/regions.json'

const router = useRouter()

// 地址列表
const addresses = ref<BackendAddress[]>([])
const showAddressDialog = ref(false)
const editingAddress = ref<BackendAddress | null>(null)
const addressFormRef = ref()

// 新增/编辑地址表单
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

// 地址选择器的值
const selectedRegion = ref<{
  provinceCode: string
  provinceName: string
  cityCode: string
  cityName: string
  districtCode: string
  districtName: string
} | null>(null)

// 地址标签选项
const addressTags = [
  { label: '家', value: '家' },
  { label: '公司', value: '公司' },
  { label: '学校', value: '学校' }
]

// 加载状态
const addressLoading = ref(false)
const addressSaving = ref(false)

// 在组件挂载时获取数据
onMounted(async () => {
  await loadAddresses()
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

// 打开地址对话框
const openAddressDialog = (address?: BackendAddress) => {
  editingAddress.value = address || null
  
  if (address) {
    // 编辑模式
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
      tag: address.tag,
      region: `${address.provinceCode}-${address.cityCode}-${address.districtCode}`
    })
    
    selectedRegion.value = {
      provinceCode: address.provinceCode,
      provinceName: address.provinceName,
      cityCode: address.cityCode,
      cityName: address.cityName,
      districtCode: address.districtCode,
      districtName: address.districtName
    }
  } else {
    // 新增模式
    Object.assign(addressForm, {
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
    selectedRegion.value = null
  }
  
  showAddressDialog.value = true
}

// 处理地址选择器变化
const handleAddressChange = (region: any) => {
  if (region && region.length === 3) {
    const [province, city, district] = region
    selectedRegion.value = {
      provinceCode: province.code,
      provinceName: province.name,
      cityCode: city.code,
      cityName: city.name,
      districtCode: district.code,
      districtName: district.name
    }
    
    Object.assign(addressForm, {
      provinceCode: province.code,
      provinceName: province.name,
      cityCode: city.code,
      cityName: city.name,
      districtCode: district.code,
      districtName: district.name,
      region: `${province.code}-${city.code}-${district.code}`
    })
  } else {
    selectedRegion.value = null
    Object.assign(addressForm, {
      provinceCode: '',
      provinceName: '',
      cityCode: '',
      cityName: '',
      districtCode: '',
      districtName: '',
      region: ''
    })
  }
}

// 保存地址
const saveAddress = async () => {
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

  addressSaving.value = true
  
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
      const updateData = {
        ...addressData,
        id: editingAddress.value.id
      }
      await addressApi.update(editingAddress.value.id, updateData)
      ElMessage.success('地址更新成功')
    } else {
      await addressApi.add(addressData)
      ElMessage.success('地址添加成功')
    }
    
    await loadAddresses()
    showAddressDialog.value = false
  } catch (error) {
    console.error('保存地址失败', error)
    ElMessage.error('保存地址失败')
  } finally {
    addressSaving.value = false
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
    await loadAddresses()
  } catch (error) {
    console.error('设置默认地址失败', error)
    ElMessage.error('设置默认地址失败')
  }
}

// 返回个人中心
const goBack = () => {
  router.push('/profile')
}

// 表单验证规则
const addressRules = {
  receiver: [
    { required: true, message: '请输入收货人姓名', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  region: [
    { required: true, message: '请选择所在地区', trigger: 'change' }
  ],
  detailAddress: [
    { required: true, message: '请输入详细地址', trigger: 'blur' }
  ]
}
</script>

<template>
  <div class="address-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <el-button 
            type="text" 
            :icon="ArrowLeft" 
            @click="goBack"
            class="back-btn"
          >
            返回
          </el-button>
          <div class="header-info">
            <div class="header-icon">
              <el-icon><Location /></el-icon>
            </div>
            <div class="header-text">
              <h1>收货地址管理</h1>
              <p>管理您的收货地址信息</p>
            </div>
          </div>
        </div>
        <el-button 
          type="primary" 
          :icon="Plus" 
          @click="openAddressDialog()"
          class="add-btn"
        >
          新增地址
        </el-button>
      </div>
    </div>

    <!-- 地址列表 -->
    <div class="address-container">
      <div v-loading="addressLoading" class="address-content">
        <div v-if="addresses.length === 0" class="empty-state">
          <el-empty description="暂无收货地址">
            <el-button type="primary" @click="openAddressDialog()">添加第一个地址</el-button>
          </el-empty>
        </div>
        
        <div v-else class="address-grid">
          <div 
            v-for="address in addresses" 
            :key="address.id" 
            class="address-card"
            :class="{ 'is-default': address.isDefault === 1 }"
          >
            <!-- 默认标识 -->
            <div v-if="address.isDefault === 1" class="default-badge">
              <el-icon><Check /></el-icon>
              <span>默认</span>
            </div>
            
            <!-- 地址信息 -->
            <div class="address-info">
              <div class="address-header">
                <div class="receiver-info">
                  <span class="receiver-name">{{ address.receiver }}</span>
                  <span class="receiver-phone">{{ address.phone }}</span>
                </div>
                <el-tag 
                  :type="address.isDefault === 1 ? 'success' : 'info'" 
                  size="small"
                  class="address-tag"
                >
                  {{ address.tag }}
                </el-tag>
              </div>
              
              <div class="address-detail">
                <el-icon><Location /></el-icon>
                <span>{{ address.provinceName }}{{ address.cityName }}{{ address.districtName }} {{ address.detailAddress }}</span>
              </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="address-actions">
              <el-button 
                type="text" 
                :icon="Edit" 
                @click="openAddressDialog(address)"
                class="action-btn edit-btn"
              >
                编辑
              </el-button>
              
              <el-button 
                v-if="address.isDefault !== 1"
                type="text" 
                @click="setDefaultAddress(address)"
                class="action-btn default-btn"
              >
                设为默认
              </el-button>
              
              <el-button 
                type="text" 
                :icon="Delete" 
                @click="deleteAddress(address)"
                class="action-btn delete-btn"
              >
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增/编辑地址对话框 -->
    <el-dialog 
      v-model="showAddressDialog" 
      :title="editingAddress ? '编辑地址' : '新增地址'" 
      width="600px"
      class="address-dialog"
    >
      <el-form 
        :model="addressForm" 
        :rules="addressRules"
        label-width="100px" 
        ref="addressFormRef"
        class="address-form"
      >
        <el-form-item label="收货人" prop="receiver">
          <el-input 
            v-model="addressForm.receiver" 
            placeholder="请输入收货人姓名" 
            maxlength="20"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="手机号码" prop="phone">
          <el-input 
            v-model="addressForm.phone" 
            placeholder="请输入手机号码" 
            maxlength="11"
          />
        </el-form-item>
        
        <el-form-item label="所在地区" prop="region">
          <AddressSelector 
            v-model="selectedRegion" 
            @change="handleAddressChange"
            placeholder="请选择省市区"
            style="width: 100%"
          />
        </el-form-item>
        
        <el-form-item label="详细地址" prop="detailAddress">
          <el-input
            v-model="addressForm.detailAddress"
            type="textarea"
            :rows="3"
            placeholder="请输入详细地址，如街道、门牌号等"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="地址标签">
          <el-select v-model="addressForm.tag" placeholder="请选择地址标签">
            <el-option 
              v-for="tag in addressTags" 
              :key="tag.value" 
              :label="tag.label" 
              :value="tag.value"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item>
          <el-checkbox v-model="addressForm.isDefault" :true-label="1" :false-label="0">
            设为默认地址
          </el-checkbox>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showAddressDialog = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="saveAddress" 
            :loading="addressSaving"
          >
            {{ editingAddress ? '更新' : '保存' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.address-view {
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
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.back-btn {
  font-size: 16px;
  color: #666;
  padding: 8px;
}

.back-btn:hover {
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
}

.header-info {
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
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
}

.header-icon .el-icon {
  font-size: 28px;
  color: white;
}

.header-text h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-text p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.add-btn {
  padding: 12px 24px;
  font-size: 16px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.address-container {
  max-width: 1200px;
  margin: 0 auto;
}

.address-content {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  min-height: 400px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.address-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.address-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.address-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #e9ecef, #dee2e6);
}

.address-card.is-default::before {
  background: linear-gradient(90deg, #28a745, #20c997);
}

.address-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.default-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.address-info {
  margin-bottom: 20px;
}

.address-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.receiver-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.receiver-name {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.receiver-phone {
  font-size: 14px;
  color: #7f8c8d;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 8px;
}

.address-tag {
  font-weight: 500;
}

.address-detail {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #5a6c7d;
  line-height: 1.6;
}

.address-detail .el-icon {
  margin-top: 2px;
  color: #95a5a6;
}

.address-actions {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #f1f3f4;
}

.action-btn {
  flex: 1;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.edit-btn {
  color: #409eff;
}

.edit-btn:hover {
  background: rgba(64, 158, 255, 0.1);
}

.default-btn {
  color: #67c23a;
}

.default-btn:hover {
  background: rgba(103, 194, 58, 0.1);
}

.delete-btn {
  color: #f56c6c;
}

.delete-btn:hover {
  background: rgba(245, 108, 108, 0.1);
}

/* 对话框样式 */
.address-dialog {
  --el-dialog-border-radius: 16px;
}

.address-form {
  padding: 20px 0;
}

.address-form .el-form-item {
  margin-bottom: 24px;
}

.address-form .el-input,
.address-form .el-textarea,
.address-form .el-select {
  border-radius: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #f1f3f4;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .address-view {
    padding: 10px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 20px;
    padding: 20px;
  }
  
  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .header-info {
    gap: 16px;
  }
  
  .header-icon {
    width: 50px;
    height: 50px;
  }
  
  .header-icon .el-icon {
    font-size: 24px;
  }
  
  .header-text h1 {
    font-size: 24px;
  }
  
  .address-grid {
    grid-template-columns: 1fr;
  }
  
  .address-card {
    padding: 20px;
  }
  
  .receiver-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .address-actions {
    flex-direction: column;
  }
}
</style>