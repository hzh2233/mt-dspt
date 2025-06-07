<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Location, Edit, Plus, Ticket } from '@element-plus/icons-vue'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { orderApi, addressApi, couponApi } from '@/services/api'
import type { OrderItem, BackendAddress, UserCoupon, CouponCalculation } from '@/types/api'
import AddressSelector from '@/components/AddressSelector.vue'

const router = useRouter()
const cartStore = useCartStore()
const userStore = useUserStore()

// 使用选中的商品作为订单项
const orderItems = ref<OrderItem[]>([])
const selectedCartIds = ref<number[]>([])

// 地址相关状态
const addresses = ref<BackendAddress[]>([])
const selectedAddress = ref<BackendAddress | null>(null)
const showAddressDialog = ref(false)
const showAddAddressDialog = ref(false)
const showAddressSelector = ref(false)
const addressLoading = ref(false)
const addressSaving = ref(false)

// 新增地址表单
const newAddress = ref({
  receiver: '',
  phone: '',
  provinceCode: '',
  provinceName: '',
  cityCode: '',
  cityName: '',
  districtCode: '',
  districtName: '',
  detailAddress: '',
  isDefault: false,
  tag: '家'
})

// 地址选择器的值
const selectedRegion = ref<any>(null)
const newAddressFormRef = ref()

// 优惠券相关状态
const availableCoupons = ref<UserCoupon[]>([])
const usableCoupons = ref<UserCoupon[]>([])
const unusableCoupons = ref<UserCoupon[]>([])
const selectedCoupon = ref<UserCoupon | null>(null)
const showCouponDialog = ref(false)
const couponLoading = ref(false)
const couponCalculation = ref<CouponCalculation | null>(null)

// 重新加载地址列表
const reloadAddresses = async () => {
  try {
    addressLoading.value = true
    const addressList = await addressApi.getList()
    addresses.value = addressList
    
    // 如果当前选中的地址不在列表中，重新选择默认地址
    if (!selectedAddress.value || !addressList.find(addr => addr.id === selectedAddress.value?.id)) {
      const defaultAddress = addressList.find(addr => addr.isDefault === 1)
      selectedAddress.value = defaultAddress || (addressList.length > 0 ? addressList[0] : null)
    }
  } catch (error) {
    console.error('加载地址列表失败:', error)
    ElMessage.error('加载地址列表失败')
  } finally {
    addressLoading.value = false
  }
}

// 在组件挂载时获取选中的商品和地址
onMounted(async () => {
  try {
    addressLoading.value = true
    
    // 只获取地址列表，从中选择默认地址
    const addressList = await addressApi.getList()
    addresses.value = addressList
    
    // 从地址列表中选择默认地址，如果没有默认地址则选择第一个
    const defaultAddress = addressList.find(addr => addr.isDefault === 1)
    selectedAddress.value = defaultAddress || (addressList.length > 0 ? addressList[0] : null)
    
    // 获取选中的购物车商品ID
    const checkoutItemsData = localStorage.getItem('checkoutItems')
    if (checkoutItemsData) {
      const checkoutData = JSON.parse(checkoutItemsData)
      orderItems.value = checkoutData.items || checkoutData
      // 如果有cartIds字段，使用它；否则从orderItems中提取有效的购物车ID（排除0和无效值）
      if (checkoutData.cartIds) {
        selectedCartIds.value = checkoutData.cartIds
      } else {
        selectedCartIds.value = orderItems.value
          .map(item => item.id)
          .filter(id => id && id > 0) // 过滤掉0和无效的ID
      }
    } else {
      ElMessage.warning('没有选择要结算的商品')
      router.push('/cart')
      return
    }
    
    // 加载用户的所有优惠券
    await loadUserCoupons()
    
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    addressLoading.value = false
  }
})

// 地址选择相关方法
const selectAddress = (address: BackendAddress) => {
  selectedAddress.value = address
  showAddressSelector.value = false
}

// 打开新增地址对话框
const openAddAddressDialog = () => {
  newAddress.value = {
    receiver: userStore.userInfo.nickname || '',
    phone: userStore.userInfo.phone || '',
    provinceCode: '',
    provinceName: '',
    cityCode: '',
    cityName: '',
    districtCode: '',
    districtName: '',
    detailAddress: '',
    isDefault: false,
    tag: '家'
  }
  selectedRegion.value = null
  showAddAddressDialog.value = true
}

// 处理地址选择器变化
const handleRegionChange = (region: any) => {
  if (region) {
    newAddress.value.provinceCode = region.provinceCode
    newAddress.value.provinceName = region.provinceName
    newAddress.value.cityCode = region.cityCode
    newAddress.value.cityName = region.cityName
    newAddress.value.districtCode = region.districtCode
    newAddress.value.districtName = region.districtName
  } else {
    newAddress.value.provinceCode = ''
    newAddress.value.provinceName = ''
    newAddress.value.cityCode = ''
    newAddress.value.cityName = ''
    newAddress.value.districtCode = ''
    newAddress.value.districtName = ''
  }
}

// 保存新地址
const saveNewAddress = async () => {
  if (!newAddress.value.receiver || !newAddress.value.phone || !newAddress.value.detailAddress) {
    ElMessage.warning('请填写完整的地址信息')
    return
  }
  
  if (!newAddress.value.provinceCode || !newAddress.value.cityCode || !newAddress.value.districtCode) {
    ElMessage.warning('请选择所在地区')
    return
  }
  
  try {
    addressSaving.value = true
    
    const addressData = {
      ...newAddress.value,
      isDefault: newAddress.value.isDefault ? 1 : 0
    }
    
    const savedAddress = await addressApi.add(addressData)
    ElMessage.success('地址添加成功')
    
    // 重新加载地址列表
    await reloadAddresses()
    
    // 设置新添加的地址为选中地址 - 使用返回的地址ID进行精确匹配
    if (savedAddress && savedAddress.id) {
      // 如果API返回了完整的地址对象，直接使用
      selectedAddress.value = savedAddress
    } else {
      // 否则从重新加载的地址列表中查找
      const newAddressInList = addresses.value.find(addr => 
        addr.receiver === addressData.receiver && 
        addr.phone === addressData.phone && 
        addr.detailAddress === addressData.detailAddress &&
        addr.provinceCode === addressData.provinceCode &&
        addr.cityCode === addressData.cityCode &&
        addr.districtCode === addressData.districtCode
      )
      
      if (newAddressInList) {
        selectedAddress.value = newAddressInList
      } else {
        // 如果还是找不到，选择最后一个地址（通常是刚添加的）
        selectedAddress.value = addresses.value[addresses.value.length - 1] || null
      }
    }
    
    // 关闭对话框并重置表单
    showAddAddressDialog.value = false
    resetNewAddressForm()
  } catch (error) {
    console.error('添加地址失败:', error)
    ElMessage.error('添加地址失败')
  } finally {
    addressSaving.value = false
  }
}

// 重置新地址表单
const resetNewAddressForm = () => {
  newAddress.value = {
    receiver: '',
    phone: '',
    provinceCode: '',
    cityCode: '',
    districtCode: '',
    provinceName: '',
    cityName: '',
    districtName: '',
    detailAddress: '',
    tag: '',
    isDefault: false
  }
  selectedRegion.value = null
}

// 加载用户所有优惠券
const loadUserCoupons = async () => {
  try {
    couponLoading.value = true
    const allCoupons = await couponApi.getUserCoupons()
    
    // 只显示未使用的优惠券（状态为1）
    const validCoupons = allCoupons.filter(coupon => coupon.status === 1)
    
    // 分类优惠券：可用于当前订单的和不可用的
    const usable: UserCoupon[] = []
    const unusable: UserCoupon[] = []
    
    validCoupons.forEach(coupon => {
      if (coupon.coupon && subtotalPrice.value >= coupon.coupon.minAmount) {
        usable.push(coupon)
      } else {
        unusable.push(coupon)
      }
    })
    
    // 按优惠力度排序，优惠越大排越前
    usableCoupons.value = usable.sort((a, b) => {
      const discountA = calculateCouponDiscount(a, subtotalPrice.value)
      const discountB = calculateCouponDiscount(b, subtotalPrice.value)
      return discountB - discountA
    })
    
    unusableCoupons.value = unusable
    availableCoupons.value = [...usableCoupons.value, ...unusableCoupons.value]
    
  } catch (error) {
    console.error('加载优惠券失败:', error)
    ElMessage.error('加载优惠券失败')
  } finally {
    couponLoading.value = false
  }
}

// 加载可用优惠券（保持兼容性）
const loadAvailableCoupons = async () => {
  await loadUserCoupons()
}

// 计算优惠券优惠金额
const calculateCouponDiscount = (coupon: UserCoupon, orderAmount: number) => {
  if (!coupon.coupon || orderAmount < coupon.coupon.minAmount) {
    return 0
  }
  
  if (coupon.coupon.type === 1) {
    // 满减券
    return Math.min(coupon.coupon.value, orderAmount)
  } else if (coupon.coupon.type === 2) {
    // 折扣券
    return orderAmount * (1 - coupon.coupon.value)
  }
  
  return 0
}

// 选择优惠券
const selectCoupon = (coupon: UserCoupon | null) => {
  selectedCoupon.value = coupon
  
  if (coupon) {
    // 前端计算优惠券优惠
    const discountAmount = calculateCouponDiscount(coupon, subtotalPrice.value)
    const finalAmount = Math.max(0, subtotalPrice.value - discountAmount)
    
    couponCalculation.value = {
      applicable: true,
      discountAmount,
      finalAmount,
      couponId: coupon.id
    }
  } else {
    couponCalculation.value = null
  }
  
  showCouponDialog.value = false
}

// 打开优惠券选择对话框
const openCouponDialog = () => {
  loadAvailableCoupons()
  showCouponDialog.value = true
}

// 格式化优惠券类型
const formatCouponType = (type: number, value: number) => {
  if (type === 1) {
    return `¥${value}`
  } else if (type === 2) {
    return `${(value * 10).toFixed(1)}折`
  }
  return '未知'
}

// 格式化最低使用金额
const formatMinAmount = (minAmount: number) => {
  return minAmount > 0 ? `满¥${minAmount}可用` : '无门槛'
}

// 检查优惠券是否可用
const isCouponAvailable = (coupon: UserCoupon) => {
  return coupon.coupon && subtotalPrice.value >= coupon.coupon.minAmount
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  })
}

// 计算商品总价（不含优惠）
const subtotalPrice = computed(() => {
  const total = orderItems.value.reduce((total, item) => total + item.price * item.quantity, 0)
  return Math.round(total * 100) / 100
})

// 优惠金额
const discountAmount = computed(() => {
  if (couponCalculation.value) {
    return Math.round(couponCalculation.value.discountAmount * 100) / 100
  }
  return 0
})

// 计算最终总价（含优惠券优惠）
const totalPrice = computed(() => {
  if (couponCalculation.value) {
    return Math.round(couponCalculation.value.finalAmount * 100) / 100
  }
  return subtotalPrice.value
})

// 表单验证
const validateForm = () => {
  if (!selectedAddress.value) {
    ElMessage.warning('请选择收货地址')
    return false
  }
  
  if (orderItems.value.length === 0) {
    ElMessage.warning('没有选择要结算的商品')
    router.push('/cart')
    return false
  }
  
  return true
}

// 加载状态
const loading = ref(false)

// 提交订单
const submitOrder = async () => {
  if (!validateForm()) {
    return
  }

  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再提交订单')
    router.push('/login')
    return
  }

  loading.value = true
  try {
    // 构建订单数据 - 使用正确的productId字段
    const orderData = {
      addressId: selectedAddress.value!.id,
      couponId: selectedCoupon.value?.id || null,
      items: orderItems.value.map(item => ({
        productId: item.productId || item.id, // 优先使用productId，兼容旧数据
        quantity: item.quantity
      })),
      actualPayAmount: Math.round(totalPrice.value * 100) / 100
    }
    
    // 提交订单
    const response = await orderApi.create(orderData)
    
    ElMessage.success('订单创建成功')
    
    // 订单提交成功后，从购物车中移除已结算的商品
    // 只有当存在有效的购物车ID时才执行删除操作
    try {
      const validCartIds = selectedCartIds.value.filter(id => id && id > 0)
      if (validCartIds.length > 0) {
        await cartStore.removeBatchItems(validCartIds)
      }
    } catch (error) {
      console.error('移除购物车商品失败:', error)
      // 即使移除失败也不影响订单流程，只记录错误
    }
    
    // 清除本地的结算商品缓存
    localStorage.removeItem('checkoutItems')
    // 跳转到支付页面，订单号已经是字符串格式
    router.push(`/payment/${response.orderId}`)
  } catch (error) {
    console.error('订单提交失败:', error)
    ElMessage.error('订单创建失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="checkout-view">
    <div class="checkout-container">
      <!-- 收货地址 -->
      <el-card class="address-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <div class="header-left">
              <el-icon class="header-icon"><Location /></el-icon>
              <span class="header-title">收货地址</span>
            </div>
            <el-button 
              type="primary" 
              size="small" 
              :icon="Plus" 
              @click="openAddAddressDialog"
            >
              新增地址
            </el-button>
          </div>
        </template>

        <div v-if="addressLoading" class="address-loading">
          <el-skeleton :rows="2" animated />
        </div>
        
        <div v-else-if="!selectedAddress && addresses.length === 0" class="no-address">
          <el-empty description="暂无收货地址" />
          <el-button type="primary" @click="openAddAddressDialog">添加地址</el-button>
        </div>
        
        <div v-else class="address-content">
          <!-- 当前选中的地址 -->
          <div v-if="selectedAddress" class="selected-address">
            <div class="address-info">
              <div class="address-header">
                <span class="receiver-name">{{ selectedAddress.receiver }}</span>
                <span class="receiver-phone">{{ selectedAddress.phone }}</span>
                <el-tag v-if="selectedAddress.isDefault === 1" type="success" size="small">默认</el-tag>
                <el-tag type="info" size="small">{{ selectedAddress.tag }}</el-tag>
              </div>
              <div class="address-detail">
                {{ selectedAddress.provinceName }}{{ selectedAddress.cityName }}{{ selectedAddress.districtName }} {{ selectedAddress.detailAddress }}
              </div>
            </div>
            <el-button 
              v-if="addresses.length > 1" 
              link 
              :icon="Edit" 
              @click="showAddressSelector = true"
            >
              更换地址
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- 地址选择器 -->
      <el-dialog 
        v-model="showAddressSelector" 
        title="选择收货地址" 
        width="600px"
      >
        <div class="address-list">
          <div 
            v-for="address in addresses" 
            :key="address.id" 
            class="address-item"
            :class="{ active: selectedAddress?.id === address.id }"
            @click="selectAddress(address)"
          >
            <div class="address-info">
              <div class="address-header">
                <span class="receiver-name">{{ address.receiver }}</span>
                <span class="receiver-phone">{{ address.phone }}</span>
                <el-tag v-if="address.isDefault === 1" type="success" size="small">默认</el-tag>
                <el-tag type="info" size="small">{{ address.tag }}</el-tag>
              </div>
              <div class="address-detail">
                {{ address.provinceName }}{{ address.cityName }}{{ address.districtName }} {{ address.detailAddress }}
              </div>
            </div>
            <el-radio :model-value="selectedAddress?.id === address.id" />
          </div>
        </div>
      </el-dialog>

      <!-- 新增地址对话框 -->
      <el-dialog 
        v-model="showAddAddressDialog" 
        title="新增收货地址" 
        width="600px"
        :before-close="() => showAddAddressDialog = false"
      >
        <el-form :model="newAddress" label-width="100px" ref="newAddressFormRef">
          <el-form-item label="收货人" required>
            <el-input v-model="newAddress.receiver" placeholder="请输入收货人姓名" />
          </el-form-item>
          <el-form-item label="手机号码" required>
            <el-input v-model="newAddress.phone" placeholder="请输入手机号码" />
          </el-form-item>
          <el-form-item label="所在地区" required>
            <AddressSelector
              v-model="selectedRegion"
              @change="handleRegionChange"
            />
          </el-form-item>
          <el-form-item label="详细地址" required>
            <el-input
              v-model="newAddress.detailAddress"
              type="textarea"
              :rows="3"
              placeholder="请输入详细地址"
            />
          </el-form-item>
          <el-form-item label="地址标签">
            <el-select v-model="newAddress.tag" placeholder="请选择地址标签" style="width: 100%">
              <el-option label="家" value="家" />
              <el-option label="公司" value="公司" />
              <el-option label="学校" value="学校" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-checkbox v-model="newAddress.isDefault">设为默认地址</el-checkbox>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showAddAddressDialog = false">取消</el-button>
          <el-button type="primary" @click="saveNewAddress" :loading="addressSaving">保存</el-button>
        </template>
      </el-dialog>
      
      <!-- 优惠券选择对话框 -->
      <el-dialog 
        v-model="showCouponDialog" 
        title="选择优惠券" 
        width="600px"
        class="coupon-dialog"
      >
        <div v-loading="couponLoading" class="coupon-list">
          <!-- 不使用优惠券选项 -->
          <div 
            class="coupon-item no-coupon-item"
            :class="{ active: !selectedCoupon }"
            @click="selectCoupon(null)"
          >
            <div class="coupon-content">
              <div class="coupon-title">不使用优惠券</div>
            </div>
            <el-radio :model-value="!selectedCoupon" />
          </div>
          
          <!-- 优惠券列表 -->
          <div 
            v-for="coupon in availableCoupons" 
            :key="coupon.id" 
            class="coupon-item"
            :class="{ 
              active: selectedCoupon?.id === coupon.id,
              disabled: !isCouponAvailable(coupon)
            }"
            @click="isCouponAvailable(coupon) && selectCoupon(coupon)"
          >
            <div class="coupon-content">
              <div class="coupon-header">
                <div class="coupon-value">{{ formatCouponType(coupon.coupon?.type || 1, coupon.coupon?.value || 0) }}</div>
                <div class="coupon-discount" v-if="isCouponAvailable(coupon)">
                  可省 ¥{{ calculateCouponDiscount(coupon, subtotalPrice).toFixed(2) }}
                </div>
              </div>
              <div class="coupon-title">{{ coupon.coupon?.title || '优惠券' }}</div>
              <div class="coupon-condition">{{ formatMinAmount(coupon.coupon?.minAmount || 0) }}</div>
              <div class="coupon-expire">有效期至 {{ formatDate(coupon.expireTime) }}</div>
            </div>
            <el-radio 
              :model-value="selectedCoupon?.id === coupon.id" 
              :disabled="!isCouponAvailable(coupon)"
            />
          </div>
          
          <div v-if="availableCoupons.length === 0 && !couponLoading" class="empty-coupons">
            <el-empty description="暂无可用优惠券" />
          </div>
        </div>
      </el-dialog>

      <!-- 订单商品 -->
      <el-card class="order-card">
        <template #header>
          <div class="card-header">
            <span>订单商品</span>
          </div>
        </template>

        <el-table :data="orderItems" style="width: 100%">
          <el-table-column label="商品信息" width="400">
            <template #default="{ row }">
              <div class="product-info">
                <img :src="row.image" class="product-image" />
                <span class="product-title">{{ row.title }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="单价" width="120">
            <template #default="{ row }">
              <span class="price">¥{{ row.price.toFixed(2) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="数量" width="120">
            <template #default="{ row }">
              <span>{{ row.quantity }}</span>
            </template>
          </el-table-column>

          <el-table-column label="小计">
            <template #default="{ row }">
              <span class="subtotal">¥{{ (row.price * row.quantity).toFixed(2) }}</span>
            </template>
          </el-table-column>
        </el-table>

      </el-card>
      
      <!-- 优惠券选择 -->
      <el-card class="coupon-card">
        <template #header>
          <div class="card-header">
            <div class="header-left">
              <el-icon class="header-icon"><Ticket /></el-icon>
              <span class="header-title">优惠券</span>
            </div>
          </div>
        </template>
        
        <div class="coupon-section">
          <div class="coupon-selector" @click="openCouponDialog">
            <div class="coupon-info">
              <div v-if="selectedCoupon" class="selected-coupon">
                <div class="coupon-value">{{ formatCouponType(selectedCoupon.coupon?.type || 1, selectedCoupon.coupon?.value || 0) }}</div>
                <div class="coupon-title">{{ selectedCoupon.coupon?.title || '优惠券' }}</div>
                <div class="coupon-desc">{{ formatMinAmount(selectedCoupon.coupon?.minAmount || 0) }}</div>
              </div>
              <div v-else class="no-coupon">
                <span>选择优惠券</span>
              </div>
            </div>
            <div class="coupon-arrow">
              <el-icon>></el-icon>
            </div>
          </div>
        </div>
      </el-card>
      
      <!-- 价格汇总 -->
      <el-card class="summary-card">
        <div class="price-summary">
          <div class="price-item">
            <span>商品总价</span>
            <span>¥{{ subtotalPrice.toFixed(2) }}</span>
          </div>
          <div v-if="selectedCoupon" class="price-item discount">
            <span>优惠券优惠</span>
            <span>-¥{{ discountAmount.toFixed(2) }}</span>
          </div>
          <div class="price-item total">
            <span>应付总额</span>
            <span class="total-amount">¥{{ totalPrice.toFixed(2) }}</span>
          </div>
        </div>
      </el-card>

      <!-- 提交订单 -->
      <div class="submit-section">
        <el-button type="primary" size="large" :loading="loading" @click="submitOrder">提交订单</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.checkout-view {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 80px;
}

.checkout-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.address-card,
.order-card,
.coupon-card,
.summary-card {
  margin-bottom: 20px;
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 18px;
  color: #409eff;
}

.header-title {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

/* 地址相关样式 */
.address-loading {
  padding: 20px;
}

.no-address {
  text-align: center;
  padding: 40px 20px;
}

.selected-address {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px solid #409eff;
}

.address-info {
  flex: 1;
}

.address-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.receiver-name {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

.receiver-phone {
  color: #606266;
  font-size: 14px;
}

.address-detail {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}

/* 地址选择器样式 */
.address-list {
  max-height: 400px;
  overflow-y: auto;
}

.address-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.address-item:hover {
  border-color: #409eff;
  background: #f0f9ff;
}

.address-item.active {
  border-color: #409eff;
  background: #f0f9ff;
}

.product-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.product-image {
  width: 50px;
  height: 50px;
  object-fit: cover;
}

.product-title {
  font-size: 14px;
}

.price,
.subtotal {
  color: #f56c6c;
  font-weight: bold;
}

.order-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.total-price {
  font-size: 16px;
}

.total-price .price {
  font-size: 20px;
}

.submit-section {
  text-align: center;
  margin-top: 30px;
}

.submit-section .el-button {
  width: 200px;
  height: 50px;
  font-size: 16px;
  font-weight: 600;
}

/* 优惠券相关样式 */
.coupon-section {
  padding: 0;
}

.coupon-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.coupon-selector:hover {
  background: #e9ecef;
  border-color: #409eff;
}

.coupon-info {
  flex: 1;
}

.selected-coupon {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.coupon-value {
  font-size: 18px;
  font-weight: 600;
  color: #ff6b6b;
}

.coupon-title {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.coupon-desc {
  font-size: 12px;
  color: #909399;
}

.no-coupon {
  color: #909399;
  font-size: 14px;
}

.coupon-arrow {
  color: #c0c4cc;
  font-size: 16px;
}

/* 价格汇总样式 */
.price-summary {
  padding: 0;
}

.price-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.price-item:last-child {
  border-bottom: none;
}

.price-item.discount {
  color: #ff6b6b;
}

.price-item.total {
  font-size: 16px;
  font-weight: 600;
  padding-top: 16px;
  border-top: 2px solid #f0f0f0;
}

.total-amount {
  font-size: 20px;
  color: #ff6b6b;
  font-weight: 700;
}

/* 优惠券对话框样式 */
.coupon-dialog .coupon-list {
  max-height: 400px;
  overflow-y: auto;
}

.coupon-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 2px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.coupon-item:hover {
  border-color: #409eff;
}

.coupon-item.active {
  border-color: #409eff;
  background: #f0f9ff;
}

.coupon-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f8f9fa;
}

.coupon-item.disabled:hover {
  border-color: #f0f0f0;
}

.no-coupon-item {
  border-style: dashed;
}

.coupon-content {
  flex: 1;
}

.coupon-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.coupon-discount {
  background: linear-gradient(135deg, #ff6b6b, #feca57);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.coupon-condition {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.coupon-expire {
  font-size: 12px;
  color: #909399;
}

.empty-coupons {
  text-align: center;
  padding: 40px 20px;
}
</style>