<template>
  <view class="page-container">
    <PageHeader title="扫码核销" />

    <!-- 扫码区域 -->
    <view class="scan-section">
      <view class="scan-box" @click="startScan">
        <view class="scan-icon">📷</view>
        <text class="scan-text">点击扫码</text>
        <text class="scan-hint">扫描用户到场二维码（格式 activity:{activityId}:{userId}）</text>
      </view>
    </view>

    <!-- 手动输入用户ID核销（兜底） -->
    <view class="manual-section">
      <view class="section-title">手动输入用户ID核销</view>
      <view class="input-row">
        <input class="code-input" v-model="userId" type="number" placeholder="请输入用户ID" @confirm="handleScanCheckin" />
        <view class="verify-btn" @click="handleScanCheckin">
          <text>核销</text>
        </view>
      </view>
    </view>

    <!-- 核销结果 -->
    <view v-if="result" class="result-section" :class="resultType">
      <view class="result-icon">{{ resultIcon }}</view>
      <view class="result-title">{{ result.title }}</view>
      <view class="result-desc">{{ result.desc }}</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import jzH5ScanCode from 'jz-h5-scancode'
import { scanCheckin } from '../../api/activity.js'
import PageHeader from '../../components/PageHeader.vue'

const activityId = ref('')
const userId = ref('')
const result = ref(null) // { type: 'success'|'already'|'nosignup'|'error', title, desc }
const resultType = ref('')
const resultIcon = ref('')

async function startScan() {
  try {
    jzH5ScanCode.scanCode({
      scanType: ['qrCode'],
      onlyFromCamera: false,
      scanFrameColor: '#07c160',
      success: (res) => {
        const text = (res && (res.result || res.text)) || ''
        const parsed = parseScanText(text)
        if (!parsed) {
          setResult('error', '❌', '无效二维码', '二维码格式不正确，应为 activity:{活动ID}:{用户ID}')
          return
        }
        userId.value = parsed.userId
        handleScanCheckin()
      },
      fail: (res) => {
        uni.showToast({ title: (res && res.errMsg) || '扫码失败', icon: 'none' })
      }
    })
  } catch (e) {
    uni.showToast({ title: '当前环境不支持扫码，请使用手动输入核销', icon: 'none' })
  }
}

// 解析二维码文本 activity:{activityId}:{userId}，返回 userId
function parseScanText(text) {
  if (!text) return null
  const m = String(text).match(/^activity:([^:]+):([^:]+)/)
  if (!m) return null
  const uid = Number(m[2])
  if (!Number.isFinite(uid)) return null
  return { activityId: m[1], userId: uid }
}

async function handleScanCheckin() {
  if (!activityId.value) return uni.showToast({ title: '缺少活动ID', icon: 'none' })
  if (!userId.value) return uni.showToast({ title: '请输入用户ID', icon: 'none' })

  uni.showLoading({ title: '核销中...' })
  try {
    const res = await scanCheckin(activityId.value, { userId: Number(userId.value) })
    uni.hideLoading()
    if (res && res.ok) {
      setResult('success', '✅', '核销成功', '已确认用户到场')
    } else if (res && res.reason === 'already_checked_in') {
      setResult('already', '⚠️', '已签到', '该用户此前已完成核销到场，无需重复签到')
    } else {
      setResult('nosignup', '⚠️', '核销异常', (res && (res.error || res.message)) || '重复签到或状态异常')
    }
  } catch (e) {
    uni.hideLoading()
    // 未报名返回 400，错误信息为「尚未报名」
    const msg = (e && (e.message || e.error)) || '核销失败'
    if (String(msg).includes('尚未报名')) {
      setResult('nosignup', '🚫', '未报名', '该用户尚未报名此活动')
    } else {
      setResult('error', '❌', '核销失败', msg)
    }
  }
}

function setResult(type, icon, title, desc) {
  resultType.value = type
  resultIcon.value = icon
  result.value = { title, desc }
}

onLoad((options) => {
  if (options.id) activityId.value = options.id
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.scan-section { margin-bottom: 30rpx; }
.scan-box {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx; padding: 60rpx;
  display: flex; flex-direction: column; align-items: center; cursor: pointer;
}
.scan-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.scan-text { font-size: 36rpx; font-weight: bold; color: #fff; }
.scan-hint { font-size: 22rpx; color: rgba(255,255,255,0.8); margin-top: 10rpx; text-align: center; }

.manual-section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 30rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; }
.input-row { display: flex; gap: 16rpx; align-items: center; }
.code-input { flex: 1; height: 76rpx; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; font-size: 30rpx; box-sizing: border-box; }
.verify-btn { padding: 0 40rpx; height: 76rpx; line-height: 76rpx; background: #07c160; color: #fff; border-radius: 8rpx; font-size: 30rpx; font-weight: bold; white-space: nowrap; }

.result-section { background: #fff; border-radius: 12rpx; padding: 40rpx; display: flex; flex-direction: column; align-items: center; }
.result-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.result-title { font-size: 34rpx; font-weight: bold; color: #333; margin-bottom: 10rpx; }
.result-desc { font-size: 26rpx; color: #999; text-align: center; }
</style>