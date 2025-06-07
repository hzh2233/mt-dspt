<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Star,
  StarFilled,
  ShoppingCart,
  Money,
  Box,
  Goods,
  Document,
  InfoFilled,
  ChatDotRound,
  ArrowRight
} from '@element-plus/icons-vue'
import { productApi, cartApi, favoriteApi, commentApi, goodTypeApi } from '@/services/api'
import type { Product, GoodType, ProductComment } from '@/types/api'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

// 响应式数据
const loading = ref(false)
const product = ref<Product | null>(null)
const quantity = ref(1)
const categories = ref<GoodType[]>([])
const isFavorite = ref(false)
const favoriteLoading = ref(false)
const hotComments = ref<ProductComment[]>([])
const commentLoading = ref(false)

// 获取商品详情
const fetchProductDetail = async (productId: number) => {
  try {
    loading.value = true
    const response = await productApi.getDetail(productId)
    product.value = response
  } catch (error) {
    console.error('获取商品详情失败:', error)
    ElMessage.error('获取商品详情失败')
  } finally {
    loading.value = false
  }
}

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
  return category ? category.categoryName : '未知分类'
}

// 检查商品是否已收藏
const checkFavoriteStatus = async (productId: number) => {
  if (!userStore.isLoggedIn) return
  
  try {
    const response = await favoriteApi.checkFavorite(productId)
    isFavorite.value = response.isFavorite
  } catch (error) {
    console.error('检查收藏状态失败:', error)
  }
}

// 获取热门评论
const fetchHotComments = async (productId: number) => {
  try {
    commentLoading.value = true
    const response = await commentApi.getHotComments(productId, 3)
    // 响应拦截器已经返回了data部分，所以直接访问records
    hotComments.value = (response as any).records || []
  } catch (error) {
    console.error('获取热门评论失败:', error)
  } finally {
    commentLoading.value = false
  }
}

// 点赞评论
const likeComment = async (commentId: number) => {
  try {
    // 调用点赞API
    await commentApi.likeComment(commentId)
    ElMessage.success('点赞成功')
    // 重新获取评论数据以更新点赞数
    if (product.value) {
      await fetchHotComments(product.value.id)
    }
  } catch (error) {
    console.error('点赞失败:', error)
    ElMessage.error('点赞失败，请重试')
  }
}

// 跳转到评论详情页
const goToComments = () => {
  if (product.value) {
    router.push(`/product/${product.value.id}/comments`)
  }
}

// 格式化评论内容（处理富文本，截取部分内容）
const formatCommentContent = (content: string, maxLength: number = 100) => {
  // 移除HTML标签
  const textContent = content.replace(/<[^>]*>/g, '')
  // 截取指定长度
  if (textContent.length > maxLength) {
    return textContent.substring(0, maxLength) + '...'
  }
  return textContent
}

// 格式化时间
const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else if (days < 30) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString()
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
  
  try {
    favoriteLoading.value = true
    
    if (isFavorite.value) {
      // 取消收藏
      await favoriteApi.removeFavorite(product.value.id)
      isFavorite.value = false
      ElMessage.success('已取消收藏')
    } else {
      // 添加收藏
      await favoriteApi.addFavorite(product.value.id)
      isFavorite.value = true
      ElMessage.success('收藏成功')
    }
  } catch (error) {
    console.error('收藏操作失败:', error)
    ElMessage.error('操作失败，请重试')
  } finally {
    favoriteLoading.value = false
  }
}

// 添加到购物车
const addToCart = async () => {
  if (!product.value) return
  
  // 检查用户是否登录
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再添加到购物车')
    router.push('/login')
    return
  }
  
  // 确保购物车已初始化
  if (userStore.isLoggedIn && cartStore.items.length === 0 && !cartStore.loading) {
    await cartStore.initCart()
  }
  
  const cartItem = {
    id: 0,
    productId: product.value.id,
    title: product.value.title,
    price: product.value.price,
    image: product.value.image,
    quantity: quantity.value
  }
  
  try {
    await cartStore.addItem(cartItem)
    ElMessage.success('已添加到购物车')
  } catch (error) {
    console.error('添加到购物车失败:', error)
    ElMessage.error('添加失败，请重试')
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

// 页面挂载时获取商品详情和分类列表
onMounted(async () => {
  const productId = parseInt(route.params.id as string)
  if (productId) {
    // 并行获取商品详情、分类列表、收藏状态和热门评论
    await Promise.all([
      fetchProductDetail(productId),
      fetchCategories(),
      checkFavoriteStatus(productId),
      fetchHotComments(productId)
    ])
  } else {
    ElMessage.error('商品ID无效')
    router.push('/')
  }
})
</script>

<template>
  <div class="product-detail" v-loading="loading">
    <!-- 主要商品信息卡片 -->
    <el-card class="detail-card" v-if="product">
      <div class="product-layout">
        <!-- 左侧图片区域 -->
        <div class="image-section">
          <div class="product-image">
            <img :src="product.image" :alt="product.title" />
          </div>
          
          <!-- 图片下方的快速信息 -->
          <div class="quick-info">
            <div class="info-grid">
              <div class="info-item">
                <el-icon class="info-icon"><Box /></el-icon>
                <div class="info-content">
                  <span class="info-label">库存</span>
                  <span class="info-value" :class="{ 'low-stock': (product.stock || 0) < 10 }">
                    {{ product.stock || 0 }}件
                  </span>
                </div>
              </div>
              <div class="info-item">
                <el-icon class="info-icon"><Goods /></el-icon>
                <div class="info-content">
                  <span class="info-label">商品ID</span>
                  <span class="info-value">#{{ product.id }}</span>
                </div>
              </div>
              <div class="info-item">
                <el-icon class="info-icon"><Star /></el-icon>
                <div class="info-content">
                  <span class="info-label">分类</span>
                  <span class="info-value">{{ getCategoryName(product.category) }}</span>
                </div>
              </div>
              <div class="info-item">
                <el-icon class="info-icon"><ChatDotRound /></el-icon>
                <div class="info-content">
                  <span class="info-label">评论</span>
                  <span class="info-value">{{ hotComments.length }}条</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧信息区域 -->
        <div class="info-section">
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
            <div class="price-tips">
              <span class="tip-text">全场包邮 · 7天无理由退换</span>
            </div>
          </div>

          <div class="purchase-section">
            <div class="quantity-wrapper">
              <span class="section-label">购买数量</span>
              <el-input-number 
                v-model="quantity" 
                :min="1" 
                :max="product.stock || 999" 
                :disabled="product.stock === 0"
                size="large"
                class="quantity-input"
              />
            </div>

            <div class="action-buttons">
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
              
              <div class="main-actions">
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
          </div>

          <!-- 商品特色标签 -->
          <div class="product-features">
            <div class="feature-tag">正品保证</div>
            <div class="feature-tag">快速发货</div>
            <div class="feature-tag">售后无忧</div>
            <div class="feature-tag">品质优选</div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 商品评论卡片 -->
    <el-card class="comments-card" v-if="product">
      <template #header>
        <div class="card-header">
          <el-icon><ChatDotRound /></el-icon>
          <span>商品评论</span>
          <el-button 
            link 
            @click="goToComments"
            class="view-all-btn"
          >
            查看全部
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </template>
      <div class="comments-content" v-loading="commentLoading">
        <div v-if="hotComments.length > 0" class="comments-list">
          <div 
            v-for="comment in hotComments" 
            :key="comment.id" 
            class="comment-item"
          >
            <div class="comment-header">
              <div class="user-info">
                <el-avatar 
                  :src="comment.avatar" 
                  :size="40"
                  class="user-avatar"
                >
                  {{ comment.nickName?.charAt(0) || '用' }}
                </el-avatar>
                <div class="user-details">
                  <div class="username">{{ comment.nickName || '匿名用户' }}</div>
                  <div class="comment-time">{{ formatTime(comment.createdAt) }}</div>
                </div>
              </div>
              <div class="comment-actions">
                <div class="comment-rating">
                  <el-rate 
                    v-model="comment.rating" 
                    disabled 
                    show-score 
                    text-color="#ff9900"
                    score-template="{value}分"
                    size="small"
                  />
                </div>
                <div class="like-info" @click="likeComment(comment.id)">
                  <el-icon class="like-icon"><StarFilled /></el-icon>
                  <span>{{ comment.likeCount }}</span>
                </div>
              </div>
            </div>
            <div class="comment-content">
              <p class="comment-text">{{ formatCommentContent(comment.content) }}</p>
            </div>
          </div>
        </div>
        <div v-else class="no-comments">
          <el-empty description="暂无评论" :image-size="80" />
        </div>
      </div>
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
      <el-table :data="[product]" style="width: 100%" stripe>
        <el-table-column prop="title" label="商品名称" />
        <el-table-column prop="id" label="商品ID" />
        <el-table-column prop="price" label="价格" >
          <template #default="{ row }">
            ¥{{ row.price }}
          </template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" >
          <template #default="{ row }">
            {{ row.stock || 0 }}件
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" >
          <template #default="{ row }">
            {{ getCategoryName(row.category) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>


  </div>
</template>

<style scoped lang="scss">
.product-detail {
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;

  .detail-card {
    margin-bottom: 30px;
    border-radius: 20px;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(102, 126, 234, 0.1);
    overflow: hidden;
    background: white;
    
    :deep(.el-card__body) {
      padding: 30px;
    }

    .product-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      min-height: 600px;
      
      @media (max-width: 768px) {
        grid-template-columns: 1fr;
        gap: 30px;
      }
    }

    .image-section {
      display: flex;
      flex-direction: column;
      gap: 20px;

      .product-image {
        width: 100%;
        height: 400px;
        border-radius: 15px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        
        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%, rgba(255, 255, 255, 0.1) 100%);
          pointer-events: none;
        }

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
          position: relative;
          z-index: 1;
          
          &:hover {
            transform: scale(1.05);
          }
        }
      }

      .quick-info {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
        border-radius: 15px;
        padding: 20px;
        border: 1px solid rgba(102, 126, 234, 0.1);

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;

          .info-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 15px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            transition: all 0.3s ease;
            
            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
            }

            .info-icon {
              color: #667eea;
              font-size: 20px;
              padding: 10px;
              background: rgba(102, 126, 234, 0.1);
              border-radius: 10px;
              flex-shrink: 0;
            }

            .info-content {
              display: flex;
              flex-direction: column;
              gap: 2px;
              min-width: 0;

              .info-label {
                font-size: 12px;
                color: #666;
                font-weight: 500;
              }

              .info-value {
                font-weight: 700;
                color: #2c3e50;
                font-size: 14px;
                word-break: break-all;

                &.low-stock {
                  color: #e74c3c;
                }
              }
            }
          }
        }
      }
    }

    .info-section {
      display: flex;
      flex-direction: column;
      gap: 25px;
      height: fit-content;

      .product-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        padding: 25px;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
        border-radius: 15px;
        border: 1px solid rgba(102, 126, 234, 0.1);

        .title {
          font-size: 26px;
          font-weight: 800;
          color: #2c3e50;
          margin: 0;
          flex: 1;
          line-height: 1.3;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .el-tag {
          font-weight: 700;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          flex-shrink: 0;
        }
      }

      .price-highlight {
        padding: 25px;
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        border-radius: 20px;
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
          margin-bottom: 10px;

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

        .price-tips {
          position: relative;
          z-index: 1;
          
          .tip-text {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            font-weight: 500;
          }
        }
      }

      .purchase-section {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 25px;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
        border-radius: 15px;
        border: 1px solid rgba(102, 126, 234, 0.1);

        .quantity-wrapper {
          display: flex;
          align-items: center;
          gap: 15px;

          .section-label {
            font-weight: 700;
            color: #2c3e50;
            font-size: 16px;
            min-width: 80px;
          }
          
          .quantity-input {
            :deep(.el-input__wrapper) {
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
            
            :deep(.el-input-number__decrease),
            :deep(.el-input-number__increase) {
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

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 15px;

          .favorite-btn {
            height: 50px;
            font-size: 16px;
            font-weight: 700;
            border-radius: 15px;
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

          .main-actions {
            display: flex;
            gap: 15px;

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
              color: white;
              
              &:hover:not(:disabled) {
                background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
              }
            }

            .buy-btn {
              background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
              color: white;
              
              &:hover:not(:disabled) {
                background: linear-gradient(135deg, #d62c1a 0%, #a93226 100%);
              }
            }
          }
        }
      }

      .product-features {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        padding: 20px;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
        border-radius: 15px;
        border: 1px solid rgba(102, 126, 234, 0.1);

        .feature-tag {
          padding: 8px 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          transition: all 0.3s ease;
          
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
          }
        }
      }
    }
  }

  .description-card,
  .info-card,
  .specs-card,
  .comments-card {
    margin-bottom: 30px;
    border-radius: 20px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(102, 126, 234, 0.1);
    overflow: hidden;
    
    :deep(.el-card__header) {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
      border-bottom: 1px solid rgba(102, 126, 234, 0.1);
      padding: 20px 25px;
      
      .card-header {
        display: flex;
        align-items: center;
        font-weight: 700;
        color: #2c3e50;
        font-size: 18px;
        margin: 0;
        
        .el-icon {
          color: #667eea;
          font-size: 20px;
          margin-right: 10px;
        }
      }
    }
    
    :deep(.el-card__body) {
      padding: 25px;
    }
  }

  .description-card {
    .description-content {
      .description-text {
        line-height: 1.8;
        color: #34495e;
        font-size: 16px;
        padding: 20px;
        background: rgba(102, 126, 234, 0.02);
        border-radius: 12px;
        border-left: 4px solid #667eea;
        
        :deep(img) {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 10px 0;
        }
      }
      
      .no-description {
        text-align: center;
        color: #7f8c8d;
        font-size: 16px;
        padding: 40px 20px;
        background: rgba(127, 140, 141, 0.05);
        border-radius: 12px;
        margin: 0;
      }
    }
  }

  .info-card {
    :deep(.el-table) {
      border-radius: 12px;
      overflow: hidden;
      
      .el-table__header {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        
        th {
          background: transparent;
          color: #2c3e50;
          font-weight: 700;
          border-bottom: 2px solid rgba(102, 126, 234, 0.2);
        }
      }
      
      .el-table__body {
        tr {
          &:hover {
            background: rgba(102, 126, 234, 0.05);
          }
          
          td {
            border-bottom: 1px solid rgba(102, 126, 234, 0.1);
            color: #34495e;
            font-weight: 500;
          }
        }
      }
    }
  }

  .specs-card {
    .specs-content {
      .specs-placeholder {
        text-align: center;
        color: #7f8c8d;
        font-size: 16px;
        padding: 40px 20px;
        background: rgba(127, 140, 141, 0.05);
        border-radius: 12px;
        margin: 0;
      }
    }
  }

  // 评论卡片样式
  .comments-card {
    :deep(.el-card__header) {
      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        
        .view-all-btn {
          color: #667eea;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 20px;
          transition: all 0.3s ease;
          
          &:hover {
            background: rgba(102, 126, 234, 0.1);
            transform: translateX(5px);
          }
          
          .el-icon {
            margin-left: 5px;
            margin-right: 0;
            font-size: 14px;
          }
        }
      }
    }
    
    .comments-content {
      .comments-list {
        .comment-item {
          padding: 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
          
          &:last-child {
            border-bottom: none;
          }
          
          &:hover {
            background: rgba(102, 126, 234, 0.02);
            transform: translateX(5px);
          }
          
          .comment-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 15px;
            
            .user-info {
              display: flex;
              align-items: center;
              gap: 12px;
              
              .user-avatar {
                border: 2px solid rgba(102, 126, 234, 0.2);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              }
              
              .user-details {
                .username {
                  font-weight: 600;
                  color: #2c3e50;
                  font-size: 15px;
                  margin-bottom: 4px;
                }
                
                .comment-time {
                  font-size: 13px;
                  color: #7f8c8d;
                }
              }
            }
            
            .comment-actions {
              display: flex;
              align-items: center;
              gap: 15px;
              
              .comment-rating {
                :deep(.el-rate) {
                  .el-rate__text {
                    font-size: 13px;
                    color: #7f8c8d;
                    margin-left: 8px;
                  }
                }
              }
              
              .like-info {
                display: flex;
                align-items: center;
                gap: 6px;
                color: #7f8c8d;
                font-size: 14px;
                padding: 6px 12px;
                background: rgba(102, 126, 234, 0.05);
                border-radius: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                
                &:hover {
                  background: rgba(102, 126, 234, 0.1);
                  color: #667eea;
                  transform: translateY(-1px);
                }
                
                .like-icon {
                  font-size: 16px;
                  color: #e74c3c;
                  transition: all 0.3s ease;
                  
                  &:hover {
                    color: #c0392b;
                    transform: scale(1.1);
                  }
                }
              }
            }
          }
          
          .comment-content {
            margin-bottom: 15px;
            
            .comment-text {
              color: #34495e;
              line-height: 1.6;
              font-size: 15px;
              margin: 0;
              padding: 15px;
              background: rgba(102, 126, 234, 0.03);
              border-radius: 12px;
              border-left: 4px solid #667eea;
            }
          }
          

        }
      }
      
      .no-comments {
        padding: 40px 20px;
        text-align: center;
        
        :deep(.el-empty) {
          .el-empty__description {
            color: #7f8c8d;
            font-size: 16px;
          }
        }
      }
    }
  }

  // 响应式设计
  @media (max-width: 768px) {
    padding: 20px;
    
    .detail-card {
      margin-bottom: 20px;
      border-radius: 15px;
      
      :deep(.el-card__body) {
        padding: 25px;
      }
      
      .el-row {
        .el-col {
          margin-bottom: 20px;
        }
      }
      
      .product-image {
        height: 300px;
        border-radius: 12px;
      }
      
      .product-info {
        .product-header {
          padding: 20px;
          
          .title {
            font-size: 24px;
          }
        }
        
        .price-highlight {
          padding: 20px;
          border-radius: 15px;
          
          .current-price {
            .currency {
              font-size: 20px;
            }
            
            .amount {
              font-size: 36px;
            }
          }
        }
        
        .product-meta {
          padding: 20px;
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
    }
    
    .description-card,
    .info-card,
    .specs-card,
    .comments-card {
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

    .comments-card {
      :deep(.el-card__header) {
        padding: 15px 20px;
        
        .card-header {
          span {
            font-size: 16px;
          }
          
          .view-all-btn {
            padding: 6px 12px;
            font-size: 14px;
          }
        }
      }
      
      .comments-content {
        .comments-list {
          .comment-item {
            padding: 15px;
            
            .comment-header {
              .user-info {
                gap: 10px;
                
                .user-avatar {
                  width: 35px;
                  height: 35px;
                }
                
                .user-details {
                  .username {
                    font-size: 14px;
                  }
                  
                  .comment-time {
                    font-size: 12px;
                  }
                }
              }
            }
            
            .comment-content {
              .comment-text {
                font-size: 14px;
                padding: 12px;
              }
            }
          }
        }
      }
    }
  }
  
  @media (max-width: 480px) {
    padding: 10px;
    
    .detail-card,
    .description-card,
    .info-card,
    .specs-card,
    .comments-card {
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

    .comments-card {
      border-radius: 12px;
      
      :deep(.el-card__header) {
        padding: 12px 15px;
        
        .card-header {
          .el-icon {
            font-size: 18px;
          }
          
          span {
            font-size: 15px;
          }
          
          .view-all-btn {
            padding: 5px 10px;
            font-size: 13px;
          }
        }
      }
      
      .comments-content {
        .comments-list {
          .comment-item {
            padding: 12px;
            
            .comment-header {
              margin-bottom: 12px;
              
              .user-info {
                gap: 8px;
                
                .user-avatar {
                  width: 30px;
                  height: 30px;
                }
                
                .user-details {
                  .username {
                    font-size: 13px;
                  }
                  
                  .comment-time {
                    font-size: 11px;
                  }
                }
              }
            }
            
            .comment-content {
              margin-bottom: 12px;
              
              .comment-text {
                font-size: 13px;
                padding: 10px;
              }
            }
            
            .comment-footer {
              .like-info {
                font-size: 13px;
                padding: 4px 10px;
              }
            }
          }
        }
        
        .no-comments {
          padding: 30px 15px;
          
          :deep(.el-empty) {
            .el-empty__description {
              font-size: 14px;
            }
          }
        }
      }
    }
  }
}
</style>