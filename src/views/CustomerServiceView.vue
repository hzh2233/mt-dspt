<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Promotion, Service, Setting, User } from '@element-plus/icons-vue'
import { getAIService } from '@/services/aiService'
import { AIConfigManager } from '@/config/aiConfig'
import type { AIResponse } from '@/services/aiService'

// 聊天消息接口（用于UI显示）
interface ChatMessage {
  id: string
  content: string
  type: 'user' | 'ai'
  timestamp: Date
}

const router = useRouter()
const route = useRoute()

// 状态变量
const messages = ref<ChatMessage[]>([])
const inputMessage = ref('')
const isTyping = ref(false)
const chatContainer = ref<HTMLElement>()
const isServiceConfigured = ref(false)
const orderId = ref<string | null>(null)

// AI默认回复
const aiResponses = [
  '我理解您的问题，让我为您查询相关信息。',
  '感谢您的咨询，我会尽力为您解答。',
  '这是一个很好的问题，让我为您详细说明。',
  '我已经收到您的问题，正在为您处理。',
  '如果您还有其他问题，随时可以咨询我。'
]

// 快捷回复选项
const quickReplies = [
  '查询订单状态',
  '申请退款',
  '商品咨询',
  '物流查询',
  '账户问题'
]

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim()) return

  // 检查AI服务是否配置
  if (!isServiceConfigured.value) {
    ElMessage.warning('请先配置AI服务')
    router.push('/ai-settings')
    return
  }

  const userMessage: ChatMessage = {
    id: Date.now().toString(),
    content: inputMessage.value,
    type: 'user',
    timestamp: new Date()
  }

  messages.value.push(userMessage)
  const messageContent = inputMessage.value
  inputMessage.value = ''
  
  await nextTick()
  scrollToBottom()
  
  // 调用AI服务生成回复
  await generateAIResponse(messageContent)
}

// 生成AI回复
const generateAIResponse = async (userMessage: string) => {
  isTyping.value = true
  
  try {
    const aiService = getAIService()
    if (!aiService) {
      throw new Error('AI服务未配置')
    }
    
    // 构建上下文信息
    let contextMessage = userMessage
    const currentOrderId = route.query.orderId as string
    if (currentOrderId) {
      contextMessage = `用户订单ID: ${currentOrderId}\n用户问题: ${userMessage}`
    }
    
    const response: AIResponse = await aiService.sendMessage(contextMessage)
    
    const aiMessage: ChatMessage = {
      id: Date.now().toString(),
      content: response.content,
      type: 'ai',
      timestamp: new Date()
    }
    
    isTyping.value = false
    messages.value.push(aiMessage)
    
    await nextTick()
    scrollToBottom()
  } catch (error) {
    isTyping.value = false
    console.error('AI服务调用失败:', error)
    
    const errorMessage: ChatMessage = {
      id: Date.now().toString(),
      content: '抱歉，AI服务暂时不可用，请稍后再试或联系人工客服。',
      type: 'ai',
      timestamp: new Date()
    }
    
    messages.value.push(errorMessage)
    await nextTick()
    scrollToBottom()
    
    ElMessage.error('AI服务调用失败，请检查配置')
  }
}

// 生成本地AI回复（备用）
const generateLocalAIResponse = (userInput: string): string => {
  const input = userInput.toLowerCase()
  
  if (input.includes('订单') || input.includes('order')) {
    if (orderId.value) {
      return `我看到您咨询的是订单 ${orderId.value} 的相关问题。这个订单目前状态正常，如果您需要查看详细信息，可以在订单列表中查看。还有什么其他问题吗？`
    }
    return '关于订单问题，您可以在"我的订单"页面查看订单状态、物流信息等。如果有具体问题，请告诉我订单号，我来为您详细查询。'
  }
  
  if (input.includes('退货') || input.includes('退款') || input.includes('换货')) {
    return '关于退换货服务：\n1. 商品在收货后7天内可申请退换货\n2. 商品需保持原包装完整\n3. 退款将在3-5个工作日内到账\n\n您可以在订单详情页面点击"申请退款"按钮进行操作。'
  }
  
  if (input.includes('物流') || input.includes('快递') || input.includes('配送')) {
    return '关于物流配送：\n1. 一般情况下1-3个工作日发货\n2. 支持顺丰、圆通、中通等多家快递\n3. 可在订单详情页面查看物流轨迹\n\n如需查询具体物流信息，请提供订单号。'
  }
  
  if (input.includes('支付') || input.includes('付款')) {
    return '支付相关问题：\n1. 支持支付宝、微信支付、银联支付\n2. 支付后如未到账，请稍等片刻或联系客服\n3. 支付失败可尝试更换支付方式\n\n如有具体支付问题，请详细描述。'
  }
  
  if (input.includes('优惠券') || input.includes('折扣') || input.includes('活动')) {
    return '优惠券使用说明：\n1. 优惠券有使用期限，请及时使用\n2. 部分商品可能不支持优惠券\n3. 每个订单只能使用一张优惠券\n\n您可以在"我的优惠券"页面查看可用优惠券。'
  }
  
  if (input.includes('商品') || input.includes('产品')) {
    return '关于商品咨询：\n1. 商品详情页面有详细的参数说明\n2. 可查看其他用户的评价和晒单\n3. 如需了解更多信息，请提供具体商品名称\n\n我会为您提供详细的商品信息。'
  }
  
  // 默认回复
  const randomIndex = Math.floor(Math.random() * aiResponses.length)
  return aiResponses[randomIndex]
}

// 快捷回复
const handleQuickReply = (reply: string) => {
  inputMessage.value = reply
  sendMessage()
}

// 滚动到底部
const scrollToBottom = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

// 返回上一页
const goBack = () => {
  router.back()
}

// 格式化时间
const formatTime = (date: Date) => {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 检查AI服务配置
const checkAIServiceConfig = () => {
  const configManager = AIConfigManager.getInstance()
  isServiceConfigured.value = configManager.isConfigured()
}

// 跳转到AI设置页面
const goToAISettings = () => {
  router.push('/ai-settings')
}

// 组件挂载时的初始化
onMounted(async () => {
  // 检查AI服务配置
  checkAIServiceConfig()
  
  // 发送欢迎消息
  orderId.value = route.query.orderId as string
  const welcomeMessage: ChatMessage = {
    id: 'welcome',
    content: orderId.value 
      ? `您好！我是AI智能客服。我看到您咨询的是订单 ${orderId.value} 相关问题，请问有什么可以帮助您的吗？`
      : '您好！我是AI智能客服，很高兴为您服务。请问有什么可以帮助您的吗？',
    type: 'ai',
    timestamp: new Date()
  }
  
  messages.value.push(welcomeMessage)
  
  // 如果AI服务未配置，显示提示消息
  if (!isServiceConfigured.value) {
    const configTipMessage: ChatMessage = {
      id: 'config-tip',
      content: '当前AI服务未配置，请先进行配置以获得更好的服务体验。',
      type: 'ai',
      timestamp: new Date()
    }
    messages.value.push(configTipMessage)
  }
  
  await nextTick()
  scrollToBottom()
})

// 处理回车发送
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}
</script>

<template>
  <div class="customer-service-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <el-button :icon="ArrowLeft" @click="goBack" type="primary" plain>
        返回
      </el-button>
      <div class="header-info">
        <h1 class="page-title">
          <el-icon class="title-icon"><Service /></el-icon>
          AI智能客服
        </h1>
        <span class="online-status">在线服务中</span>
      </div>
      <div class="header-actions">
        <el-button 
          :icon="Setting" 
          circle 
          @click="goToAISettings"
          class="settings-button"
          :type="isServiceConfigured ? 'primary' : 'warning'"
        />
      </div>
    </div>
    
    <!-- 配置状态提示 -->
    <div v-if="!isServiceConfigured" class="config-warning">
      <el-alert
        title="AI服务未配置"
        description="请点击右上角设置按钮配置AI服务以获得更好的体验"
        type="warning"
        :closable="false"
        show-icon
      />
    </div>

    <!-- 聊天容器 -->
    <div class="chat-container">
      <!-- 聊天消息区域 -->
      <div class="chat-messages" ref="chatContainer">
        <div 
          v-for="message in messages" 
          :key="message.id"
          :class="['message-item', message.type]"
        >
          <div class="message-avatar">
            <el-avatar 
              :icon="message.type === 'user' ? User : Service"
              :style="{
                backgroundColor: message.type === 'user' ? '#409EFF' : '#67C23A'
              }"
            />
          </div>
          <div class="message-content">
            <div class="message-bubble">
              <div class="message-text" v-html="message.content.replace(/\n/g, '<br>')">
              </div>
            </div>
            <div class="message-time">
              {{ formatTime(message.timestamp) }}
            </div>
          </div>
        </div>
        
        <!-- AI正在输入提示 -->
        <div v-if="isTyping" class="message-item ai typing">
          <div class="message-avatar">
            <el-avatar :icon="Service" style="background-color: #67C23A" />
          </div>
          <div class="message-content">
            <div class="message-bubble">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 快捷回复 -->
      <div class="quick-replies" v-if="messages.length <= 1">
        <div class="quick-replies-title">常见问题：</div>
        <div class="quick-replies-list">
          <el-button 
            v-for="reply in quickReplies" 
            :key="reply"
            size="small"
            type="info"
            plain
            @click="handleQuickReply(reply)"
          >
            {{ reply }}
          </el-button>
        </div>
      </div>
      
      <!-- 输入区域 -->
      <div class="chat-input">
        <div class="input-container">
          <el-input
            v-model="inputMessage"
            ref="inputRef"
            type="textarea"
            :rows="2"
            placeholder="请输入您的问题..."
            @keypress="handleKeyPress"
            :disabled="isTyping"
          />
          <div class="input-actions">
            <el-button 
              type="primary" 
              :icon="Promotion"
              @click="sendMessage"
              :disabled="!inputMessage.trim() || isTyping"
            >
              发送
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.customer-service-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

/* 页面头部 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.settings-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
}

.settings-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.config-warning {
  padding: 16px 20px;
  background: #fdf6ec;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  color: #67C23A;
}

.online-status {
  padding: 4px 12px;
  background: #67C23A;
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

/* 聊天容器 */
.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  padding: 0 24px;
}

/* 聊天消息区域 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-item {
  display: flex;
  gap: 12px;
  animation: fadeInUp 0.3s ease;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-item.user .message-content {
  align-items: flex-end;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 18px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
}

.message-item.user .message-bubble {
  background: #409EFF;
  color: white;
}

.message-item.ai .message-bubble {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
}

.message-text {
  line-height: 1.5;
  word-wrap: break-word;
}

.message-time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 正在输入动画 */
.typing-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #909399;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

/* 快捷回复 */
.quick-replies {
  padding: 16px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  margin-bottom: 16px;
}

.quick-replies-title {
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
  font-weight: 500;
}

.quick-replies-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 输入区域 */
.chat-input {
  padding: 16px 0;
  background: rgba(255, 255, 255, 0.95);
  border-top: 1px solid #e4e7ed;
  backdrop-filter: blur(10px);
}

.input-container {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-container :deep(.el-textarea) {
  flex: 1;
}

.input-container :deep(.el-textarea__inner) {
  border-radius: 12px;
  border: 1px solid #dcdfe6;
  resize: none;
  font-size: 14px;
}

.input-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 动画 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-container {
    padding: 0 16px;
  }
  
  .page-header {
    padding: 12px 16px;
  }
  
  .message-content {
    max-width: 85%;
  }
  
  .input-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .input-actions {
    flex-direction: row;
    justify-content: flex-end;
  }
}
</style>