<template>
  <view class="tenant-switcher" @click="toggleDropdown">
    <view class="current-tenant">
      <text class="label">当前租户：</text>
      <text class="name">{{ currentTenant?.name || '请选择' }}</text>
      <text class="arrow" :class="{ open: showDropdown }">▼</text>
    </view>
    <view v-if="showDropdown" class="dropdown">
      <view
        v-for="tenant in tenantList"
        :key="tenant.documentId"
        class="dropdown-item"
        :class="{ active: tenant.documentId === currentTenantId }"
        @click.stop="selectTenant(tenant.documentId)"
      >
        <text>{{ tenant.name }}</text>
        <text class="domain">{{ tenant.domain }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useUserStore } from '../store/user.js'

const userStore = useUserStore()
const tenantList = computed(() => userStore.tenantList)
const currentTenantId = computed(() => userStore.currentTenantId)
const currentTenant = computed(() => tenantList.value.find(t => t.documentId === currentTenantId.value))

const showDropdown = ref(false)

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function selectTenant(documentId) {
  userStore.setCurrentTenant(documentId)
  showDropdown.value = false
  // 刷新页面，让所有请求带上新的 x-site-id
  if (typeof window !== 'undefined' && window.location) {
    window.location.reload()
  }
}
</script>

<style scoped>
.tenant-switcher {
  position: relative;
  cursor: pointer;
  padding: 12rpx 24rpx;
  background: #fff;
  border-radius: 8rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08);
}
.current-tenant {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.label {
  color: #999;
  font-size: 24rpx;
}
.name {
  font-weight: 600;
  color: #333;
  font-size: 28rpx;
  max-width: 240rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.arrow {
  font-size: 20rpx;
  color: #999;
  transition: transform 0.2s;
}
.arrow.open {
  transform: rotate(180deg);
}
.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1rpx solid #eee;
  border-radius: 8rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.12);
  z-index: 1000;
  margin-top: 8rpx;
  max-height: 600rpx;
  overflow-y: auto;
}
.dropdown-item {
  padding: 20rpx 24rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1rpx solid #f5f5f5;
}
.dropdown-item:last-child {
  border-bottom: none;
}
.dropdown-item:hover {
  background: #f9f9f9;
}
.dropdown-item.active {
  background: #e6f7ff;
  color: #1890ff;
}
.domain {
  color: #999;
  font-size: 22rpx;
}
</style>
