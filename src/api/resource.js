import { get, post, put, del } from '../utils/request.js'
import { extractItem } from '../utils/format.js'

// 讲师/场地资源排期接口（后端契约见 spec §5）
const ADMIN = '/zhao-point/v1/admin/adm'

// list 后端返回 { rows:[...], pagination:{...} }，统一为 { list, pagination }
function extractRows(res) {
  if (!res) return { list: [], pagination: {} }
  const list = res.rows || res.list || []
  return { list, pagination: res.pagination || {} }
}

// ===== 讲师 =====
export function listLecturers(params = {}) {
  return get(`${ADMIN}/lecturers`, params).then(extractRows)
}
export function getLecturer(documentId) {
  return get(`${ADMIN}/lecturers/${documentId}`).then(extractItem)
}
export function createLecturer(data) {
  return post(`${ADMIN}/lecturers`, data).then(extractItem)
}
export function updateLecturer(documentId, data) {
  return put(`${ADMIN}/lecturers/${documentId}`, data).then(extractItem)
}
export function deleteLecturer(documentId) {
  return del(`${ADMIN}/lecturers/${documentId}`).then(extractItem)
}

// ===== 场地 =====
export function listVenues(params = {}) {
  return get(`${ADMIN}/venues`, params).then(extractRows)
}
export function getVenue(documentId) {
  return get(`${ADMIN}/venues/${documentId}`).then(extractItem)
}
export function createVenue(data) {
  return post(`${ADMIN}/venues`, data).then(extractItem)
}
export function updateVenue(documentId, data) {
  return put(`${ADMIN}/venues/${documentId}`, data).then(extractItem)
}
export function deleteVenue(documentId) {
  return del(`${ADMIN}/venues/${documentId}`).then(extractItem)
}

// 档期视图 { resource, rows }
export function getSchedule(type, resourceId, params = {}) {
  return get(`${ADMIN}/schedules`, { type, resourceId, ...params })
}

// 冲突预检：返回 { ok, conflicts, suggestions }
export function checkSchedule(data) {
  return post(`${ADMIN}/schedules/check`, data)
}