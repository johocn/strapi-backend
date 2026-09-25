<template>
  <view class="page-container">
    <PageHeader title="扫码核销" />

    <!-- 扫码区域 -->
    <view class="scan-section">
      <view class="scan-box" @click="startScan">
        <view class="scan-icon">📷</view>
        <text class="scan-text">点击扫码</text>
        <text class="scan-hint">扫描用户到场二维码（服务端签发票据）</text>
      </view>
    </view>

    <!-- 手动输入用户ID核销（兜底，必须填理由，留审计） -->
    <view class="manual-section">
      <view class="section-title">手动输入用户ID核销（需填理由）</view>
      <view class="input-row">
        <input class="code-input" v-model="userId" type="number" placeholder="请输入用户ID" />
      </view>
      <view class="input-row reason-row">
        <input class="code-input" v-model="reason" placeholder="核销理由（如：用户手机没电，出示身份证）" />
      </view>
      <view class="verify-btn full" @click="handleManualCheckin">
        <text>核销</text>
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

let activityId = ref('')
const userId = ref('')
const reason = ref('')
const scannedCode = ref('')
const result = ref(null) // { type: 'success'|'already'|'nosignup'|'error', title, desc }
const resultType = ref('')
const resultIcon = ref('')

// 预加载本地 jsQR 库（jz-h5-scancode 检测到 window.jsQR 存在则不再请求缺失的本地/CDN 资源）
function ensureJsQR() {
  return new Promise((resolve) => {
    if (window.jsQR) return resolve()
    const script = document.createElement('script')
    script.src = '/static/jsQR.js'
    script.onload = () => resolve()
    script.onerror = () => resolve() // 加载失败不阻塞，插件有备用解码器
    document.head.appendChild(script)
  })
}
onLoad((opts) => {
  ensureJsQR()
  if (opts && opts.id) activityId.value = opts.id
})

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
          setResult('error', '❌', '无效二维码', '二维码格式不正确，请让用户刷新出示新码')
          return
        }
        if (parsed.kind === 'legacy') {
          setResult('error', '❌', '旧版二维码已停用', '请让用户刷新页面后重新出示二维码')
          return
        }
        scannedCode.value = parsed.code
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

// 解析二维码文本：只认 atk:{48位hex}；旧版明文码单独识别以便给出明确文案
function parseScanText(text) {
  const s = String(text || '').trim()
  if (/^atk:[0-9a-f]{48}$/.test(s)) return { kind: 'ticket', code: s }
  if (/^activity:[^:]+:[^:]+$/.test(s)) return { kind: 'legacy' }
  return null
}

async function handleScanCheckin() {
  if (!activityId.value) return uni.showToast({ title: '缺少活动ID', icon: 'none' })
  if (!scannedCode.value) return uni.showToast({ title: '请先扫码', icon: 'none' })

  uni.showLoading({ title: '核销中...' })
  try {
    const res = await scanCheckin(activityId.value, { code: scannedCode.value })
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
    const msg = (e && (e.message || e.error)) || '核销失败'
    if (String(msg).includes('尚未报名')) {
      setResult('nosignup', '🚫', '未报名', '该用户尚未报名此活动')
    } else if (String(msg).includes('过期')) {
      setResult('expired', '⌛', '二维码已过期', '请让用户刷新页面后重新出示二维码')
    } else if (String(msg).includes('旧版二维码')) {
      setResult('error', '❌', '旧版二维码已停用', '请让用户刷新页面后重新出示二维码')
    } else {
      setResult('error', '❌', '核销失败', msg)
    }
  }
}

// 手动核销：强制理由
async function handleManualCheckin() {
  if (!activityId.value) return uni.showToast({ title: '缺少活动ID', icon: 'none' })
  if (!userId.value) return uni.showToast({ title: '请输入用户ID', icon: 'none' })
  if (String(reason.value || '').trim().length < 2) {
    return uni.showToast({ title: '请填写手动核销理由', icon: 'none' })
  }
  uni.showLoading({ title: '核销中...' })
  try {
    const res = await scanCheckin(activityId.value, { userId: Number(userId.value), reason: String(reason.value).trim() })
    uni.hideLoading()
    if (res && res.ok) {
      setResult('success', '✅', '核销成功', '已确认用户到场（手动核销，已留痕）')
    } else if (res && res.reason === 'already_checked_in') {
      setResult('already', '⚠️', '已签到', '该用户此前已完成核销到场，无需重复签到')
    } else {
      setResult('nosignup', '⚠️', '核销异常', (res && (res.error || res.message)) || '重复签到或状态异常')
    }
  } catch (e) {
    uni.hideLoading()
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
.reason-row { margin-top: 16rpx; }
.verify-btn.full { width: 100%; margin-top: 16rpx; text-align: center; box-sizing: border-box; }
.code-input { flex: 1; height: 76rpx; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; font-size: 30rpx; box-sizing: border-box; }
.verify-btn { padding: 0 40rpx; height: 76rpx; line-height: 76rpx; background: #07c160; color: #fff; border-radius: 8rpx; font-size: 30rpx; font-weight: bold; white-space: nowrap; }

.result-section { background: #fff; border-radius: 12rpx; padding: 40rpx; display: flex; flex-direction: column; align-items: center; }
.result-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.result-title { font-size: 34rpx; font-weight: bold; color: #333; margin-bottom: 10rpx; }
.result-desc { font-size: 26rpx; color: #999; text-align: center; }
</style>