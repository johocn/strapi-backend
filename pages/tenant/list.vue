<template>
  <view class="page-container">
    <PageHeader title="租户管理">
      <button class="btn-primary" @click="goCreate">新建租户</button>
    </PageHeader>

    <view class="search-bar">
      <input 
        class="search-input" 
        placeholder="搜索租户名称或域名" 
        v-model="searchKeyword"
        @confirm="loadTenantList"
      />
      <button class="btn-search" @click="loadTenantList">搜索</button>
    </view>

    <view class="tenant-list">
      <view 
        v-for="tenant in tenantList" 
        :key="tenant.documentId" 
        class="tenant-card"
        @click="goDetail(tenant.documentId)"
      >
        <view class="tenant-header">
          <view class="tenant-info">
            <text class="tenant-name">{{ tenant.siteName || '未命名租户' }}</text>
            <text class="tenant-domain">{{ tenant.domain || '未绑定域名' }}</text>
          </view>
          <view :class="['tenant-status', tenant.featureFlags?.channel ? 'active' : 'inactive']">
            {{ tenant.featureFlags?.channel ? '已启用' : '已停用' }}
          </view>
        </view>
        
        <view class="tenant-meta">
          <view class="meta-item">
            <text class="meta-label">渠道数量</text>
            <text class="meta-value">{{ tenant.channels?.length ?? 0 }}</text>
          </view>
          <view class="meta-item">
            <text class="meta-label">三方配置</text>
            <text class="meta-value">{{ tenant.thirdPartyConfigs?.length ?? 0 }}</text>
          </view>
          <view class="meta-item">
            <text class="meta-label">模板</text>
            <text class="meta-value">{{ tenant.template?.name || '无' }}</text>
          </view>
        </view>

        <view class="feature-tags">
          <view 
            v-for="(flag, key) in featureLabels" 
            :key="key"
            :class="['feature-tag', tenant.featureFlags?.[key] ? 'enabled' : 'disabled']"
          >
            {{ flag }}
          </view>
        </view>

        <view class="tenant-footer">
          <text class="update-time">更新时间: {{ formatDate(tenant.updatedAt) }}</text>
          <view class="actions">
            <text class="action-btn edit" @click.stop="goEdit(tenant.documentId)">编辑</text>
            <text class="action-btn delete" @click.stop="deleteTenant(tenant)">删除</text>
          </view>
        </view>
      </view>

      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <!-- channel-admin 空列表引导卡片 -->
      <view v-if="!loading && userStore.hasRole('channel-admin') && tenantList.length === 0" class="empty-guide">
        <text class="guide-title">您还没有租户</text>
        <text class="guide-desc">创建您的第一个租户，开始渠道运营</text>
        <button class="btn-primary" @click="goCreate">创建第一个租户</button>
      </view>
      <!-- 其他角色空列表 -->
      <view v-else-if="!loading && tenantList.length === 0" class="empty-state">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无租户数据</text>
        <text class="empty-hint">点击右上角新建租户</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import PageHeader from '../../src/components/PageHeader.vue'
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMyTenants } from '../../src/api/auth.js'
import { deleteSiteConfig } from '../../src/api/site-config.js'
import { useUserStore } from '../../src/store/user.js'

const userStore = useUserStore()
const searchKeyword = ref('')
const tenantList = ref([])
const loading = ref(false)

const featureLabels = {
  sso: 'SSO',
  points: '积分',
  quiz: '题库',
  course: '课程',
  channel: '渠道',
  thirdParty: '三方登录',
  oss: 'OSS'
}

onShow(() => {
  loadTenantList()
})

async function loadTenantList() {
  loading.value = true
  try {
    // 所有角色统一调 /my/tenants（后端按角色区分返回范围）
    const res = await getMyTenants()
    tenantList.value = res?.data ?? []
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goCreate() {
  uni.navigateTo({ url: '/pages/tenant/detail' })
}

function goDetail(documentId) {
  uni.navigateTo({ url: `/pages/tenant/detail?documentId=${documentId}` })
}

function goEdit(documentId) {
  uni.navigateTo({ url: `/pages/tenant/detail?documentId=${documentId}&mode=edit` })
}

async function deleteTenant(tenant) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除租户 "${tenant.siteName}" 吗？此操作不可恢复。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteSiteConfig(tenant.documentId)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadTenantList()
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 20rpx;
}

.btn-primary {
  background: linear-gradient(135deg, #409eff 0%, #667eea 100%);
  color: #fff;
  border: none;
  border-radius: 8rpx;
  padding: 16rpx 32rpx;
  font-size: 28rpx;
}

.search-bar {
  display: flex;
  gap: 20rpx;
  margin-bottom: 30rpx;
  
  .search-input {
    flex: 1;
    background: #fff;
    border: 2rpx solid #e4e7ed;
    border-radius: 8rpx;
    padding: 20rpx;
    font-size: 28rpx;
  }
  
  .btn-search {
    background: #fff;
    border: 2rpx solid #409eff;
    color: #409eff;
    border-radius: 8rpx;
    padding: 0 32rpx;
    font-size: 28rpx;
  }
}

.tenant-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.tenant-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  
  .tenant-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20rpx;
    
    .tenant-info {
      display: flex;
      flex-direction: column;
      gap: 8rpx;
      
      .tenant-name {
        font-size: 32rpx;
        font-weight: 600;
        color: #1a1a1a;
      }
      
      .tenant-domain {
        font-size: 24rpx;
        color: #909399;
      }
    }
    
    .tenant-status {
      padding: 8rpx 16rpx;
      border-radius: 20rpx;
      font-size: 22rpx;
      
      &.active {
        background: #f0f9eb;
        color: #67c23a;
      }
      
      &.inactive {
        background: #fef0f0;
        color: #f56c6c;
      }
    }
  }
  
  .tenant-meta {
    display: flex;
    gap: 40rpx;
    margin-bottom: 20rpx;
    padding-bottom: 20rpx;
    border-bottom: 1rpx solid #f0f0f0;
    
    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 4rpx;
      
      .meta-label {
        font-size: 22rpx;
        color: #909399;
      }
      
      .meta-value {
        font-size: 26rpx;
        color: #303133;
        font-weight: 500;
      }
    }
  }
  
  .feature-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
    margin-bottom: 20rpx;
    
    .feature-tag {
      padding: 6rpx 16rpx;
      border-radius: 6rpx;
      font-size: 22rpx;
      
      &.enabled {
        background: #ecf5ff;
        color: #409eff;
      }
      
      &.disabled {
        background: #f5f5f5;
        color: #c0c4cc;
      }
    }
  }
  
  .tenant-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .update-time {
      font-size: 22rpx;
      color: #c0c4cc;
    }
    
    .actions {
      display: flex;
      gap: 24rpx;
      
      .action-btn {
        font-size: 26rpx;
        
        &.edit {
          color: #409eff;
        }
        
        &.delete {
          color: #f56c6c;
        }
      }
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
  gap: 16rpx;
  
  .empty-icon {
    font-size: 80rpx;
  }
  
  .empty-text {
    font-size: 30rpx;
    color: #909399;
  }
  
  .empty-hint {
    font-size: 24rpx;
    color: #c0c4cc;
  }
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60rpx 0;
  
  .loading-text {
    font-size: 28rpx;
    color: #909399;
  }
}

.empty-guide {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 40rpx;
  background: #fff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  gap: 24rpx;
  
  .guide-title {
    font-size: 36rpx;
    font-weight: 600;
    color: #1a1a1a;
  }
  
  .guide-desc {
    font-size: 26rpx;
    color: #909399;
  }
  
  .btn-primary {
    background: linear-gradient(135deg, #409eff 0%, #667eea 100%);
    color: #fff;
    border: none;
    border-radius: 8rpx;
    padding: 20rpx 48rpx;
    font-size: 28rpx;
    margin-top: 16rpx;
  }
}
</style>