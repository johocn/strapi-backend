<template>
  <view class="page-container">
    <PageHeader title="关键字自动回复">
      <button class="btn-primary" @click="openCreate" v-if="hasPermission('menu.sso')">+ 新建规则</button>
    </PageHeader>

    <view class="help-banner">
      <text class="help-icon">ℹ️</text>
      <text class="help-text">配置关键字自动回复规则。触发方式支持欢迎语（welcome）、兜底（fallback）、关键字（keyword）；回复内容支持文本（text）与图文（article）。</text>
    </view>

    <!-- 新建/编辑表单 -->
    <view v-if="showForm" class="form-card">
      <view class="section-title">{{ form.id ? '编辑规则' : '新建规则' }}</view>

      <view class="form-item">
        <text class="form-label">触发方式<text class="required-mark">*</text></text>
        <picker mode="selector" :range="triggerOptions" range-key="label" @change="onTriggerChange" :value="triggerIndex">
          <view class="form-picker">{{ triggerOptions[triggerIndex].label }} ▼</view>
        </picker>
      </view>

      <view class="form-item" v-if="form.trigger === 'keyword'">
        <text class="form-label">关键字 / 匹配内容<text class="required-mark">*</text></text>
        <input v-model="form.match" class="form-input" placeholder="如：你好 / 关注" />
        <text class="form-hint">用户发送的消息命中该关键字时触发回复</text>
      </view>

      <view class="form-item">
        <text class="form-label">回复类型<text class="required-mark">*</text></text>
        <picker mode="selector" :range="replyTypeOptions" range-key="label" @change="onReplyTypeChange" :value="replyTypeIndex">
          <view class="form-picker">{{ replyTypeOptions[replyTypeIndex].label }} ▼</view>
        </picker>
      </view>

      <!-- 文本回复 -->
      <view class="form-item" v-if="form.reply_type === 'text'">
        <text class="form-label">回复文本<text class="required-mark">*</text></text>
        <textarea v-model="form.text" class="form-textarea" placeholder="请输入自动回复的文本内容" />
      </view>

      <!-- 图文回复 -->
      <template v-if="form.reply_type === 'article'">
        <view class="form-item">
          <text class="form-label">标题<text class="required-mark">*</text></text>
          <input v-model="form.title" class="form-input" placeholder="请输入图文标题" />
        </view>
        <view class="form-item">
          <text class="form-label">描述</text>
          <textarea v-model="form.desc" class="form-textarea" placeholder="图文摘要（选填）" />
        </view>
        <view class="form-item">
          <text class="form-label">链接 URL<text class="required-mark">*</text></text>
          <input v-model="form.link_url" class="form-input" placeholder="https://..." />
        </view>
      </template>

      <view class="form-actions">
        <button class="btn-secondary" @click="closeForm">取消</button>
        <button class="btn-primary" @click="handleSave" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
      </view>
    </view>

    <view class="data-list">
      <view v-for="item in dataList" :key="item.documentId || item.id" class="data-card">
        <view class="data-info">
          <view class="data-title">
            <text class="rule-tag" :style="{ background: triggerMeta(item.trigger).bg, color: triggerMeta(item.trigger).color }">{{ triggerMeta(item.trigger).label }}</text>
            <text class="rule-name">{{ item.trigger === 'keyword' ? (item.match || '未设置关键字') : (item.name || triggerMeta(item.trigger).label) }}</text>
            <view class="data-status" :class="(item.is_enabled === false) ? 'inactive' : 'active'">{{ (item.is_enabled === false) ? '停用' : '启用' }}</view>
          </view>
          <view class="data-meta">
            <text class="meta-item">回复类型: {{ item.reply_type === 'article' ? '图文' : '文本' }}</text>
            <text class="meta-item" v-if="item.reply_type === 'text'">{{ item.text }}</text>
          </view>
          <view class="data-meta" v-else-if="item.reply_type === 'article'">
            <text class="meta-item">📰 {{ item.title || '-' }}</text>
          </view>
          <view class="data-meta" v-if="item.reply_type === 'article' && item.link_url">
            <text class="meta-item link">{{ item.link_url }}</text>
          </view>
          <view class="data-footer">
            <text class="data-date">{{ fmtDateTime(item.updatedAt || item.updated_at) }}</text>
          </view>
        </view>
        <view class="data-actions">
          <view v-if="hasPermission('menu.sso')" class="action-btn edit" @click="openEdit(item)">编辑</view>
          <view v-if="hasPermission('menu.sso')" class="action-btn delete" @click="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && dataList.length === 0" class="empty-state">
      <text class="empty-icon">💬</text>
      <text class="empty-text">暂无回复规则，点击「+ 新建规则」创建</text>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ssoWxReplyApi } from '../../../api/wechat.js'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const triggerOptions = [
  { value: 'welcome', label: '欢迎语（关注时回复）' },
  { value: 'fallback', label: '兜底（未匹配时回复）' },
  { value: 'keyword', label: '关键字匹配' },
]
const replyTypeOptions = [
  { value: 'text', label: '文本' },
  { value: 'article', label: '图文' },
]

const dataList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const showForm = ref(false)
const saving = ref(false)
const form = ref(resetForm())

function resetForm() {
  return {
    id: '',
    trigger: 'keyword',
    match: '',
    reply_type: 'text',
    text: '',
    title: '',
    desc: '',
    link_url: '',
    is_enabled: true,
  }
}

const triggerIndex = computed(() => Math.max(0, triggerOptions.findIndex(t => t.value === form.value.trigger)))
const replyTypeIndex = computed(() => Math.max(0, replyTypeOptions.findIndex(t => t.value === form.value.reply_type)))

const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

function triggerMeta(value) {
  const map = {
    welcome: { label: '欢迎语', bg: '#e6f4ff', color: '#1677ff' },
    fallback: { label: '兜底', bg: '#fff7e6', color: '#fa8c16' },
    keyword: { label: '关键字', bg: '#f6ffed', color: '#07c160' },
  }
  return map[value] || { label: value || '-', bg: '#f5f5f5', color: '#666' }
}

function fmtDateTime(dt) {
  if (!dt) return '-'
  return String(dt).replace('T', ' ').substring(0, 19)
}

async function loadData(page = 1) {
  loading.value = true
  try {
    const { list, pagination: pg } = await ssoWxReplyApi.list({
      'pagination[page]': page,
      'pagination[pageSize]': 10,
    })
    dataList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = resetForm()
  showForm.value = true
}

function openEdit(item) {
  form.value = {
    id: item.documentId || item.id,
    trigger: item.trigger || 'keyword',
    match: item.match || '',
    reply_type: item.reply_type || 'text',
    text: item.text || '',
    title: item.title || '',
    desc: item.desc || item.description || '',
    link_url: item.link_url || '',
    is_enabled: item.is_enabled !== false,
  }
  showForm.value = true
}

function closeForm() { showForm.value = false }

function onTriggerChange(e) { form.value.trigger = triggerOptions[e.detail.value].value }
function onReplyTypeChange(e) { form.value.reply_type = replyTypeOptions[e.detail.value].value }

async function handleSave() {
  if (form.value.trigger === 'keyword' && !form.value.match) {
    uni.showToast({ title: '请填写关键字', icon: 'none' })
    return
  }
  if (form.value.reply_type === 'text' && !form.value.text) {
    uni.showToast({ title: '请填写回复文本', icon: 'none' })
    return
  }
  if (form.value.reply_type === 'article' && !form.value.title) {
    uni.showToast({ title: '请填写图文标题', icon: 'none' })
    return
  }
  if (form.value.reply_type === 'article' && !form.value.link_url) {
    uni.showToast({ title: '请填写链接 URL', icon: 'none' })
    return
  }
  saving.value = true
  const payload = {
    trigger: form.value.trigger,
    match: form.value.match,
    reply_type: form.value.reply_type,
    text: form.value.text,
    title: form.value.title,
    desc: form.value.desc,
    link_url: form.value.link_url,
    is_enabled: form.value.is_enabled,
  }
  try {
    if (form.value.id) {
      await ssoWxReplyApi.update(form.value.id, payload)
    } else {
      await ssoWxReplyApi.create(payload)
    }
    uni.showToast({ title: '保存成功', icon: 'success' })
    closeForm()
    loadData(currentPage.value)
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function handleDelete(item) {
  const id = item.documentId || item.id
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条回复规则吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await ssoWxReplyApi.delete(id)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }

onShow(() => loadData(1))
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.btn-primary { background: #ff0000; color: #fff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; }
.btn-secondary { background: #f5f5f5; color: #333; padding: 14rpx 32rpx; font-size: 28rpx; border-radius: 8rpx; border: none; line-height: 1.2; }
.help-banner { display: flex; align-items: flex-start; gap: 12rpx; background: #e6f4ff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; border-left: 6rpx solid #1677ff; }
.help-icon { font-size: 28rpx; flex-shrink: 0; }
.help-text { font-size: 26rpx; color: #333; line-height: 1.5; }
.form-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; padding-left: 8rpx; border-left: 6rpx solid #ff0000; }
.form-item { margin-bottom: 24rpx; }
.form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 12rpx; }
.required-mark { color: #ff4d4f; margin-left: 4rpx; }
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.form-textarea { width: 100%; min-height: 160rpx; padding: 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.form-picker { width: 100%; height: 72rpx; line-height: 72rpx; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box; color: #333; }
.form-hint { display: block; font-size: 24rpx; color: #999; margin-top: 6rpx; }
.form-actions { display: flex; justify-content: flex-end; gap: 20rpx; }
.data-list { display: flex; flex-direction: column; gap: 20rpx; }
.data-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: flex-start; }
.data-info { flex: 1; display: flex; flex-direction: column; }
.data-title { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.rule-tag { padding: 4rpx 16rpx; border-radius: 6rpx; font-size: 24rpx; flex-shrink: 0; }
.rule-name { font-size: 30rpx; font-weight: bold; color: #333; }
.data-status { padding: 4rpx 16rpx; border-radius: 4rpx; font-size: 22rpx; color: #fff; }
.data-status.active { background: #07c160; }
.data-status.inactive { background: #999; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; }
.meta-item.link { color: #1677ff; }
.data-footer { display: flex; justify-content: space-between; margin-top: 12rpx; }
.data-date { font-size: 22rpx; color: #999; }
.data-actions { display: flex; flex-direction: column; gap: 12rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; }
.action-btn.delete { background: #fff0f0; color: #ff4d4f; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }
</style>