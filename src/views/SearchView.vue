<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { productApi } from '@/services/api'
import type { Product } from '@/types/api'

const route = useRoute()
const router = useRouter()

// 搜索相关状态
const searchQuery = ref('')
const searchResults = ref<Product[]>([])
const loading = ref(false)

// 从路由参数获取搜索关键词
if (route.query.keyword) {
  searchQuery.value = route.query.keyword as string
}

// 执行搜索
const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }
  
  loading.value = true
  try {
    const response = await productApi.search(searchQuery.value)
    searchResults.value = response // 直接赋值，因为api返回的是Product[]类型
    
    // 更新URL参数
    router.replace({
      path: '/search',
      query: { keyword: searchQuery.value }
    })
  } catch (error) {
    console.error('搜索失败:', error)
    ElMessage.error('搜索失败，请重试')
  } finally {
    loading.value = false
  }
}

const handleProductClick = (productId: number) => {
  router.push({
    path: `/product/${productId}`
  })
}

// 页面挂载时如果有搜索关键词则自动搜索
onMounted(() => {
  if (searchQuery.value) {
    handleSearch()
  }
})
</script>

<template>
  <div class="search-view">
    <el-card class="search-card">
      <el-input
        v-model="searchQuery"
        placeholder="搜索商品名称或描述"
        class="search-input"
        @keyup.enter="handleSearch"
      >
        <template #append>
          <el-button :icon="Search" @click="handleSearch">搜索</el-button>
        </template>
      </el-input>
    </el-card>

    <el-card v-if="searchResults.length > 0" class="results-card">
      <template #header>
        <div class="card-header">
          <span>搜索结果</span>
        </div>
      </template>
      <el-row :gutter="20">
        <el-col
          v-for="product in searchResults"
          :key="product.id"
          :span="8"
          @click="handleProductClick(product.id)"
        >
          <el-card :body-style="{ padding: '0px' }" shadow="hover" class="product-card">
            <img :src="product.image" class="product-image" />
            <div class="product-info">
              <h3>{{ product.title }}</h3>
              <p class="description">{{ product.description }}</p>
              <p class="price">¥{{ product.price }}</p>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <el-empty
      v-else-if="searchQuery && searchResults.length === 0"
      description="未找到相关商品"
    />
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

  .results-card {
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
  }
}
</style>