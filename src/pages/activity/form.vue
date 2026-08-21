<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑活动' : '新建活动'">
      <button class="btn-primary" @click="handleSubmit">保存</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">基本信息</view>

        <view class="form-item">
          <text class="form-label">活动标题 <text class="required">*</text></text>
          <input type="text" v-model="form.title" placeholder="请输入活动标题" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">活动描述</text>
          <textarea v-model="form.description" placeholder="请输入活动描述" class="form-textarea" />
        </view>

        <view class="form-item">
          <text class="form-label">场地名称</text>
          <input type="text" v-model="form.venueName" placeholder="请输入场地名称" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">所属系列</text>
          <picker mode="selector" :range="seriesNames" @change="handleSeriesChange">
            <view class="picker-value">
              <text class="picker-placeholder" :class="{ empty: !form.belongsToSeries }">{{ seriesNames[seriesIndex] || '不归属系列' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-row">
          <view class="form-item half">
            <text class="form-label">开始时间</text>
            <picker mode="date" :value="form.startTime" @change="e => form.startTime = e.detail.value">
              <view class="picker-value">
                <text>{{ form.startTime || '请选择' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item half">
            <text class="form-label">结束时间</text>
            <picker mode="date" :value="form.endTime" @change="e => form.endTime = e.detail.value">
              <view class="picker-value">
                <text>{{ form.endTime || '请选择' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">报名设置</view>

        <view class="form-item">
          <text class="form-label">容量 <text class="required">*</text></text>
          <input type="number" v-model="form.capacity" placeholder="默认100" class="form-input" />
        </view>

        <view class="form-row">
          <view class="form-item half">
            <text class="form-label">报名开始</text>
            <picker mode="date" :value="form.signupStart" @change="e => form.signupStart = e.detail.value">
              <view class="picker-value">
                <text>{{ form.signupStart || '请选择' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item half">
            <text class="form-label">报名结束</text>
            <picker mode="date" :value="form.signupEnd" @change="e => form.signupEnd = e.detail.value">
              <view class="picker-value">
                <text>{{ form.signupEnd || '请选择' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">核销与会场定位</view>

        <view class="form-item">
          <text class="form-label">核销方式</text>
          <picker mode="selector" :range="checkinModeLabels" @change="handleCheckinModeChange">
            <view class="picker-value">
              <text>{{ checkinModeLabels[checkinModeIndex] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">启用地理围栏</text>
          <switch :checked="form.geoEnforced" @change="form.geoEnforced = !form.geoEnforced" />
        </view>

        <view class="form-item">
          <text class="form-label">地理围栏半径（米）</text>
          <input type="number" v-model="form.geoRadiusM" placeholder="默认500" class="form-input" />
        </view>

        <view class="form-row">
          <view class="form-item half">
            <text class="form-label">纬度 lat</text>
            <input type="digit" v-model="form.lat" placeholder="经度" class="form-input" />
          </view>
          <view class="form-item half">
            <text class="form-label">经度 lng</text>
            <input type="digit" v-model="form.lng" placeholder="纬度" class="form-input" />
          </view>
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">状态</view>
        <view class="form-item">
          <text class="form-label">活动状态</text>
          <picker mode="selector" :range="statusOptions" @change="handleStatusChange">
            <view class="picker-value">
              <text>{{ statusOptions[statusIndex] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>
    </scroll-view>

    <view class="bottom-action">
      <button class="btn-save" @click="handleSubmit">保存活动</button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getActivity, createActivity, updateActivity, listSeries } from '../../api/activity.js'
import PageHeader from '../../components/PageHeader.vue'

const isEdit = ref(false)
const activityId = ref('')

const seriesList = ref([])
const seriesNames = computed(() => ['不归属系列', ...seriesList.value.map(s => s.title || '未命名系列')])
const seriesIndex = ref(0)

const form = reactive({
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  venueName: '',
  belongsToSeries: '',
  lat: '',
  lng: '',
  capacity: 100,
  usedCapacity: 0,
  signupStart: '',
  signupEnd: '',
  checkinMode: 'both',
  geoEnforced: false,
  geoRadiusM: 500,
  status: 'draft'
})

const checkinModeValues = ['both', 'self', 'worker_scan']
const checkinModeLabels = ['双方自由核销', '自助核销', '工作人员扫码']
const checkinModeIndex = ref(0)

const statusValues = ['draft', 'signup_open', 'ongoing', 'ended']
const statusOptions = ['草稿', '报名中', '进行中', '已结束']
const statusIndex = ref(0)

const isFormLoaded = ref(false)

function fmtDate(v) {
  if (!v) return ''
  if (typeof v === 'string' && v.includes('-')) return v.slice(0, 10)
  try {
    const d = new Date(v)
    if (isNaN(d.getTime())) return v
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  } catch (e) { return v }
}

function handleCheckinModeChange(e) {
  checkinModeIndex.value = Number(e.detail.value)
  form.checkinMode = checkinModeValues[checkinModeIndex.value]
}
function handleStatusChange(e) {
  statusIndex.value = Number(e.detail.value)
  form.status = statusValues[statusIndex.value]
}
function handleSeriesChange(e) {
  seriesIndex.value = Number(e.detail.value)
  form.belongsToSeries = seriesIndex.value === 0 ? '' : (seriesList.value[seriesIndex.value - 1]?.documentId || '')
}

async function loadSeries() {
  try {
    const res = await listSeries({ page: 1, pageSize: 200 })
    seriesList.value = res.list || []
    syncSeriesIndex()
  } catch (e) {
    seriesList.value = []
  }
}

function syncSeriesIndex() {
  const idx = seriesList.value.findIndex(s => s.documentId === form.belongsToSeries)
  seriesIndex.value = idx >= 0 ? idx + 1 : 0
}

function syncIndexes() {
  checkinModeIndex.value = Math.max(0, checkinModeValues.indexOf(form.checkinMode))
  statusIndex.value = Math.max(0, statusValues.indexOf(form.status))
}

async function loadDetail() {
  if (!activityId.value) return
  try {
    const data = await getActivity(activityId.value)
    if (!data) {
      uni.showToast({ title: '活动不存在', icon: 'none' })
      return
    }
    Object.assign(form, data, {
      startTime: fmtDate(data.startTime),
      endTime: fmtDate(data.endTime),
      signupStart: fmtDate(data.signupStart),
      signupEnd: fmtDate(data.signupEnd),
      capacity: data.capacity ?? 100,
      usedCapacity: data.usedCapacity ?? 0,
      geoEnforced: data.geoEnforced === true,
      geoRadiusM: data.geoRadiusM ?? 500,
      checkinMode: data.checkinMode || 'both',
      status: data.status || 'draft'
    })
    form.belongsToSeries = data.belongsToSeries || data.series || ''
    syncIndexes()
    syncSeriesIndex()
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    isFormLoaded.value = true
  }
}

async function handleSubmit() {
  if (!form.title.trim()) return uni.showToast({ title: '请输入活动标题', icon: 'none' })
  if (!form.capacity || Number(form.capacity) <= 0) return uni.showToast({ title: '请输入有效容量', icon: 'none' })

  const submitData = {
    title: form.title,
    description: form.description || undefined,
    venueName: form.venueName || undefined,
    belongsToSeries: form.belongsToSeries || undefined,
    lat: form.lat === '' ? undefined : Number(form.lat),
    lng: form.lng === '' ? undefined : Number(form.lng),
    capacity: Number(form.capacity),
    startTime: form.startTime,
    endTime: form.endTime,
    signupStart: form.signupStart,
    signupEnd: form.signupEnd,
    checkinMode: form.checkinMode,
    geoEnforced: form.geoEnforced,
    geoRadiusM: Number(form.geoRadiusM) || 0,
    status: form.status
  }
  // 清理空 datetime，避免后端校验空字符串
  for (const k of ['startTime', 'endTime', 'signupStart', 'signupEnd']) {
    if (!submitData[k]) delete submitData[k]
  }

  uni.showLoading({ title: '保存中...' })
  try {
    if (isEdit.value) {
      await updateActivity(activityId.value, submitData)
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      await createActivity(submitData)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
    uni.hideLoading()
    setTimeout(() => {
      uni.navigateBack()
    }, 800)
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: e.message || '保存失败', icon: 'none', duration: 3000 })
  }
}

onLoad((options) => {
  if (options.id) {
    isEdit.value = true
    activityId.value = options.id
  }
})
onMounted(() => { loadDetail(); loadSeries() })
</script>

<style scoped>
.page-container { min-height: 100vh; background: #f5f5f5; }
.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff; border: none; padding: 15rpx 30rpx; border-radius: 40rpx; font-size: 28rpx;
}
.form-scroll { padding: 100rpx 30rpx 140rpx; height: 100vh; }
.form-section { background: #fff; border-radius: 20rpx; padding: 30rpx; margin-bottom: 30rpx; }
.section-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 30rpx; padding-bottom: 20rpx; border-bottom: 1rpx solid #eee; }
.form-item { margin-bottom: 30rpx; }
.form-row { display: flex; gap: 30rpx; }
.form-item.half { flex: 1; }
.form-label { display: block; font-size: 28rpx; color: #666; margin-bottom: 15rpx; }
.required { color: #ff4d4f; }
.form-input { width: 100%; height: 80rpx; border: 1rpx solid #ddd; border-radius: 10rpx; padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box; }
.form-textarea { width: 100%; height: 160rpx; border: 1rpx solid #ddd; border-radius: 10rpx; padding: 20rpx; font-size: 28rpx; box-sizing: border-box; }
.picker-value { display: flex; justify-content: space-between; align-items: center; height: 80rpx; border: 1rpx solid #ddd; border-radius: 10rpx; padding: 0 20rpx; font-size: 28rpx; }
.picker-placeholder.empty { color: #999; }
.picker-arrow { font-size: 20rpx; color: #999; }
.bottom-action { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 30rpx; background: #fff; box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.1); }
.btn-save { width: 100%; height: 90rpx; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border: none; border-radius: 45rpx; font-size: 32rpx; font-weight: bold; }
</style>