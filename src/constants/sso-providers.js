// Provider 元数据：图标、主题色、中文名、配置引导
export const SSO_PROVIDERS = [
  {
    value: 'wechat',
    label: '微信',
    color: '#07c160',
    icon: '💚',
    bgColor: '#e8f8ee',
    portalUrl: 'https://mp.weixin.qq.com/',
    guide: {
      appId: '公众号/开放平台/小程序后台「开发→基本配置」获取 AppID',
      appSecret: '同页面「重置」获取 AppSecret，注意 IP 白名单',
    },
  },
  {
    value: 'alipay',
    label: '支付宝',
    color: '#1677ff',
    icon: '💙',
    bgColor: '#e6f4ff',
    portalUrl: 'https://open.alipay.com/',
    guide: {
      appId: 'open.alipay.com「开发者中心→应用」获取 AppID',
      appSecret: '应用私钥（RSA2），用支付宝密钥工具生成',
    },
  },
  {
    value: 'douyin',
    label: '抖音',
    color: '#000000',
    icon: '🖤',
    bgColor: '#f0f0f0',
    portalUrl: 'https://open.douyin.com/',
    guide: {
      appId: 'open.douyin.com「开发者后台→应用」获取 AppKey',
      appSecret: '应用详情页获取 AppSecret',
    },
  },
  {
    value: 'google',
    label: 'Google',
    color: '#4285f4',
    icon: '🔵',
    bgColor: '#e8f0fe',
    portalUrl: 'https://console.cloud.google.com/',
    guide: {
      appId: 'Google Cloud Console「凭据」创建 OAuth Client ID',
      appSecret: '同页面获取 Client Secret',
    },
  },
  {
    value: 'github',
    label: 'GitHub',
    color: '#24292e',
    icon: '🐙',
    bgColor: '#f6f8fa',
    portalUrl: 'https://github.com/settings/developers',
    guide: {
      appId: 'GitHub「Settings→Developer settings→OAuth Apps」创建应用',
      appSecret: '应用详情页生成 Client Secret',
    },
  },
]

export function getProvider(value) {
  return SSO_PROVIDERS.find(p => p.value === value)
}

// 应用类型元数据
export const SSO_APP_TYPES = [
  { value: 'official_account', label: '公众号', desc: '微信浏览器内网页授权' },
  { value: 'open_platform', label: '开放平台', desc: 'PC 扫码登录' },
  { value: 'mini_program', label: '小程序', desc: 'uni.login + jscode2session' },
  { value: 'app', label: 'APP', desc: 'uni.login + oauth2' },
  { value: 'default', label: '默认', desc: '通用 OAuth2' },
]

export function getAppType(value) {
  return SSO_APP_TYPES.find(t => t.value === value)
}
