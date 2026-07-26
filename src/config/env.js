const ENV = {
  development: {
    BASE_API: 'http://localhost:1337/api',
    ADMIN_BASE_URL: '',
    STRAPI_URL: 'http://localhost:1337',
    CLIENT_BASE_URL: 'http://localhost:5173',
    TIMEOUT: 30000
  },
  production: {
    BASE_API: '/api',
    ADMIN_BASE_URL: '',
    STRAPI_URL: '',
    CLIENT_BASE_URL: '',
    TIMEOUT: 30000
  }
}

// 环境检测：优先构建时注入的 NODE_ENV，失败时通过运行时 hostname 判断
// （uni-app H5 构建后浏览器中 process 可能不可用，导致误用 development 配置）
function detectEnv() {
  // 1. 构建时注入的 NODE_ENV（webpack/vite DefinePlugin 替换）
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
    return process.env.NODE_ENV === 'production' ? 'production' : 'development'
  }
  // 2. 运行时检测：部署到非 localhost 域名时自动使用生产配置
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname
    if (host !== 'localhost' && host !== '127.0.0.1' && host !== '0.0.0.0') {
      return 'production'
    }
  }
  return 'development'
}

const currentEnv = detectEnv()

export const BASE_API = ENV[currentEnv].BASE_API
export const ADMIN_BASE_URL = ENV[currentEnv].ADMIN_BASE_URL
export const STRAPI_URL = ENV[currentEnv].STRAPI_URL
export const CLIENT_BASE_URL = ENV[currentEnv].CLIENT_BASE_URL
export const TIMEOUT = ENV[currentEnv].TIMEOUT

export default ENV[currentEnv]