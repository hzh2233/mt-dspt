<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Setting, Key, Cpu, Refresh, Check, Warning } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { 
  aiConfigManager, 
  AIProvider, 
  AI_MODELS, 
  DEFAULT_SYSTEM_PROMPTS,
  type AIServiceConfig 
} from '@/config/aiConfig'
import { initAIService, getAIService } from '@/services/aiService'

const router = useRouter()

// 表单引用
const formRef = ref<FormInstance>()

// 加载状态
const loading = ref(false)
const testing = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)

// 配置表单
const configForm = reactive<Partial<AIServiceConfig>>({
  provider: AIProvider.VOLCENGINE,
  apiKey: '',
  baseURL: 'https://ark.cn-beijing.volces.com',
  model: 'deepseek-r1-250120',
  maxTokens: 2000,
  temperature: 0.7,
  timeout: 30000,
  enableReasoning: true,
  systemPrompt: DEFAULT_SYSTEM_PROMPTS.customer_service
})

// 表单验证规则
const formRules: FormRules = {
  apiKey: [
    { required: true, message: '请输入API密钥', trigger: 'blur' },
    { min: 10, message: 'API密钥长度不能少于10位', trigger: 'blur' }
  ],
  baseURL: [
    { required: true, message: '请输入API地址', trigger: 'blur' },
    { type: 'url', message: '请输入有效的URL地址', trigger: 'blur' }
  ],
  model: [
    { required: true, message: '请选择模型', trigger: 'change' }
  ],
  maxTokens: [
    { required: true, message: '请输入最大Token数', trigger: 'blur' },
    { type: 'number', min: 1, max: 32768, message: '最大Token数应在1-32768之间', trigger: 'blur' }
  ],
  temperature: [
    { required: true, message: '请输入温度参数', trigger: 'blur' },
    { type: 'number', min: 0, max: 2, message: '温度参数应在0-2之间', trigger: 'blur' }
  ],
  timeout: [
    { required: true, message: '请输入超时时间', trigger: 'blur' },
    { type: 'number', min: 1000, message: '超时时间不能少于1秒', trigger: 'blur' }
  ]
}

// 计算属性
const availableModels = computed(() => {
  return aiConfigManager.getAvailableModels(configForm.provider)
})

const selectedModel = computed(() => {
  return AI_MODELS[configForm.model || ''] || null
})

const isConfigured = computed(() => {
  return aiConfigManager.isConfigured()
})

// 提供商选项
const providerOptions = [
  { label: '火山方舟', value: AIProvider.VOLCENGINE },
  { label: 'OpenAI', value: AIProvider.OPENAI },
  { label: 'Azure OpenAI', value: AIProvider.AZURE },
  { label: '自定义', value: AIProvider.CUSTOM }
]

// 系统提示词模板
const systemPromptTemplates = [
  { label: '客服助手', value: DEFAULT_SYSTEM_PROMPTS.customer_service },
  { label: '通用助手', value: DEFAULT_SYSTEM_PROMPTS.general }
]

// 加载配置
const loadConfig = () => {
  const config = aiConfigManager.getConfig()
  if (config) {
    Object.assign(configForm, config)
  }
}

// 保存配置
const saveConfig = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    // 验证配置
    const errors = aiConfigManager.validateConfig(configForm)
    if (errors.length > 0) {
      ElMessage.error(errors[0])
      return
    }
    
    loading.value = true
    
    // 保存配置
    aiConfigManager.saveConfig(configForm)
    
    // 初始化AI服务
    if (configForm.apiKey && configForm.baseURL && configForm.model) {
      initAIService(configForm as any)
    }
    
    ElMessage.success('配置保存成功')
    
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('配置验证失败，请检查输入')
  } finally {
    loading.value = false
  }
}

// 测试连接
const testConnection = async () => {
  if (!configForm.apiKey || !configForm.baseURL || !configForm.model) {
    ElMessage.warning('请先填写完整的配置信息')
    return
  }
  
  testing.value = true
  testResult.value = null
  
  try {
    // 临时创建AI服务实例进行测试
    const testService = initAIService(configForm as any)
    
    // 发送测试消息
    const response = await testService.sendMessage('你好，这是一个连接测试')
    
    if (response.content) {
      testResult.value = {
        success: true,
        message: '连接测试成功！AI服务响应正常'
      }
      ElMessage.success('连接测试成功')
    } else {
      throw new Error('AI服务无响应')
    }
  } catch (error: any) {
    testResult.value = {
      success: false,
      message: `连接测试失败: ${error.message}`
    }
    ElMessage.error('连接测试失败')
  } finally {
    testing.value = false
  }
}

// 重置配置
const resetConfig = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重置所有配置吗？这将清除已保存的设置。',
      '重置配置',
      {
        confirmButtonText: '确定重置',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    aiConfigManager.resetConfig()
    loadConfig()
    ElMessage.success('配置已重置')
  } catch {
    // 用户取消
  }
}

// 应用系统提示词模板
const applySystemPromptTemplate = (template: string) => {
  configForm.systemPrompt = template
}

// 当提供商改变时更新相关配置
const onProviderChange = () => {
  // 根据提供商设置默认URL和模型
  switch (configForm.provider) {
    case AIProvider.VOLCENGINE:
      configForm.baseURL = 'https://ark.cn-beijing.volces.com'
      configForm.model = 'deepseek-r1-250120'
      break
    case AIProvider.OPENAI:
      configForm.baseURL = 'https://api.openai.com'
      configForm.model = 'gpt-4'
      break
    case AIProvider.AZURE:
      configForm.baseURL = 'https://your-resource.openai.azure.com'
      configForm.model = 'gpt-4'
      break
    default:
      configForm.baseURL = ''
      configForm.model = ''
  }
}

// 返回上一页
const goBack = () => {
  router.back()
}

// 组件挂载时加载配置
onMounted(() => {
  loadConfig()
})
</script>

<template>
  <div class="ai-settings-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <el-button :icon="ArrowLeft" @click="goBack" type="primary" plain>
        返回
      </el-button>
      <div class="header-info">
        <h1 class="page-title">
          <el-icon class="title-icon"><Setting /></el-icon>
          AI服务配置
        </h1>
        <el-tag v-if="isConfigured" type="success" size="small">
          已配置
        </el-tag>
        <el-tag v-else type="warning" size="small">
          未配置
        </el-tag>
      </div>
    </div>

    <!-- 配置表单 -->
    <div class="settings-container">
      <el-card class="config-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title">
              <el-icon><Key /></el-icon>
              基础配置
            </span>
            <div class="header-actions">
              <el-button 
                :icon="Refresh" 
                @click="testConnection" 
                :loading="testing"
                type="primary"
                size="small"
              >
                测试连接
              </el-button>
            </div>
          </div>
        </template>

        <el-form 
          ref="formRef"
          :model="configForm" 
          :rules="formRules"
          label-width="120px"
          class="config-form"
        >
          <!-- 服务提供商 -->
          <el-form-item label="服务提供商" prop="provider">
            <el-select 
              v-model="configForm.provider" 
              @change="onProviderChange"
              style="width: 100%"
            >
              <el-option 
                v-for="option in providerOptions" 
                :key="option.value"
                :label="option.label" 
                :value="option.value"
              />
            </el-select>
          </el-form-item>

          <!-- API密钥 -->
          <el-form-item label="API密钥" prop="apiKey">
            <el-input 
              v-model="configForm.apiKey" 
              type="password" 
              placeholder="请输入API密钥"
              show-password
              clearable
            >
              <template #prepend>
                <el-icon><Key /></el-icon>
              </template>
            </el-input>
            <div class="form-tip">
              请在火山方舟控制台获取API密钥，密钥将安全存储在本地
            </div>
          </el-form-item>

          <!-- API地址 -->
          <el-form-item label="API地址" prop="baseURL">
            <el-input 
              v-model="configForm.baseURL" 
              placeholder="请输入API地址"
              clearable
            />
          </el-form-item>

          <!-- 模型选择 -->
          <el-form-item label="AI模型" prop="model">
            <el-select v-model="configForm.model" style="width: 100%">
              <el-option 
                v-for="model in availableModels" 
                :key="model.id"
                :label="model.name" 
                :value="model.id"
              >
                <div class="model-option">
                  <span class="model-name">{{ model.name }}</span>
                  <el-tag v-if="model.supportReasoning" type="success" size="small">
                    深度思考
                  </el-tag>
                </div>
                <div class="model-desc">{{ model.description }}</div>
              </el-option>
            </el-select>
            <div v-if="selectedModel" class="model-info">
              <el-descriptions :column="2" size="small">
                <el-descriptions-item label="最大Token">{{ selectedModel.maxTokens }}</el-descriptions-item>
                <el-descriptions-item label="流式输出">{{ selectedModel.supportStream ? '支持' : '不支持' }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 高级配置 -->
      <el-card class="config-card" shadow="hover">
        <template #header>
          <span class="card-title">
            <el-icon><Cpu /></el-icon>
            高级配置
          </span>
        </template>

        <el-form 
          :model="configForm" 
          :rules="formRules"
          label-width="120px"
          class="config-form"
        >
          <!-- 最大Token数 -->
          <el-form-item label="最大Token数" prop="maxTokens">
            <el-input-number 
              v-model="configForm.maxTokens" 
              :min="1" 
              :max="32768" 
              :step="100"
              style="width: 100%"
            />
            <div class="form-tip">
              控制AI回复的最大长度，建议设置为1000-4000
            </div>
          </el-form-item>

          <!-- 温度参数 -->
          <el-form-item label="温度参数" prop="temperature">
            <el-slider 
              v-model="configForm.temperature" 
              :min="0" 
              :max="2" 
              :step="0.1" 
              show-input
              :input-size="'small'"
            />
            <div class="form-tip">
              控制回复的随机性，0为最确定，2为最随机，建议0.7
            </div>
          </el-form-item>

          <!-- 超时时间 -->
          <el-form-item label="超时时间" prop="timeout">
            <el-input-number 
              v-model="configForm.timeout" 
              :min="1000" 
              :max="300000" 
              :step="1000"
              style="width: 100%"
            />
            <template #append>毫秒</template>
            <div class="form-tip">
              请求超时时间，深度思考模型建议设置30秒以上
            </div>
          </el-form-item>

          <!-- 启用深度思考 -->
          <el-form-item label="深度思考" v-if="selectedModel?.supportReasoning">
            <el-switch 
              v-model="configForm.enableReasoning"
              active-text="启用"
              inactive-text="禁用"
            />
            <div class="form-tip">
              启用后AI会显示思考过程，提供更准确的回答
            </div>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 系统提示词配置 -->
      <el-card class="config-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title">
              <el-icon><ChatDotRound /></el-icon>
              系统提示词
            </span>
            <div class="header-actions">
              <el-dropdown @command="applySystemPromptTemplate">
                <el-button size="small" type="primary" plain>
                  应用模板
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item 
                      v-for="template in systemPromptTemplates" 
                      :key="template.label"
                      :command="template.value"
                    >
                      {{ template.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </template>

        <el-form :model="configForm" label-width="120px">
          <el-form-item label="提示词内容">
            <el-input 
              v-model="configForm.systemPrompt" 
              type="textarea" 
              :rows="8"
              placeholder="请输入系统提示词，用于定义AI的角色和行为规范"
            />
            <div class="form-tip">
              系统提示词用于定义AI的角色、行为规范和回答风格
            </div>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 测试结果 -->
      <el-card v-if="testResult" class="test-result-card" shadow="hover">
        <template #header>
          <span class="card-title">
            <el-icon :class="testResult.success ? 'success-icon' : 'error-icon'">
              <Check v-if="testResult.success" />
              <Warning v-else />
            </el-icon>
            连接测试结果
          </span>
        </template>
        
        <div :class="['test-result', testResult.success ? 'success' : 'error']">
          {{ testResult.message }}
        </div>
      </el-card>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button @click="resetConfig" type="danger" plain>
          重置配置
        </el-button>
        <el-button 
          @click="saveConfig" 
          type="primary" 
          :loading="loading"
        >
          保存配置
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-settings-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
}

/* 页面头部 */
.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
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
  color: #409EFF;
}

/* 设置容器 */
.settings-container {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 配置卡片 */
.config-card {
  border-radius: 12px;
  overflow: hidden;
}

.config-card :deep(.el-card__header) {
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-weight: 600;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* 表单样式 */
.config-form {
  padding: 8px 0;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

/* 模型选项样式 */
.model-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.model-name {
  font-weight: 500;
}

.model-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.model-info {
  margin-top: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
}

/* 测试结果 */
.test-result-card {
  border-left: 4px solid #409EFF;
}

.test-result {
  padding: 12px;
  border-radius: 6px;
  font-weight: 500;
}

.test-result.success {
  background: #f0f9ff;
  color: #067f23;
  border: 1px solid #b3e5fc;
}

.test-result.error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.success-icon {
  color: #67C23A;
}

.error-icon {
  color: #F56C6C;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .ai-settings-view {
    padding: 12px;
  }
  
  .page-header {
    padding: 12px 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .settings-container {
    gap: 16px;
  }
  
  .config-form :deep(.el-form-item__label) {
    width: 100px !important;
  }
  
  .action-buttons {
    flex-direction: column;
  }
}
</style>