<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { ElMessage } from 'element-plus'
import type { CartItem } from '@/types/api'
import { Delete } from '@element-plus/icons-vue' // 导入 Delete 图标

const router = useRouter()
const cartStore = useCartStore()

// 使用购物车状态管理中的数据
const cartItems = computed(() => cartStore.items)

// 选中的商品ID列表
const selectedItems = ref<number[]>([])

// 计算选中商品的总价
const selectedTotalPrice = computed(() => {
  return cartItems.value
    .filter(item => selectedItems.value.includes(item.id))
    .reduce((total, item) => total + item.price * item.quantity, 0)
})

// 更新商品数量
const updateQuantity = (itemId: number, newQuantity: number) => {
  if (newQuantity <= 0) {
    removeItem(itemId)
  } else {
    cartStore.updateItemQuantity(itemId, newQuantity)
  }
}

// 移除商品
const removeItem = (itemId: number) => {
  cartStore.removeItem(itemId)
  // 从选中列表中移除
  const index = selectedItems.value.indexOf(itemId)
  if (index !== -1) {
    selectedItems.value.splice(index, 1)
  }
  ElMessage.success('商品已从购物车移除')
}

// 删除选中的商品
const removeSelectedItems = () => {
  if (selectedItems.value.length === 0) {
    ElMessage.warning('请先选择要删除的商品')
    return
  }
  selectedItems.value.forEach(itemId => {
    cartStore.removeItem(itemId)
  })
  selectedItems.value = []
  ElMessage.success('已删除选中的商品')
}

// 清空购物车
const clearCart = () => {
  cartStore.clearCart()
  selectedItems.value = []
  ElMessage.success('购物车已清空')
}

// 跳转到结算页面
const goToCheckout = () => {
  if (selectedItems.value.length === 0) {
    ElMessage.warning('请先选择要结算的商品')
    return
  }
  // 将选中的商品信息保存到localStorage
  const selectedItemsData = cartItems.value.filter(item => selectedItems.value.includes(item.id))
  localStorage.setItem('checkoutItems', JSON.stringify(selectedItemsData))
  router.push('/checkout')
}
</script>

<template>
  <div class="cart-view">
    <el-card class="cart-card">
      <template #header>
        <div class="card-header">
          <span>购物车</span>
        </div>
      </template>

      <div v-if="cartItems.length > 0" class="cart-items">
        <el-table :data="cartItems" style="width: 100%" @selection-change="selectedItems = $event.map((item: CartItem) => item.id)">
          <el-table-column type="selection" width="55" />
          <el-table-column label="商品信息" width="400">
            <template #default="{ row }">
              <div class="product-info">
                <img :src="row.image" class="product-image" />
                <span class="product-title">{{ row.title }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="单价" width="120">
            <template #default="{ row }">
              <span class="price">¥{{ row.price }}</span>
            </template>
          </el-table-column>

          <el-table-column label="数量" width="150">
            <template #default="{ row }">
              <el-input-number
                v-model="row.quantity"
                :min="1"
                @change="updateQuantity(row.id, row.quantity)"
              />
            </template>
          </el-table-column>

          <el-table-column label="小计" width="120">
            <template #default="{ row }">
              <span class="subtotal">¥{{ row.price * row.quantity }}</span>
            </template>
          </el-table-column>

          <el-table-column label="操作">
            <template #default="{ row }">
              <el-button type="danger" :icon="Delete" circle @click="removeItem(row.id)" />
            </template>
          </el-table-column>
        </el-table>

        <div class="cart-footer">
          <el-button type="danger" @click="removeSelectedItems" :disabled="selectedItems.length === 0">删除选中</el-button>
          <el-button type="warning" @click="clearCart">清空购物车</el-button>
          <div class="cart-footer-right">
            <div class="total-price">
              总计：<span class="price">¥{{ selectedTotalPrice }}</span>
            </div>
            <el-button type="primary" size="large" @click="goToCheckout" :disabled="selectedItems.length === 0">去结算</el-button>
          </div>
        </div>
      </div>

      <el-empty v-else description="购物车是空的" />
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.cart-view {
  .product-info {
    display: flex;
    align-items: center;
    gap: 10px;

    .product-image {
      width: 50px;
      height: 50px;
      object-fit: cover;
    }

    .product-title {
      font-size: 14px;
    }
  }

  .price,
  .subtotal {
    color: #f56c6c;
    font-weight: bold;
  }

  .cart-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #ebeef5;

    .cart-footer-right {
      display: flex;
      align-items: center;
      gap: 20px;

      .total-price {
        font-size: 14px;

        .price {
          font-size: 20px;
          margin-left: 8px;
        }
      }
    }
  }
}
</style>