<template>
  <view class="questionnaire-config">
    <view class="form-item">
      <text class="form-label">问卷标题</text>
      <input v-model="rc.title" class="form-input" placeholder="调查问卷" />
    </view>
    <view class="form-item" v-if="!themeDisabled">
      <text class="form-label">预设场景主题</text>
      <picker mode="selector" :range="themeList.map(t => t.label + (t.hint ? ' · ' + t.hint : ''))" @change="onPickTheme">
        <view class="picker-value">
          <text :class="{ 'picker-empty': !currentThemeId }">{{ themeList.find(t => t.id === currentThemeId)?.label || '选择主题模板（自动填入）' }}</text>
          <text class="picker-arrow">▼</text>
        </view>
      </picker>
    </view>
    <view class="form-item">
      <view class="template-toolbar">
        <view class="template-btn" @click="applyDefaultTemplate">＋ 使用默认「{{ templateLabel }}」模板</view>
      </view>
    </view>
      <view v-for="(f, fi) in rc.fields" :key="fi" class="field-slot">
        <view class="fee-block">
          <view class="fee-block-header">
            <text class="fee-block-title">题目 {{ fi + 1 }}</text>
            <button class="btn-link-danger" @click="removeQuestionField(fi)">删除</button>
          </view>
          <view class="form-row">
            <view class="form-item half">
              <text class="form-label">key</text>
              <input type="text" v-model="f.key" placeholder="如 satisfaction" class="form-input" />
            </view>
            <view class="form-item half">
              <text class="form-label">题目</text>
              <input type="text" v-model="f.label" placeholder="如 满意度" class="form-input" />
            </view>
          </view>
          <view class="form-row">
            <view class="form-item half">
              <text class="form-label">类型</text>
              <picker mode="selector" :range="fieldTypeLabels" :value="fieldTypeIndex(f.type)" @change="e => f.type = fieldTypeValues[Number(e.detail.value)] || 'text'">
                <view class="picker-value">
                  <text>{{ fieldTypeLabel(f.type) }}</text>
                  <text class="picker-arrow">▼</text>
                </view>
              </picker>
            </view>
            <view class="form-item half">
              <text class="form-label">必填</text>
              <view class="radio-row">
                <text :class="['radio-opt', { on: f.required }]" @click="f.required = true">是</text>
                <text :class="['radio-opt', { on: !f.required }]" @click="f.required = false">否</text>
              </view>
            </view>
          </view>
          <view v-if="f.type === 'number'" class="form-row">
            <view class="form-item half">
              <text class="form-label">最小值</text>
              <input type="number" v-model="f.min" class="form-input" />
            </view>
            <view class="form-item half">
              <text class="form-label">最大值</text>
              <input type="number" v-model="f.max" class="form-input" />
            </view>
          </view>
          <view v-if="f.type === 'radio' || f.type === 'select' || f.type === 'multi'" class="form-item fee-field">
            <text class="form-label">选项</text>
            <view v-for="(o, oi) in f.options" :key="oi" class="opt-row">
              <input type="text" v-model="f.options[oi]" placeholder="选项内容" class="form-input" />
              <text class="opt-del" @click="removeQuestionOption(fi, oi)">✕</text>
            </view>
            <button class="btn-add" @click="addQuestionOption(fi)">添加选项</button>
          </view>
        </view>
      </view>
      <view class="template-insert-btn" @click="addQuestionFieldAt(rc.fields.length)">＋ 添加题目</view>
  </view>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { PRE_QUESTIONNAIRE_THEMES, POST_QUESTIONNAIRE_THEMES } from './activity-questionnaire-themes'

const props = defineProps({
  questionnaire: { type: Object, default: () => null },
  templateLabel: { type: String, default: '调查问卷' },
  template: { type: Array, default: null },
  themes: { type: Array, default: null }, // 预设场景主题；null 时按 templateLabel 自动匹配内置 10/5 套
  themeDisabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:questionnaire'])

const rc = ref(defaultConfig())
function defaultConfig() {
  return { enabled: false, title: '调查问卷', fields: [] }
}
/** 外部引用回写标记：避免「emit→父更新→props 同引用→重建 rc」死循环 */
let lastEmitted = null
watch(
  () => props.questionnaire,
  (v) => {
    if (!v || v === lastEmitted || v === rc.value) return
    rc.value = v && typeof v === 'object'
      ? {
          enabled: v.enabled === true,
          title: v.title || '调查问卷',
          fields: Array.isArray(v.fields) ? v.fields.map(cloneField) : [],
        }
      : defaultConfig()
  }
)
// 深度回写：组件内任意修改（含裸 v-model：标题/题目/选项等）实时同步父组件 form
watch(
  rc,
  (v) => {
    lastEmitted = v
    emit('update:questionnaire', v)
  },
  { deep: true }
)
onMounted(() => {
  if (props.questionnaire && typeof props.questionnaire === 'object') {
    rc.value = {
      enabled: props.questionnaire.enabled === true,
      title: props.questionnaire.title || '调查问卷',
      fields: Array.isArray(props.questionnaire.fields) ? props.questionnaire.fields.map(cloneField) : [],
    }
  }
})

function cloneField(f) {
  return {
    key: f.key || '', label: f.label || '', type: f.type || 'text', required: !!f.required,
    options: Array.isArray(f.options) ? [...f.options] : [],
    min: f.min, max: f.max, step: f.step,
  }
}

const fieldTypeValues = ['text', 'phone', 'textarea', 'radio', 'select', 'multi', 'number']
const fieldTypeLabels = ['文本', '手机号', '多行文本', '单选', '下拉', '多选', '数字']
function fieldTypeLabel(t) { const i = fieldTypeValues.indexOf(t); return i >= 0 ? fieldTypeLabels[i] : t }
function fieldTypeIndex(t) { const i = fieldTypeValues.indexOf(t); return i >= 0 ? i : 0 }

function addQuestionFieldAt(fi) {
  rc.value.fields.splice(fi, 0, { key: '', label: '', type: 'text', required: false, options: [], min: undefined, max: undefined, step: undefined })
  emit('update:questionnaire', rc.value)
}
function removeQuestionField(fi) { rc.value.fields.splice(fi, 1); emit('update:questionnaire', rc.value) }
function addQuestionOption(fi) { rc.value.fields[fi].options.push('') }
function removeQuestionOption(fi, oi) { rc.value.fields[fi].options.splice(oi, 1) }

const QUESTIONNAIRE_TEMPLATE = [
  { key: 'satisfaction', label: '满意度', type: 'radio', options: ['非常满意', '满意', '一般', '不满意'], required: false },
  { key: 'gain', label: '本次收获', type: 'multi', options: ['知识技能', '人脉拓展', '行业洞察', '其他'], required: false },
  { key: 'suggestion', label: '改进建议', type: 'textarea', required: false },
]
function applyDefaultTemplate() {
  const tpl = Array.isArray(props.template) && props.template.length ? props.template : QUESTIONNAIRE_TEMPLATE
  const existing = new Set(rc.value.fields.map((f) => f.key))
  const fresh = tpl.map((f) => ({ ...f, options: [...(f.options || [])] })).filter((f) => !existing.has(f.key))
  if (!fresh.length) {
    uni.showToast({ title: '模板题目均已存在', icon: 'none' })
    return
  }
  rc.value.fields = rc.value.fields.concat(fresh)
  rc.value.title = rc.value.title || props.templateLabel
  emit('update:questionnaire', rc.value)
  uni.showToast({ title: `已添加：${fresh.map((f) => f.label).join('、')}`, icon: 'success' })
}

// ===== 预设场景主题选择器 =====
const themeList = computed(() => {
  if (Array.isArray(props.themes) && props.themes.length) return props.themes
  return props.templateLabel && props.templateLabel.includes('活动前') ? PRE_QUESTIONNAIRE_THEMES : POST_QUESTIONNAIRE_THEMES
})
/** 当前已选主题（按 fields 的 key 集合匹配主题 fields 的 key 集合）回显；无匹配则空串 */
const currentThemeId = computed(() => {
  const keys = new Set(rc.value.fields.map((f) => f.key))
  for (const t of themeList.value) {
    if (t.fields.every((tf) => keys.has(tf.key))) return t.id
  }
  return ''
})
function applyTheme(t) {
  if (!t || !Array.isArray(t.fields)) return
  rc.value.fields = t.fields.map((f) => ({ ...f, options: [...(f.options || [])] }))
  rc.value.title = rc.value.title || t.label
  emit('update:questionnaire', rc.value)
}
function onPickTheme(e) {
  const idx = Number(e.detail.value)
  const t = themeList.value[idx]
  if (!t) return
  if (rc.value.fields.length) {
    uni.showModal({
      title: '覆盖当前题目？',
      content: `选择「${t.label}」将覆盖现有 ${rc.value.fields.length} 道题目，可稍后再微调。`,
      confirmText: '覆盖',
      cancelText: '取消',
      success: (r) => { if (r.confirm) applyTheme(t) },
    })
  } else {
    applyTheme(t)
  }
}
</script>

<style scoped>
.fee-block { border: 1rpx solid #f0f0f0; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; }
.fee-block-header { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin-bottom: 16rpx; }
.fee-block-title { font-size: 28rpx; font-weight: 600; color: #333; }
.form-item { margin-bottom: 16rpx; }
.form-item.half { width: 48%; }
.form-row { display: flex; gap: 16rpx; }
.form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 10rpx; }
.form-input { border: 1rpx solid #e5e5e5; border-radius: 8rpx; padding: 14rpx 16rpx; font-size: 28rpx; }
.picker-value { border: 1rpx solid #e5e5e5; border-radius: 8rpx; padding: 14rpx 16rpx; font-size: 28rpx; display: flex; justify-content: space-between; align-items: center; }
.picker-arrow { font-size: 20rpx; color: #bbb; }
.picker-empty { color: #999; }
.radio-row { display: flex; gap: 12rpx; }
.radio-opt { padding: 10rpx 24rpx; border: 1rpx solid #e5e5e5; border-radius: 40rpx; font-size: 26rpx; color: #666; }
.radio-opt.on { border-color: #667eea; color: #667eea; background: #f4f6ff; }
.opt-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 10rpx; }
.opt-del { color: #999; font-size: 28rpx; padding: 0 8rpx; }
.btn-add { margin-top: 8rpx; font-size: 26rpx; color: #667eea; background: none; border: none; padding: 0; line-height: 1; }
.field-slot { margin-bottom: 16rpx; }
.template-toolbar { display: flex; gap: 16rpx; }
.template-btn { font-size: 26rpx; color: #667eea; padding: 8rpx 20rpx; border: 1rpx solid #667eea; border-radius: 40rpx; }
.template-insert-btn { font-size: 26rpx; color: #667eea; padding: 12rpx 0; }
.btn-link-danger { color: #e74c3c; font-size: 26rpx; padding: 0; line-height: 1; background: none; border: none; }
</style>
