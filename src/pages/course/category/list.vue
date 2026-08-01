<template>
  <view class="page-container">
    <PageHeader title="课程分类">
      <button class="btn-primary" @click="goAdd" v-if="hasPermission('menu.category')">+ 新增</button>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="搜索分类名称"
          @confirm="loadData"
          class="search-input"
        />
        <text class="search-icon">🔍</text>
      </view>
    </view>

    <view class="category-list">
      <view
        v-for="item in categoryList"
        :key="item.documentId"
        class="category-card"
      >
        <view class="category-info" @click="goEdit(item.documentId)">
          <view class="category-name">{{ item.name }}</view>
          <view class="category-desc" v-if="item.description">{{ item.description }}</view>
          <view class="category-meta">
            <text class="meta-item">排序: {{ item.sort ?? 0 }}</text>
            <text class="meta-item">{{ item.courses?.length || 0 }} 门课程</text>
          </view>
        </view>
        <view class="category-actions">
          <view class="action-btn edit" @click="goEdit(item.documentId)" v-if="hasPermission('menu.category')">编辑</view>
          <view class="action-btn delete" @click="handleDelete(item)" v-if="hasPermission('menu.category')">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && categoryList.length === 0" class="empty-state">
      <text class="empty-icon">📂</text>
      <text class="empty-text">暂无分类</text>
      <button class="btn-primary" @click="goAdd" v-if="hasPermission('menu.category')">立即添加</button>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>

    <view class="fab-btn" @click="goAdd" v-if="hasPermission('menu.category')">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onPageShow, onShow } from '@dcloudio/uni-app'
import { getCourseCategoryList, deleteCourseCategory } from '../../../api/course.js'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'

const searchKeyword = ref('')
const userStore = useUserStore()
const hasPermission = userStore.hasPermission
const categoryList = ref([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = {
      'pagination[page]': page,
      'pagination[pageSize]': 20,
    }
    if (searchKeyword.value) {
      params['filters[name][$contains]'] = searchKeyword.value
    }
    const { list, pagination: pg } = await getCourseCategoryList(params)
    categoryList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goAdd() {
  uni.navigateTo({ url: '/pages/course/category/form' })
}

function goEdit(id) {
  uni.navigateTo({ url: `/pages/course/category/form?id=${id}` })
}

async function handleDelete(item) {
  const courseCount = item.courses?.length || 0
  const hint = courseCount > 0 ? `\n该分类下有 ${courseCount} 门课程，删除后课程将变为未分类` : ''
  uni.showModal({
    title: '确认删除',
    content: `确定要删除分类「${item.name}」吗？${hint}`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteCourseCategory(item.documentId)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

function prevPage() {
  if (currentPage.value > 1) loadData(currentPage.value - 1)
}

function nextPage() {
  if (currentPage.value < totalPages.value) loadData(currentPage.value + 1)
}

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

onShow(() => loadData(1))
onPageShow(() => loadData(currentPage.value))
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.btn-primary {
  background: #ff0000; color: #fff; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}

.search-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.search-box {
  display: flex; align-items: center; background: #f5f5f5;
  border-radius: 8rpx; padding: 0 20rpx;
}
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }

.category-list { display: flex; flex-direction: column; gap: 20rpx; }

.category-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx;
  display: flex; justify-content: space-between; align-items: center;
}
.category-info { flex: 1; }
.category-name { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 8rpx; }
.category-desc { font-size: 26rpx; color: #666; margin-bottom: 8rpx; }
.category-meta { display: flex; gap: 24rpx; }
.meta-item { font-size: 24rpx; color: #999; }

.category-actions { display: flex; gap: 16rpx; flex-shrink: 0; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; }
.action-btn.delete { background: #fff0f0; color: #ff4d4f; }

.loading, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100rpx 0;
}
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }

.pagination {
  display: flex; justify-content: center; align-items: center;
  gap: 40rpx; padding: 40rpx 0;
}
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }

.fab-btn {
  position: fixed; right: 40rpx; bottom: 120rpx; width: 120rpx; height: 120rpx;
  background: #07c160; color: white; border-radius: 60rpx;
  display: flex; align-items: center; justify-content: center;
  z-index: 999; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.2);
}
.fab-icon { font-size: 40rpx; line-height: 1; }
</style>
