// 运营端预览头部 —— 与 C 端同构的要素与降级契约
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(resolve(here, '../src/components/promo/promo-cover.vue'), 'utf8')

test('含状态徽章/标题/宣传重点/日期块/场地费用五要素', () => {
  for (const cls of ['cover-badge', 'cover-title', 'cover-highlight', 'cover-dates', 'cover-meta']) {
    assert.ok(src.includes(cls), `缺 ${cls}`)
  }
})

test('宣传重点优先 highlight，缺省回落 subtitle', () => {
  assert.ok(src.includes('props.config?.highlight || props.config?.subtitle'))
})

test('日期开始/结束各自独立 v-if 自动降级', () => {
  assert.match(src, /v-if="dateStart"/)
  assert.match(src, /v-if="dateEnd"/)
})

const pageSrc = readFileSync(resolve(here, '../src/pages/activity/promo.vue'), 'utf8')

test('无图兜底：预览未配置 cover 模块时合成头部，和 C 端一致', () => {
  assert.ok(pageSrc.includes('const previewModules = computed'), '缺 previewModules')
  assert.ok(pageSrc.includes("m?.type === 'cover'"), '缺 cover 判定')
  assert.ok(pageSrc.includes('v-for="m in previewModules"'), '预览未使用 previewModules')
})