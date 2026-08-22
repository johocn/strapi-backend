import { adminGet, adminPost, adminPut, adminDel } from '../utils/request.js'
import { getToken } from '../utils/auth.js'
import { extractList, extractItem } from '../utils/format.js'
import { BASE_API } from '../config/env.js'

const WX = '/zhao-sso/v1/admin/wx'

// 公众号服务器接入配置（回调 URL、Token、编码模式）
export const ssoWxServerConfig = () =>
  adminGet(`${WX}/server-config`).then(extractItem)

// ==================== 关键字自动回复规则 ====================
export const ssoWxReplyApi = {
  list: (params = {}) => adminGet(`${WX}/replies`, params).then(extractList),
  create: (data) => adminPost(`${WX}/replies`, data).then(extractItem),
  update: (id, data) => adminPut(`${WX}/replies/${id}`, data).then(extractItem),
  delete: (id) => adminDel(`${WX}/replies/${id}`).then(extractItem),
}

// ==================== 素材库 ====================
export const ssoWxMaterialApi = {
  list: (params = {}) => adminGet(`${WX}/materials`, params).then(extractList),
  create: (data) => adminPost(`${WX}/materials`, data).then(extractItem),
  delete: (id) => adminDel(`${WX}/materials/${id}`).then(extractItem),
  /**
   * 上传素材（uni.uploadFile）
   * @param {string} filePath 本地文件路径
   * @param {string} type image/voice/video/thumb
   * @param {string} name 素材名称
   */
  upload: (filePath, type, name) => {
    const formData = { type, name }
    if (name) formData.name = name
    const header = { 'Authorization': `Bearer ${getToken()}` }
    const tenantId = uni.getStorageSync('tadmin_current_tenant_id')
    if (tenantId) header['x-site-id'] = String(tenantId)
    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url: `${BASE_API}${WX}/materials`,
        filePath,
        name: 'file',
        formData,
        header,
        success: (res) => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            try {
              resolve(extractItem(JSON.parse(res.data)))
            } catch (e) {
              resolve(res.data)
            }
          } else {
            let msg = '上传失败'
            try {
              msg = JSON.parse(res.data)?.error?.message || `上传失败: ${res.statusCode}`
            } catch (e) { /* ignore */ }
            uni.showToast({ title: msg, icon: 'none' })
            reject(new Error(msg))
          }
        },
        fail: (err) => {
          uni.showToast({ title: '上传失败', icon: 'none' })
          reject(err)
        },
      })
    })
  },
}

// ==================== 图文草稿与发布 ====================
export const ssoWxArticleApi = {
  list: (params = {}) => adminGet(`${WX}/articles`, params).then(extractList),
  detail: (id) => adminGet(`${WX}/articles/${id}`).then(extractItem),
  create: (data) => adminPost(`${WX}/articles`, data).then(extractItem),
  update: (id, data) => adminPut(`${WX}/articles/${id}`, data).then(extractItem),
  publish: (id) => adminPost(`${WX}/articles/${id}/publish`).then(extractItem),
  status: (id) => adminGet(`${WX}/articles/${id}/status`).then(extractItem),
  delete: (id) => adminDel(`${WX}/articles/${id}`).then(extractItem),
}

// ==================== 自定义菜单 ====================
export const ssoWxMenuApi = {
  list: (params = {}) => adminGet(`${WX}/menus`, params).then(extractList),
  create: (data) => adminPost(`${WX}/menus`, data).then(extractItem),
  update: (id, data) => adminPut(`${WX}/menus/${id}`, data).then(extractItem),
  delete: (id) => adminDel(`${WX}/menus/${id}`).then(extractItem),
  // 发布下发到公众号（后端：POST /wx/menus/:id/publish）
  publish: (id, data = {}) => adminPost(`${WX}/menus/${id}/publish`, data).then(extractItem),
  // 删除远程菜单（撤销公众号菜单；后端：DELETE /wx/menu/remote）
  deleteRemote: () => adminDel(`${WX}/menu/remote`).then(extractItem),
}

// ==================== 公众号发布账号（对接 zhao-studio 多媒体发布中心账号体系） ====================
const ZS = '/zhao-studio/v1/admin'
export const ssoWxPublishAccountApi = {
  /**
   * 确保 type=wechat 的公众号发布平台存在，返回其 documentId。
   * 公众号图文草稿/发布账号必须挂在 wechat 平台下，账号 config 填 appId/appSecret。
   */
  ensureWechatPlatform: async () => {
    const { list } = await adminGet(`${ZS}/platforms`).then(extractList)
    const wx = (list || []).find((p) => p.type === 'wechat' && p.isActive !== false)
    if (wx) return wx.documentId || wx.id
    const created = await adminPost(`${ZS}/platforms`, {
      data: { name: '微信公众号', type: 'wechat', category: 'content', isActive: true },
    }).then(extractItem)
    return created.documentId || created.id
  },
  // 列表（按 wechat 平台过滤）
  list: (platformId) => adminGet(`${ZS}/accounts`, { platformId }).then(extractList),
  create: (data) => adminPost(`${ZS}/accounts`, { data }).then(extractItem),
  update: (id, data) => adminPut(`${ZS}/accounts/${id}`, { data }).then(extractItem),
  remove: (id) => adminDel(`${ZS}/accounts/${id}`).then(extractItem),
}