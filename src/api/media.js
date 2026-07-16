import { get, post, del } from '../utils/request.js'
import { extractList, extractItem } from '../utils/format.js'
import { BASE_API } from '../config/env.js'
import { getToken } from '../utils/auth.js'

const OSS = '/zhao-oss/v1'

export function uploadToOss(filePath, folder = '/general', folderId = null) {
  const formData = { folder }
  if (folderId) formData.folderId = folderId
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${BASE_API}${OSS}/upload`,
      filePath,
      name: 'file',
      formData,
      header: {
        'Authorization': `Bearer ${getToken()}`
      },
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const data = JSON.parse(res.data)
            resolve(extractItem(data))
          } catch (e) {
            resolve(res.data)
          }
        } else {
          try {
            const errData = JSON.parse(res.data)
            reject(new Error(errData.error?.message || `上传失败: ${res.statusCode}`))
          } catch (e) {
            reject(new Error(`上传失败: ${res.statusCode}`))
          }
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

export function getOssMediaList(params = {}) {
  return get(`${OSS}/media/list`, params).then(extractList)
}

export function getOssFolders() {
  return get(`${OSS}/media/folders`).then(extractItem)
}

export function createOssFolder(name, parentId = null) {
  return post(`${OSS}/media/folders`, { name, parentId }).then(extractItem)
}

export function deleteOssMedia(fileId) {
  return del(`${OSS}/media/${fileId}`).then(extractItem)
}

export function getOssSyncStatus(fileId) {
  return get(`${OSS}/sync/status/${fileId}`).then(extractItem)
}

export function getReferences(fileId) {
  return get(`${OSS}/media/${fileId}/references`).then(extractItem)
}
