import { get, post, put, del } from '../utils/request.js'
import { extractList, extractItem } from '../utils/format.js'

const ADMIN = '/zhao-third/v1/admin'

export function getThirdPartyAccountList(params = {}) {
  return get(`${ADMIN}/third-party-accounts`, params).then(extractList)
}

export function getThirdPartyAccountDetail(documentId) {
  return get(`${ADMIN}/third-party-accounts/${documentId}`).then(extractItem)
}

export function deleteThirdPartyAccount(documentId) {
  return del(`${ADMIN}/third-party-accounts/${documentId}`).then(extractItem)
}

export function getThirdPartyConfigList(params = {}) {
  return get(`${ADMIN}/third-party-config`, params).then(extractList)
}

export function createThirdPartyConfig(data) {
  // zhao-third 控制器直接从 ctx.request.body 解构字段
  return post(`${ADMIN}/third-party-config`, data).then(extractItem)
}

export function updateThirdPartyConfig(documentId, data) {
  return put(`${ADMIN}/third-party-config/${documentId}`, data).then(extractItem)
}

export function deleteThirdPartyConfig(documentId) {
  return del(`${ADMIN}/third-party-config/${documentId}`).then(extractItem)
}