<template>
  <view class="page-container">
    <PageHeader title="消息任务" />

    <view class="help-banner">
      <text class="help-icon">📤</text>
      <text class="help-text">消息任务由 SOP 规则/业务埋点/手动发送生成，cron 每 1 分钟扫描到期任务下发。「失败」任务可手动重试；未绑定微信 openid（toTarget 空）会失败为 no_target。</text>
    </view>

    <view class="manual-bar">
      <view class="btn-primary" v-if="hasPermission('sso.msg.write')" @click="openManual">＋ 手动发送</view>
    </view>

    <view class="search-section">
      <view class="filter-row">
        <view v-for="s in STATUSES" :key="s.value" class="filter-item" :class="{ active: statusFilter === s.value }" @click="toggleStatus(s.value)">{{ s.label }}</view>
      </view>
    </view>

    <view class="data-list">
      <view v-for="item in dataList" :key="item.documentId" class="data-card">
        <view class="data-info">
          <view class="data-title">
            <text class="scene-name">{{ item.scene || '-' }}</text>
            <text class="status-tag" :class="item.status">{{ statusLabel(item.status) }}</text>
          </view>
          <view class="data-meta">
            <text class="meta-item">模板: {{ tmplCode(item) }}</text>
            <text class="meta-item">用户: {{ userName(item) }}</text>
          </view>
          <view class="data-meta">
            <text class="meta-item" v-if="item.provider">通道: {{ item.provider }}</text>
            <text class="meta-item" v-if="item.wxMsgId">msgId: {{ item.wxMsgId }}</text>
            <text class="meta-item" v-if="item.retryCount">重试: {{ item.retryCount }} 次</text>
          </view>
          <view class="data-meta" v-if="failReason(item)">
            <text class="meta-item fail">失败原因: {{ failReason(item) }}</text>
          </view>
          <view class="data-footer">
            <text class="data-date">创建: {{ fmt(item.createdAt) }}</text>
            <text class="data-date" v-if="item.scheduledAt">计划: {{ fmt(item.scheduledAt) }}</text>
            <text class="data-date" v-if="item.sentAt">发送: {{ fmt(item.sentAt) }}</text>
          </view>
        </view>
        <view class="data-actions">
          <view v-if="item.status === 'failed' && hasPermission('sso.msg.write')" class="action-btn retry" @click.stop="handleRetry(item)">重试</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && dataList.length === 0" class="empty-state">
      <text class="empty-icon">🗂️</text>
      <text class="empty-text">暂无消息任务</text>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>

    <!-- 手动发送弹层 -->
    <view class="send-mask" v-if="manualVisible" @click="manualVisible = false">
      <view class="send-modal" @click.stop>
        <view class="send-modal-header">
          <text class="send-modal-title">手动发送</text>
          <text class="ab-modal-close" @click="manualVisible = false">✕</text>
        </view>

        <view class="form-item">
          <text class="form-label">选择模板 <text class="required">*</text></text>
          <picker range-key="name" :range="manualTemplates" @change="pickManualTemplate">
            <view class="form-input picker">{{ manualTemplate ? manualTemplate.code + ' · ' + manualTemplate.name : '点击选择已启用模板' }}</view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">目标用户 <text class="required">*</text></text>
          <input class="form-input" v-model="manualSearch" placeholder="搜索微信手机号/昵称/邮箱" @confirm="searchManualUsers" />
          <view class="user-list" v-if="manualUsers.length">
            <view v-for="u in manualUsers" :key="u.id" class="user-row" :class="{ active: manualUser && manualUser.id === u.id }" @click="pickManualUser(u)">
              <text class="user-name">{{ u.username || u.nickname || u.mobile || u.email || '#' + u.id }}</text>
              <text class="user-id">id={{ u.id }}</text>
            </view>
          </view>
          <view v-if="manualUser" class="user-picked">已选: {{ manualUser.username || manualUser.mobile || manualUser.email || ('#' + manualUser.id) }}</view>
        </view>

        <view class="form-item">
          <text class="form-label">参数字段测试值</text>
          <view v-if="manualFields.length === 0" class="send-empty">该模板无参数字段，可直接发送</view>
          <view v-for="(f, i) in manualFields" :key="i" class="form-item">
            <text class="form-label">{{ f.key }} → {{ f.name }}</text>
            <input class="form-input" v-model="manualParams[f.key]" :placeholder="`填 ${f.name} 的测试值`" />
          </view>
        </view>

        <view class="send-footer">
          <view class="btn-add" @click="manualVisible = false">取消</view>
          <button class="btn-save small" @click="doManualSend" :disabled="manualSending">{{ manualSending ? '发送中...' : '发送' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ssoMsgTemplateApi, ssoMsgJobApi, getSsoUserOptions } from '../../../api/sso.js'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'

const STATUSES = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待发送' },
  { value: 'sending', label: '发送中' },
  { value: 'sent', label: '已发送' },
  { value: 'failed', label: '失败' },
]

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const statusFilter = ref('')
const dataList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

function statusLabel(s) { return { pending: '待发送', sending: '发送中', sent: '已发送', failed: '失败', cancelled: '已取消' }[s] || s || '-' }
function tmplCode(item) { return item.template && (item.template.code || item.template.name) || '-' }
function userName(item) {
  const u = item.user
  if (!u) return '-'
  return u.username || u.email || u.mobile || (u.id ? '#' + u.id : '-')
}
function fmt(dt) { return dt ? String(dt).replace('T', ' ').substring(0, 19) : '' }
function failReason(item) {
  if (!item.result) return ''
  const r = item.result
  if (typeof r === 'string') return r
  return r.message || r.error || ''
}

function toggleStatus(v) { statusFilter.value = statusFilter.value === v ? '' : v; loadData(1) }

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { page, pageSize: 10 }
    if (statusFilter.value) params['status[$eq]'] = statusFilter.value
    const { list, pagination: pg } = await ssoMsgJobApi.list(params)
    dataList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleRetry(item) {
  uni.showModal({
    title: '重试发送',
    content: '确定重试该消息任务吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await ssoMsgJobApi.retry(item.id)
          uni.showToast({ title: '已重试', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: '重试失败', icon: 'none' })
        }
      }
    }
  })
}

function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }

// ===== 手动发送 =====
const manualVisible = ref(false)
const manualTemplates = ref([])
const manualTemplate = ref(null)
const manualFields = ref([])
const manualParams = ref({})
const manualSearch = ref('')
const manualUsers = ref([])
const manualUser = ref(null)
const manualSending = ref(false)

async function openManual() {
  manualVisible.value = true
  manualTemplate.value = null
  manualUser.value = null
  manualUsers.value = []
  manualSearch.value = ''
  manualParams.value = {}
  const { list } = await ssoMsgTemplateApi.list({ page: 1, pageSize: 100 }).catch(() => ({ list: [] }))
  manualTemplates.value = (list || []).filter((t) => t.isEnabled !== false)
}

function pickManualTemplate(e) {
  const t = manualTemplates.value[Number(e.detail.value)]
  if (!t) return
  manualTemplate.value = t
  let fields = t.wxTemplateFields || []
  if (typeof fields === 'string') { try { fields = JSON.parse(fields) } catch { fields = [] } }
  manualFields.value = fields.filter((f) => f && f.key && f.name).map((f) => ({ key: f.key, name: f.name }))
  manualParams.value = {}
  manualFields.value.forEach((f) => { manualParams.value[f.key] = '' })
}

async function searchManualUsers() {
  if (!manualSearch.value) return
  try {
    const { list } = await getSsoUserOptions({ search: manualSearch.value, pageSize: 20 })
    manualUsers.value = list || []
  } catch (e) {
    uni.showToast({ title: '用户查询失败', icon: 'none' })
  }
}

function pickManualUser(u) {
  manualUser.value = u
  manualUsers.value = []
}

async function doManualSend() {
  if (!manualTemplate.value) { uni.showToast({ title: '请选择模板', icon: 'none' }); return }
  if (!manualUser.value) { uni.showToast({ title: '请选择目标用户', icon: 'none' }); return }
  manualSending.value = true
  const params = {}
  manualFields.value.forEach((f) => { if (manualParams.value[f.key] !== '' && manualParams.value[f.key] !== undefined) params[f.key] = manualParams.value[f.key] })
  try {
    const job = await ssoMsgJobApi.sendNow({ user: manualUser.value.id, scene: 'manual', templateCode: manualTemplate.value.code, params })
    const st = job && job.status
    if (st === 'sent') {
      uni.showToast({ title: '发送成功', icon: 'success' })
    } else {
      const reason = (job && job.result && (job.result.message || job.result.reason || job.result.error)) || st
      uni.showToast({ title: (st === 'quota_limited' ? '频控: ' : '失败: ') + reason, icon: 'none' })
    }
    manualVisible.value = false
    loadData(1)
  } catch (e) {
    uni.showToast({ title: '发送失败', icon: 'none' })
  } finally {
    manualSending.value = false
  }
}

onShow(() => { loadData(1) })
</script>

<style scoped>
page { background: #f5f5f5; }
.help-banner {
  display: flex; align-items: flex-start; gap: 12rpx;
  background: #e6f4ff; padding: 20rpx; border-radius: 12rpx;
  margin-bottom: 20rpx; border-left: 6rpx solid #1677ff;
}
.help-icon { font-size: 28rpx; flex-shrink: 0; }
.help-text { font-size: 26rpx; color: #333; line-height: 1.5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.search-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.filter-row { display: flex; flex-wrap: wrap; gap: 16rpx; }
.filter-item { padding: 10rpx 24rpx; border-radius: 8rpx; background: #f5f5f5; font-size: 26rpx; color: #666; }
.filter-item.active { background: #1677ff; color: #fff; }
.data-list { display: flex; flex-direction: column; gap: 20rpx; }
.data-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: center; }
.data-info { flex: 1; display: flex; flex-direction: column; }
.data-title { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; flex-wrap: wrap; }
.scene-name { font-size: 30rpx; font-weight: bold; color: #333; }
.status-tag { font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 6rpx; color: #fff; }
.status-tag.pending { background: #1677ff; }
.status-tag.sending { background: #d48806; }
.status-tag.sent { background: #07c160; }
.status-tag.failed { background: #ff4d4f; }
.status-tag.cancelled { background: #999; }
.data-meta { margin-bottom: 8rpx; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; }
.meta-item.fail { color: #ff4d4f; }
.data-footer { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 8rpx; }
.data-date { font-size: 22rpx; color: #aaa; }
.data-actions { display: flex; flex-direction: column; gap: 12rpx; margin-left: 16rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.retry { background: #e6f4ff; color: #1677ff; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }

.manual-bar { margin-bottom: 20rpx; }
.btn-primary { background: #ff0000; color: #fff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; display: inline-block; }
.send-mask { position: fixed; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; display: flex; align-items: center; justify-content: center; }
.send-modal { width: 88%; max-height: 80vh; background: #fff; border-radius: 16rpx; padding: 28rpx; box-sizing: border-box; overflow-y: auto; }
.send-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.send-modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.picker { line-height: 76rpx; }
.user-list { margin-top: 12rpx; border-top: 1rpx solid #f0f0f0; }
.user-row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.user-row.active { background: #e6f4ff; }
.user-name { font-size: 26rpx; color: #333; }
.user-id { font-size: 24rpx; color: #999; }
.user-picked { margin-top: 12rpx; font-size: 26rpx; color: #1677ff; }
.send-empty { font-size: 26rpx; color: #999; padding: 20rpx 0; }
.send-footer { display: flex; align-items: center; justify-content: flex-end; gap: 20rpx; margin-top: 24rpx; }
</style>
