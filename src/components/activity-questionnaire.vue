<template>
  <view class="questionnaire-config">
    <view class="fee-block">
      <view class="fee-block-header">
        <text class="fee-block-title">问卷开关</text>
      </view>
      <view class="form-item">
        <text class="form-label">启用调查问卷</text>
        <switch :checked="!!rc.enabled" @change="toggleEnabled" />
      </view>
      <view v-if="rc.enabled" class="form-item">
        <text class="form-label">问卷标题</text>
        <input v-model="rc.title" class="form-input" placeholder="调查问卷" />
      </view>
    </view>

    <template v-if="rc.enabled">
      <view class="form-item">
        <view class="template-toolbar">
          <view class="template-btn" @click="applyDefaultTemplate">＋ 使用默认「调查问卷」模板</view>
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
    </template>
  </view>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  questionnaire: { type: Object, default: () => null },
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
    min: f.min, max: f.max,
  }
}
function toggleEnabled(e) {
  rc.value.enabled = e?.detail?.value === true || e?.detail?.value === 'true'
  if (!rc.value.enabled) rc.value.fields = []
  emit('update:questionnaire', rc.value)
}

const fieldTypeValues = ['text', 'phone', 'textarea', 'radio', 'select', 'multi', 'number']
const fieldTypeLabels = ['文本', '手机号', '多行文本', '单选', '下拉', '多选', '数字']
function fieldTypeLabel(t) { const i = fieldTypeValues.indexOf(t); return i >= 0 ? fieldTypeLabels[i] : t }
function fieldTypeIndex(t) { const i = fieldTypeValues.indexOf(t); return i >= 0 ? i : 0 }

function addQuestionFieldAt(fi) {
  rc.value.fields.splice(fi, 0, { key: '', label: '', type: 'text', required: false, options: [], min: undefined, max: undefined })
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
  const existing = new Set(rc.value.fields.map((f) => f.key))
  const fresh = QUESTIONNAIRE_TEMPLATE.map((f) => ({ ...f, options: [...(f.options || [])] })).filter((f) => !existing.has(f.key))
  if (!fresh.length) {
    uni.showToast({ title: '模板题目均已存在', icon: 'none' })
    return
  }
  rc.value.fields = rc.value.fields.concat(fresh)
  rc.value.title = rc.value.title || '调查问卷'
  emit('update:questionnaire', rc.value)
  uni.showToast({ title: `已添加：${fresh.map((f) => f.label).join('、')}`, icon: 'success' })
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
