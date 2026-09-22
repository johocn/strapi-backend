// src/components/sso-loading-facade/dict.js
// 星枢登录中转等待区：统一品牌令牌 + 广告语 + 状态文案（单一来源，供门面组件与各页共用）

export const BRAND = {
  primary: '#667eea', // 星枢品牌紫（主色）
  soft: '#f6f5fb',    // 品牌淡紫背景
  bg: '#f7f8fc',      // 页面底色（近白淡同色）
  text: '#333',
  muted: '#8898aa',
  line: '#e5e7ef',
  danger: '#e65b5b',  // 错误柔和红
}

export const SSO_SLOGANS = [
  '一个账号，玩转全部系统',
  '一登录，全平台畅通',
  '统一身份，串联所有系统',
  '把散落的系统串成一个整体',
  '一次登录，处处是你的主场',
  '星枢，理清你与好友的联结',
  '一个身份，链接所有业务',
  '打通各系统，一个身份就够',
  '账号在手，关系全有',
  '你来登录，我们连起所有',
  '所有系统，围绕你一个身份',
  '星枢，让系统彼此相连',
  '一键登录，关系自动串联',
  '统一身份，连接课程与活动',
  '星枢轴心，转动整个生态',
  '关系即资产，星枢帮你理',
  '一个他，联结你全部服务',
  '登录一次，身份遍行全线',
  '星枢，你做主的登录中枢',
  '人人皆一点，处处通星枢',
]

/** 随机取一条广告语（轮播/首条复用） */
export function getSlogan() {
  return SSO_SLOGANS[Math.floor(Math.random() * SSO_SLOGANS.length)]
}

/** 状态阶段 → 胶囊文案 */
export const SSO_STATUS = {
  verify: '校验中…',
  login: '正在登录…',
  process: '正在处理登录信息…',
  redirect: '正在跳转目标页面…',
  done: '登录完成，正在返回…',
}