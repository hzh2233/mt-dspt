// 认证相关工具函数

/**
 * 获取存储在localStorage中的token
 * @returns {string} 返回token字符串，如果不存在则返回空字符串
 */
export function getToken(): string {
  return localStorage.getItem('token') || ''
}

/**
 * 设置token到localStorage
 * @param {string} token - 要存储的token
 */
export function setToken(token: string): void {
  localStorage.setItem('token', token)
}

/**
 * 移除localStorage中的token
 */
export function removeToken(): void {
  localStorage.removeItem('token')
}

/**
 * 检查用户是否已登录
 * @returns {boolean} 如果有token则返回true，否则返回false
 */
export function isAuthenticated(): boolean {
  return !!getToken()
}