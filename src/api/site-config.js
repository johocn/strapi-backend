import { get, post, put, del } from '../utils/request.js'
import { extractList, extractItem } from '../utils/format.js'

const ADMIN = '/zhao-common/v1/admin'

export function getPublicSiteConfig() {
  return get('/zhao-common/v1/config/public').then(extractItem)
}

export function getSiteConfigList(params = {}) {
  return get(`${ADMIN}/config/sites`, params).then(extractList)
}

export function getSiteConfigDetail(documentId) {
  return get(`${ADMIN}/config/site/${documentId}`).then(extractItem)
}

export function createSiteConfig(data) {
  return post(`${ADMIN}/config/site`, data).then(extractItem)
}

export function updateSiteConfig(documentId, data) {
  return put(`${ADMIN}/config/site/${documentId}`, data).then(extractItem)
}

export function deleteSiteConfig(documentId) {
  return del(`${ADMIN}/config/site/${documentId}`).then(extractItem)
}