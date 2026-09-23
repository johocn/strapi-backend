// 商户促销活动 —— 宣传导入归一化单测（零依赖，Node 20 内置 node:test）
// Node 20 会检测到 promo-import.js 的 ESM 语法并自动按 ES module 解析，无需 type:module
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizePromoModules,
  normalizeModuleConfig,
  normalizeGoodsList,
  defaultSalePromoModules,
} from '../src/pages/activity/promo-import.js'

const SALE_TYPES = ['goods', 'purpose', 'notice']

test('goods/purpose/notice 加入白名单', () => {
  for (const type of SALE_TYPES) {
    const out = normalizePromoModules([{ type }])
    assert.equal(out.length, 1, `${type} 未被白名单接受`)
    assert.equal(out[0].type, type)
  }
})

test('unknown 类型仍被过滤', () => {
  assert.equal(normalizePromoModules([{ type: 'unknown-x' }]).length, 0)
})

test('normalizeModuleConfig 清洗 goods 只保留 title/notice', () => {
  const cfg = normalizeModuleConfig('goods', { title: ' 今日特价 ', notice: ' 以到店价为准 ', junk: 1 })
  assert.deepEqual(cfg, { title: '今日特价', notice: '以到店价为准' })
})

test('normalizeModuleConfig 清洗 purpose 只保留 title', () => {
  assert.deepEqual(normalizeModuleConfig('purpose', { title: '活动目的', items: [1] }), { title: '活动目的' })
})

test('normalizeModuleConfig 清洗 notice 保留 title/html', () => {
  assert.deepEqual(
    normalizeModuleConfig('notice', { title: '活动说明', html: '<p>规则</p>', junk: 1 }),
    { title: '活动说明', html: '<p>规则</p>' }
  )
})

test('normalizeGoodsList 丢弃双价皆缺与非法项', () => {
  const out = normalizeGoodsList([
    { name: 'A', originPrice: 100, promoPrice: 59 },
    { name: 'B', originPrice: '80' },
    { name: 'C', promoPrice: '9.9' },
    { name: 'D' },
    'x',
    null,
  ])
  assert.equal(out.length, 3)
  assert.deepEqual(out.map(g => g.name), ['A', 'B', 'C'])
  assert.equal(out[1].promoPrice, null)
  assert.equal(out[2].originPrice, null)
})

test('normalizeGoodsList 空/非法入参返回空数组', () => {
  assert.deepEqual(normalizeGoodsList(null), [])
  assert.deepEqual(normalizeGoodsList({}), [])
})

test('defaultSalePromoModules 促销默认序为 cover→goods→purpose→notice→info→contact', () => {
  assert.deepEqual(defaultSalePromoModules().map(m => m.type), ['cover', 'goods', 'purpose', 'notice', 'info', 'contact'])
})