<template>
  <view class="wrap">
    <view class="bar">
      <text>从</text><picker mode="date" :value="from" @change="(e)=>from=e.detail.value"><view class="inp">{{from}}</view></picker>
      <text>至</text><picker mode="date" :value="to" @change="(e)=>to=e.detail.value"><view class="inp">{{to}}</view></picker>
      <button size="mini" @click="load">查询</button>
    </view>
    <view class="tip">复购转化：送达的复购触达后 <text>{{s.windowDays || 7}}</text> 天内用户再次报名计为转化</view>

    <view class="cards">
      <view class="card"><text>{{s.sent}}</text><text>送达</text></view>
      <view class="card"><text>{{s.convertedUsers}}</text><text>转化用户</text></view>
      <view class="card"><text>{{s.conversions}}</text><text>转化条数</text></view>
      <view class="card"><text>{{s.conversionRate}}%</text><text>转化率</text></view>
    </view>
  </view>
</template>

<script>
import { getToken } from '@/utils/auth'
export default {
  data() {
    const now = new Date();
    const past = new Date(now.getTime() - 30 * 86400000);
    const iso = (d) => d.toISOString().slice(0, 10);
    return { from: iso(past), to: iso(now), summary: { sent: 0, convertedUsers: 0, conversions: 0, conversionRate: 0, windowDays: 7 } };
  },
  computed: {
    s() { return this.summary || {}; },
  },
  onShow() { this.load(); },
  methods: {
    async load() {
      const token = getToken();
      const params = [];
      if (this.from) params.push('from=' + encodeURIComponent(this.from));
      if (this.to) params.push('to=' + encodeURIComponent(this.to));
      const qs = params.length ? '?' + params.join('&') : '';
      const res = await new Promise((resolve) => {
        uni.request({
          url: '/api/zhao-sso/v1/admin/msg/repurchase-stats' + qs,
          method: 'GET',
          header: token ? { Authorization: 'Bearer ' + token } : {},
          success: (r) => resolve(r),
          fail: () => resolve({ statusCode: 0, data: {} }),
        });
      });
      const d = res.data && res.data.data;
      if (d) this.summary = d.summary;
    },
  },
};
</script>

<style lang="scss" scoped>
.wrap {
  padding: 20rpx;
  box-sizing: border-box;
  background: #f5f6fa;
  min-height: 100vh;
}
.bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  font-size: 26rpx;
  color: #666;
}
.inp {
  flex: 1;
  min-width: 160rpx;
  padding: 12rpx 16rpx;
  background: #f5f6fa;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #333;
  border: none;
}
.tip {
  font-size: 24rpx;
  color: #888;
  padding: 0 4rpx;
  margin-bottom: 20rpx;
  text {
    color: #667eea;
  }
}
.cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx 16rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  :first-child {
    font-size: 44rpx;
    font-weight: bold;
    color: #333;
  }
  :last-child {
    font-size: 24rpx;
    color: #999;
  }
}
.detail {
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx 16rpx;
  font-size: 24rpx;
  color: #333;
}
</style>