import { get, post, put, del } from '../utils/request.js'
import { extractItem, extractList } from '../utils/format.js'

const ADMIN = '/zhao-common/v1/admin'

export function getTemplates(params = {}) {
  return get(`${ADMIN}/templates`, params).then(extractList)
}

export function getTemplate(documentId) {
  return get(`${ADMIN}/templates/${documentId}`).then(extractItem)
}

export function createTemplate(data) {
  return post(`${ADMIN}/templates`, { data }).then(extractItem)
}

export function updateTemplate(documentId, data) {
  return put(`${ADMIN}/templates/${documentId}`, { data }).then(extractItem)
}

export function deleteTemplate(documentId) {
  return del(`${ADMIN}/templates/${documentId}`).then(extractItem)
}

export function applyTemplateToSite(templateDocumentId, mode = 'merge') {
  return post(`${ADMIN}/templates/apply`, { templateDocumentId, mode }).then(extractItem)
}
