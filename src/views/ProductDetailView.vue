<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useCartStore } from '@/stores/cart'
import { productApi } from '@/services/api'
import type { Product } from '@/types/api'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()

// 商品详情数据
const product = ref<Product | null>(null)
const loading = ref(false)

// 获取商品详情
const fetchProductDetail = async (productId: number) => {
  loading.value = true
  try {
    const response = await productApi.getDetail(productId)
    product.value = response // 直接赋值，因为api返回的是Product类型
  } catch (error) {
    console.error('获取商品详情失败:', error)
    ElMessage.error('获取商品详情失败')
    router.push('/')
  } finally {
    loading.value = false
  }
}

// 页面挂载时获取商品详情
onMounted(() => {
  const productId = parseInt(route.params.id as string)
  if (productId) {
    fetchProductDetail(productId)
  } else {
    ElMessage.error('商品ID无效')
    router.push('/')
  }
})

// 购买数量
const quantity = ref(1)

// 加入购物车
const addToCart = () => {
  if (!product.value) return
  
  const cartItem = {
    id: product.value.id,
    title: product.value.title,
    price: product.value.price,
    image: product.value.image,
    quantity: quantity.value
  }
  
  cartStore.addItem(cartItem)
  ElMessage.success('成功加入购物车')
}

// 立即购买
const buyNow = () => {
  if (!product.value) return
  
  // 先加入购物车
  addToCart()
  // 保存当前商品到localStorage作为结算商品
  const checkoutItem = {
    id: product.value.id,
    title: product.value.title,
    price: product.value.price,
    image: product.value.image,
    quantity: quantity.value
  }
  localStorage.setItem('checkoutItems', JSON.stringify([checkoutItem]))
  // 然后跳转到结算页面
  router.push('/checkout')
}

// 在适当的生命周期钩子或事件处理函数中调用fetchProductData

</script>

<template>
  <div class="product-detail" v-loading="loading">
    <el-card class="detail-card" v-if="product">
      <el-row :gutter="40">
        <!-- 商品图片 -->
        <el-col :span="12">
          <div class="product-image">
            <img :src="product.image" :alt="product.title" />
          </div>
        </el-col>

        <!-- 商品信息 -->
        <el-col :span="12">
          <div class="product-info">
            <h1 class="title">{{ product.title }}</h1>
            <p class="description">{{ product.description }}</p>
            <div class="price-section">
              <span class="label">价格</span>
              <span class="price">¥{{ product.price }}</span>
            </div>
            <div class="stock-section">
              <span class="label">库存</span>
              <span class="stock">{{ product.stock || 999 }}件</span>
            </div>
            <div class="quantity-section">
              <span class="label">数量</span>
              <el-input-number v-model="quantity" :min="1" :max="product.stock || 999" />
            </div>
            <div class="action-section">
              <el-button type="primary" size="large" @click="addToCart">加入购物车</el-button>
              <el-button type="danger" size="large" @click="buyNow">立即购买</el-button>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>
    
    <el-empty v-else-if="!loading && !product" description="商品不存在" /> // 添加 !product 条件

    <!-- 商品规格 -->
    <el-card class="specs-card" v-if="product && product.specs && product.specs.length > 0"> // 添加 product 存在和 specs 存在的条件
      <template #header>
        <div class="card-header">
          <span>商品规格</span>
        </div>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item
          v-for="spec in product.specs"
          :key="spec.name"
          :label="spec.name"
        >
          {{ spec.value }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.product-detail {
  .detail-card {
    margin-bottom: 20px;
  }

  .product-image {
    width: 100%;
    height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f5f7fa;

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  }

  .product-info {
    .title {
      margin: 0 0 20px;
      font-size: 24px;
      color: #333;
    }

    .description {
      margin: 0 0 20px;
      font-size: 14px;
      color: #666;
      line-height: 1.6;
    }

    .price-section,
    .stock-section,
    .quantity-section {
      margin-bottom: 20px;
      display: flex;
      align-items: center;

      .label {
        width: 60px;
        color: #999;
      }
    }

    .price {
      font-size: 24px;
      color: #f56c6c;
      font-weight: bold;
    }

    .stock {
      color: #67c23a;
    }

    .action-section {
      margin-top: 30px;
      display: flex;
      gap: 20px;
    }
  }
}
</style>