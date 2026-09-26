// 场地地图选点：locpicker 地址构造 + 回调报文解析（纯函数，无需渲染组件）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildLocPickerUrl, parseLocPickerMessage } from '../src/pages/activity/venue-map-pick.js'

const KEY = 'ABCDE-FGHIJ-KLMNO-PQRST-UVWXY-Z1234'

// ---- buildLocPickerUrl ----

test('buildLocPickerUrl: 无 Key 返回空串（调用方据此禁用选点按钮）', () => {
  assert.equal(buildLocPickerUrl('', '39.9,116.4'), '')
  assert.equal(buildLocPickerUrl(undefined, '39.9,116.4'), '')
})

test('buildLocPickerUrl: 带 Key 与中心点，参数完整可直用', () => {
  const url = buildLocPickerUrl(KEY, '39.908823,116.397470')
  assert.ok(url.startsWith('https://apis.map.qq.com/tools/locpicker?'))
  assert.ok(url.includes(`key=${KEY}`))
  assert.ok(url.includes('center=39.908823,116.397470'))
  assert.ok(url.includes('referer=zhao-point-admin'))
})

test('buildLocPickerUrl: 中心点缺失回落默认中心（天安门）', () => {
  assert.ok(buildLocPickerUrl(KEY, '').includes('center=39.908823,116.397470'))
  assert.ok(buildLocPickerUrl(KEY).includes('center=39.908823,116.397470'))
})

// ---- parseLocPickerMessage ----

test('parseLocPickerMessage: 标准 locPicker 报文（latlng）', () => {
  const r = parseLocPickerMessage({
    module: 'locPicker',
    latlng: { lat: 39.908823, lng: 116.39747 },
    poiaddress: '北京市东城区天安门',
  })
  assert.deepEqual(r, { lat: '39.908823', lng: '116.39747' })
})

test('parseLocPickerMessage: 坐标在 location 字段', () => {
  const r = parseLocPickerMessage({ location: { lat: 31.230416, lng: 121.473701 } })
  assert.deepEqual(r, { lat: '31.230416', lng: '121.473701' })
})

test('parseLocPickerMessage: 坐标平铺在顶层 lat/lng', () => {
  const r = parseLocPickerMessage({ latlng: { lat: 23.129163, lng: 113.264435 } })
  assert.deepEqual(r, { lat: '23.129163', lng: '113.264435' })
})

test('parseLocPickerMessage: JSON 字符串报文按对象解析', () => {
  const raw = JSON.stringify({ module: 'locPicker', latlng: { lat: 30.274085, lng: 120.15507 } })
  assert.deepEqual(parseLocPickerMessage(raw), { lat: '30.274085', lng: '120.15507' })
})

test('parseLocPickerMessage: 非法 JSON 字符串返回 null 而非抛错', () => {
  assert.equal(parseLocPickerMessage('{不是合法 JSON'), null)
})

test('parseLocPickerMessage: 缺任一坐标返回 null（不回填半截数据）', () => {
  assert.equal(parseLocPickerMessage({ latlng: { lat: 39.9 } }), null)
  assert.equal(parseLocPickerMessage({ latlng: { lng: 116.4 } }), null)
})

test('parseLocPickerMessage: 非选点报文返回 null（window 监听不误回填）', () => {
  // 页面监听的是全局 message，微信 JSSDK / 其它 iframe 的报文必须被忽略
  assert.equal(parseLocPickerMessage({ module: 'other', data: 1 }), null)
  assert.equal(parseLocPickerMessage({ type: 'webpackOk' }), null)
  assert.equal(parseLocPickerMessage(null), null)
  assert.equal(parseLocPickerMessage(undefined), null)
  assert.equal(parseLocPickerMessage(123), null)
  assert.equal(parseLocPickerMessage(''), null)
})