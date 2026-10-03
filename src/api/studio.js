import { get, post, put, del } from '../utils/request.js'
import { extractList, extractItem } from '../utils/format.js'

const ADMIN_BASE = '/zhao-studio/v1/admin'

const createContentApi = (resource) => ({
  list: (params = {}) => get(`${ADMIN_BASE}/${resource}`, params).then(extractList),
  detail: (documentId) => get(`${ADMIN_BASE}/${resource}/${documentId}`).then(extractItem),
  create: (data) => post(`${ADMIN_BASE}/${resource}`, { data }).then(extractItem),
  update: (documentId, data) => put(`${ADMIN_BASE}/${resource}/${documentId}`, { data }).then(extractItem),
  delete: (documentId) => del(`${ADMIN_BASE}/${resource}/${documentId}`).then(extractItem),
})

// 10 个 CT 的 CRUD
export const articleDraftApi = createContentApi('articles')
export const knowledgeIndexApi = createContentApi('knowledge-indices')
export const collectSourceApi = createContentApi('sources')
export const collectTaskApi = createContentApi('tasks')
export const publishPlatformApi = createContentApi('platforms')
export const publishAccountApi = createContentApi('accounts')
export const publishRecordApi = createContentApi('records')
export const statSummaryApi = createContentApi('stat-summaries')
export const browserLogApi = createContentApi('browser-logs')
export const adSlotApi = createContentApi('ad-slots')

// 广告展示管理（ad-zone / ad-content）
export const adZoneApi = createContentApi('ad-zones')
export const adContentApi = createContentApi('ad-contents')

// 海报模板管理（poster-template / poster-element）
export const posterTemplateApi = {
  ...createContentApi('poster-templates'),
  clone: (documentId) => post(`${ADMIN_BASE}/poster-templates/${documentId}/clone`).then(extractItem),
  batchSaveElements: (documentId, elements) => put(`${ADMIN_BASE}/poster-templates/${documentId}/elements`, { elements }).then(extractItem),
}
export const posterElementApi = createContentApi('poster-elements')

// 采集工作流
export const collectActionApi = {
  createTask: (sourceId) => post(`${ADMIN_BASE}/tasks`, { data: { sourceId } }).then(extractItem),
  getTask: (taskId) => get(`${ADMIN_BASE}/tasks/${taskId}`).then(extractItem),
  fetchSelectedContent: (taskId, selectedTitles) => post(`${ADMIN_BASE}/tasks/${taskId}/content`, { data: { selectedTitles } }).then(extractItem),
  confirmImport: (taskId, contents, scope, tenantId) => post(`${ADMIN_BASE}/tasks/${taskId}/confirm`, { data: { contents, scope, tenantId } }).then(extractItem),
}

// 发布工作流
// 注意：publish/schedules 控制器读 ctx.request.body 顶层字段，body 不能再套一层 { data }（套了会静默丢参）
export const publishActionApi = {
  publishArticle: (articleId, accountIds) => post(`${ADMIN_BASE}/articles/${articleId}/publish`, { accountIds }).then(extractItem),
  preview: (articleId, accountIds) => post(`${ADMIN_BASE}/publish/preview`, { articleId, accountIds }).then(extractItem),
  retryPublish: (recordId) => post(`${ADMIN_BASE}/records/${recordId}/retry`).then(extractItem),
  syncStatus: (articleId) => post(`${ADMIN_BASE}/articles/${articleId}/sync`).then(extractItem),
}

// 定时发布（无 PUT 路由，仅 create / list / detail / cancel）
export const publishScheduleApi = {
  list: (params = {}) => get(`${ADMIN_BASE}/schedules`, params).then(extractList),
  detail: (documentId) => get(`${ADMIN_BASE}/schedules/${documentId}`).then(extractItem),
  create: (data) => post(`${ADMIN_BASE}/schedules`, data).then(extractItem),
  cancel: (documentId) => post(`${ADMIN_BASE}/schedules/${documentId}/cancel`).then(extractItem),
}

// OAuth 授权管理
export const publishOauthApi = {
  // 返回 { url }，由前端跳转（授权接口带 admin 鉴权，不能直接浏览器跳转）
  authorizeUrl: (accountId) => get(`${ADMIN_BASE}/oauth/authorize/${accountId}`).then(extractItem),
  status: (accountId) => get(`${ADMIN_BASE}/oauth/status/${accountId}`).then(extractItem),
  revoke: (accountId) => post(`${ADMIN_BASE}/oauth/revoke/${accountId}`).then(extractItem),
}

// AI 能力
export const aiActionApi = {
  getConfig: () => get(`${ADMIN_BASE}/ai/config`).then(extractItem),
  updateConfig: (config) => post(`${ADMIN_BASE}/ai/config`, { data: config }).then(extractItem),
  testAi: () => post(`${ADMIN_BASE}/ai/test`).then(extractItem),
  generateSummary: (articleId) => post(`${ADMIN_BASE}/ai/articles/${articleId}/summary`).then(extractItem),
  optimizeTitle: (articleId) => post(`${ADMIN_BASE}/ai/articles/${articleId}/title`).then(extractItem),
  rewrite: (articleId) => post(`${ADMIN_BASE}/ai/articles/${articleId}/rewrite`).then(extractItem),
  convert: (articleId) => post(`${ADMIN_BASE}/ai/articles/${articleId}/convert`).then(extractItem),
  chat: (message) => post(`${ADMIN_BASE}/ai/chat`, { data: { message } }).then(extractItem),
}

// 统计查询（6 维度）
export const statsApi = {
  overview: (params) => get(`${ADMIN_BASE}/stats/overview`, params).then(extractItem),
  articles: (params) => get(`${ADMIN_BASE}/stats/articles`, params).then(extractItem),
  adSlots: (params) => get(`${ADMIN_BASE}/stats/ad-slots`, params).then(extractItem),
  devices: (params) => get(`${ADMIN_BASE}/stats/devices`, params).then(extractItem),
  regions: (params) => get(`${ADMIN_BASE}/stats/regions`, params).then(extractItem),
  users: (params) => get(`${ADMIN_BASE}/stats/users`, params).then(extractItem),
}
