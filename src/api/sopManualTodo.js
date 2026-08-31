import { get, post } from '../utils/request.js'
import { extractList, extractItem } from '../utils/format.js'

const ADMIN = '/zhao-sso/v1/admin'

// ==================== 手动 SOP 待办 ====================

// listSopManualTodos(status): 待办列表，status 传 ''(全部) / 'open'(待处理) / 'done'(已发送)
export function listSopManualTodos(status = '') {
  return get(`${ADMIN}/sop-manual-todos`, { status }).then(extractList)
}

// dispatchSopManualTodo(id): 发送待办，返回 { sent } 表示实际发送条数
export function dispatchSopManualTodo(id) {
  return post(`${ADMIN}/sop-manual-todos/${id}/dispatch`).then(extractItem)
}

// skipSopManualTodo(id): 跳过待办
export function skipSopManualTodo(id) {
  return post(`${ADMIN}/sop-manual-todos/${id}/skip`).then(extractItem)
}