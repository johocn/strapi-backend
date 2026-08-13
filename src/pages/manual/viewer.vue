<template>
  <view class="manual-viewer">
    <PageHeader :title="currentTitle || '文档查看'">
      <text class="search-btn" @click="goSearch">🔍</text>
    </PageHeader>

    <view v-if="loading" class="loading">加载中...</view>
    <view v-else-if="error" class="error">{{ error }}</view>
    <scroll-view v-else scroll-y class="markdown-body" :scroll-top="scrollTop">
      <view class="markdown-inner">
        <view ref="contentRef" v-html="renderedHtml"></view>

        <view class="doc-nav">
          <view v-if="prevDoc" class="nav-btn prev" @click="goDoc(prevDoc)">
            <text class="nav-arrow">←</text>
            <text class="nav-label">上一章</text>
          </view>
          <view v-if="nextDoc" class="nav-btn next" @click="goDoc(nextDoc)">
            <text class="nav-label">下一章</text>
            <text class="nav-arrow">→</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view v-if="!loading && !error" class="toc-float-btn" @click="tocVisible = true">
      <text class="toc-float-icon">≡</text>
    </view>

    <!-- 目录弹出面板 -->
    <view v-if="tocVisible" class="toc-overlay" @click="tocVisible = false">
      <view class="toc-panel" @click.stop>
        <view class="toc-header">
          <text class="toc-title">目录</text>
          <text class="toc-close" @click="tocVisible = false">✕</text>
        </view>
        <scroll-view scroll-y class="toc-list">
          <view
            v-for="(item, i) in tocItems"
            :key="i"
            class="toc-item"
            :class="{ 'toc-item-active': item.active }"
            :style="{ paddingLeft: (item.level - 1) * 16 + 'px' }"
            @click="scrollToAnchor(item.anchor); tocVisible = false"
          >
            <text>{{ item.title }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import PageHeader from '../../components/PageHeader.vue'
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

const docs = import.meta.glob('../../../docs/manual/**/*.{md,html}', { as: 'raw', eager: true })

const currentDoc = ref('')
const content = ref('')
const loading = ref(true)
const error = ref('')
const scrollTop = ref(0)
const contentRef = ref(null)
const tocVisible = ref(false)
const tocItems = ref([])

const renderedHtml = computed(() => {
  if (currentDoc.value.endsWith('.html')) {
    return content.value
  }
  return md.render(content.value)
})
const currentTitle = computed(() => {
  if (currentDoc.value.endsWith('.html')) {
    const m = content.value.match(/<title>([^<]*)<\/title>/)
    return m ? m[1].trim() : ''
  }
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
  const dir = currentDoc.value.split('/')[0]
  const indexKey = Object.keys(docs).find(k => 
    k.endsWith(`docs/manual/${dir}/index.md`) || k.endsWith(`docs/manual/${dir}/index.html`)
  )
  if (!indexKey) return []
  const raw = docs[indexKey]
  const order = []
  const re = /\[([^\]]+)\]\(([^)]+\.(?:md|html))\)/g
  let m
  while ((m = re.exec(raw)) !== null) {
    order.push(`${dir}/${m[2]}`)
  }
  if (indexKey.endsWith('.html')) {
    const re2 = /window\._goDoc\s*(?:&&\s*window\._goDoc\s*)?\(\s*['"]([^'"]+)['"]\s*\)/g
    let m2
    while ((m2 = re2.exec(raw)) !== null) {
      order.push(m2[1])
    }
  }
  return order
}

function buildToc() {
  if (!content.value) return
  const raw = content.value
  if (currentDoc.value.endsWith('.html')) {
    const items = []
    const h2s = [...raw.matchAll(/<h2[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/h2>/g)]
    for (const m of h2s) {
      items.push({ level: 1, anchor: m[1], title: m[2].replace(/<[^>]+>/g, '').trim(), active: false })
    }
    const h3s = [...raw.matchAll(/<h3[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/h3>/g)]
    for (const m of h3s) {
      items.push({ level: 2, anchor: m[1], title: m[2].replace(/<[^>]+>/g, '').trim(), active: false })
    }
    tocItems.value = items
  } else {
    const items = []
    const lines = content.value.split('\n')
    for (const line of lines) {
      const h2 = line.match(/^##\s+(.+)/)
      if (h2) items.push({ level: 1, anchor: slugify(h2[1]), title: h2[1].trim(), active: false })
      const h3 = line.match(/^###\s+(.+)/)
      if (h3) items.push({ level: 2, anchor: slugify(h3[1]), title: h3[1].trim(), active: false })
    }
    tocItems.value = items
  }
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
  buildToc()
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
  window._goDoc = goDoc
})

onBeforeUnmount(() => {
  const el = contentRef.value?.$el || contentRef.value
  if (el && el.removeEventListener) {
    el.removeEventListener('click', onDocClick)
  }
  delete window._goDoc
})

function resolveDocPath(href) {
  let path = href.split(/[?#]/)[0]
  if (!path.endsWith('.md') && !path.endsWith('.html')) return null
  if (path.startsWith('/')) path = path.slice(1)
  if (/^(admin|shao-catalog|user-guide|website|sso-login|ad-site|poster)\//.test(path)) return path
  const dir = currentDoc.value.split('/').slice(0, -1).join('/')
  return dir ? `${dir}/${path}` : path
}
</script>

<style scoped>
.manual-viewer { position: relative; height: 100vh; display: flex; flex-direction: column; padding-bottom: 0; }
.search-btn { font-size: 32rpx; padding: 0 16rpx; }

.loading, .error { padding: 80rpx; text-align: center; color: #909399; }

.markdown-body {
  flex: 1;
  background: #fff;
}
.markdown-inner {
  padding: 32rpx 40rpx 32rpx 32rpx;
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

.doc-nav { display: flex; justify-content: space-between; padding: 24rpx 0; border-top: 1rpx solid #e4e7ed; margin-top: 24rpx; }
.nav-btn { display: flex; align-items: center; gap: 8rpx; padding: 12rpx 24rpx; background: #f5f7fa; border-radius: 8rpx; font-size: 26rpx; color: #606266; }
.nav-btn.next { margin-left: auto; }
.nav-arrow { font-size: 28rpx; }
.nav-label { font-size: 26rpx; }

.toc-float-btn {
  position: absolute; right: 20rpx; bottom: 100rpx;
  width: 88rpx; height: 88rpx;
  background: #1a56db; border-radius: 16rpx;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4rpx 20rpx rgba(26,86,219,0.3); z-index: 100;
}
.toc-float-icon { font-size: 40rpx; color: #fff; font-weight: 700; }

.toc-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4); z-index: 200;
  display: flex; align-items: flex-end;
}
.toc-panel { width: 100%; max-height: 60vh; background: #fff; border-radius: 24rpx 24rpx 0 0; display: flex; flex-direction: column; }
.toc-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 32rpx; border-bottom: 1rpx solid #e4e7ed; }
.toc-title { font-size: 32rpx; font-weight: 700; color: #303133; }
.toc-close { font-size: 36rpx; color: #909399; padding: 8rpx; }
.toc-list { flex: 1; padding: 16rpx 0; }
.toc-item { padding: 16rpx 32rpx; font-size: 28rpx; color: #606266; border-left: 4rpx solid transparent; }
.toc-item-active { color: #1a56db; border-left-color: #1a56db; font-weight: 600; }

/* ===== 特殊容器样式（官网使用手册） ===== */
.markdown-body :deep(.field-card) { border: 1rpx solid #e4e7ed; border-radius: 12rpx; margin: 20rpx 0; overflow: hidden; }
.markdown-body :deep(.field-card-header) { display: flex; align-items: center; flex-wrap: wrap; gap: 8rpx; padding: 16rpx 20rpx; background: #f5f7fa; border-bottom: 1rpx solid #e4e7ed; }
.markdown-body :deep(.field-name) { font-size: 30rpx; font-weight: 700; color: #303133; font-family: monospace; }
.markdown-body :deep(.field-type) { font-size: 24rpx; color: #909399; font-family: monospace; }
.markdown-body :deep(.field-card-body) { padding: 16rpx 20rpx; display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; }
.markdown-body :deep(.field-meta-item) { background: #fafafa; padding: 12rpx; border-radius: 8rpx; }
.markdown-body :deep(.meta-label) { display: block; font-size: 22rpx; font-weight: 600; color: #909399; margin-bottom: 4rpx; }
.markdown-body :deep(.meta-value) { display: block; font-size: 26rpx; color: #303133; line-height: 1.6; }
.markdown-body :deep(.field-error) { grid-column: 1 / -1; background: #fef2f2; padding: 12rpx; border-radius: 8rpx; border-left: 4rpx solid #ef4444; font-size: 26rpx; color: #991b1b; }
.markdown-body :deep(.callout) { padding: 16rpx 20rpx; border-radius: 12rpx; margin: 20rpx 0; border-left: 6rpx solid; font-size: 26rpx; line-height: 1.7; }
.markdown-body :deep(.callout-info) { background: #eff6ff; border-color: #3b82f6; color: #1e3a5f; }
.markdown-body :deep(.callout-success) { background: #f0fdf4; border-color: #22c55e; color: #14532d; }
.markdown-body :deep(.callout-warning) { background: #fffbeb; border-color: #f59e0b; color: #713f12; }
.markdown-body :deep(.callout-danger) { background: #fef2f2; border-color: #ef4444; color: #991b1b; }
.markdown-body :deep(.callout-title) { font-weight: 700; font-size: 28rpx; margin-bottom: 8rpx; }
.markdown-body :deep(.steps) { list-style: none; counter-reset: step-counter; padding: 0; margin: 20rpx 0; }
.markdown-body :deep(.steps li) { counter-increment: step-counter; padding: 12rpx 12rpx 12rpx 56rpx; position: relative; font-size: 28rpx; line-height: 1.7; color: #606266; border-left: 2rpx solid #e4e7ed; margin: 0; }
.markdown-body :deep(.steps li::before) { content: counter(step-counter); position: absolute; left: -14rpx; top: 12rpx; width: 28rpx; height: 28rpx; background: #409eff; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 600; }
.markdown-body :deep(.checklist) { list-style: none; padding: 0; margin: 20rpx 0; }
.markdown-body :deep(.checklist li) { padding: 8rpx 12rpx 8rpx 40rpx; position: relative; font-size: 26rpx; color: #606266; line-height: 1.6; }
.markdown-body :deep(.checklist li::before) { content: '✓'; position: absolute; left: 8rpx; color: #67c23a; font-weight: 700; }
.markdown-body :deep(.case-card) { border: 1rpx solid #e4e7ed; border-radius: 12rpx; margin: 24rpx 0; overflow: hidden; }
.markdown-body :deep(.case-card-header) { padding: 20rpx; background: linear-gradient(135deg, #1a56db, #1e40af); color: #fff; }
.markdown-body :deep(.case-card-header .case-industry) { font-size: 22rpx; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; margin-bottom: 4rpx; }
.markdown-body :deep(.case-card-header .case-title) { font-size: 30rpx; font-weight: 700; }
.markdown-body :deep(.case-card-body) { padding: 20rpx; }
.markdown-body :deep(.badge) { display: inline-block; padding: 2rpx 12rpx; border-radius: 20rpx; font-size: 20rpx; font-weight: 600; line-height: 1.6; }
.markdown-body :deep(.badge-required) { background: #fef2f2; color: #dc2626; }
.markdown-body :deep(.badge-optional) { background: #f5f5f5; color: #909399; }
.markdown-body :deep(.badge-seo) { background: #eff6ff; color: #2563eb; }
.markdown-body :deep(.badge-geo) { background: #f0fdf4; color: #16a34a; }
.markdown-body :deep(.table-wrap) { overflow-x: auto; margin: 16rpx 0; }
.markdown-body :deep(.flow-diagram) { background: #fafafa; border: 1rpx solid #e4e7ed; border-radius: 12rpx; padding: 24rpx; margin: 20rpx 0; }
.markdown-body :deep(.flow-row) { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 12rpx; margin: 8rpx 0; }
.markdown-body :deep(.flow-node) { background: #fff; border: 1rpx solid #dcdfe6; border-radius: 8rpx; padding: 12rpx 20rpx; font-size: 26rpx; color: #303133; text-align: center; min-width: 120rpx; }
.markdown-body :deep(.flow-arrow) { color: #c0c4cc; font-size: 32rpx; }
.markdown-body :deep(.flow-node-primary) { background: #409eff; color: #fff; border-color: #409eff; }
</style>
