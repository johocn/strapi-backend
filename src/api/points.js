import { get, post, put, del } from '../utils/request.js'
import { extractList, extractItem } from '../utils/format.js'

const V1 = '/zhao-point/v1'
const MY = `${V1}/my`
const ADMIN = `${V1}/admin`

// ==================== 管理端接口 ====================

// 积分规则管理
export function getAdminRuleList(params = {}) {
  return get(`${ADMIN}/point-rules`, params).then(extractList)
}

export function getAdminRuleDetail(documentId) {
  return get(`${ADMIN}/point-rules/${documentId}`).then(extractItem)
}

export function createRule(data) {
  return post(`${ADMIN}/point-rules`, data).then(extractItem)
}

export function updateRule(documentId, data) {
  return put(`${ADMIN}/point-rules/${documentId}`, data).then(extractItem)
}

export function deleteRule(documentId) {
  return del(`${ADMIN}/point-rules/${documentId}`).then(extractItem)
}

export function batchEnableRules(data) {
  return post(`${ADMIN}/point-rules/batch-enable`, data).then(extractItem)
}

// 规则模板管理
export function getTemplateList(params = {}) {
  return get(`${ADMIN}/rule-templates`, params).then(extractList)
}

export function createTemplate(data) {
  return post(`${ADMIN}/rule-templates`, data).then(extractItem)
}

export function updateTemplate(documentId, data) {
  return put(`${ADMIN}/rule-templates/${documentId}`, data).then(extractItem)
}

export function deleteTemplate(documentId) {
  return del(`${ADMIN}/rule-templates/${documentId}`).then(extractItem)
}

export function applyTemplate(documentId, data) {
  return post(`${ADMIN}/rule-templates/${documentId}/apply`, data).then(extractItem)
}

// 积分记录管理
export function getRecordList(params = {}) {
  return get(`${ADMIN}/point-records`, params).then(extractList)
}

export function getRecordDetail(documentId) {
  return get(`${ADMIN}/point-records/${documentId}`).then(extractItem)
}

export function adminAdjust(data) {
  return post(`${ADMIN}/point-records/admin-adjust`, data).then(extractItem)
}

export function batchAdjust(data) {
  return post(`${ADMIN}/point-records/batch-adjust`, data).then(extractItem)
}

export function getRecordStats(params = {}) {
  return get(`${ADMIN}/point-records/statistics`, params).then(extractItem)
}

// 兑换审核
export function getRedemptionList(params = {}) {
  return get(`${ADMIN}/point-redemptions`, params).then(extractList)
}

export function getRedemptionDetail(documentId) {
  return get(`${ADMIN}/point-redemptions/${documentId}`).then(extractItem)
}

export function updateRedemption(documentId, data) {
  return put(`${ADMIN}/point-redemptions/${documentId}`, data).then(extractItem)
}

// 扫码兑付
export function verifyPickupCode(pickupCode) {
  return post(`${ADMIN}/point-redemptions/verify-pickup`, { pickupCode }).then(extractItem)
}

// 商品管理
export function getProductList(params = {}) {
  return get(`${ADMIN}/products`, params).then(extractList)
}

export function getProductDetail(documentId) {
  return get(`${ADMIN}/products/${documentId}`).then(extractItem)
}

export function createProduct(data) {
  return post(`${ADMIN}/products`, data).then(extractItem)
}

export function updateProduct(documentId, data) {
  return put(`${ADMIN}/products/${documentId}`, data).then(extractItem)
}

export function deleteProduct(documentId) {
  return del(`${ADMIN}/products/${documentId}`).then(extractItem)
}

export function adjustProductStock(documentId, data) {
  return post(`${ADMIN}/products/${documentId}/stock`, data).then(extractItem)
}

// 自提点管理
export function getPickupLocationList(params = {}) {
  return get(`${ADMIN}/pickup-locations`, params).then(extractList)
}

export function getPickupLocationDetail(documentId) {
  return get(`${ADMIN}/pickup-locations/${documentId}`).then(extractItem)
}

export function createPickupLocation(data) {
  return post(`${ADMIN}/pickup-locations`, data).then(extractItem)
}

export function updatePickupLocation(documentId, data) {
  return put(`${ADMIN}/pickup-locations/${documentId}`, data).then(extractItem)
}

export function deletePickupLocation(documentId) {
  return del(`${ADMIN}/pickup-locations/${documentId}`).then(extractItem)
}

// 系统配置
export function getPointConfig() {
  return get(`${ADMIN}/config`).then(extractItem)
}

export function updatePointConfig(data) {
  return put(`${ADMIN}/config`, data).then(extractItem)
}

// 核销管理
export function getVerificationList(params = {}) {
  return get(`${ADMIN}/verifications`, params).then(extractList)
}

export function getVerificationDetail(documentId) {
  return get(`${ADMIN}/verifications/${documentId}`).then(extractItem)
}

export function getVerificationStats(params = {}) {
  return get(`${ADMIN}/verifications/stats`, params).then(extractItem)
}

// 仪表盘
export function getPointDashboard() {
  return get(`${ADMIN}/dashboard`).then(extractItem)
}

// ==================== 公开接口 ====================

export function getPointRuleList(params = {}) {
  return get(`${V1}/point/rules`, params).then(extractList)
}

export function getPointProductList(params = {}) {
  return get(`${V1}/point/products`, params).then(extractList)
}

export function getPointProduct(id) {
  return get(`${V1}/point/products/${id}`).then(extractItem)
}

export function getExchangeRate() {
  return get(`${V1}/point/exchange-rate`).then(extractItem)
}

// ==================== 用户接口 ====================

export function getPointBalance() {
  return get(`${MY}/point/balance`).then(extractItem)
}

export function getPointRecordList(params = {}) {
  return get(`${MY}/point/records`, params).then(extractList)
}

export function getPointStatistics() {
  return get(`${MY}/point/statistics`).then(extractItem)
}

export function redeemPoints(data) {
  return post(`${MY}/point/redeem`, data).then(extractItem)
}

export function getRedemptionRecordList(params = {}) {
  return get(`${MY}/point/redeem/records`, params).then(extractList)
}

export function generateQRCode(data) {
  return post(`${MY}/point/verify/qrcode`, data).then(extractItem)
}

export function verifyByQRCode(data) {
  return post(`${MY}/point/verify/scan`, data).then(extractItem)
}

export function manualVerify(data) {
  return post(`${MY}/point/verify/manual`, data).then(extractItem)
}

export function getMyVerifications(params = {}) {
  return get(`${MY}/point/verify/log`, params).then(extractList)
}

export function getEligibleActions(params = {}) {
  return get(`${MY}/point/eligible-actions`, params).then(extractItem)
}

// 签到
export function signIn() {
  return post(`${MY}/point/sign-in`).then(extractItem)
}

export function getSignInStatus() {
  return get(`${MY}/point/sign-in/status`).then(extractItem)
}

// 任务列表
export function getPointTasks() {
  return get(`${MY}/point/tasks`).then(extractItem)
}

// 积分类型管理
export function getPointTypeList(params = {}) {
  return get(`${ADMIN}/point-types`, params).then(extractList)
}

export function getPointTypeDetail(documentId) {
  return get(`${ADMIN}/point-types/${documentId}`).then(extractItem)
}

export function createPointType(data) {
  return post(`${ADMIN}/point-types`, data).then(extractItem)
}

export function updatePointType(documentId, data) {
  return put(`${ADMIN}/point-types/${documentId}`, data).then(extractItem)
}

export function deletePointType(documentId) {
  return del(`${ADMIN}/point-types/${documentId}`).then(extractItem)
}

// 积分规则管理（保留兼容旧页面）
export function getPointRuleDetail(documentId) {
  return get(`${ADMIN}/point-rules/${documentId}`).then(extractItem)
}

export function createPointRule(data) {
  return post(`${ADMIN}/point-rules`, data).then(extractItem)
}

export function updatePointRule(documentId, data) {
  return put(`${ADMIN}/point-rules/${documentId}`, data).then(extractItem)
}

export function deletePointRule(documentId) {
  return del(`${ADMIN}/point-rules/${documentId}`).then(extractItem)
}

// 管理员积分操作（保留兼容）
export function earnPoints(data) {
  return post(`${ADMIN}/point/earn`, data).then(extractItem)
}

export function deductPoints(data) {
  return post(`${ADMIN}/point/deduct`, data).then(extractItem)
}

// ===== 兑换码管理（来自 redemption.js）=====
export function getRedemptionCodeList(params = {}) {
  return get(`${ADMIN}/point-redemptions`, params).then(extractList)
}

export function getRedemptionCodeDetail(documentId) {
  return get(`${ADMIN}/point-redemptions/${documentId}`).then(extractItem)
}

export function createRedemptionCode(data) {
  return post(`${ADMIN}/point-redemptions`, data).then(extractItem)
}

export function updateRedemptionCode(documentId, data) {
  return put(`${ADMIN}/point-redemptions/${documentId}`, data).then(extractItem)
}

export function deleteRedemptionCode(documentId) {
  return del(`${ADMIN}/point-redemptions/${documentId}`).then(extractItem)
}

export function getRedemptionRecordDetail(documentId) {
  return get(`${ADMIN}/point-redemptions/${documentId}`).then(extractItem)
}

export function updateRedemptionRecord(documentId, data) {
  return put(`${ADMIN}/point-redemptions/${documentId}`, data).then(extractItem)
}

// ===== 核销记录管理（来自 verification.js）=====
export function getVerificationRecordList(params = {}) {
  return get(`${ADMIN}/verifications`, params).then(extractList)
}

export function getVerificationRecordDetail(documentId) {
  return get(`${ADMIN}/verifications/${documentId}`).then(extractItem)
}
