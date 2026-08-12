import { adminGet, adminPost, adminPut, adminDel, get, post, del } from '../utils/request.js'
import { extractList, extractItem } from '../utils/format.js'

// 后台路径前缀：/zhao-wealth/v1/admin（zhao-wealth 插件 admin-api 路由，与其他 zhao-* 插件保持一致）
const ADMIN = '/zhao-wealth/v1/admin'
// C 端路径前缀：/v1/wealth（zhao-wealth 插件 content-api 路由）
const V1 = '/v1/wealth'

// ==================== 公司管理 ====================
export function getAdminCompanyList(params = {}) {
  return adminGet(`${ADMIN}/companies`, params).then(extractList)
}

// ==================== 产品管理 ====================
export function getAdminProductList(params = {}) {
  return adminGet(`${ADMIN}/products`, params).then(extractList)
}

export function getAdminProductDetail(id) {
  return adminGet(`${ADMIN}/products/${id}`).then(extractItem)
}

export function createProduct(data) {
  return adminPost(`${ADMIN}/products`, data).then(extractItem)
}

export function updateProduct(id, data) {
  return adminPut(`${ADMIN}/products/${id}`, data).then(extractItem)
}

export function deleteProduct(id) {
  return adminDel(`${ADMIN}/products/${id}`).then(extractItem)
}

// ==================== 净值数据 ====================
export function getNavList(productId, params = {}) {
  return adminGet(`${ADMIN}/products/${productId}/nav`, params).then(extractList)
}

export function createNav(productId, data) {
  return adminPost(`${ADMIN}/products/${productId}/nav`, data).then(extractItem)
}

// ==================== 采集 ====================
export function triggerCollect(data) {
  return adminPost(`${ADMIN}/collect/trigger`, data).then(extractItem)
}

export function getCollectStatus() {
  return adminGet(`${ADMIN}/collect/status`).then(extractItem)
}

export function recalculate() {
  return adminPost(`${ADMIN}/recalculate`).then(extractItem)
}

/**
 * 产品采集（双源采集 + 中国理财网校验）
 * @param {string} source 数据源标识，如 'cbhb'（渤银理财）
 * @param {string} query  产品代码或登记编码，如 'LCYSRK006'
 * @returns {Promise<{sourceData, officialData, verification}>}
 */
export function collectProduct(source, query) {
  return adminPost(`${ADMIN}/products/collect`, { source, query }).then(extractItem)
}

/**
 * 采集结果确认入库
 * @param {object} data 产品数据（来自 collectProduct 返回的 sourceData）
 */
export function confirmCollect(data) {
  return adminPost(`${ADMIN}/products/collect/confirm`, data).then(extractItem)
}

// ==================== 推荐配置 ====================
export function getRecommendConfigList(params = {}) {
  return adminGet(`${ADMIN}/recommend-configs`, params).then(extractList)
}

export function updateRecommendConfig(id, data) {
  return adminPut(`${ADMIN}/recommend-configs/${id}`, data).then(extractItem)
}

// ==================== 风险指标 ====================
export function getRiskMetrics(productId, params = {}) {
  return adminGet(`${ADMIN}/risk-metrics/aggregate`, { product: productId, ...params }).then(extractItem)
}

export function getRiskTrend(productId, params = {}) {
  return adminGet(`${ADMIN}/risk-metrics/trend`, { product: productId, ...params }).then(extractItem)
}

export function getRiskPeers(params = {}) {
  return adminGet(`${ADMIN}/risk-metrics/peers`, params).then(extractList)
}

export function recalculateRiskMetric() {
  return adminPost(`${ADMIN}/recalculate-risk-metric`).then(extractItem)
}

// ==================== 统计 ====================
export function getStatsOverview() {
  return adminGet(`${ADMIN}/stats/overview`).then(extractItem)
}

export function getStatsAnomalies(params = {}) {
  return adminGet(`${ADMIN}/stats/anomalies`, params).then(extractList)
}

// ==================== 合规披露 ====================
export function getDisclosureList(params = {}) {
  return adminGet(`${ADMIN}/disclosures`, params).then(extractList)
}

export function createDisclosure(data) {
  return adminPost(`${ADMIN}/disclosures`, data).then(extractItem)
}

export function updateDisclosure(id, data) {
  return adminPut(`${ADMIN}/disclosures/${id}`, data).then(extractItem)
}

export function deleteDisclosure(id) {
  return adminDel(`${ADMIN}/disclosures/${id}`).then(extractItem)
}

// ==================== 持仓管理（后台代客录入） ====================
export function getAdminHoldingList(params = {}) {
  return adminGet(`${ADMIN}/holdings`, params).then(extractList)
}

export function getAdminHoldingDetail(id) {
  return adminGet(`${ADMIN}/holdings/${id}`).then(extractItem)
}

export function createAdminHolding(data) {
  return adminPost(`${ADMIN}/holdings`, data).then(extractItem)
}

export function updateAdminHolding(id, data) {
  return adminPut(`${ADMIN}/holdings/${id}`, data).then(extractItem)
}

export function deleteAdminHolding(id) {
  return adminDel(`${ADMIN}/holdings/${id}`).then(extractItem)
}

// ==================== C 端持仓盈亏时序（后台持仓详情用） ====================
export function getHoldingProfitTrend(id, params = {}) {
  return adminGet(`${ADMIN}/holdings/${id}/profit-trend`, params).then(extractItem)
}

// ==================== 客户自选 ====================
export function getCustomerProductList(params = {}) {
  return adminGet(`${ADMIN}/customer-products`, params).then(extractList)
}

// ==================== C 端接口（对比页用） ====================
export function compareProducts(productIds, period = 'm1') {
  return get(`${V1}/compare`, { productIds: productIds.join(','), period }).then(extractItem)
}

export function getDisclosure(productType) {
  return get(`${V1}/disclosure`, { productType }).then(extractItem)
}
