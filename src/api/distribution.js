import { get, post, put, del } from '../utils/request.js'
import { extractList, extractItem } from '../utils/format.js'

const V1 = '/zhao-channel/v1'
const ADMIN = `${V1}/admin`

// 邀请记录管理
export function getInviteList(params = {}) {
  return get(`${ADMIN}/user-invites`, params).then(extractList)
}

export function getInviteDetail(id) {
  return get(`${ADMIN}/user-invites/${id}`).then(extractItem)
}

export function createInvite(data) {
  return post(`${ADMIN}/user-invites`, data).then(extractItem)
}

export function useInvite(data) {
  return post(`${ADMIN}/user-invites/use`, data).then(extractItem)
}

export function updateInvite(id, data) {
  return put(`${ADMIN}/user-invites/${id}`, data).then(extractItem)
}

export function deleteInvite(id) {
  return del(`${ADMIN}/user-invites/${id}`).then(extractItem)
}
