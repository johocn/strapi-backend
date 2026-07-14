import { get, post, put, del } from '../utils/request.js'
import { extractList, extractItem } from '../utils/format.js'

const ADMIN = '/zhao-oss/v1/admin'

// ==================== 同步管理 ====================

export function getOssSyncDashboard() {
  return get(`${ADMIN}/sync/dashboard`).then(extractItem)
}

export function getOssSyncRecords(params = {}) {
  return get(`${ADMIN}/sync/records`, params).then(extractList)
}

export function triggerOssSync(data) {
  return post(`${ADMIN}/sync/trigger`, data).then(extractItem)
}

export function batchOssSync(data) {
  return post(`${ADMIN}/sync/batch`, data).then(extractItem)
}

export function deleteOssSyncRemote(recordId) {
  return del(`${ADMIN}/sync/remote/${recordId}`).then(extractItem)
}

export function checkOssSyncHealth() {
  return get(`${ADMIN}/sync/health`).then(extractItem)
}

// ==================== 存储设置 ====================

export function getOssSettings() {
  return get(`${ADMIN}/settings`).then(extractItem)
}

export function updateOssSettings(data) {
  return put(`${ADMIN}/settings`, { data }).then(extractItem)
}

export function testOssProvider(data) {
  return post(`${ADMIN}/settings/test-provider`, data).then(extractItem)
}

// ==================== 修复工具 ====================

export function repairOssFolders() {
  return post(`${ADMIN}/repair/folders`).then(extractItem)
}
