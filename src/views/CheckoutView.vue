<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { orderApi } from '@/services/api'
import type { OrderItem, Address } from '@/types/api'

const router = useRouter()
const cartStore = useCartStore()
const userStore = useUserStore()

// 使用选中的商品作为订单项
const orderItems = ref<OrderItem[]>([])

// 在组件挂载时获取选中的商品
onMounted(() => {
  const checkoutItemsData = localStorage.getItem('checkoutItems')
  if (checkoutItemsData) {
    try {
      orderItems.value = JSON.parse(checkoutItemsData)
    } catch (error) {
      console.error('解析结算商品数据失败', error)
      router.push('/cart')
    }
  } else {
    ElMessage.warning('没有选择要结算的商品')
    router.push('/cart')
  }
})

// 收货地址
const address = ref<Address>({
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

// 如果用户已登录，预填充用户信息
onMounted(() => {
  if (userStore.isLoggedIn) {
    // 从 localStorage 获取保存的地址信息
    const savedAddress = localStorage.getItem('userAddress')
    if (savedAddress) {
      try {
        const parsedAddress = JSON.parse(savedAddress)
        address.value = parsedAddress
      } catch (error) {
        console.error('解析地址信息失败', error)
      }
    } else {
      // 如果没有保存的地址信息，使用用户名
      address.value.name = userStore.userInfo.username
    }
  }
})

// 计算总价
const totalPrice = computed(() => {
  return orderItems.value.reduce((total, item) => total + item.price * item.quantity, 0)
})

// 表单验证
const validateForm = () => {
  if (!address.value.name || !address.value.phone || address.value.region.length === 0 || !address.value.detailAddress) {
    ElMessage.warning('请填写完整的收货地址信息')
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

  loading.value = true
  try {
    // 准备订单数据
    const orderData = {
      items: orderItems.value,
      address: address.value,
      totalAmount: totalPrice.value,
      paymentMethod: 'alipay' // 添加默认支付方式
    }
    
    // 提交订单
    const response = await orderApi.create(orderData)
    const orderId = response.id // 直接访问id，因为api返回的是Order类型，而不是包含data的响应对象
    
    // 保存地址信息到localStorage
    localStorage.setItem('userAddress', JSON.stringify(address.value))
    localStorage.setItem('lastOrderAddress', JSON.stringify(address.value))
    localStorage.setItem('lastOrderPhone', address.value.phone)
    
    ElMessage.success('订单提交成功')
    router.push(`/payment/${orderId}`)
  } catch (error) {
    console.error('订单提交失败:', error)
    ElMessage.error('订单提交失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="checkout-view">
    <!-- 收货地址 -->
    <el-card class="address-card">
      <template #header>
        <div class="card-header">
          <span>收货地址</span>
        </div>
      </template>

      <el-form :model="address" label-width="100px">
        <el-form-item label="收货人">
          <el-input v-model="address.name" placeholder="请输入收货人姓名" />
        </el-form-item>

        <el-form-item label="手机号码">
          <el-input v-model="address.phone" placeholder="请输入手机号码" />
        </el-form-item>

        <el-form-item label="所在地区">
          <el-cascader
            v-model="address.region"
            :options="cityOptions"
            placeholder="请选择所在地区"
          />
        </el-form-item>

        <el-form-item label="详细地址">
          <el-input
            v-model="address.detailAddress"
            type="textarea"
            placeholder="请输入详细地址"
          />
        </el-form-item>
      </el-form>
    </el-card>

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
            <span class="price">¥{{ row.price }}</span>
          </template>
        </el-table-column>

        <el-table-column label="数量" width="120">
          <template #default="{ row }">
            <span>{{ row.quantity }}</span>
          </template>
        </el-table-column>

        <el-table-column label="小计">
          <template #default="{ row }">
            <span class="subtotal">¥{{ row.price * row.quantity }}</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="order-footer">
        <div class="total-price">
          应付总额：<span class="price">¥{{ totalPrice }}</span>
        </div>
      </div>
    </el-card>

    <!-- 提交订单 -->
    <div class="submit-section">
      <el-button type="primary" size="large" :loading="loading" @click="submitOrder">提交订单</el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.checkout-view {
  .address-card,
  .order-card {
    margin-bottom: 20px;
  }

  .product-info {
    display: flex;
    align-items: center;
    gap: 10px;

    .product-image {
      width: 50px;
      height: 50px;
      object-fit: cover;
    }

    .product-title {
      font-size: 14px;
    }
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

    .total-price {
      font-size: 16px;

      .price {
        font-size: 20px;
      }
    }
  }

  .submit-section {
    text-align: center;
    margin-top: 30px;

    .el-button {
      min-width: 200px;
    }
  }
}
</style>