<template>
  <div class="user-comments-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <el-button 
        link 
        @click="$router.go(-1)"
        class="back-button"
      >
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h2>我的评价</h2>
    </div>

    <!-- 评价统计 -->
    <el-card class="stats-card">
      <div class="comment-stats">
        <div class="total-comments">
          <span class="count">{{ totalComments }}</span>
          <span class="label">条评价</span>
        </div>
      </div>
    </el-card>

    <!-- 评价列表 -->
    <div class="comments-container">
      <el-card 
        v-for="comment in comments" 
        :key="comment.id" 
        class="comment-card"
      >
        <!-- 商品信息 -->
        <div class="product-info" @click="goToProduct(comment.productId)">
          <img 
            :src="comment.productImage || '/default-product.png'" 
            :alt="comment.productName"
            class="product-image"
          />
          <div class="product-details">
            <h4>{{ comment.productName }}</h4>
            <p class="product-price">¥{{ comment.productPrice }}</p>
          </div>
          <el-icon class="arrow-icon"><ArrowRight /></el-icon>
        </div>

        <el-divider />

        <!-- 评价内容 -->
        <div class="comment-section">
          <div class="comment-header">
            <el-rate
              v-model="comment.rating"
              disabled
              size="small"
            />
            <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
          </div>
          
          <div class="comment-content" v-html="comment.content"></div>
          
          <div class="comment-actions">
            <div class="like-info">
                  <el-icon><Star /></el-icon>
                  <span>{{ comment.likeCount }} 人觉得有用</span>
                </div>
            
            <el-button 
              type="danger" 
              size="small"
              plain
              @click="deleteComment(comment)"
              :loading="comment.deleting"
            >
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- 加载更多 -->
      <div class="load-more" v-if="hasMore">
        <el-button 
          @click="loadMore" 
          :loading="loading"
          type="primary"
          plain
        >
          加载更多
        </el-button>
      </div>

      <!-- 没有更多数据 -->
      <div class="no-more" v-if="!hasMore && comments.length > 0">
        <el-divider>没有更多评价了</el-divider>
      </div>

      <!-- 空状态 -->
      <el-empty 
        v-if="!loading && comments.length === 0"
        description="您还没有发表过评价"
        :image-size="80"
      >
        <el-button type="primary" @click="$router.push('/orders')">
          去购买商品
        </el-button>
      </el-empty>
    </div>

    <!-- 加载状态 -->
    <div class="loading-container" v-if="loading && comments.length === 0">
      <el-skeleton :rows="3" animated />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, ArrowRight, Star, Delete } from '@element-plus/icons-vue'
import { commentApi, productApi } from '@/services/api'
import type { ProductComment } from '@/types/api'

interface UserComment extends ProductComment {
  productName: string
  productImage: string
  productPrice: number
  deleting?: boolean
  username: string
  userAvatar: string
  isLiked: boolean
}

const router = useRouter()

// 状态管理
const comments = ref<UserComment[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const totalComments = ref(0)
const hasMore = ref(true)

// 获取用户评价列表
const fetchUserComments = async (page: number = 1, append: boolean = false) => {
  if (loading.value) return
  
  loading.value = true
  try {
    const response = await commentApi.getUserComments(page, pageSize.value)
    // 响应拦截器已经返回了data部分，所以response就是CommentPageResponse类型
    const responseData = response as any
    const newComments = responseData.records as UserComment[]
    
    // 为每个评论获取商品信息
    console.log('开始为用户评论获取商品信息，评论数量:', newComments.length)
    for (const comment of newComments) {
      if (comment.productId) {
        console.log(`正在获取商品ID ${comment.productId} 的信息...`)
        try {
          const productInfo = await productApi.getDetail(comment.productId)
          console.log(`成功获取商品${comment.productId}信息:`, productInfo)
          comment.productName = productInfo.title
          comment.productImage = productInfo.image
          comment.productPrice = productInfo.price
        } catch (error) {
          console.error(`获取商品${comment.productId}信息失败:`, error)
        }
      } else {
        console.log('用户评论没有productId:', comment)
      }
    }
    
    if (append) {
      comments.value.push(...newComments)
    } else {
      comments.value = newComments
    }
    
    totalComments.value = responseData.total
    hasMore.value = page < responseData.pages
    currentPage.value = page
  } catch (error) {
    console.error('获取评价失败:', error)
    ElMessage.error('获取评价失败')
  } finally {
    loading.value = false
  }
}

// 加载更多评价
const loadMore = () => {
  if (hasMore.value && !loading.value) {
    fetchUserComments(currentPage.value + 1, true)
  }
}

// 删除评价
const deleteComment = async (comment: UserComment) => {
  try {
    await ElMessageBox.confirm(
      '删除后无法恢复，确定要删除这条评价吗？',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    comment.deleting = true
    await commentApi.deleteComment(comment.id)
    
    // 从列表中移除
    const index = comments.value.findIndex(c => c.id === comment.id)
    if (index > -1) {
      comments.value.splice(index, 1)
      totalComments.value--
    }
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除评价失败:', error)
      ElMessage.error('删除失败')
    }
  } finally {
    comment.deleting = false
  }
}

// 跳转到商品详情
const goToProduct = (productId: number) => {
  router.push(`/product/${productId}`)
}

// 格式化时间
const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else if (days < 30) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString()
  }
}

// 页面初始化
onMounted(() => {
  fetchUserComments()
})
</script>

<style scoped>
.user-comments-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 12px;
}

.back-button {
  padding: 8px;
  color: #666;
}

.back-button:hover {
  color: #409eff;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.stats-card {
  margin-bottom: 20px;
}

.comment-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-comments .count {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-right: 4px;
}

.total-comments .label {
  color: #666;
  font-size: 14px;
}

.comments-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-card {
  transition: all 0.3s ease;
}

.comment-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.product-info {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 8px;
  border-radius: 8px;
}

.product-info:hover {
  background-color: #f5f7fa;
}

.product-image {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}

.product-details {
  flex: 1;
}

.product-details h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  line-height: 1.4;
}

.product-price {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #e74c3c;
}

.arrow-icon {
  color: #c0c4cc;
  flex-shrink: 0;
}

.comment-section {
  padding: 0 8px;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.comment-time {
  font-size: 12px;
  color: #999;
}

.comment-content {
  margin: 12px 0;
  line-height: 1.6;
  color: #333;
  word-break: break-word;
}

.comment-content :deep(img) {
  max-width: 280px;
  max-height: 180px;
  width: auto;
  height: auto;
  border-radius: 8px;
  margin: 8px 6px 8px 0;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.comment-content :deep(img):hover {
  transform: scale(1.03);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.comment-content :deep(p) {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: flex-start;
}

.comment-content :deep(img + img) {
  margin-left: 6px;
}

.comment-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.like-info {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #666;
  font-size: 14px;
}

.like-info .el-icon {
  color: #e74c3c;
}

.load-more {
  text-align: center;
  margin: 20px 0;
}

.no-more {
  margin: 20px 0;
}

.loading-container {
  padding: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .user-comments-view {
    padding: 16px;
  }
  
  .product-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .product-image {
    width: 50px;
    height: 50px;
  }
  
  .comment-actions {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
}
</style>