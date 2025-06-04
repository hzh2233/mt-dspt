<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { productApi, cartApi } from '@/services/api'
import type { CartItem, Product } from '@/types/api'
import { Delete, Refresh, Warning, Loading } from '@element-plus/icons-vue'

const router = useRouter()
const cartStore = useCartStore()
const userStore = useUserStore()

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const isLoadingMore = ref(false)

// 购物车商品数据（包含商品详细信息）
const enrichedCartItems = ref<(CartItem & { productInfo?: Product, priceChanged?: boolean })[]>([])
const loading = ref(false)
const productLoading = ref(false)

// 选中的商品ID列表
const selectedItems = ref<number[]>([])

// 是否还有更多数据
const hasMore = computed(() => {
  return enrichedCartItems.value.length < total.value
})

// 计算选中商品的总价（使用当前价格）
const selectedTotalPrice = computed(() => {
  return enrichedCartItems.value
    .filter(item => selectedItems.value.includes(item.id))
    .reduce((total, item) => {
      const currentPrice = item.productInfo?.price || item.price
      return total + currentPrice * item.quantity
    }, 0)
})

// 计算选中商品的原始总价（加入时价格）
const selectedOriginalPrice = computed(() => {
  return enrichedCartItems.value
    .filter(item => selectedItems.value.includes(item.id))
    .reduce((total, item) => total + item.price * item.quantity, 0)
})

// 计算总价差异
const totalPriceDiff = computed(() => {
  return selectedTotalPrice.value - selectedOriginalPrice.value
})

// 是否有价格变化的商品被选中
const hasSelectedPriceChanged = computed(() => {
  return enrichedCartItems.value
    .filter(item => selectedItems.value.includes(item.id))
    .some(item => item.priceChanged)
})

// 获取购物车分页数据并获取商品详细信息
const fetchCartWithPagination = async (page: number = 1, append: boolean = false) => {
  if (page === 1) {
    loading.value = true
  } else {
    isLoadingMore.value = true
  }
  
  try {
    // 获取分页购物车数据
    const response = await cartApi.getCartWithPagination({
      page,
      size: pageSize.value
    })
    
    // 获取商品详细信息并对比价格
    const enrichedItems = await Promise.all(
      response.items.map(async (cartItem) => {
        try {
          const productInfo = await productApi.getDetail(cartItem.productId)
          const priceChanged = Math.abs(productInfo.price - cartItem.price) > 0.01
          
          return {
            ...cartItem,
            productInfo,
            priceChanged,
            // 使用商品详情中的图片和标题
            image: productInfo.image || cartItem.image,
            title: productInfo.title || cartItem.title
          }
        } catch (error) {
          console.error(`获取商品${cartItem.productId}详情失败:`, error)
          return {
            ...cartItem,
            productInfo: undefined,
            priceChanged: false
          }
        }
      })
    )
    
    if (append) {
      // 追加数据
      enrichedCartItems.value = [...enrichedCartItems.value, ...enrichedItems]
    } else {
      // 替换数据
      enrichedCartItems.value = enrichedItems
    }
    
    total.value = response.total
    currentPage.value = page
    
  } catch (error) {
    console.error('获取购物车数据失败:', error)
    ElMessage.error('获取购物车数据失败')
  } finally {
    loading.value = false
    isLoadingMore.value = false
  }
}

// 加载更多数据
const loadMore = async () => {
  if (isLoadingMore.value || !hasMore.value) return
  
  const nextPage = currentPage.value + 1
  await fetchCartWithPagination(nextPage, true)
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

// 页面加载时初始化购物车
onMounted(async () => {
  // 检查用户是否已登录，避免在未登录时发送请求
  if (userStore.isAuthenticated) {
    await fetchCartWithPagination(1)
  }
  window.addEventListener('scroll', handleScroll)
})

// 页面卸载时移除滚动监听
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// 刷新购物车
const refreshCart = async () => {
  currentPage.value = 1
  selectedItems.value = []
  await fetchCartWithPagination(1)
  ElMessage.success('购物车已刷新')
}

// 更新商品数量
const updateQuantity = async (itemId: number, newQuantity: number) => {
  if (newQuantity <= 0) {
    await removeItem(itemId)
  } else {
    await cartStore.updateItemQuantity(itemId, newQuantity)
    // 更新本地数据
    const item = enrichedCartItems.value.find(i => i.id === itemId)
    if (item) {
      item.quantity = newQuantity
    }
  }
}

// 移除商品
const removeItem = async (itemId: number) => {
  try {
    await cartStore.removeItem(itemId)
    selectedItems.value = selectedItems.value.filter(id => id !== itemId)
    // 重新加载第一页数据
    currentPage.value = 1
    await fetchCartWithPagination(1)
    ElMessage.success('商品已删除')
  } catch (error) {
    console.error('删除商品失败:', error)
    ElMessage.error('删除商品失败')
  }
}

// 删除选中的商品
const removeSelectedItems = async () => {
  if (selectedItems.value.length === 0) {
    ElMessage.warning('请先选择要删除的商品')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedItems.value.length} 件商品吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await cartStore.removeBatchItems(selectedItems.value)
    selectedItems.value = []
    // 重新加载第一页数据
    currentPage.value = 1
    await fetchCartWithPagination(1)
    ElMessage.success('已删除选中的商品')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除商品失败:', error)
    }
  }
}

// 清空购物车
const clearCart = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空购物车吗？此操作不可恢复。',
      '确认清空',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await cartStore.clearCart()
    enrichedCartItems.value = []
    selectedItems.value = []
    total.value = 0
    currentPage.value = 1
    ElMessage.success('购物车已清空')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空购物车失败:', error)
    }
  }
}



// 跳转到商品详情页
const goToProductDetail = (productId: number) => {
  router.push(`/product/${productId}`)
}

// 跳转到结算页面
const goToCheckout = () => {
  if (selectedItems.value.length === 0) {
    ElMessage.warning('请先选择要结算的商品')
    return
  }
  
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再进行结算')
    router.push('/login')
    return
  }
  
  // 将选中的商品信息和购物车ID保存到localStorage
  const selectedItemsData = enrichedCartItems.value.filter(item => selectedItems.value.includes(item.id))
  const checkoutData = {
    items: selectedItemsData,
    cartIds: selectedItems.value // 保存选中的购物车ID，用于订单提交后删除
  }
  localStorage.setItem('checkoutItems', JSON.stringify(checkoutData))
  router.push('/checkout')
}
</script>

<template>
  <div class="cart-view">
    <div class="cart-container">
      <!-- 左侧购物车商品列表 -->
      <div class="cart-left">
        <el-card class="cart-card" v-loading="loading">
          <template #header>
            <div class="card-header">
              <span>购物车</span>
              <div class="header-actions">
                <el-button :icon="Refresh" @click="refreshCart" :loading="loading">刷新</el-button>
              </div>
            </div>
          </template>

          <div v-if="enrichedCartItems.length > 0" class="cart-items">
            <el-table 
              :data="enrichedCartItems" 
              style="width: 100%" 
              @selection-change="selectedItems = $event.map((item: CartItem) => item.id)"
              v-loading="loading"
              element-loading-text="正在加载购物车数据..."
            >
          <el-table-column type="selection" width="50" />
          <el-table-column label="商品信息" min-width="280">
            <template #default="{ row }">
              <div class="product-info" @click="goToProductDetail(row.productId)">
                <div class="product-image-container">
                  <img 
                    :src="row.image || '/placeholder.jpg'" 
                    class="product-image" 
                    @error="($event.target as HTMLImageElement).src = '/placeholder.jpg'"
                  />
                  <el-tag v-if="row.priceChanged" type="warning" size="small" class="price-change-tag">
                    <el-icon><Warning /></el-icon>
                    价格变动
                  </el-tag>
                </div>
                <div class="product-details">
                  <div class="product-title">{{ row.title }}</div>
                  <div v-if="row.productInfo" class="product-meta">
                    <span class="stock-info">库存: {{ row.productInfo.stock || '未知' }}</span>
                  </div>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="价格" width="200">
            <template #default="{ row }">
              <div class="price-container">
                <div class="cart-price">
                  <span class="price-label">加入时价格:</span>
                  <span class="price">¥{{ row.price.toFixed(2) }}</span>
                </div>
                <div v-if="row.productInfo" class="current-price">
                  <span class="price-label">当前价格:</span>
                  <span class="price" :class="{ 'price-up': row.productInfo.price > row.price, 'price-down': row.productInfo.price < row.price }">
                    ¥{{ row.productInfo.price.toFixed(2) }}
                  </span>
                  <div v-if="row.priceChanged" class="price-change-info">
                    <span class="price-diff" :class="{ 'diff-up': row.productInfo.price > row.price, 'diff-down': row.productInfo.price < row.price }">
                      {{ row.productInfo.price > row.price ? '涨价' : '降价' }} ¥{{ Math.abs(row.productInfo.price - row.price).toFixed(2) }}
                    </span>
                    <span class="price-percentage" :class="{ 'diff-up': row.productInfo.price > row.price, 'diff-down': row.productInfo.price < row.price }">
                      ({{ row.productInfo.price > row.price ? '+' : '-' }}{{ (Math.abs(row.productInfo.price - row.price) / row.price * 100).toFixed(1) }}%)
                    </span>
                  </div>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="数量" width="140">
            <template #default="{ row }">
              <div class="quantity-wrapper">
                <el-input-number
                  v-model="row.quantity"
                  :min="1"
                  :max="row.productInfo?.stock || 999"
                  @change="updateQuantity(row.id, row.quantity)"
                  size="default"
                  controls-position="right"
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column label="小计" width="130">
            <template #default="{ row }">
              <div class="subtotal-container">
                <span class="subtotal">¥{{ ((row.productInfo?.price || row.price) * row.quantity).toFixed(2) }}</span>
                <div v-if="row.productInfo && row.priceChanged" class="subtotal-note">
                  <span class="original-subtotal">原: ¥{{ (row.price * row.quantity).toFixed(2) }}</span>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button type="danger" :icon="Delete" circle @click="removeItem(row.id)" size="small" />
            </template>
          </el-table-column>
        </el-table>

        <!-- 滚动加载更多 -->
        <div class="load-more-container" v-if="hasMore || isLoadingMore">
          <el-button 
            v-if="hasMore && !isLoadingMore"
            @click="loadMore"
            type="primary"
            plain
            class="load-more-btn"
          >
            加载更多 (还有 {{ total - enrichedCartItems.length }} 件商品)
          </el-button>
          <div v-if="isLoadingMore" class="loading-more">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>正在加载更多...</span>
          </div>
        </div>

            <!-- 底部操作栏 -->
            <div class="cart-actions">
              <el-button type="danger" @click="removeSelectedItems" :disabled="selectedItems.length === 0">删除选中</el-button>
              <el-button type="warning" @click="clearCart">清空购物车</el-button>
            </div>
          </div>

          <div v-else class="empty-cart">
            <el-empty description="购物车是空的">
              <el-button type="primary" @click="$router.push('/')">去购物</el-button>
            </el-empty>
          </div>
        </el-card>
      </div>

      <!-- 右侧固定结算栏 -->
      <div class="cart-right">
        <el-card class="checkout-card">
          <template #header>
            <div class="checkout-header">
              <span>结算信息</span>
            </div>
          </template>
          
          <div v-if="enrichedCartItems.length > 0" class="checkout-content">
            <div class="selected-count">
              已选择 {{ selectedItems.length }} 件商品
            </div>
            
            <div class="price-summary">
              <div class="total-price-container">
                <div class="total-price">
                  总计：<span class="price">¥{{ selectedTotalPrice.toFixed(2) }}</span>
                </div>
                <div v-if="hasSelectedPriceChanged" class="price-change-summary">
                  <span class="original-total">原价：¥{{ selectedOriginalPrice.toFixed(2) }}</span>
                  <span class="price-diff-total" :class="{ 'diff-up': totalPriceDiff > 0, 'diff-down': totalPriceDiff < 0 }">
                    {{ totalPriceDiff > 0 ? '涨价' : '降价' }} ¥{{ Math.abs(totalPriceDiff).toFixed(2) }}
                  </span>
                </div>
              </div>
            </div>
            
            <el-button 
              type="primary" 
              size="large" 
              class="checkout-btn"
              @click="goToCheckout" 
              :disabled="selectedItems.length === 0"
            >
              去结算 ({{ selectedItems.length }})
            </el-button>
          </div>
          
          <div v-else class="empty-checkout">
            <p>请选择要结算的商品</p>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.cart-view {
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;

  .cart-container {
    display: flex;
    gap: 24px;
    max-width: 1600px;
    margin: 0 auto;
    padding: 0;
    position: relative;
  }

  .cart-left {
    flex: 1;
    min-width: 0;
    width: calc(70% - 12px);
    margin-right: 344px; // 为右侧固定栏留出空间
    
    @media (max-width: 1200px) {
      margin-right: 0;
      width: calc(70% - 12px);
    }
  }

  .cart-right {
    position: fixed;
    right: max(20px, calc((100vw - 1600px) / 2 + 20px));
    top: 100px;
    width: 320px;
    max-width: 400px;
    z-index: 1000;
    
    @media (max-width: 1200px) {
      position: relative;
      right: auto;
      top: auto;
      width: 30%;
      min-width: 320px;
    }
  }

  .cart-card {
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    border: none;
    overflow: visible;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    
    .el-table {
      border-radius: 12px;
      overflow: hidden;
      
      .el-table__header {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        
        th {
          background: transparent;
          border-bottom: 2px solid #dee2e6;
          font-weight: 600;
          color: #495057;
        }
      }
      
      .el-table__body {
        tr {
          &:hover {
            background: rgba(102, 126, 234, 0.05);
          }
        }
        
        td {
          border-bottom: 1px solid #f1f3f4;
          padding: 12px 8px;
        }
      }
    }
  }

  .checkout-card {
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    border: none;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    max-height: calc(100vh - 120px);
    overflow-y: auto;
    transition: all 0.3s ease;
    
    &:hover {
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }
    
    @media (max-width: 1200px) {
      position: sticky;
      top: 20px;
      max-height: calc(100vh - 40px);
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 18px;
    font-weight: 600;
    color: #2c3e50;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    margin: -20px -20px 20px -20px;
    padding: 20px;
  }

  .header-actions {
    display: flex;
    gap: 8px;

    .el-button {
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.1);
      color: white;
      
      &:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
      }
    }
  }

  .empty-cart {
    padding: 60px 0;
    text-align: center;
    
    .el-empty {
      .el-empty__description {
        font-size: 16px;
        color: #6c757d;
      }
    }
  }

  .cart-items {
    .el-table {
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      
      .el-table__header {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        
        th {
          background: transparent;
          border-bottom: 2px solid #dee2e6;
          font-weight: 600;
          color: #495057;
        }
      }
      
      .el-table__row {
        transition: all 0.3s ease;
        
        &:hover {
          background-color: #f8f9fa;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
      }
    }
  }

  .product-info {
    display: flex;
    align-items: flex-start;
    gap: 15px;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    transition: all 0.3s ease;
    
    &:hover {
      background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
      transform: translateX(5px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .product-image-container {
      position: relative;
      flex-shrink: 0;

      .product-image {
        width: 90px;
        height: 90px;
        object-fit: cover;
        border-radius: 12px;
        border: 2px solid #e9ecef;
        transition: all 0.3s ease;
        
        &:hover {
          border-color: #007bff;
          transform: scale(1.05);
        }
      }

      .price-change-tag {
        position: absolute;
        top: -8px;
        right: -8px;
        font-size: 10px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
    }

    .product-details {
      flex: 1;
      min-width: 0;

      .product-title {
        font-size: 16px;
        font-weight: 600;
        line-height: 1.4;
        margin-bottom: 8px;
        word-break: break-word;
        color: #2c3e50;
        transition: color 0.3s ease;
        
        &:hover {
          color: #007bff;
        }
      }

      .product-meta {
        .stock-info {
          font-size: 12px;
          color: #6c757d;
          background: #f8f9fa;
          padding: 2px 8px;
          border-radius: 12px;
          display: inline-block;
        }
      }
    }
  }

  .quantity-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    
    .el-input-number {
      width: 110px;
      
      .el-input__inner {
        text-align: center;
        border-radius: 8px;
        border: 2px solid #e9ecef;
        transition: all 0.3s ease;
        
        &:focus {
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }
      }
      
      .el-input-number__increase,
      .el-input-number__decrease {
        border-radius: 6px;
        border: 1px solid #e9ecef;
        background: #f8f9fa;
        transition: all 0.3s ease;
        
        &:hover {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }
      }
    }
  }

  .price-container {
    padding: 8px;
    border-radius: 8px;
    background: linear-gradient(135deg, #fff5f5 0%, #f0f9ff 100%);
    
    .cart-price {
      margin-bottom: 6px;
    }

    .current-price {
      font-size: 13px;
    }

    .price-label {
      font-size: 11px;
      color: #6c757d;
      margin-right: 4px;
      font-weight: 500;
    }

    .price-up {
      color: #dc3545;
      font-weight: 600;
    }

    .price-down {
      color: #28a745;
      font-weight: 600;
    }

    .price-change-info {
      margin-top: 4px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .price-diff {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 12px;
      font-weight: 600;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

      &.diff-up {
        background: linear-gradient(135deg, #fee 0%, #fdd 100%);
        color: #dc3545;
        border: 1px solid #f5c6cb;
      }

      &.diff-down {
        background: linear-gradient(135deg, #eff 0%, #dfd 100%);
        color: #28a745;
        border: 1px solid #c3e6cb;
      }
    }

    .price-percentage {
      font-size: 9px;
      font-weight: 500;

      &.diff-up {
        color: #dc3545;
      }

      &.diff-down {
        color: #28a745;
      }
    }
  }

  .price,
  .subtotal {
    color: #e74c3c;
    font-weight: 700;
    font-size: 16px;
  }

  .subtotal-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px;
    border-radius: 8px;
    background: linear-gradient(135deg, #fff8e1 0%, #f3e5f5 100%);

    .subtotal-note {
      .original-subtotal {
        font-size: 11px;
        color: #6c757d;
        text-decoration: line-through;
        font-weight: normal;
        background: #f8f9fa;
        padding: 2px 6px;
        border-radius: 8px;
      }
    }
  }

  .load-more-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 30px 0;
    
    .load-more-btn {
      min-width: 240px;
      height: 45px;
      font-size: 14px;
      border-radius: 25px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      font-weight: 600;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      transition: all 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
      }
    }
    
    .loading-more {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #667eea;
      font-size: 14px;
      font-weight: 500;
      padding: 12px 24px;
      background: rgba(102, 126, 234, 0.1);
      border-radius: 20px;
      
      .el-icon {
        font-size: 18px;
      }
    }
  }

  .cart-actions {
    display: flex;
    justify-content: flex-start;
    gap: 15px;
    margin-top: 20px;
    padding: 20px;
    border-top: 2px solid #e9ecef;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 0 0 16px 16px;
    margin: 20px -20px -20px -20px;

    .el-button {
      border-radius: 20px;
      font-weight: 600;
      padding: 10px 20px;
      transition: all 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
    }
  }

  .checkout-header {
    font-size: 18px;
    font-weight: 600;
    color: #2c3e50;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    margin: -20px -20px 20px -20px;
    padding: 20px;
  }

  .checkout-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .selected-count {
    font-size: 14px;
    color: #6c757d;
    text-align: center;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .price-summary {
    .total-price-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 20px;
      background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);

      .total-price {
        font-size: 18px;
        font-weight: 600;
        color: #2c3e50;
        text-align: center;

        .price {
          font-size: 24px;
          margin-left: 8px;
          color: #e74c3c;
          font-weight: 700;
        }
      }

      .price-change-summary {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        font-size: 12px;

        .original-total {
          color: #6c757d;
          text-decoration: line-through;
          font-weight: 500;
        }

        .price-diff-total {
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 11px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

          &.diff-up {
            background: linear-gradient(135deg, #fee 0%, #fdd 100%);
            color: #dc3545;
            border: 1px solid #f5c6cb;
          }

          &.diff-down {
            background: linear-gradient(135deg, #eff 0%, #dfd 100%);
            color: #28a745;
            border: 1px solid #c3e6cb;
          }
        }
      }
    }
  }

  .checkout-btn {
    width: 100%;
    height: 50px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 25px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    transition: all 0.3s ease;
    
    &:hover {
      background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
      transform: translateY(-2px);
    }
    
    &:disabled {
      background: #6c757d;
      box-shadow: none;
      transform: none;
    }
  }

  .empty-checkout {
    text-align: center;
    padding: 40px 20px;
    color: #6c757d;
    font-size: 14px;
  }

  // 响应式设计
  @media (max-width: 1400px) {
    .cart-container {
      max-width: 1200px;
      gap: 20px;
    }
    
    .cart-left {
      width: calc(68% - 10px);
    }
    
    .cart-right {
      width: 32%;
      min-width: 300px;
      max-width: 380px;
    }
  }
  
  @media (max-width: 1200px) {
    .cart-view {
      padding: 15px;
    }
    
    .cart-container {
      max-width: 1000px;
      gap: 16px;
    }
    
    .cart-left {
      width: calc(65% - 8px);
    }
    
    .cart-right {
      width: 35%;
      min-width: 280px;
      max-width: 350px;
    }
  }
  
  @media (max-width: 992px) {
    .cart-container {
      flex-direction: column;
      gap: 20px;
    }
    
    .cart-left,
    .cart-right {
      width: 100%;
      max-width: none;
    }
    
    .checkout-card {
      position: relative;
      top: 0;
      max-height: none;
    }
  }
}
</style>