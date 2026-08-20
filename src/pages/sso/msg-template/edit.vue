<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑消息模板' : '新增消息模板'" />

    <view class="form-card">
      <view class="form-item">
        <text class="form-label">模板编码 code <text class="required">*</text></text>
        <input class="form-input" v-model="form.code" placeholder="如 act_confirm（SOP 规则按此引用，保存后不可随意更改）" :disabled="isEdit" />
      </view>

      <view class="form-item">
        <text class="form-label">模板名称 <text class="required">*</text></text>
        <input class="form-input" v-model="form.name" placeholder="如：活动报名成功确认" />
      </view>

      <view class="form-item">
        <text class="form-label">通道 provider</text>
        <view class="segment-row">
          <view v-for="p in PROVIDERS" :key="p.value" class="segment-item" :class="{ active: form.provider === p.value }" @click="form.provider = p.value">
            {{ p.label }}
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">公众号模板ID wxTemplateId</text>
        <input class="form-input" v-model="form.wxTemplateId" placeholder="在公众号后台「模板消息」申请后填入，如 xxx_AbCd1234" />
      </view>

      <view class="form-item">
        <text class="form-label">模板内容</text>
        <textarea class="form-textarea" v-model="form.content" placeholder="消息正文，可用 {key} 引用下方参数字段" :maxlength="500" />
      </view>

      <view class="form-item">
        <text class="form-label">参数字段 wxTemplateFields</text>
        <view class="field-list">
          <view v-for="(f, i) in form.wxTemplateFields" :key="i" class="field-row">
            <input class="field-input" v-model="f.key" placeholder="参数key（埋点传值用）" />
            <text class="field-sep">→</text>
            <input class="field-input" v-model="f.name" placeholder="微信字段名(如 thing1/date2)" />
            <view class="field-del" @click="removeField(i)">✕</view>
          </view>
        </view>
        <view class="btn-add" @click="addField">+ 添加字段</view>
      </view>

      <view class="form-item">
        <text class="form-label">启用</text>
        <view class="switch-row">
          <switch :checked="form.isEnabled" @change="(e) => (form.isEnabled = e.detail.value)" color="#07c160" />
          <text class="switch-tip">{{ form.isEnabled ? '已启用：SOP 下发可用' : '已禁用：下发会失败' }}</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">说明</text>
        <textarea class="form-textarea" v-model="form.description" placeholder="模板用途说明（可选）" :maxlength="300" />
      </view>
    </view>

    <view class="footer-bar">
      <button class="btn-save" @click="handleSave" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { ssoMsgTemplateApi } from '../../../api/sso.js'
import PageHeader from '../../../components/PageHeader.vue'

const PROVIDERS = [
  { value: 'wechat', label: '微信模板消息' },
  { value: 'mock', label: 'Mock(本地调试)' },
]

const documentId = ref('')
const isEdit = computed(() => !!documentId.value)
const saving = ref(false)
const form = ref({
  code: '', name: '', provider: 'wechat',
  wxTemplateId: '', content: '',
  wxTemplateFields: [{ key: '', name: '' }],
  isEnabled: true, description: '',
})

function addField() { form.value.wxTemplateFields.push({ key: '', name: '' }) }
function removeField(i) { form.value.wxTemplateFields.splice(i, 1) }

function normalizeFields() {
  return form.value.wxTemplateFields.filter((f) => (f.key && f.key.trim()) || (f.name && f.name.trim())).map((f) => ({ key: f.key.trim(), name: f.name.trim() }))
}

async function loadDetail(id) {
  try {
    const item = await ssoMsgTemplateApi.detail(id)
    if (!item) return
    let fields = item.wxTemplateFields
    if (typeof fields === 'string') { try { fields = JSON.parse(fields) } catch { fields = [] } }
    form.value = {
      code: item.code || '',
      name: item.name || '',
      provider: item.provider || 'wechat',
      wxTemplateId: item.wxTemplateId || '',
      content: item.content || '',
      wxTemplateFields: Array.isArray(fields) && fields.length ? fields : [{ key: '', name: '' }],
      isEnabled: item.isEnabled !== false,
      description: item.description || '',
    }
  } catch (e) {
    uni.showToast({ title: '加载模板失败', icon: 'none' })
  }
}

async function handleSave() {
  if (!form.value.code || !form.value.code.trim()) { uni.showToast({ title: '请填写模板编码', icon: 'none' }); return }
  if (!form.value.name || !form.value.name.trim()) { uni.showToast({ title: '请填写模板名称', icon: 'none' }); return }
  if (form.value.provider === 'wechat' && !form.value.wxTemplateId) { uni.showToast({ title: '请填写公众号模板ID', icon: 'none' }); return }
  saving.value = true
  const payload = { ...form.value, wxTemplateFields: normalizeFields() }
  try {
    if (isEdit.value) {
      await ssoMsgTemplateApi.update(documentId.value, payload)
    } else {
      await ssoMsgTemplateApi.create(payload)
    }
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) {
    // 错误 toast 已由 request 统一弹出
  } finally {
    saving.value = false
  }
}

onLoad((query) => {
  if (query.documentId) {
    documentId.value = query.documentId
    loadDetail(query.documentId)
  }
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; padding-bottom: 160rpx; box-sizing: border-box; }
.form-card { background: #fff; border-radius: 12rpx; padding: 24rpx; }
.form-item { margin-bottom: 28rpx; }
.form-label { display: block; font-size: 26rpx; color: #333; margin-bottom: 12rpx; }
.required { color: #ff4d4f; }
.form-input { height: 76rpx; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; font-size: 28rpx; }
.form-textarea { width: 100%; min-height: 120rpx; background: #f5f5f5; border-radius: 8rpx; padding: 16rpx 20rpx; font-size: 28rpx; box-sizing: border-box; }
.segment-row { display: flex; gap: 16rpx; }
.segment-item { flex: 1; text-align: center; padding: 18rpx 0; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; color: #666; }
.segment-item.active { background: #1677ff; color: #fff; }
.field-list { display: flex; flex-direction: column; gap: 12rpx; }
.field-row { display: flex; align-items: center; gap: 12rpx; }
.field-input { flex: 1; height: 68rpx; background: #f5f5f5; border-radius: 8rpx; padding: 0 16rpx; font-size: 26rpx; }
.field-sep { color: #999; }
.field-del { width: 48rpx; height: 48rpx; line-height: 48rpx; text-align: center; color: #ff4d4f; font-size: 28rpx; background: #fff0f0; border-radius: 8rpx; }
.btn-add { display: inline-block; padding: 12rpx 28rpx; background: #e6f4ff; color: #1677ff; border-radius: 8rpx; font-size: 26rpx; margin-top: 12rpx; }
.switch-row { display: flex; align-items: center; gap: 16rpx; }
.switch-tip { font-size: 24rpx; color: #999; }
.footer-bar { position: fixed; left: 0; right: 0; bottom: 0; padding: 20rpx; background: #fff; box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.05); }
.btn-save { width: 100%; background: #ff0000; color: #fff; border-radius: 8rpx; font-size: 32rpx; }
</style>
