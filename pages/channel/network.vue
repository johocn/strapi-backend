<template>
  <view class="page-container">
    <PageHeader title="渠道网络" />

    <view class="search-section">
      <view class="search-box">
        <input type="text" v-model="searchKeyword" placeholder="搜索渠道名称" @confirm="loadRootChannels" class="search-input" />
        <text class="search-icon">🔍</text>
      </view>
    </view>

    <view class="tree-section">
      <view v-for="root in rootChannels" :key="root.id" class="tree-root">
        <view class="tree-node" @click="toggleExpand(root)">
          <text class="expand-icon">{{ root._expanded ? '▼' : '▶' }}</text>
          <view class="node-info">
            <text class="node-name">{{ root.name }}</text>
            <view class="tier-badge">{{ root.channelTier }}</view>
            <text class="status-dot" :class="root.status ? 'active' : 'inactive'"></text>
          </view>
          <view class="node-actions">
            <text class="action-link" @click.stop="goMembers(root.id)">成员</text>
            <text class="action-link" @click.stop="goEdit(root.id)">编辑</text>
          </view>
        </view>

        <view v-if="root._expanded && root._children" class="tree-children">
          <view v-for="child in root._children" :key="child.id" class="tree-child">
            <view class="tree-node child-node" @click="toggleExpand(child)">
              <text class="expand-icon">{{ child._expanded ? '▼' : '▶' }}</text>
              <view class="node-info">
                <text class="node-name">{{ child.name }}</text>
                <view class="tier-badge small">{{ child.channelTier }}</view>
                <text class="status-dot" :class="child.status ? 'active' : 'inactive'"></text>
              </view>
              <view class="node-actions">
                <text class="action-link" @click.stop="goMembers(child.id)">成员</text>
                <text class="action-link" @click.stop="goEdit(child.id)">编辑</text>
              </view>
            </view>

            <view v-if="child._expanded && child._children" class="tree-children">
              <view v-for="grand in child._children" :key="grand.id" class="tree-grandchild">
                <view class="tree-node grandchild-node">
                  <text class="expand-icon placeholder">●</text>
                  <view class="node-info">
                    <text class="node-name">{{ grand.name }}</text>
                    <view class="tier-badge small">{{ grand.channelTier }}</view>
                    <text class="status-dot" :class="grand.status ? 'active' : 'inactive'"></text>
                  </view>
                  <view class="node-actions">
                    <text class="action-link" @click.stop="goMembers(grand.id)">成员</text>
                    <text class="action-link" @click.stop="goEdit(grand.id)">编辑</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && rootChannels.length === 0" class="empty-state">
      <text class="empty-icon">🌳</text>
      <text class="empty-text">暂无渠道数据</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getAdminChannelList, getChannelChildren } from '../../src/api/channel.js'
import PageHeader from '../../src/components/PageHeader.vue'

const searchKeyword = ref('')
const rootChannels = ref([])
const loading = ref(false)

function goMembers(id) {
  uni.navigateTo({ url: `/pages/channel/members?channelId=${id}` })
}

function goEdit(id) {
  uni.navigateTo({ url: `/pages/channel/detail?id=${id}` })
}

async function loadRootChannels() {
  loading.value = true
  try {
    const params = { channelTier: 'root', pageSize: 100 }
    if (searchKeyword.value) {
      params.name = { $contains: searchKeyword.value }
    }
    const res = await getAdminChannelList(params)
    rootChannels.value = (res.list || []).map(c => ({ ...c, _expanded: false, _children: null }))
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function toggleExpand(node) {
  if (node._expanded) {
    node._expanded = false
    return
  }
  node._expanded = true
  if (!node._children) {
    try {
      const res = await getChannelChildren(node.id)
      const children = res?.data || res?.children || []
      node._children = (Array.isArray(children) ? children : []).map(c => ({ ...c, _expanded: false, _children: null }))
    } catch (e) {
      node._children = []
    }
  }
}

onMounted(() => loadRootChannels())
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.search-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.search-box {
  display: flex; align-items: center; background: #f5f5f5;
  border-radius: 8rpx; padding: 0 20rpx;
}
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }

.tree-section { display: flex; flex-direction: column; gap: 16rpx; }

.tree-root {
  background: #fff; border-radius: 12rpx; overflow: hidden;
}

.tree-node {
  display: flex; align-items: center; padding: 24rpx;
  gap: 12rpx;
}
.child-node { padding-left: 48rpx; }
.grandchild-node { padding-left: 96rpx; }

.expand-icon {
  font-size: 24rpx; color: #999; width: 32rpx; text-align: center; flex-shrink: 0;
}
.expand-icon.placeholder { font-size: 16rpx; color: #ccc; }

.node-info {
  display: flex; align-items: center; gap: 12rpx; flex: 1;
}
.node-name { font-size: 30rpx; font-weight: bold; color: #333; }

.tier-badge {
  font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 4rpx;
  background: #e3f2fd; color: #1976d2;
}
.tier-badge.small { font-size: 20rpx; padding: 2rpx 8rpx; }

.status-dot {
  width: 16rpx; height: 16rpx; border-radius: 8rpx;
}
.status-dot.active { background: #07c160; }
.status-dot.inactive { background: #ff4d4f; }

.node-actions { display: flex; gap: 16rpx; }
.action-link { font-size: 24rpx; color: #1989fa; }

.tree-children {
  border-top: 1rpx solid #f5f5f5;
}
.tree-child {
  border-bottom: 1rpx solid #f5f5f5;
}
.tree-child:last-child { border-bottom: none; }
.tree-grandchild {
  border-top: 1rpx solid #f5f5f5;
}

.loading, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100rpx 0;
}
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
