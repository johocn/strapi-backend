<template>
  <view class="wizard">
    <view class="wizard-head" @click="collapsed = !collapsed">
      <text class="wizard-title">📘 微信模板通知 · 配置向导</text>
      <text class="wizard-toggle">{{ collapsed ? '展开' : '收起' }}</text>
    </view>

    <view v-show="!collapsed" class="wizard-body">
      <view v-for="(s, si) in steps" :key="si" class="w-step">
        <view class="w-step-head" @click="toggleStep(si)">
          <text class="w-step-no" :class="{ done: open === si }">{{ s.no }}</text>
          <text class="w-step-title">{{ s.title }}</text>
          <text class="w-step-arrow">{{ open === si ? '−' : '＋' }}</text>
        </view>
        <view v-show="open === si" class="w-step-body">
          <text v-for="(line, li) in s.lines" :key="li" class="w-line">{{ line }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const collapsed = ref(false)
const open = ref(0)

const steps = [
  {
    no: '1', title: '前置准备',
    lines: [
      '① 公众号必须为「认证服务号」（需企业资质，未认证无法使用模板消息）。',
      '② 接收人（客户/学员）需已「关注」该公众号。',
      '③ 已在公众号后台开通「模板消息」（广告与服务 → 增值服务 → 模板消息，部分行业需审核）。',
    ],
  },
  {
    no: '2', title: '公众号后台领取模板 ID',
    lines: [
      '① 浏览器打开 mp.weixin.qq.com，登录你的认证服务号。',
      '② 进入 设置与开发 → 更多 → 广告与服务 → 增值服务 → 模板消息。',
      '③ 在「我的模板」选择已有模板，或点「从模板库中添加」按关键词搜索后添加。',
      '④ 记录选中所用模板的「模板 ID」（形如 xxx_AbCd1234……）；模板内容里的 {thing1.DATA} {date2.DATA} 为字段，下一步会用到。',
    ],
  },
  {
    no: '3', title: '在平台配置公众号 AppID / AppSecret',
    lines: [
      '① 公众号后台 设置与开发 → 基本配置，查看「AppID」。',
      '② 点「重置」按钮获取新 AppSecret（仅展示一次，请立即复制，妥善保管）。',
      '③ 将 AppID / AppSecret 填写到平台「SSO 登录 / OAuth 配置」中公众号一处，并保存。',
    ],
  },
  {
    no: '4', title: '新增消息模板（填模板 ID 与字段映射）',
    lines: [
      '① 在本页点「+ 新增模板」。',
      '② 填唯一「模板编码 code」（如 act_confirm，业务逻辑按它引用，保存后不可改）。',
      '③ 「公众号模板ID wxTemplateId」填第 2 步复制的模板 ID（如 xxx_AbCd1234）。',
      '④ 在「参数字段」每行配置：左侧 = 平台传值用参数 key（如 title）；右侧 = 微信字段名（第 2 步模板中的 thing1 / date2，含类型后缀）。',
      '⑤ 开启右上角「启用」开关。',
    ],
  },
  {
    no: '5', title: '发送测试验证（必做）',
    lines: [
      '① 在模板编辑页点「发送测试」。',
      '② 选择一个已关注公众号的测试用户（用微信手机/昵称搜索）。',
      '③ 为每个参数字段填一个测试值（如 title 填“活动报名成功”）。',
      '④ 点「发送」，查看微信是否收到，以及回执 msqId / 失败原因（未关注会提示 43101）。',
      '⚠ 同一用户连续测试会被频控拦截（场景冷却），属正常，隔 1 分钟再试。',
    ],
  },
  {
    no: '6', title: '（可选）接入自动触发',
    lines: [
      '① 到「SOP 自动规则」按 templateCode 引用刚建的模板，设定触发条件。',
      '② 或由业务埋点（如活动报名成功）自动创建消息任务。',
      '③ 到「消息任务」页查看自动下发结果，失败任务可点「重试」。',
    ],
  },
]

function toggleStep(i) { open.value = open.value === i ? -1 : i }
</script>

<style scoped>
.wizard { background: #fff; border-radius: 12rpx; margin-bottom: 20rpx; overflow: hidden; }
.wizard-head { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; background: #1677ff; }
.wizard-title { font-size: 30rpx; font-weight: bold; color: #fff; }
.wizard-toggle { font-size: 24rpx; color: #fff; }
.wizard-body { padding: 8rpx 24rpx 24rpx; }
.w-step { border-bottom: 1rpx solid #f0f0f0; padding: 8rpx 0; }
.w-step:last-child { border-bottom: none; }
.w-step-head { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; }
.w-step-no { width: 40rpx; height: 40rpx; line-height: 40rpx; text-align: center; border-radius: 50%; background: #f0f0f0; color: #666; font-size: 24rpx; flex-shrink: 0; }
.w-step-no.done { background: #1677ff; color: #fff; }
.w-step-title { flex: 1; font-size: 28rpx; font-weight: bold; color: #333; }
.w-step-arrow { font-size: 28rpx; color: #999; }
.w-step-body { padding: 8rpx 8rpx 20rpx 56rpx; }
.w-line { display: block; font-size: 26rpx; color: #555; line-height: 1.7; margin-bottom: 8rpx; }
</style>