import axios from 'axios'
import { AI_MODELS } from '@/config/aiConfig'

// AI服务配置接口
interface AIConfig {
  apiKey: string
  baseURL: string
  model: string
  maxTokens?: number
  temperature?: number
  timeout?: number
}

// 聊天消息接口
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// AI响应接口
interface AIResponse {
  content: string
  reasoning?: string // 深度思考模型的推理过程
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// AI服务类
class AIService {
  private config: AIConfig
  private conversationHistory: ChatMessage[] = []

  constructor(config: AIConfig) {
    this.config = {
      maxTokens: 2000,
      temperature: 0.7,
      timeout: 30000, // 30秒超时
      ...config
    }
  }

  // 更新配置
  updateConfig(newConfig: Partial<AIConfig>) {
    this.config = { ...this.config, ...newConfig }
  }

  // 设置系统提示词
  setSystemPrompt(prompt: string) {
    // 移除之前的系统消息
    this.conversationHistory = this.conversationHistory.filter(msg => msg.role !== 'system')
    // 添加新的系统消息到开头
    this.conversationHistory.unshift({
      role: 'system',
      content: prompt
    })
  }

  // 发送消息到AI
  async sendMessage(userMessage: string, context?: any): Promise<AIResponse> {
    try {
      // 添加用户消息到历史记录
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      })

      // 获取模型配置
      const modelConfig = AI_MODELS[this.config.model]
      const modelId = modelConfig ? modelConfig.id : this.config.model

      // 构建请求数据
      const requestData = {
        model: modelId, // 使用实际的模型ID
        messages: this.conversationHistory,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: false // 非流式输出
      }

      // 发送请求到火山方舟API
      const response = await axios.post(
        `${this.config.baseURL}`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          timeout: this.config.timeout
        }
      )

      const aiResponse = response.data
      const assistantMessage = aiResponse.choices[0].message

      // 添加AI回复到历史记录
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage.content
      })

      // 限制历史记录长度，保留最近的20条消息
      if (this.conversationHistory.length > 20) {
        // 保留系统消息
        const systemMessages = this.conversationHistory.filter(msg => msg.role === 'system')
        const otherMessages = this.conversationHistory.filter(msg => msg.role !== 'system').slice(-19)
        this.conversationHistory = [...systemMessages, ...otherMessages]
      }

      return {
        content: assistantMessage.content,
        reasoning: assistantMessage.reasoning_content, // 深度思考模型的推理过程
        usage: aiResponse.usage
      }
    } catch (error: any) {
      console.error('AI服务调用失败:', error)
      
      // 处理不同类型的错误
      if (error.code === 'ECONNABORTED') {
        throw new Error('AI服务请求超时，请稍后重试')
      } else if (error.response?.status === 401) {
        throw new Error('AI服务认证失败，请检查API密钥')
      } else if (error.response?.status === 429) {
        throw new Error('AI服务请求频率过高，请稍后重试')
      } else if (error.response?.status >= 500) {
        throw new Error('AI服务暂时不可用，请稍后重试')
      } else {
        throw new Error(`AI服务调用失败: ${error.message}`)
      }
    }
  }

  // 流式发送消息（用于实时响应）
  async sendMessageStream(
    userMessage: string, 
    onChunk: (chunk: string) => void,
    context?: any
  ): Promise<void> {
    try {
      // 添加用户消息到历史记录
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      })

      // 获取模型配置
      const modelConfig = AI_MODELS[this.config.model]
      const modelId = modelConfig ? modelConfig.id : this.config.model

      const requestData = {
        model: modelId, // 使用实际的模型ID
        messages: this.conversationHistory,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: true // 流式输出
      }

      const response = await fetch(
        `${this.config.baseURL}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify(requestData)
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取响应流')
      }

      let fullContent = ''
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                break
              }

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  fullContent += content
                  onChunk(content)
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      // 添加完整的AI回复到历史记录
      if (fullContent) {
        this.conversationHistory.push({
          role: 'assistant',
          content: fullContent
        })
      }

      // 限制历史记录长度
      if (this.conversationHistory.length > 20) {
        const systemMessages = this.conversationHistory.filter(msg => msg.role === 'system')
        const otherMessages = this.conversationHistory.filter(msg => msg.role !== 'system').slice(-19)
        this.conversationHistory = [...systemMessages, ...otherMessages]
      }
    } catch (error: any) {
      console.error('AI流式服务调用失败:', error)
      throw new Error(`AI流式服务调用失败: ${error.message}`)
    }
  }

  // 清除对话历史
  clearHistory() {
    const systemMessages = this.conversationHistory.filter(msg => msg.role === 'system')
    this.conversationHistory = systemMessages
  }

  // 获取对话历史
  getHistory(): ChatMessage[] {
    return [...this.conversationHistory]
  }

  // 检查服务状态
  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.baseURL}/health`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        timeout: 5000
      })
      return response.status === 200
    } catch {
      return false
    }
  }
}

// 默认配置
const DEFAULT_CONFIG: Partial<AIConfig> = {
  baseURL: 'https://ark.cn-beijing.volces.com',
  model: 'deepseek-r1-250120', // 默认使用深度思考模型
  maxTokens: 2000,
  temperature: 0.7,
  timeout: 30000
}

// 创建AI服务实例
let aiServiceInstance: AIService | null = null

// 初始化AI服务
export function initAIService(config: AIConfig): AIService {
  const fullConfig = { ...DEFAULT_CONFIG, ...config } as AIConfig
  aiServiceInstance = new AIService(fullConfig)
  return aiServiceInstance
}

// 获取AI服务实例
export function getAIService(): AIService | null {
  return aiServiceInstance
}

// 导出类型
export type { AIConfig, ChatMessage, AIResponse }
export { AIService }