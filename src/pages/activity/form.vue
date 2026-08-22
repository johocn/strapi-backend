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
          <text class="form-label">活动分类</text>
          <input type="text" v-model="form.category" placeholder="活动分类（如 讲座/沙龙/工作坊/其他）" class="form-input" />
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

        <view class="form-item">
          <text class="form-label">计费模式</text>
          <picker mode="selector" :range="pricingModeLabels" @change="handlePricingModeChange">
            <view class="picker-value">
              <text>{{ pricingModeLabels[pricingModeIndex] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <view v-if="form.pricingMode === 'flat'" class="form-item">
          <text class="form-label">积分价</text>
          <input type="number" v-model="form.pointsCost" placeholder="0=免费" class="form-input" />
        </view>

        <view v-if="form.pricingMode === 'tier'" class="form-item">
          <text class="form-label">费用档位</text>
          <view v-for="(tier, ti) in form.feeTiers" :key="ti" class="fee-block">
            <view class="fee-block-header">
              <text class="fee-block-title">第 {{ ti + 1 }} 档</text>
              <button class="btn-link-danger" @click="removeTier(ti)">删除</button>
            </view>

            <view class="form-item fee-field">
              <text class="form-label">档名</text>
              <input type="text" v-model="tier.name" placeholder="如：早鸟 / 正价" class="form-input" />
            </view>

            <view class="form-row">
              <view class="form-item half">
                <text class="form-label">顺序</text>
                <input type="number" v-model="tier.order" placeholder="数字越小越靠前" class="form-input" />
              </view>
              <view class="form-item half">
                <text class="form-label">用户类型</text>
                <input type="text" v-model="tier.userType" placeholder="all|partner|segment:S" class="form-input" />
              </view>
            </view>

            <view class="form-row">
              <view class="form-item half">
                <text class="form-label">窗口开始</text>
                <picker mode="date" :value="tier.window.start" @change="e => tier.window.start = e.detail.value">
                  <view class="picker-value">
                    <text>{{ tier.window.start || '请选择' }}</text>
                    <text class="picker-arrow">▼</text>
                  </view>
                </picker>
              </view>
              <view class="form-item half">
                <text class="form-label">窗口结束</text>
                <picker mode="date" :value="tier.window.end" @change="e => tier.window.end = e.detail.value">
                  <view class="picker-value">
                    <text>{{ tier.window.end || '请选择' }}</text>
                    <text class="picker-arrow">▼</text>
                  </view>
                </picker>
              </view>
            </view>

            <view class="form-row">
              <view class="form-item half">
                <text class="form-label">配额（名额）</text>
                <input type="number" v-model="tier['fee-quota']" placeholder="留空不限制" class="form-input" />
              </view>
              <view class="form-item half">
                <text class="form-label">积分价</text>
                <input type="number" v-model="tier.pointsCost" placeholder="0=免费" class="form-input" />
              </view>
            </view>

            <view class="form-item fee-field">
              <text class="form-label">扣费点</text>
              <picker mode="selector" :range="feeLabels" @change="handleTierFeeChange(ti, $event)">
                <view class="picker-value">
                  <text>{{ tierFeeLabel(tier) }}</text>
                  <text class="picker-arrow">▼</text>
                </view>
              </picker>
            </view>
          </view>
          <button class="btn-add" @click="addTier">添加档位</button>
        </view>

        <view v-if="form.pricingMode === 'factor'" class="form-item">
          <text class="form-label">基础积分</text>
          <input type="number" v-model="form.feeFactors.base" placeholder="0=免费" class="form-input" />
        </view>

        <view v-if="form.pricingMode === 'factor'" class="form-item">
          <text class="form-label">计费因子</text>
          <view v-for="(f, fi) in form.feeFactors.factors" :key="fi" class="fee-block">
            <view class="fee-block-header">
              <text class="fee-block-title">因子 {{ fi + 1 }}</text>
              <button class="btn-link-danger" @click="removeFactor(fi)">删除</button>
            </view>

            <view class="form-item fee-field">
              <text class="form-label">类型</text>
              <picker mode="selector" :range="factorTypeLabels" @change="handleFactorTypeChange(fi, $event)">
                <view class="picker-value">
                  <text>{{ factorTypeLabel(f.type) }}</text>
                  <text class="picker-arrow">▼</text>
                </view>
              </picker>
            </view>

            <view v-if="isWindowFactor(f.type)" class="form-row">
              <view class="form-item half">
                <text class="form-label">生效至</text>
                <picker mode="date" :value="f.until" @change="e => f.until = e.detail.value">
                  <view class="picker-value">
                    <text>{{ f.until || '请选择' }}</text>
                    <text class="picker-arrow">▼</text>
                  </view>
                </picker>
              </view>
              <view class="form-item half">
                <text class="form-label">生效自</text>
                <picker mode="date" :value="f.from" @change="e => f.from = e.detail.value">
                  <view class="picker-value">
                    <text>{{ f.from || '请选择' }}</text>
                    <text class="picker-arrow">▼</text>
                  </view>
                </picker>
              </view>
            </view>

            <view v-if="isWindowFactor(f.type) || f.type === 'flat_discount_amount'" class="form-item fee-field">
              <text class="form-label">金额</text>
              <input type="number" v-model="f.amount" placeholder="0=不设置" class="form-input" />
            </view>

            <view v-if="f.type === 'segment_discount_percent'" class="form-row">
              <view class="form-item half">
                <text class="form-label">最小分段</text>
                <input type="text" v-model="f.minSegment" placeholder="如 segment:A" class="form-input" />
              </view>
              <view class="form-item half">
                <text class="form-label">折扣百分比</text>
                <input type="number" v-model="f.percent" placeholder="如 80" class="form-input" />
              </view>
            </view>
          </view>
          <button class="btn-add" @click="addFactor">添加因子</button>
        </view>

        <view class="form-item">
          <text class="form-label">计费点</text>
          <picker mode="selector" :range="feeLabels" @change="handleFeeChange">
            <view class="picker-value">
              <text>{{ feeLabels[feeIndex] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
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

        <view class="form-item">
          <text class="form-label">分享奖励积分（下线报名给分享者的积分）</text>
          <input type="number" v-model="form.shareRewardPoints" placeholder="0=不奖励" class="form-input" />
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">报名表单配置</view>
        <view class="form-tip">报名时收集的字段（不配置则报名只填基础信息）</view>
        <view v-for="(f, fi) in form.formConfig" :key="fi" class="fee-block">
          <view class="fee-block-header">
            <text class="fee-block-title">字段 {{ fi + 1 }}</text>
            <button class="btn-link-danger" @click="removeFormField(fi)">删除</button>
          </view>
          <view class="form-row">
            <view class="form-item half">
              <text class="form-label">key</text>
              <input type="text" v-model="f.key" placeholder="如 name" class="form-input" />
            </view>
            <view class="form-item half">
              <text class="form-label">标签</text>
              <input type="text" v-model="f.label" placeholder="如 姓名" class="form-input" />
            </view>
          </view>
          <view class="form-row">
            <view class="form-item half">
              <text class="form-label">类型</text>
              <picker mode="selector" :range="formTypeLabels" @change="handleFormTypeChange(fi, $event)">
                <view class="picker-value">
                  <text>{{ formTypeLabel(f.type) }}</text>
                  <text class="picker-arrow">▼</text>
                </view>
              </picker>
            </view>
            <view class="form-item half">
              <text class="form-label">必填</text>
              <view class="radio-row">
                <text :class="['radio-opt', { on: f.required }]" @click="f.required = true">是</text>
                <text :class="['radio-opt', { on: !f.required }]" @click="f.required = false">否</text>
              </view>
            </view>
          </view>
          <view v-if="f.type === 'number'" class="form-row">
            <view class="form-item half">
              <text class="form-label">最小值</text>
              <input type="number" v-model="f.min" class="form-input" />
            </view>
            <view class="form-item half">
              <text class="form-label">最大值</text>
              <input type="number" v-model="f.max" class="form-input" />
            </view>
          </view>
          <view v-if="f.type === 'radio' || f.type === 'select' || f.type === 'multi'" class="form-item fee-field">
            <text class="form-label">选项</text>
            <view v-for="(o, oi) in f.options" :key="oi" class="opt-row">
              <input type="text" v-model="f.options[oi]" placeholder="选项内容" class="form-input" />
              <text class="opt-del" @click="removeFormOption(fi, oi)">✕</text>
            </view>
            <button class="btn-add" @click="addFormOption(fi)">添加选项</button>
          </view>
        </view>
        <button class="btn-add" @click="addFormField">添加字段</button>
      </view>

      <view class="form-section">
        <view class="section-title">资源排期</view>
        <view class="form-tip">选择讲师/场地后，保存时将自动检测时间是否冲突（含缓冲时间）</view>

        <view class="form-item">
          <text class="form-label">讲师</text>
          <picker mode="selector" :range="lecturerNames" @change="handleLecturerChange">
            <view class="picker-value">
              <text :class="['picker-placeholder', { empty: !lecturerId }]">{{ currentLecturerName || '不选择讲师' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">场地</text>
          <picker mode="selector" :range="venueNames" @change="handleVenueChange">
            <view class="picker-value">
              <text :class="['picker-placeholder', { empty: !venueId }]">{{ currentVenueName || '不选择场地' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
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
import { listLecturers, listVenues, checkSchedule } from '../../api/resource.js'
import PageHeader from '../../components/PageHeader.vue'

const isEdit = ref(false)
const activityId = ref('')

const seriesList = ref([])
const seriesNames = computed(() => ['不归属系列', ...seriesList.value.map(s => s.title || '未命名系列')])
const seriesIndex = ref(0)

const form = reactive({
  title: '',
  category: '',
  tags: [],
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
  pointsCost: 0,
  feeCollectAt: 'signup',
  pricingMode: 'flat',
  feeTiers: [],
  feeFactors: { base: 0, factors: [] },
  checkinMode: 'both',
  geoEnforced: false,
  geoRadiusM: 500,
  shareRewardPoints: 0,
  status: 'draft',
  formConfig: []
})

// 讲师/场地资源选择
const lecturerList = ref([])
const venueList = ref([])
const lecturerId = ref('')
const venueId = ref('')

const lecturerNames = computed(() => ['不选择讲师', ...lecturerList.value.map(r => (r.disabled ? '（已停用）' : '') + (r.name || `讲师#${r.id}`))])
const venueNames = computed(() => ['不选择场地', ...venueList.value.map(r => (r.disabled ? '（已停用）' : '') + (r.name || `场地#${r.id}`))])

const currentLecturerName = computed(() => {
  if (!lecturerId.value) return ''
  const idx = lecturerList.value.findIndex(r => String(r.id) === String(lecturerId.value))
  return idx >= 0 ? (lecturerList.value[idx].name || `讲师#${lecturerId.value}`) : ''
})
const currentVenueName = computed(() => {
  if (!venueId.value) return ''
  const idx = venueList.value.findIndex(r => String(r.id) === String(venueId.value))
  return idx >= 0 ? (venueList.value[idx].name || `场地#${venueId.value}`) : ''
})

function handleLecturerChange(e) {
  const idx = Number(e.detail.value)
  lecturerId.value = idx === 0 ? '' : String(lecturerList.value[idx - 1].id)
}
function handleVenueChange(e) {
  const idx = Number(e.detail.value)
  venueId.value = idx === 0 ? '' : String(venueList.value[idx - 1].id)
}

async function loadResources() {
  try {
    const [l, v] = await Promise.all([
      listLecturers({ page: 1, pageSize: 500, includeDisabled: 'true' }),
      listVenues({ page: 1, pageSize: 500, includeDisabled: 'true' })
    ])
    lecturerList.value = l.list || []
    venueList.value = v.list || []
  } catch (e) {
    lecturerList.value = []
    venueList.value = []
  }
}

const checkinModeValues = ['both', 'self', 'worker_scan']
const checkinModeLabels = ['双方自由核销', '自助核销', '工作人员扫码']
const checkinModeIndex = ref(0)

const statusValues = ['draft', 'signup_open', 'ongoing', 'ended']
const statusOptions = ['草稿', '报名中', '进行中', '已结束']
const statusIndex = ref(0)

const feeValues = ['signup', 'checkin']
const feeLabels = ['报名时扣费', '签到时收费']
const feeIndex = ref(0)

const pricingModeValues = ['flat', 'tier', 'factor']
const pricingModeLabels = ['单一价', '档位列表', '因子叠加']
const pricingModeIndex = ref(0)

const formTypeValues = ['text', 'phone', 'textarea', 'radio', 'select', 'multi', 'number']
const formTypeLabels = ['文本', '手机号', '多行文本', '单选', '下拉', '多选', '数字']

const factorTypeValues = ['window_discount', 'window_upcharge', 'segment_discount_percent', 'flat_discount_amount']
const factorTypeLabels = ['窗口折扣', '窗口加价', '分段折扣百分比', '固定折扣额']
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

// 冲突/建议时段的 {"start"|"conflictStart", "end"|"conflictEnd"} 或 {startTime,endTime} → "MM-DD HH:mm ~ HH:mm"
function fmtRange(obj) {
  if (!obj) return ''
  const s = obj.startTime || obj.start || obj.conflictStart
  const e = obj.endTime || obj.end || obj.conflictEnd
  const f = (v) => v ? fmtDate(v) + ' ' + (String(v).slice(11, 16) || '') : ''
  return `${f(s)} ~ ${String(e).slice(11, 16) || ''}`
}

function handleCheckinModeChange(e) {
  checkinModeIndex.value = Number(e.detail.value)
  form.checkinMode = checkinModeValues[checkinModeIndex.value]
}
function handleStatusChange(e) {
  statusIndex.value = Number(e.detail.value)
  form.status = statusValues[statusIndex.value]
}
function handleFeeChange(e) {
  feeIndex.value = Number(e.detail.value)
  form.feeCollectAt = feeValues[feeIndex.value]
}
function handleSeriesChange(e) {
  seriesIndex.value = Number(e.detail.value)
  form.belongsToSeries = seriesIndex.value === 0 ? '' : (seriesList.value[seriesIndex.value - 1]?.documentId || '')
}

function handlePricingModeChange(e) {
  pricingModeIndex.value = Number(e.detail.value)
  form.pricingMode = pricingModeValues[pricingModeIndex.value]
}

function tierFeeLabel(tier) {
  const idx = Math.max(0, feeValues.indexOf(tier.feeCollectAt))
  return feeLabels[idx]
}
function handleTierFeeChange(ti, e) {
  form.feeTiers[ti].feeCollectAt = feeValues[Number(e.detail.value)]
}

function addTier() {
  form.feeTiers.push({
    name: '',
    order: form.feeTiers.length,
    window: { start: '', end: '' },
    'fee-quota': '',
    userType: 'all',
    pointsCost: 0,
    feeCollectAt: 'signup'
  })
}
function removeTier(ti) {
  form.feeTiers.splice(ti, 1)
}

function isWindowFactor(type) {
  return type === 'window_discount' || type === 'window_upcharge'
}
function factorTypeLabel(type) {
  const idx = factorTypeValues.indexOf(type)
  return idx >= 0 ? factorTypeLabels[idx] : ''
}
function handleFactorTypeChange(fi, e) {
  form.feeFactors.factors[fi].type = factorTypeValues[Number(e.detail.value)]
}
function addFactor() {
  form.feeFactors.factors.push({
    type: 'window_discount',
    until: '',
    from: '',
    amount: 0,
    minSegment: '',
    percent: 0
  })
}
function removeFactor(fi) {
  form.feeFactors.factors.splice(fi, 1)
}

function addFormField() {
  form.formConfig.push({ key: '', label: '', type: 'text', required: false, options: [], min: undefined, max: undefined })
}
function removeFormField(fi) {
  form.formConfig.splice(fi, 1)
}
function handleFormTypeChange(fi, e) {
  form.formConfig[fi].type = formTypeValues[Number(e.detail.value)]
}
function addFormOption(fi) {
  form.formConfig[fi].options.push('')
}
function removeFormOption(fi, oi) {
  form.formConfig[fi].options.splice(oi, 1)
}
function formTypeLabel(t) {
  const idx = formTypeValues.indexOf(t)
  return idx >= 0 ? formTypeLabels[idx] : t
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
  feeIndex.value = Math.max(0, feeValues.indexOf(form.feeCollectAt))
  pricingModeIndex.value = Math.max(0, pricingModeValues.indexOf(form.pricingMode))
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
      pointsCost: Number(data.pointsCost || 0),
      feeCollectAt: data.feeCollectAt || 'signup',
      geoEnforced: data.geoEnforced === true,
      geoRadiusM: data.geoRadiusM ?? 500,
      checkinMode: data.checkinMode || 'both',
      status: data.status || 'draft',
      pricingMode: data.pricingMode || 'flat',
      shareRewardPoints: data.shareRewardPoints ?? 0,
      feeTiers: data.feeTiers || [],
      feeFactors: data.feeFactors || { base: 0, factors: [] },
      formConfig: data.formConfig || [],
      category: data.category || '',
      tags: Array.isArray(data.tags) ? data.tags : []
    })
    form.belongsToSeries = data.belongsToSeries || data.series || ''
    // 回显讲师/场地（relation 可能是对象或数组）
    const relId = (r) => {
      if (!r) return ''
      const row = Array.isArray(r) ? r[0] : r
      return row ? String(row.id ?? row.documentId ?? '') : ''
    }
    lecturerId.value = relId(data.lecturer)
    venueId.value = relId(data.venue)
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
    category: form.category || undefined,
    tags: Array.isArray(form.tags) && form.tags.length ? form.tags : undefined,
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
    pointsCost: Number(form.pointsCost) || 0,
    shareRewardPoints: Number(form.shareRewardPoints) || 0,
    feeCollectAt: form.feeCollectAt,
    pricingMode: form.pricingMode,
    feeTiers: form.feeTiers,
    feeFactors: form.feeFactors,
    formConfig: form.formConfig,
    status: form.status
  }
  // 清理空 datetime，避免后端校验空字符串
  for (const k of ['startTime', 'endTime', 'signupStart', 'signupEnd']) {
    if (!submitData[k]) delete submitData[k]
  }

  // ---- 资源排期冲突预检 ----
  if (lecturerId.value) submitData.lecturer = Number(lecturerId.value)
  if (venueId.value) submitData.venue = Number(venueId.value)

  const hasRes = Boolean(submitData.lecturer || submitData.venue)
  const hasTime = Boolean(submitData.startTime && submitData.endTime)
  if (hasRes && hasTime) {
    try {
      const chk = await checkSchedule({
        startTime: submitData.startTime,
        endTime: submitData.endTime,
        excludeActivityId: isEdit.value ? activityId.value : undefined,
        ...(submitData.lecturer ? { lecturerId: submitData.lecturer } : {}),
        ...(submitData.venue ? { venueId: submitData.venue } : {})
      })
      if (chk && chk.ok === false && chk.conflicts?.length) {
        const c = chk.conflicts[0]
        const resLabel = c.resourceType === 'venue' ? '场地' : '讲师'
        const msg = `排期冲突：${resLabel}「${c.resourceName || c.resourceId}」在 ${fmtRange(c)} 与活动「${c.conflictActivityTitle || c.conflictActivityId}」重叠。`
        if (chk.suggestions?.length) {
          const cands = chk.suggestions[0]?.candidates || []
          const better = cands.slice(0, 2).map(s => fmtRange(s)).join('；')
          uni.showModal({ title: '排期冲突', content: msg + (better ? `\n建议时段：${better}` : ''), showCancel: false })
        } else {
          uni.showToast({ title: msg, icon: 'none', duration: 3000 })
        }
        return
      }
    } catch (e) {
      // 预检失败不阻断保存（后端仍会校验）
    }
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
onMounted(() => { loadDetail(); loadSeries(); loadResources() })
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
.btn-save { width: 100%; height: 90rpx; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border: none; border-radius: 45rpx; font-size: 32rpx; font-weight: bold; }
.bottom-action { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 30rpx; background: #fff; box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.1); }
.fee-block { border: 1rpx solid #eee; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; background: #fafbfe; }
.fee-block-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.fee-block-title { font-size: 28rpx; font-weight: bold; color: #333; }
.fee-field { margin-top: 20rpx; }
.btn-add { width: 100%; height: 76rpx; border: 1rpx dashed #667eea; color: #667eea; background: transparent; border-radius: 12rpx; font-size: 28rpx; }
.btn-link-danger { background: transparent; color: #ff4d4f; border: none; font-size: 26rpx; padding: 0; line-height: 1; }
.form-tip { font-size: 24rpx; color: #999; margin: -8rpx 0 20rpx; }
.radio-row { display: flex; gap: 24rpx; align-items: center; }
.radio-opt { font-size: 26rpx; color: #999; padding: 6rpx 24rpx; border: 1rpx solid #ddd; border-radius: 20rpx; }
.radio-opt.on { color: #667eea; border-color: #667eea; background: rgba(102,126,234,.08); }
.opt-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.opt-del { color: #ff4d4f; padding: 0 8rpx; font-size: 28rpx; }
</style>