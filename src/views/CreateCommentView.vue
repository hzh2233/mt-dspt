<template>
  <div class="create-comment-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <el-button 
        link 
        @click="goBack"
        class="back-button"
      >
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h2>发表评价</h2>
    </div>

    <!-- 单商品信息卡片 -->
    <el-card class="product-info-card" v-if="!isOrderComment && product">
      <div class="product-summary">
        <img :src="product.image" :alt="product.title" class="product-image" />
        <div class="product-details">
          <h3>{{ product.title }}</h3>
          <p class="product-price">¥{{ product.price }}</p>
        </div>
      </div>
    </el-card>

    <!-- 多商品评价 -->
    <div v-if="isOrderComment">
      <el-card 
        v-for="(form, index) in commentForms" 
        :key="form.productId"
        class="comment-form-card"
        style="margin-bottom: 20px;"
      >
        <!-- 商品信息 -->
        <div class="product-summary" style="margin-bottom: 20px;">
          <img :src="form.productInfo?.coverUrl" :alt="form.productInfo?.goodName" class="product-image" />
          <div class="product-details">
            <h3>{{ form.productInfo?.goodName }}</h3>
            <p class="product-price">¥{{ form.productInfo?.price }}</p>
          </div>
        </div>

        <!-- 评分 -->
        <el-form-item label="评分">
          <el-rate
            v-model="form.rating"
            :colors="rateColors"
            show-text
            :texts="rateTexts"
          />
        </el-form-item>

        <!-- 评价内容 -->
        <el-form-item label="评价内容">
          <div class="rich-editor-container">
            <!-- 工具栏 -->
            <div class="editor-toolbar">
              <el-button-group>
                <el-button size="small" @click="formatText('bold', index)" title="加粗">
                  <el-icon><strong>B</strong></el-icon>
                </el-button>
                <el-button size="small" @click="formatText('italic', index)" title="斜体">
                  <el-icon><em>I</em></el-icon>
                </el-button>
                <el-button size="small" @click="formatText('underline', index)" title="下划线">
                  <el-icon><u>U</u></el-icon>
                </el-button>
              </el-button-group>
              
              <el-divider direction="vertical" />
              
              <el-button size="small" @click="insertImage(index)" :loading="uploading" title="插入图片">
                <el-icon><Picture /></el-icon>
                图片
              </el-button>
              
              <el-button size="small" @click="insertEmoji(index)" title="插入表情">
                <el-icon><ChatDotRound /></el-icon>
                表情
              </el-button>
              
              <el-divider direction="vertical" />
              
              <el-button size="small" @click="clearContent(index)" title="清空内容">
                <el-icon><Delete /></el-icon>
                清空
              </el-button>
            </div>
            
            <!-- 富文本编辑器 -->
            <div 
              :ref="el => setEditorRef(el, index)"
              class="rich-text-editor"
              contenteditable="true"
              @input="handleMultiEditorInput(index)"
              @paste="handlePaste"
              @keydown="handleKeydown"
              placeholder="分享您的使用体验，让其他用户了解这个商品的优缺点..."
            ></div>
            
            <!-- 字数统计和提示 -->
            <div class="editor-footer">
              <div class="editor-tips">
                <el-icon><InfoFilled /></el-icon>
                <span>支持图片、表情，让评价更生动</span>
              </div>
              <div class="char-count" :class="{ 'warning': getContentLength(index) > 450 }">
                {{ getContentLength(index) }}/500
              </div>
            </div>
          </div>
        </el-form-item>
      </el-card>

      <!-- 提交按钮 -->
      <el-card class="submit-card">
        <el-button 
          type="primary" 
          @click="submitComment"
          :loading="submitting"
          size="large"
          style="width: 100%;"
        >
          提交所有评价
        </el-button>
        <el-button @click="goBack" size="large" style="width: 100%; margin-top: 10px;">
          取消
        </el-button>
      </el-card>
    </div>

    <!-- 单商品评价表单 -->
    <el-card class="comment-form-card" v-if="!isOrderComment">
      <el-form 
        ref="commentFormRef" 
        :model="commentForm" 
        :rules="commentRules"
        label-width="80px"
      >
        <!-- 评分 -->
        <el-form-item label="评分" prop="rating">
          <el-rate
            v-model="commentForm.rating"
            :colors="rateColors"
            show-text
            :texts="rateTexts"
          />
        </el-form-item>

        <!-- 评价内容 -->
        <el-form-item label="评价内容" prop="content">
          <div class="editor-container">
            <!-- 工具栏 -->
            <div class="editor-toolbar">
              <el-button 
                size="small" 
                @click="insertImage"
                :loading="uploading"
              >
                <el-icon><Picture /></el-icon>
                插入图片
              </el-button>
              <el-button 
                size="small" 
                @click="insertEmoji"
              >
                <el-icon><ChatDotRound /></el-icon>
                表情
              </el-button>
            </div>
            
            <!-- 富文本编辑器 -->
            <div 
              ref="editorRef"
              class="rich-editor"
              contenteditable="true"
              @input="handleEditorInput"
              @paste="handlePaste"
              placeholder="请输入您的评价内容..."
            ></div>
            
            <!-- 字数统计 -->
            <div class="char-count">
              {{ contentLength }}/500
            </div>
          </div>
        </el-form-item>

        <!-- 提交按钮 -->
        <el-form-item>
          <el-button 
            type="primary" 
            @click="submitComment"
            :loading="submitting"
            size="large"
          >
            发表评价
          </el-button>
          <el-button @click="goBack" size="large">
            取消
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 图片上传对话框 -->
    <el-dialog 
      v-model="imageDialogVisible" 
      title="上传图片" 
      width="400px"
    >
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :before-upload="beforeImageUpload"
        :on-change="handleFileChange"
        :show-file-list="false"
        accept="image/*"
        drag
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          将图片拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 jpg/png/gif 格式，文件大小不超过 5MB
          </div>
        </template>
      </el-upload>
    </el-dialog>

    <!-- 表情选择对话框 -->
    <el-dialog 
      v-model="emojiDialogVisible" 
      title="选择表情" 
      width="480px"
      center
      :close-on-click-modal="true"
      :close-on-press-escape="true"
    >
      <div class="emoji-grid">
        <span 
          v-for="emoji in emojis" 
          :key="emoji"
          class="emoji-item"
          @click="insertEmojiToEditor(emoji)"
        >
          {{ emoji }}
        </span>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed, type ComponentPublicInstance } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules, UploadProps } from 'element-plus'
import { ArrowLeft, Picture, ChatDotRound, UploadFilled, Delete, InfoFilled } from '@element-plus/icons-vue'
import { commentApi, productApi, uploadApi } from '@/services/api'
import type { Product, CreateCommentRequest } from '@/types/api'
import { getToken } from '@/utils/auth'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

// 获取参数：支持单商品评价和订单评价两种模式
const productId = ref<number>(Number(route.params.id)) // 单商品模式（从商品详情页进入）
const itemsFromQuery = ref<any[]>([]) // 从订单页面传递的商品数据
const isOrderComment = ref(false) // 是否为订单评价模式
const fromOrderDetail = ref(false) // 是否从订单详情页进入

// 解析路由参数中的商品数据
if (route.query.items) {
  try {
    itemsFromQuery.value = JSON.parse(route.query.items as string)
    isOrderComment.value = itemsFromQuery.value.length > 0
    // 检查是否从订单详情页进入（单个商品且有来源标识）
    fromOrderDetail.value = route.query.from === 'order-detail'
  } catch (error) {
    console.error('解析商品数据失败:', error)
    ElMessage.error('商品数据格式错误')
  }
}

// 状态管理
const product = ref<Product | null>(null)
const orderProducts = ref<any[]>([])
const commentFormRef = ref<FormInstance>()
const editorRef = ref<HTMLElement>()
const multiEditorRefs = ref<HTMLElement[]>([])
const currentEditorIndex = ref(0)
const uploading = ref(false)
const submitting = ref(false)
const imageDialogVisible = ref(false)
const emojiDialogVisible = ref(false)

// 表单数据 - 支持多商品评价
const commentForms = ref<Array<{
  productId: number
  rating: number
  content: string
  productInfo?: any
}>>([])

// 单商品评价表单（兼容原有逻辑）
const commentForm = ref({
  rating: 5,
  content: ''
})

// 表单验证规则
const commentRules: FormRules = {
  rating: [
    { required: true, message: '请选择评分', trigger: 'change' }
  ],
  content: [
    { required: true, message: '请输入评价内容', trigger: 'blur' },
    { min: 10, message: '评价内容至少10个字符', trigger: 'blur' },
    { max: 500, message: '评价内容不能超过500个字符', trigger: 'blur' }
  ]
}

// 评分配置
const rateColors = ['#99A9BF', '#F7BA2A', '#FF9900']
const rateTexts = ['极差', '失望', '一般', '满意', '惊喜']

// 图片上传处理
const handleImageUpload = async (file: File) => {
  try {
    uploading.value = true
    const imageUrl = await uploadApi.uploadImage(file)
    
    // 插入图片到编辑器
    const targetEditor = isOrderComment.value 
      ? multiEditorRefs.value[currentEditorIndex.value]
      : editorRef.value
      
    if (targetEditor) {
      targetEditor.focus()
      const img = `<img src="${imageUrl}" alt="评价图片" style="max-width: 100%; height: auto; margin: 8px 0;" />`
      document.execCommand('insertHTML', false, img)
      
      if (isOrderComment.value) {
        handleMultiEditorInput(currentEditorIndex.value)
      } else {
        handleEditorInput()
      }
    }
    
    ElMessage.success('图片上传成功')
    imageDialogVisible.value = false
  } catch (error) {
    console.error('图片上传失败:', error)
    ElMessage.error('图片上传失败')
  } finally {
    uploading.value = false
  }
}

// 表情列表
const emojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
  '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
  '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
  '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
  '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
  '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
  '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
  '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧',
  '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐'
]

// 计算内容长度
const contentLength = computed(() => {
  if (!editorRef.value) return 0
  return editorRef.value.textContent?.length || 0
})

// 返回逻辑
const goBack = () => {
  if (fromOrderDetail.value) {
    // 从订单详情页进入，返回到我的订单页
    router.push('/user/orders')
  } else {
    // 其他情况，返回上一页
    router.go(-1)
  }
}

// 初始化订单商品信息
const initOrderProducts = () => {
  if (itemsFromQuery.value.length === 0) {
    ElMessage.error('商品数据不完整')
    return
  }
  
  // 转换为评价表单格式
  commentForms.value = itemsFromQuery.value.map((item: any) => ({
    productId: item.good.goodId,
    rating: 5,
    content: '',
    productInfo: {
      goodId: item.good.goodId,
      goodName: item.good.goodName,
      price: item.good.price,
      coverUrl: item.good.coverUrl,
      description: item.good.description
    }
  }))
  
  orderProducts.value = itemsFromQuery.value
}

// 获取单个商品信息
const fetchProduct = async () => {
  try {
    const response = await productApi.getDetail(productId.value)
    product.value = response
  } catch (error) {
    console.error('获取商品信息失败:', error)
    ElMessage.error('获取商品信息失败')
  }
}

// 设置编辑器引用
const setEditorRef = (el: Element | ComponentPublicInstance | null, index: number) => {
  if (el && el instanceof Element) {
    multiEditorRefs.value[index] = el as HTMLElement
  }
}

// 获取内容长度
const getContentLength = (index: number) => {
  const editor = multiEditorRefs.value[index]
  return editor?.textContent?.length || 0
}

// 处理多商品编辑器输入
const handleMultiEditorInput = (index: number) => {
  const editor = multiEditorRefs.value[index]
  if (editor && commentForms.value[index]) {
    commentForms.value[index].content = editor.innerHTML
  }
}

// 处理单商品编辑器输入
const handleEditorInput = () => {
  if (editorRef.value) {
    commentForm.value.content = editorRef.value.innerHTML
  }
}

// 格式化文本
const formatText = (command: string, index?: number) => {
  document.execCommand(command, false)
  if (typeof index === 'number') {
    handleMultiEditorInput(index)
  } else {
    handleEditorInput()
  }
}

// 清空内容
const clearContent = (index?: number) => {
  if (typeof index === 'number') {
    const editor = multiEditorRefs.value[index]
    if (editor) {
      editor.innerHTML = ''
      handleMultiEditorInput(index)
    }
  } else if (editorRef.value) {
    editorRef.value.innerHTML = ''
    handleEditorInput()
  }
}

// 处理键盘事件
const handleKeydown = (event: KeyboardEvent) => {
  // 限制内容长度
  const target = event.target as HTMLElement
  if (target && target.textContent && target.textContent.length >= 500) {
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
    }
  }
}

// 处理粘贴事件
const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const text = event.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertText', false, text)
}

// 插入图片
const insertImage = (index?: number) => {
  if (typeof index === 'number') {
    currentEditorIndex.value = index
  }
  imageDialogVisible.value = true
}

// 插入表情
const insertEmoji = (index?: number) => {
  if (typeof index === 'number') {
    currentEditorIndex.value = index
  }
  emojiDialogVisible.value = true
}

// 插入表情到编辑器
const insertEmojiToEditor = (emoji: string) => {
  const targetEditor = isOrderComment.value 
    ? multiEditorRefs.value[currentEditorIndex.value]
    : editorRef.value
    
  if (targetEditor) {
    targetEditor.focus()
    document.execCommand('insertText', false, emoji)
    
    if (isOrderComment.value) {
      handleMultiEditorInput(currentEditorIndex.value)
    } else {
      handleEditorInput()
    }
  }
  emojiDialogVisible.value = false
}

// 图片上传前检查
const beforeImageUpload: UploadProps['beforeUpload'] = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB!')
    return false
  }
  
  return true
}

// 处理文件选择
const handleFileChange = (file: any) => {
  if (file.raw) {
    handleImageUpload(file.raw)
  }
}

// 提交评价
const submitComment = async () => {
  submitting.value = true
  
  try {
    if (isOrderComment.value) {
      // 订单模式：提交多个商品评价
      let successCount = 0
      
      for (const form of commentForms.value) {
        if (form.content.trim()) {
          try {
            const commentData: CreateCommentRequest = {
              productId: form.productId,
              rating: form.rating,
              content: form.content
            }
            
            await commentApi.createComment(commentData)
            successCount++
          } catch (error) {
            console.error(`商品 ${form.productInfo?.title} 评价提交失败:`, error)
          }
        }
      }
      
      if (successCount > 0) {
        ElMessage.success(`成功提交 ${successCount} 个商品评价`)
        router.push('/user/orders')
      } else {
        ElMessage.error('评价提交失败')
      }
    } else {
      // 单商品模式
      if (!commentFormRef.value) return
      
      await commentFormRef.value.validate()
      
      // 检查内容长度
      if (contentLength.value < 10) {
        ElMessage.error('评价内容至少10个字符')
        return
      }
      
      if (contentLength.value > 500) {
        ElMessage.error('评价内容不能超过500个字符')
        return
      }
      
      const commentData: CreateCommentRequest = {
        productId: productId.value,
        rating: commentForm.value.rating,
        content: commentForm.value.content
      }
      
      await commentApi.createComment(commentData)
      
      ElMessage.success('评价发表成功')
      router.go(-1)
    }
  } catch (error) {
    console.error('发表评价失败:', error)
    ElMessage.error('发表评价失败')
  } finally {
    submitting.value = false
  }
}

// 页面初始化
onMounted(() => {
  if (isOrderComment.value) {
    initOrderProducts()
  } else {
    fetchProduct()
  }
  
  // 设置编辑器焦点
  nextTick(() => {
    if (editorRef.value) {
      editorRef.value.focus()
    }
  })
})
</script>

<style scoped>
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

.product-info-card {
  margin-bottom: 20px;
}

.product-summary {
  display: flex;
  gap: 16px;
  align-items: center;
}

.product-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
}

.product-details h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.product-price {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #e74c3c;
}

.comment-form-card {
  margin-bottom: 20px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.create-comment-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.rich-editor-container {
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  background: #fff;
}

.rich-editor-container:hover {
  border-color: #c0c4cc;
}

.rich-editor-container:focus-within {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}

.editor-toolbar {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.editor-toolbar .el-button-group {
  margin-right: 8px;
}

.editor-toolbar .el-button {
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.editor-toolbar .el-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.rich-text-editor {
  min-height: 150px;
  max-height: 400px;
  padding: 16px;
  overflow-y: auto;
  line-height: 1.8;
  color: #2c3e50;
  background-color: #fff;
  font-size: 14px;
  transition: all 0.3s ease;
}

.rich-text-editor:focus {
  outline: none;
  background-color: #fafbfc;
}

.rich-text-editor:empty:before {
  content: attr(placeholder);
  color: #a8abb2;
  font-style: italic;
}

.rich-text-editor :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 12px 0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.rich-text-editor :deep(img:hover) {
  transform: scale(1.02);
}

.rich-text-editor :deep(strong) {
  color: #2c3e50;
  font-weight: 600;
}

.rich-text-editor :deep(em) {
  color: #5a6c7d;
  font-style: italic;
}

.rich-text-editor :deep(u) {
  text-decoration: underline;
  text-decoration-color: #409eff;
}

.editor-footer {
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-top: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-tips {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6c757d;
  font-size: 12px;
}

.editor-tips .el-icon {
  color: #409eff;
}

.char-count {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.char-count.warning {
  color: #e6a23c;
  background: rgba(230, 162, 60, 0.1);
}

/* 兼容原有编辑器样式 */
.editor-container {
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.editor-container:hover {
  border-color: #c0c4cc;
}

.editor-container:focus-within {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}

.rich-editor {
  min-height: 150px;
  max-height: 400px;
  padding: 16px;
  overflow-y: auto;
  line-height: 1.8;
  color: #2c3e50;
  background-color: #fff;
  font-size: 14px;
}

.rich-editor:focus {
  outline: none;
  background-color: #fafbfc;
}

.rich-editor:empty:before {
  content: attr(placeholder);
  color: #a8abb2;
  font-style: italic;
}

.rich-editor :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 12px 0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 12px;
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
  background: #fff;
}

.emoji-item {
  font-size: 28px;
  text-align: center;
  cursor: pointer;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  min-width: 48px;
  box-sizing: border-box;
  user-select: none;
}

.emoji-item:hover {
  background-color: #f0f9ff;
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.emoji-item:active {
  transform: scale(0.95);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .create-comment-view {
    padding: 16px;
  }
  
  .product-summary {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .product-image {
    width: 60px;
    height: 60px;
  }
  
  .editor-toolbar {
    flex-wrap: wrap;
  }
  
  .emoji-grid {
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
    padding: 16px;
  }
  
  .emoji-item {
    font-size: 24px;
    min-height: 40px;
    min-width: 40px;
    padding: 8px;
  }
}
</style>