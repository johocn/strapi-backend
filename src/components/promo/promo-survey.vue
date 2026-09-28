<template>
  <view class="promo-card promo-survey">
    <text v-if="title" class="section-title">{{ title }}</text>
    <text v-if="desc" class="survey-desc">{{ desc }}</text>

    <!-- 品类 tab（配 1 个 Collection 时不渲染） -->
    <scroll-view v-if="collections.length > 1" scroll-x class="survey-tabs">
      <text
        v-for="(c, i) in collections"
        :key="c.slug"
        class="survey-tab"
        :class="{ on: i === activeTab }"
        @click="activeTab = i"
      >{{ c.label || c.slug }}</text>
    </scroll-view>

    <!-- 卡片区：加载 / 失败 / 空态 / 列表（预览只读，无提交） -->
    <view v-if="loading" class="survey-state"><text>加载中...</text></view>
    <view v-else-if="loadError" class="survey-state"><text>加载失败</text></view>
    <view v-else-if="!currentProducts.length" class="survey-state"><text>本期暂无候选</text></view>
    <view v-else>
      <view v-for="p in currentProducts" :key="p.id" class="survey-item">
        <image v-if="p.image" :src="imageUrl(p)" mode="aspectFill" class="survey-image" />
        <view v-else class="survey-image survey-image--empty"><text>🛍️</text></view>
        <view class="survey-body">
          <view class="survey-name-row">
            <text class="survey-name">{{ p.name }}</text>
            <text v-if="p.enabled === false" class="survey-badge">待上架</text>
          </view>
          <text class="survey-price">{{ productPrice(p) }}</text>
          <view v-if="p.variants?.length" class="survey-variants">
            <text v-for="v in p.variants" :key="v.id" class="survey-variant">{{ v.name }}</text>
          </view>
          <text v-if="p.linkAvailable" class="survey-link">查看详情 ›</text>
        </view>
        <view class="survey-check"></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

const VENDURE_BASE = 'https://e.joho.cn'
const VENDURE_ASSET_BASE = 'https://e.joho.cn/assets'

const props = defineProps({
  activity: { type: Object, default: null },
  config: { type: Object, default: null },
})

const title = computed(() => props.config?.title || '帮我们选品')
const desc = computed(() => props.config?.desc || '')
const collections = computed(() => {
  const list = Array.isArray(props.config?.collections) ? props.config.collections : []
  return list.filter(c => c && c.slug)
})

const productsByTab = ref({})
const activeTab = ref(0)
const loading = ref(true)
const loadError = ref(false)

const currentProducts = computed(() => {
  const c = collections.value[activeTab.value]
  return c ? (productsByTab.value[c.slug] || []) : []
})

// 直连 Vendure 只读候选接口（CORS 由 Vendure 自身处理；GET 参数手动拼串，规避 H5 query 转换不确定）
function fetchCandidates(slug, token) {
  const url = `${VENDURE_BASE}/product-survey/candidates?collection=${encodeURIComponent(slug)}&take=50`
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      header: token ? { 'vendure-token': token } : {},
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data)
        else reject(new Error('candidates ' + res.statusCode))
      },
      fail: reject,
    })
  })
}

async function load() {
  if (!collections.value.length) {
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = false
  try {
    const res = await Promise.all(
      collections.value.map(c => fetchCandidates(c.slug, props.config?.channelToken))
    )
    const map = {}
    collections.value.forEach((c, i) => {
      map[c.slug] = Array.isArray(res[i]?.products) ? res[i].products : []
    })
    productsByTab.value = map
  } catch (e) {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

const imageUrl = (p) => (p?.image ? `${VENDURE_ASSET_BASE}/${p.image}` : '')
const productPrice = (p) => (p?.priceConfigured === false ? '到店询价' : (p?.priceFromText || '到店询价'))

onMounted(load)
</script>

<style lang="scss" scoped>
.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: var(--c-text);
  margin-bottom: 12rpx;
}

.survey-desc {
  display: block;
  font-size: 24rpx;
  color: var(--c-text-dim);
  line-height: 1.6;
}

.survey-tabs {
  display: flex;
  white-space: nowrap;
  margin: 20rpx 0 8rpx;
}

.survey-tab {
  display: inline-block;
  padding: 10rpx 28rpx;
  margin-right: 16rpx;
  font-size: 26rpx;
  color: var(--c-text-dim);
  border-radius: 28rpx;
  background: var(--c-bg);
}

.survey-tab.on {
  color: #fff;
  background: var(--c-primary);
}

.survey-state {
  padding: 60rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: var(--c-text-dim);
}

.survey-item {
  display: flex;
  align-items: flex-start;
  padding: 18rpx 0;
  border-bottom: 2rpx solid var(--c-text-dim);
}

.survey-image {
  flex-shrink: 0;
  width: 150rpx;
  height: 150rpx;
  margin-right: 20rpx;
  border-radius: 12rpx;
  background: var(--c-bg);
}

.survey-image--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56rpx;
}

.survey-body {
  flex: 1;
  min-width: 0;
}

.survey-name-row {
  display: flex;
  align-items: center;
}

.survey-name {
  font-size: 30rpx;
  font-weight: bold;
  color: var(--c-text);
  line-height: 1.4;
}

.survey-badge {
  flex-shrink: 0;
  margin-left: 12rpx;
  padding: 2rpx 12rpx;
  font-size: 20rpx;
  color: var(--c-accent);
  border: 2rpx solid var(--c-accent);
  border-radius: 8rpx;
}

.survey-price {
  display: block;
  margin-top: 10rpx;
  font-size: 30rpx;
  font-weight: bold;
  color: var(--c-primary);
}

.survey-variants {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
}

.survey-variant {
  padding: 6rpx 20rpx;
  font-size: 22rpx;
  color: var(--c-text-dim);
  border: 2rpx solid var(--c-text-dim);
  border-radius: 24rpx;
}

.survey-link {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: var(--c-primary);
}

.survey-check {
  flex-shrink: 0;
  width: 44rpx;
  height: 44rpx;
  margin-left: 16rpx;
  border-radius: 50%;
  border: 2rpx solid var(--c-text-dim);
}
</style>