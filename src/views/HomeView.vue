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
    <div class="search-bar" style="display: flex; align-items: center; justify-content: space-between; margin: 20px 0; height: 50px;">
      <img src="/src/assets/logo1.jpg" alt="Logo" style="flex-shrink: 0; width: 60px; height: 60px;" />
      <el-input v-model="searchQuery" placeholder="搜索商品名称或描述" class="search-input" @keyup.enter="handleSearch" style="flex-grow: 1; margin: 0 10px; height: 100%;">
        <template #append>
          <el-button :icon="Search" @click="handleSearch">搜索</el-button>
        </template>
      </el-input>
    </div>

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
            type="text" 
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
  .categories-card {
    margin-bottom: 20px;

    .categories-grid {
      .category-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        padding: 10px;
        transition: all 0.3s;

        &:hover {
          color: #409eff;
          transform: translateY(-2px);
        }

        span {
          margin-top: 8px;
        }
      }
    }
  }

  .recommend-card,
  .category-card {
    margin-bottom: 20px;
    .product-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
      display: block;
    }

    .product-info {
      padding: 14px;

      h3 {
        margin: 0;
        font-size: 16px;
        color: #303133;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .price {
        margin: 8px 0 0;
        font-size: 18px;
        color: #f56c6c;
        font-weight: bold;
      }

      .stock {
        margin: 4px 0 0;
        font-size: 12px;
        color: #909399;
      }
    }

    .load-more-wrapper {
      display: flex;
      justify-content: center;
      margin-top: 20px;
      padding: 20px 0;
      
      .loading-more, .no-more, .scroll-tip {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #909399;
        font-size: 14px;
      }
      
      .loading-more {
        color: #409eff;
      }
      
      .no-more {
        color: #909399;
      }
      
      .scroll-tip {
        color: #606266;
      }
    }
  }
}
</style>
