<template>
  <view class="manual-viewer">
    <PageHeader :title="currentTitle || '文档查看'">
      <text class="search-btn" @click="goSearch">🔍</text>
    </PageHeader>

    <view v-if="loading" class="loading">加载中...</view>
    <view v-else-if="error" class="error">{{ error }}</view>
    <scroll-view v-else scroll-y class="markdown-body" :scroll-top="scrollTop">
      <view ref="contentRef" v-html="renderedHtml"></view>

      <view class="doc-nav">
        <view v-if="prevDoc" class="nav-btn prev" @click="goDoc(prevDoc)">← 上一篇</view>
        <view v-if="nextDoc" class="nav-btn next" @click="goDoc(nextDoc)">下一篇 →</view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import PageHeader from '../../src/components/PageHeader.vue'
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ html: true, linkify: true })

// token 级拦截：把 .md 链接的 <a> 改成 <span data-doc>
// 把 # 锚点链接改成 <span data-anchor>，避免修改 URL hash 破坏 uni-app 路由
const linkStack = []
const defaultLinkOpen = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options)
}

// slugify：把标题文本转成可用的 id（与 markdown 锚点 #xxx 对应）
// 保留中文、字母、数字、连字符，去掉点和空格等
function slugify(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')        // 空格转连字符
    .replace(/[.)]/g, '')         // 去掉点和右括号（"1. xxx" → "1-xxx"）
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')  // 保留字母数字下划线、中文、连字符
}

// 给标题加 id，使 #锚点 能定位到对应标题
md.renderer.rules.heading_open = function(tokens, idx, options, env, self) {
  const token = tokens[idx]
  const next = tokens[idx + 1]
  if (next && next.type === 'inline') {
    const id = slugify(next.content)
    if (id) token.attrSet('id', id)
  }
  return self.renderToken(tokens, idx, options)
}

md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
  const token = tokens[idx]
  const hrefIndex = token.attrIndex('href')
  if (hrefIndex >= 0) {
    const href = token.attrs[hrefIndex][1]
    // 1) .md 文档互跳
    if (/\.md(\?|#|$)/.test(href)) {
      const resolved = resolveDocPath(href)
      if (resolved) {
        linkStack.push(true)
        return `<span class="doc-link" data-doc="${resolved}">`
      }
    }
    // 2) # 同文档锚点：转 span，避免浏览器修改 URL hash 破坏 uni-app 路由
    if (href.startsWith('#')) {
      const anchor = href.slice(1)
      linkStack.push(true)
      return `<span class="doc-anchor" data-anchor="${anchor}">`
    }
  }
  // 3) 外部链接：新窗口打开
  linkStack.push(false)
  token.attrPush(['target', '_blank'])
  token.attrPush(['rel', 'noopener'])
  return self.renderToken(tokens, idx, options)
}
md.renderer.rules.link_close = function(tokens, idx, options, env, self) {
  const isDocLink = linkStack.pop()
  if (isDocLink) return '</span>'
  return self.renderToken(tokens, idx, options)
}

const docs = import.meta.glob('../../../docs/manual/**/*.md', { as: 'raw', eager: true })

const currentDoc = ref('')
const content = ref('')
const loading = ref(true)
const error = ref('')
const scrollTop = ref(0)
const contentRef = ref(null)

const renderedHtml = computed(() => md.render(content.value))
const currentTitle = computed(() => {
  const line = content.value.split('\n').find(l => l.startsWith('#'))
  return line ? line.replace(/^#+\s*/, '') : ''
})

const prevDoc = computed(() => {
  const order = getIndexOrder()
  const idx = order.indexOf(currentDoc.value)
  return idx > 0 ? order[idx - 1] : null
})

const nextDoc = computed(() => {
  const order = getIndexOrder()
  const idx = order.indexOf(currentDoc.value)
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null
})

function getIndexOrder() {
  const keys = Object.keys(docs)
  const findDoc = (target) => {
    const key = keys.find(k => k.endsWith(target))
    return key ? docs[key] : null
  }
  const adminIndex = findDoc('docs/manual/admin/index.md')
  const shaoIndex = findDoc('docs/manual/shao-catalog/index.md')
  const userIndex = findDoc('docs/manual/user-guide/index.md')
  const order = []
  const extractLinks = (raw) => {
    if (!raw) return
    const re = /\[([^\]]+)\]\(([^)]+\.md)\)/g
    let m
    while ((m = re.exec(raw)) !== null) {
      order.push(m[2])
    }
  }
  extractLinks(adminIndex)
  extractLinks(shaoIndex)
  extractLinks(userIndex)
  return order
}

function loadDoc(docPath) {
  loading.value = true
  error.value = ''
  const keys = Object.keys(docs)
  const key = keys.find(k => k.endsWith(`docs/manual/${docPath}`))
  const raw = key ? docs[key] : null
  if (!raw) {
    error.value = `文档不存在: ${docPath}`
    loading.value = false
    return
  }
  content.value = raw
  currentDoc.value = docPath
  loading.value = false
  scrollTop.value = 0
}

onLoad((opts) => {
  const doc = opts.doc ? decodeURIComponent(opts.doc) : 'admin/index.md'
  loadDoc(doc)
})

function goSearch() {
  uni.navigateTo({ url: '/pages/manual/search' })
}

// 直接更新内容，不跳转页面，最稳
function goDoc(doc) {
  loadDoc(doc)
}

function onDocClick(e) {
  // 1) 文档互跳
  const docTarget = e.target.closest && e.target.closest('[data-doc]')
  if (docTarget) {
    const doc = docTarget.getAttribute('data-doc')
    if (doc) {
      e.preventDefault()
      goDoc(doc)
      return
    }
  }
  // 2) 同文档锚点定位（不修改 URL hash，避免破坏 uni-app 路由）
  const anchorTarget = e.target.closest && e.target.closest('[data-anchor]')
  if (anchorTarget) {
    const anchor = anchorTarget.getAttribute('data-anchor')
    if (anchor) {
      e.preventDefault()
      scrollToAnchor(anchor)
    }
  }
}

// 在 scroll-view 内滚动到对应 id 的标题元素
function scrollToAnchor(anchor) {
  nextTick(() => {
    const container = contentRef.value?.$el || contentRef.value
    if (!container) return
    // 先按精确 id 查
    let el = container.querySelector(`#${CSS.escape(anchor)}`)
    // 再按模糊匹配（slugify 后可能与锚点有细微差异）
    if (!el) {
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
      for (const h of headings) {
        if (slugify(h.textContent) === anchor) { el = h; break }
      }
    }
    if (el) {
      // scroll-view 内部用 scrollIntoView 即可触发滚动
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

function bindClick() {
  nextTick(() => {
    const el = contentRef.value?.$el || contentRef.value
    if (el && el.addEventListener) {
      el.addEventListener('click', onDocClick)
    }
  })
}

onMounted(() => {
  bindClick()
})

onBeforeUnmount(() => {
  const el = contentRef.value?.$el || contentRef.value
  if (el && el.removeEventListener) {
    el.removeEventListener('click', onDocClick)
  }
})

function resolveDocPath(href) {
  let path = href.split(/[?#]/)[0]
  if (!path.endsWith('.md')) return null
  if (path.startsWith('/')) path = path.slice(1)
  if (/^(admin|shao-catalog|user-guide)\//.test(path)) return path
  const dir = currentDoc.value.split('/').slice(0, -1).join('/')
  return dir ? `${dir}/${path}` : path
}
</script>

<style scoped>
.manual-viewer { height: 100vh; display: flex; flex-direction: column; padding-bottom: 0; }
.search-btn { font-size: 32rpx; padding: 0 16rpx; }

.loading, .error { padding: 80rpx; text-align: center; color: #909399; }

.markdown-body {
  flex: 1;
  padding: 32rpx;
  background: #fff;
}
.markdown-body :deep(h1) { font-size: 40rpx; font-weight: 700; margin: 24rpx 0 16rpx; color: #303133; }
.markdown-body :deep(h2) { font-size: 34rpx; font-weight: 600; margin: 24rpx 0 12rpx; color: #303133; }
.markdown-body :deep(h3) { font-size: 30rpx; font-weight: 600; margin: 16rpx 0 8rpx; color: #303133; }
.markdown-body :deep(p) { font-size: 28rpx; line-height: 1.7; color: #606266; margin: 12rpx 0; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { padding-left: 40rpx; margin: 12rpx 0; }
.markdown-body :deep(li) { font-size: 28rpx; line-height: 1.7; color: #606266; }
.markdown-body :deep(code) { background: #f5f7fa; padding: 2rpx 8rpx; border-radius: 4rpx; font-family: monospace; font-size: 26rpx; }
.markdown-body :deep(pre) { background: #f5f7fa; padding: 16rpx; border-radius: 8rpx; overflow-x: auto; margin: 16rpx 0; }
.markdown-body :deep(table) { width: 100%; border-collapse: collapse; margin: 16rpx 0; }
.markdown-body :deep(th), .markdown-body :deep(td) { border: 1rpx solid #dcdfe6; padding: 8rpx 12rpx; font-size: 26rpx; }
.markdown-body :deep(th) { background: #f5f7fa; font-weight: 600; }
.markdown-body :deep(a) { color: #409eff; text-decoration: underline; }
.markdown-body :deep(.doc-link) { color: #409eff; text-decoration: underline; }
.markdown-body :deep(.doc-anchor) { color: #409eff; text-decoration: underline; cursor: pointer; }
.markdown-body :deep(blockquote) { border-left: 4rpx solid #dcdfe6; padding-left: 16rpx; color: #909399; margin: 16rpx 0; }

.doc-nav { display: flex; justify-content: space-between; padding: 32rpx 0; border-top: 1rpx solid #e4e7ed; margin-top: 32rpx; }
.nav-btn { padding: 16rpx 24rpx; background: #f5f7fa; border-radius: 8rpx; font-size: 26rpx; color: #606266; }
.nav-btn.next { margin-left: auto; }
</style>
