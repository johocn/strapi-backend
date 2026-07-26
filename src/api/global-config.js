import { get, put } from '../utils/request.js'
import { extractItem } from '../utils/format.js'

const ADMIN = '/zhao-common/v1/admin/global-config'

export function getGlobalConfig() {
  return get(ADMIN).then(extractItem)
}

export function updateGlobalConfig(data) {
  return put(ADMIN, data).then(extractItem)
}
