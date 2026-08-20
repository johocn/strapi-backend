<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑 SOP 规则' : '新增 SOP 规则'" />

    <view class="form-card">
      <view class="form-item">
        <text class="form-label">规则编码 code <text class="required">*</text></text>
        <input class="form-input" v-model="form.code" placeholder="如 act_before / course_d7（唯一，保存后不可更改）" :disabled="isEdit" />
      </view>

      <view class="form-item">
        <text class="form-label">规则名称 <text class="required">*</text></text>
        <input class="form-input" v-model="form.name" placeholder="如：活动开始前提醒" />
      </view>

      <view class="form-item">
        <text class="form-label">触发方式 source</text>
        <view class="segment-row">
          <view v-for="s in SOURCES" :key="s.value" class="segment-item" :class="{ active: form.source === s.value }" @click="form.source = s.value">
            {{ s.label }}
          </view>
        </view>
      </view>

      <view class="form-item" v-if="form.source === 'event'">
        <text class="form-label">业务事件 event <text class="required">*</text></text>
        <input class="form-input" v-model="form.event" placeholder="如 activity.signup / course.enrolled（与业务埋点一致）" />
        <view class="event-presets">
          <text v-for="e in EVENT_PRESETS" :key="e" class="preset-tag" @click="form.event = e">{{ e }}</text>
        </view>
      </view>

      <view class="form-item" v-else>
        <text class="form-label">cron 表达式 <text class="required">*</text></text>
        <input class="form-input" v-model="form.cronExpression" placeholder="标准 5 段 cron，如 0 9 * * 1-5" />
      </view>

      <view class="form-item">
        <text class="form-label">消息模板 templateCode <text class="required">*</text></text>
        <input class="form-input" v-model="form.templateCode" placeholder="引用消息中心模板编码，如 act_confirm" />
        <view class="event-presets" v-if="templateOptions.length">
          <text v-for="t in templateOptions" :key="t.code" class="preset-tag" @click="form.templateCode = t.code">{{ t.code }}</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">场景 scene</text>
        <input class="form-input" v-model="form.scene" placeholder="消息任务场景标记，如 activity.confirm" />
      </view>

      <view class="form-item">
        <text class="form-label">默认延迟 delayMinutes</text>
        <input class="form-input" type="number" v-model="form.delayMinutes" placeholder="0 = 立即发送（业务埋点可精确排期覆盖）" />
      </view>

      <view class="form-item">
        <text class="form-label">跳转链接 link</text>
        <input class="form-input" v-model="form.link" placeholder="消息点击跳转链接（可选）" />
      </view>

      <view class="form-item">
        <text class="form-label">启用</text>
        <view class="switch-row">
          <switch :checked="form.enabled" @change="(e) => (form.enabled = e.detail.value)" color="#07c160" />
          <text class="switch-tip">{{ form.enabled ? '已启用：事件触发时生效' : '已禁用：事件触发时跳过' }}</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">说明</text>
        <textarea class="form-textarea" v-model="form.description" placeholder="规则用途说明（可选）" :maxlength="300" />
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
import { ssoSopRuleApi, ssoMsgTemplateApi } from '../../../api/sso.js'
import PageHeader from '../../../components/PageHeader.vue'

const SOURCES = [
  { value: 'event', label: '事件触发' },
  { value: 'cron', label: '定时触发' },
]
const EVENT_PRESETS = ['activity.signup', 'activity.closed', 'course.enrolled']

const id = ref('')
const isEdit = computed(() => !!id.value)
const saving = ref(false)
const templateOptions = ref([])
const form = ref({
  code: '', name: '', source: 'event', event: '',
  cronExpression: '', templateCode: '', scene: '',
  delayMinutes: 0, link: '', enabled: true, description: '',
})

async function loadTemplates() {
  try {
    const { list } = await ssoMsgTemplateApi.list({ page: 1, pageSize: 100 })
    templateOptions.value = (list || []).filter((t) => t.isEnabled !== false)
  } catch (e) { /* 模板下拉非关键 */ }
}

async function loadDetail(rid) {
  try {
    const { list } = await ssoSopRuleApi.list()
    const item = (list || []).find((r) => String(r.id) === String(rid) || r.documentId === rid)
    if (!item) return
    form.value = {
      code: item.code || '',
      name: item.name || '',
      source: item.source || 'event',
      event: item.event || '',
      cronExpression: item.cronExpression || '',
      templateCode: item.templateCode || '',
      scene: item.scene || '',
      delayMinutes: item.delayMinutes ?? 0,
      link: item.link || '',
      enabled: item.enabled !== false,
      description: item.description || '',
    }
  } catch (e) {
    uni.showToast({ title: '加载规则失败', icon: 'none' })
  }
}

async function handleSave() {
  if (!form.value.code || !form.value.code.trim()) { uni.showToast({ title: '请填写规则编码', icon: 'none' }); return }
  if (!form.value.name || !form.value.name.trim()) { uni.showToast({ title: '请填写规则名称', icon: 'none' }); return }
  if (form.value.source === 'event' && !form.value.event) { uni.showToast({ title: '请填写业务事件', icon: 'none' }); return }
  if (form.value.source === 'cron' && !form.value.cronExpression) { uni.showToast({ title: '请填写 cron 表达式', icon: 'none' }); return }
  if (!form.value.templateCode) { uni.showToast({ title: '请填写消息模板编码', icon: 'none' }); return }

  saving.value = true
  const payload = { ...form.value, delayMinutes: Number(form.value.delayMinutes) || 0 }
  try {
    if (isEdit.value) {
      await ssoSopRuleApi.update(id.value, payload)
    } else {
      await ssoSopRuleApi.create(payload)
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
  loadTemplates()
  if (query.id) {
    id.value = query.id
    loadDetail(query.id)
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
.event-presets { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 12rpx; }
.preset-tag { padding: 8rpx 20rpx; background: #e6f4ff; color: #1677ff; border-radius: 8rpx; font-size: 24rpx; }
.switch-row { display: flex; align-items: center; gap: 16rpx; }
.switch-tip { font-size: 24rpx; color: #999; }
.footer-bar { position: fixed; left: 0; right: 0; bottom: 0; padding: 20rpx; background: #fff; box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.05); }
.btn-save { width: 100%; background: #ff0000; color: #fff; border-radius: 8rpx; font-size: 32rpx; }
</style>
