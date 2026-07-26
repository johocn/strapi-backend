import { get, put } from '../utils/request.js'
import { extractItem } from '../utils/format.js'

const ADMIN = '/zhao-auth/v1/admin/module-visibility'

export function getModuleVisibility() {
  return get(ADMIN).then(extractItem)
}

export function updateModuleVisibility(data) {
  return put(ADMIN, data).then(extractItem)
}
