import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResponse } from '@/types/api'
import { useUserStore } from '@/stores/user'
import JSONbig from 'json-bigint'

// 配置json-bigint
const JSONbigNative = JSONbig({
  storeAsString: true // 将大整数存储为字符串，避免精度丢失
})

// 创建axios实例
const request: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  // 使用json-bigint来处理响应数据
  transformResponse: [function (data) {
    if (typeof data === 'string') {
      try {
        return JSONbigNative.parse(data)
      } catch (e) {
        return data
      }
    }
    return data
  }]
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 添加authorization请求头，所有请求都需要带上（没有token时为空字符串）
    const token = localStorage.getItem('token') || ''
    config.headers.authorization = token
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { code, message, data } = response.data
    
    // 只有返回码为200才算成功
    if (code === 200) {
      return data
    }
    
    // 其他任何返回码都是失败
    const errorMessage = message || '请求失败'
    // 不在拦截器中显示错误信息，让业务逻辑处理
    return Promise.reject(new Error(errorMessage))
  },
  (error) => {
    console.error('响应错误:', error)
    
    // 处理HTTP状态码错误
    if (error.response) {
      const { status } = error.response
      switch (status) {
        case 401:
          ElMessage.error('未授权，请重新登录')
          // 清除用户信息但不调用logout API（避免无限循环）
          const userStore = useUserStore()
          userStore.clearUserState()
          // 使用Vue Router进行导航，避免页面刷新
          // 只有在不是登录页面时才跳转
          if (window.location.pathname !== '/login') {
            import('@/router').then(({ default: router }) => {
              router.push('/login')
            })
          }
          break
        case 403:
          ElMessage.error('拒绝访问')
          break
        case 404:
          ElMessage.error('请求地址不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error('网络错误')
      }
    } else if (error.request) {
      ElMessage.error('网络连接失败')
    } else {
      ElMessage.error('请求配置错误')
    }
    
    return Promise.reject(error)
  }
)

export default request