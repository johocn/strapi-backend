<template>
  <view class="page-container">
    <PageHeader title="SOP 自动化规则">
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('sso.msg.write')">+ 新增规则</button>
    </PageHeader>

    <view class="help-banner">
      <text class="help-icon">⚙️</text>
      <text class="help-text">SOP 规则定义业务事件（活动报名/获课等）触发后自动编排的消息任务。规则引用消息模板（templateCode）；「事件」类由业务埋点触发，「定时」类按 cron 表达式周期触发。默认规则由系统初始化，可按需调整 enabled/templateCode。</text>
    </view>

    <view class="search-section">
      <view class="search-box">
        <input type="text" v-model="searchKeyword" placeholder="搜索 code / name" @confirm="loadData" class="search-input" />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <view v-for="s in SOURCES" :key="s.value" class="filter-item" :class="{ active: sourceFilter === s.value }" @click="toggleSource(s.value)">{{ s.label }}</view>
      </view>
    </view>

    <view class="data-list">
      <view v-for="item in dataList" :key="item.id || item.documentId" class="data-card">
        <view class="data-info" @click="goEdit(item.id || item.documentId)">
          <view class="data-title">
            <text class="config-name">{{ item.name || '-' }}</text>
            <text class="code-tag">{{ item.code }}</text>
            <text class="source-tag" :class="item.source === 'cron' ? 'cron' : 'event'">{{ item.source === 'cron' ? '定时' : '事件' }}</text>
          </view>
          <view class="data-meta">
            <text class="meta-item" v-if="item.source === 'event'">事件: {{ item.event || '-' }}</text>
            <text class="meta-item" v-else>cron: {{ item.cronExpression || '-' }}</text>
            <text class="meta-item">模板: {{ item.templateCode || '-' }}</text>
          </view>
          <view class="data-meta" v-if="item.scene">
            <text class="meta-item">场景: {{ item.scene }}</text>
            <text class="meta-item">延迟: {{ item.delayMinutes ? item.delayMinutes + ' 分钟' : '立即' }}</text>
          </view>
          <view class="data-footer">
            <view class="data-status" :class="item.enabled ? 'active' : 'inactive'">{{ item.enabled ? '已启用' : '已禁用' }}</view>
            <view class="data-date">ID: {{ item.id }}</view>
          </view>
        </view>
        <view class="data-actions">
          <view v-if="hasPermission('sso.msg.write')" class="action-btn edit" @click.stop="goEdit(item.id || item.documentId)">编辑</view>
          <view v-if="hasPermission('sso.msg.write')" class="action-btn delete" @click.stop="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && dataList.length === 0" class="empty-state">
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无 SOP 规则</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ssoSopRuleApi } from '../../../api/sso.js'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'

const SOURCES = [
  { value: 'event', label: '事件触发' },
  { value: 'cron', label: '定时触发' },
]

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const sourceFilter = ref('')
const dataList = ref([])
const loading = ref(false)

function toggleSource(v) { sourceFilter.value = sourceFilter.value === v ? '' : v; loadData() }

async function loadData() {
  loading.value = true
  try {
    const params = {}
    if (searchKeyword.value) {
      params['code[$contains]'] = searchKeyword.value
      params['$or[0][name][$contains]'] = searchKeyword.value
    }
    if (sourceFilter.value) params['source[$eq]'] = sourceFilter.value
    const { list } = await ssoSopRuleApi.list(params)
    dataList.value = list
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goCreate() {
  uni.navigateTo({ url: '/pages/sso/sop-rule/edit' })
}

function goEdit(id) {
  uni.navigateTo({ url: `/pages/sso/sop-rule/edit?id=${id}` })
}

function handleDelete(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除规则「${item.name || item.code}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await ssoSopRuleApi.delete(item.id || item.documentId)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadData()
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

onShow(() => { loadData() })
</script>

<style scoped>
page { background: #f5f5f5; }
.help-banner {
  display: flex; align-items: flex-start; gap: 12rpx;
  background: #e6f4ff; padding: 20rpx; border-radius: 12rpx;
  margin-bottom: 20rpx; border-left: 6rpx solid #1677ff;
}
.help-icon { font-size: 28rpx; flex-shrink: 0; }
.help-text { font-size: 26rpx; color: #333; line-height: 1.5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.btn-primary {
  background: #ff0000; color: #ffffff; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}
.search-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.search-box { display: flex; align-items: center; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; }
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }
.filter-row { display: flex; gap: 16rpx; margin-top: 16rpx; }
.filter-item { padding: 10rpx 24rpx; border-radius: 8rpx; background: #f5f5f5; font-size: 26rpx; color: #666; }
.filter-item.active { background: #1677ff; color: #fff; }
.data-list { display: flex; flex-direction: column; gap: 20rpx; }
.data-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: center; }
.data-info { flex: 1; display: flex; flex-direction: column; }
.data-title { display: flex; align-items: center; gap: 12rpx; font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; flex-wrap: wrap; }
.config-name { font-size: 30rpx; font-weight: bold; color: #333; }
.code-tag { font-size: 22rpx; color: #1677ff; background: #e6f4ff; padding: 4rpx 12rpx; border-radius: 6rpx; }
.source-tag { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 6rpx; }
.source-tag.event { color: #d48806; background: #fffbe6; }
.source-tag.cron { color: #722ed1; background: #f9f0ff; }
.data-meta { margin-bottom: 8rpx; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; }
.data-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.data-status { padding: 4rpx 16rpx; border-radius: 4rpx; font-size: 22rpx; color: #fff; }
.data-status.active { background: #07c160; }
.data-status.inactive { background: #999; }
.data-date { font-size: 22rpx; color: #999; }
.data-actions { display: flex; flex-direction: column; gap: 12rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; }
.action-btn.delete { background: #fff0f0; color: #ff4d4f; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }
</style>
