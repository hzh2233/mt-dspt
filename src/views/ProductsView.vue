<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { productApi } from '@/services/api'
import type { Product } from '@/types/api'

const route = useRoute()
const router = useRouter()

// 商品列表数据
const products = ref<Product[]>([])
const loading = ref(false)

// 筛选和排序选项
const sortOptions = ref([
  { label: '默认排序', value: 'default' },
  { label: '价格从低到高', value: 'price-asc' },
  { label: '价格从高到低', value: 'price-desc' },
  { label: '销量从高到低', value: 'sales-desc' }
])

const currentSort = ref('default')
const priceRange = ref([0, 10000])

// 获取商品数据
const fetchProducts = async (categoryId: string) => { // 修改参数类型为string
  loading.value = true
  try {
    const response = await productApi.getByCategory({
      category: parseInt(categoryId),
      pageNum: 1,
      pageSize: 20
    })
    products.value = response.products // 使用新的API返回格式
  } catch (error) {
    console.error('获取商品列表失败:', error)
    ElMessage.error('获取商品列表失败')
  } finally {
    loading.value = false
  }
}

// 页面挂载时获取商品数据
onMounted(() => {
  const categoryId = route.query.category
  if (categoryId) {
    fetchProducts(categoryId as string) // 传递string类型的categoryId
  }
})

// 排序商品
const sortedProducts = computed(() => {
  let result = [...products.value]

  // 价格范围筛选
  result = result.filter(
    product => product.price >= priceRange.value[0] && product.price <= priceRange.value[1]
  )

  // 排序
  switch (currentSort.value) {
    case 'price-asc':
      result.sort((a, b) => a.price - b.price)
      break
    case 'price-desc':
      result.sort((a, b) => b.price - a.price)
      break
    case 'sales-desc':
      result.sort((a, b) => (b.sales || 0) - (a.sales || 0)) // 为 sales 添加默认值 0
      break
    default:
      break
  }

  return result
})

const handleProductClick = (product: Product) => {
  router.push({
    path: `/product/${product.id}`
  })
}
</script>

<template>
  <div class="products-view">
    <!-- 筛选栏 -->
    <el-card class="filter-card">
      <el-row :gutter="20" align="middle" justify="start">
        <el-col :span="8">
          <div class="price-filter">
            <span class="filter-label">价格范围：</span>
            <el-slider
              v-model="priceRange"
              range
              :min="0"
              :max="10000"
              :step="100"
              :marks="{
                0: '0',
                10000: '10000'
              }"
              style="width: 300px"
            />
          </div>
        </el-col>
        <el-col :span="6">
          <div class="sort-filter">
            <span class="filter-label">排序方式：</span>
            <el-select v-model="currentSort" placeholder="请选择排序方式" style="width: 200px">
              <el-option
                v-for="option in sortOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 商品列表 -->
    <el-card class="products-card">
      <el-row :gutter="24">
        <el-col
          v-for="product in sortedProducts"
          :key="product.id"
          :span="4"
          :sm="8"
          :md="6"
          :lg="4"
          :xl="4"
        >
          <el-card
            :body-style="{ padding: '0px' }"
            shadow="hover"
            class="product-card"
            @click="handleProductClick(product)"
          >
            <div class="product-image-container">
              <img :src="product.image" class="product-image" />
            </div>
            <div class="product-info">
              <h3>{{ product.title }}</h3>
              <p class="price">¥{{ product.price }}</p>
              <p class="sales">已售 {{ product.sales }} 件</p>
              <p class="stock">库存: {{ product.stock || 0 }} 件</p>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.products-view {
  .filter-card {
    margin-bottom: 20px;
    background-color: #fff;
  }

  .filter-label {
    margin-right: 10px;
    font-weight: 500;
    color: #333;
  }

  .price-filter,
  .sort-filter {
    display: flex;
    align-items: center;
    padding: 10px 0;
  }

  .products-card {
    background-color: #fff;
    margin-bottom: 20px;

    :deep(.el-card__body) {
      padding: 20px;
    }
  }

  .product-card {
    margin-bottom: 24px;
    cursor: pointer;
    transition: all 0.3s;
    border: none;
    border-radius: 8px;
    overflow: hidden;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);

      .product-image {
        transform: scale(1.05);
      }
    }
  }

  .product-image-container {
    height: 220px;
    overflow: hidden;
  }

  .product-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .product-info {
    padding: 16px;
    background-color: #fff;

    h3 {
      margin: 0;
      font-size: 16px;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.5;
    }

    .price {
      margin: 12px 0 8px;
      color: #f56c6c;
      font-size: 20px;
      font-weight: bold;
    }

    .sales {
      margin: 0;
      font-size: 12px;
      color: #909399;
    }

    .stock {
      margin: 4px 0 0;
      font-size: 12px;
      color: #909399;
    }
  }
}
</style>