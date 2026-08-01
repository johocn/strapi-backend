<template>
  <view class="page-container">
    <PageHeader title="签到记录" />

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-item">
        <text class="filter-label">用户ID</text>
        <input type="text" v-model="filters.userId" placeholder="输入用户ID" class="filter-input" />
      </view>
      <button class="btn-search" @click="loadData(1)">查询</button>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-row">
      <view class="stat-card">
        <view class="stat-value">{{ stats.totalSignIns }}</view>
        <view class="stat-label">总签到次数</view>
      </view>
      <view class="stat-card">
        <view class="stat-value">{{ stats.todaySignIns }}</view>
        <view class="stat-label">今日签到</view>
      </view>
      <view class="stat-card">
        <view class="stat-value">{{ stats.maxStreak }}</view>
        <view class="stat-label">最长连续(天)</view>
      </view>
    </view>

    <!-- 记录列表 -->
    <view class="record-list">
      <view v-for="item in list" :key="item.id" class="record-card">
        <view class="record-info">
          <view class="record-user">用户 #{{ item.user?.id || item.user }}</view>
          <view class="record-date">{{ item.signInDate }}</view>
        </view>
        <view class="record-detail">
          <view class="streak-badge" v-if="item.streakDays > 1">
            连续 {{ item.streakDays }} 天
          </view>
          <view class="points-badge">+{{ item.pointsEarned }} 积分</view>
          <view class="streak-reward" v-if="item.isStreakReward">阶梯奖励</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && list.length === 0" class="empty-state">
      <text class="empty-text">暂无签到记录</text>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { get } from '../../utils/request.js'
import { extractList } from '../../utils/format.js'
import { DEFAULT_PAGE_SIZE } from '../../config/constant.js'
import PageHeader from '../../components/PageHeader.vue'

const ADMIN = '/zhao-point/v1/admin'

const list = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pagination = ref({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 })
const filters = ref({ userId: '' })

const stats = ref({ totalSignIns: 0, todaySignIns: 0, maxStreak: 0 })

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = {
      'pagination[page]': page,
      'pagination[pageSize]': pagination.value.pageSize,
    }
    if (filters.value.userId) params['filters[user]'] = filters.value.userId

    const res = await get(`${ADMIN}/sign-in-records`, params).then(extractList)
    list.value = res.list ?? res.results ?? res ?? []
    pagination.value = { ...pagination.value, ...res.pagination, total: res.pagination?.total ?? 0 }
    currentPage.value = page

    // 统计（注意：以下统计基于当前页数据，分页时 todaySignIns/maxStreak 仅反映当前页，非全局值）
    if (list.value.length > 0) {
      stats.value.totalSignIns = pagination.value.total ?? 0
      stats.value.todaySignIns = list.value.filter(r => r.signInDate === new Date().toISOString().slice(0, 10)).length
      stats.value.maxStreak = Math.max(...list.value.map(r => r.streakDays || 0), 0)
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }

onMounted(() => loadData(1))
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.filter-bar {
  background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx;
  display: flex; align-items: center; gap: 16rpx;
}
.filter-item { flex: 1; display: flex; align-items: center; gap: 8rpx; }
.filter-label { font-size: 26rpx; color: #666; flex-shrink: 0; }
.filter-input {
  flex: 1; height: 64rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 0 16rpx; font-size: 26rpx; box-sizing: border-box;
}
.btn-search {
  background: #667eea; color: #fff; padding: 12rpx 24rpx;
  font-size: 26rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}

.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; margin-bottom: 20rpx; }
.stat-card { background: #fff; border-radius: 12rpx; padding: 24rpx; text-align: center; }
.stat-value { font-size: 40rpx; font-weight: bold; color: #667eea; margin-bottom: 8rpx; }
.stat-label { font-size: 24rpx; color: #999; }

.record-list { display: flex; flex-direction: column; gap: 12rpx; }
.record-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx;
  display: flex; justify-content: space-between; align-items: center;
}
.record-info { flex: 1; }
.record-user { font-size: 28rpx; color: #333; font-weight: bold; margin-bottom: 4rpx; }
.record-date { font-size: 24rpx; color: #999; }

.record-detail { display: flex; align-items: center; gap: 12rpx; }
.streak-badge {
  padding: 4rpx 14rpx; border-radius: 20rpx; font-size: 22rpx;
  background: #fff3e0; color: #ff9800;
}
.points-badge {
  padding: 4rpx 14rpx; border-radius: 20rpx; font-size: 22rpx;
  background: #e8f5e9; color: #07c160; font-weight: bold;
}
.streak-reward {
  padding: 4rpx 14rpx; border-radius: 20rpx; font-size: 22rpx;
  background: #e3f2fd; color: #1976d2;
}

.loading, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100rpx 0;
}
.empty-text { font-size: 28rpx; color: #999; }

.pagination {
  display: flex; justify-content: center; align-items: center;
  gap: 40rpx; padding: 40rpx 0;
}
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }
</style>
