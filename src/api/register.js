import { post } from '../utils/request.js'

const PREFIX = '/zhao-channel/v1/channel'

export function validateInviteCode(code) {
  return post(`${PREFIX}/validate/public`, { code })
}

export function registerWithInviteCode(params) {
  return post(`${PREFIX}/register/public`, params)
}
