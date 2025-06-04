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

// 默认搜索功能
const performDefaultSearch = async () => {
  loading.value = true
  try {
    // 使用搜索API进行默认搜索
    const response = await productApi.search({
      keyword: '智能',
      pageNum: 1,
      pageSize: 20
    })
    products.value = response.products
  } catch (error) {
    console.error('默认搜索失败:', error)
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
  } else {
    // 如果没有分类参数，执行默认搜索
    performDefaultSearch()
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
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
  padding: 20px;
  
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
  }

  .filter-label {
    margin-right: 15px;
    font-weight: 600;
    color: #2c3e50;
    font-size: 15px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .price-filter,
  .sort-filter {
    display: flex;
    align-items: center;
    padding: 15px 0;
    
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
    }
  }

  .products-card {
    border-radius: 20px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
    border: none;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    margin-bottom: 30px;
    overflow: hidden;

    :deep(.el-card__body) {
      padding: 25px;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
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

  .product-image-container {
    height: 240px;
    overflow: hidden;
    position: relative;
    background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 30px;
      background: linear-gradient(to top, rgba(255, 255, 255, 0.8), transparent);
      z-index: 2;
    }
  }

  .product-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 1;
  }

  .product-info {
    padding: 20px;
    background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
    position: relative;
    z-index: 3;
    transition: transform 0.3s ease;

    h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      color: #2c3e50;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.5;
      font-weight: 600;
      transition: color 0.3s ease;
    }

    .price {
      margin: 12px 0 10px 0;
      color: #e74c3c;
      font-size: 22px;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(231, 76, 60, 0.2);
      position: relative;
      
      &::before {
        content: '¥';
        font-size: 16px;
        margin-right: 2px;
        opacity: 0.8;
      }
    }

    .sales {
      margin: 8px 0 6px 0;
      font-size: 13px;
      color: #7f8c8d;
      background: rgba(127, 140, 141, 0.1);
      padding: 4px 10px;
      border-radius: 12px;
      display: inline-block;
      font-weight: 500;
    }

    .stock {
      margin: 8px 0 0 0;
      font-size: 13px;
      color: #27ae60;
      background: rgba(39, 174, 96, 0.1);
      padding: 4px 10px;
      border-radius: 12px;
      display: inline-block;
      font-weight: 500;
      border: 1px solid rgba(39, 174, 96, 0.2);
    }
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .products-view {
    :deep(.el-col) {
      &[class*="span-4"] {
        flex: 0 0 20%;
        max-width: 20%;
      }
    }
  }
}

@media (max-width: 992px) {
  .products-view {
    :deep(.el-col) {
      &[class*="span-4"] {
        flex: 0 0 33.333333%;
        max-width: 33.333333%;
      }
    }
  }
}

@media (max-width: 768px) {
  .products-view {
    padding: 15px;
    
    .filter-card,
    .products-card {
      border-radius: 15px;
      
      :deep(.el-card__body) {
        padding: 20px;
      }
    }
    
    .price-filter,
    .sort-filter {
      padding: 12px 0;
      
      .filter-label {
        font-size: 14px;
      }
    }
    
    .product-image-container {
      height: 200px;
    }
    
    .product-info {
      padding: 15px;
      
      h3 {
        font-size: 15px;
      }
      
      .price {
        font-size: 20px;
      }
    }
    
    :deep(.el-col) {
      &[class*="span-4"] {
        flex: 0 0 50%;
        max-width: 50%;
      }
    }
  }
}

@media (max-width: 480px) {
  .products-view {
    padding: 10px;
    
    .filter-card,
    .products-card {
      border-radius: 12px;
      
      :deep(.el-card__body) {
        padding: 15px;
      }
    }
    
    .price-filter {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
      
      :deep(.el-slider) {
        width: 100% !important;
      }
    }
    
    .sort-filter {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
      
      :deep(.el-select) {
        width: 100%;
      }
    }
    
    .product-image-container {
      height: 180px;
    }
    
    .product-info {
      padding: 12px;
      
      h3 {
        font-size: 14px;
      }
      
      .price {
        font-size: 18px;
      }
      
      .sales,
      .stock {
        font-size: 12px;
        padding: 3px 8px;
      }
    }
    
    :deep(.el-col) {
      &[class*="span-4"] {
        flex: 0 0 100%;
        max-width: 100%;
      }
    }
  }
}
</style>