const ENV = {
  development: {
    BASE_API: 'http://localhost:1337/api',
    ADMIN_BASE_URL: '',
    STRAPI_URL: 'http://localhost:1337',
    TIMEOUT: 30000
  },
  production: {
    BASE_API: '/api',
    ADMIN_BASE_URL: '',
    STRAPI_URL: '',
    TIMEOUT: 30000
  }
}

const currentEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'production' ? 'production' : 'development'

export const BASE_API = ENV[currentEnv].BASE_API
export const ADMIN_BASE_URL = ENV[currentEnv].ADMIN_BASE_URL
export const STRAPI_URL = ENV[currentEnv].STRAPI_URL
export const TIMEOUT = ENV[currentEnv].TIMEOUT

export default ENV[currentEnv]