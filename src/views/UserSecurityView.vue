<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Lock, Key, Phone, Warning } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { userApi } from '@/services/api'

const router = useRouter()
const userStore = useUserStore()

// 密码修改表单
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 手机号修改表单
const phoneForm = reactive({
  newPhone: '',
  verificationCode: ''
})

// 加载状态
const passwordLoading = ref(false)
const phoneLoading = ref(false)
const sendingCode = ref(false)

// 验证码倒计时
const countdown = ref(0)
const countdownTimer = ref<ReturnType<typeof setInterval> | null>(null)

// 返回个人中心
const goBack = () => {
  router.push('/user/profile')
}

// 修改密码
const changePassword = async () => {
  if (!passwordForm.oldPassword) {
    ElMessage.warning('请输入当前密码')
    return
  }
  
  if (!passwordForm.newPassword) {
    ElMessage.warning('请输入新密码')
    return
  }
  
  if (passwordForm.newPassword.length < 6) {
    ElMessage.warning('新密码长度不能少于6位')
    return
  }
  
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  
  passwordLoading.value = true
  
  try {
    await userApi.changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    })
    
    ElMessage.success('密码修改成功')
    
    // 清空表单
    Object.assign(passwordForm, {
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
  } catch (error) {
    console.error('修改密码失败:', error)
    ElMessage.error('修改密码失败，请检查当前密码是否正确')
  } finally {
    passwordLoading.value = false
  }
}

// 发送验证码
const sendVerificationCode = async () => {
  if (!phoneForm.newPhone) {
    ElMessage.warning('请输入新手机号')
    return
  }
  
  if (!/^1[3-9]\d{9}$/.test(phoneForm.newPhone)) {
    ElMessage.warning('请输入正确的手机号格式')
    return
  }
  
  sendingCode.value = true
  
  try {
    await userApi.sendVerificationCode(phoneForm.newPhone)
    ElMessage.success('验证码已发送')
    
    // 开始倒计时
    countdown.value = 60
    countdownTimer.value = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(countdownTimer.value!)
        countdownTimer.value = null
      }
    }, 1000)
  } catch (error) {
    console.error('发送验证码失败:', error)
    ElMessage.error('发送验证码失败')
  } finally {
    sendingCode.value = false
  }
}

// 修改手机号
const changePhone = async () => {
  if (!phoneForm.newPhone) {
    ElMessage.warning('请输入新手机号')
    return
  }
  
  if (!phoneForm.verificationCode) {
    ElMessage.warning('请输入验证码')
    return
  }
  
  phoneLoading.value = true
  
  try {
    await userApi.changePhone({
      newPhone: phoneForm.newPhone,
      verificationCode: phoneForm.verificationCode
    })
    
    ElMessage.success('手机号修改成功')
    
    // 更新用户信息
    userStore.setUserInfo({
      ...userStore.userInfo,
      phone: phoneForm.newPhone
    })
    
    // 清空表单
    Object.assign(phoneForm, {
      newPhone: '',
      verificationCode: ''
    })
  } catch (error) {
    console.error('修改手机号失败:', error)
    ElMessage.error('修改手机号失败，请检查验证码是否正确')
  } finally {
    phoneLoading.value = false
  }
}

// 注销账户
const deleteAccount = async () => {
  try {
    await ElMessageBox.confirm(
      '注销账户后，您的所有数据将被永久删除且无法恢复。确定要继续吗？',
      '注销账户确认',
      {
        confirmButtonText: '确定注销',
        cancelButtonText: '取消',
        type: 'error',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    try {
      // 调用注销账户的API
      await userStore.deleteAccount()
      ElMessage.success('账户注销成功')
      // 注销成功后跳转到首页
      router.push('/')
    } catch (error) {
      console.error('注销账户失败:', error)
      ElMessage.error('注销账户失败，请稍后重试')
    }
  } catch (error) {
    // 用户取消操作
  }
}
</script>

<template>
  <div class="security-view">
    <!-- 页面头部 -->
    <div class="security-header">
      <el-button :icon="ArrowLeft" @click="goBack" class="back-btn">
        返回个人中心
      </el-button>
      <h1 class="page-title">账户安全</h1>
      <p class="page-subtitle">保护您的账户安全</p>
    </div>
    
    <!-- 安全设置卡片 -->
    <div class="security-content">
      <!-- 密码修改 -->
      <el-card class="security-card">
        <template #header>
          <div class="card-header">
            <el-icon class="header-icon"><Lock /></el-icon>
            <span class="header-title">修改密码</span>
          </div>
        </template>
        
        <el-form :model="passwordForm" label-width="100px" class="password-form">
          <el-form-item label="当前密码">
            <el-input
              v-model="passwordForm.oldPassword"
              type="password"
              placeholder="请输入当前密码"
              show-password
              clearable
            />
          </el-form-item>
          
          <el-form-item label="新密码">
            <el-input
              v-model="passwordForm.newPassword"
              type="password"
              placeholder="请输入新密码（至少6位）"
              show-password
              clearable
            />
          </el-form-item>
          
          <el-form-item label="确认密码">
            <el-input
              v-model="passwordForm.confirmPassword"
              type="password"
              placeholder="请再次输入新密码"
              show-password
              clearable
            />
          </el-form-item>
          
          <el-form-item>
            <el-button
              type="primary"
              :loading="passwordLoading"
              @click="changePassword"
              class="submit-btn"
            >
              修改密码
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
      
      <!-- 手机号修改 -->
      <el-card class="security-card">
        <template #header>
          <div class="card-header">
            <el-icon class="header-icon"><Phone /></el-icon>
            <span class="header-title">修改手机号</span>
          </div>
        </template>
        
        <div class="current-info">
          <span class="info-label">当前手机号：</span>
          <span class="info-value">{{ userStore.userInfo.phone || '未绑定' }}</span>
        </div>
        
        <el-form :model="phoneForm" label-width="100px" class="phone-form">
          <el-form-item label="新手机号">
            <el-input
              v-model="phoneForm.newPhone"
              placeholder="请输入新手机号"
              clearable
            />
          </el-form-item>
          
          <el-form-item label="验证码">
            <div class="verification-row">
              <el-input
                v-model="phoneForm.verificationCode"
                placeholder="请输入验证码"
                clearable
                class="code-input"
              />
              <el-button
                :loading="sendingCode"
                :disabled="countdown > 0"
                @click="sendVerificationCode"
                class="code-btn"
              >
                {{ countdown > 0 ? `${countdown}s后重发` : '发送验证码' }}
              </el-button>
            </div>
          </el-form-item>
          
          <el-form-item>
            <el-button
              type="primary"
              :loading="phoneLoading"
              @click="changePhone"
              class="submit-btn"
            >
              修改手机号
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
      
      <!-- 安全提示 -->
      <el-card class="security-card tips-card">
        <template #header>
          <div class="card-header">
            <el-icon class="header-icon"><Lock /></el-icon>
            <span class="header-title">安全提示</span>
          </div>
        </template>
        
        <div class="tips-content">
          <div class="tip-item">
            <el-icon class="tip-icon"><Key /></el-icon>
            <div class="tip-text">
              <div class="tip-title">定期更换密码</div>
              <div class="tip-desc">建议每3-6个月更换一次密码，提高账户安全性</div>
            </div>
          </div>
          
          <div class="tip-item">
            <el-icon class="tip-icon"><Phone /></el-icon>
            <div class="tip-text">
              <div class="tip-title">绑定手机号</div>
              <div class="tip-desc">绑定手机号可用于找回密码和接收安全通知</div>
            </div>
          </div>
          
          <div class="tip-item">
            <el-icon class="tip-icon"><Warning /></el-icon>
            <div class="tip-text">
              <div class="tip-title">注意账户安全</div>
              <div class="tip-desc">不要在公共场所或不安全的网络环境下登录账户</div>
            </div>
          </div>
        </div>
      </el-card>
      
      <!-- 危险操作 -->
      <el-card class="security-card danger-card">
        <template #header>
          <div class="card-header">
            <el-icon class="header-icon"><Warning /></el-icon>
            <span class="header-title">危险操作</span>
          </div>
        </template>
        
        <div class="danger-content">
          <div class="danger-item">
            <div class="danger-info">
              <div class="danger-title">注销账户</div>
              <div class="danger-desc">注销后账户数据将被永久删除且无法恢复</div>
            </div>
            <el-button type="danger" @click="deleteAccount" class="danger-btn">
              注销账户
            </el-button>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped lang="scss">
.security-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.security-header {
  text-align: center;
  margin-bottom: 40px;
  color: white;
  
  .back-btn {
    position: absolute;
    left: 20px;
    top: 20px;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
  
  .page-title {
    font-size: 32px;
    font-weight: 700;
    margin: 60px 0 10px 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  .page-subtitle {
    font-size: 16px;
    opacity: 0.9;
    margin: 0;
  }
}

.security-content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
  max-width: 900px;
  margin: 0 auto;
}

.security-card {
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: none;
  overflow: hidden;
  
  :deep(.el-card__header) {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px 25px;
    border-bottom: none;
  }
  
  :deep(.el-card__body) {
    padding: 30px;
    background: rgba(255, 255, 255, 0.95);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  
  .header-icon {
    font-size: 20px;
  }
  
  .header-title {
    font-size: 18px;
    font-weight: 600;
  }
}

.current-info {
  margin-bottom: 25px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 10px;
  
  .info-label {
    color: #666;
    font-weight: 500;
  }
  
  .info-value {
    color: #333;
    font-weight: 600;
  }
}

.password-form,
.phone-form {
  .el-form-item {
    margin-bottom: 25px;
  }
  
  .submit-btn {
    width: 100%;
    padding: 12px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 10px;
  }
}

.verification-row {
  display: flex;
  gap: 15px;
  
  .code-input {
    flex: 1;
  }
  
  .code-btn {
    white-space: nowrap;
    min-width: 120px;
  }
}

.tips-card {
  :deep(.el-card__header) {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }
}

.tips-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  
  .tip-icon {
    font-size: 20px;
    color: #4facfe;
    margin-top: 2px;
  }
  
  .tip-text {
    flex: 1;
    
    .tip-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin-bottom: 5px;
    }
    
    .tip-desc {
      font-size: 14px;
      color: #666;
      line-height: 1.5;
    }
  }
}

.danger-card {
  :deep(.el-card__header) {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  }
}

.danger-content {
  .danger-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    
    .danger-info {
      flex: 1;
      
      .danger-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin-bottom: 5px;
      }
      
      .danger-desc {
        font-size: 14px;
        color: #666;
      }
    }
    
    .danger-btn {
      min-width: 100px;
    }
  }
}

@media (max-width: 1200px) {
  .security-view {
    padding: 20px 30px;
  }
  
  .security-content {
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .security-view {
    padding: 15px 20px;
  }
  
  .security-header {
    .back-btn {
      position: static;
      margin-bottom: 20px;
    }
    
    .page-title {
      margin-top: 0;
      font-size: 28px;
    }
  }
  
  .security-content {
    gap: 20px;
  }
  
  .verification-row {
    flex-direction: column;
    
    .code-btn {
      min-width: auto;
    }
  }
  
  .danger-item {
    flex-direction: column;
    align-items: flex-start;
    
    .danger-btn {
      align-self: stretch;
    }
  }
}
</style>