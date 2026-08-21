<template>
  <view class="wrap">
    <view class="bar">
      <text>从</text><picker mode="date" :value="from" @change="(e)=>from=e.detail.value"><view class="inp">{{from}}</view></picker>
      <text>至</text><picker mode="date" :value="to" @change="(e)=>to=e.detail.value"><view class="inp">{{to}}</view></picker>
      <input v-model="scene" placeholder="scene(如 activity.closed)" class="inp" />
      <button size="mini" @click="load">查询</button>
    </view>

    <view class="cards">
      <view class="card"><text>{{s.sceneCount}}</text><text>/场景</text></view>
      <view class="card"><text>{{s.total}}</text><text>发起</text></view>
      <view class="card"><text>{{s.sent}}</text><text>送达</text></view>
      <view class="card"><text>{{s.failed}}</text><text>失败</text></view>
      <view class="card"><text>{{s.quotaLimited}}</text><text>频控</text></view>
      <view class="card"><text>{{s.sentRate}}%</text><text>送达率</text></view>
    </view>

    <view class="tbl">
      <view class="th row"><text>场景</text><text>规则</text><text>发起</text><text>送达</text><text>失败</text><text>频控</text><text>待发</text><text>送达率</text><text>点击(累计)</text></view>
      <view class="row" v-for="r in rows" :key="r.scene">
        <text>{{r.scene}}</text>
        <text class="rules">{{r.rules.map(x=>x.name||x.code).join('; ')}}</text>
        <text>{{r.total}}</text><text>{{r.sent}}</text><text>{{r.failed}}</text>
        <text>{{r.quotaLimited}}</text><text>{{r.pending}}</text><text>{{r.sentRate}}%</text><text>{{r.clicks}}</text>
      </view>
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
    return {
      from: iso(past), to: iso(now), scene: "",
      summary: { sceneCount: 0, total: 0, sent: 0, failed: 0, quotaLimited: 0, sentRate: 0 },
      rows: [],
    };
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
      if (this.scene) params.push('scene=' + encodeURIComponent(this.scene));
      const qs = params.length ? '?' + params.join('&') : '';
      const res = await new Promise((resolve) => {
        uni.request({
          url: '/api/zhao-sso/v1/admin/msg/sop-stats' + qs,
          method: 'GET',
          header: token ? { Authorization: 'Bearer ' + token } : {},
          success: (r) => resolve(r),
          fail: () => resolve({ statusCode: 0, data: {} }),
        });
      });
      const d = res.data && res.data.data;
      if (d) { this.summary = d.summary; this.rows = d.rows; }
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
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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
.tbl {
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  font-size: 24rpx;
  color: #333;
}
.row {
  display: grid;
  grid-template-columns: 1.2fr 2fr repeat(7, 0.8fr);
  gap: 8rpx;
  align-items: center;
  padding: 20rpx 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
  text-align: center;
  word-break: break-all;
}
.th {
  background: #fafbfe;
  font-weight: bold;
  color: #666;
}
.rules {
  color: #667eea;
  text-align: left;
}
</style>