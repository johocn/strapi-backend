<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑系列' : '新建系列'">
      <button class="btn-primary" @click="handleSubmit">保存</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">基本信息</view>

        <view class="form-item">
          <text class="form-label">系列标题 <text class="required">*</text></text>
          <input type="text" v-model="form.title" placeholder="请输入系列标题" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">系列描述</text>
          <textarea v-model="form.description" placeholder="请输入系列描述" class="form-textarea" />
        </view>

        <view class="form-item">
          <text class="form-label">封面图 URL</text>
          <input type="text" v-model="form.cover" placeholder="请输入封面图URL" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">排序值</text>
          <input type="number" v-model="form.sortOrder" placeholder="数字越小越靠前" class="form-input" />
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">排期规则</view>
        <view class="form-item">
          <text class="form-label">重复日期</text>
          <checkbox-group class="weekday-group" @change="handleWeekdayChange">
            <label v-for="(name, i) in weekdayNames" :key="i+1" class="weekday-item" :class="{ checked: schedule.weekdays.includes(i+1) }">
              <checkbox :value="String(i+1)" :checked="schedule.weekdays.includes(i+1)" class="weekday-checkbox" />
              <text>{{ name }}</text>
            </label>
          </checkbox-group>
        </view>

        <view class="form-row">
          <view class="form-item half">
            <text class="form-label">开始时间</text>
            <picker mode="time" :value="schedule.startTime" @change="e => schedule.startTime = e.detail.value">
              <view class="picker-value">
                <text>{{ schedule.startTime || '请选择' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item half">
            <text class="form-label">时长（分钟）</text>
            <input type="number" v-model="schedule.durationMin" placeholder="默认60" class="form-input" />
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">生成周数</text>
          <input type="number" v-model="schedule.generateWeeks" placeholder="排期覆盖几周" class="form-input" />
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">状态</view>
        <view class="form-item">
          <text class="form-label">系列状态</text>
          <picker mode="selector" :range="statusOptions" @change="handleStatusChange">
            <view class="picker-value">
              <text>{{ statusOptions[statusIndex] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">默认报名/签到规则（场次继承，可单场覆盖）</view>

        <view class="form-item">
          <text class="form-label">默认容量</text>
          <input type="number" v-model="dr.capacity" placeholder="默认100" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">提前报名天数</text>
          <input type="number" v-model="dr.signupOpenDays" placeholder="默认0" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">积分价</text>
          <input type="number" v-model="dr.pointsCost" placeholder="0=免费" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">计费点</text>
          <picker mode="selector" :range="drFeeLabels" @change="handleDrFeeChange">
            <view class="picker-value">
              <text>{{ drFeeLabels[drFeeIndex] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">签到模式</text>
          <picker mode="selector" :range="drCheckinLabels" @change="handleDrCheckinChange">
            <view class="picker-value">
              <text>{{ drCheckinLabels[drCheckinIndex] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">启用地理围栏</text>
          <switch :checked="dr.geoEnforced" @change="dr.geoEnforced = !dr.geoEnforced" />
        </view>

        <view class="form-item">
          <text class="form-label">地理围栏半径（米）</text>
          <input type="number" v-model="dr.geoRadiusM" placeholder="默认500" class="form-input" />
        </view>
      </view>
    </scroll-view>

    <view class="bottom-action">
      <button class="btn-save" @click="handleSubmit">保存系列</button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getSeries, createSeries, updateSeries } from '../../api/activity.js'
import PageHeader from '../../components/PageHeader.vue'

const isEdit = ref(false)
const seriesId = ref('')

const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const form = reactive({
  title: '',
  description: '',
  cover: '',
  sortOrder: 0,
  status: 'active'
})
const schedule = reactive({
  weekdays: [1],
  startTime: '',
  durationMin: 60,
  generateWeeks: 4
})

const dr = reactive({
  capacity: 100,
  signupOpenDays: 0,
  checkinMode: 'both',
  geoEnforced: false,
  geoRadiusM: 500,
  pointsCost: 0,
  feeCollectAt: 'signup'
})

const statusValues = ['active', 'hidden']
const statusOptions = ['启用', '隐藏']
const statusIndex = ref(0)

const drFeeValues = ['signup', 'checkin']
const drFeeLabels = ['报名时扣费', '签到时收费']
const drFeeIndex = ref(0)
const drCheckinValues = ['both', 'self', 'worker_scan']
const drCheckinLabels = ['双方自由核销', '自助核销', '工作人员扫码']
const drCheckinIndex = ref(0)

const isFormLoaded = ref(false)

function handleWeekdayChange(e) {
  schedule.weekdays = (e.detail.value || []).map(v => Number(v))
}
function handleStatusChange(e) {
  statusIndex.value = Number(e.detail.value)
  form.status = statusValues[statusIndex.value]
}
function handleDrFeeChange(e) {
  drFeeIndex.value = Number(e.detail.value)
  dr.feeCollectAt = drFeeValues[drFeeIndex.value]
}
function handleDrCheckinChange(e) {
  drCheckinIndex.value = Number(e.detail.value)
  dr.checkinMode = drCheckinValues[drCheckinIndex.value]
}

function syncDrIndexes() {
  drFeeIndex.value = Math.max(0, drFeeValues.indexOf(dr.feeCollectAt))
  drCheckinIndex.value = Math.max(0, drCheckinValues.indexOf(dr.checkinMode))
}

async function loadDetail() {
  if (!seriesId.value) return
  try {
    const data = await getSeries(seriesId.value)
    if (!data) {
      uni.showToast({ title: '系列不存在', icon: 'none' })
      return
    }
    Object.assign(form, {
      title: data.title || '',
      description: data.description || '',
      cover: data.cover || '',
      sortOrder: data.sortOrder ?? 0,
      status: data.status || 'active'
    })
    const s = data.schedule || {}
    schedule.weekdays = Array.isArray(s.weekdays) ? s.weekdays : [1]
    schedule.startTime = s.startTime || ''
    schedule.durationMin = s.durationMin ?? 60
    schedule.generateWeeks = s.generateWeeks ?? 4
    statusIndex.value = Math.max(0, statusValues.indexOf(form.status))
    Object.assign(dr, data.defaultRules || {})
    syncDrIndexes()
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    isFormLoaded.value = true
  }
}

function buildSubmitSchedule() {
  return {
    weekdays: schedule.weekdays.length ? schedule.weekdays : [1],
    startTime: schedule.startTime || undefined,
    durationMin: Number(schedule.durationMin) || 0,
    generateWeeks: Number(schedule.generateWeeks) || 0
  }
}

async function handleSubmit() {
  if (!form.title.trim()) return uni.showToast({ title: '请输入系列标题', icon: 'none' })
  if (!schedule.weekdays.length) return uni.showToast({ title: '请至少选择一天', icon: 'none' })

  const submitData = {
    title: form.title,
    description: form.description || undefined,
    cover: form.cover || undefined,
    sortOrder: Number(form.sortOrder) || 0,
    status: form.status,
    schedule: buildSubmitSchedule(),
    defaultRules: { ...dr }
  }

  uni.showLoading({ title: '保存中...' })
  try {
    if (isEdit.value) {
      await updateSeries(seriesId.value, submitData)
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      await createSeries(submitData)
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
    seriesId.value = options.id
  }
})
onMounted(() => { loadDetail() })
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
.picker-arrow { font-size: 20rpx; color: #999; }
.weekday-group { display: flex; flex-wrap: wrap; gap: 20rpx; }
.weekday-item { display: flex; align-items: center; gap: 4rpx; padding: 10rpx 20rpx; border: 1rpx solid #ddd; border-radius: 10rpx; font-size: 26rpx; color: #666; }
.weekday-item.checked { border-color: #667eea; color: #667eea; background: #f0f2ff; }
.weekday-checkbox { transform: scale(0.7); }
.bottom-action { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 30rpx; background: #fff; box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.1); }
.btn-save { width: 100%; height: 90rpx; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border: none; border-radius: 45rpx; font-size: 32rpx; font-weight: bold; }
</style>