// 商户促销活动 —— 管理端一致性契约测试（零依赖，node:test）
// 锁死：白名单 ↔ 组件文件 ↔ 配置面板 ↔ 预览分发 ↔ 模块元数据，杜绝漏改
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { normalizePromoModules, normalizeModuleConfig } from '../src/pages/activity/promo-import.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const read = p => readFileSync(resolve(root, p), 'utf8')

/** web 白名单期望清单（16 类 = 15 类基础模块 + floatContact；与后端 PROMO_MODULE_TYPES 及 C 端一致） */
const EXPECTED = [
  'cover', 'info', 'rich', 'highlights', 'speakers', 'agenda', 'images',
  'rewards', 'contact', 'message', 'faq', 'custom', 'floatContact',
  'goods', 'purpose', 'notice',
]

const promoVue = read('src/pages/activity/promo.vue')
const presets = read('src/pages/activity/promo-presets.js')

test('白名单与期望清单一致（行为验证，非正则）', () => {
  for (const type of EXPECTED) {
    assert.equal(normalizePromoModules([{ type }]).length, 1, `${type} 未加入白名单`)
  }
  for (const type of ['tour', 'unknown-x']) {
    assert.equal(normalizePromoModules([{ type }]).length, 0, `${type} 不应在 web 白名单中`)
  }
})

/** type → 组件文件（floatContact 复用通用悬浮组件，文件名不遵循 promo- 前缀） */
const COMPONENT_FILE = { floatContact: 'src/components/promo/float-contact.vue' }
const componentFileOf = t => COMPONENT_FILE[t] || `src/components/promo/promo-${t}.vue`

test('每个白名单类型都有 C 端副本组件文件', () => {
  for (const type of EXPECTED) {
    const file = componentFileOf(type)
    assert.ok(existsSync(resolve(root, file)), `缺组件文件 ${file}`)
  }
})

test('每个白名单类型都有预览分发分支', () => {
  for (const type of EXPECTED) {
    assert.ok(
      promoVue.includes(`m.type === '${type}'`),
      `promo.vue 预览分发缺 ${type} 分支`
    )
  }
})

test('每个白名单类型都在 PROMO_MODULE_META 中', () => {
  for (const type of EXPECTED) {
    assert.ok(
      new RegExp(`(^|\\n)\\s*${type}:\\s*\\{`).test(presets),
      `promo-presets.js 缺 ${type} 元数据`
    )
  }
})

test('goods 归一化后 config 不含无关字段', () => {
  assert.deepEqual(normalizeModuleConfig('goods', { title: 't', originPrice: 1 }), { title: 't' })
})