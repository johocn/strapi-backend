<template>
  <view class="page-container">
    <PageHeader title="服务人配置" desc="按推荐人/城市就近展示咨询联系方式，未配置时落全局配置">
      <button class="btn-primary" @click="goForm()">+ 新增服务人</button>
    </PageHeader>

    <view class="filter-section">
      <input class="filter-input" v-model="filters.city" placeholder="按城市筛选" @confirm="loadList(1)" />
      <button class="btn-primary" @click="loadList(1)">查询</button>
    </view>

    <view class="config-list" v-if="list.length">
      <view class="config-card" v-for="item in list" :key="item.id">
        <view class="card-top">
          <text class="card-title">{{ item.nickname || (item.inviterId ? ('服务人#' + item.inviterId) : '全局默认服务人员') }}</text>
          <view class="card-tags">
            <text class="card-tag global" v-if="!item.inviterId">全局默认</text>
            <text class="card-tag" v-if="item.city">{{ item.city }}</text>
          </view>
        </view>
        <view class="card-info" v-if="item.branchName">网点：{{ item.branchName }}</view>
        <view class="card-info" v-if="item.branchPhones && item.branchPhones.length">电话：{{ item.branchPhones.join(' / ') }}</view>
        <view class="card-info" v-if="item.inviterId">邀请人ID：{{ item.inviterId }}</view>
        <view class="card-actions">
          <button class="btn-primary" @click="goForm(item)">编辑</button>
          <button class="btn-danger" @click="remove(item)">删除</button>
        </view>
      </view>
    </view>
    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && list.length === 0" class="empty-state">
      <text class="empty-text">暂无服务人配置</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getConsultContactList, deleteConsultContact } from '../../../api/wealth.js'
import PageHeader from '../../../components/PageHeader.vue'

const list = ref([])
const loading = ref(false)
const filters = ref({ city: '' })
const pagination = ref({ page: 1, pageSize: 20, total: 0 })

onShow(() => { loadList(1) })

async function loadList(page = 1) {
  loading.value = true
  try {
    const res = await getConsultContactList({ page, pageSize: pagination.value.pageSize, city: filters.value.city || undefined })
    list.value = res.list || []
    pagination.value = res.pagination || { page: 1, pageSize: 20, total: 0 }
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goForm(item) {
  uni.navigateTo({ url: `/pages/wealth/consult-contact/form${item ? '?id=' + item.id : ''}` })
}

function remove(item) {
  uni.showModal({
    title: '确认删除',
    content: `删除「${item.nickname || (item.inviterId ? ('服务人#' + item.inviterId) : '全局默认服务人员')}」的配置？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await deleteConsultContact(item.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        loadList(1)
      } catch (e) {
        uni.showToast({ title: e.message || '删除失败', icon: 'none' })
      }
    },
  })
}
</script>

<style scoped>
.page-container { padding: 24rpx; }
.filter-section { display: flex; align-items: center; gap: 16rpx; margin-bottom: 24rpx; }
.filter-input { flex: 1; border: 1rpx solid #ddd; border-radius: 8rpx; padding: 12rpx 16rpx; font-size: 26rpx; }
.config-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05); }
.card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.card-title { font-size: 30rpx; font-weight: 600; color: #333; }
.card-tags { display: flex; align-items: center; gap: 8rpx; }
.card-tag { font-size: 22rpx; color: #2b6de8; background: #eef3ff; padding: 4rpx 12rpx; border-radius: 8rpx; }
.card-tag.global { color: #e64340; background: #fdecec; }
.card-info { font-size: 26rpx; color: #666; margin-bottom: 8rpx; }
.card-actions { display: flex; justify-content: flex-end; gap: 16rpx; margin-top: 16rpx; }
.btn-danger { background: #fdecec; color: #e64340; border: none; }
.loading { text-align: center; color: #999; padding: 40rpx 0; }
.empty-state { text-align: center; color: #999; padding: 80rpx 0; }
</style>
