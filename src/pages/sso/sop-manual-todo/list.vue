<template>
  <view class="page-container">
    <PageHeader title="手动 SOP 待办"></PageHeader>

    <view class="search-section">
      <view class="filter-row">
        <view
          v-for="s in STATUS_FILTERS"
          :key="s.value"
          class="filter-item"
          :class="{ active: statusFilter === s.value }"
          @click="toggleStatus(s.value)"
        >{{ s.label }}</view>
      </view>
    </view>

    <view class="data-list">
      <view v-for="item in dataList" :key="item.id || item.documentId" class="data-card">
        <view class="data-info">
          <view class="data-title">
            <text class="config-name">{{ item.title || '-' }}</text>
            <text class="status-tag" :class="item.status === 'open' ? 'open' : 'done'">{{ item.status === 'open' ? '待处理' : '已发送' }}</text>
          </view>
          <view class="data-meta">
            <text class="meta-item">已发送: {{ item.sentCount ?? 0 }} 条</text>
            <text class="meta-item">创建: {{ item.createdAt || '-' }}</text>
          </view>
        </view>
        <view class="data-actions" v-if="item.status === 'open'">
          <view class="action-btn send" :class="{ disabled: dispatching }" @click.stop="handleDispatch(item)">发送</view>
          <view class="action-btn skip" :class="{ disabled: skipping }" @click.stop="handleSkip(item)">跳过</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading" style="padding-bottom: 16rpx;"><text>加载中...</text></view>
    <view v-if="!loading && dataList.length === 0" class="empty-state">
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无待办</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'
import { listSopManualTodos, dispatchSopManualTodo, skipSopManualTodo } from '../../../api/sopManualTodo.js'

const STATUS_FILTERS = [
  { value: '', label: '全部' },
  { value: 'open', label: '待处理' },
  { value: 'done', label: '已发送' },
]

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const statusFilter = ref('')
const dataList = ref([])
const loading = ref(false)
const dispatching = ref(false)
const skipping = ref(false)

function toggleStatus(v) {
  statusFilter.value = v
  loadData()
}

async function loadData() {
  loading.value = true
  try {
    const { list } = await listSopManualTodos(statusFilter.value)
    dataList.value = list
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function handleDispatch(item) {
  if (dispatching.value) return
  dispatching.value = true
  try {
    const res = await dispatchSopManualTodo(item.id || item.documentId)
    uni.showToast({ title: `已发送 ${res.sent} 条`, icon: 'none' })
    loadData()
  } catch (e) {
    // request 已统一 toast
  } finally {
    dispatching.value = false
  }
}

async function handleSkip(item) {
  if (skipping.value) return
  skipping.value = true
  try {
    await skipSopManualTodo(item.id || item.documentId)
    uni.showToast({ title: '已跳过', icon: 'success' })
    loadData()
  } catch (e) {
    // request 已统一 toast
  } finally {
    skipping.value = false
  }
}

onShow(() => { loadData() })
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.search-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.filter-row { display: flex; gap: 16rpx; }
.filter-item { padding: 10rpx 24rpx; border-radius: 8rpx; background: #f5f5f5; font-size: 26rpx; color: #666; }
.filter-item.active { background: #1677ff; color: #fff; }
.data-list { display: flex; flex-direction: column; gap: 20rpx; }
.data-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: center; }
.data-info { flex: 1; display: flex; flex-direction: column; }
.data-title { display: flex; align-items: center; gap: 12rpx; font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; flex-wrap: wrap; }
.config-name { font-size: 30rpx; font-weight: bold; color: #333; }
.status-tag { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 6rpx; }
.status-tag.open { color: #d48806; background: #fffbe6; }
.status-tag.done { color: #07c160; background: #e8f8ef; }
.data-meta { margin-bottom: 8rpx; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; }
.data-actions { display: flex; flex-direction: column; gap: 12rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.send { background: #1677ff; color: #fff; }
.action-btn.skip { background: #f5f5f5; color: #999; }
.action-btn.disabled { opacity: 0.5; pointer-events: none; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }
</style>