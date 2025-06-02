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
  display: block;
  
  .search-card {
    margin-bottom: 20px;
  }

  .search-input {
    max-width: 600px;
    margin: 0 auto;
  }

  .filter-card {
    margin-bottom: 20px;
    
    .filter-row {
      align-items: end;
    }
    
    .filter-item {
      label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #606266;
      }
    }
  }

  .results-card,
  .no-results-card {
    margin-bottom: 20px;
  }

  .product-card {
    margin-bottom: 20px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    }
  }

  .product-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }

  .product-info {
    padding: 14px;

    h3 {
      margin: 0;
      font-size: 16px;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .description {
      margin: 10px 0;
      font-size: 14px;
      color: #666;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .price {
      margin: 10px 0 0;
      color: #f56c6c;
      font-size: 20px;
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
</style>