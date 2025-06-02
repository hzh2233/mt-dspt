<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Box, Goods, ShoppingCart, Money, Document, InfoFilled, Setting, Star, StarFilled } from '@element-plus/icons-vue'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { productApi, goodTypeApi, favoriteApi } from '@/services/api'
import type { Product, GoodType } from '@/types/api'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()
const userStore = useUserStore()

// 商品详情数据
const product = ref<Product | null>(null)
const loading = ref(false)

// 收藏相关状态
const isFavorite = ref(false)
const favoriteLoading = ref(false)

// 分类数据
const categories = ref<GoodType[]>([])

// 获取分类列表
const fetchCategories = async () => {
  try {
    const response = await goodTypeApi.getList()
    categories.value = response
  } catch (error) {
    console.error('获取分类列表失败:', error)
  }
}

// 根据分类ID获取分类名称
const getCategoryName = (categoryId: number | undefined): string => {
  if (!categoryId) return '未分类'
  const category = categories.value.find(cat => cat.categoryId === categoryId)
  return category ? category.categoryName : `分类ID: ${categoryId}`
}

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

// 检查商品是否已收藏
const checkFavoriteStatus = async (productId: number) => {
  if (!userStore.isLoggedIn) {
    isFavorite.value = false
    return
  }
  
  try {
    const response = await favoriteApi.checkFavorite(productId)
    isFavorite.value = response.isFavorite
  } catch (error) {
    console.error('检查收藏状态失败:', error)
    isFavorite.value = false
  }
}

// 切换收藏状态
const toggleFavorite = async () => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再收藏')
    router.push('/login')
    return
  }
  
  if (!product.value) return
  
  favoriteLoading.value = true
  try {
    if (isFavorite.value) {
      await favoriteApi.removeFavorite(product.value.id)
      isFavorite.value = false
      ElMessage.success('已取消收藏')
    } else {
      await favoriteApi.addFavorite(product.value.id)
      isFavorite.value = true
      ElMessage.success('收藏成功')
    }
  } catch (error) {
    console.error('收藏操作失败:', error)
    ElMessage.error('收藏操作失败，请重试')
  } finally {
    favoriteLoading.value = false
  }
}

// 页面挂载时获取商品详情和分类列表
onMounted(async () => {
  const productId = parseInt(route.params.id as string)
  if (productId) {
    // 并行获取商品详情、分类列表和收藏状态
    await Promise.all([
      fetchProductDetail(productId),
      fetchCategories(),
      checkFavoriteStatus(productId)
    ])
  } else {
    ElMessage.error('商品ID无效')
    router.push('/')
  }
})

// 购买数量
const quantity = ref(1)

// 加入购物车
const addToCart = async () => {
  if (!product.value) return
  
  // 确保购物车已初始化
  if (userStore.isLoggedIn && cartStore.items.length === 0 && !cartStore.loading) {
    await cartStore.initCart()
  }
  
  const cartItem = {
    id: 0, // 新添加的商品暂时设为0，后端会分配真实的cartId
    productId: product.value.id,
    title: product.value.title,
    price: product.value.price,
    image: product.value.image,
    quantity: quantity.value
  }
  
  try {
    await cartStore.addItem(cartItem)
    ElMessage.success('成功加入购物车')
  } catch (error) {
    console.error('添加到购物车失败:', error)
    ElMessage.error('添加到购物车失败，请重试')
  }
}

// 立即购买
const buyNow = async () => {
  if (!product.value) return
  
  // 检查用户是否登录
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再购买')
    router.push('/login')
    return
  }
  
  // 保存当前商品到localStorage作为结算商品
  const checkoutItem = {
    id: 0, // 立即购买时没有购物车ID
    productId: product.value.id, // 商品ID
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
    <!-- 主要商品信息卡片 -->
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
            <div class="product-header">
              <h1 class="title">{{ product.title }}</h1>
              <el-tag v-if="(product.stock || 0) > 0" type="success" size="large">现货</el-tag>
              <el-tag v-else type="danger" size="large">缺货</el-tag>
            </div>
            
            <div class="price-highlight">
              <div class="current-price">
                <span class="currency">¥</span>
                <span class="amount">{{ product.price }}</span>
              </div>
            </div>

            <div class="product-meta">
              <div class="meta-item">
                <el-icon><Box /></el-icon>
                <span class="meta-label">库存：</span>
                <span class="meta-value" :class="{ 'low-stock': (product.stock || 0) < 10 }">
                  {{ product.stock || 0 }}件
                </span>
              </div>
              <div class="meta-item">
                <el-icon><Goods /></el-icon>
                <span class="meta-label">商品ID：</span>
                <span class="meta-value">#{{ product.id }}</span>
              </div>
            </div>

            <div class="quantity-section">
              <span class="section-label">购买数量</span>
              <el-input-number 
                v-model="quantity" 
                :min="1" 
                :max="product.stock || 999" 
                :disabled="product.stock === 0"
                size="large"
              />
            </div>

            <div class="action-section">
              <el-button 
                :type="isFavorite ? 'warning' : 'default'"
                size="large"
                @click="toggleFavorite"
                :loading="favoriteLoading"
                class="favorite-btn"
              >
                <el-icon>
                  <StarFilled v-if="isFavorite" />
                  <Star v-else />
                </el-icon>
                {{ isFavorite ? '已收藏' : '收藏' }}
              </el-button>
              <el-button 
                type="primary" 
                size="large" 
                :disabled="(product.stock || 0) === 0"
                @click="addToCart"
                class="cart-btn"
              >
                <el-icon><ShoppingCart /></el-icon>
                加入购物车
              </el-button>
              <el-button 
                type="danger" 
                size="large" 
                :disabled="(product.stock || 0) === 0"
                @click="buyNow"
                class="buy-btn"
              >
                <el-icon><Money /></el-icon>
                立即购买
              </el-button>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 商品详细描述卡片 -->
    <el-card class="description-card" v-if="product">
      <template #header>
        <div class="card-header">
          <el-icon><Document /></el-icon>
          <span>商品详情</span>
        </div>
      </template>
      <div class="description-content">
        <p v-if="product.description" class="description-text">
          {{ product.description }}
        </p>
        <p v-else class="no-description">
          暂无详细描述
        </p>
      </div>
    </el-card>

    <!-- 商品信息表格 -->
    <el-card class="info-card" v-if="product">
      <template #header>
        <div class="card-header">
          <el-icon><InfoFilled /></el-icon>
          <span>商品信息</span>
        </div>
      </template>
      <el-descriptions :column="2" border size="large">
        <el-descriptions-item label="商品名称">
          <span class="info-value">{{ product.title }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="商品编号">
          <span class="info-value">#{{ product.id }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="销售价格">
          <span class="price-value">¥{{ product.price }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="库存数量">
          <span class="stock-value" :class="{ 'low-stock': (product.stock || 0) < 10 }">
            {{ product.stock || 0 }}件
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="商品分类">
          <span class="info-value">{{ getCategoryName(product.category) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="商品状态">
          <el-tag v-if="(product.stock || 0) > 0" type="success">有库存</el-tag>
          <el-tag v-else type="danger">缺货</el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 商品规格 -->
    <el-card class="specs-card" v-if="product && product.specs && product.specs.length > 0">
      <template #header>
        <div class="card-header">
          <el-icon><Setting /></el-icon>
          <span>商品规格</span>
        </div>
      </template>
      <el-descriptions :column="2" border size="large">
        <el-descriptions-item
          v-for="spec in product.specs"
          :key="spec.name"
          :label="spec.name"
        >
          <span class="spec-value">{{ spec.value }}</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
    
    <el-empty v-else-if="!loading && !product" description="商品不存在" />
  </div>
</template>

<style scoped lang="scss">
.product-detail {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;

  .detail-card,
  .description-card,
  .info-card,
  .specs-card {
    margin-bottom: 24px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transition: box-shadow 0.3s ease;

    &:hover {
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    }
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 18px;
    font-weight: 600;
    color: #303133;

    .el-icon {
      color: #409eff;
    }
  }

  .product-image {
    width: 100%;
    height: 450px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    border-radius: 12px;
    overflow: hidden;

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 8px;
      transition: transform 0.3s ease;

      &:hover {
        transform: scale(1.05);
      }
    }
  }

  .product-info {
    .product-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;

      .title {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
        color: #303133;
        line-height: 1.3;
      }
    }

    .price-highlight {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 24px;

      .current-price {
        display: flex;
        align-items: baseline;
        color: white;

        .currency {
          font-size: 20px;
          font-weight: 500;
          margin-right: 4px;
        }

        .amount {
          font-size: 36px;
          font-weight: 700;
        }
      }
    }

    .product-meta {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
      padding: 16px;
      background-color: #f8f9fa;
      border-radius: 8px;

      .meta-item {
        display: flex;
        align-items: center;
        gap: 8px;

        .el-icon {
          color: #409eff;
          font-size: 16px;
        }

        .meta-label {
          font-weight: 500;
          color: #606266;
        }

        .meta-value {
          font-weight: 600;
          color: #303133;

          &.low-stock {
            color: #f56c6c;
          }
        }
      }
    }

    .quantity-section {
      margin-bottom: 24px;

      .section-label {
        display: block;
        margin-bottom: 12px;
        font-weight: 600;
        color: #303133;
        font-size: 16px;
      }
    }

    .action-section {
      display: flex;
      gap: 12px;

      .favorite-btn {
        height: 50px;
        font-size: 16px;
        font-weight: 600;
        border-radius: 8px;
        min-width: 120px;
        
        &.el-button--warning {
          background-color: #f39c12;
          border-color: #f39c12;
          color: white;
          
          &:hover {
            background-color: #e67e22;
            border-color: #e67e22;
          }
        }
        
        &.el-button--default {
          &:hover {
            color: #f39c12;
            border-color: #f39c12;
          }
        }
      }

      .cart-btn,
      .buy-btn {
        flex: 1;
        height: 50px;
        font-size: 16px;
        font-weight: 600;
        border-radius: 8px;
        transition: all 0.3s ease;

        .el-icon {
          margin-right: 8px;
        }

        &:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
      }

      .cart-btn {
        background: linear-gradient(135deg, #409eff 0%, #1890ff 100%);
        border: none;
      }

      .buy-btn {
        background: linear-gradient(135deg, #f56c6c 0%, #ff4757 100%);
        border: none;
      }
    }
  }

  .description-card {
    .description-content {
      .description-text {
        font-size: 16px;
        line-height: 1.8;
        color: #606266;
        margin: 0;
        padding: 16px;
        background-color: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #409eff;
      }

      .no-description {
        text-align: center;
        color: #909399;
        font-style: italic;
        margin: 0;
        padding: 32px;
      }
    }
  }

  .info-card,
  .specs-card {
    .info-value,
    .spec-value {
      font-weight: 500;
      color: #303133;
    }

    .price-value {
      font-size: 18px;
      font-weight: 700;
      color: #f56c6c;
    }

    .stock-value {
      font-weight: 600;
      color: #67c23a;

      &.low-stock {
        color: #f56c6c;
      }
    }
  }

  // 响应式设计
  @media (max-width: 768px) {
    padding: 16px;

    .detail-card {
      .el-row {
        .el-col {
          margin-bottom: 20px;
        }
      }
    }

    .product-info {
      .product-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;

        .title {
          font-size: 24px;
        }
      }

      .price-highlight {
        .current-price {
          .amount {
            font-size: 28px;
          }
        }
      }

      .action-section {
        flex-direction: column;
      }
    }
  }
}
</style>