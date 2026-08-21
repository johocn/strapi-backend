import { get, post, put, del } from '../utils/request.js'
import { extractList, extractItem } from '../utils/format.js'

const V1 = '/zhao-point/v1'
const ADMIN = `${V1}/admin`

// 活动管理（list/create 走 /adm/activities；获取单项复用列表接口）

export function listActivities(params = {}) {
  return get(`${ADMIN}/activities`, params).then(extractList)
}

// 从列表接口按 documentId 抽取单项（未提供单独 GET 详情接口）
export async function getActivity(documentId, params = {}) {
  const res = await get(`${ADMIN}/activities`, { ...params })
  const list = res?.list ?? res?.data ?? []
  const item = list.find(i => i.documentId === documentId) || null
  return flattenItem(item)
}

function flattenItem(item) {
  if (!item) return null
  if (item.attributes) return { ...item.attributes, id: item.id, documentId: item.documentId }
  return item
}

export function createActivity(data) {
  return post(`${ADMIN}/activities`, data).then(extractItem)
}

export function updateActivity(documentId, data) {
  return put(`${ADMIN}/activities/${documentId}`, data).then(extractItem)
}

export function deleteActivity(documentId) {
  return del(`${ADMIN}/activities/${documentId}`).then(extractItem)
}

// 报名名单（active=已报名 / cancelled=已取消；attendedAt 有值=已到场）
export function getActivitySignups(documentId) {
  return get(`${ADMIN}/activities/${documentId}/signups`).then(extractList)
}

// 移出候补（仅 waiting 可移出；不改动名额）
export function cancelActivitySignup(documentId, signupId) {
  return post(`${ADMIN}/activities/${documentId}/signups/${signupId}/cancel`)
}

// 扫码核销到场（成功返回 {ok:true,...}；已签过返回 {ok:false,reason:'already_checked_in'}；未报名 400）
export function scanCheckin(documentId, data) {
  // 不走 extractItem，保留 ok/ reason 字段供页面区分结果类型
  return post(`${ADMIN}/activities/${documentId}/scan-checkin`, data)
}

// 到场记录
export function getActivityAttendance(documentId) {
  return get(`${ADMIN}/activities/${documentId}/attendance`).then(extractList)
}

// ===== 活动系列 =====

export function listSeries(params = {}) {
  return get(`${ADMIN}/series`, params).then(extractList)
}

export function getSeries(documentId) {
  return get(`${ADMIN}/series/${documentId}`).then(extractItem)
}

export function createSeries(data) {
  return post(`${ADMIN}/series`, data).then(extractItem)
}

export function updateSeries(documentId, data) {
  return put(`${ADMIN}/series/${documentId}`, data).then(extractItem)
}

export function deleteSeries(documentId) {
  return del(`${ADMIN}/series/${documentId}`).then(extractItem)
}

// 系列下全部场次（无 query 参数）
export function getSeriesActivities(documentId) {
  return get(`${ADMIN}/series/${documentId}/activities`).then(extractList)
}

// 复制场次，返回新建的一场
export function duplicateActivity(activityDocumentId) {
  return post(`${ADMIN}/activities/${activityDocumentId}/duplicate`).then(extractItem)
}

// 按排期规则批量生成 count 场草稿（count 走 query）
export function generateSeries(documentId, count) {
  return post(`${ADMIN}/series/${documentId}/generate?count=${count}`)
}