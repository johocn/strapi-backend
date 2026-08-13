import { STRAPI_URL } from '../config/env.js'

export function formatDate(dateStr, format = 'YYYY-MM-DD HH:mm') {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const pad = (n) => n.toString().padStart(2, '0')
  const map = {
    'YYYY': date.getFullYear(),
    'MM': pad(date.getMonth() + 1),
    'DD': pad(date.getDate()),
    'HH': pad(date.getHours()),
    'mm': pad(date.getMinutes()),
    'ss': pad(date.getSeconds())
  }
  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, match => map[match])
}

export function formatNumber(num) {
  if (num === undefined || num === null) return '0'
  return num.toLocaleString('zh-CN')
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i]
}

export function flattenAttributes(data) {
  if (!data) return null
  if (Array.isArray(data)) {
    return data.map(item => flattenAttributes(item))
  }
  
  if (typeof data !== 'object') {
    return data
  }
  
  let result
  if (data.attributes) {
    result = { id: data.id, documentId: data.documentId, ...data.attributes }
  } else if (data.documentId) {
    result = { documentId: data.documentId, ...data }
  } else {
    result = { ...data }
  }
  
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = flattenAttributes(result[key])
    }
  }
  
  return result
}

export function extractList(response) {
  if (!response) return { list: [], pagination: {} }
  
  // 后端包装格式：{ code, msg, data: { records, total, page, pageSize } }
  if (response.data && response.data.records !== undefined) {
    return {
      list: flattenAttributes(response.data.records),
      pagination: { total: response.data.total, page: response.data.page, pageSize: response.data.pageSize }
    }
  }
  
  // 直接分页格式：{ records, total }
  if (response.records && response.total !== undefined) {
    return {
      list: flattenAttributes(response.records),
      pagination: { total: response.total }
    }
  }
  
  if (response.list && Array.isArray(response.list)) {
    return {
      list: flattenAttributes(response.list),
      pagination: response.pagination || {}
    }
  }

  // data 是数组的情况
  if (response.data && Array.isArray(response.data)) {
    return {
      list: flattenAttributes(response.data),
      pagination: response.meta?.pagination ?? {}
    }
  }
  
  if (Array.isArray(response)) {
    return { list: flattenAttributes(response), pagination: {} }
  }
  
  return { list: [], pagination: {} }
}

export function extractItem(response) {
  if (!response) return null
  if (response.data !== undefined && response.data !== null) {
    return flattenAttributes(response.data)
  }
  if ('documentId' in response) {
    return flattenAttributes(response)
  }
  return response
}

export function getMediaUrl(file, preferOss = true) {
  if (!file) return ''
  
  const meta = file.provider_metadata
  
  if (preferOss && meta?.ossUrl && meta.ossStatus === 'success') {
    return meta.ossUrl
  }
  
  if (meta?.localUrl) {
    if (meta.localUrl.startsWith('http')) return meta.localUrl
    return `${STRAPI_URL}${meta.localUrl}`
  }
  
  if (file.url) {
    if (file.url.startsWith('http')) return file.url
    return `${STRAPI_URL}${file.url}`
  }
  
  if (typeof file === 'string') {
    if (file.startsWith('http')) return file
    return `${STRAPI_URL}${file}`
  }
  
  return ''
}
