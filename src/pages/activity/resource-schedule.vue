<template>
  <view class="page-container">
    <PageHeader :title="`${typeLabel}档期 · ${resourceName}`">
      <view class="btn-group">
        <button class="btn-primary" @click="back">返回</button>
      </view>
    </PageHeader>

    <view class="search-section">
      <view class="form-row">
        <view class="date-item">
          <text class="form-label">从</text>
          <picker mode="date" :value="from" @change="e => changeFrom(e.detail.value)">
            <view class="picker-value"><text>{{ from || '请选择' }}</text></view>
          </picker>
        </view>
        <view class="date-item">
          <text class="form-label">至</text>
          <picker mode="date" :value="to" @change="e => changeTo(e.detail.value)">
            <view class="picker-value"><text>{{ to || '请选择' }}</text></view>
          </picker>
        </view>
      </view>
    </view>

    <view class="res-list" v-if="!loading && rows.length > 0">
      <view v-for="item in rows" :key="item.id" class="row-card">
        <view class="card-header">
          <text class="card-title">{{ item.title || '-' }}</text>
          <text class="status-badge">{{ item.status || '-' }}</text>
        </view>
        <view class="card-meta">
          <text class="meta-item">🕐 {{ formatTime(item.startTime) }}</text>
        </view>
        <view v-if="item.endTime" class="card-meta">
          <text class="meta-item">⏱ 至 {{ formatTime(item.endTime) }}</text>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && rows.length === 0" class="empty-state">
      <text class="empty-icon">📅</text>
      <text class="empty-text">该时段内无占用</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getSchedule } from '../../api/resource.js'
import PageHeader from '../../components/PageHeader.vue'

const type = ref('lecturer')
const typeLabel = ref('讲师')
const resourceId = ref('')
const resourceName = ref('')
const from = ref('')
const to = ref('')
const rows = ref([])
const loading = ref(false)

function formatTime(d) {
  if (!d) return '-'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function loadData() {
  if (!type.value || !resourceId.value) return
  loading.value = true
  try {
    const params = {}
    if (from.value) params.from = from.value
    if (to.value) params.to = to.value
    const res = await getSchedule(type.value, resourceId.value, params)
    rows.value = (res?.rows) || []
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function changeFrom(v) { from.value = v; loadData() }
function changeTo(v) { to.value = v; loadData() }
function back() { uni.navigateBack() }

onLoad((options) => {
  type.value = options.type === 'venue' ? 'venue' : 'lecturer'
  typeLabel.value = options.type === 'venue' ? '场地' : '讲师'
  resourceId.value = options.id || ''
  resourceName.value = decodeURIComponent(options.name || '')
  loadData()
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 40rpx; border: none; line-height: 1.2; }
.btn-group { display: flex; gap: 16rpx; align-items: center; }
.search-section { background: #fff; border-radius: 12rpx; padding: 20rpx 24rpx; margin-bottom: 20rpx; }
.form-row { display: flex; gap: 20rpx; }
.date-item { flex: 1; }
.form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 10rpx; }
.picker-value { display: flex; align-items: center; justify-content: center; height: 72rpx; border: 1rpx solid #ddd; border-radius: 10rpx; font-size: 26rpx; }

.res-list { display: flex; flex-direction: column; gap: 16rpx; }
.row-card { background: #fff; border-radius: 12rpx; padding: 24rpx; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-title { font-size: 30rpx; font-weight: bold; color: #333; flex: 1; margin-right: 12rpx; }
.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; background: #e6f7ff; color: #1890ff; }
.card-meta { display: flex; gap: 16rpx; margin-bottom: 8rpx; }
.meta-item { font-size: 24rpx; color: #999; }

.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }
</style>