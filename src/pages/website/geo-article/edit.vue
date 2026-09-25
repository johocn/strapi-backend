<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑 GEO 文章' : '新增 GEO 文章'">
      <button class="btn-secondary" @click="handleSubmit('draft')" v-if="hasPermission('article.update')">存草稿</button>
      <button class="btn-check" @click="handleAudit" v-if="isEdit && hasPermission('article.read')">发布前检查</button>
      <button class="btn-primary" @click="handleSubmit('published')" v-if="hasPermission('article.publish')">发布</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <!-- 发布前检查结果 -->
      <view class="form-section" v-if="auditResult">
        <view class="section-title">发布前检查{{ auditResult.pass ? ' ✅ 通过' : ' ⚠️ 存在缺漏' }}</view>
        <view class="audit-score" v-if="!auditResult.pass">达标率 {{ Math.round(auditResult.score * 100) }}%</view>
        <view
          v-for="(check, idx) in auditResult.checks"
          :key="idx"
          class="audit-item"
          :class="{ failed: !check.passed }"
        >
          <view class="audit-item-head">
            <text class="audit-icon">{{ check.passed ? '✅' : '❌' }}</text>
            <text class="audit-rule">{{ check.rule }}</text>
            <text class="audit-level" :class="check.level">{{ check.level === 'error' ? '必填' : '建议' }}</text>
          </view>
          <text class="audit-hint" v-if="!check.passed && check.hint">{{ check.hint }}</text>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="form-section">
        <view class="section-title">基本信息</view>

        <view class="form-item">
          <text class="form-label">文章类型 *</text>
          <picker mode="selector" :range="typeOptions" @change="handleTypeChange">
            <view class="form-input picker-value">
              <text>{{ typeOptions[typeIndex] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item" v-if="form.type === 'geo-faq'">
          <text class="form-label">问答标题 *</text>
          <input type="text" v-model="form.faqQuestion" placeholder="FAQ 问题（FAQPage 结构化用）" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">文章编号</text>
          <input type="text" v-model="form.articleNo" placeholder="唯一数字标签（如 JLS-001）" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">分类</text>
          <picker mode="selector" :range="categoryNames" @change="handleCategoryChange">
            <view class="form-input picker-value">
              <text>{{ categoryNames[categoryIndex] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>

      <ArticleBaseForm v-model="form" />

      <!-- 标签与关系背书 -->
      <view class="form-section">
        <view class="section-title">标签与关系背书</view>

        <view class="form-item">
          <text class="form-label">标签</text>
          <view class="chip-group">
            <view
              v-for="tag in tagList"
              :key="tag.id"
              class="chip"
              :class="{ active: form.tags.includes(tag.id) }"
              @click="toggleChip(form.tags, tag.id)"
            >
              <text>{{ tag.name }}</text>
            </view>
            <text v-if="tagList.length === 0" class="chip-empty">暂无标签数据</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">真值声明 *（至少 1 条）</text>
          <view class="chip-group">
            <view
              v-for="item in truthList"
              :key="item.id"
              class="chip"
              :class="{ active: form.truthBasis.includes(item.id) }"
              @click="toggleChip(form.truthBasis, item.id)"
            >
              <text>{{ item.claim || `真值 #${item.id}` }}</text>
            </view>
            <text v-if="truthList.length === 0" class="chip-empty">暂无真值声明，请先在「第一真值」中创建</text>
          </view>
          <view v-if="selectedTruths.length" class="section-bind">
            <view v-for="item in selectedTruths" :key="item.id" class="section-bind-row">
              <text class="section-bind-claim">{{ item.claim }}</text>
              <picker mode="selector" :range="sectionOptions" @change="(e) => setTruthSection(item, sectionOptions[e.detail.value])">
                <view class="form-input picker-value">
                  <text>{{ sectionMap[item.claimKey] || '选择绑定段落' }}</text>
                  <text class="arrow">▼</text>
                </view>
              </picker>
            </view>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">知识实体 *（至少 1 个）</text>
          <view class="chip-group">
            <view
              v-for="item in entityList"
              :key="item.id"
              class="chip"
              :class="{ active: form.mentionedEntities.includes(item.id) }"
              @click="toggleChip(form.mentionedEntities, item.id)"
            >
              <text>{{ item.name }}</text>
            </view>
            <text v-if="entityList.length === 0" class="chip-empty">暂无知识实体，请先在「知识实体」中创建</text>
          </view>
        </view>
      </view>

      <!-- 作者与信源（E-E-A-T） -->
      <view class="form-section">
        <view class="section-title">作者与信源（E-E-A-T 证据链）</view>

        <view class="form-item">
          <text class="form-label">作者档案（与作者名二选一）</text>
          <picker mode="selector" :range="authorNames" @change="handleAuthorChange">
            <view class="form-input picker-value">
              <text>{{ authorNames[authorIndex] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">作者名</text>
          <input type="text" v-model="form.authorName" placeholder="未选作者档案时填作者名" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">作者简介（E-E-A-T 背书）</text>
          <textarea v-model="form.authorBio" placeholder="作者从业背景简介" class="form-textarea" />
        </view>

        <view class="form-item">
          <text class="form-label">权威来源名称 / URL *（二选一）</text>
          <input type="text" v-model="form.sourceName" placeholder="来源名称，如：吉林省统计局" class="form-input" />
          <input type="text" v-model="form.sourceUrl" placeholder="来源 URL（公开信源链接）" class="form-input" style="margin-top: 12rpx;" />
        </view>

        <view class="form-item">
          <text class="form-label">来源发布时间</text>
          <input type="text" v-model="form.sourcePublishedAt" placeholder="YYYY-MM-DD" class="form-input" />
        </view>
      </view>

      <!-- 核心三模块 -->
      <view class="form-section">
        <view class="section-title">核心三模块（GEO 必填）</view>

        <view class="form-item">
          <text class="form-label">知识点总结 *</text>
          <textarea v-model="form.summaryPoints" placeholder="总结知识点，可直接用于 AI 引用" class="form-textarea" />
        </view>

        <view class="form-item">
          <text class="form-label">本地注意事项 *</text>
          <textarea v-model="form.localTips" placeholder="吉林本地注意事项/场景" class="form-textarea" />
        </view>

        <view class="form-item">
          <text class="form-label">信息边界说明 *</text>
          <textarea v-model="form.infoBoundary" placeholder="统计范围/适用场景/局限性" class="form-textarea" />
        </view>
      </view>

      <!-- 类型专项 -->
      <view class="form-section" v-if="typeSpecificTitle">
        <view class="section-title">{{ typeSpecificTitle }}</view>

        <view class="form-item" v-if="form.type === 'local-report'">
          <text class="form-label">业务数据（JSON 数组，period/content/caliber）</text>
          <textarea v-model="jsonFields.businessData" placeholder='[{"period":"2024","content":"...","caliber":"..."}]' class="form-textarea json-textarea" />
        </view>

        <view class="form-item" v-if="form.type === 'local-comparison'">
          <text class="form-label">对比评分维度（JSON，dimension/items）</text>
          <textarea v-model="jsonFields.comparisonData" placeholder='[{"dimension":"价格","items":[{"name":"A","score":4,"note":"..."}]}]' class="form-textarea json-textarea" />
        </view>

        <view class="form-item" v-if="form.type === 'local-list'">
          <text class="form-label">清单条目（JSON，name/desc/price/link）</text>
          <textarea v-model="jsonFields.listItems" placeholder='[{"name":"...","desc":"...","price":"...","link":"..."}]' class="form-textarea json-textarea" />
        </view>

        <view class="form-item">
          <text class="form-label">服务范围（本地履约信息）</text>
          <textarea v-model="form.serviceScope" placeholder="服务区县/自提仓库/线下咨询地址/配送范围" class="form-textarea" />
        </view>

        <view class="form-item">
          <text class="form-label">案例内容（仅客观事实，禁止收益承诺）</text>
          <textarea v-model="form.caseContent" placeholder="案例客观描述" class="form-textarea" />
        </view>
      </view>

      <!-- 结构化与 SEO -->
      <view class="form-section">
        <view class="section-title">结构化数据与 SEO</view>

        <view class="form-item">
          <text class="form-label">JSON-LD 类型 *</text>
          <picker mode="selector" :range="jsonLdOptions" @change="handleJsonLdChange">
            <view class="form-input picker-value">
              <text>{{ form.jsonLdType }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
          <text class="field-tip">geo-faq→FAQPage，local-list/local-comparison→ItemList，local-report→Article/LocalBusiness，geo-article→Article</text>
        </view>

        <view class="form-item">
          <text class="form-label">meta 标题（≤60 字符）</text>
          <input type="text" v-model="form.metaTitle" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">meta 描述（≤160 字符，建议含吉林本地场景词）</text>
          <textarea v-model="form.metaDescription" class="form-textarea" />
        </view>

        <view class="form-item">
          <text class="form-label">内部锚文本（JSON，text/url，1-2 处）</text>
          <textarea v-model="jsonFields.internalLinks" placeholder='[{"text":"锚文本","url":"/path"}]' class="form-textarea json-textarea" />
        </view>
      </view>

      <!-- 转化与运营 -->
      <view class="form-section">
        <view class="section-title">转化与运营</view>

        <view class="form-item">
          <text class="form-label">文末 CTA</text>
          <picker mode="selector" :range="ctaOptions" @change="handleCtaChange">
            <view class="form-input picker-value">
              <text>{{ ctaOptions[ctaIndex] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item form-row">
          <text class="form-label">留资表单</text>
          <switch :checked="form.leadFormEnabled" @change="form.leadFormEnabled = !form.leadFormEnabled" />
        </view>

        <view class="form-item">
          <text class="form-label">Vendure 商品列表 ID</text>
          <input type="text" v-model="form.vendureProductListId" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">阅读发放积分</text>
          <input type="number" v-model="form.readPoints" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">小程序跳转路径</text>
          <input type="text" v-model="form.miniProgramPath" class="form-input" />
        </view>
      </view>

      <!-- 合规与审核 -->
      <view class="form-section">
        <view class="section-title">合规与审核</view>

        <view class="form-item">
          <text class="form-label">风险类型 *</text>
          <picker mode="selector" :range="riskTypeNames" @change="handleRiskTypeChange">
            <view class="form-input picker-value">
              <text>{{ riskTypeNames[riskTypeIndex] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">风险免责附加文本</text>
          <textarea v-model="form.riskDisclaimer" placeholder="默认模板可微调" class="form-textarea" />
        </view>

        <view class="form-item">
          <text class="form-label">验收勾选 *（四类全勾）</text>
          <view class="check-group">
            <view v-for="c in reviewCheckOptions" :key="c.key" class="check-item" @click="toggleReviewCheck(c.key)">
              <text class="check-box" :class="{ active: form.reviewChecks[c.key] }">{{ form.reviewChecks[c.key] ? '☑' : '☐' }}</text>
              <text class="check-label">{{ c.label }}</text>
            </view>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">审核人 *</text>
          <input type="text" v-model="form.reviewerName" placeholder="验收人姓名" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">审核日期 *</text>
          <input type="text" v-model="form.reviewedAt" placeholder="YYYY-MM-DD" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">上线备注</text>
          <textarea v-model="form.reviewNote" class="form-textarea" />
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  geoArticleApi,
  authorApi,
  articleCategoryApi,
  firstTruthApi,
  knowledgeGraphApi,
} from '../../../api/website.js'
import { getTagList } from '../../../api/tag.js'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'
import ArticleBaseForm from '../../../components/ArticleBaseForm.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const documentId = ref('')
const isEdit = computed(() => !!documentId.value)

const typeOptions = ['GEO 文章', 'GEO 问答', '本地报告', '本地对比', '本地清单']
const typeValues = ['geo-article', 'geo-faq', 'local-report', 'local-comparison', 'local-list']
const typeIndex = ref(0)

const TYPE_JSONLD_MAP = {
  'geo-faq': 'FAQPage',
  'local-list': 'ItemList',
  'local-comparison': 'ItemList',
  'local-report': 'Article',
  'geo-article': 'Article',
}

const jsonLdOptions = ['Article', 'FAQPage', 'LocalBusiness', 'ItemList']
const ctaOptions = ['不展示', '本地选购清单下载', '本地一对一咨询预约']
const ctaValues = ['none', 'download-list', 'consult-appointment']

const riskTypeValues = [
  'none', 'finance-general', 'finance-stock', 'finance-fund', 'finance-bond',
  'finance-wealth', 'finance-futures', 'finance-precious-metals', 'finance-forex',
  'finance-trust', 'finance-convertible-bond', 'finance-hk-us-stock', 'finance-index',
  'finance-insurance', 'finance-otc', 'finance-reverse-repo', 'finance-cd',
  'health', 'legal', 'other',
]
const RISK_TYPE_NAMES = {
  none: '无（none）',
  'finance-general': '金融·综合',
  'finance-stock': '金融·股票',
  'finance-fund': '金融·基金',
  'finance-bond': '金融·债券',
  'finance-wealth': '金融·理财',
  'finance-futures': '金融·期货',
  'finance-precious-metals': '金融·贵金属',
  'finance-forex': '金融·外汇',
  'finance-trust': '金融·信托',
  'finance-convertible-bond': '金融·可转债',
  'finance-hk-us-stock': '金融·港股美股',
  'finance-index': '金融·指数',
  'finance-insurance': '金融·保险',
  'finance-otc': '金融·OTC',
  'finance-reverse-repo': '金融·逆回购',
  'finance-cd': '金融·存单',
  health: '健康医疗',
  legal: '法律',
  other: '其他',
}
const riskTypeNames = riskTypeValues.map((v) => RISK_TYPE_NAMES[v] || v)

const reviewCheckOptions = [
  { key: 'eaat', label: 'E-E-A-T 自查' },
  { key: 'tech', label: '技术合规自查' },
  { key: 'compliance', label: '合规审查自查' },
  { key: 'business', label: '业务转化自查' },
]

const form = ref({
  title: '',
  slug: '',
  type: 'geo-article',
  faqQuestion: '',
  content: '',
  articleNo: '',
  category: null,
  tags: [],
  truthBasis: [],
  truthBasisSections: [],
  mentionedEntities: [],
  author: null,
  authorName: '',
  authorBio: '',
  sourceName: '',
  sourceUrl: '',
  sourcePublishedAt: '',
  summaryPoints: '',
  localTips: '',
  infoBoundary: '',
  serviceScope: '',
  caseContent: '',
  jsonLdType: 'Article',
  metaTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  allowIndex: true,
  noFollow: false,
  ctaType: 'none',
  leadFormEnabled: false,
  vendureProductListId: '',
  readPoints: 0,
  miniProgramPath: '',
  riskType: 'none',
  riskDisclaimer: '',
  reviewChecks: { eaat: false, tech: false, compliance: false, business: false },
  reviewerName: '',
  reviewedAt: '',
  reviewNote: '',
  status: 'draft',
})

const jsonFields = ref({
  businessData: '',
  comparisonData: '',
  listItems: '',
  internalLinks: '',
})

const typeSpecificTitle = computed(() => ({
  'local-report': '报告数据',
  'local-comparison': '对比数据',
  'local-list': '清单数据',
}[form.value.type] || ''))

const tagList = ref([])
const truthList = ref([])
const entityList = ref([])
const categoryList = ref([])
const authorList = ref([])

const categoryNames = computed(() => ['未选择', ...categoryList.value.map(c => c.name)])
const categoryIndex = computed(() => {
  const idx = categoryList.value.findIndex(c => c.id === form.value.category)
  return idx >= 0 ? idx + 1 : 0
})
const authorNames = computed(() => ['未选择', ...authorList.value.map(a => a.name)])
const authorIndex = computed(() => {
  const idx = authorList.value.findIndex(a => a.id === form.value.author)
  return idx >= 0 ? idx + 1 : 0
})
const riskTypeIndex = computed(() => {
  const idx = riskTypeValues.indexOf(form.value.riskType)
  return idx >= 0 ? idx : 0
})
const ctaIndex = computed(() => {
  const idx = ctaValues.indexOf(form.value.ctaType)
  return idx >= 0 ? idx : 0
})

const auditResult = ref(null)

function handleTypeChange(e) {
  typeIndex.value = e.detail.value
  form.value.type = typeValues[typeIndex.value]
  // 类型联动：结构化类型按手册映射给默认值
  form.value.jsonLdType = TYPE_JSONLD_MAP[form.value.type] || 'Article'
}

function handleCategoryChange(e) {
  const idx = Number(e.detail.value)
  form.value.category = idx > 0 ? categoryList.value[idx - 1]?.id : null
}

function handleAuthorChange(e) {
  const idx = Number(e.detail.value)
  form.value.author = idx > 0 ? authorList.value[idx - 1]?.id : null
}

function handleJsonLdChange(e) {
  form.value.jsonLdType = jsonLdOptions[e.detail.value]
}

function handleCtaChange(e) {
  form.value.ctaType = ctaValues[e.detail.value]
}

function handleRiskTypeChange(e) {
  form.value.riskType = riskTypeValues[e.detail.value]
}

function toggleChip(list, id) {
  const idx = list.indexOf(id)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(id)
}

function toggleReviewCheck(key) {
  form.value.reviewChecks[key] = !form.value.reviewChecks[key]
}

async function loadOptions() {
  try {
    const [tags, cats, authors, truths, entities] = await Promise.all([
      getTagList({ pageSize: 200 }),
      articleCategoryApi.list({ pageSize: 200 }),
      authorApi.list({ pageSize: 200 }),
      firstTruthApi.list({ pageSize: 200 }),
      knowledgeGraphApi.listEntities({ pageSize: 200 }),
    ])
    tagList.value = tags.list || []
    categoryList.value = cats.list || []
    authorList.value = authors.list || []
    truthList.value = truths.list || []
    entityList.value = entities.list || []
  } catch (e) {
    uni.showToast({ title: '选项加载失败', icon: 'none' })
  }
}

function parseJson(str, fallback) {
  if (!str || !str.trim()) return fallback
  try {
    return JSON.parse(str)
  } catch (e) {
    return undefined
  }
}

// 从正文 content 提取 H2/H3 标题作为可绑定段落（含「开篇」「结语」）
const BASE_SECTIONS = ['开篇', '结语']
function extractContentSections(content) {
  const re = /<h([23])[^>]*>(.*?)<\/h\1>/gi
  const out = []
  let m
  while ((m = re.exec(content || '')) !== null) {
    const text = m[2].replace(/<[^>]+>/g, '').trim()
    if (text) out.push(text)
  }
  return out
}
const sectionOptions = computed(() => {
  const fromBody = extractContentSections(form.value.content || '')
  return [...BASE_SECTIONS, ...fromBody]
})
const sectionMap = ref({})
watch(() => form.value.truthBasisSections, (list) => {
  const map = {}
  for (const s of list || []) if (s && s.claimKey) map[s.claimKey] = s.section
  sectionMap.value = map
}, { immediate: true })
function setTruthSection(item, section) {
  const key = item.claimKey
  const list = [...form.value.truthBasisSections]
  const idx = list.findIndex(s => s && s.claimKey === key)
  if (section) {
    const entry = { claimKey: key, section }
    if (idx >= 0) list[idx] = entry; else list.push(entry)
  } else if (idx >= 0) {
    list.splice(idx, 1)
  }
  form.value.truthBasisSections = list
}
const selectedTruths = computed(() =>
  truthList.value.filter(t => form.value.truthBasis.includes(t.id))
)

async function loadDetail() {
  if (!documentId.value) return
  try {
    const item = await geoArticleApi.detail(documentId.value)
    if (!item) return
    const typeIdx = typeValues.indexOf(item.type)
    typeIndex.value = typeIdx >= 0 ? typeIdx : 0
    form.value = {
      title: item.title || '',
      slug: item.slug || '',
      type: item.type || 'geo-article',
      faqQuestion: item.faqQuestion || '',
      content: item.content || '',
      articleNo: item.articleNo || '',
      category: item.category?.id ?? null,
      tags: (item.tags || []).map(t => t.id),
      truthBasis: (item.truthBasis || []).map(t => t.id),
      truthBasisSections: (item.truthBasisSections || []).filter(s => s && s.claimKey),
      mentionedEntities: (item.mentionedEntities || []).map(e => e.id),
      author: item.author?.id ?? null,
      authorName: item.authorName || '',
      authorBio: item.authorBio || '',
      sourceName: item.sourceName || '',
      sourceUrl: item.sourceUrl || '',
      sourcePublishedAt: item.sourcePublishedAt || '',
      summaryPoints: item.summaryPoints || '',
      localTips: item.localTips || '',
      infoBoundary: item.infoBoundary || '',
      serviceScope: item.serviceScope || '',
      caseContent: item.caseContent || '',
      jsonLdType: item.jsonLdType || 'Article',
      metaTitle: item.metaTitle || '',
      metaDescription: item.metaDescription || '',
      canonicalUrl: item.canonicalUrl || '',
      allowIndex: item.allowIndex !== false,
      noFollow: item.noFollow === true,
      ctaType: item.ctaType || 'none',
      leadFormEnabled: item.leadFormEnabled === true,
      vendureProductListId: item.vendureProductListId || '',
      readPoints: item.readPoints || 0,
      miniProgramPath: item.miniProgramPath || '',
      riskType: item.riskType || 'none',
      riskDisclaimer: item.riskDisclaimer || '',
      reviewChecks: {
        eaat: !!item.reviewChecks?.eaat,
        tech: !!item.reviewChecks?.tech,
        compliance: !!item.reviewChecks?.compliance,
        business: !!item.reviewChecks?.business,
      },
      reviewerName: item.reviewerName || '',
      reviewedAt: item.reviewedAt || '',
      reviewNote: item.reviewNote || '',
      status: item.status || 'draft',
    }
    jsonFields.value = {
      businessData: Array.isArray(item.businessData) ? JSON.stringify(item.businessData, null, 2) : '',
      comparisonData: Array.isArray(item.comparisonData) ? JSON.stringify(item.comparisonData, null, 2) : '',
      listItems: Array.isArray(item.listItems) ? JSON.stringify(item.listItems, null, 2) : '',
      internalLinks: Array.isArray(item.internalLinks) ? JSON.stringify(item.internalLinks, null, 2) : '',
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function buildPayload() {
  if (!form.value.title) {
    uni.showToast({ title: '请填写标题', icon: 'none' })
    return null
  }
  const jsonFieldsChecked = {
    businessData: parseJson(jsonFields.value.businessData, []),
    comparisonData: parseJson(jsonFields.value.comparisonData, []),
    listItems: parseJson(jsonFields.value.listItems, []),
    internalLinks: parseJson(jsonFields.value.internalLinks, []),
  }
  for (const [key, val] of Object.entries(jsonFieldsChecked)) {
    if (val === undefined) {
      uni.showToast({ title: `「${key}」JSON 格式错误`, icon: 'none' })
      return null
    }
  }
  return {
    ...form.value,
    businessData: jsonFieldsChecked.businessData,
    comparisonData: jsonFieldsChecked.comparisonData,
    listItems: jsonFieldsChecked.listItems,
    internalLinks: jsonFieldsChecked.internalLinks,
  }
}

async function handleSubmit(targetStatus) {
  const payload = buildPayload()
  if (!payload) return
  payload.status = 'draft' // 发布只经 publish 端点触发门禁，这里一律存草稿
  try {
    if (isEdit.value) {
      await geoArticleApi.update(documentId.value, payload)
      if (targetStatus === 'published' && form.value.status !== 'published') {
        await doPublish(documentId.value)
      } else {
        uni.showToast({ title: '已保存', icon: 'success' })
      }
    } else {
      const created = await geoArticleApi.create(payload)
      if (targetStatus === 'published' && created?.documentId) {
        await doPublish(created.documentId)
      } else {
        uni.showToast({ title: '已保存草稿', icon: 'success' })
      }
    }
    if (targetStatus !== 'published') {
      setTimeout(() => uni.navigateBack(), 600)
    }
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

async function doPublish(id) {
  try {
    await geoArticleApi.publish(id)
    uni.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) {
    uni.showModal({
      title: '发布被拦截',
      content: (e.message || '存在未通过的门禁检查项') + '\n点击「发布前检查」查看缺漏项',
      showCancel: false,
      confirmText: '知道了',
    })
  }
}

async function handleAudit() {
  // 检查基于已保存数据：先把当前表单存为草稿，再调 audit-check（否则刚勾选的关系不生效）
  const payload = buildPayload()
  if (!payload) return
  payload.status = 'draft'
  try {
    let id = documentId.value
    if (id) {
      await geoArticleApi.update(id, payload)
    } else {
      const created = await geoArticleApi.create(payload)
      id = created?.documentId
      documentId.value = id || ''
    }
    if (!id) {
      uni.showToast({ title: '保存失败，无法检查', icon: 'none' })
      return
    }
    auditResult.value = await geoArticleApi.auditCheck(id)
  } catch (e) {
    uni.showToast({ title: '检查失败', icon: 'none' })
  }
}

onLoad((options) => {
  loadOptions()
  if (options?.type && typeValues.includes(options.type)) {
    typeIndex.value = typeValues.indexOf(options.type)
    form.value.type = options.type
    form.value.jsonLdType = TYPE_JSONLD_MAP[options.type] || (form.value.jsonLdType || 'Article')
  }
  if (options?.documentId) {
    documentId.value = options.documentId
    loadDetail()
  }
})
</script>

<style scoped>
page {
  background: #f5f5f5;
}
.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.form-scroll {
  flex: 1;
  padding: 20rpx;
  box-sizing: border-box;
}

.btn-primary {
  background: #ff0000;
  color: #ffffff;
  padding: 16rpx 32rpx;
  font-size: 30rpx;
  border-radius: 8rpx;
  border: none;
  line-height: 1.2;
  margin-left: 12rpx;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
  padding: 16rpx 32rpx;
  font-size: 30rpx;
  border-radius: 8rpx;
  border: none;
  line-height: 1.2;
  margin-left: 12rpx;
}

.btn-check {
  background: #fff3e0;
  color: #faad14;
  padding: 16rpx 32rpx;
  font-size: 30rpx;
  border-radius: 8rpx;
  border: none;
  line-height: 1.2;
  margin-left: 12rpx;
}

.form-section {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
  padding-left: 8rpx;
  border-left: 6rpx solid #ff0000;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.field-tip {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}

.form-input {
  width: 100%;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.picker-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.arrow {
  font-size: 20rpx;
  color: #999;
}

.form-textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.content-textarea {
  min-height: 400rpx;
}

.json-textarea {
  min-height: 200rpx;
  font-family: monospace;
}

.form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.chip {
  padding: 12rpx 24rpx;
  background: #f5f5f5;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #333;
  border: 2rpx solid transparent;
}

.chip.active {
  background: #e8f5e9;
  color: #07c160;
  border-color: #07c160;
}

.chip-empty {
  font-size: 24rpx;
  color: #999;
}

.section-bind {
  margin-top: 16rpx;
}

.section-bind-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx;
  margin-top: 8rpx;
  background: #fafafa;
  border-radius: 8rpx;
}

.section-bind-claim {
  flex: 1;
  font-size: 26rpx;
  color: #333;
}

.check-group {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.check-box {
  font-size: 36rpx;
  color: #999;
}

.check-box.active {
  color: #07c160;
}

.check-label {
  font-size: 28rpx;
  color: #333;
}

.audit-score {
  font-size: 26rpx;
  color: #faad14;
  margin-bottom: 16rpx;
}

.audit-item {
  padding: 16rpx;
  border-radius: 8rpx;
  background: #f6ffed;
  margin-bottom: 12rpx;
}

.audit-item.failed {
  background: #fff2f0;
}

.audit-item-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.audit-icon {
  font-size: 28rpx;
}

.audit-rule {
  flex: 1;
  font-size: 26rpx;
  color: #333;
}

.audit-level {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 4rpx;
}

.audit-level.error {
  background: #ff4d4f;
  color: #fff;
}

.audit-level.warning {
  background: #faad14;
  color: #fff;
}

.audit-hint {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}
</style>
