/**
 * 场地地图选点：腾讯地图 locpicker 的地址构造与回调报文解析
 * 抽成纯函数，组件只负责视图与状态，便于 node --test 直接覆盖
 */

/** 未提供中心点时回落天安门（与自提点选点一致） */
const DEFAULT_CENTER = '39.908823,116.397470'

/**
 * 构造 locpicker iframe 地址
 * @param key 腾讯位置服务 Key；缺失返回空串（调用方据此禁用按钮）
 * @param center 地图初始中心 "lat,lng"，缺失用默认中心
 */
export function buildLocPickerUrl(key, center) {
  if (!key) return ''
  const c = center || DEFAULT_CENTER
  return `https://apis.map.qq.com/tools/locpicker?search=1&type=1&key=${key}&center=${c}&referer=zhao-point-admin`
}

/**
 * 解析 locpicker postMessage 回调
 * 兼容三种报文：module=locPicker 的对象、JSON 字符串、坐标在 location 字段
 * @returns { lat, lng } 字符串（直接回填输入框）或 null（非选点报文/坐标缺失）
 */
export function parseLocPickerMessage(data) {
  let loc = data
  // locpicker 可能返回 JSON 字符串
  if (typeof loc === 'string') {
    try { loc = JSON.parse(loc) } catch { return null }
  }
  if (!loc || typeof loc !== 'object') return null
  // 只认选点报文，避免监听 window message 时被其它 postMessage 误回填
  if (!(loc.module === 'locPicker' || loc.latlng || loc.location)) return null

  const lat = loc.latlng?.lat || loc.location?.lat || loc.lat
  const lng = loc.latlng?.lng || loc.location?.lng || loc.lng
  if (!lat || !lng) return null

  return { lat: String(lat), lng: String(lng) }
}