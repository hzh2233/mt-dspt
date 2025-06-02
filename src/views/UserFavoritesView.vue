<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Star, StarFilled, ShoppingCart, Delete, Refresh } from '@element-plus/icons-vue'
import { favoriteApi, cartApi } from '@/services/api'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import type { Favorite } from '@/types/api'

const router = useRouter()
const cartStore = useCartStore()
const userStore = useUserStore()

// 收藏列表数据
const favorites = ref<Favorite[]>([])
const loading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(12)

// 获取收藏列表
const fetchFavorites = async () => {
  loading.value = true
  try {
    const response = await favoriteApi.getFavorites({
      page: currentPage.value,
      size: pageSize.value
    })
    favorites.value = response.favorites
    total.value = response.total
  } catch (error) {
    console.error('获取收藏列表失败:', error)
    ElMessage.error('获取收藏列表失败')
  } finally {
    loading.value = false
  }
}

// 取消收藏
const removeFavorite = async (favorite: Favorite) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消收藏「${favorite.product?.title}」吗？`,
      '取消收藏',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await favoriteApi.removeFavorite(favorite.productId)
    ElMessage.success('已取消收藏')
    
    // 重新获取收藏列表
    await fetchFavorites()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消收藏失败:', error)
      ElMessage.error('取消收藏失败')
    }
  }
}

// 加入购物车
const addToCart = async (favorite: Favorite) => {
  if (!favorite.product) {
    ElMessage.error('商品信息不完整')
    return
  }
  
  // 确保购物车已初始化
  if (userStore.isLoggedIn && cartStore.items.length === 0 && !cartStore.loading) {
    await cartStore.initCart()
  }
  
  const cartItem = {
    id: 0,
    productId: favorite.product.id,
    title: favorite.product.title,
    price: favorite.product.price,
    image: favorite.product.image,
    quantity: 1
  }
  
  try {
    await cartStore.addItem(cartItem)
    ElMessage.success('成功加入购物车')
  } catch (error) {
    console.error('添加到购物车失败:', error)
    ElMessage.error('添加到购物车失败，请重试')
  }
}

// 跳转到商品详情
const goToProductDetail = (productId: number) => {
  router.push(`/product/${productId}`)
}

// 分页变化
const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchFavorites()
}

// 处理图片加载错误
const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  if (target && !target.dataset.errorHandled) {
    // 标记已处理过错误，防止无限循环
    target.dataset.errorHandled = 'true'
    // 使用 data URL 创建一个简单的占位符图片
    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaXoOazleWKoOi9veWbvueJhzwvdGV4dD48L3N2Zz4='
  }
}

// 页面挂载时获取数据
onMounted(() => {
  fetchFavorites()
})
</script>

<template>
  <div class="favorites-view">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <el-icon class="title-icon"><StarFilled /></el-icon>
          我的收藏
        </h1>
        <p class="page-subtitle">共收藏了 {{ total }} 件商品</p>
      </div>
      <div class="header-actions">
        <el-button 
          type="primary" 
          :icon="Refresh" 
          @click="fetchFavorites"
          :loading="loading"
        >
          刷新
        </el-button>
      </div>
    </div>

    <!-- 收藏商品列表 -->
    <div class="favorites-content" v-loading="loading">
      <div v-if="favorites.length === 0 && !loading" class="empty-state">
        <el-empty description="暂无收藏的商品">
          <el-button type="primary" @click="router.push('/')">
            去逛逛
          </el-button>
        </el-empty>
      </div>
      
      <div v-else class="favorites-grid">
        <div 
          v-for="favorite in favorites" 
          :key="favorite.id" 
          class="favorite-card"
        >
          <el-card class="product-card" shadow="hover">
            <!-- 商品图片 -->
            <div class="product-image" @click="goToProductDetail(favorite.productId)">
              <img 
                :src="favorite.product?.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaXoOazleWKoOi9veWbvueJhzwvdGV4dD48L3N2Zz4='" 
                :alt="favorite.product?.title"
                @error="handleImageError"
              />
              <div class="image-overlay">
                <span class="view-detail">查看详情</span>
              </div>
            </div>
            
            <!-- 商品信息 -->
            <div class="product-info">
              <h3 
                class="product-title" 
                @click="goToProductDetail(favorite.productId)"
                :title="favorite.product?.title"
              >
                {{ favorite.product?.title }}
              </h3>
              
              <div class="product-price">
                <span class="current-price">¥{{ favorite.product?.price }}</span>
              </div>
              
              <div class="product-meta">
                <span class="stock-info">
                  库存：{{ favorite.product?.stock || 0 }}件
                </span>
                <span class="favorite-time">
                  {{ new Date(favorite.createTime).toLocaleDateString() }}
                </span>
              </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="product-actions">
              <el-button 
                type="primary" 
                size="small"
                :icon="ShoppingCart"
                @click="addToCart(favorite)"
                :disabled="(favorite.product?.stock || 0) === 0"
              >
                加入购物车
              </el-button>
              <el-button 
                type="danger" 
                size="small"
                :icon="Delete"
                @click="removeFavorite(favorite)"
                plain
              >
                取消收藏
              </el-button>
            </div>
          </el-card>
        </div>
      </div>
      
      <!-- 分页 -->
      <div v-if="total > pageSize" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next, jumper, total"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.favorites-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #ebeef5;
}

.header-left {
  .page-title {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 8px 0;
    font-size: 28px;
    font-weight: 700;
    color: #303133;
    
    .title-icon {
      color: #f39c12;
      font-size: 32px;
    }
  }
  
  .page-subtitle {
    margin: 0;
    color: #909399;
    font-size: 14px;
  }
}

.header-actions {
  display: flex;
  gap: 12px;
}

.favorites-content {
  min-height: 400px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.favorite-card {
  .product-card {
    height: 100%;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }
  }
}

.product-image {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }
  
  .image-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
    
    .view-detail {
      color: white;
      font-weight: 600;
      font-size: 16px;
    }
  }
  
  &:hover {
    img {
      transform: scale(1.05);
    }
    
    .image-overlay {
      opacity: 1;
    }
  }
}

.product-info {
  padding: 16px 0;
  
  .product-title {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    line-height: 1.4;
    cursor: pointer;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    
    &:hover {
      color: #409eff;
    }
  }
  
  .product-price {
    margin-bottom: 12px;
    
    .current-price {
      font-size: 20px;
      font-weight: 700;
      color: #f56c6c;
    }
  }
  
  .product-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #909399;
    
    .stock-info {
      font-weight: 500;
    }
    
    .favorite-time {
      font-style: italic;
    }
  }
}

.product-actions {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  
  .el-button {
    flex: 1;
    font-size: 14px;
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .favorites-view {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: flex-end;
  }
  
  .favorites-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }
  
  .product-image {
    height: 160px;
  }
}
</style>