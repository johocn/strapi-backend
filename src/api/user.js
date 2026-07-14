import { get, put } from '../utils/request.js'
import { extractItem } from '../utils/format.js'

// Strapi users-permissions 原生路由
export function getUserProfile() {
  return get('/api/users/me').then(extractItem)
}

export function updateProfile(data) {
  // Strapi users-permissions 需要路径参数 id
  // 但 /users/me 是 GET，PUT 需要用 /users/:id
  // 这里使用 me 快捷方式，后端需确认是否支持
  return put('/api/users/me', data).then(extractItem)
}

export function updateUserById(id, data) {
  return put(`/api/users/${id}`, data).then(extractItem)
}
