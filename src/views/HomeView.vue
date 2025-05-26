<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { productApi } from '@/services/api'
import type { Product } from '@/types/api'



const router = useRouter()

// 模拟商品分类数据
const categories = ref([
  { id: 1, name: '手机数码', icon: 'Phone' },
  { id: 2, name: '电脑办公', icon: 'Monitor' },
  { id: 3, name: '家用电器', icon: 'HomeFilled' },
  { id: 4, name: '服装鞋包', icon: 'ShoppingBag' },
  { id: 5, name: '食品生鲜', icon: 'Food' },
  { id: 6, name: '图书文娱', icon: 'Reading' }
])

// 推荐商品数据
const recommendProducts = ref<Product[]>([])
const loading = ref(false)

// 获取推荐商品数据
const fetchRecommendProducts = async () => {
  loading.value = true
  try {
    const response = await productApi.getRecommended()
    recommendProducts.value = response // 直接赋值，因为api返回的是Product[]类型
  } catch (error) {
    console.error('获取推荐商品失败:', error)
    ElMessage.error('获取推荐商品失败')
  } finally {
    loading.value = false
  }
}

// 页面挂载时获取推荐商品数据
onMounted(() => {
  fetchRecommendProducts()
})

const handleCategoryClick = (categoryId: number) => {
  router.push({
    path: '/products',
    query: { category: categoryId }
  })
}

const handleProductClick = (product: Product) => {
  router.push({
    path: `/product/${product.id}`
  })
}

const searchQuery = ref('')

const handleSearch = async () => {
  if (searchQuery.value.trim()) {
    // 只传递搜索关键词到搜索页面
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
    <el-card class="categories-card">
      <template #header>
        <div class="card-header">
          <span>商品分类</span>
        </div>
      </template>
      <div class="categories-grid">
        <el-row :gutter="20">
          <el-col
            v-for="category in categories"
            :key="category.id"
            :span="4"
            @click="handleCategoryClick(category.id)"
          >
            <div class="category-item">
              <el-icon :size="24">
                <component :is="category.icon" />
              </el-icon>
              <span>{{ category.name }}</span>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- 推荐商品 -->
    <el-card class="recommend-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>推荐商品</span>
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
            </div>
          </el-card>
        </el-col>
      </el-row>
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

  .recommend-card {
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
    }
  }
}
</style>
