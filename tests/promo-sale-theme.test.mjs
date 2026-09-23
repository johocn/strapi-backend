// 商户促销活动 —— sale 模板三处同步契约（后端枚举 / web 主题 / shao 主题）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { defaultSalePromoModules } from '../src/pages/activity/promo-import.js'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../..')

const readIfExists = p => (existsSync(p) ? readFileSync(p, 'utf8') : '')

test('web 主题定义 .promo-sale', () => {
  const scss = readIfExists(resolve(repoRoot, 'web/src/styles/promo-themes.scss'))
  assert.ok(/\.promo-sale\s*\{/.test(scss), 'web promo-themes.scss 缺 .promo-sale')
})

test('shao 主题定义 .promo-sale', () => {
  const scss = readIfExists(resolve(repoRoot, 'shao/styles/promo-themes.scss'))
  assert.ok(/\.promo-sale\s*\{/.test(scss), 'shao promo-themes.scss 缺 .promo-sale')
})

test('促销默认模块序为 cover→goods→purpose→notice→info→contact', () => {
  assert.deepEqual(
    defaultSalePromoModules().map(m => m.type),
    ['cover', 'goods', 'purpose', 'notice', 'info', 'contact']
  )
})