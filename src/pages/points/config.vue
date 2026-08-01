<template>
  <view class="page-container">
    <PageHeader title="积分配置">
      <view class="header-right">
        <button class="btn-primary" @click="handleSave" :disabled="submitting" v-if="hasPermission('menu.point-config')">保存</button>
      </view>
    </PageHeader>

    <view class="form-section">
      <view class="form-card">
        <view class="section-title">基础设置</view>

        <view class="form-item switch-item">
          <text class="form-label">启用积分系统</text>
          <switch :checked="form.moduleEnabled" @change="form.moduleEnabled = $event.detail.value" color="#07c160" />
        </view>

        <view class="form-item">
          <text class="form-label">兑换比率（1积分 = ? 元）</text>
          <input type="digit" v-model="form.defaultExchangeRate" placeholder="0.01" class="form-input" />
        </view>

        <view class="form-item switch-item">
          <text class="form-label">启用兑换功能</text>
          <switch :checked="form.redeemEnabled" @change="form.redeemEnabled = $event.detail.value" color="#07c160" />
        </view>

        <view class="form-item switch-item">
          <text class="form-label">启用任务中心</text>
          <switch :checked="form.tasksEnabled" @change="form.tasksEnabled = $event.detail.value" color="#07c160" />
        </view>
      </view>
    </view>

    <view class="form-section">
      <view class="form-card">
        <view class="section-title">过期设置</view>

        <view class="form-item switch-item">
          <text class="form-label">启用积分过期</text>
          <switch :checked="form.expiryEnabled" @change="form.expiryEnabled = $event.detail.value" color="#07c160" />
        </view>

        <view class="form-item" v-if="form.expiryEnabled">
          <text class="form-label">过期天数</text>
          <input type="number" v-model="form.expiryDays" placeholder="0 表示永不过期" class="form-input" />
        </view>

        <view class="form-item" v-if="form.expiryEnabled">
          <text class="form-label">过期提醒天数</text>
          <input type="number" v-model="form.expiryReminderDays" placeholder="7" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">每日获取上限 (0=不限)</text>
          <input type="number" v-model="form.maxDailyEarn" placeholder="0" class="form-input" />
        </view>
      </view>
    </view>

    <view class="form-section">
      <view class="form-card">
        <view class="section-title">签到设置</view>

        <view class="form-item switch-item">
          <text class="form-label">启用每日签到</text>
          <switch :checked="form.signInEnabled" @change="form.signInEnabled = $event.detail.value" color="#07c160" />
        </view>

        <view class="form-item">
          <text class="form-hint">签到固定积分在"积分规则"中 daily_sign_in 规则配置</text>
        </view>

        <view class="form-item switch-item">
          <text class="form-label">启用连续签到阶梯奖励</text>
          <switch :checked="form.signInStreakEnabled" @change="form.signInStreakEnabled = $event.detail.value" color="#07c160" />
        </view>

        <view class="form-item" v-if="form.signInStreakEnabled">
          <text class="form-label">阶梯里程碑 (天, 逗号分隔)</text>
          <input type="text" v-model="form.streakMilestones" placeholder="7,14,30" class="form-input" />
        </view>

        <view class="form-item" v-if="form.signInStreakEnabled">
          <text class="form-label">对应奖励积分 (逗号分隔)</text>
          <input type="text" v-model="form.streakBonusPoints" placeholder="50,100,200" class="form-input" />
        </view>

        <view class="streak-preview" v-if="form.signInStreakEnabled && form.streakMilestones">
          <text class="form-hint">预览：</text>
          <view v-for="(m, i) in parseStreakMilestones()" :key="i" class="streak-item">
            连续 {{ m }} 天 → +{{ parseStreakBonus()[i] || '?' }} 积分
          </view>
        </view>
      </view>
    </view>

    <view class="form-section">
      <view class="form-card">
        <view class="section-title">答题设置</view>

        <view class="form-item switch-item">
          <text class="form-label">启用答错重试</text>
          <switch :checked="form.quizRetryEnabled" @change="form.quizRetryEnabled = $event.detail.value" color="#07c160" />
        </view>

        <view class="form-item" v-if="form.quizRetryEnabled">
          <text class="form-label">每题最大重试次数</text>
          <input type="number" v-model="form.quizMaxRetryCount" placeholder="1" class="form-input" />
          <text class="form-hint">答错后允许重新选择的次数，超过则本题不得分</text>
        </view>
      </view>
    </view>

    <view class="form-section">
      <view class="form-card">
        <view class="section-title">地图设置</view>

        <view class="form-item">
          <text class="form-label">腾讯地图密钥 (Key)</text>
          <input type="text" v-model="form.tencentMapKey" placeholder="请输入腾讯地图 Key" class="form-input" />
          <text class="form-hint">用于自提点地图选点功能，在腾讯位置服务控制台申请</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getPointsConfig, updatePointsConfig } from '../../api/config.js'
import { useUserStore } from '../../store/user.js'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission
const submitting = ref(false)
const form = ref({
  moduleEnabled: true,
  defaultExchangeRate: '0.01',
  expiryEnabled: false,
  expiryDays: '0',
  expiryReminderDays: '7',
  maxDailyEarn: '0',
  redeemEnabled: true,
  signInEnabled: true,
  signInStreakEnabled: true,
  streakMilestones: '7,14,30',
  streakBonusPoints: '50,100,200',
  tasksEnabled: true,
  quizRetryEnabled: true,
  quizMaxRetryCount: '1',
  tencentMapKey: '',
})

function parseStreakMilestones() {
  return form.value.streakMilestones.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
}
function parseStreakBonus() {
  return form.value.streakBonusPoints.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
}

async function loadConfig() {
  try {
    const res = await getPointsConfig()
    if (res) {
      // 从 daily_sign_in_streak 规则读取阶梯配置
      let streakMilestones = '7,14,30'
      let streakBonusPoints = '50,100,200'
      let signInStreakEnabled = true
      try {
        const { getAdminRuleList } = await import('../../api/points.js')
        const rules = await getAdminRuleList({ action: 'daily_sign_in_streak' })
        const streakRule = Array.isArray(rules) ? rules.find(r => r.action === 'daily_sign_in_streak') : null
        if (streakRule) {
          signInStreakEnabled = streakRule.enabled !== false
          const ec = typeof streakRule.extraConfig === 'string'
            ? JSON.parse(streakRule.extraConfig)
            : streakRule.extraConfig || {}
          if (ec.streakMilestones) streakMilestones = ec.streakMilestones.join(',')
          if (ec.streakBonusPoints) streakBonusPoints = ec.streakBonusPoints.join(',')
        }
      } catch {}

      form.value = {
        moduleEnabled: res.moduleEnabled !== false,
        defaultExchangeRate: String(res.defaultExchangeRate ?? '0.01'),
        expiryEnabled: res.expiryEnabled === true,
        expiryDays: String(res.expiryDays ?? '0'),
        expiryReminderDays: String(res.expiryReminderDays ?? '7'),
        maxDailyEarn: String(res.maxDailyEarn ?? '0'),
        redeemEnabled: res.redeemEnabled !== false,
        signInEnabled: res.signInEnabled !== false,
        signInStreakEnabled,
        streakMilestones,
        streakBonusPoints,
        tasksEnabled: res.tasksEnabled !== false,
        quizRetryEnabled: res.quizRetryEnabled !== false,
        quizMaxRetryCount: String(res.quizMaxRetryCount ?? '1'),
        tencentMapKey: res.tencentMapKey || '',
      }
    }
  } catch (e) {
    // 配置可能不存在，使用默认值
  }
}

async function handleSave() {
  if (submitting.value) return
  submitting.value = true
  try {
    // 保存配置
    const configData = {
      moduleEnabled: form.value.moduleEnabled,
      defaultExchangeRate: (form.value.defaultExchangeRate === '' || form.value.defaultExchangeRate == null) ? 0.01 : Number(form.value.defaultExchangeRate),
      expiryEnabled: form.value.expiryEnabled,
      expiryDays: Number(form.value.expiryDays) || 0,
      expiryReminderDays: Number(form.value.expiryReminderDays) || 7,
      maxDailyEarn: Number(form.value.maxDailyEarn) || 0,
      redeemEnabled: form.value.redeemEnabled,
      signInEnabled: form.value.signInEnabled,
      tasksEnabled: form.value.tasksEnabled,
      quizRetryEnabled: form.value.quizRetryEnabled,
      quizMaxRetryCount: (form.value.quizMaxRetryCount === '' || form.value.quizMaxRetryCount == null) ? 1 : Number(form.value.quizMaxRetryCount),
      tencentMapKey: form.value.tencentMapKey || undefined,
    }
    await updatePointsConfig(configData)

    // 同步更新 daily_sign_in_streak 规则的 extraConfig
    if (form.value.signInStreakEnabled) {
      const { updateRule, getAdminRuleList } = await import('../../api/points.js')
      try {
        const rules = await getAdminRuleList({ action: 'daily_sign_in_streak' })
        const streakRule = Array.isArray(rules) ? rules.find(r => r.action === 'daily_sign_in_streak') : null
        if (streakRule) {
          await updateRule(streakRule.documentId, {
            enabled: true,
            extraConfig: JSON.stringify({
              streakMilestones: parseStreakMilestones(),
              streakBonusPoints: parseStreakBonus(),
            }),
          })
        }
      } catch {}
    }

    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onMounted(() => loadConfig())
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.btn-primary {
  background: #ff0000; color: #fff; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}

.form-section { margin-bottom: 20rpx; }
.form-card { background: #fff; border-radius: 12rpx; padding: 24rpx; }

.section-title {
  font-size: 30rpx; font-weight: bold; color: #333;
  margin-bottom: 20rpx; padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.form-item {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.form-item:last-child { border-bottom: none; }

.form-label { font-size: 28rpx; color: #333; margin-bottom: 12rpx; display: block; }

.form-input {
  width: 100%; height: 72rpx; background: #f5f5f5;
  border-radius: 8rpx; padding: 0 20rpx; font-size: 28rpx;
  box-sizing: border-box;
}

.switch-item {
  display: flex; justify-content: space-between; align-items: center;
}
.switch-item .form-label { margin-bottom: 0; }

.form-hint { font-size: 24rpx; color: #999; margin-top: 8rpx; }
.streak-preview { margin-top: 16rpx; padding: 16rpx; background: #f5f5f5; border-radius: 8rpx; }
.streak-item { font-size: 26rpx; color: #667eea; margin-top: 8rpx; }
</style>
