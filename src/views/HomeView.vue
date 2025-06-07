<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Loading, Phone, Monitor, HomeFilled, ShoppingBag, Food, Reading, Goods } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { productApi, goodTypeApi } from '@/services/api'
import type { Product, GoodType } from '@/types/api'



const router = useRouter()

// 商品分类数据
const categories = ref<GoodType[]>([])
const categoriesLoading = ref(false)

// 图标映射
const iconMap: Record<string, string> = {
  '手机数码': 'Phone',
  '电脑办公': 'Monitor',
  '家用电器': 'HomeFilled',
  '服装鞋包': 'ShoppingBag',
  '食品生鲜': 'Food',
  '图书文娱': 'Reading'
}

// 获取商品分类数据
const fetchCategories = async () => {
  categoriesLoading.value = true
  try {
    const response = await goodTypeApi.getList()
    // 为每个分类添加对应的图标
    categories.value = response.map(category => ({
      ...category,
      icon: iconMap[category.categoryName] || 'Goods' // 默认图标
    }))
  } catch (error) {
    console.error('获取商品分类失败:', error)
    ElMessage.error('获取商品分类失败')
  } finally {
    categoriesLoading.value = false
  }
}

// 推荐商品数据
const recommendProducts = ref<Product[]>([])
const loading = ref(false)
const loadingMore = ref(false)

// 分类商品数据
const categoryProducts = ref<Product[]>([])
const categoryLoading = ref(false)
const categoryLoadingMore = ref(false)
const selectedCategoryId = ref<number | null>(null)
const selectedCategoryName = ref<string>('')

// 无限滚动相关数据
const currentPage = ref(1)
const pageSize = ref(8)
const total = ref(0)
const hasMore = ref(true)

// 分类商品分页数据
const categoryCurrentPage = ref(1)
const categoryPageSize = ref(8)
const categoryTotal = ref(0)
const categoryHasMore = ref(true)

// 获取推荐商品数据
const fetchRecommendProducts = async (pageNum: number = 1, append: boolean = false) => {
  if (pageNum === 1) {
    loading.value = true
  } else {
    loadingMore.value = true
  }
  
  try {
    const response = await productApi.getRecommended({
      pageNum,
      pageSize: pageSize.value
    })
    
    if (append) {
      // 追加数据
      recommendProducts.value = [...recommendProducts.value, ...response.products]
    } else {
      // 替换数据
      recommendProducts.value = response.products
    }
    
    total.value = response.total
    currentPage.value = pageNum
    
    // 检查是否还有更多数据
    hasMore.value = recommendProducts.value.length < total.value
    
  } catch (error) {
    console.error('获取推荐商品失败:', error)
    ElMessage.error('获取推荐商品失败')
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 获取分类商品数据并显示在推荐商品区域
const fetchCategoryProductsAsRecommended = async (categoryId: number, pageNum: number = 1, append: boolean = false) => {
  if (pageNum === 1) {
    loading.value = true
  } else {
    loadingMore.value = true
  }
  
  try {
    const response = await productApi.getByCategory({
      category: categoryId,
      pageNum,
      pageSize: pageSize.value
    })
    
    if (append) {
      // 追加数据
      recommendProducts.value = [...recommendProducts.value, ...response.products]
    } else {
      // 替换数据
      recommendProducts.value = response.products
    }
    
    total.value = response.total
    currentPage.value = pageNum
    
    // 检查是否还有更多数据
    hasMore.value = recommendProducts.value.length < total.value
    
  } catch (error) {
    console.error('获取分类商品失败:', error)
    ElMessage.error('获取分类商品失败')
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 获取分类商品数据
const fetchCategoryProducts = async (categoryId: number, pageNum: number = 1, append: boolean = false) => {
  if (pageNum === 1) {
    categoryLoading.value = true
  } else {
    categoryLoadingMore.value = true
  }
  
  try {
    const response = await productApi.getByCategory({
      category: categoryId,
      pageNum,
      pageSize: categoryPageSize.value
    })
    
    if (append) {
      // 追加数据
      categoryProducts.value = [...categoryProducts.value, ...response.products]
    } else {
      // 替换数据
      categoryProducts.value = response.products
    }
    
    categoryTotal.value = response.total
    categoryCurrentPage.value = pageNum
    
    // 检查是否还有更多数据
    categoryHasMore.value = categoryProducts.value.length < categoryTotal.value
    
  } catch (error) {
    console.error('获取分类商品失败:', error)
    ElMessage.error('获取分类商品失败')
  } finally {
    categoryLoading.value = false
    categoryLoadingMore.value = false
  }
}

// 加载更多推荐商品数据
const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  
  const nextPage = currentPage.value + 1
  
  // 如果当前选择了分类，则加载更多分类商品
  if (selectedCategoryId.value) {
    await fetchCategoryProductsAsRecommended(selectedCategoryId.value, nextPage, true)
  } else {
    // 否则加载更多推荐商品
    await fetchRecommendProducts(nextPage, true)
  }
}

// 加载更多分类商品数据
const loadMoreCategory = async () => {
  if (categoryLoadingMore.value || !categoryHasMore.value) return
  
  const nextPage = categoryCurrentPage.value + 1
  await fetchCategoryProducts(selectedCategoryId.value!, nextPage, true)
}

// 滚动监听
const handleScroll = () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight
  
  // 当滚动到距离底部200px时开始加载更多
  if (scrollTop + windowHeight >= documentHeight - 200) {
    loadMore()
  }
}

// 页面挂载时获取数据并添加滚动监听
onMounted(() => {
  fetchCategories()
  fetchRecommendProducts()
  window.addEventListener('scroll', handleScroll)
})

// 页面卸载时移除滚动监听
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

const handleCategoryClick = (categoryId: number) => {
  // 找到对应的分类名称
  const category = categories.value.find(cat => cat.categoryId === categoryId)
  selectedCategoryName.value = category?.categoryName || ''
  selectedCategoryId.value = categoryId
  
  // 直接在推荐商品区域显示分类商品
  fetchCategoryProductsAsRecommended(categoryId)
}

// 返回推荐商品
const resetToRecommended = () => {
  selectedCategoryId.value = null
  selectedCategoryName.value = ''
  fetchRecommendProducts()
}

const handleProductClick = (product: Product) => {
  router.push({
    path: `/product/${product.id}`
  })
}

const searchQuery = ref('')

// 轮播图数据
const carouselItems = ref([
  {
    title: '智能手机专场',
    description: '最新款智能手机，性能强劲，价格优惠',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=300&fit=crop',
    link: '/products?category=1'
  },
  {
    title: '电脑办公设备',
    description: '高性能电脑配件，办公必备神器',
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=300&fit=crop',
    link: '/products?category=2'
  },
  {
    title: '家用电器优选',
    description: '品质家电，让生活更美好',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=300&fit=crop',
    link: '/products?category=3'
  }
])

const handleSearch = async () => {
  if (searchQuery.value.trim()) {
    // 传递搜索关键词到搜索页面
    router.push({ 
      path: '/search', 
      query: { 
        keyword: searchQuery.value
      } 
    })
  }
}
</script>

<template>
  <div class="home">
    <!-- 搜索栏和图片 -->
    <div class="search-bar">
      <img src="/src/assets/logo1.jpg" alt="Logo" class="search-logo" />
      <el-input 
        v-model="searchQuery" 
        placeholder="搜索商品名称或描述" 
        class="search-input" 
        @keyup.enter="handleSearch"
        size="large"
      >
        <template #append>
          <el-button :icon="Search" @click="handleSearch" size="large">搜索</el-button>
        </template>
      </el-input>
    </div>

    <!-- 轮播图 -->
    <el-card class="carousel-card">
      <el-carousel height="300px" indicator-position="outside">
        <el-carousel-item v-for="(item, index) in carouselItems" :key="index">
          <div class="carousel-item" :style="{ backgroundImage: `url(${item.image})` }">
            <div class="carousel-content">
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
              <el-button type="primary" size="large" @click="router.push(item.link)">立即查看</el-button>
            </div>
          </div>
        </el-carousel-item>
      </el-carousel>
    </el-card>

    <!-- 商品分类 -->
    <el-card class="categories-card" v-loading="categoriesLoading">
      <template #header>
        <div class="card-header">
          <span>商品分类</span>
        </div>
      </template>
      <div class="categories-grid">
        <el-row :gutter="20">
          <el-col
            v-for="category in categories"
            :key="category.categoryId"
            :span="4"
            @click="handleCategoryClick(category.categoryId)"
          >
            <div class="category-item">
              <el-icon :size="24">
                <component :is="category.icon" />
              </el-icon>
              <span>{{ category.categoryName }}</span>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- 推荐商品 -->
    <el-card class="recommend-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>{{ selectedCategoryId ? selectedCategoryName + '商品' : '推荐商品' }}</span>
          <el-button 
            v-if="selectedCategoryId" 
            link 
            @click="resetToRecommended"
            style="float: right;"
          >
            返回推荐
          </el-button>
        </div>
      </template>
      <el-row :gutter="20">
        <el-col
          v-for="product in recommendProducts"
          :key="product.id"
          :span="6"
          @click="handleProductClick(product)"
        >
          <el-card :body-style="{ padding: '0px' }" shadow="hover">
            <img :src="product.image" class="product-image" />
            <div class="product-info">
              <h3>{{ product.title }}</h3>
              <p class="price">¥{{ product.price }}</p>
              <p class="stock">库存: {{ product.stock || 0 }} 件</p>
            </div>
          </el-card>
        </el-col>
      </el-row>
      
      <!-- 加载更多提示 -->
      <div class="load-more-wrapper" v-if="recommendProducts.length > 0">
        <div v-if="loadingMore" class="loading-more">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>正在加载更多...</span>
        </div>
        <div v-else-if="!hasMore" class="no-more">
          <span>已加载全部商品</span>
        </div>
        <div v-else class="scroll-tip">
          <span>向下滚动加载更多</span>
        </div>
      </div>
    </el-card>


  </div>
</template>

<style scoped lang="scss">
.home {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
  padding: 20px;
  
  // 搜索栏样式优化
  .search-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 20px;
    padding: 15px 25px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    margin-bottom: 30px;
    min-height: 80px;
    
    .search-logo {
      flex-shrink: 0;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: transform 0.3s ease;
      
      &:hover {
        transform: scale(1.05);
      }
    }
    
    .search-input {
      flex-grow: 1;
      margin: 0 20px;
    }
    
    :deep(.el-input) {
      .el-input__wrapper {
        border-radius: 15px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(102, 126, 234, 0.2);
        transition: all 0.3s ease;
        
        &:hover {
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
          border-color: #667eea;
        }
        
        &.is-focus {
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
          border-color: #667eea;
        }
      }
      
      .el-input-group__append {
        border-radius: 0 15px 15px 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        
        .el-button {
          background: transparent;
          border: none;
          color: white;
          font-weight: 600;
          
          &:hover {
            background: rgba(255, 255, 255, 0.1);
          }
        }
      }
    }
  }

  // 轮播图样式
  .carousel-card {
    margin-bottom: 30px;
    border-radius: 20px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
    border: none;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    overflow: hidden;
    
    :deep(.el-card__body) {
      padding: 0;
    }
    
    :deep(.el-carousel) {
      .el-carousel__container {
        border-radius: 20px;
      }
      
      .el-carousel__indicator {
        button {
          background-color: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          width: 12px;
          height: 12px;
          
          &.is-active {
            background-color: #667eea;
          }
        }
      }
    }
    
    .carousel-item {
      height: 300px;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      position: relative;
      
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.1) 100%);
      }
      
      .carousel-content {
        position: relative;
        z-index: 2;
        color: white;
        padding: 40px;
        max-width: 500px;
        
        h3 {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 15px;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        
        p {
          font-size: 18px;
          margin-bottom: 25px;
          opacity: 0.9;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
        }
        
        .el-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 25px;
          padding: 12px 30px;
          font-weight: 600;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          transition: all 0.3s ease;
          
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
          }
        }
      }
    }
  }

  .categories-card {
    margin-bottom: 30px;
    border-radius: 20px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
    border: none;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    overflow: hidden;
    
    :deep(.el-card__header) {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      padding: 20px 25px;
      
      .card-header {
        color: white;
        font-size: 20px;
        font-weight: 600;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
    }
    
    :deep(.el-card__body) {
      padding: 25px;
    }

    .categories-grid {
      .category-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        padding: 20px 15px;
        border-radius: 15px;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        background: rgba(255, 255, 255, 0.8);
        margin: 10px 0;
        border: 2px solid transparent;
        position: relative;
        overflow: hidden;
        
        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.1), transparent);
          transition: left 0.5s ease;
        }

        &:hover {
          color: #667eea;
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 15px 35px rgba(102, 126, 234, 0.2);
          border-color: rgba(102, 126, 234, 0.3);
          background: rgba(255, 255, 255, 1);
          
          &::before {
            left: 100%;
          }
          
          .el-icon {
            transform: scale(1.2) rotate(5deg);
            color: #667eea;
          }
        }
        
        .el-icon {
          transition: all 0.3s ease;
          margin-bottom: 8px;
        }

        span {
          margin-top: 8px;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s ease;
        }
      }
    }
  }

  .recommend-card,
  .category-card {
    margin-bottom: 30px;
    border-radius: 20px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
    border: none;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    overflow: hidden;
    
    :deep(.el-card__header) {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      padding: 20px 25px;
      
      .card-header {
        color: white;
        font-size: 20px;
        font-weight: 600;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        justify-content: space-between;
        
        .el-button {
          color: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 20px;
          padding: 8px 16px;
          font-size: 14px;
          transition: all 0.3s ease;
          
          &:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.5);
            transform: translateY(-1px);
          }
        }
      }
    }
    
    :deep(.el-card__body) {
      padding: 25px;
    }
    
    :deep(.el-col) {
      margin-bottom: 25px;
      
      .el-card {
        border-radius: 15px;
        overflow: hidden;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        border: none;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
        cursor: pointer;
        background: white;
        
        &:hover {
          transform: translateY(-10px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          
          .product-image {
            transform: scale(1.1);
          }
        }
      }
    }
    
    .product-image {
      width: 100%;
      height: 220px;
      object-fit: cover;
      display: block;
      transition: transform 0.4s ease;
    }

    .product-info {
      padding: 20px;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);

      h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
        color: #2c3e50;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 600;
        line-height: 1.4;
      }

      .price {
        margin: 12px 0 8px 0;
        font-size: 20px;
        color: #e74c3c;
        font-weight: 700;
        text-shadow: 0 1px 2px rgba(231, 76, 60, 0.2);
      }

      .stock {
        margin: 8px 0 0 0;
        font-size: 13px;
        color: #7f8c8d;
        background: rgba(127, 140, 141, 0.1);
        padding: 4px 8px;
        border-radius: 12px;
        display: inline-block;
      }
    }

    .load-more-wrapper {
      display: flex;
      justify-content: center;
      margin-top: 30px;
      padding: 25px 0;
      
      .loading-more, .no-more, .scroll-tip {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #7f8c8d;
        font-size: 15px;
        padding: 12px 24px;
        border-radius: 25px;
        background: rgba(255, 255, 255, 0.8);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .loading-more {
        color: #667eea;
        background: rgba(102, 126, 234, 0.1);
        border-color: rgba(102, 126, 234, 0.2);
        
        .el-icon {
          color: #667eea;
        }
      }
      
      .no-more {
        color: #95a5a6;
        background: rgba(149, 165, 166, 0.1);
        border-color: rgba(149, 165, 166, 0.2);
      }
      
      .scroll-tip {
        color: #34495e;
        background: rgba(52, 73, 94, 0.1);
        border-color: rgba(52, 73, 94, 0.2);
        animation: pulse 2s infinite;
      }
    }
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .home {
    padding: 15px;
    
    .search-bar {
      padding: 12px 20px;
      
      img {
        width: 50px !important;
        height: 50px !important;
      }
    }
    
    .categories-card,
    .recommend-card {
      :deep(.el-card__header) {
        padding: 15px 20px;
        
        .card-header {
          font-size: 18px;
        }
      }
      
      :deep(.el-card__body) {
        padding: 20px;
      }
    }
    
    .categories-grid {
      .category-item {
        padding: 15px 10px;
        
        span {
          font-size: 13px;
        }
      }
    }
    
    .product-info {
      padding: 15px;
      
      h3 {
        font-size: 15px;
      }
      
      .price {
        font-size: 18px;
      }
    }
  }
}

@media (max-width: 480px) {
  .home {
    padding: 10px;
    
    .search-bar {
      padding: 10px 15px;
      border-radius: 15px;
    }
    
    .categories-card,
    .recommend-card {
      border-radius: 15px;
      
      :deep(.el-card__header) {
        padding: 12px 15px;
        
        .card-header {
          font-size: 16px;
        }
      }
      
      :deep(.el-card__body) {
        padding: 15px;
      }
    }
  }
}
</style>
