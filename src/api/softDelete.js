import { get, post } from '../utils/request.js'

const ADMIN = '/zhao-common/v1/admin'

export function softDelete(contentType, documentId) {
  return post(`${ADMIN}/soft-delete/${contentType}/${documentId}`)
}

export function restoreSoftDelete(contentType, documentId) {
  return post(`${ADMIN}/soft-delete/${contentType}/${documentId}/restore`)
}

export function findDeleted(contentType, options = {}) {
  const { filters, pagination, sort } = options
  return get(`${ADMIN}/soft-delete/${contentType}/deleted`, {
    params: { filters, pagination, sort },
  })
}
