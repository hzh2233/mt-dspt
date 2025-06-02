<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { userApi } from '@/services/api'
import type { LoginResponse } from '@/types/api'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loginForm = reactive({
  phone: '',
  password: '',
  code: '',
  captcha: '', // 图形验证码
  loginType: 'password' // 'password' 或 'code'
})

const loginFormRef = ref<FormInstance>()
const loading = ref(false)

// 图形验证码相关
const captchaKey = ref('')
const captchaImage = ref('')
const captchaLoading = ref(false)

// 根据登录类型动态计算验证规则
const rules = computed(() => {
  const baseRules: FormRules = {
    phone: [
      { required: true, message: '请输入手机号', trigger: 'blur' },
      { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
    ],
    captcha: [
      { required: true, message: '请输入图形验证码', trigger: 'blur' },
      { min: 4, max: 6, message: '验证码长度为4-6位', trigger: 'blur' }
    ]
  }

  if (loginForm.loginType === 'password') {
    baseRules.password = [
      { required: true, message: '请输入密码', trigger: 'blur' },
      { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
    ]
  } else {
    baseRules.code = [
      { required: true, message: '请输入验证码', trigger: 'blur' },
      { pattern: /^\d{6}$/, message: '验证码为6位数字', trigger: 'blur' }
    ]
  }

  return baseRules
})

// 验证码倒计时
const countdown = ref(0)
const codeButtonText = computed(() => {
  return countdown.value > 0 ? `${countdown.value}秒后重新获取` : '获取验证码'
})
const codeButtonDisabled = computed(() => {
  return countdown.value > 0 || !loginForm.phone || !/^1[3-9]\d{9}$/.test(loginForm.phone)
})

// 获取短信验证码
const getVerificationCode = async () => {
  if (codeButtonDisabled.value) return
  
  try {
    await userApi.getVerificationCode(loginForm.phone)
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
  loginForm.captcha = ''
  getCaptcha()
}

const handleLogin = async (formEl: FormInstance | undefined) => {
  if (!formEl) return

  await formEl.validate(async (valid) => {
    if (valid) {
      loading.value = true
      
      try {
        let loginResponse: { token: string, userInfo: any }
        
        // 使用统一的登录接口，根据登录类型传递不同的参数
        if (loginForm.loginType === 'password') {
          // 密码登录：传递手机号、密码和图形验证码
          loginResponse = await userApi.login(loginForm.phone, loginForm.password, undefined, loginForm.captcha, captchaKey.value)
        } else {
          // 验证码登录：传递手机号、短信验证码和图形验证码
          loginResponse = await userApi.login(loginForm.phone, undefined, loginForm.code, loginForm.captcha, captchaKey.value)
        }
        
        // 检查是否获取到token
        if (!loginResponse.token || typeof loginResponse.token !== 'string') {
          throw new Error('登录失败：未获取到有效token')
        }
        
        // 使用token获取用户信息（通过/user/info接口）
        await userStore.setToken(loginResponse.token)
        
        ElMessage.success('登录成功')
        
        // 登录成功后跳转到首页或指定页面
        const redirect = route.query.redirect as string
        await router.push(redirect || '/')
        
      } catch (error) {
        console.error('登录失败', error)
        // 显示具体的错误信息
        if (error instanceof Error) {
          ElMessage.error(error.message || '登录失败，请检查用户名和密码')
        } else {
          ElMessage.error('登录失败，请检查用户名和密码')
        }
      } finally {
        loading.value = false
      }
    }
  })
}

const goToRegister = () => {
  router.push('/register')
}

// 页面挂载时获取图形验证码
onMounted(() => {
  getCaptcha()
})
</script>

<template>
  <div class="login-view">
    <el-card class="login-card">
      <template #header>
        <h2 class="card-header">用户登录</h2>
      </template>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="rules"
        label-width="80px"
        class="login-form"
      >
        <el-form-item label="登录方式" prop="loginType">
          <el-radio-group v-model="loginForm.loginType">
            <el-radio label="password">密码登录</el-radio>
            <el-radio label="code">验证码登录</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="loginForm.phone" placeholder="请输入手机号" />
        </el-form-item>

        <el-form-item v-if="loginForm.loginType === 'password'" label="密码" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        
        <el-form-item v-if="loginForm.loginType === 'code'" label="验证码" prop="code">
          <el-input 
            v-model="loginForm.code" 
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
              v-model="loginForm.captcha" 
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
          <el-button type="primary" :loading="loading" @click="handleLogin(loginFormRef)">登录</el-button>
          <el-button @click="goToRegister">注册账号</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.login-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;

  .login-card {
    width: 100%;
    max-width: 450px;
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

    .login-form {
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
      
      :deep(.el-radio-group) {
        display: flex;
        gap: 20px;
        
        .el-radio {
          margin-right: 0;
          
          .el-radio__label {
            font-weight: 500;
            color: #2c3e50;
          }
        }
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
        
        .captcha-input {
          flex: 1;
        }
        
        .captcha-image-wrapper {
          flex-shrink: 0;
          
          .captcha-image {
            width: 130px;
            height: 48px;
            border: 2px solid #e1e8ed;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            
            &:hover {
              border-color: #667eea;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
            }
          }
        }
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
  .login-view {
    padding: 10px;
    
    .login-card {
      max-width: 100%;
      
      :deep(.el-card__body) {
        padding: 20px;
      }
    }
  }
}
</style>