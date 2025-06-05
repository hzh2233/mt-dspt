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
        <div v-if="product.description" class="description-text" v-html="product.description"></div>
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
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
  padding: 30px;
  max-width: 1400px;
  margin: 0 auto;

  .detail-card,
  .description-card,
  .info-card,
  .specs-card {
    margin-bottom: 30px;
    border-radius: 20px;
    box-shadow: 0 15px 45px rgba(0, 0, 0, 0.1);
    border: none;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(15px);
    overflow: hidden;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.15);
    }

    :deep(.el-card__body) {
      background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
      padding: 30px;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      padding: 20px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      margin: -30px -30px 30px -30px;

      .el-icon {
        color: white;
        font-size: 24px;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
      }
    }
  }

  .product-image {
    width: 100%;
    height: 450px;
    border-radius: 15px;
    overflow: hidden;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
    position: relative;
    background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 2;
    }
    
    &:hover::before {
      opacity: 1;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      z-index: 1;

      &:hover {
        transform: scale(1.1) rotate(1deg);
      }
    }
  }

  .product-info {
    .product-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 30px;
      padding: 20px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      border-radius: 15px;
      border: 1px solid rgba(102, 126, 234, 0.2);

      .title {
        margin: 0;
        font-size: 32px;
        font-weight: 800;
        color: #2c3e50;
        line-height: 1.3;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      :deep(.el-tag) {
        font-size: 14px;
        font-weight: 600;
        padding: 8px 16px;
        border-radius: 20px;
        border: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        
        &.el-tag--success {
          background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
          color: white;
        }
        
        &.el-tag--danger {
          background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
          color: white;
        }
      }
    }

    .price-highlight {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      padding: 25px;
      border-radius: 20px;
      margin-bottom: 30px;
      box-shadow: 0 10px 30px rgba(231, 76, 60, 0.3);
      position: relative;
      overflow: hidden;
      
      &::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -50%;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
        transform: rotate(45deg);
      }

      .current-price {
        display: flex;
        align-items: baseline;
        color: white;
        position: relative;
        z-index: 1;

        .currency {
          font-size: 24px;
          font-weight: 600;
          margin-right: 6px;
          opacity: 0.9;
        }

        .amount {
          font-size: 42px;
          font-weight: 800;
          text-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
        }
      }
    }

    .product-meta {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-bottom: 30px;
      padding: 25px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
      border-radius: 15px;
      border: 1px solid rgba(102, 126, 234, 0.1);

      .meta-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: white;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        transition: all 0.3s ease;
        
        &:hover {
          transform: translateX(5px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
        }

        .el-icon {
          color: #667eea;
          font-size: 18px;
          padding: 8px;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 8px;
        }

        .meta-label {
          font-weight: 600;
          color: #2c3e50;
          font-size: 15px;
        }

        .meta-value {
          font-weight: 700;
          color: #2c3e50;
          font-size: 15px;

          &.low-stock {
            color: #e74c3c;
            background: rgba(231, 76, 60, 0.1);
            padding: 4px 8px;
            border-radius: 6px;
          }
        }
      }
    }

    .quantity-section {
      margin-bottom: 30px;
      padding: 20px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
      border-radius: 15px;
      border: 1px solid rgba(102, 126, 234, 0.1);

      .section-label {
        display: block;
        margin-bottom: 15px;
        font-weight: 700;
        color: #2c3e50;
        font-size: 18px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }
      
      :deep(.el-input-number) {
        .el-input__wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border: 2px solid rgba(102, 126, 234, 0.2);
          transition: all 0.3s ease;
          
          &:hover {
            border-color: #667eea;
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.2);
          }
          
          &.is-focus {
            border-color: #667eea;
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
          }
        }
        
        .el-input-number__decrease,
        .el-input-number__increase {
          border-radius: 8px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          
          &:hover {
            background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
            transform: scale(1.1);
          }
        }
      }
    }

    .action-section {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;

      .favorite-btn {
        height: 55px;
        font-size: 16px;
        font-weight: 700;
        border-radius: 15px;
        min-width: 140px;
        transition: all 0.3s ease;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
        
        &.el-button--warning {
          background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
          border: none;
          color: white;
          
          &:hover {
            background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
            transform: translateY(-3px);
            box-shadow: 0 10px 30px rgba(243, 156, 18, 0.4);
          }
        }
        
        &.el-button--default {
          background: white;
          border: 2px solid #f39c12;
          color: #f39c12;
          
          &:hover {
            background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
            color: white;
            transform: translateY(-3px);
            box-shadow: 0 10px 30px rgba(243, 156, 18, 0.4);
          }
        }
      }

      .cart-btn,
      .buy-btn {
        flex: 1;
        height: 55px;
        font-size: 16px;
        font-weight: 700;
        border-radius: 15px;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        border: none;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        min-width: 160px;

        .el-icon {
          margin-right: 8px;
          font-size: 18px;
        }

        &:hover:not(:disabled) {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.25);
        }
        
        &:active:not(:disabled) {
          transform: translateY(-2px) scale(0.98);
        }
      }

      .cart-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        
        &:hover:not(:disabled) {
          background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
          box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4);
        }
      }

      .buy-btn {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        
        &:hover:not(:disabled) {
          background: linear-gradient(135deg, #d62c1a 0%, #a93226 100%);
          box-shadow: 0 15px 40px rgba(231, 76, 60, 0.4);
        }
      }
    }
  }

  .description-card {
    .description-content {
      .description-text {
        font-size: 16px;
        line-height: 1.8;
        color: #2c3e50;
        margin: 0;
        padding: 25px;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
        border-radius: 15px;
        border-left: 5px solid #667eea;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        font-weight: 500;
        
        // 富文本内容样式
        :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
          color: #2c3e50;
          margin: 20px 0 15px 0;
          font-weight: 600;
          line-height: 1.4;
        }
        
        :deep(h1) { font-size: 28px; }
        :deep(h2) { font-size: 24px; }
        :deep(h3) { font-size: 20px; }
        :deep(h4) { font-size: 18px; }
        :deep(h5) { font-size: 16px; }
        :deep(h6) { font-size: 14px; }
        
        :deep(p) {
          margin: 15px 0;
          line-height: 1.8;
        }
        
        :deep(ul), :deep(ol) {
          margin: 15px 0;
          padding-left: 30px;
          
          li {
            margin: 8px 0;
            line-height: 1.6;
          }
        }
        
        :deep(blockquote) {
          margin: 20px 0;
          padding: 15px 20px;
          background: rgba(102, 126, 234, 0.1);
          border-left: 4px solid #667eea;
          border-radius: 8px;
          font-style: italic;
        }
        
        :deep(a) {
          color: #667eea;
          text-decoration: none;
          transition: color 0.3s ease;
          
          &:hover {
            color: #5a6fd8;
            text-decoration: underline;
          }
        }
        
        :deep(img) {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 15px 0;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        :deep(table) {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          
          th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
          }
          
          th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-weight: 600;
          }
          
          tr:nth-child(even) {
            background: rgba(102, 126, 234, 0.05);
          }
        }
        
        :deep(code) {
          background: rgba(102, 126, 234, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
        }
        
        :deep(pre) {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 20px 0;
          border-left: 4px solid #667eea;
          
          code {
            background: none;
            padding: 0;
          }
        }
        
        :deep(strong), :deep(b) {
          font-weight: 700;
          color: #2c3e50;
        }
        
        :deep(em), :deep(i) {
          font-style: italic;
          color: #5a6c7d;
        }
        
        :deep(hr) {
          border: none;
          height: 2px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 30px 0;
          border-radius: 2px;
        }
      }

      .no-description {
        text-align: center;
        color: #7f8c8d;
        font-style: italic;
        margin: 0;
        padding: 40px;
        background: rgba(127, 140, 141, 0.05);
        border-radius: 15px;
        font-size: 16px;
      }
    }
  }

  .info-card,
  .specs-card {
    :deep(.el-descriptions) {
      .el-descriptions__header {
        margin-bottom: 20px;
      }
      
      .el-descriptions__table {
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
      }
      
      .el-descriptions__cell {
        padding: 15px 20px;
        
        &.is-bordered-label {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          font-weight: 600;
          color: #2c3e50;
        }
      }
    }
    
    .info-value,
    .spec-value {
      font-weight: 600;
      color: #2c3e50;
    }

    .price-value {
      font-size: 20px;
      font-weight: 800;
      color: #e74c3c;
      text-shadow: 0 2px 4px rgba(231, 76, 60, 0.2);
    }

    .stock-value {
      font-weight: 700;
      color: #27ae60;
      background: rgba(39, 174, 96, 0.1);
      padding: 6px 12px;
      border-radius: 8px;
      display: inline-block;

      &.low-stock {
        color: #e74c3c;
        background: rgba(231, 76, 60, 0.1);
      }
    }
  }

  // 响应式设计
  @media (max-width: 1200px) {
    padding: 25px;
    max-width: 100%;
  }
  
  @media (max-width: 992px) {
    padding: 20px;
    
    .detail-card,
    .description-card,
    .info-card,
    .specs-card {
      border-radius: 15px;
      
      :deep(.el-card__body) {
        padding: 25px;
      }
    }
    
    .product-image {
      height: 350px;
    }
  }

  @media (max-width: 768px) {
    padding: 15px;

    .detail-card {
      .el-row {
        .el-col {
          margin-bottom: 25px;
        }
      }
      
      :deep(.el-card__body) {
        padding: 20px;
      }
    }
    
    .product-image {
      height: 300px;
      border-radius: 12px;
    }

    .product-info {
      .product-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 15px;
        padding: 15px;

        .title {
          font-size: 26px;
        }
      }

      .price-highlight {
        padding: 20px;
        
        .current-price {
          .amount {
            font-size: 36px;
          }
        }
      }
      
      .product-meta {
        padding: 20px;
      }
      
      .quantity-section {
        padding: 15px;
      }

      .action-section {
        flex-direction: column;
        gap: 12px;
        
        .favorite-btn,
        .cart-btn,
        .buy-btn {
          width: 100%;
          min-width: auto;
        }
      }
    }
    
    .description-card,
    .info-card,
    .specs-card {
      border-radius: 12px;
      
      :deep(.el-card__body) {
        padding: 20px;
      }
      
      .card-header {
        font-size: 18px;
        padding: 15px 20px;
        margin: -20px -20px 20px -20px;
      }
    }
  }
  
  @media (max-width: 480px) {
    padding: 10px;
    
    .detail-card,
    .description-card,
    .info-card,
    .specs-card {
      border-radius: 10px;
      margin-bottom: 20px;
      
      :deep(.el-card__body) {
        padding: 15px;
      }
      
      .card-header {
        font-size: 16px;
        padding: 12px 15px;
        margin: -15px -15px 15px -15px;
      }
    }
    
    .product-image {
      height: 250px;
      border-radius: 10px;
    }
    
    .product-info {
      .product-header {
        padding: 12px;
        
        .title {
          font-size: 22px;
        }
      }
      
      .price-highlight {
        padding: 15px;
        border-radius: 12px;
        
        .current-price {
          .currency {
            font-size: 20px;
          }
          
          .amount {
            font-size: 30px;
          }
        }
      }
      
      .product-meta {
        padding: 15px;
        gap: 12px;
        
        .meta-item {
          padding: 10px;
          
          .meta-label,
          .meta-value {
            font-size: 14px;
          }
        }
      }
      
      .quantity-section {
        padding: 12px;
        
        .section-label {
          font-size: 16px;
        }
      }
      
      .action-section {
        .favorite-btn,
        .cart-btn,
        .buy-btn {
          height: 50px;
          font-size: 15px;
          border-radius: 12px;
        }
      }
    }
    
    .description-card {
      .description-content {
        .description-text {
          padding: 15px;
          font-size: 15px;
        }
        
        .no-description {
          padding: 25px;
          font-size: 15px;
        }
      }
    }
  }
}
</style>