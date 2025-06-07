<template>
  <div class="comments-view">
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
      <h2>商品评价</h2>
    </div>

    <!-- 商品信息卡片 -->
    <el-card class="product-info-card" v-if="product">
      <div class="product-summary">
        <img :src="product.image" :alt="product.title" class="product-image" />
        <div class="product-details">
          <h3>{{ product.title }}</h3>
          <p class="product-price">¥{{ product.price }}</p>
        </div>
      </div>
    </el-card>

    <!-- 评论统计 -->
    <el-card class="stats-card">
      <div class="comment-stats">
        <div class="total-comments">
          <span class="count">{{ totalComments }}</span>
          <span class="label">条评价</span>
        </div>
        <div class="average-rating" v-if="averageRating > 0">
          <el-rate
            v-model="averageRating"
            disabled
            show-score
            text-color="#ff9900"
            score-template="{value}分"
          />
        </div>
      </div>
    </el-card>

    <!-- 评论列表 -->
    <div class="comments-container">
      <el-card 
        v-for="comment in comments" 
        :key="comment.id" 
        class="comment-card"
      >
        <!-- 商品信息（当评论包含商品信息时显示） -->
        <div v-if="comment.productName" class="comment-product-info">
          <div class="product-summary">
            <img 
              :src="comment.productImage || '/default-product.png'" 
              :alt="comment.productName"
              class="product-image"
            />
            <div class="product-details">
              <h4>{{ comment.productName }}</h4>
              <p class="product-price">¥{{ comment.productPrice }}</p>
            </div>
          </div>
          <el-divider />
        </div>

        <div class="comment-header">
          <div class="user-info">
            <el-avatar
              :src="comment.avatar || '/default-avatar.png'" 
              :alt="comment.nickName || comment.username"
              class="user-avatar"
              :size="48"
            >
              {{ (comment.nickName || comment.username || '用户')[0] }}
            </el-avatar>
            <div class="user-details">
              <span class="username">{{ comment.nickName || comment.username }}</span>
              <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
            </div>
          </div>
          <el-rate
            v-model="comment.rating"
            disabled
            size="small"
          />
        </div>
        
        <div class="comment-content" v-html="comment.content"></div>
        
        <div class="comment-actions">
          <el-button 
            link 
            @click="toggleLike(comment)"
            :class="{ 'liked': comment.isLiked }"
            class="like-button"
          >
            <el-icon><Star /></el-icon>
            {{ comment.likeCount }}
          </el-button>
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
        description="暂无评价"
        :image-size="80"
      />
    </div>

    <!-- 加载状态 -->
    <div class="loading-container" v-if="loading && comments.length === 0">
      <el-skeleton :rows="3" animated />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Star } from '@element-plus/icons-vue'
import { commentApi, productApi } from '@/services/api'
import type { ProductComment, Product, CommentPageResponse } from '@/types/api'

const route = useRoute()
const productId = ref<number>(Number(route.params.id))

// 状态管理
const product = ref<Product | null>(null)
const comments = ref<ProductComment[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const totalComments = ref(0)
const hasMore = ref(true)
const averageRating = ref(0)

// 获取商品信息
const fetchProduct = async () => {
  try {
    const response = await productApi.getDetail(productId.value)
    product.value = response
  } catch (error) {
    console.error('获取商品信息失败:', error)
  }
}

// 获取评论列表
const fetchComments = async (page: number = 1, append: boolean = false) => {
  if (loading.value) return
  
  loading.value = true
  try {
    const response = await commentApi.getProductComments(productId.value, page, pageSize.value)
    console.log('API响应:', response) // 调试日志
    
    // 响应拦截器已经返回了data部分，所以response就是CommentPageResponse类型
    const responseData = response as any as CommentPageResponse
    
    const newComments = responseData.records || []
    
    // 为每个评论获取商品信息
    console.log('开始为评论获取商品信息，评论数量:', newComments.length)
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
        console.log('评论没有productId:', comment)
      }
    }
    
    if (append) {
      comments.value.push(...newComments)
    } else {
      comments.value = newComments
    }
    
    totalComments.value = responseData.total || 0
    hasMore.value = page < (responseData.pages || 1)
    currentPage.value = page
    
    // 计算平均评分
    if (comments.value.length > 0) {
      const totalRating = comments.value.reduce((sum, comment) => sum + comment.rating, 0)
      averageRating.value = Number((totalRating / comments.value.length).toFixed(1))
    }
    
    console.log('解析后的评论数据:', comments.value) // 调试日志
  } catch (error) {
    console.error('获取评论失败:', error)
    ElMessage.error('获取评论失败')
  } finally {
    loading.value = false
  }
}

// 加载更多评论
const loadMore = () => {
  if (hasMore.value && !loading.value) {
    fetchComments(currentPage.value + 1, true)
  }
}

// 点赞/取消点赞
const toggleLike = async (comment: ProductComment) => {
  try {
    if (comment.isLiked) {
      await commentApi.unlikeComment(comment.id)
      comment.isLiked = false
      comment.likeCount--
    } else {
      await commentApi.likeComment(comment.id)
      comment.isLiked = true
      comment.likeCount++
    }
  } catch (error) {
    console.error('操作失败:', error)
    ElMessage.error('操作失败')
  }
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
onMounted(async () => {
  await Promise.all([
    fetchProduct(),
    fetchComments()
  ])
})
</script>

<style scoped>
.comments-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
}

.page-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
  padding: 16px 0;
}

.back-button {
  padding: 12px;
  color: #666;
  border-radius: 8px;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}

.back-button:hover {
  color: #409eff;
  background: rgba(255, 255, 255, 0.95);
  transform: translateX(-2px);
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.product-info-card {
  margin-bottom: 24px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
}

.product-summary {
  display: flex;
  gap: 20px;
  align-items: center;
  padding: 8px;
}

.product-image {
  width: 90px;
  height: 90px;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease;
}

.product-image:hover {
  transform: scale(1.05);
}

.product-details h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.4;
}

.product-price {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #e74c3c;
  text-shadow: 0 1px 2px rgba(231, 76, 60, 0.2);
}

.stats-card {
  margin-bottom: 24px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
}

.comment-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
}

.total-comments .count {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin-right: 8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.total-comments .label {
  color: #7f8c8d;
  font-size: 16px;
  font-weight: 500;
}

.comments-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.comment-card {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.comment-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  border-color: rgba(64, 158, 255, 0.3);
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.user-info {
  display: flex;
  gap: 16px;
  align-items: center;
}

.user-avatar {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 3px solid rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
}

.user-avatar:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.username {
  font-weight: 600;
  color: #2c3e50;
  font-size: 16px;
  letter-spacing: 0.5px;
}

.comment-time {
  font-size: 13px;
  color: #95a5a6;
  font-weight: 500;
}

.comment-content {
  margin: 16px 0;
  line-height: 1.8;
  color: #2c3e50;
  word-break: break-word;
  font-size: 15px;
  padding: 16px;
  background: rgba(248, 249, 250, 0.6);
  border-radius: 12px;
  border-left: 4px solid #3498db;
}

.comment-content :deep(img) {
  max-width: 300px;
  max-height: 200px;
  width: auto;
  height: auto;
  border-radius: 12px;
  margin: 12px 8px 12px 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  object-fit: cover;
  cursor: pointer;
}

.comment-content :deep(img):hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

/* 多张图片时的布局优化 */
.comment-content :deep(p) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
}

.comment-content :deep(p:has(img)) {
  margin: 12px 0;
}

/* 图片容器优化 */
.comment-product-info {
  margin-bottom: 16px;
}

.comment-product-info .product-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(64, 158, 255, 0.05);
  border-radius: 8px;
  border-left: 3px solid #409eff;
}

.comment-product-info .product-image {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  object-fit: cover;
}

.comment-product-info .product-details h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.comment-product-info .product-price {
  margin: 0;
  font-size: 13px;
  color: #e74c3c;
  font-weight: 600;
}

.comment-content {
  line-height: 1.6;
}

.comment-content :deep(img + img) {
  margin-left: 8px;
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.like-button {
  color: #7f8c8d;
  transition: all 0.3s ease;
  padding: 8px 16px;
  border-radius: 20px;
  background: rgba(52, 152, 219, 0.1);
  font-weight: 500;
}

.like-button:hover {
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.1);
  transform: translateY(-2px);
}

.like-button.liked {
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.15);
}

.load-more {
  text-align: center;
  margin: 32px 0;
}

.load-more .el-button {
  padding: 12px 32px;
  border-radius: 25px;
  font-weight: 600;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.3);
  transition: all 0.3s ease;
}

.load-more .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.4);
}

.no-more {
  margin: 32px 0;
  text-align: center;
  color: #95a5a6;
  font-size: 16px;
  font-weight: 500;
  padding: 20px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.loading-container {
  padding: 32px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  backdrop-filter: blur(20px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .comments-view {
    padding: 16px;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  }
  
  .page-header {
    padding: 12px 0;
    gap: 12px;
  }
  
  .page-header h2 {
    font-size: 20px;
  }
  
  .product-summary {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px;
  }
  
  .product-image {
    width: 70px;
    height: 70px;
    align-self: center;
  }
  
  .product-details {
    text-align: center;
    width: 100%;
  }
  
  .comment-stats {
    flex-direction: column;
    gap: 16px;
    align-items: center;
    text-align: center;
  }
  
  .comment-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .user-info {
    gap: 12px;
  }
  
  .user-avatar {
    width: 40px !important;
    height: 40px !important;
  }
  
  .comment-content {
    padding: 12px;
    font-size: 14px;
    margin: 12px 0;
  }
  
  .comment-actions {
    justify-content: center;
  }
  
  .like-button {
    padding: 6px 12px;
    font-size: 14px;
  }
}
</style>