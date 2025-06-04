<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Loading } from '@element-plus/icons-vue'
import { productApi } from '@/services/api'
import type { Product } from '@/types/api'

const route = useRoute()
const router = useRouter()

// 搜索相关状态
const searchQuery = ref('')
const searchResults = ref<Product[]>([])
const loading = ref(false)
const loadingMore = ref(false)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(12)
const total = ref(0)
const hasMore = ref(true)

// 筛选条件
const priceRange = ref<[number, number]>([0, 10000])
const sortBy = ref('default')

// 排序选项
const sortOptions = [
  { label: '默认排序', value: 'default' },
  { label: '价格从低到高', value: 'price_asc' },
  { label: '价格从高到低', value: 'price_desc' },
  { label: '销量从高到低', value: 'sales_desc' }
]

// 从路由参数获取搜索关键词
if (route.query.keyword) {
  searchQuery.value = route.query.keyword as string
}

// 执行搜索
const handleSearch = async (pageNum: number = 1, append: boolean = false) => {
  if (!searchQuery.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }
  
  if (pageNum === 1) {
    loading.value = true
  } else {
    loadingMore.value = true
  }
  
  try {
    const params = {
      keyword: searchQuery.value,
      pageNum,
      pageSize: pageSize.value,
      minPrice: priceRange.value[0] > 0 ? priceRange.value[0] : undefined,
      maxPrice: priceRange.value[1] < 10000 ? priceRange.value[1] : undefined,
      sort: sortBy.value !== 'default' ? sortBy.value : undefined
    }
    
    const response = await productApi.search(params)
    
    if (append) {
      searchResults.value = [...searchResults.value, ...response.products]
    } else {
      searchResults.value = response.products
    }
    
    total.value = response.total
    currentPage.value = pageNum
    hasMore.value = searchResults.value.length < total.value
    
    // 更新URL参数
    router.replace({
      path: '/search',
      query: { 
        keyword: searchQuery.value,
        minPrice: priceRange.value[0] > 0 ? priceRange.value[0].toString() : undefined,
        maxPrice: priceRange.value[1] < 10000 ? priceRange.value[1].toString() : undefined,
        sort: sortBy.value !== 'default' ? sortBy.value : undefined
      }
    })
  } catch (error) {
    console.error('搜索失败:', error)
    ElMessage.error('搜索失败，请重试')
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 加载更多
const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  
  const nextPage = currentPage.value + 1
  await handleSearch(nextPage, true)
}

// 重置搜索
const resetSearch = () => {
  currentPage.value = 1
  handleSearch()
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

const handleProductClick = (productId: number) => {
  router.push({
    path: `/product/${productId}`
  })
}

// 页面挂载时如果有搜索关键词则自动搜索
onMounted(() => {
  // 从URL参数恢复筛选条件
  if (route.query.minPrice) {
    priceRange.value[0] = Number(route.query.minPrice)
  }
  if (route.query.maxPrice) {
    priceRange.value[1] = Number(route.query.maxPrice)
  }
  if (route.query.sort) {
    sortBy.value = route.query.sort as string
  }
  
  if (searchQuery.value) {
    handleSearch()
  }
  
  window.addEventListener('scroll', handleScroll)
})

// 页面卸载时移除滚动监听
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="search-view">
    <!-- 搜索栏 -->
    <el-card class="search-card">
      <el-input
        v-model="searchQuery"
        placeholder="搜索商品名称或描述"
        class="search-input"
        @keyup.enter="() => handleSearch()"
      >
        <template #append>
          <el-button :icon="Search" @click="() => handleSearch()">搜索</el-button>
        </template>
      </el-input>
    </el-card>

    <!-- 筛选条件 -->
    <el-card class="filter-card" v-if="searchQuery">
      <template #header>
        <div class="card-header">
          <span>筛选条件</span>
        </div>
      </template>
      <el-row :gutter="20" class="filter-row">
        <el-col :span="8">
          <div class="filter-item">
            <label>价格区间：</label>
            <el-slider
              v-model="priceRange"
              range
              :min="0"
              :max="10000"
              :step="100"
              show-input
              @change="() => resetSearch()"
            />
          </div>
        </el-col>
        <el-col :span="6">
          <div class="filter-item">
            <label>排序方式：</label>
            <el-select v-model="sortBy" @change="() => resetSearch()" style="width: 100%">
              <el-option
                v-for="option in sortOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </div>
        </el-col>
        <el-col :span="4">
          <el-button @click="() => { priceRange = [0, 10000]; sortBy = 'default'; resetSearch(); }">重置筛选</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 搜索结果 -->
    <el-card v-if="searchResults.length > 0 || loading" class="results-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>搜索结果 (共{{ total }}件商品)</span>
        </div>
      </template>
      <el-row :gutter="20">
        <el-col
          v-for="product in searchResults"
          :key="product.id"
          :span="6"
          @click="handleProductClick(product.id)"
        >
          <el-card :body-style="{ padding: '0px' }" shadow="hover" class="product-card">
            <img :src="product.image" class="product-image" />
            <div class="product-info">
              <h3>{{ product.title }}</h3>
              <p class="description">{{ product.description }}</p>
              <p class="price">¥{{ product.price }}</p>
              <p class="stock">库存: {{ product.stock || 0 }} 件</p>
            </div>
          </el-card>
        </el-col>
      </el-row>
      
      <!-- 加载更多提示 -->
      <div class="load-more-wrapper" v-if="searchResults.length > 0">
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

    <!-- 无搜索结果 -->
    <el-card v-else-if="searchQuery && !loading" class="no-results-card">
      <el-empty description="没有找到相关商品" />
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.search-view {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
  padding: 20px;
  
  .search-card {
    margin-bottom: 30px;
    border-radius: 20px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
    border: none;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    overflow: hidden;
    
    :deep(.el-card__body) {
      padding: 30px;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
      text-align: center;
    }
  }

  .search-input {
    max-width: 700px;
    margin: 0 auto;
    
    :deep(.el-input__wrapper) {
      border-radius: 25px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
      border: 2px solid rgba(102, 126, 234, 0.2);
      transition: all 0.3s ease;
      background: white;
      
      &:hover {
        border-color: #667eea;
        box-shadow: 0 12px 35px rgba(102, 126, 234, 0.2);
      }
      
      &.is-focus {
        border-color: #667eea;
        box-shadow: 0 12px 35px rgba(102, 126, 234, 0.3);
      }
    }
    
    :deep(.el-input-group__append) {
      border-radius: 0 25px 25px 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      
      .el-button {
        background: transparent;
        border: none;
        color: white;
        font-weight: 600;
        padding: 12px 20px;
        
        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      }
    }
  }

  .filter-card {
    margin-bottom: 30px;
    border-radius: 20px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
    border: none;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    overflow: hidden;
    
    :deep(.el-card__body) {
      padding: 25px;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
    }
    
    :deep(.el-card__header) {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px 25px;
      border-bottom: none;
      
      .card-header {
        font-size: 18px;
        font-weight: 700;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
    }
    
    .filter-row {
      align-items: end;
    }
    
    .filter-item {
      label {
        display: block;
        margin-bottom: 12px;
        font-weight: 600;
        color: #2c3e50;
        font-size: 15px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }
      
      :deep(.el-slider) {
        .el-slider__runway {
          background: rgba(102, 126, 234, 0.2);
          border-radius: 10px;
        }
        
        .el-slider__bar {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
        }
        
        .el-slider__button {
          border: 3px solid #667eea;
          background: white;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
          
          &:hover {
            transform: scale(1.2);
          }
        }
      }
      
      :deep(.el-select) {
        .el-input__wrapper {
          border-radius: 15px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(102, 126, 234, 0.2);
          transition: all 0.3s ease;
          
          &:hover {
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.2);
            border-color: #667eea;
          }
          
          &.is-focus {
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
            border-color: #667eea;
          }
        }
      }
    }
    
    :deep(.el-button) {
      border-radius: 15px;
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      border: none;
      color: white;
      font-weight: 600;
      padding: 12px 20px;
      box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
      transition: all 0.3s ease;
      
      &:hover {
        background: linear-gradient(135deg, #d62c1a 0%, #a93226 100%);
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(231, 76, 60, 0.4);
      }
    }
  }

  .results-card,
  .no-results-card {
    margin-bottom: 30px;
    border-radius: 20px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
    border: none;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    overflow: hidden;
    
    :deep(.el-card__body) {
      padding: 25px;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
    }
    
    :deep(.el-card__header) {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px 25px;
      border-bottom: none;
      
      .card-header {
        font-size: 18px;
        font-weight: 700;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
    }
  }

  .product-card {
    margin-bottom: 25px;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    border: none;
    border-radius: 15px;
    overflow: hidden;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
    background: white;
    position: relative;
    
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
      z-index: 1;
    }

    &:hover {
      transform: translateY(-12px) scale(1.03);
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
      
      &::before {
        opacity: 1;
      }

      .product-image {
        transform: scale(1.15) rotate(2deg);
      }
      
      .product-info {
        transform: translateY(-5px);
      }
    }
  }

  .product-image {
    width: 100%;
    height: 220px;
    object-fit: cover;
    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 1;
  }

  .product-info {
    padding: 18px;
    background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
    position: relative;
    z-index: 3;
    transition: transform 0.3s ease;

    h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
      color: #2c3e50;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
      transition: color 0.3s ease;
    }

    .description {
      margin: 10px 0;
      font-size: 14px;
      color: #7f8c8d;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      line-height: 1.5;
      font-weight: 500;
    }

    .price {
      margin: 12px 0 8px 0;
      color: #e74c3c;
      font-size: 20px;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(231, 76, 60, 0.2);
      position: relative;
      
      &::before {
        content: '¥';
        font-size: 14px;
        margin-right: 2px;
        opacity: 0.8;
      }
    }

    .stock {
      margin: 8px 0 0 0;
      font-size: 12px;
      color: #27ae60;
      background: rgba(39, 174, 96, 0.1);
      padding: 4px 8px;
      border-radius: 10px;
      display: inline-block;
      font-weight: 500;
      border: 1px solid rgba(39, 174, 96, 0.2);
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
      font-size: 15px;
      font-weight: 500;
      padding: 12px 20px;
      border-radius: 20px;
      backdrop-filter: blur(10px);
    }
    
    .loading-more {
      color: #667eea;
      background: rgba(102, 126, 234, 0.1);
      border: 1px solid rgba(102, 126, 234, 0.2);
      
      .el-icon {
        font-size: 18px;
      }
    }
    
    .no-more {
      color: #7f8c8d;
      background: rgba(127, 140, 141, 0.1);
      border: 1px solid rgba(127, 140, 141, 0.2);
    }
    
    .scroll-tip {
      color: #2c3e50;
      background: rgba(44, 62, 80, 0.1);
      border: 1px solid rgba(44, 62, 80, 0.2);
    }
  }
  
  .no-results-card {
    :deep(.el-empty) {
      padding: 40px 20px;
      
      .el-empty__image {
        width: 120px;
        height: 120px;
      }
      
      .el-empty__description {
        font-size: 16px;
        color: #7f8c8d;
        font-weight: 500;
        margin-top: 20px;
      }
    }
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .search-view {
    :deep(.el-col) {
      &[class*="span-6"] {
        flex: 0 0 25%;
        max-width: 25%;
      }
    }
  }
}

@media (max-width: 992px) {
  .search-view {
    :deep(.el-col) {
      &[class*="span-6"] {
        flex: 0 0 33.333333%;
        max-width: 33.333333%;
      }
      
      &[class*="span-8"] {
        flex: 0 0 50%;
        max-width: 50%;
      }
      
      &[class*="span-4"] {
        flex: 0 0 25%;
        max-width: 25%;
      }
    }
  }
}

@media (max-width: 768px) {
  .search-view {
    padding: 15px;
    
    .search-card,
    .filter-card,
    .results-card,
    .no-results-card {
      border-radius: 15px;
      
      :deep(.el-card__body) {
        padding: 20px;
      }
      
      :deep(.el-card__header) {
        padding: 15px 20px;
      }
    }
    
    .search-input {
      max-width: 100%;
      
      :deep(.el-input__wrapper) {
        border-radius: 20px;
      }
      
      :deep(.el-input-group__append) {
        border-radius: 0 20px 20px 0;
      }
    }
    
    .filter-card {
      .filter-row {
        flex-direction: column;
        gap: 15px;
        
        .el-col {
          width: 100% !important;
          flex: none !important;
          max-width: 100% !important;
        }
      }
    }
    
    .product-image {
      height: 180px;
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
    
    :deep(.el-col) {
      &[class*="span-6"] {
        flex: 0 0 50%;
        max-width: 50%;
      }
    }
  }
}

@media (max-width: 480px) {
  .search-view {
    padding: 10px;
    
    .search-card,
    .filter-card,
    .results-card,
    .no-results-card {
      border-radius: 12px;
      margin-bottom: 20px;
      
      :deep(.el-card__body) {
        padding: 15px;
      }
      
      :deep(.el-card__header) {
        padding: 12px 15px;
        
        .card-header {
          font-size: 16px;
        }
      }
    }
    
    .search-input {
      :deep(.el-input__wrapper) {
        border-radius: 15px;
      }
      
      :deep(.el-input-group__append) {
        border-radius: 0 15px 15px 0;
        
        .el-button {
          padding: 10px 15px;
          font-size: 14px;
        }
      }
    }
    
    .filter-item {
      label {
        font-size: 14px;
      }
    }
    
    .product-image {
      height: 160px;
    }
    
    .product-info {
      padding: 12px;
      
      h3 {
        font-size: 14px;
      }
      
      .description {
        font-size: 13px;
      }
      
      .price {
        font-size: 16px;
      }
      
      .stock {
        font-size: 11px;
        padding: 3px 6px;
      }
    }
    
    .load-more-wrapper {
      margin-top: 20px;
      padding: 20px 0;
      
      .loading-more, .no-more, .scroll-tip {
        font-size: 14px;
        padding: 10px 15px;
      }
    }
    
    :deep(.el-col) {
      &[class*="span-6"] {
        flex: 0 0 100%;
        max-width: 100%;
      }
    }
  }
}
</style>