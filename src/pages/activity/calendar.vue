<template>
  <view class="page-container">
    <PageHeader title="活动日历">
      <text class="cal-hint">含草稿全状态</text>
    </PageHeader>

    <view class="cal-panel">
      <view class="cal-header">
        <view class="cal-nav" @click="changeMonth(-1)">‹</view>
        <text class="cal-title">{{ year }}年{{ month }}月</text>
        <view class="cal-nav" @click="changeMonth(1)">›</view>
      </view>
      <view class="cal-week">
        <view v-for="(w, i) in weekNames" :key="i" class="cal-week-cell">{{ w }}</view>
      </view>
      <view class="cal-grid">
        <view
          v-for="(cell, i) in grid"
          :key="i"
          :class="['cal-cell', { 'is-dim': !cell.inMonth, 'is-active': cell.inMonth && cell.isActive && !cell.isSelected, 'is-selected': cell.isSelected }]"
          @click="cell.inMonth && selectDay(cell.dateStr)"
        >
          <text class="cal-day">{{ cell.dayNumber }}</text>
          <view v-if="cell.isActive" class="cal-dot"></view>
        </view>
      </view>
    </view>

    <view class="day-section">
      <view class="day-title">{{ dayLabel }} · {{ selectedActivities.length }} 场</view>
      <view v-for="item in selectedActivities" :key="item.documentId || item.id" class="activity-card" @click="goEdit(item)">
        <view class="card-header">
          <text class="card-title">{{ item.title || '-' }}</text>
          <text class="status-badge" :class="statusClass(item.status)">{{ statusText(item.status) }}</text>
        </view>
        <view class="card-meta">
          <text class="meta-item">🕐 {{ formatTime(item.startTime) }}</text>
          <text class="meta-item">📍 {{ item.venueName || '-' }}</text>
        </view>
        <view class="card-meta">
          <text class="meta-item">容量: {{ item.capacity ?? '-' }}</text>
          <text class="meta-item">已用: {{ item.usedCapacity ?? 0 }}</text>
        </view>
      </view>
      <view v-if="!loading && selectedActivities.length === 0" class="empty-day">当天无场次</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getAdminActivityCalendar } from '../../api/activity.js'
import PageHeader from '../../components/PageHeader.vue'

const weekNames = ['一', '二', '三', '四', '五', '六', '日']
const year = ref(new Date().getFullYear())
const month = ref(new Date().getMonth() + 1)
const selectedDate = ref('')
const dayMap = ref(new Map())
const loading = ref(false)

const statusTextMap = { draft: '草稿', signup_open: '报名中', ongoing: '进行中', ended: '已结束' }
const statusClassMap = { draft: 'draft', signup_open: 'open', ongoing: 'ongoing', ended: 'ended' }
function statusText(s) { return statusTextMap[s] || s || '-' }
function statusClass(s) { return statusClassMap[s] || 'default' }

const daysInMonth = computed(() => new Date(year.value, month.value, 0).getDate())
const firstOffset = computed(() => (new Date(year.value, month.value - 1, 1).getDay() + 6) % 7)

const grid = computed(() => {
  const cells = []
  for (let i = 0; i < 42; i++) {
    const dayNumber = i - firstOffset.value + 1
    const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth.value
    const dateStr = inMonth ? `${year.value}-${pad(month.value)}-${pad(dayNumber)}` : ''
    cells.push({ dateStr, dayNumber: inMonth ? dayNumber : '', inMonth, isActive: inMonth && dayMap.value.has(dateStr), isSelected: dateStr === selectedDate.value })
  }
  return cells
})

const dayLabel = computed(() => {
  if (!selectedDate.value) return ''
  const d = new Date(`${selectedDate.value}T00:00:00`)
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekNames[(d.getDay() + 6) % 7]}`
})
const selectedActivities = computed(() => dayMap.value.get(selectedDate.value) || [])

function pad(n) { return String(n).padStart(2, '0') }
function todayStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function formatTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function selectDay(dateStr) { selectedDate.value = dateStr }
function goEdit(item) { uni.navigateTo({ url: `/pages/activity/form?id=${item.documentId}` }) }

async function loadMonth() {
  loading.value = true
  try {
    const res = await getAdminActivityCalendar(`${year.value}-${pad(month.value)}`)
    const days = res?.data?.days ?? []
    const map = new Map()
    for (const day of days) map.set(day.date, day.activities || [])
    dayMap.value = map
    if (!map.has(selectedDate.value)) selectedDate.value = days.length ? days[0].date : ''
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function changeMonth(delta) {
  month.value += delta
  if (month.value > 12) { month.value = 1; year.value++ }
  if (month.value < 1) { month.value = 12; year.value-- }
  selectedDate.value = ''
  loadMonth()
}

onLoad(() => {
  selectedDate.value = todayStr(new Date())
  loadMonth()
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.cal-hint { font-size: 24rpx; color: #999; }
.cal-panel { background: #fff; border-radius: 16rpx; margin-bottom: 20rpx; }
.cal-header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.cal-nav { font-size: 44rpx; color: #666; padding: 0 30rpx; }
.cal-title { font-size: 32rpx; font-weight: 600; color: #333; }
.cal-week { display: flex; border-top: 1rpx solid #f0f0f0; }
.cal-week-cell { flex: 1; text-align: center; font-size: 24rpx; color: #999; padding: 16rpx 0; }
.cal-grid { display: flex; flex-wrap: wrap; border-top: 1rpx solid #f0f0f0; padding-bottom: 10rpx; }
.cal-cell { width: 14.28%; height: 88rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
.cal-day { font-size: 28rpx; color: #333; }
.is-dim .cal-day { color: #ccc; }
.is-active .cal-day { color: #667eea; font-weight: 600; }
.is-selected .cal-day { color: #fff; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 56rpx; height: 56rpx; text-align: center; line-height: 56rpx; border-radius: 50%; }
.cal-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: #ff7875; position: absolute; bottom: 10rpx; }
.day-section { }
.day-title { font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; }
.activity-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-title { font-size: 30rpx; font-weight: bold; color: #333; flex: 1; margin-right: 12rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; }
.status-badge.draft { background: #f5f5f5; color: #999; }
.status-badge.open { background: #e6f7ff; color: #1890ff; }
.status-badge.ongoing { background: #fff7e6; color: #fa8c16; }
.status-badge.ended { background: #f6ffed; color: #52c41a; }
.status-badge.default { background: #f5f5f5; color: #666; }
.card-meta { display: flex; gap: 16rpx; margin-bottom: 8rpx; flex-wrap: wrap; }
.meta-item { font-size: 24rpx; color: #999; }
.empty-day { background: #fff; border-radius: 12rpx; padding: 60rpx 0; text-align: center; font-size: 26rpx; color: #999; }
</style>