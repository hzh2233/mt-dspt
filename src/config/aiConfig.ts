// AI配置管理

// AI服务提供商枚举
export enum AIProvider {
  VOLCENGINE = 'volcengine', // 火山方舟
  OPENAI = 'openai',
  AZURE = 'azure',
  CUSTOM = 'custom'
}

// AI模型配置
export interface AIModelConfig {
  id: string
  name: string
  description: string
  provider: AIProvider
  maxTokens: number
  supportStream: boolean
  supportReasoning: boolean // 是否支持深度思考
}

// 预定义的AI模型
export const AI_MODELS: Record<string, AIModelConfig> = {
  // 火山方舟模型
  'deepseek-r1-250120': {
    id: 'bot-20250221150454-8g452',
    name: 'DeepSeek R1',
    description: '深度思考推理模型，具备强大的逻辑推理能力',
    provider: AIProvider.VOLCENGINE,
    maxTokens: 8192,
    supportStream: true,
    supportReasoning: true
  },
  'doubao-thinking-pro': {
    id: 'doubao-thinking-pro',
    name: '豆包思考Pro',
    description: '豆包深度思考模型，适合复杂问题解答',
    provider: AIProvider.VOLCENGINE,
    maxTokens: 4096,
    supportStream: true,
    supportReasoning: true
  },
  'doubao-pro-4k': {
    id: 'doubao-pro-4k',
    name: '豆包Pro 4K',
    description: '豆包通用对话模型',
    provider: AIProvider.VOLCENGINE,
    maxTokens: 4096,
    supportStream: true,
    supportReasoning: false
  },
  // OpenAI模型（示例）
  'gpt-4': {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'OpenAI GPT-4 模型',
    provider: AIProvider.OPENAI,
    maxTokens: 8192,
    supportStream: true,
    supportReasoning: false
  }
}

// AI服务配置
export interface AIServiceConfig {
  provider: AIProvider
  apiKey: string
  baseURL: string
  model: string
  maxTokens: number
  temperature: number
  timeout: number
  enableReasoning: boolean // 是否启用深度思考
  systemPrompt: string
}

// 默认系统提示词
export const DEFAULT_SYSTEM_PROMPTS = {
  customer_service: `你是一个专业的电商客服助手，具备以下特点：

1. **专业性**：熟悉电商业务流程，包括订单管理、物流配送、退换货政策、支付方式等
2. **友好性**：使用温和、礼貌的语言，始终保持耐心和理解
3. **准确性**：提供准确、具体的信息，避免模糊或误导性回答
4. **效率性**：快速理解用户问题，提供简洁明了的解决方案

**回答规范**：
- 使用中文回答
- 保持简洁明了，避免冗长
- 提供具体的操作步骤
- 遇到无法解决的问题时，建议联系人工客服
- 对于订单相关问题，优先询问订单号

**常见问题处理**：
- 订单查询：引导用户到订单页面查看
- 物流问题：提供物流查询方式
- 退换货：说明退换货政策和流程
- 支付问题：提供支付方式和故障排除
- 商品咨询：引导查看商品详情页

请始终以用户体验为中心，提供优质的客服服务。`,
  
  general: `你是一个智能助手，请用中文回答用户的问题。保持回答的准确性、有用性和友好性。`
}

// 默认配置
export const DEFAULT_AI_CONFIG: Partial<AIServiceConfig> = {
  provider: AIProvider.VOLCENGINE,
  apiKey: import.meta.env.VITE_VOLCENGINE_API_KEY || '',
  baseURL: import.meta.env.VITE_VOLCENGINE_BASE_URL || 'https://ark.cn-beijing.volces.com',
  model: 'deepseek-r1-250120',
  maxTokens: 2000,
  temperature: 0.7,
  timeout: 30000,
  enableReasoning: true,
  systemPrompt: DEFAULT_SYSTEM_PROMPTS.customer_service
}

// 配置存储键名
export const AI_CONFIG_STORAGE_KEY = 'ai_service_config'

// 配置管理类
export class AIConfigManager {
  private static instance: AIConfigManager
  private config: AIServiceConfig | null = null

  private constructor() {
    this.loadConfig()
  }

  static getInstance(): AIConfigManager {
    if (!AIConfigManager.instance) {
      AIConfigManager.instance = new AIConfigManager()
    }
    return AIConfigManager.instance
  }

  // 加载配置
  loadConfig(): AIServiceConfig | null {
    try {
      const stored = localStorage.getItem(AI_CONFIG_STORAGE_KEY)
      if (stored) {
        this.config = { ...DEFAULT_AI_CONFIG, ...JSON.parse(stored) } as AIServiceConfig
      }
      return this.config
    } catch (error) {
      console.error('加载AI配置失败:', error)
      return null
    }
  }

  // 保存配置
  saveConfig(config: Partial<AIServiceConfig>): void {
    try {
      this.config = { ...DEFAULT_AI_CONFIG, ...this.config, ...config } as AIServiceConfig
      localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(this.config))
    } catch (error) {
      console.error('保存AI配置失败:', error)
      throw new Error('保存配置失败')
    }
  }

  // 获取配置
  getConfig(): AIServiceConfig | null {
    return this.config
  }

  // 重置配置
  resetConfig(): void {
    this.config = DEFAULT_AI_CONFIG as AIServiceConfig
    localStorage.removeItem(AI_CONFIG_STORAGE_KEY)
  }

  // 验证配置
  validateConfig(config: Partial<AIServiceConfig>): string[] {
    const errors: string[] = []

    if (!config.apiKey || config.apiKey.trim() === '') {
      errors.push('API密钥不能为空')
    }

    if (!config.baseURL || config.baseURL.trim() === '') {
      errors.push('API地址不能为空')
    }

    if (!config.model || config.model.trim() === '') {
      errors.push('模型名称不能为空')
    }

    if (config.maxTokens && (config.maxTokens < 1 || config.maxTokens > 32768)) {
      errors.push('最大Token数量应在1-32768之间')
    }

    if (config.temperature && (config.temperature < 0 || config.temperature > 2)) {
      errors.push('温度参数应在0-2之间')
    }

    if (config.timeout && config.timeout < 1000) {
      errors.push('超时时间不能少于1秒')
    }

    return errors
  }

  // 获取可用模型列表
  getAvailableModels(provider?: AIProvider): AIModelConfig[] {
    const models = Object.values(AI_MODELS)
    if (provider) {
      return models.filter(model => model.provider === provider)
    }
    return models
  }

  // 检查是否已配置
  isConfigured(): boolean {
    const config = this.getConfig()
    return !!(config?.apiKey && config?.baseURL && config?.model)
  }
}

// 导出单例实例
export const aiConfigManager = AIConfigManager.getInstance()