<template>
  <view class="page-container">
    <PageHeader title="宣传文案设计">
      <view class="btn-group">
        <button class="btn-ghost-h" @click="openPreview = true">预览</button>
        <button class="btn-primary" @click="save">保存</button>
      </view>
    </PageHeader>

    <view v-if="loading" class="loading"><text>加载中...</text></view>

    <template v-else-if="form.title">
      <!-- 活动信息摘要 -->
      <view class="activity-summary">
        <view class="summary-row">
          <text class="summary-title">{{ form.title }}</text>
          <text class="status-badge" :class="statusClass(form.status)">{{ statusText(form.status) }}</text>
        </view>
        <view class="summary-meta">
          <text class="meta-item">🕐 {{ fmtTime(form.startTime) }} ~ {{ fmtTime(form.endTime) }}</text>
          <text class="meta-item">📍 {{ form.venue?.name || form.venueName || '-' }}</text>
        </view>
      </view>

      <view class="scheme-tabs">
        <view class="scheme-tab" :class="{ on: activeScheme === 'ai' }" @click="activeScheme = 'ai'">AI 智能生成</view>
        <view class="scheme-tab" :class="{ on: activeScheme === 'custom' }" @click="activeScheme = 'custom'">完全定制</view>
      </view>

      <template v-if="activeScheme === 'ai'">
      <!-- AI 辅助：生成 / 提示词 / 粘贴导入 -->
      <view class="form-section">
        <view class="section-title">AI 生成宣传文案</view>
        <view class="ai-actions">
          <button class="btn-ai" @click="genByAI" :loading="aiLoading">{{ aiLoading ? '生成中...' : '✨ AI 一键生成' }}</button>
          <button class="btn-ghost" @click="copyPrompt">复制提示词</button>
        </view>
        <text class="form-tip">AI 仅基于下方固定信息生成宣传文案，不会改动时间/场地/讲师/名额等已定内容。</text>

        <view class="form-item">
          <text class="form-label">粘贴 AI 输出 JSON</text>
          <textarea
            v-model="pasteRaw"
            class="form-textarea"
            placeholder="将 AI 生成的宣传 JSON 粘贴到这里（兼容 ```json 代码块），然后点「导入」"
            :auto-height="false"
            maxlength="-1"
          />
          <view class="link-add" @click="applyPaste">导入 JSON 并回填下方宣传字段</view>
        </view>

        <view v-if="suggestTips.length" class="suggest-box">
          <text v-for="(t, i) in suggestTips" :key="i" class="suggest-line">{{ t }}</text>
        </view>
      </view>

      <!-- 活动介绍 -->
      <view class="form-section">
        <view class="section-title">活动介绍（description）</view>
        <view class="form-item">
          <textarea v-model="form.description" class="form-textarea" placeholder="活动介绍文案，展示在宣传页" maxlength="-1" />
        </view>
      </view>

      <!-- 配色方案 -->
      <view class="form-section">
        <view class="section-title">配色方案</view>
        <view class="form-item">
          <text class="form-tip">12 套色卡一键选用，可再微调六色值；未选时使用默认配色</text>
          <view class="palette-grid">
            <view
              v-for="p in PROMO_PALETTES"
              :key="p.key"
              class="palette-card"
              :class="{ on: isPaletteOn(p) }"
              @click="applyPalette(p)"
            >
              <view class="palette-swatch">
                <view class="palette-swatch-main" :style="{ background: p.colors.primary }"></view>
                <view class="palette-swatch-bg" :style="{ background: p.colors.bg }"></view>
                <view class="palette-swatch-card" :style="{ background: p.colors.card }"></view>
                <view class="palette-swatch-accent" :style="{ background: p.colors.accent }"></view>
              </view>
              <text class="palette-name">{{ p.name }}</text>
            </view>
          </view>
          <view v-if="form.promoColors" class="palette-preview" :style="{ background: form.promoColors.bg, color: form.promoColors.text }">
            <view class="palette-preview-chip" :style="{ background: form.promoColors.primary }">主色</view>
            <view class="palette-preview-chip" :style="{ background: form.promoColors.accent }">强调</view>
            <view class="palette-preview-card" :style="{ background: form.promoColors.card, color: form.promoColors.textDim }">卡片</view>
            <text class="palette-preview-text">正文预览</text>
          </view>
          <view v-if="form.promoColors" class="palette-editor">
            <view v-for="(v, k) in form.promoColors" :key="k" class="form-row">
              <text class="palette-key">{{ colorKeyLabel(k) }}</text>
              <input type="text" v-model="form.promoColors[k]" class="form-input form-inline" placeholder="#RRGGBB" />
            </view>
          </view>
        </view>
      </view>

      <!-- 宣传模板（决定配色与默认模块集） -->
      <view class="form-section">
        <view class="section-title">宣传模板</view>
        <view class="form-item">
          <view class="promo-template-row">
            <view
              v-for="t in PROMO_TEMPLATE_OPTIONS"
              :key="t.value"
              class="promo-template-chip"
              :class="{ on: form.promoTemplate === t.value }"
              @click="applyTemplate(t.value)"
            >{{ t.label }}</view>
          </view>
          <text class="form-tip">选择「商户促销」会套用 cover → goods → purpose → notice → info → contact 默认模块序（已有模块会被覆盖）。</text>
        </view>
      </view>

      <!-- 页面模块 -->
      <view class="form-section">
        <view class="section-title">页面模块</view>
        <view class="form-item">
          <view v-for="(m, i) in form.promoModules" :key="i" class="promo-module-row">
            <view class="promo-module-name" @click="toggleModuleConfig(i)">
              <text>{{ PROMO_MODULE_META[m.type]?.name || m.type }}</text>
              <text class="promo-module-arrow">{{ openModuleIndex === i ? '▲' : '▼' }}</text>
            </view>
            <view class="promo-module-ops">
              <text class="link-del" @click="moveModule(i, -1)">上移</text>
              <text class="link-del" @click="moveModule(i, 1)">下移</text>
              <text class="link-del" @click="removeModule(i)">删除</text>
            </view>
            <view v-if="openModuleIndex === i" class="promo-module-config">
              <template v-if="m.type === 'custom'">
                <input type="text" v-model="m.config.title" placeholder="模块标题（可选）" class="form-input" />
                <RichEditor v-model="m.config.html" />
                <view v-for="(img, ii) in m.config.images || []" :key="ii" class="promo-module-image-row">
                  <text class="promo-module-image-name">{{ (img && (img.name || img.url)) || img }}</text>
                  <text class="link-del" @click="m.config.images.splice(ii, 1)">删除</text>
                </view>
                <view class="form-row">
                  <input type="text" v-model="imageUrlInput" placeholder="粘贴网络图片 URL，回车添加" class="form-input form-inline" />
                  <text class="link-add" @click="addImageUrl(m)">添加</text>
                </view>
                <view class="link-add" @click="openImagePicker(m)">+ 从素材库选图</view>
                <text class="form-tip">自定义块用于固定模块无法满足的自由排版：富文本 + 网络图片，C 端按模块顺序渲染。</text>
              </template>
              <template v-else-if="m.type === 'rich'">
                <RichEditor v-model="m.config.html" />
              </template>
              <template v-else-if="m.type === 'cover'">
                <input type="text" v-model="m.config.title" placeholder="主标题" class="form-input" />
                <input type="text" v-model="m.config.subtitle" placeholder="副标题" class="form-input" />
              </template>
              <template v-else-if="m.type === 'highlights'">
                <view v-for="(p, pi) in m.config.points || []" :key="pi" class="form-row">
                  <input type="text" v-model="m.config.points[pi]" placeholder="亮点内容" class="form-input" />
                  <text class="link-del" @click="m.config.points.splice(pi, 1)">删除</text>
                </view>
                <view class="link-add" @click="(m.config.points ||= []).push('')">+ 添加亮点</view>
              </template>
              <template v-else-if="m.type === 'agenda'">
                <view v-for="(it, ii) in m.config.items || []" :key="ii" class="form-row">
                  <input type="text" v-model="m.config.items[ii].t" placeholder="时间" class="form-input form-inline" />
                  <input type="text" v-model="m.config.items[ii].title" placeholder="议程标题" class="form-input form-inline" />
                  <input type="text" v-model="m.config.items[ii].desc" placeholder="描述（可选）" class="form-input form-inline" />
                  <text class="link-del" @click="m.config.items.splice(ii, 1)">删除</text>
                </view>
                <view class="link-add" @click="(m.config.items ||= []).push({ t: '', title: '', desc: '' })">+ 添加条目</view>
              </template>
              <template v-else-if="m.type === 'tour'">
                <input type="text" v-model="form.meetupPoint" placeholder="集合地点（如：人民广场地铁站1号口）" class="form-input" />
                <view class="form-row">
                  <input type="number" v-model="form.minParticipants" placeholder="成团人数（0=不限）" class="form-input form-inline" />
                </view>
                <textarea v-model="form.costIncludes" placeholder="费用包含（如：往返大巴+景区门票+1晚住宿+2正1早）" class="form-textarea"></textarea>
                <textarea v-model="form.costExcludes" placeholder="费用不含（如：个人消费、旅游意外险）" class="form-textarea"></textarea>
                <view class="form-tip">集合地点 / 成团人数 / 费用说明保存在活动字段中（C 端行程模块自动读取）。</view>
                <view v-for="(d, di) in m.config.days || []" :key="di" class="tour-config-day">
                  <view class="form-row">
                    <input type="number" v-model="m.config.days[di].day" placeholder="第几天（1）" class="form-input form-inline tour-day-num" />
                    <input type="text" v-model="m.config.days[di].title" placeholder="当日主题（选填）" class="form-input form-inline" />
                    <text class="link-del" @click="m.config.days.splice(di, 1)">删除本天</text>
                  </view>
                  <view v-for="(s, si) in m.config.days[di].stops || []" :key="si" class="form-row">
                    <input type="text" v-model="m.config.days[di].stops[si].time" placeholder="时间（08:00）" class="form-input form-inline tour-stop-time" />
                    <input type="text" v-model="m.config.days[di].stops[si].title" placeholder="站点标题" class="form-input form-inline" />
                    <input type="text" v-model="m.config.days[di].stops[si].desc" placeholder="描述（可选）" class="form-input form-inline" />
                    <text class="link-del" @click="m.config.days[di].stops.splice(si, 1)">删除</text>
                  </view>
                  <view class="link-add" @click="(m.config.days[di].stops ||= []).push({ time: '', title: '', desc: '' })">+ 添加站点</view>
                </view>
                <view class="link-add" @click="(m.config.days ||= []).push({ day: (m.config.days || []).length + 1, title: '', stops: [] })">+ 添加一天</view>
              </template>
              <template v-else-if="m.type === 'faq'">
                <view v-for="(it, ii) in m.config.items || []" :key="ii" class="form-row">
                  <input type="text" v-model="m.config.items[ii].q" placeholder="问题" class="form-input form-inline" />
                  <input type="text" v-model="m.config.items[ii].a" placeholder="回答" class="form-input form-inline" />
                  <text class="link-del" @click="m.config.items.splice(ii, 1)">删除</text>
                </view>
                <view class="link-add" @click="(m.config.items ||= []).push({ q: '', a: '' })">+ 添加问答</view>
              </template>
              <template v-else-if="m.type === 'images'">
                <view v-for="(img, ii) in m.config.images || []" :key="ii" class="promo-module-image-row">
                  <text class="promo-module-image-name">{{ (img && (img.name || img.url)) || img }}</text>
                  <text class="link-del" @click="m.config.images.splice(ii, 1)">删除</text>
                </view>
                <view class="form-row">
                  <input type="text" v-model="imageUrlInput" placeholder="粘贴网络图片 URL，回车添加" class="form-input form-inline" />
                  <text class="link-add" @click="addImageUrl(m)">添加</text>
                </view>
                <view class="link-add" @click="openImagePicker(m)">+ 从素材库选图</view>
              </template>
              <template v-else-if="m.type === 'message'">
                <input type="text" v-model="m.config.title" placeholder="留言模块标题（默认：留言咨询）" class="form-input" />
                <input type="text" v-model="m.config.btnText" placeholder="按钮文案（默认：去留言）" class="form-input" />
                <text class="form-tip">配置留言模块展示文案；与悬浮联系方式中的「留言」入口共用同一留言面板。</text>
              </template>
              <template v-else-if="m.type === 'floatContact'">
                <text class="form-tip">在页面右侧悬浮显示联系方式（电话 / 微信客服或二维码 / 留言）。数据源自动复用下方「联系方式」区配置，此处无需额外填写。</text>
              </template>
              <template v-else-if="m.type === 'info'">
                <view class="promo-fixed-row"><text class="promo-fixed-label">活动时间</text><text class="promo-fixed-value">{{ fmtTime(form.startTime) }} ~ {{ fmtTime(form.endTime) }}</text></view>
                <view class="promo-fixed-row"><text class="promo-fixed-label">活动地点</text><text class="promo-fixed-value">{{ form.venueName || '待定场地' }}</text></view>
                <view class="promo-fixed-row"><text class="promo-fixed-label">活动名额</text><text class="promo-fixed-value">{{ form.capacity == null ? '不限' : form.capacity + ' 人' }}</text></view>
                <view class="promo-fixed-row"><text class="promo-fixed-label">活动费用</text><text class="promo-fixed-value">{{ feeText(form) }}</text></view>
                <text class="form-tip">基本信息条自动读取活动固定信息（时间/场地/名额/费用），此处仅作展示，修改请前往活动编辑页。</text>
                <view class="link-add" @click="goEditActivity">去活动编辑页修改 ›</view>
              </template>
              <template v-else-if="m.type === 'speakers'">
                <view v-if="form.lecturer">
                  <view v-for="(s, si) in (Array.isArray(form.lecturer) ? form.lecturer : [form.lecturer])" :key="si" class="promo-fixed-speaker">
                    <text class="promo-speaker-name">{{ s.name || '嘉宾' }}</text>
                    <text v-if="s.bio || s.desc" class="promo-speaker-bio">{{ s.bio || s.desc }}</text>
                  </view>
                </view>
                <text v-else class="promo-fixed-empty">暂未关联讲师，可在活动编辑页设置。</text>
                <text class="form-tip">嘉宾讲师自动读取活动关联的讲师信息，此处仅作展示，修改请前往活动编辑页。</text>
                <view class="link-add" @click="goEditActivity">去活动编辑页修改 ›</view>
              </template>
              <template v-else-if="m.type === 'goods'">
                <input type="text" v-model="m.config.title" placeholder="模块标题（默认：促销商品）" class="form-input" />
                <input type="text" v-model="m.config.notice" placeholder="免责文案（默认：价格以到店为准）" class="form-input" />
                <text class="form-tip">商品清单在活动编辑页「促销商品」区填写，此处只配置模块标题与免责文案。</text>
                <view class="link-add" @click="goEditActivity">去活动编辑页填写商品 ›</view>
              </template>
              <template v-else-if="m.type === 'purpose'">
                <input type="text" v-model="m.config.title" placeholder="模块标题（默认：活动目的）" class="form-input" />
                <text class="form-tip">活动目的正文在活动编辑页填写。</text>
                <view class="link-add" @click="goEditActivity">去活动编辑页填写活动目的 ›</view>
              </template>
              <template v-else-if="m.type === 'notice'">
                <input type="text" v-model="m.config.title" placeholder="模块标题（默认：活动说明）" class="form-input" />
                <RichEditor v-model="m.config.html" />
                <text class="form-tip">正文读取活动介绍（活动编辑页「活动介绍」），此处为补充规则，正文在前、补充在后。</text>
              </template>
            </view>
          </view>
          <view class="link-add" @click="openAddModule = true">+ 添加模块</view>
        </view>
      </view>

      <!-- 联系方式 -->
      <view class="form-section">
        <view class="section-title">联系方式</view>
        <view class="form-item">
          <view class="switch-row">
            <text>使用站点默认联系方式</text>
            <switch :checked="!form.promoContact" @change="toggleContactOverride" />
          </view>
          <template v-if="form.promoContact">
            <view class="form-label">微信号</view>
            <input type="text" v-model="form.promoContact.wechat.id" placeholder="如 joho-service" class="form-input" />
            <view class="form-label">公众号客服链接</view>
            <input type="text" v-model="form.promoContact.wechatServiceUrl" placeholder="如 https://kf.weixin.qq.com/..." class="form-input" />
            <view class="form-label">微信客服二维码</view>
            <view class="media-select" @click="openPromoQrcodePicker">
              <image
                v-if="form.promoContact.wechat.qrcode"
                :src="form.promoContact.wechat.qrcode"
                mode="aspectFill"
                class="media-preview"
              />
              <view v-else class="media-placeholder"><text>+ 选择二维码图片</text></view>
              <text v-if="form.promoContact.wechat.qrcode" class="media-remove" @click.stop="removePromoQrcode">✕</text>
            </view>
            <view class="form-label">联系电话</view>
            <input type="text" v-model="form.promoContact.phone" placeholder="联系电话" class="form-input" />
            <view class="form-label">提示文案</view>
            <input type="text" v-model="form.promoContact.notice" placeholder="提示文案（如：无法报名请加顾问微信）" class="form-input" />
            <view class="link-add" @click="togglePromoCard">{{ showPromoCard ? '收起咨询名片' : '+ 添加咨询名片' }}</view>
            <template v-if="showPromoCard">
              <input type="text" v-model="form.promoContact.card.name" placeholder="顾问姓名" class="form-input" />
              <input type="text" v-model="form.promoContact.card.title" placeholder="职位" class="form-input" />
              <input type="text" v-model="form.promoContact.card.company" placeholder="公司" class="form-input" />
              <input type="text" v-model="form.promoContact.card.phone" placeholder="名片电话" class="form-input" />
              <input type="text" v-model="form.promoContact.card.wechat" placeholder="名片微信号" class="form-input" />
            </template>
          </template>
        </view>
      </view>
      </template>

      <template v-else>
      <view class="form-section">
        <view class="section-title">AI 定制助手</view>
        <view class="ai-actions">
          <button class="btn-ai" @click="genCustomHtmlByAI" :loading="customAiLoading">{{ customAiLoading ? '生成中...' : '✨ 生成定制 HTML' }}</button>
          <button class="btn-ghost" @click="copyCustomPrompt">复制提示词</button>
        </view>
        <text class="form-tip">AI 会基于下方活动基础信息整页生成宣传 HTML，并用 {{占位符}} 引用时间/场地/讲师/名额/费用等固定信息，C 端会自动替换为最新数据。可先在下方补充你的具体要求（如风格、卖点侧重），再生成或复制提示词使用。</text>
        <view class="form-item">
          <text class="form-label">补充要求（可选）</text>
          <textarea
            v-model="customExtra"
            class="form-textarea"
            placeholder="例如：主打亲子温馨风格 / 强调零基础新手友好 / 突出限时优惠报名 / 加入议程大纲等…"
            :auto-height="false"
            maxlength="-1"
          />
        </view>
      </view>
      <view class="form-section">
        <view class="section-title">完全定制文案</view>
        <view class="form-item">
          <view class="custom-mode-switch">
            <view class="scheme-tab" :class="{ on: customMode === 'source' }" @click="customMode = 'source'">源码</view>
            <view class="scheme-tab" :class="{ on: customMode === 'visual' }" @click="customMode = 'visual'">可视化</view>
            <view class="clear-src" :class="{ recovering: clearedCustom }" @click="toggleClearCustom">{{ clearedCustom ? '恢复清空' : '清空源码' }}</view>
          </view>
          <text class="form-tip">源码模式：整页自由排版、原样保存 HTML（支持 &lt;html&gt; 完整文档 / &lt;style&gt; / 卡片 / 渐变 / 图片）；可视化模式实时渲染完整 HTML 效果（含样式与图片），所见即所得。可点下方占位符插入活动要素，C 端会自动替换为最新数据。</text>
          <template v-if="customMode === 'source'">
            <textarea
              v-model="customPromoHtml"
              class="form-textarea custom-html-src"
              placeholder="在此粘贴或编写整页 HTML（可先点「✨ 生成定制 HTML」自动生成）…"
              :auto-height="false"
              maxlength="-1"
            />
            <view class="placeholder-toolbar">
              <view v-for="p in PLACEHOLDER_ITEMS" :key="p.key" class="placeholder-chip" @click="insertPlaceholder(p.key)">{{ p.label }}</view>
            </view>
          </template>
          <template v-else>
            <view class="visual-toolbar" @mousedown.prevent>
              <text class="vt-label">字号</text>
              <view v-for="s in FONT_SIZES" :key="s.v" class="vt-chip" @click="applyVisualFont(s.v)">{{ s.label }}</view>
              <text class="vt-label">颜色</text>
              <view v-for="c in VISUAL_COLORS" :key="c" class="vt-color" :style="{ background: c }" @click="applyVisualColor(c)"></view>
              <view class="vt-btn" :class="{ on: !!visualImgTarget }" @click="openVisualMedia">{{ visualImgTarget ? '换图（已选）' : '媒体库换图' }}</view>
            </view>
            <text class="form-tip">可视化内可直接修改文字、选中文字调字号/颜色；点击页面中的图片变蓝框后可用上方「媒体库换图」。可视化编辑会将已渲染的固定信息固化为当期值，如需持续跟随活动变化请用源码里的 {{占位符}}。</text>
            <view class="custom-visual-box is-editable" ref="customVisualBox"></view>
            <view v-if="!customPreviewHtml" class="visual-empty">暂无定制文案，请先在「源码」模式粘贴或生成 HTML</view>
          </template>
        </view>
      </view>
      </template>

      <view class="save-bar">
        <button class="btn-primary save-btn" @click="save" :loading="saving">保存宣传文案</button>
      </view>
    </template>

    <MediaPicker
      :visible="promoMediaPicker.visible"
      accept="image/*"
      @select="onPromoImagePick"
      @update:visible="promoMediaPicker.visible = $event"
    />

    <MediaPicker
      :visible="showPromoQrcodePicker"
      accept="image/*"
      @select="onPromoQrcodePicked"
      @update:visible="showPromoQrcodePicker = $event"
    />

    <view class="modal-mask" v-if="openAddModule" @click="openAddModule = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">添加模块</text>
          <text class="modal-close" @click="openAddModule = false">✕</text>
        </view>
        <view class="promo-module-add-grid">
          <view v-for="(meta, type) in PROMO_MODULE_META" :key="type" class="promo-module-add-item" @click="addModule(type)">
            <text>{{ meta.name }}</text>
          </view>
        </view>
        <text class="form-tip">固定模块格式满足不了排版需求时，选用「自定义块」自由组合富文本与网络图片。</text>
      </view>
    </view>

    <!-- 宣传文案预览弹窗（复用 C 端 promo 组件 + 主题配色，实时反映当前编辑内容） -->
    <view class="modal-mask" v-if="openPreview" @click="openPreview = false">
      <view class="preview-modal" @click.stop>
        <view class="preview-header">
          <text class="preview-title">宣传文案预览</text>
          <text class="preview-close" @click="openPreview = false">✕</text>
        </view>
        <scroll-view scroll-y class="preview-scroll">
          <view v-if="activeScheme === 'ai'" class="promo-page preview-body" :class="'promo-' + form.promoTemplate" :style="previewColorVars">
            <block v-for="m in form.promoModules" :key="m.sort">
              <PromoCover v-if="m.type === 'cover'" :activity="form" :config="m.config" />
              <PromoInfo v-else-if="m.type === 'info'" :activity="form" :config="m.config" />
              <PromoRich v-else-if="m.type === 'rich'" :activity="form" :config="m.config" />
              <PromoHighlights v-else-if="m.type === 'highlights'" :activity="form" :config="m.config" />
              <PromoSpeakers v-else-if="m.type === 'speakers'" :activity="form" :config="m.config" />
              <PromoAgenda v-else-if="m.type === 'agenda'" :activity="form" :config="m.config" />
              <PromoTour v-else-if="m.type === 'tour'" :activity="form" :config="m.config" />
              <PromoImages v-else-if="m.type === 'images'" :activity="form" :config="m.config" />
              <PromoRewards v-else-if="m.type === 'rewards'" :rewards="form.rewardConfig" />
              <PromoContact v-else-if="m.type === 'contact'" :contact="form.promoContact || {}" @open-wechat="previewShowWechat = true" @call-phone="previewCallPhone()" />
              <PromoMessage v-else-if="m.type === 'message'" :messages="previewMessages" :config="m.config" />
              <PromoFaq v-else-if="m.type === 'faq'" :activity="form" :config="m.config" />
              <PromoCustom v-else-if="m.type === 'custom'" :activity="form" :config="m.config" />
              <PromoGoods v-else-if="m.type === 'goods'" :activity="form" :config="m.config" />
              <PromoPurpose v-else-if="m.type === 'purpose'" :activity="form" :config="m.config" />
              <PromoNotice v-else-if="m.type === 'notice'" :activity="form" :config="m.config" />
              <FloatContact
                v-else-if="m.type === 'floatContact'"
                :contact="form.promoContact || {}"
                :in-wechat="false"
                @open-wechat="previewShowWechat = true"
                @call-phone="previewCallPhone()"
              />
            </block>
            <view class="preview-float-msg" @click="previewShowMessage = true">
              <text class="preview-msg-badge">1</text>
              <text class="preview-msg-label">留言</text>
            </view>
            <view v-if="!form.promoModules.length" class="preview-empty">暂无宣传模块，请先添加或生成文案</view>
          </view>
          <view v-else class="promo-page preview-body preview-custom-body">
            <view class="custom-preview" ref="modalCustomPreviewBox"></view>
            <view v-if="!customPreviewHtml" class="preview-empty">暂无定制文案，请先粘贴或生成 HTML</view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 预览示例：微信二维码弹层 -->
    <view class="modal-mask" v-if="previewShowWechat" @click="previewShowWechat = false">
      <view class="preview-modal preview-small" @click.stop>
        <view class="preview-header">
          <text class="preview-title">微信二维码</text>
          <text class="preview-close" @click="previewShowWechat = false">✕</text>
        </view>
        <view class="preview-qr">
          <image v-if="previewQrcode" :src="previewQrcode" mode="aspectFit" class="preview-qr-img" />
          <view v-else class="preview-qr-empty">暂无微信二维码</view>
        </view>
        <text class="preview-qr-tip">微信环境长按识别，浏览器扫码或复制微信号</text>
        <view class="preview-btn-close" @click="previewShowWechat = false">关闭</view>
      </view>
    </view>

    <!-- 预览示例：留言弹层 -->
    <view class="modal-mask" v-if="previewShowMessage" @click="previewShowMessage = false">
      <view class="preview-modal preview-small" @click.stop>
        <view class="preview-header">
          <text class="preview-title">留言示例</text>
          <text class="preview-close" @click="previewShowMessage = false">✕</text>
        </view>
        <scroll-view scroll-y class="preview-msg-list">
          <view class="preview-msg-item">
            <text class="preview-msg-role">问</text>
            <text class="preview-msg-nick">示例客户</text>
            <text class="preview-msg-content">请问还有名额吗？</text>
            <view class="preview-msg-reply">
              <text class="preview-msg-role preview-msg-role--a">答</text>
              <text class="preview-msg-reply-text">您好，还有少量名额，欢迎报名。</text>
            </view>
          </view>
        </scroll-view>
        <view class="preview-btn-close" @click="previewShowMessage = false">关闭</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getActivity, updateActivity } from '../../api/activity.js'
import { adminPost } from '../../utils/request.js'
import PageHeader from '../../components/PageHeader.vue'
import RichEditor from '../../components/RichEditor.vue'
import MediaPicker from '../../components/MediaPicker.vue'
import PromoCover from '../../components/promo/promo-cover.vue'
import PromoInfo from '../../components/promo/promo-info.vue'
import PromoRich from '../../components/promo/promo-rich.vue'
import PromoHighlights from '../../components/promo/promo-highlights.vue'
import PromoSpeakers from '../../components/promo/promo-speakers.vue'
import PromoAgenda from '../../components/promo/promo-agenda.vue'
import PromoTour from '../../components/promo/promo-tour.vue'
import PromoImages from '../../components/promo/promo-images.vue'
import PromoRewards from '../../components/promo/promo-rewards.vue'
import PromoContact from '../../components/promo/promo-contact.vue'
import PromoMessage from '../../components/promo/promo-message.vue'
import PromoFaq from '../../components/promo/promo-faq.vue'
import PromoCustom from '../../components/promo/promo-custom.vue'
import PromoGoods from '../../components/promo/promo-goods.vue'
import PromoPurpose from '../../components/promo/promo-purpose.vue'
import PromoNotice from '../../components/promo/promo-notice.vue'
import FloatContact from '../../components/promo/float-contact.vue'
import { PROMO_MODULE_META } from './promo-presets.js'
import { PROMO_PALETTES } from './promo-palettes.js'
import { parsePromoImport, buildPromoPrompt, buildCustomHtmlPrompt, sanitizeCustomHtml, CUSTOM_PLACEHOLDERS as PLACEHOLDER_ITEMS } from './promo-import.js'
import { defaultSalePromoModules } from './promo-import.js'

const PROMO_TEMPLATE_OPTIONS = [
  { value: 'summit', label: '峰会' },
  { value: 'salon', label: '沙龙' },
  { value: 'training', label: '培训' },
  { value: 'action', label: '剧本游' },
  { value: 'life', label: '生活' },
  { value: 'sale', label: '商户促销' },
]

function applyTemplate(value) {
  form.promoTemplate = value
  if (value === 'sale') {
    form.promoModules = defaultSalePromoModules()
    openModuleIndex.value = -1
  }
}

const activityId = ref('')
const loading = ref(false)
const saving = ref(false)
const aiLoading = ref(false)
const pasteRaw = ref('')
const suggestTips = ref([])
const openModuleIndex = ref(-1)
const openAddModule = ref(false)
const openPreview = ref(false)
const promoMediaPicker = ref({ visible: false, module: null })
const showPromoQrcodePicker = ref(false)
const showPromoCard = ref(false)
const previewShowWechat = ref(false)
const previewShowMessage = ref(false)
const previewMessages = [
  { id: 1, content: '请问还有名额吗？', status: 'replied', reply: '您好，还有少量名额，欢迎报名。', nickname: '示例客户', createdAt: new Date().toISOString(), repliedAt: new Date().toISOString() },
]
const previewQrcode = computed(() => (form.promoContact?.wechat?.qrcode) || '')
function previewCallPhone() { uni.showToast({ title: '预览：运营端拨号不生效', icon: 'none' }) }

const form = reactive({
  title: '',
  status: 'draft',
  type: '',
  category: '',
  description: '',
  startTime: '',
  endTime: '',
  venueName: '',
  venue: null,
  lecturer: null,
  capacity: null,
  cashPrice: null,
  belongsToSeries: null,
  assets: { recordingUrl: '', materials: [] },
  tags: [],
  questionnaire: null,
  checkinMode: 'both',
  geoEnforced: false,
  geoRadiusM: 500,
  signupStart: '',
  signupEnd: '',
  pricingMode: 'flat',
  feeCollectAt: 'signup',
  pointsCost: 0,
  feeTiers: [],
  feeFactors: null,
  preUnlockArticles: [],
  preUnlockLessons: [],
  learningPackageArticles: [],
  learningPackageLessons: [],
  shareRewardPoints: 0,
  formConfig: [],
  rewardConfig: null,
  promoTemplate: 'summit',
  promoColors: null,
  promoModules: [],
  promoContact: null,
  promoAssets: [],
  customPromoHtml: '',
  customPromoActive: true,
})

const activeScheme = ref('ai') // 'ai' | 'custom'
const customMode = ref('source') // 'source' | 'visual'
const customPromoHtml = ref('')
const modalCustomPreviewBox = ref(null)
const customVisualBox = ref(null)
const customExtra = ref('')
const customAiLoading = ref(false)
// 可视化编辑状态
const visualImgTarget = ref(null)
const renderedPreviewHtml = ref('')
const clearedCustom = ref(false)
const customBackup = ref('')
const FONT_SIZES = [
  { v: '3', label: '小' }, { v: '4', label: '中' }, { v: '5', label: '大' }, { v: '6', label: '特大' }, { v: '7', label: '最大' },
]
const VISUAL_COLORS = ['#000000', '#ffffff', '#9aa0a6', '#e74c3c', '#e67e22', '#f1c40f', '#27ae60', '#2ecc71', '#3498db', '#667eea']

// 完全定制 HTML 预览：替换占位符为当前表单最新数据（对齐 C 端 promo-custom-page.vue）
const customPreviewHtml = computed(() => {
  const raw = customPromoHtml.value || ''
  const a = form
  const fmtT = (v) => {
    if (!v) return ''
    const d = new Date(v)
    if (isNaN(d.getTime())) return String(v)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  const cost = Number(a.cashPrice ?? 0)
  const map = {
    title: a.title || '',
    startTime: fmtT(a.startTime),
    endTime: fmtT(a.endTime),
    venueName: a.venueName || (a.venue && a.venue.name) || '',
    capacity: a.capacity == null ? '' : String(a.capacity),
    cashPrice: cost > 0 ? String(cost) : '',
    lecturer: (a.lecturer && a.lecturer.name) || '',
    description: a.description || '',
  }
  return raw.replace(/\{\{(\w+)\}\}/g, (m, key) => (map[key] !== undefined ? map[key] : ''))
})

// 完全定制 HTML 用真实 DOM 渲染，完整还原内联样式（对齐 C 端 innerHTML 方案）
function applyInnerHtml(box, html) {
  nextTick(() => {
    if (!box) return
    const node = box.$el || box
    node.innerHTML = html || ''
  })
}
// 弹窗「预览」：待弹窗 DOM 就绪后再注入真实渲染，避免在组件更新前取到空 ref
watch([openPreview, activeScheme, customPreviewHtml], () => {
  if (!openPreview.value || activeScheme.value !== 'custom') return
  nextTick(() => {
    const box = modalCustomPreviewBox.value
    if (box) applyInnerHtml(box, customPreviewHtml.value)
  })
})

// 可视化模式：切换或内容变化后实时渲染完整 HTML（含 <style> 与图片），所见即所得
// 渲染时若内容与当前 DOM 相同则跳过（避免覆盖可视化编辑中的内容编辑）
watch([customMode, customPreviewHtml], () => {
  if (customMode.value !== 'visual') return
  nextTick(() => {
    const box = customVisualBox.value
    if (!box) return
    const node = box.$el || box
    if (node.innerHTML && node.innerHTML.trim() === customPreviewHtml.value.trim()) return
    applyInnerHtml(box, customPreviewHtml.value)
    node.contentEditable = 'true'
    renderedPreviewHtml.value = customPreviewHtml.value.trim()
    visualImgTarget.value = null
    attachVisualClick(node)
  })
})

// ---- 可视化简单编辑 ----
function applyVisualCommand(cmd, val) {
  const box = customVisualBox.value
  if (!box) return
  const node = box.$el || box
  node.focus()
  try { document.execCommand(cmd, false, val) } catch (e) { /* 忽略 */ }
  commitVisualToHtml()
}
function applyVisualFont(size) { applyVisualCommand('fontSize', size) }
function applyVisualColor(color) { applyVisualCommand('foreColor', color) }

// 将可视化编辑结果写回源码（仅当用户有实际改动，避免无编辑时把占位符固化）
function commitVisualToHtml() {
  const box = customVisualBox.value
  if (!box || customMode.value !== 'visual') return
  const node = box.$el || box
  const html = (node.innerHTML || '').trim()
  if (!html) return
  if (renderedPreviewHtml.value && html === renderedPreviewHtml.value) return
  customPromoHtml.value = html
}

// 可视化内点击图片：记录目标并高亮，供「媒体库换图」替换
// 用原生捕获委托而非 uni @click——H5 下 @click 的 e.target 未必是真实 DOM，img 识别不到
function handleVisualBoxClick(e) {
  const t = e && e.target
  const img = t && typeof t.closest === 'function' ? t.closest('img') : null
  const prev = visualImgTarget.value
  if (!img) {
    if (prev) { prev.style.outline = 'none'; visualImgTarget.value = null }
    return
  }
  if (prev && prev !== img) prev.style.outline = 'none'
  img.style.outline = '2px solid #667eea'
  img.style.outlineOffset = '2px'
  visualImgTarget.value = img
  // 阻止图片被当作文本选中/拖动，避免 contenteditable 干扰
  if (e.preventDefault) e.preventDefault()
  if (e.stopPropagation) e.stopPropagation()
}
function attachVisualClick(node) {
  if (!node || node.__visClick) return
  node.addEventListener('click', handleVisualBoxClick, true)
  node.__visClick = true
}

// 清空 / 恢复源码，并把光标定位到源码编辑区便于重新粘贴
function toggleClearCustom() {
  if (clearedCustom.value) {
    customPromoHtml.value = customBackup.value
    clearedCustom.value = false
    uni.showToast({ title: '已恢复被清空的内容', icon: 'none' })
  } else {
    customBackup.value = customPromoHtml.value
    customPromoHtml.value = ''
    clearedCustom.value = true
    customMode.value = 'source'
    uni.showToast({ title: '已清空，可直接重新粘贴内容', icon: 'none' })
  }
  nextTick(focusSrcEditor)
}
function focusSrcEditor() {
  const ta = document.querySelector('textarea.custom-html-src')
  if (!ta || customMode.value !== 'source') return
  try {
    ta.focus()
    const len = (ta.value || '').length
    if (typeof ta.setSelectionRange === 'function') ta.setSelectionRange(len, len)
  } catch (e) { /* 忽略 */ }
}

const statusTextMap = { draft: '草稿', signup_open: '报名中', ongoing: '进行中', ended: '已结束', archived: '已归档' }
const statusClassMap = { draft: 'draft', signup_open: 'open', ongoing: 'ongoing', ended: 'ended', archived: 'archived' }
function statusText(s) { return statusTextMap[s] || s || '-' }
function statusClass(s) { return statusClassMap[s] || 'default' }
function fmtTime(v) {
  if (!v) return '-'
  const d = new Date(v)
  if (isNaN(d.getTime())) return String(v)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function normContact(pc) {
  if (!pc || typeof pc !== 'object') return null
  return {
    wechat: pc.wechat && typeof pc.wechat === 'object'
      ? pc.wechat
      : { qrcode: '', id: typeof pc.wechat === 'string' ? pc.wechat : '' },
    phone: pc.phone || '',
    card: pc.card || null,
    notice: pc.notice || '',
  }
}

async function loadDetail() {
  if (!activityId.value) return
  loading.value = true
  try {
    const data = await getActivity(activityId.value)
    if (!data) {
      uni.showToast({ title: '活动不存在', icon: 'none' })
      return
    }
    Object.assign(form, {
      title: data.title || '',
      status: data.status || 'draft',
      type: data.type || '',
      category: data.category || '',
      description: data.description || '',
      startTime: data.startTime || '',
      endTime: data.endTime || '',
      venueName: data.venueName || '',
      venue: data.venue || null,
      lecturer: data.lecturer || null,
      capacity: data.capacity ?? null,
      cashPrice: data.cashPrice ?? null,
      belongsToSeries: data.belongsToSeries || null,
      assets: data.assets && typeof data.assets === 'object' ? data.assets : { recordingUrl: '', materials: [] },
      tags: Array.isArray(data.tags) ? data.tags : [],
      questionnaire: data.questionnaire && typeof data.questionnaire === 'object' ? data.questionnaire : null,
      checkinMode: data.checkinMode || 'both',
      geoEnforced: !!data.geoEnforced,
      geoRadiusM: data.geoRadiusM ?? 500,
      signupStart: data.signupStart || '',
      signupEnd: data.signupEnd || '',
      pricingMode: data.pricingMode || 'flat',
      feeCollectAt: data.feeCollectAt || 'signup',
      pointsCost: data.pointsCost || 0,
      feeTiers: Array.isArray(data.feeTiers) ? data.feeTiers : [],
      feeFactors: data.feeFactors && typeof data.feeFactors === 'object' ? data.feeFactors : null,
      preUnlockArticles: Array.isArray(data.preUnlockArticles) ? data.preUnlockArticles : [],
      preUnlockLessons: Array.isArray(data.preUnlockLessons) ? data.preUnlockLessons : [],
      learningPackageArticles: Array.isArray(data.learningPackageArticles) ? data.learningPackageArticles : [],
      learningPackageLessons: Array.isArray(data.learningPackageLessons) ? data.learningPackageLessons : [],
      shareRewardPoints: data.shareRewardPoints ?? 0,
      formConfig: Array.isArray(data.formConfig) ? data.formConfig : [],
      rewardConfig: data.rewardConfig && typeof data.rewardConfig === 'object' ? data.rewardConfig : null,
      promoTemplate: data.promoTemplate || 'summit',
      promoColors: data.promoColors && typeof data.promoColors === 'object' ? { ...data.promoColors } : null,
      promoModules: Array.isArray(data.promoModules) ? data.promoModules : [],
      promoContact: normContact(data.promoContact),
      promoAssets: Array.isArray(data.promoAssets) ? data.promoAssets : [],
      customPromoHtml: data.customPromoHtml || '',
      customPromoActive: data.customPromoActive !== false,
    })
    // 编辑器使用独立 ref：回填已保存的定制 HTML 作为可编辑默认值（此前丢失），并默认进入当前生效方案
    customPromoHtml.value = data.customPromoHtml || ''
    clearedCustom.value = false
    customBackup.value = ''
    activeScheme.value = (data.customPromoActive !== false && (data.customPromoHtml || '').trim()) ? 'custom' : 'ai'
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// ---- 配色方案（12 套色卡 + 六色值微调；未选时用模板默认配色）----
function isPaletteOn(p) {
  const c = form.promoColors
  if (!c || !p) return false
  return Object.keys(p.colors).every(k => c[k] === p.colors[k])
}
function applyPalette(p) { form.promoColors = { ...p.colors } }
const colorKeyLabels = { primary: '主色', accent: '强调色', bg: '背景色', card: '卡片色', text: '正文色', textDim: '次要文字' }
function colorKeyLabel(k) { return colorKeyLabels[k] || k }
// 预览内联 CSS 变量（与 C 端 detail.vue colorVars 同契约：--c-* 覆盖模板默认色）
const previewColorVars = computed(() => {
  const c = form.promoColors
  if (!c || typeof c !== 'object') return null
  const vars = {}
  if (c.primary) vars['--c-primary'] = c.primary
  if (c.accent) vars['--c-accent'] = c.accent
  if (c.bg) vars['--c-bg'] = c.bg
  if (c.card) vars['--c-card'] = c.card
  if (c.text) vars['--c-text'] = c.text
  if (c.textDim) vars['--c-text-dim'] = c.textDim
  return vars
})

// ---- 模块编辑 ----
function toggleModuleConfig(i) { openModuleIndex.value = openModuleIndex.value === i ? -1 : i }
function moveModule(i, dir) {
  const arr = form.promoModules
  const j = i + dir
  if (j < 0 || j >= arr.length) return
  const [m] = arr.splice(i, 1)
  arr.splice(j, 0, m)
  reindexModules()
}
function removeModule(i) { form.promoModules.splice(i, 1); reindexModules() }
function reindexModules() { form.promoModules.forEach((m, i) => { m.sort = i }) }
function addModule(type) {
  form.promoModules.push({ type, config: {}, sort: form.promoModules.length })
  openAddModule.value = false
}
function openImagePicker(m) { promoMediaPicker.value.module = m; promoMediaPicker.value.visible = true }
function openVisualMedia() {
  if (!visualImgTarget.value) {
    uni.showToast({ title: '请先在可视化内点击一张图片再换图', icon: 'none' })
    return
  }
  promoMediaPicker.value.module = 'visual'
  promoMediaPicker.value.visible = true
}
function onPromoImagePick(item) {
  const m = promoMediaPicker.value.module
  if (m === 'visual') {
    const t = visualImgTarget.value
    if (t && item?.url) {
      t.setAttribute('src', item.url)
      if (item.name) t.setAttribute('alt', item.name)
      t.style.outline = 'none'
      visualImgTarget.value = null
      commitVisualToHtml()
      uni.showToast({ title: '图片已替换', icon: 'success' })
    }
    return
  }
  if (m && item?.url) {
    if (!m.config.images) m.config.images = []
    m.config.images.push({ url: item.url, name: item.name || item.url })
  }
}
// 粘贴网络图片 URL 添加（custom/images 模块），支持 http(s) 外链
const imageUrlInput = ref('')
function addImageUrl(m) {
  const url = imageUrlInput.value.trim()
  if (!url) return uni.showToast({ title: '请先粘贴图片 URL', icon: 'none' })
  if (!/^https?:\/\//i.test(url)) return uni.showToast({ title: '请输入 http(s) 图片地址', icon: 'none' })
  if (!m.config.images) m.config.images = []
  m.config.images.push({ url, name: url })
  imageUrlInput.value = ''
}

// ---- 固定信息模块（info/speakers）展示与跳转 ----
function feeText(a) {
  if (!a) return ''
  const cost = Number(a.cost ?? a.cashPrice ?? 0)
  if (cost > 0) return `${cost} 元`
  return '免费'
}
function goEditActivity() {
  if (!activityId.value) return
  uni.navigateTo({ url: '/pages/activity/form?id=' + activityId.value })
}

// ---- 联系方式 ----
function toggleContactOverride(e) {
  if (e.detail.value === false) {
    form.promoContact = {
      wechat: { qrcode: '', id: '' },
      phone: '',
      wechatServiceUrl: '',
      card: { name: '', title: '', company: '', phone: '', wechat: '' },
      notice: '',
    }
  } else {
    form.promoContact = null
  }
}

function openPromoQrcodePicker() { showPromoQrcodePicker.value = true }
function onPromoQrcodePicked(file) {
  if (!form.promoContact) form.promoContact = { wechat: { qrcode: '', id: '' }, phone: '', card: null, notice: '' }
  if (!form.promoContact.wechat) form.promoContact.wechat = { qrcode: '', id: '' }
  if (!file || !file.url) { showPromoQrcodePicker.value = false; return }
  form.promoContact.wechat.qrcode = file.url
  showPromoQrcodePicker.value = false
  uni.showToast({ title: '二维码已设置', icon: 'success' })
}
function removePromoQrcode() {
  if (form.promoContact && form.promoContact.wechat) form.promoContact.wechat.qrcode = ''
}
function togglePromoCard() {
  showPromoCard.value = !showPromoCard.value
}

function sanitizePromoContact(c) {
  if (!c) return null
  if (c.wechat && !c.wechat.id && !c.wechat.qrcode) delete c.wechat
  else if (!c.wechat) c.wechat = undefined
  for (const k of ['phone','wechatServiceUrl','notice']) if (!c[k]) delete c[k]
  if (c.card) {
    const card = c.card
    for (const k of ['name','title','company','phone','wechat']) if (!card[k]) delete card[k]
    if (!Object.keys(card).length) c.card = undefined
  }
  return (c.phone || c.wechat || c.wechatServiceUrl || c.notice || c.card) ? c : null
}

// ---- AI 生成 / 粘贴导入 ----
function applyPromoResult(r) {
  if (!r.ok) {
    uni.showToast({ title: r.errors[0] || '导入失败', icon: 'none' })
    return false
  }
  const d = r.data
  if (d.description !== undefined) form.description = d.description
  if (Array.isArray(d.promoModules) && d.promoModules.length) {
    const ms = d.promoModules
    // 基本信息条必须存在：C 端宣传页据此展示时间/场地/名额/费用（跟随活动固定信息）
    if (!ms.some(m => m.type === 'info')) {
      const coverIdx = ms.findIndex(m => m.type === 'cover')
      ms.splice(coverIdx >= 0 ? coverIdx + 1 : 0, 0, { type: 'info', config: {}, sort: 0 })
    }
    form.promoModules = ms
    form.promoModules.forEach((m, i) => { m.sort = i })
    openModuleIndex.value = -1
  }
  if (d.promoContact && typeof d.promoContact === 'object') form.promoContact = normContact(d.promoContact)
  suggestTips.value = []
  if (d.promoColors && typeof d.promoColors === 'object') {
    form.promoColors = d.promoColors
    suggestTips.value.push((d.paletteName ? `AI 推荐配色「${d.paletteName}」` : 'AI 推荐配色') + '已套用，可在「配色方案」区切换或微调六色值')
  }
  if (Array.isArray(d.suggestFields) && d.suggestFields.length) {
    suggestTips.value.push('AI 建议报名表单补充字段：' + d.suggestFields.map(f => f.label).join('、') + '（可在活动编辑页「报名表单配置」中添加）')
  }
  if (d.title && d.title !== form.title) {
    uni.showModal({
      title: 'AI 建议标题',
      content: `是否将活动标题替换为「${d.title}」？`,
      success: (res) => { if (res.confirm) form.title = d.title },
    })
  }
  uni.showToast({ title: '已回填，请核对后保存', icon: 'success' })
  return true
}

function applyPaste() {
  if (!pasteRaw.value.trim()) return uni.showToast({ title: '请先粘贴 JSON', icon: 'none' })
  applyPromoResult(parsePromoImport(pasteRaw.value))
}

function copyPrompt() {
  uni.setClipboardData({
    data: buildPromoPrompt(form),
    success: () => uni.showToast({ title: '提示词已复制', icon: 'success' }),
  })
}

async function genByAI() {
  if (aiLoading.value) return
  aiLoading.value = true
  try {
    const prompt = buildPromoPrompt(form)
    const res = await adminPost('/zhao-studio/v1/admin/ai/chat', {
      messages: [{ role: 'user', content: prompt }],
    })
    const content = res?.data?.content || res?.content
    if (!content) {
      uni.showToast({ title: res?.data?.error || 'AI 未返回内容，请检查 AI 配置', icon: 'none' })
      return
    }
    applyPromoResult(parsePromoImport(content))
  } catch (e) {
    uni.showToast({ title: e.message || 'AI 生成失败', icon: 'none' })
  } finally {
    aiLoading.value = false
  }
}

function copyCustomPrompt() {
  uni.setClipboardData({
    data: buildCustomHtmlPrompt(form, customExtra.value),
    success: () => uni.showToast({ title: '提示词已复制', icon: 'success' }),
  })
}

async function genCustomHtmlByAI() {
  if (customAiLoading.value) return
  customAiLoading.value = true
  try {
    const prompt = buildCustomHtmlPrompt(form, customExtra.value)
    const res = await adminPost('/zhao-studio/v1/admin/ai/chat', {
      messages: [{ role: 'user', content: prompt }],
    })
    const content = res?.data?.content || res?.content
    if (!content) {
      uni.showToast({ title: res?.data?.error || 'AI 未返回内容，请检查 AI 配置', icon: 'none' })
      return
    }
    // 剥离 markdown 代码块包裹后回填到编辑区
    let html = String(content)
    const wrapped = html.match(/```(?:html)?\s*([\s\S]*?)```/)
    if (wrapped) html = wrapped[1]
    customPromoHtml.value = html.trim()
    uni.showToast({ title: '已生成，请在下方编辑区核对', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || 'AI 生成失败', icon: 'none' })
  } finally {
    customAiLoading.value = false
  }
}

// ---- 保存（仅宣传字段）----
function insertPlaceholder(key) {
  customPromoHtml.value += '{{' + key + '}}'
  uni.showToast({ title: '已插入「' + key + '」占位符', icon: 'none' })
}

async function save() {
  if (activeScheme.value === 'custom') {
    // 若处于可视化模式，先把可视化编辑结果同步回源码再入库
    commitVisualToHtml()
    saving.value = true
    try {
      // 入库前安全清洗：去掉 html/head/body 等多余包裹标签，移除危险标签与 on* 事件属性，保留样式与正文
      const cleaned = sanitizeCustomHtml(customPromoHtml.value)
      const data = { customPromoHtml: cleaned || null, customPromoActive: true }
      await updateActivity(activityId.value, data)
      uni.showToast({ title: '已保存', icon: 'success' })
    } catch (e) {
      uni.showToast({ title: e.message || '保存失败', icon: 'none' })
    } finally {
      saving.value = false
    }
    return
  }
  if (!form.promoModules.length) return uni.showToast({ title: '至少需要一个宣传模块', icon: 'none' })
  saving.value = true
  try {
    const data = {
      title: form.title || undefined,
      description: form.description || undefined,
      promoTemplate: form.promoTemplate,
      promoModules: form.promoModules.map((m, i) => ({
        type: m.type,
        config: m.config && Object.keys(m.config).length ? m.config : {},
        sort: i,
      })),
      promoContact: sanitizePromoContact(form.promoContact),
      promoColors: form.promoColors || null,
      // AI 方案生效标记：切换 C 端显示为 promoModules；完全定制 HTML 保留（不清空）便于后续再编辑
      customPromoActive: false,
    }
    await updateActivity(activityId.value, data)
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

onLoad((opt) => { activityId.value = opt.id || '' })
onMounted(loadDetail)
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx 20rpx 40rpx; box-sizing: border-box; }
.btn-group { display: flex; gap: 16rpx; align-items: center; }
.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff; padding: 14rpx 32rpx; font-size: 28rpx; border-radius: 40rpx; border: none; line-height: 1.2;
}
.btn-ghost-h {
  background: #f5f5f5; color: #333; padding: 14rpx 32rpx; font-size: 28rpx; border-radius: 40rpx; border: none; line-height: 1.2;
}
.save-bar { display: flex; justify-content: center; padding: 30rpx 0; }
.save-btn { width: 100%; padding: 22rpx 0; font-size: 32rpx; border-radius: 44rpx; }

.loading { display: flex; justify-content: center; padding: 120rpx 0; color: #999; font-size: 28rpx; }

.activity-summary { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.summary-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.summary-title { font-size: 32rpx; font-weight: bold; color: #333; flex: 1; margin-right: 12rpx; }
.summary-meta { display: flex; gap: 16rpx; flex-wrap: wrap; }
.meta-item { font-size: 24rpx; color: #999; }
.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; }
.status-badge.draft { background: #f5f5f5; color: #999; }
.status-badge.open { background: #e6f7ff; color: #1890ff; }
.status-badge.ongoing { background: #fff7e6; color: #fa8c16; }
.status-badge.ended { background: #f6ffed; color: #52c41a; }
.status-badge.archived { background: #f0f0f0; color: #8c8c8c; }
.status-badge.default { background: #f5f5f5; color: #666; }

.form-section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; }
.form-item { margin-bottom: 16rpx; }
.form-label { display: block; font-size: 28rpx; color: #333; margin-bottom: 12rpx; }
.form-tip { font-size: 24rpx; color: #999; display: block; margin: 8rpx 0; }
.form-input {
  width: 100%; height: 80rpx; border: 1rpx solid #e3e6f0; border-radius: 8rpx;
  padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box; margin-bottom: 12rpx; background: #fff;
}
.media-select {
  position: relative; width: 160rpx; height: 160rpx;
  border-radius: 8rpx; overflow: hidden; background: #f5f5f5; margin-bottom: 12rpx;
}
.media-preview { width: 100%; height: 100%; }
.media-placeholder {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  font-size: 24rpx; color: #999; border: 2rpx dashed #ddd; border-radius: 8rpx; box-sizing: border-box;
}
.media-remove {
  position: absolute; top: 4rpx; right: 4rpx; width: 36rpx; height: 36rpx;
  background: rgba(0,0,0,0.5); color: #fff; border-radius: 50%;
  font-size: 22rpx; text-align: center; line-height: 36rpx;
}
.form-textarea {
  width: 100%; height: 200rpx; border: 1rpx solid #e3e6f0; border-radius: 8rpx;
  padding: 20rpx; font-size: 26rpx; box-sizing: border-box; background: #fff;
}
/* 完全定制 HTML 真实 DOM 预览容器：不内层滚动，交给外层 scroll-view 统一滚动，避免双滚动条 */
.custom-preview { width: 100%; background: #f2f3f7; border-radius: 8rpx; min-height: 200rpx; overflow: visible; }
.form-row { display: flex; gap: 12rpx; align-items: center; margin-bottom: 12rpx; }
.form-row .form-input { margin-bottom: 0; }
.form-inline { flex: 1; min-width: 0; }
.switch-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; font-size: 28rpx; color: #333; }

.ai-actions { display: flex; gap: 16rpx; margin-bottom: 8rpx; }
.btn-ai {
  flex: 1; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: #fff;
  padding: 18rpx 0; border-radius: 40rpx; font-size: 28rpx; border: none; line-height: 1.2;
}
.btn-ghost {
  flex: 1; background: #f5f5f5; color: #333; padding: 18rpx 0; border-radius: 40rpx;
  font-size: 28rpx; border: none; line-height: 1.2;
}
.suggest-box { background: #fffbe6; border: 1rpx solid #ffe58f; border-radius: 8rpx; padding: 16rpx 20rpx; }
.suggest-line { display: block; font-size: 24rpx; color: #ad6800; margin-bottom: 6rpx; }

.link-add { color: #667eea; font-size: 26rpx; padding: 12rpx 0; }
.link-del { color: #ff4d4f; font-size: 26rpx; padding: 4rpx 8rpx; }
.promo-template-row { display: flex; flex-wrap: wrap; gap: 16rpx; }
.promo-template-chip { padding: 14rpx 32rpx; font-size: 26rpx; color: #666; background: #fff; border: 1rpx solid #e3e6f0; border-radius: 30rpx; }
.promo-template-chip.on { color: #667eea; border-color: #667eea; background: rgba(102,126,234,.08); font-weight: bold; }
.tour-config-day { border: 2rpx solid #f0f0f0; border-radius: 12rpx; padding: 16rpx; margin-bottom: 16rpx; }
.tour-day-num { width: 120rpx; }
.tour-stop-time { width: 150rpx; }

.promo-fixed-row { display: flex; gap: 16rpx; padding: 10rpx 0; }
.promo-fixed-label { width: 140rpx; flex-shrink: 0; font-size: 26rpx; color: #999; }
.promo-fixed-value { flex: 1; min-width: 0; font-size: 26rpx; color: #333; }
.promo-fixed-speaker { padding: 10rpx 0; }
.promo-speaker-name { display: block; font-size: 28rpx; font-weight: bold; color: #333; }
.promo-speaker-bio { display: block; margin-top: 6rpx; font-size: 24rpx; color: #666; line-height: 1.5; }
.promo-fixed-empty { display: block; font-size: 26rpx; color: #999; padding: 10rpx 0; }

.palette-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.palette-card { width: calc(25% - 12rpx); box-sizing: border-box; border: 1rpx solid #e3e6f0; border-radius: 12rpx; padding: 12rpx; background: #fff; }
.palette-card.on { border-color: #667eea; background: rgba(102,126,234,.08); }
.palette-swatch { display: flex; flex-wrap: wrap; gap: 4rpx; margin-bottom: 8rpx; }
.palette-swatch-main { width: 100%; height: 40rpx; border-radius: 6rpx; }
.palette-swatch-bg, .palette-swatch-card, .palette-swatch-accent { width: calc(33.33% - 3rpx); height: 24rpx; border-radius: 6rpx; }
.palette-name { font-size: 22rpx; color: #333; text-align: center; display: block; }
.palette-preview { border-radius: 12rpx; padding: 20rpx; margin-top: 16rpx; display: flex; align-items: center; gap: 12rpx; }
.palette-preview-chip { padding: 6rpx 16rpx; border-radius: 20rpx; font-size: 22rpx; color: #fff; }
.palette-preview-card { padding: 6rpx 16rpx; border-radius: 8rpx; font-size: 22rpx; }
.palette-preview-text { font-size: 24rpx; }
.palette-editor { border-top: 1rpx dashed #e3e6f0; margin-top: 16rpx; padding-top: 16rpx; }
.palette-key { width: 140rpx; font-size: 26rpx; color: #666; flex-shrink: 0; }

.promo-module-row { border: 1rpx solid #f0f0f0; border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 16rpx; background: #fff; }
.promo-module-name { display: flex; align-items: center; justify-content: space-between; font-size: 28rpx; color: #333; }
.promo-module-arrow { font-size: 20rpx; color: #999; }
.promo-module-ops { display: flex; gap: 16rpx; margin-top: 12rpx; }
.promo-module-config { border-top: 1rpx dashed #e3e6f0; margin-top: 16rpx; padding-top: 16rpx; }
.promo-module-image-row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin-bottom: 12rpx; }
.promo-module-image-name { flex: 1; min-width: 0; font-size: 26rpx; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.modal-content { width: 90%; background: #fff; border-radius: 16rpx; overflow: hidden; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 30rpx; border-bottom: 1rpx solid #f0f0f0; }
.modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.modal-close { font-size: 36rpx; color: #999; padding: 10rpx; }
.promo-module-add-grid { display: flex; flex-wrap: wrap; gap: 16rpx; padding: 30rpx; }
.promo-module-add-item {
  width: calc(33.33% - 12rpx); padding: 24rpx 0; text-align: center; background: #f5f5f5;
  border-radius: 8rpx; font-size: 26rpx; color: #333; box-sizing: border-box;
}

/* 预览弹窗 */
.preview-modal {
  width: 94%; max-width: 760rpx; height: 82vh; background: #fff; border-radius: 16rpx;
  overflow: hidden; display: flex; flex-direction: column;
}
.preview-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24rpx 30rpx; border-bottom: 1rpx solid #f0f0f0; flex-shrink: 0;
}
.preview-title { font-size: 30rpx; font-weight: bold; color: #333; }
.preview-close { font-size: 36rpx; color: #999; padding: 10rpx; }
.preview-scroll { flex: 1; min-height: 0; }
.preview-body { min-height: 100%; padding: 24rpx 0 80rpx; background: var(--c-bg); }
.preview-empty { padding: 80rpx 0; text-align: center; font-size: 26rpx; color: var(--c-text-dim); }

.scheme-tabs{display:flex;gap:16rpx;margin-bottom:20rpx;}
.scheme-tab{flex:1;text-align:center;padding:20rpx 0;font-size:28rpx;color:#666;background:#fff;border-radius:12rpx;border:1rpx solid #e3e6f0;}
.scheme-tab.on{color:#667eea;border-color:#667eea;background:rgba(102,126,234,.08);font-weight:bold;}
/* 「源码 / 可视化」模式切换：同一行内并排显示（覆写 .scheme-tab 的 flex:1，改为自适应宽度的胶囊按钮） */
.custom-mode-switch{display:flex;align-items:center;gap:12rpx;margin-bottom:16rpx;}
.custom-mode-switch .scheme-tab{flex:0 0 auto;width:auto;padding:12rpx 40rpx;font-size:26rpx;border-radius:30rpx;float:none;}
.custom-mode-switch .clear-src{margin-left:auto;flex:0 0 auto;padding:12rpx 26rpx;font-size:24rpx;border-radius:30rpx;background:#fff;border:1rpx solid #e3e6f0;color:#999;cursor:pointer;}
.custom-mode-switch .clear-src.recovering{color:#e74c3c;border-color:#e74c3c;background:#fff5f5;}
.custom-mode-switch .clear-src:active{opacity:.7;}
.visual-toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:12rpx;padding:14rpx;margin-bottom:14rpx;background:#fff;border:1rpx solid #e3e6f0;border-radius:12rpx;}
.vt-label{font-size:22rpx;color:#999;margin-left:6rpx;}
.vt-chip{flex:0 0 auto;padding:6rpx 18rpx;font-size:24rpx;border:1rpx solid #ddd;border-radius:20rpx;color:#555;cursor:pointer;background:#fff;}
.vt-chip:active{color:#667eea;border-color:#667eea;}
.vt-color{width:40rpx;height:40rpx;border-radius:8rpx;border:1rpx solid rgba(0,0,0,.12);cursor:pointer;flex:0 0 auto;}
.vt-color:active{box-shadow:0 0 0 3rpx rgba(102,126,234,.4);}
.vt-btn{flex:0 0 auto;padding:6rpx 20rpx;font-size:24rpx;border:1rpx solid #ddd;border-radius:20rpx;color:#555;cursor:pointer;background:#fff;}
.vt-btn.on{color:#fff;background:#667eea;border-color:#667eea;}
.vt-btn:active{opacity:.8;}
.placeholder-toolbar{display:flex;flex-wrap:wrap;gap:12rpx;margin:16rpx 0;}
.placeholder-chip{padding:10rpx 22rpx;font-size:24rpx;color:#667eea;background:#f0f4ff;border-radius:30rpx;border:1rpx solid #d6e0ff;}
/* 完全定制：源码 textarea 与可视化渲染容器 */
.custom-html-src{height:520rpx;font-family:monospace;white-space:pre;}
.custom-visual-box{width:100%;background:#f2f3f7;border:1rpx solid #e3e6f0;border-radius:12rpx;min-height:400rpx;overflow:visible;}
.custom-visual-box.is-editable{background:#fff;padding:16rpx;box-sizing:border-box;}
.custom-visual-box.is-editable:focus{outline:none;}
.custom-visual-box.is-editable img{cursor:pointer;}
.visual-empty{padding:80rpx 0;text-align:center;font-size:26rpx;color:#999;background:#f2f3f7;border:1rpx solid #e3e6f0;border-radius:12rpx;}

/* 预览对齐 C 端：悬浮留言入口 + 示例弹层 */
.preview-float-msg {
  position: fixed; right: 28rpx; bottom: 48rpx; z-index: 70;
  width: 92rpx; height: 92rpx; border-radius: 50%;
  background: var(--c-primary, #667eea); color: #fff;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.18);
}
.preview-msg-badge {
  position: absolute; top: -4rpx; right: -4rpx;
  min-width: 28rpx; height: 28rpx; padding: 0 6rpx; box-sizing: border-box;
  border-radius: 14rpx; background: #ff3b30; color: #fff; font-size: 18rpx;
  line-height: 28rpx; text-align: center;
}
.preview-msg-label { font-size: 20rpx; margin-top: 4rpx; }
.preview-small { width: 84%; max-width: 640rpx; height: auto; max-height: 78vh; padding-bottom: 40rpx; }
.preview-qr { display: flex; align-items: center; justify-content: center; padding: 40rpx 30rpx 10rpx; }
.preview-qr-img { width: 320rpx; height: 320rpx; }
.preview-qr-empty { width: 320rpx; height: 320rpx; display: flex; align-items: center; justify-content: center; background: #f5f6fa; color: #999; font-size: 26rpx; border-radius: 12rpx; }
.preview-qr-tip { display: block; text-align: center; padding: 0 40rpx 20rpx; font-size: 24rpx; color: var(--c-text-dim, #999); }
.preview-btn-close { margin: 10rpx 40rpx 0; padding: 18rpx 0; text-align: center; font-size: 28rpx; color: #fff; background: var(--c-primary, #667eea); border-radius: 12rpx; }
.preview-msg-list { max-height: 400rpx; padding: 24rpx 30rpx; overflow-y: auto; }
.preview-msg-item { padding: 20rpx; border-radius: 12rpx; background: #f5f6fa; }
.preview-msg-role {
  display: inline-block; padding: 4rpx 14rpx; margin-right: 10rpx; border-radius: 8rpx;
  font-size: 22rpx; color: #fff; background: #4f7cff;
}
.preview-msg-role--a { background: #07c160; }
.preview-msg-nick { font-size: 24rpx; color: #999; }
.preview-msg-content { display: block; margin-top: 12rpx; font-size: 26rpx; color: #333; }
.preview-msg-reply { margin-top: 16rpx; padding: 14rpx 16rpx; border-radius: 10rpx; background: #fff; }
.preview-msg-reply-text { font-size: 26rpx; color: #333; }
</style>

<style lang="scss">
/* 宣传页主题配色（与 C 端 promo-themes.scss 一致，需全局生效以穿透子组件） */
@import '../../styles/promo-themes.scss';
</style>
