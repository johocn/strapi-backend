import { get, post, put, del, publicPost, publicGet } from '../utils/request.js'
import { extractList, extractItem } from '../utils/format.js'

const ADMIN = '/zhao-sso/v1/admin'

// ==================== SSO 仪表盘 ====================

export function getSsoDashboard() {
  return get(`${ADMIN}/dashboard`).then(extractItem)
}

export function getChannelReport() {
  return get(`${ADMIN}/channel-report`).then(extractItem)
}

// ==================== SSO 用户管理 ====================

export function getSsoUserList(params = {}) {
  return get(`${ADMIN}/users`, params).then(extractList)
}

export function getSsoUserDetail(id) {
  return get(`${ADMIN}/users/${id}`).then(extractItem)
}

export function updateSsoUser(id, data) {
  return put(`${ADMIN}/users/${id}`, { data }).then(extractItem)
}

// ==================== SSO 应用管理 ====================

export function getSsoAppList(params = {}) {
  return get(`${ADMIN}/apps`, params).then(extractList)
}

export function createSsoApp(data) {
  return post(`${ADMIN}/apps`, { data }).then(extractItem)
}

export function updateSsoApp(id, data) {
  return put(`${ADMIN}/apps/${id}`, { data }).then(extractItem)
}

export function deleteSsoApp(id) {
  return del(`${ADMIN}/apps/${id}`).then(extractItem)
}

export function getSsoAppDetail(id) {
  return get(`${ADMIN}/apps/${id}`).then(extractItem)
}

// ==================== SSO 渠道同步管理 ====================

export function getSsoChannelList(params = {}) {
  return get(`${ADMIN}/channels`, params).then(extractList)
}

export function createSsoChannel(data) {
  return post(`${ADMIN}/channels`, { data }).then(extractItem)
}

export function updateSsoChannel(id, data) {
  return put(`${ADMIN}/channels/${id}`, { data }).then(extractItem)
}

// ==================== SSO 登录日志 ====================

export function getSsoLoginLogs(params = {}) {
  return get(`${ADMIN}/login-logs`, params).then(extractList)
}

// ==================== SSO Token 管理 ====================

export const ssoTokenApi = {
  list: (params = {}) => get(`${ADMIN}/tokens`, params).then(extractList),
  detail: (id) => get(`${ADMIN}/tokens/${id}`).then(extractItem),
  delete: (id) => del(`${ADMIN}/tokens/${id}`).then(extractItem),
}

// ==================== SSO 授权码管理 ====================

export const ssoAuthCodeApi = {
  list: (params = {}) => get(`${ADMIN}/auth-codes`, params).then(extractList),
  detail: (id) => get(`${ADMIN}/auth-codes/${id}`).then(extractItem),
  delete: (id) => del(`${ADMIN}/auth-codes/${id}`).then(extractItem),
}

// ==================== SSO 三方绑定 ====================

export const ssoBindingApi = {
  list: (params = {}) => get(`${ADMIN}/bindings`, params).then(extractList),
  detail: (id) => get(`${ADMIN}/bindings/${id}`).then(extractItem),
  create: (data) => post(`${ADMIN}/bindings`, { data }).then(extractItem),
  update: (id, data) => put(`${ADMIN}/bindings/${id}`, { data }).then(extractItem),
  delete: (id) => del(`${ADMIN}/bindings/${id}`).then(extractItem),
}

// ==================== SSO OAuth 配置 ====================

export const ssoOauthConfigApi = {
  list: (params = {}) => get(`${ADMIN}/oauth-configs`, params).then(extractList),
  detail: (id) => get(`${ADMIN}/oauth-configs/${id}`).then(extractItem),
  create: (data) => post(`${ADMIN}/oauth-configs`, { data }).then(extractItem),
  update: (id, data) => put(`${ADMIN}/oauth-configs/${id}`, { data }).then(extractItem),
  delete: (id) => del(`${ADMIN}/oauth-configs/${id}`).then(extractItem),
}

// ==================== SSO 用户应用角色 ====================

export const ssoUserRoleApi = {
  list: (params = {}) => get(`${ADMIN}/user-app-roles`, params).then(extractList),
  detail: (id) => get(`${ADMIN}/user-app-roles/${id}`).then(extractItem),
  create: (data) => post(`${ADMIN}/user-app-roles`, { data }).then(extractItem),
  update: (id, data) => put(`${ADMIN}/user-app-roles/${id}`, { data }).then(extractItem),
  delete: (id) => del(`${ADMIN}/user-app-roles/${id}`).then(extractItem),
}

// ==================== SSO 邀请码 ====================

export const ssoInviteCodeApi = {
  list: (params = {}) => get(`${ADMIN}/invite-codes`, params).then(extractList),
  create: (data) => post(`${ADMIN}/invite-codes`, { data }).then(extractItem),
  delete: (id) => del(`${ADMIN}/invite-codes/${id}`).then(extractItem),
  validate: (id) => post(`${ADMIN}/invite-codes/${id}/validate`).then(extractItem),
}

// ==================== SSO 邀请记录 ====================

export const ssoInviteUsageApi = {
  list: (params = {}) => get(`${ADMIN}/invite-usages`, params).then(extractList),
  delete: (id) => del(`${ADMIN}/invite-usages/${id}`).then(extractItem),
}

// ==================== SSO 推荐关系 ====================

export const ssoReferralApi = {
  list: (params = {}) => get(`${ADMIN}/referral-relations`, params).then(extractList),
  delete: (id) => del(`${ADMIN}/referral-relations/${id}`).then(extractItem),
}

// ==================== SSO 短信验证码 ====================

export const ssoSmsCodeApi = {
  list: (params = {}) => get(`${ADMIN}/sms-codes`, params).then(extractList),
  delete: (id) => del(`${ADMIN}/sms-codes/${id}`).then(extractItem),
}

// ==================== SSO 消息中心（模板/任务/SOP规则） ====================

export const ssoMsgTemplateApi = {
  list: (params = {}) => get(`${ADMIN}/msg-templates`, params).then(extractList),
  detail: (id) => get(`${ADMIN}/msg-templates/${id}`).then(extractItem),
  create: (data) => post(`${ADMIN}/msg-templates`, data).then(extractItem),
  update: (id, data) => put(`${ADMIN}/msg-templates/${id}`, data).then(extractItem),
  delete: (id) => del(`${ADMIN}/msg-templates/${id}`).then(extractItem),
}

// 模板版本 / AB 测试（templateId 传模板 documentId，后端自动解析）
export const ssoMsgTemplateVersionApi = {
  list: (templateId) => get(`${ADMIN}/msg-templates/${templateId}/versions`).then(extractList),
  create: (templateId, data) => post(`${ADMIN}/msg-templates/${templateId}/versions`, data).then(extractItem),
  update: (templateId, id, data) => put(`${ADMIN}/msg-templates/${templateId}/versions/${id}`, data).then(extractItem),
  delete: (templateId, id) => del(`${ADMIN}/msg-templates/${templateId}/versions/${id}`).then(extractItem),
  activate: (templateId, id) => post(`${ADMIN}/msg-templates/${templateId}/versions/${id}/activate`).then(extractItem),
  abStats: (templateId) => get(`${ADMIN}/msg-templates/${templateId}/ab-stats`).then(extractList),
}

export const ssoMsgJobApi = {
  list: (params = {}) => get(`${ADMIN}/msg-jobs`, params).then(extractList),
  detail: (id) => get(`${ADMIN}/msg-jobs/${id}`).then(extractItem),
  sendNow: (data) => post(`${ADMIN}/msg-jobs/anonymous`, data).then(extractItem),
  sendBatch: (data) => post(`${ADMIN}/msg-jobs/batch`, data).then(extractItem),
  retry: (id) => post(`${ADMIN}/msg-jobs/${id}/retry`).then(extractItem),
}

export const ssoSopRuleApi = {
  list: (params = {}) => get(`${ADMIN}/sop-rules`, params).then(extractList),
  create: (data) => post(`${ADMIN}/sop-rules`, data).then(extractItem),
  update: (id, data) => put(`${ADMIN}/sop-rules/${id}`, data).then(extractItem),
  delete: (id) => del(`${ADMIN}/sop-rules/${id}`).then(extractItem),
}

// 复购线索跟进（列表返回原始体 { rows, summary, pagination }，为避免丢 summary 不做 extractList）
export const repurchaseLeadApi = {
  list: (params = {}) => get(`${ADMIN}/msg/repurchase-leads`, params),
  markFollow: (id, data) => post(`${ADMIN}/msg/repurchase-leads/${id}/follow`, data),
}

// ==================== SSO 用户画像分层 ====================

export const ssoProfileApi = {
  list: (params = {}) => get(`${ADMIN}/profiles`, params).then(extractList),
  detail: (id) => get(`${ADMIN}/profiles/${id}`).then(extractItem),
  recalcAll: () => post(`${ADMIN}/profiles/recalc-all`).then(extractItem),
}

// ==================== SSO 公开认证接口（auth:false，路径 /zhao-sso/v1/auth/xxx） ====================

const AUTH = '/zhao-sso/v1/auth'

// 微信小程序登录
export function ssoWechatMiniProgramLogin(data) {
  return publicPost(`${AUTH}/wechat/miniprogram`, data)
}

// 微信 APP 登录
export function ssoWechatAppLogin(data) {
  return publicPost(`${AUTH}/wechat/app`, data)
}

// JSSDK 签名
export function ssoJssdkSignature(data) {
  return publicPost(`${AUTH}/jssdk-signature`, data)
}

// 获取微信登录配置
export function ssoWechatConfig(params) {
  return publicGet(`${AUTH}/wechat/config`, params)
}

// 降级密码登录 - code 模式
// 非微信环境下，用账号密码换取 OAuth 授权码，前端跳转 redirect_uri?code=xxx
export function ssoPasswordAuthorize(data) {
  return publicPost(`${AUTH}/password-authorize`, data)
}

// 降级密码登录 - token 模式
// 非微信环境下，用账号密码直接换取 access_token + refresh_token
export function ssoPasswordLogin(data) {
  return publicPost(`${AUTH}/login`, data)
}
