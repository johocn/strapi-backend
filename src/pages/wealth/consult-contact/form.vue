<template>
  <view class="form-container">
    <PageHeader title="服务人配置" desc="选择邀请人并维护网点/城市/联系方式" />

    <view class="form-group">
      <text class="form-label">服务人（邀请人）<text class="req">*</text></text>
      <view class="user-picker" @click="focusSearch = true">
        <input v-model="userKeyword" class="form-input" placeholder="搜索用户名/手机号/邮箱" @input="searchUsers" @focus="focusSearch = true" />
      </view>
      <view v-if="focusSearch && userOptions.length" class="user-dropdown">
        <view v-for="u in userOptions" :key="u.id" class="user-row" :class="{ active: selectedUser && selectedUser.id === u.id }" @click="pickUser(u)">
          {{ u.username || u.mobile || u.email || ('#' + u.id) }}（#{{ u.id }}）
        </view>
      </view>
      <view v-if="selectedUser" class="user-picked">已选: {{ selectedUser.username || selectedUser.mobile || selectedUser.email || ('#' + selectedUser.id) }}（#{{ selectedUser.id }}）</view>
    </view>

    <view class="form-group">
      <text class="form-label">服务人昵称</text>
      <input class="form-input" v-model="form.nickname" placeholder="如：王经理" />
    </view>
    <view class="form-group">
      <text class="form-label">网点名称</text>
      <input class="form-input" v-model="form.branchName" placeholder="如：青岛银行市南支行" />
    </view>
    <view class="form-group">
      <text class="form-label">网点电话（可多个，回车分隔）</text>
      <textarea class="form-input" v-model="phonesText" placeholder="0532-88886666&#10;13800000000" />
    </view>
    <view class="form-group">
      <text class="form-label">城市</text>
      <input class="form-input" v-model="form.city" placeholder="如：青岛" />
    </view>
    <view class="form-group">
      <text class="form-label">网点位置（点击地图选点，自动填充经纬度）</text>
      <view id="consult-map" class="map-container"></view>
      <text v-if="!mapReady" class="map-tip">地图加载中…</text>
      <text v-else class="map-tip">点击地图标记网点位置，经纬度自动回填，城市可自动识别</text>
    </view>
    <view class="form-row">
      <view class="form-group half">
        <text class="form-label">纬度（同城就近排序用）</text>
        <input class="form-input" type="digit" v-model="form.latitude" placeholder="如：36.067" />
      </view>
      <view class="form-group half">
        <text class="form-label">经度</text>
        <input class="form-input" type="digit" v-model="form.longitude" placeholder="如：120.383" />
      </view>
    </view>

    <view class="form-group">
      <text class="form-label">企业微信二维码</text>
      <image v-if="form.enterpriseWechatQr" class="qr-preview" :src="form.enterpriseWechatQr" mode="aspectFit" @click="openPicker('enterprise')" />
      <view v-else class="qr-upload" @click="openPicker('enterprise')">选择企业微信二维码</view>
      <input class="form-input" v-model="form.enterpriseWechatId" placeholder="企业微信号（选填）" style="margin-top: 12rpx;" />
    </view>

    <view class="form-group">
      <text class="form-label">个人微信二维码</text>
      <image v-if="form.personalWechatQr" class="qr-preview" :src="form.personalWechatQr" mode="aspectFit" @click="openPicker('personal')" />
      <view v-else class="qr-upload" @click="openPicker('personal')">选择个人微信二维码</view>
      <input class="form-input" v-model="form.personalWechatId" placeholder="个人微信号（选填）" style="margin-top: 12rpx;" />
    </view>

    <button class="submit-btn" @click="save">保存</button>

    <MediaPicker v-model:visible="showPicker" :folder="'/wealth/consult-contacts'" :accept="'image/*'" @select="onQrSelect" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onReady, onUnload } from '@dcloudio/uni-app'
import { getConsultContactList, createConsultContact, updateConsultContact } from '../../../api/wealth.js'
import { getSsoUserOptions } from '../../../api/sso.js'
import PageHeader from '../../../components/PageHeader.vue'
import MediaPicker from '../../../components/MediaPicker.vue'

const TENCENT_MAP_KEY = 'HUSBZ-P7VEV-M3OPP-5OYDB-U6UDS-WCBIJ'

const id = ref(null)
const form = ref({
  inviterId: null, nickname: '', branchName: '', city: '',
  latitude: '', longitude: '',
  enterpriseWechatQr: '', enterpriseWechatId: '',
  personalWechatQr: '', personalWechatId: '',
})
const phonesText = ref('')

const userOptions = ref([])
const userKeyword = ref('')
const focusSearch = ref(false)
const selectedUser = ref(null)

const showPicker = ref(false)
const pickerField = ref('enterprise')

const mapReady = ref(false)
let map = null
let marker = null

onLoad(async (query) => {
  if (query.id) {
    id.value = Number(query.id)
    const res = await getConsultContactList({ page: 1, pageSize: 100 })
    const item = (res.list || []).find((x) => x.id === id.value)
    if (item) {
      form.value = {
        inviterId: item.inviterId,
        nickname: item.nickname || '',
        branchName: item.branchName || '',
        city: item.city || '',
        latitude: item.latitude ?? '',
        longitude: item.longitude ?? '',
        enterpriseWechatQr: item.enterpriseWechatQr?.url || '',
        enterpriseWechatId: item.enterpriseWechatId || '',
        personalWechatQr: item.personalWechatQr?.url || '',
        personalWechatId: item.personalWechatId || '',
      }
      phonesText.value = (Array.isArray(item.branchPhones) ? item.branchPhones : []).join('\n')
      selectedUser.value = { id: item.inviterId }
    }
  }
})

onReady(() => initMap())
onUnload(() => { map = null; marker = null })

function initMap() {
  const el = document.getElementById('consult-map')
  if (!el) return
  if (window.TMap) { setupMap(el); return }
  if (document.getElementById('qqmap-gl-sdk')) return
  const s = document.createElement('script')
  s.id = 'qqmap-gl-sdk'
  s.src = `https://map.qq.com/api/gljs?v=1.exp&libraries=service&key=${TENCENT_MAP_KEY}`
  s.onload = () => setupMap(el)
  s.onerror = () => uni.showToast({ title: '地图加载失败，请检查网络或域名白名单', icon: 'none' })
  document.head.appendChild(s)
}

function setupMap(el) {
  const lat = Number(form.value.latitude) || 36.0671
  const lng = Number(form.value.longitude) || 120.3826
  map = new TMap.Map(el, { center: new TMap.LatLng(lat, lng), zoom: 13 })
  if (form.value.latitude && form.value.longitude) placeMarker(lat, lng)
  map.on('click', (e) => {
    const lat = e.latLng.getLat()
    const lng = e.latLng.getLng()
    placeMarker(lat, lng)
    form.value.latitude = lat.toFixed(6)
    form.value.longitude = lng.toFixed(6)
    reverseGeocode(lat, lng)
  })
  mapReady.value = true
}

function placeMarker(lat, lng) {
  const geometry = { id: 'loc', position: new TMap.LatLng(lat, lng) }
  if (marker) marker.setGeometries([geometry])
  else marker = new TMap.MultiMarker({ map, geometries: [geometry] })
}

function reverseGeocode(lat, lng) {
  if (!window.TMap || !TMap.service || !TMap.service.Geocoder) return
  const geocoder = new TMap.service.Geocoder()
  geocoder
    .getAddress({ location: { lat, lng } })
    .then((res) => {
      const ac = (res && res.result && (res.result.address_components || res.result.address_component)) || {}
      const city = ac.city || ac.province || ''
      if (city) form.value.city = city
    })
    .catch(() => {})
}

async function searchUsers() {
  const kw = (userKeyword.value || '').trim()
  if (!kw) { userOptions.value = []; return }
  try {
    const { list } = await getSsoUserOptions({ search: kw, pageSize: 20 })
    userOptions.value = list || []
  } catch (e) {
    userOptions.value = []
  }
}

function pickUser(u) {
  selectedUser.value = u
  form.value.inviterId = u.id
  userKeyword.value = u.username || u.mobile || u.email || ('#' + u.id)
  userOptions.value = []
  focusSearch.value = false
}

function openPicker(field) {
  pickerField.value = field
  showPicker.value = true
}

function onQrSelect(media) {
  const isEnterprise = pickerField.value === 'enterprise'
  form.value[isEnterprise ? 'enterpriseWechatQr' : 'personalWechatQr'] = media.url
  form.value[`${isEnterprise ? 'enterprise' : 'personal'}WechatIdTmp`] = media.id
}

async function save() {
  if (!form.value.inviterId) { uni.showToast({ title: '请选择服务人', icon: 'none' }); return }
  const payload = {
    inviterId: form.value.inviterId,
    nickname: form.value.nickname || null,
    branchName: form.value.branchName || null,
    city: form.value.city || null,
    latitude: form.value.latitude === '' ? null : Number(form.value.latitude),
    longitude: form.value.longitude === '' ? null : Number(form.value.longitude),
    branchPhones: phonesText.value.split('\n').map((s) => s.trim()).filter(Boolean),
    enterpriseWechatId: form.value.enterpriseWechatId || null,
    personalWechatId: form.value.personalWechatId || null,
  }
  if (form.value.enterpriseWechatQrTmp) payload.enterpriseWechatQr = form.value.enterpriseWechatQrTmp
  if (form.value.personalWechatQrTmp) payload.personalWechatQr = form.value.personalWechatQrTmp
  try {
    if (id.value) { await updateConsultContact(id.value, payload) }
    else { await createConsultContact(payload) }
    uni.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 800)
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
}
</script>

<style scoped>
.form-container { padding: 24rpx; }
.form-group { margin-bottom: 28rpx; }
.form-row { display: flex; gap: 20rpx; }
.form-group.half { flex: 1; }
.form-label { display: block; font-size: 26rpx; color: #333; margin-bottom: 12rpx; }
.req { color: #e64340; }
.form-input { border: 1rpx solid #ddd; border-radius: 8rpx; padding: 14rpx 16rpx; font-size: 28rpx; min-height: 44rpx; width: 100%; box-sizing: border-box; }
.user-picker { position: relative; }
.user-dropdown { border: 1rpx solid #ddd; border-radius: 8rpx; margin-top: 8rpx; max-height: 400rpx; overflow-y: auto; background: #fff; z-index: 10; position: relative; }
.user-row { padding: 14rpx 16rpx; font-size: 26rpx; color: #333; border-bottom: 1rpx solid #f0f0f0; }
.user-row.active { color: #2b6de8; }
.user-picked { margin-top: 8rpx; font-size: 24rpx; color: #2b6de8; }
.qr-preview { width: 240rpx; height: 240rpx; border-radius: 8rpx; }
.qr-upload { width: 240rpx; height: 240rpx; border: 1rpx dashed #bbb; border-radius: 8rpx; display: flex; align-items: center; justify-content: center; color: #999; font-size: 26rpx; text-align: center; padding: 0 20rpx; box-sizing: border-box; }
.map-container { width: 100%; height: 520rpx; border-radius: 8rpx; overflow: hidden; border: 1rpx solid #ddd; background: #f5f6f7; }
.map-tip { display: block; margin-top: 8rpx; font-size: 22rpx; color: #999; }
.submit-btn { background: #2b6de8; color: #fff; border-radius: 44rpx; margin-top: 40rpx; }
</style>
