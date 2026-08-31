<template>
  <view class="page-container">
    <PageHeader title="临时开放课时授权" />

    <!-- 授权配置 -->
    <view class="form-block">
      <view class="form-item">
        <text class="form-label">选择活动</text>
        <picker mode="selector" :range="activityTitles" :disabled="activitiesLoading" @change="handleActivityChange">
          <view class="picker-value">
            <text :class="['picker-placeholder', { empty: !currentActivityId }]">{{ currentActivityTitle || '请选择活动' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>

      <view v-if="currentActivityId" class="form-item">
        <text class="form-label">开放课时</text>
        <picker v-if="lessonOptions.length" mode="selector" :range="lessonTitles" @change="handleLessonChange">
          <view class="picker-value">
            <text :class="['picker-placeholder', { empty: !lessonDocumentId }]">{{ lessonDocumentId ? (lessonTitles[lessonIndex] || `#${lessonDocumentId}`) : '请选择课时' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
        <view v-else class="lesson-input-row">
          <input class="form-input" v-model="lessonDocumentId" placeholder="该活动暂无预解锁课时，请输入课时ID" />
        </view>
        <view v-if="lessonOptions.length" class="form-tip">该活动可选临时课时</view>
      </view>

      <view class="form-item">
        <text class="form-label">目标客户</text>
        <input class="form-input" v-model="userId" placeholder="输入用户名或用户ID" />
      </view>

      <view class="form-item">
        <text class="form-label">到期时间</text>
        <picker mode="selector" :range="expiryOptions" @change="handleExpiryChange">
          <view class="picker-value">
            <text>{{ expiryOptions[expiryIndex] }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      <view v-if="expiryIndex === 1" class="form-item">
        <text class="form-label">自定义日期</text>
        <picker mode="date" :value="customDate" @change="handleDateChange">
          <view class="picker-value">
            <text class="picker-placeholder" :class="{ empty: !customDate }">{{ customDate || '请选择日期' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>

      <view class="submit-row">
        <view class="submit-btn" :class="{ disabled: submitting }" @click="submitGrant"><text>{{ submitting ? '提交中...' : '授予临时开放' }}</text></view>
      </view>
    </view>

    <!-- 已授权记录 -->
    <view class="section-head">
      <text class="section-title">已授权记录</text>
    </view>
    <view class="list">
      <view v-if="authLoading" class="loading"><text>加载中...</text></view>
      <template v-else>
        <view v-for="item in authList" :key="item.id" class="card">
          <view class="card-header">
            <text class="user-name">{{ item.user?.username || item.user?.nickname || `#${item.user?.id}` }}</text>
            <text class="status-badge" :class="item.isExpired ? 'cancelled' : 'active'">{{ item.isExpired ? '已过期' : '有效' }}</text>
          </view>
          <view class="card-meta">
            <text class="meta-item">课时: {{ item.lessonDocumentId || '-' }}</text>
            <text class="meta-item">来源: {{ sourceText(item.source) }}</text>
          </view>
          <view class="card-meta">
            <text class="meta-item">授予时间: {{ formatTime(item.grantedAt) }}</text>
            <text class="meta-item">到期时间: {{ formatTime(item.expiresAt) }}</text>
          </view>
        </view>
        <view v-if="authList.length === 0" class="empty-state">
          <text class="empty-text">暂无授权记录</text>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { listActivities, getActivity, grantTempLessonAuth, listTempLessonAuth } from '../../api/activity.js'
import PageHeader from '../../components/PageHeader.vue'

const activities = ref([])
const activityTitles = ref([])
const activitiesLoading = ref(false)
const currentActivityId = ref('')
const currentActivityTitle = ref('')

const lessonOptions = ref([])
const lessonTitles = ref([])
const lessonIndex = ref(-1)
const lessonDocumentId = ref('')

const userId = ref('')
const expiryIndex = ref(0)
const expiryOptions = ['跟随活动结束', '自定义日期']
const customDate = ref('')
const submitting = ref(false)

const authList = ref([])
const authLoading = ref(false)

function formatTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function sourceText(src) {
  const map = { manual: '运营手动', signup: '报名即开放', milestone: '达标开放', mixed: '多模式', temp: '临时授权' }
  return map[src] || src || '-'
}

function normalizeLessons(raw) {
  const arr = Array.isArray(raw) ? raw : []
  return arr
    .map(x => ({ id: x.id, documentId: x.documentId, title: x.title || '' }))
    .filter(x => x.id || x.documentId)
}

async function loadActivities() {
  activitiesLoading.value = true
  try {
    const res = await listActivities({ page: 1, pageSize: 500 })
    const list = res.list || []
    activities.value = list
    activityTitles.value = list.map(a => a.title || `#${a.documentId || a.id}`)
  } catch (e) {
    activities.value = []
    activityTitles.value = []
    uni.showToast({ title: '活动加载失败', icon: 'none' })
  } finally {
    activitiesLoading.value = false
  }
}

async function handleActivityChange(e) {
  const index = Number(e.detail.value)
  const act = activities.value[index]
  if (!act) return
  currentActivityId.value = act.documentId || act.id
  currentActivityTitle.value = act.title || ''
  lessonOptions.value = []
  lessonTitles.value = []
  lessonIndex.value = -1
  lessonDocumentId.value = ''
  // 读取活动预解锁课时（临时开放模式仅绑定 1 条）
  try {
    const detail = await getActivity(currentActivityId.value)
    const lessons = normalizeLessons(detail?.preUnlockLessons)
    lessonOptions.value = lessons
    lessonTitles.value = lessons.map(l => l.title || `#${l.documentId || l.id}`)
  } catch (e) {
    lessonOptions.value = []
  }
  loadAuthList()
}

function handleLessonChange(e) {
  lessonIndex.value = Number(e.detail.value)
  const l = lessonOptions.value[lessonIndex.value]
  if (l) lessonDocumentId.value = l.documentId || l.id
}

function handleExpiryChange(e) {
  expiryIndex.value = Number(e.detail.value)
}

function handleDateChange(e) {
  customDate.value = e.detail.value
}

function resolveExpiresAt() {
  // 跟随活动结束：不传（空）
  if (expiryIndex.value !== 1 || !customDate.value) return ''
  // 自定义日期 → ISO 当天 23:59:59
  return `${customDate.value}T23:59:59`
}

async function submitGrant() {
  if (submitting.value) return
  if (!currentActivityId.value) return uni.showToast({ title: '请先选择活动', icon: 'none' })
  if (!lessonDocumentId.value) return uni.showToast({ title: '请选择或输入课时', icon: 'none' })
  if (!userId.value.trim()) return uni.showToast({ title: '请输入目标客户', icon: 'none' })

  submitting.value = true
  try {
    const payload = {
      activityId: currentActivityId.value,
      userId: userId.value.trim(),
      lessonDocumentId: lessonDocumentId.value,
      expiresAt: resolveExpiresAt() || undefined
    }
    const res = await grantTempLessonAuth(payload)
    const ok = res?.data?.ok ?? res?.ok
    if (ok === false) return uni.showToast({ title: '授权失败', icon: 'none' })
    uni.showToast({ title: '授权成功', icon: 'success' })
    userId.value = ''
    loadAuthList()
  } catch (e) {
    // 错误 toast 由 request 统一抛出
  } finally {
    submitting.value = false
  }
}

async function loadAuthList() {
  if (!currentActivityId.value) return
  authLoading.value = true
  try {
    const res = await listTempLessonAuth({ activityDocumentId: currentActivityId.value })
    authList.value = res?.data ?? res?.list ?? []
  } catch (e) {
    authList.value = []
  } finally {
    authLoading.value = false
  }
}

onMounted(() => {
  loadActivities()
})
</script>

<style scoped>
.page-container { padding: 20rpx 24rpx 60rpx; }
.form-block {
  background: #fff; border-radius: 16rpx; padding: 8rpx 24rpx 28rpx; margin-bottom: 24rpx;
}
.form-item { display: flex; align-items: center; padding: 24rpx 0; border-bottom: 1px solid #f0f0f0; }
.form-item:last-of-type { border-bottom: none; }
.form-label { width: 180rpx; font-size: 28rpx; color: #333; flex-shrink: 0; }
.picker-value { flex: 1; display: flex; align-items: center; justify-content: space-between; font-size: 28rpx; color: #333; }
.picker-placeholder { color: #999; }
.picker-placeholder.empty { color: #bbb; }
.picker-arrow { color: #999; font-size: 20rpx; margin-left: 8rpx; }
.form-input { flex: 1; font-size: 28rpx; color: #333; }
.lesson-input-row { flex: 1; display: flex; }
.form-tip { margin-top: 16rpx; font-size: 24rpx; color: #999; }
.submit-row { margin-top: 32rpx; }
.submit-btn {
  background: #2d7bf4; color: #fff; text-align: center; padding: 22rpx 0; border-radius: 12rpx; font-size: 30rpx;
}
.submit-btn.disabled { opacity: 0.6; }
.section-head { margin: 8rpx 4rpx 16rpx; }
.section-title { font-size: 30rpx; font-weight: 600; color: #333; }
.list { display: flex; flex-direction: column; gap: 16rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
.user-name { font-size: 30rpx; font-weight: 600; color: #333; }
.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 999rpx; }
.status-badge.active { background: #e8f7ee; color: #1b9c5c; }
.status-badge.cancelled { background: #fff1f0; color: #e5484d; }
.card-meta { margin-top: 12rpx; display: flex; gap: 24rpx; flex-wrap: wrap; }
.meta-item { font-size: 24rpx; color: #888; }
.loading { padding: 60rpx 0; text-align: center; color: #999; font-size: 26rpx; }
.empty-state { padding: 60rpx 0; text-align: center; color: #bbb; font-size: 26rpx; }
</style>