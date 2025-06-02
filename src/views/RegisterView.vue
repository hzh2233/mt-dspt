<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { userApi } from '@/services/api'
import type { LoginResponse } from '@/types/api'

const router = useRouter()
const userStore = useUserStore()

const registerForm = reactive({
  nickname: '',
  password: '',
  confirmPassword: '',
  phone: '',
  code: '',
  captcha: '' // 图形验证码
})

const registerFormRef = ref<FormInstance>()
const loading = ref(false)

// 图形验证码相关
const captchaKey = ref('')
const captchaImage = ref('')
const captchaLoading = ref(false)

// 自定义验证规则：确认密码
const validateConfirmPassword = (rule: any, value: string, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入密码'))
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入密码不一致'))
  } else {
    callback()
  }
}

// 自定义验证规则：手机号
const validatePhone = (rule: any, value: string, callback: any) => {
  const phoneRegex = /^1[3-9]\d{9}$/
  if (value === '') {
    callback(new Error('请输入手机号'))
  } else if (!phoneRegex.test(value)) {
    callback(new Error('请输入正确的手机号'))
  } else {
    callback()
  }
}

const rules = reactive<FormRules>({
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validateConfirmPassword, trigger: 'blur' }
  ],
  phone: [
    { required: true, validator: validatePhone, trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '验证码为6位数字', trigger: 'blur' }
  ],
  captcha: [
    { required: true, message: '请输入图形验证码', trigger: 'blur' },
    { min: 4, max: 6, message: '验证码长度为4-6位', trigger: 'blur' }
  ]
})

// 验证码倒计时
const countdown = ref(0)
const codeButtonText = computed(() => {
  return countdown.value > 0 ? `${countdown.value}秒后重新获取` : '获取验证码'
})
const codeButtonDisabled = computed(() => {
  return countdown.value > 0 || !registerForm.phone || !/^1[3-9]\d{9}$/.test(registerForm.phone)
})

// 获取短信验证码
const getVerificationCode = async () => {
  if (codeButtonDisabled.value) return
  
  try {
    await userApi.getVerificationCode(registerForm.phone)
    ElMessage.success('验证码已发送，请注意查收')
    
    // 开始倒计时
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  } catch (error) {
    console.error('获取验证码失败', error)
  }
}

// 获取图形验证码
const getCaptcha = async () => {
  try {
    captchaLoading.value = true
    const response = await userApi.getCaptcha()
    captchaKey.value = response.key
    captchaImage.value = response.image
  } catch (error) {
    console.error('获取图形验证码失败', error)
    ElMessage.error('获取图形验证码失败')
  } finally {
    captchaLoading.value = false
  }
}

// 刷新图形验证码
const refreshCaptcha = () => {
  registerForm.captcha = ''
  getCaptcha()
}

const handleRegister = async (formEl: FormInstance | undefined) => {
  if (!formEl) return

  await formEl.validate(async (valid) => {
    if (valid) {
      loading.value = true
      
      try {
        // 发送注册请求
        const response = await userApi.register(
          registerForm.phone, 
          registerForm.password, 
          registerForm.code,
          registerForm.captcha,
          captchaKey.value,
          registerForm.nickname
        )
        
        ElMessage.success('注册成功！请使用手机号和密码登录')
        
        // 注册成功后跳转到登录页面
        await router.push('/login')
        
      } catch (error) {
        console.error('注册失败', error)
        ElMessage.error('注册失败，请检查输入信息')
        // 刷新图形验证码
        refreshCaptcha()
      } finally {
        loading.value = false
      }
    }
  })
}

const goToLogin = () => {
  router.push('/login')
}

// 页面挂载时获取图形验证码
onMounted(() => {
  getCaptcha()
})
</script>

<template>
  <div class="register-view">
    <el-card class="register-card">
      <template #header>
        <h2 class="card-header">用户注册</h2>
      </template>

      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="rules"
        label-width="100px"
        class="register-form"
      >
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="registerForm.nickname" placeholder="请输入昵称" />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            show-password
          />
        </el-form-item>

        <el-form-item label="手机号" prop="phone">
          <el-input v-model="registerForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        
        <el-form-item label="验证码" prop="code">
          <el-input 
            v-model="registerForm.code" 
            placeholder="请输入验证码"
            class="verification-code-input"
          >
            <template #append>
              <el-button 
                :disabled="codeButtonDisabled" 
                @click="getVerificationCode"
              >
                {{ codeButtonText }}
              </el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="图形验证" prop="captcha">
          <div class="captcha-container">
            <el-input 
              v-model="registerForm.captcha" 
              placeholder="请输入图形验证码"
              class="captcha-input"
            />
            <div class="captcha-image-wrapper">
              <img 
                v-if="captchaImage" 
                :src="captchaImage" 
                alt="验证码"
                class="captcha-image"
                @click="refreshCaptcha"
                title="点击刷新验证码"
              />
              <el-button 
                v-else
                :loading="captchaLoading"
                @click="getCaptcha"
                size="small"
              >
                获取验证码
              </el-button>
            </div>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleRegister(registerFormRef)">注册</el-button>
          <el-button @click="goToLogin">返回登录</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.register-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;

  .register-card {
    width: 100%;
    max-width: 480px;
    background-color: rgba(255, 255, 255, 0.95);
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);

    :deep(.el-card__header) {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px 16px 0 0;
      padding: 25px;
    }

    .card-header {
      text-align: center;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    :deep(.el-card__body) {
      padding: 30px;
    }

    .register-form {
      margin-top: 0;
      
      :deep(.el-form-item__label) {
        font-weight: 500;
        color: #2c3e50;
        font-size: 14px;
      }
      
      :deep(.el-input__wrapper) {
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
      }
      
      :deep(.el-input__wrapper:hover) {
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
      }
      
      :deep(.el-input__wrapper.is-focus) {
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.25);
      }
      
      .verification-code-input {
        width: 100%;
        :deep(.el-input-group__append) {
          padding: 0;
          width: 120px;
          border-radius: 0 8px 8px 0;
          
          .el-button {
            border-radius: 0;
            height: 100%;
            width: 100%;
            padding: 0 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            color: white;
            font-weight: 500;
            transition: all 0.3s ease;
          }
          
          .el-button:hover {
            background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
            transform: translateY(-1px);
          }
        }
      }

      .captcha-container {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .captcha-input {
        flex: 1;
      }

      .captcha-image-wrapper {
        flex-shrink: 0;
      }

      .captcha-image {
        width: 130px;
        height: 48px;
        border: 2px solid #e1e8ed;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .captcha-image:hover {
        border-color: #667eea;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
      }
      
      :deep(.el-button) {
        border-radius: 8px;
        font-weight: 500;
        transition: all 0.3s ease;
      }
      
      :deep(.el-button--primary) {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        padding: 12px 30px;
        font-size: 16px;
      }
      
      :deep(.el-button--primary:hover) {
        background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
      }
      
      :deep(.el-button:not(.el-button--primary)) {
        color: #667eea;
        border-color: #667eea;
        background: transparent;
      }
      
      :deep(.el-button:not(.el-button--primary):hover) {
        background: #667eea;
        color: white;
        transform: translateY(-1px);
      }
    }
  }
}

@media (max-width: 768px) {
  .register-view {
    padding: 10px;
    
    .register-card {
      max-width: 100%;
      
      :deep(.el-card__body) {
        padding: 20px;
      }
    }
  }
}
</style>