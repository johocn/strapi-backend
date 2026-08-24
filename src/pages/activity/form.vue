<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑活动' : '新建活动'">
      <button class="btn-primary" @click="handleSubmit">保存</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">基本信息</view>

        <view class="form-item">
          <text class="form-label">活动标题 <text class="required">*</text></text>
          <input type="text" v-model="form.title" placeholder="请输入活动标题" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">活动分类</text>
          <view class="picker-create-row">
            <picker class="picker-grow" mode="selector" :range="categoryNames" @change="handleCategoryChange">
              <view class="picker-value">
                <text :class="['picker-placeholder', { empty: !form.category }]">{{ form.category || '不填分类' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
            <view class="quick-create" @click="quickCreateCategory">＋新建</view>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">活动描述</text>
          <textarea v-model="form.description" placeholder="请输入活动描述" class="form-textarea" />
        </view>

        <view class="form-item">
          <text class="form-label">回放与资料</text>
          <input type="text" v-model="form.assets.recordingUrl" placeholder="回放视频链接(URL)" class="form-input" />
          <view v-for="(m, i) in form.assets.materials" :key="i" class="form-row assets-row">
            <input type="text" v-model="m.name" placeholder="资料名称" class="form-input form-inline" />
            <input type="text" v-model="m.url" placeholder="资料URL" class="form-input form-inline" />
            <view class="link-del" @click="removeMaterial(i)">删除</view>
          </view>
          <view class="link-add" @click="addMaterial">+ 添加资料</view>
        </view>

        <view class="form-item">
          <text class="form-label">所属系列</text>
          <view class="picker-create-row">
            <picker class="picker-grow" mode="selector" :range="seriesNames" @change="handleSeriesChange">
              <view class="picker-value">
                <text class="picker-placeholder" :class="{ empty: !form.belongsToSeries }">{{ seriesNames[seriesIndex] || '不归属系列' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
            <view class="quick-create" @click="quickCreateSeries">＋新建</view>
          </view>
        </view>

        <view class="form-row">
          <view class="form-item half">
            <text class="form-label">开始时间</text>
            <picker mode="date" :value="datePart(form.startTime)" @change="onDatetime('startTime', 'date', $event.detail.value)">
              <view class="picker-value">
                <text :class="{ empty: !datePart(form.startTime) }">{{ datePart(form.startTime) || '选择日期' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
            <picker class="dt-time" mode="time" :value="timePart(form.startTime)" @change="onDatetime('startTime', 'time', $event.detail.value)">
              <view class="picker-value">
                <text :class="{ empty: !timePart(form.startTime) }">{{ timePart(form.startTime) || '00:00' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item half">
            <text class="form-label">结束时间</text>
            <picker mode="date" :value="datePart(form.endTime)" @change="onDatetime('endTime', 'date', $event.detail.value)">
              <view class="picker-value">
                <text :class="{ empty: !datePart(form.endTime) }">{{ datePart(form.endTime) || '选择日期' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
            <picker class="dt-time" mode="time" :value="timePart(form.endTime)" @change="onDatetime('endTime', 'time', $event.detail.value)">
              <view class="picker-value">
                <text :class="{ empty: !timePart(form.endTime) }">{{ timePart(form.endTime) || '00:00' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">报名设置</view>

        <view class="form-item">
          <text class="form-label">容量 <text class="required">*</text></text>
          <input type="number" v-model="form.capacity" placeholder="默认100" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">计费模式</text>
          <picker mode="selector" :range="pricingModeLabels" @change="handlePricingModeChange">
            <view class="picker-value">
              <text>{{ pricingModeLabels[pricingModeIndex] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <view v-if="form.pricingMode === 'flat'" class="form-item">
          <text class="form-label">积分价</text>
          <input type="number" v-model="form.pointsCost" placeholder="0=免费" class="form-input" />
        </view>

        <view v-if="form.pricingMode === 'tier'" class="form-item">
          <text class="form-label">费用档位</text>
          <view v-for="(tier, ti) in form.feeTiers" :key="ti" class="fee-block">
            <view class="fee-block-header">
              <text class="fee-block-title">第 {{ ti + 1 }} 档</text>
              <button class="btn-link-danger" @click="removeTier(ti)">删除</button>
            </view>

            <view class="form-item fee-field">
              <text class="form-label">档名</text>
              <input type="text" v-model="tier.name" placeholder="如：早鸟 / 正价" class="form-input" />
            </view>

            <view class="form-row">
              <view class="form-item half">
                <text class="form-label">顺序</text>
                <input type="number" v-model="tier.order" placeholder="数字越小越靠前" class="form-input" />
              </view>
              <view class="form-item half">
                <text class="form-label">用户类型</text>
                <input type="text" v-model="tier.userType" placeholder="all|partner|segment:S" class="form-input" />
              </view>
            </view>

            <view class="form-row">
              <view class="form-item half">
                <text class="form-label">窗口开始</text>
                <picker mode="date" :value="tier.window.start" @change="e => tier.window.start = e.detail.value">
                  <view class="picker-value">
                    <text>{{ tier.window.start || '请选择' }}</text>
                    <text class="picker-arrow">▼</text>
                  </view>
                </picker>
              </view>
              <view class="form-item half">
                <text class="form-label">窗口结束</text>
                <picker mode="date" :value="tier.window.end" @change="e => tier.window.end = e.detail.value">
                  <view class="picker-value">
                    <text>{{ tier.window.end || '请选择' }}</text>
                    <text class="picker-arrow">▼</text>
                  </view>
                </picker>
              </view>
            </view>

            <view class="form-row">
              <view class="form-item half">
                <text class="form-label">配额（名额）</text>
                <input type="number" v-model="tier['fee-quota']" placeholder="留空不限制" class="form-input" />
              </view>
              <view class="form-item half">
                <text class="form-label">积分价</text>
                <input type="number" v-model="tier.pointsCost" placeholder="0=免费" class="form-input" />
              </view>
            </view>

            <view class="form-item fee-field">
              <text class="form-label">扣费点</text>
              <picker mode="selector" :range="feeLabels" @change="handleTierFeeChange(ti, $event)">
                <view class="picker-value">
                  <text>{{ tierFeeLabel(tier) }}</text>
                  <text class="picker-arrow">▼</text>
                </view>
              </picker>
            </view>
          </view>
          <button class="btn-add" @click="addTier">添加档位</button>
        </view>

        <view v-if="form.pricingMode === 'factor'" class="form-item">
          <text class="form-label">基础积分</text>
          <input type="number" v-model="form.feeFactors.base" placeholder="0=免费" class="form-input" />
        </view>

        <view v-if="form.pricingMode === 'factor'" class="form-item">
          <text class="form-label">计费因子</text>
          <view v-for="(f, fi) in form.feeFactors.factors" :key="fi" class="fee-block">
            <view class="fee-block-header">
              <text class="fee-block-title">因子 {{ fi + 1 }}</text>
              <button class="btn-link-danger" @click="removeFactor(fi)">删除</button>
            </view>

            <view class="form-item fee-field">
              <text class="form-label">类型</text>
              <picker mode="selector" :range="factorTypeLabels" @change="handleFactorTypeChange(fi, $event)">
                <view class="picker-value">
                  <text>{{ factorTypeLabel(f.type) }}</text>
                  <text class="picker-arrow">▼</text>
                </view>
              </picker>
            </view>

            <view v-if="isWindowFactor(f.type)" class="form-row">
              <view class="form-item half">
                <text class="form-label">生效至</text>
                <picker mode="date" :value="f.until" @change="e => f.until = e.detail.value">
                  <view class="picker-value">
                    <text>{{ f.until || '请选择' }}</text>
                    <text class="picker-arrow">▼</text>
                  </view>
                </picker>
              </view>
              <view class="form-item half">
                <text class="form-label">生效自</text>
                <picker mode="date" :value="f.from" @change="e => f.from = e.detail.value">
                  <view class="picker-value">
                    <text>{{ f.from || '请选择' }}</text>
                    <text class="picker-arrow">▼</text>
                  </view>
                </picker>
              </view>
            </view>

            <view v-if="isWindowFactor(f.type) || f.type === 'flat_discount_amount'" class="form-item fee-field">
              <text class="form-label">金额</text>
              <input type="number" v-model="f.amount" placeholder="0=不设置" class="form-input" />
            </view>

            <view v-if="f.type === 'segment_discount_percent'" class="form-row">
              <view class="form-item half">
                <text class="form-label">最小分段</text>
                <input type="text" v-model="f.minSegment" placeholder="如 segment:A" class="form-input" />
              </view>
              <view class="form-item half">
                <text class="form-label">折扣百分比</text>
                <input type="number" v-model="f.percent" placeholder="如 80" class="form-input" />
              </view>
            </view>
          </view>
          <button class="btn-add" @click="addFactor">添加因子</button>
        </view>

        <view class="form-item">
          <text class="form-label">计费点</text>
          <picker mode="selector" :range="feeLabels" @change="handleFeeChange">
            <view class="picker-value">
              <text>{{ feeLabels[feeIndex] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-row">
          <view class="form-item half">
            <text class="form-label">报名开始</text>
            <picker mode="date" :value="datePart(form.signupStart)" @change="onDatetime('signupStart', 'date', $event.detail.value)">
              <view class="picker-value">
                <text :class="{ empty: !datePart(form.signupStart) }">{{ datePart(form.signupStart) || '选择日期' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
            <picker class="dt-time" mode="time" :value="timePart(form.signupStart)" @change="onDatetime('signupStart', 'time', $event.detail.value)">
              <view class="picker-value">
                <text :class="{ empty: !timePart(form.signupStart) }">{{ timePart(form.signupStart) || '00:00' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item half">
            <text class="form-label">报名结束</text>
            <picker mode="date" :value="datePart(form.signupEnd)" @change="onDatetime('signupEnd', 'date', $event.detail.value)">
              <view class="picker-value">
                <text :class="{ empty: !datePart(form.signupEnd) }">{{ datePart(form.signupEnd) || '选择日期' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
            <picker class="dt-time" mode="time" :value="timePart(form.signupEnd)" @change="onDatetime('signupEnd', 'time', $event.detail.value)">
              <view class="picker-value">
                <text :class="{ empty: !timePart(form.signupEnd) }">{{ timePart(form.signupEnd) || '00:00' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">分享奖励积分（下线报名给分享者的积分）</text>
          <input type="number" v-model="form.shareRewardPoints" placeholder="0=不奖励" class="form-input" />
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">报名表单配置</view>
        <view class="form-tip">报名时收集的字段（不配置则报名只填基础信息）</view>

        <view class="form-item">
          <text class="form-label">常用字段</text>
          <view class="template-toolbar">
            <view class="template-btn" @click="addDefaultFields">＋ 一键添加姓名/电话/备注</view>
            <view class="template-btn" @click="openTemplatePicker(form.formConfig.length)">从模板导入字段</view>
          </view>
        </view>

        <view v-for="(f, fi) in form.formConfig" :key="fi" class="field-slot">
          <view class="template-insert">
            <view class="template-insert-btn" @click="openTemplatePicker(fi)">＋ 从模板导入</view>
            <view class="template-insert-btn" @click="addFormFieldAt(fi)">＋ 添加字段</view>
          </view>
          <view class="fee-block">
            <view class="fee-block-header">
              <text class="fee-block-title">字段 {{ fi + 1 }}</text>
              <button class="btn-link-danger" @click="removeFormField(fi)">删除</button>
            </view>
            <view class="form-row">
              <view class="form-item half">
                <text class="form-label">key</text>
                <input type="text" v-model="f.key" placeholder="如 name" class="form-input" />
              </view>
              <view class="form-item half">
                <text class="form-label">标签</text>
                <input type="text" v-model="f.label" placeholder="如 姓名" class="form-input" />
              </view>
            </view>
            <view class="form-row">
              <view class="form-item half">
                <text class="form-label">类型</text>
                <picker mode="selector" :range="formTypeLabels" @change="handleFormTypeChange(fi, $event)">
                  <view class="picker-value">
                    <text>{{ formTypeLabel(f.type) }}</text>
                    <text class="picker-arrow">▼</text>
                  </view>
                </picker>
              </view>
              <view class="form-item half">
                <text class="form-label">必填</text>
                <view class="radio-row">
                  <text :class="['radio-opt', { on: f.required }]" @click="f.required = true">是</text>
                  <text :class="['radio-opt', { on: !f.required }]" @click="f.required = false">否</text>
                </view>
              </view>
            </view>
            <view v-if="f.type === 'number'" class="form-row">
              <view class="form-item half">
                <text class="form-label">最小值</text>
                <input type="number" v-model="f.min" class="form-input" />
              </view>
              <view class="form-item half">
                <text class="form-label">最大值</text>
                <input type="number" v-model="f.max" class="form-input" />
              </view>
            </view>
            <view v-if="f.type === 'radio' || f.type === 'select' || f.type === 'multi'" class="form-item fee-field">
              <text class="form-label">选项</text>
              <view v-for="(o, oi) in f.options" :key="oi" class="opt-row">
                <input type="text" v-model="f.options[oi]" placeholder="选项内容" class="form-input" />
                <text class="opt-del" @click="removeFormOption(fi, oi)">✕</text>
              </view>
              <button class="btn-add" @click="addFormOption(fi)">添加选项</button>
            </view>
          </view>
        </view>
        <view class="template-insert">
          <view class="template-insert-btn" @click="openTemplatePicker(form.formConfig.length)">＋ 从模板导入</view>
          <view class="template-insert-btn" @click="addFormFieldAt(form.formConfig.length)">＋ 添加字段</view>
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">资源排期</view>
        <view class="form-tip">选择讲师/场地后，保存时将自动检测时间是否冲突（含缓冲时间）</view>

        <view class="form-item">
          <text class="form-label">讲师</text>
          <view class="picker-create-row">
            <picker class="picker-grow" mode="selector" :range="lecturerNames" @change="handleLecturerChange">
              <view class="picker-value">
                <text :class="['picker-placeholder', { empty: !lecturerId }]">{{ currentLecturerName || '不选择讲师' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
            <view class="quick-create" @click="quickCreateLecturer">＋新建</view>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">场地</text>
          <view class="picker-create-row">
            <picker class="picker-grow" mode="selector" :range="venueNames" @change="handleVenueChange">
              <view class="picker-value">
                <text :class="['picker-placeholder', { empty: !venueId }]">{{ currentVenueName || '不选择场地' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
            <view class="quick-create" @click="quickCreateVenue">＋新建</view>
          </view>
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">内容解锁与学习资料</view>
        <view class="form-tip">报名后解锁 / 发放学习资料包：可关联平台文章与课程课时，报名成功后自动生效</view>

        <view class="fee-block">
          <view class="fee-block-header">
            <text class="fee-block-title">报名后解锁</text>
            <text class="fee-block-hint">用户报名成功后解锁以下内容</text>
          </view>
          <view class="form-item">
            <text class="form-label">解锁文章</text>
            <view v-if="form.preUnlockArticles.length" class="rel-chips">
              <view v-for="(a, ai) in form.preUnlockArticles" :key="ai" class="rel-chip">
                <text class="rel-chip-name">{{ a.title || `#${a.id || a.documentId}` }}</text>
                <text class="rel-chip-del" @click="removeRel('preUnlockArticles', ai)">✕</text>
              </view>
            </view>
            <view class="link-add" @click="openRelPicker('preUnlockArticles')">+ 选择文章</view>
          </view>
          <view class="form-item">
            <text class="form-label">解锁课时</text>
            <view v-if="form.preUnlockLessons.length" class="rel-chips">
              <view v-for="(l, li) in form.preUnlockLessons" :key="li" class="rel-chip">
                <text class="rel-chip-name">{{ l.title || `#${l.id || l.documentId}` }}</text>
                <text class="rel-chip-del" @click="removeRel('preUnlockLessons', li)">✕</text>
              </view>
            </view>
            <view class="link-add" @click="openRelPicker('preUnlockLessons')">+ 选择课时</view>
          </view>
        </view>

        <view class="fee-block">
          <view class="fee-block-header">
            <text class="fee-block-title">学习资料包</text>
            <text class="fee-block-hint">报名后发放的参考资料</text>
          </view>
          <view class="form-item">
            <text class="form-label">资料文章</text>
            <view v-if="form.learningPackageArticles.length" class="rel-chips">
              <view v-for="(a, ai) in form.learningPackageArticles" :key="ai" class="rel-chip">
                <text class="rel-chip-name">{{ a.title || `#${a.id || a.documentId}` }}</text>
                <text class="rel-chip-del" @click="removeRel('learningPackageArticles', ai)">✕</text>
              </view>
            </view>
            <view class="link-add" @click="openRelPicker('learningPackageArticles')">+ 选择文章</view>
          </view>
          <view class="form-item">
            <text class="form-label">资料课时</text>
            <view v-if="form.learningPackageLessons.length" class="rel-chips">
              <view v-for="(l, li) in form.learningPackageLessons" :key="li" class="rel-chip">
                <text class="rel-chip-name">{{ l.title || `#${l.id || l.documentId}` }}</text>
                <text class="rel-chip-del" @click="removeRel('learningPackageLessons', li)">✕</text>
              </view>
            </view>
            <view class="link-add" @click="openRelPicker('learningPackageLessons')">+ 选择课时</view>
          </view>
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">报名奖励配置</view>
        <view class="form-tip">报名成功后自动发放/解锁奖励；每项奖励可配「附加条件」与「发放方式」，客户可全选或任选权益</view>

        <view class="fee-block">
          <view class="fee-block-header">
            <text class="fee-block-title">奖励开关</text>
          </view>
          <view class="form-item">
            <text class="form-label">启用报名奖励</text>
            <switch :checked="!!form.rewardConfig?.loginEnabled" @change="toggleRewardEnabled" />
          </view>
        </view>

        <template v-if="form.rewardConfig?.loginEnabled">
          <view class="fee-block">
            <view class="fee-block-header">
              <text class="fee-block-title">信息解锁通道</text>
              <text class="fee-block-hint">勾选后，对应表单字段将作为奖励「附加条件」的判定依据</text>
            </view>
            <view class="form-row">
              <view class="form-item half">
                <text class="form-label">留联系方式</text>
                <switch :checked="hasInfoChannel('contact')" @change="toggleInfoChannel('contact')" />
              </view>
              <view class="form-item half">
                <text class="form-label">回答调查问卷</text>
                <switch :checked="hasInfoChannel('survey')" @change="toggleInfoChannel('survey')" />
              </view>
            </view>
          </view>

          <view class="fee-block">
            <view class="fee-block-header">
              <text class="fee-block-title">奖励列表</text>
              <text class="fee-block-hint">基础自动（不进入客户勾选菜单）｜客户自选（全选/任选）</text>
            </view>
            <view v-for="(rw, ri) in form.rewardConfig.rewards" :key="ri" class="reward-block">
              <view class="fee-block-header">
                <text class="fee-block-title">奖励 {{ ri + 1 }} · {{ rewardTypeName(rw.type) }}</text>
                <view class="reward-ops">
                  <text class="btn-link" @click="moveReward(ri, -1)">↑</text>
                  <text class="btn-link" @click="moveReward(ri, 1)">↓</text>
                  <text class="btn-link-danger" @click="removeReward(ri)">删除</text>
                </view>
              </view>
              <view class="form-row">
                <view class="form-item half">
                  <text class="form-label">名称</text>
                  <input v-model="rw.name" class="form-input" placeholder="如 报名积分" />
                </view>
                <view class="form-item half">
                  <text class="form-label">类型</text>
                  <picker mode="selector" :range="rewardTypeLabels" :value="rewardTypeIndex(rw.type)" @change="e => rw.type = rewardTypeValues[Number(e.detail.value)] || 'points'">
                    <view class="picker-value"><text>{{ rewardTypeName(rw.type) }}</text><text class="picker-arrow">▼</text></view>
                  </picker>
                </view>
              </view>
              <view class="form-row">
                <view class="form-item half">
                  <text class="form-label">发放方式</text>
                  <picker mode="selector" :range="['基础自动', '客户自选']" :value="rw.mode === 'multi' ? 1 : 0" @change="e => rw.mode = Number(e.detail.value) === 1 ? 'multi' : 'single'">
                    <view class="picker-value"><text>{{ rw.mode === 'multi' ? '客户自选' : '基础自动' }}</text><text class="picker-arrow">▼</text></view>
                  </picker>
                </view>
                <view class="form-item half">
                  <text class="form-label">附加条件</text>
                  <picker mode="selector" :range="conditionLabels" :value="conditionIndex(rw.condition)" @change="e => rw.condition = conditionValues[Number(e.detail.value)]">
                    <view class="picker-value"><text>{{ conditionLabel(rw.condition) }}</text><text class="picker-arrow">▼</text></view>
                  </picker>
                </view>
              </view>

              <view v-if="rw.type === 'points'" class="form-item">
                <text class="form-label">积分数量</text>
                <input type="number" v-model="rw.amount" class="form-input" placeholder="如 50" />
              </view>

              <view v-else-if="rw.type === 'course_trial'" class="form-item">
                <text class="form-label">试听课程</text>
                <view v-if="rw.courseTitle" class="rel-chip">
                  <text class="rel-chip-name">{{ rw.courseTitle }}</text>
                  <text class="rel-chip-del" @click="rw.courseId = undefined; rw.courseTitle = ''">✕</text>
                </view>
                <view v-else class="link-add" @click="pickCourse(ri)">+ 选择课程</view>
              </view>

              <view v-else-if="rw.type === 'course_outline'" class="form-item">
                <text class="form-label">资料类型</text>
                <picker mode="selector" :range="outlineKindLabels" :value="outlineKindIndex(rw.kind)" @change="e => rw.kind = outlineKindValues[Number(e.detail.value)]">
                  <view class="picker-value"><text>{{ outlineKindLabel(rw.kind) }}</text><text class="picker-arrow">▼</text></view>
                </picker>
                <view v-if="rw.kind === 'article'" class="form-item-inner">
                  <view v-if="rw.articleTitle" class="rel-chip">
                    <text class="rel-chip-name">{{ rw.articleTitle }}</text>
                    <text class="rel-chip-del" @click="rw.articleId = undefined; rw.articleTitle = ''">✕</text>
                  </view>
                  <view v-else class="link-add" @click="pickArticle(ri)">+ 选择文章</view>
                </view>
                <view v-else-if="rw.kind === 'file'" class="form-item-inner">
                  <input v-model="rw.link" class="form-input" placeholder="资料下载链接" />
                </view>
                <view v-else-if="rw.kind === 'lesson'" class="form-item-inner">
                  <view v-if="rw.lessonTitle" class="rel-chip">
                    <text class="rel-chip-name">{{ rw.lessonTitle }}</text>
                    <text class="rel-chip-del" @click="rw.lessonId = undefined; rw.lessonTitle = ''">✕</text>
                  </view>
                  <view v-else class="link-add" @click="pickLesson(ri)">+ 选择课时</view>
                </view>
              </view>

              <view v-else-if="rw.type === 'coupon'" class="form-row">
                <view class="form-item half">
                  <text class="form-label">优惠券 ID</text>
                  <input type="number" v-model="rw.couponId" class="form-input" placeholder="zhao-deal 优惠券 id" />
                </view>
                <view class="form-item half">
                  <text class="form-label">优惠券名称</text>
                  <input v-model="rw.couponName" class="form-input" placeholder="如 满100减20" />
                </view>
              </view>
            </view>
            <view class="link-add" @click="addReward">+ 添加奖励</view>
          </view>
        </template>
      </view>

      <view class="form-section">
        <view class="section-title">核销与会场定位</view>

        <view class="form-item">
          <text class="form-label">核销方式</text>
          <picker mode="selector" :range="checkinModeLabels" @change="handleCheckinModeChange">
            <view class="picker-value">
              <text>{{ checkinModeLabels[checkinModeIndex] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">启用地理围栏</text>
          <switch :checked="form.geoEnforced" @change="form.geoEnforced = !form.geoEnforced" />
        </view>

        <view class="form-item">
          <text class="form-label">地理围栏半径（米）</text>
          <input type="number" v-model="form.geoRadiusM" placeholder="默认500" class="form-input" />
        </view>

        <view class="form-row">
          <view class="form-item half">
            <text class="form-label">纬度 lat</text>
            <input type="digit" v-model="form.lat" placeholder="经度" class="form-input" />
          </view>
          <view class="form-item half">
            <text class="form-label">经度 lng</text>
            <input type="digit" v-model="form.lng" placeholder="纬度" class="form-input" />
          </view>
        </view>
      </view>

      <view class="form-section" v-if="roleGate">
        <view class="section-title">可见角色</view>
        <view class="form-item">
          <text class="form-label">设置可见角色</text>
          <view class="visible-roles-group">
            <view
              v-for="r in roleOptions"
              :key="r.name"
              class="visible-role-opt"
              :class="{ 'visible-role-opt-selected': form.visibleToRoles.includes(r.name) }"
              @click="toggleVisibleRole(r.name)"
            >
              <text>{{ r.displayName || r.name }}</text>
              <text v-if="form.visibleToRoles.includes(r.name)" class="visible-role-check">✓</text>
            </view>
            <view v-if="roleOptions.length === 0" class="form-tip">未获取到角色</view>
          </view>
          <text class="form-tip">不勾选（留空）表示对所有角色可见</text>
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">状态</view>
        <view class="form-item">
          <text class="form-label">活动状态</text>
          <picker mode="selector" :range="statusOptions" @change="handleStatusChange">
            <view class="picker-value">
              <text>{{ statusOptions[statusIndex] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>
    </scroll-view>

    <view class="bottom-action">
      <button class="btn-save" @click="handleSubmit">保存活动</button>
    </view>

    <view v-if="relPicker.visible" class="rel-mask" @click="closeRelPicker">
      <view class="rel-panel" @click.stop>
        <view class="rel-panel-header">
          <text class="rel-panel-title">{{ relPicker.title }}</text>
          <text class="rel-panel-close" @click="closeRelPicker">✕</text>
        </view>
        <scroll-view scroll-y class="rel-panel-list">
          <view v-for="it in relPicker.list" :key="it.documentId || it.id" class="rel-opt" @click="toggleRelPick(it)">
            <view class="rel-check" :class="{ on: isRelPicked(it) }">
              <text v-if="isRelPicked(it)" class="rel-check-mark">✓</text>
            </view>
            <text class="rel-opt-name">{{ it.title || it.name || `#${it.id}` }}</text>
          </view>
          <view v-if="!relPicker.list.length" class="form-tip rel-empty">暂无可选内容</view>
        </scroll-view>
        <view class="rel-panel-footer">
          <button class="btn-plain" @click="closeRelPicker">取消</button>
          <button class="btn-primary" @click="confirmRelPicker">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getActivity, createActivity, updateActivity, listSeries, createSeries } from '../../api/activity.js'
import { articleApi } from '../../api/website.js'
import { getLessonList, getCourseList } from '../../api/course.js'
import { listLecturers, listVenues, checkSchedule, createLecturer, createVenue } from '../../api/resource.js'
import { getTagList, getTagGroupList, createTag } from '../../api/tag.js'
import { getAllRoles } from '../../api/auth.js'
import { loadSiteConfig, isFeatureEnabled } from '../../utils/config-helper.js'
import PageHeader from '../../components/PageHeader.vue'

const isEdit = ref(false)
const activityId = ref('')

const seriesList = ref([])
const seriesNames = computed(() => ['不归属系列', ...seriesList.value.map(s => s.title || '未命名系列')])
const seriesIndex = ref(0)

// 活动分类：option 来自 activity-category 分组标签
const categoryList = ref([])
const categoryNames = computed(() => ['不填分类', ...categoryList.value.map(t => t.name || '')])

function handleCategoryChange(e) {
  const idx = Number(e.detail.value)
  form.category = idx === 0 ? '' : String(categoryList.value[idx - 1]?.name || '')
}

async function loadCategories() {
  try {
    const res = await getTagList({ page: 1, pageSize: 500, 'filters[tagGroup][slug][$eq]': 'activity-category' })
    categoryList.value = (res.list || []).filter(t => t.name).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  } catch (e) {
    categoryList.value = []
    console.warn('[form] 加载活动分类失败', e)
  }
}

function quickCreateCategory() {
  uni.showModal({
    title: '新建分类',
    editable: true,
    placeholderText: '分类名称',
    success: async (res) => {
      if (!res.confirm || !res.content) return
      const name = String(res.content).trim()
      if (!name) return uni.showToast({ title: '分类名称不能为空', icon: 'none' })
      uni.showLoading({ title: '创建中...' })
      try {
        const groups = await getTagGroupList({ page: 1, pageSize: 5, 'filters[slug][$eq]': 'activity-category' })
        const group = (groups.list || [])[0]
        if (!group) throw new Error('未找到 activity-category 分类分组')
        const created = await createTag({ name, tagGroup: group.documentId || group.id })
        uni.hideLoading()
        if (!created) return uni.showToast({ title: '创建失败', icon: 'none' })
        await loadCategories()
        form.category = created.name || name
        uni.showToast({ title: '创建成功', icon: 'success' })
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.message || '分类创建失败', icon: 'none' })
      }
    }
  })
}

const form = reactive({
  title: '',
  category: '',
  tags: [],
  assets: { recordingUrl: '', materials: [] },
  description: '',
  startTime: '',
  endTime: '',
  belongsToSeries: '',
  lat: '',
  lng: '',
  capacity: 100,
  usedCapacity: 0,
  signupStart: '',
  signupEnd: '',
  pointsCost: 0,
  feeCollectAt: 'signup',
  pricingMode: 'flat',
  feeTiers: [],
  feeFactors: { base: 0, factors: [] },
  checkinMode: 'both',
  geoEnforced: false,
  geoRadiusM: 500,
  shareRewardPoints: 0,
  status: 'draft',
  visibleToRoles: [],
  formConfig: [],
  preUnlockArticles: [],
  preUnlockLessons: [],
  learningPackageArticles: [],
  learningPackageLessons: [],
  rewardConfig: null
})

// 讲师/场地资源选择
const lecturerList = ref([])
const venueList = ref([])
const lecturerId = ref('')
const venueId = ref('')

// 下拉只列启用项；当前选中（含停用资源）仍从全量列表回显名称
const activeLecturers = computed(() => lecturerList.value.filter(r => !r.disabled))
const activeVenues = computed(() => venueList.value.filter(r => !r.disabled))

const lecturerNames = computed(() => ['不选择讲师', ...activeLecturers.value.map(r => r.name || `讲师#${r.id}`)])
const venueNames = computed(() => ['不选择场地', ...activeVenues.value.map(r => r.name || `场地#${r.id}`)])

const currentLecturerName = computed(() => {
  if (!lecturerId.value) return ''
  const it = lecturerList.value.find(r => String(r.id) === String(lecturerId.value))
  return it ? (it.name || `讲师#${lecturerId.value}`) : ''
})
const currentVenueName = computed(() => {
  if (!venueId.value) return ''
  const it = venueList.value.find(r => String(r.id) === String(venueId.value))
  return it ? (it.name || `场地#${venueId.value}`) : ''
})

function handleLecturerChange(e) {
  const idx = Number(e.detail.value)
  const row = activeLecturers.value[idx - 1]
  lecturerId.value = idx === 0 || !row ? '' : String(row.id)
}
function handleVenueChange(e) {
  const idx = Number(e.detail.value)
  const row = activeVenues.value[idx - 1]
  venueId.value = idx === 0 || !row ? '' : String(row.id)
}

async function loadResources() {
  try {
    const [l, v] = await Promise.all([
      listLecturers({ page: 1, pageSize: 500, includeDisabled: 'true' }),
      listVenues({ page: 1, pageSize: 500, includeDisabled: 'true' })
    ])
    lecturerList.value = l.list || []
    venueList.value = v.list || []
  } catch (e) {
    lecturerList.value = []
    venueList.value = []
  }
}

// ---- 讲师/场地/系列快速新建：内联输入 → create → 刷新并自动选中 ----
function createByName(title, placeholder, createFn, label, bodyField, afterCreate) {
  uni.showModal({
    title,
    editable: true,
    placeholderText: placeholder,
    success: async (res) => {
      if (!res.confirm || !res.content) return
      const name = String(res.content).trim()
      if (!name) return uni.showToast({ title: `${label}名称不能为空`, icon: 'none' })
      uni.showLoading({ title: '创建中...' })
      try {
        const created = await createFn({ [bodyField]: name })
        uni.hideLoading()
        if (!created) return uni.showToast({ title: '创建失败', icon: 'none' })
        await afterCreate(created)
        uni.showToast({ title: '创建成功', icon: 'success' })
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.message || `${label}创建失败`, icon: 'none' })
      }
    }
  })
}

function quickCreateLecturer() {
  createByName('新建讲师', '讲师姓名', createLecturer, '讲师', 'name', async (created) => {
    await loadResources()
    const it = lecturerList.value.find(r => String(r.id ?? r.documentId) === String(created.id ?? created.documentId))
    if (it) lecturerId.value = String(it.id)
  })
}

function quickCreateVenue() {
  createByName('新建场地', '场地名称', createVenue, '场地', 'name', async (created) => {
    await loadResources()
    const it = venueList.value.find(r => String(r.id ?? r.documentId) === String(created.id ?? created.documentId))
    if (it) venueId.value = String(it.id)
  })
}

function quickCreateSeries() {
  createByName('新建系列', '系列标题', createSeries, '系列', 'title', async (created) => {
    await loadSeries()
    const it = seriesList.value.find(s => String(s.documentId ?? s.id) === String(created.documentId ?? created.id))
    if (it) { form.belongsToSeries = it.documentId; syncSeriesIndex() }
  })
}

const checkinModeValues = ['both', 'self', 'worker_scan']
const checkinModeLabels = ['双方自由核销', '自助核销', '工作人员扫码']
const checkinModeIndex = ref(0)

const statusValues = ['draft', 'signup_open', 'ongoing', 'ended']
const statusOptions = ['草稿', '报名中', '进行中', '已结束']
const statusIndex = ref(0)

const feeValues = ['signup', 'checkin']
const feeLabels = ['报名时扣费', '签到时收费']
const feeIndex = ref(0)

const pricingModeValues = ['flat', 'tier', 'factor']
const pricingModeLabels = ['单一价', '档位列表', '因子叠加']
const pricingModeIndex = ref(0)

const formTypeValues = ['text', 'phone', 'textarea', 'radio', 'select', 'multi', 'number']
const formTypeLabels = ['文本', '手机号', '多行文本', '单选', '下拉', '多选', '数字']

const factorTypeValues = ['window_discount', 'window_upcharge', 'segment_discount_percent', 'flat_discount_amount']
const factorTypeLabels = ['窗口折扣', '窗口加价', '分段折扣百分比', '固定折扣额']
const isFormLoaded = ref(false)
const roleGate = ref(false)
const roleOptions = ref([])

function fmtDate(v) {
  if (!v) return ''
  if (typeof v === 'string' && v.includes('-')) return v.slice(0, 10)
  try {
    const d = new Date(v)
    if (isNaN(d.getTime())) return v
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  } catch (e) { return v }
}

function pad2(n) { return String(n).padStart(2, '0') }

// 日期时间拆分：兼容 "YYYY-MM-DD" / "YYYY-MM-DDTHH:mm" / ISO 字符串（按本地时区取数）
function datePart(v) {
  if (!v) return ''
  const s = String(v)
  if (!s.includes('T') && s.includes('-')) return s.slice(0, 10)
  try {
    const d = new Date(s)
    if (!isNaN(d.getTime())) return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  } catch (e) {}
  return s.slice(0, 10)
}
function timePart(v) {
  if (!v) return '00:00'
  const s = String(v)
  if (!s.includes('T') && s.includes(':')) return s.slice(0, 5)
  try {
    const d = new Date(s)
    if (!isNaN(d.getTime())) return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  } catch (e) {}
  return (s.slice(11, 16) || '00:00')
}
function onDatetime(key, part, value) {
  const cur = form[key] || ''
  const date = part === 'date' ? value : datePart(cur)
  const time = part === 'time' ? value : timePart(cur)
  form[key] = `${date}T${time}`
}
function toLocalDT(v) {
  return v ? `${datePart(v)}T${timePart(v)}` : ''
}

// 冲突/建议时段的 {"start"|"conflictStart", "end"|"conflictEnd"} 或 {startTime,endTime} → "MM-DD HH:mm ~ HH:mm"
function fmtRange(obj) {
  if (!obj) return ''
  const s = obj.startTime || obj.start || obj.conflictStart
  const e = obj.endTime || obj.end || obj.conflictEnd
  const f = (v) => v ? fmtDate(v) + ' ' + (String(v).slice(11, 16) || '') : ''
  return `${f(s)} ~ ${String(e).slice(11, 16) || ''}`
}

function handleCheckinModeChange(e) {
  checkinModeIndex.value = Number(e.detail.value)
  form.checkinMode = checkinModeValues[checkinModeIndex.value]
}
function handleStatusChange(e) {
  statusIndex.value = Number(e.detail.value)
  form.status = statusValues[statusIndex.value]
}
function handleFeeChange(e) {
  feeIndex.value = Number(e.detail.value)
  form.feeCollectAt = feeValues[feeIndex.value]
}
function handleSeriesChange(e) {
  seriesIndex.value = Number(e.detail.value)
  form.belongsToSeries = seriesIndex.value === 0 ? '' : (seriesList.value[seriesIndex.value - 1]?.documentId || '')
}

function handlePricingModeChange(e) {
  pricingModeIndex.value = Number(e.detail.value)
  form.pricingMode = pricingModeValues[pricingModeIndex.value]
}

function tierFeeLabel(tier) {
  const idx = Math.max(0, feeValues.indexOf(tier.feeCollectAt))
  return feeLabels[idx]
}
function handleTierFeeChange(ti, e) {
  form.feeTiers[ti].feeCollectAt = feeValues[Number(e.detail.value)]
}

function addMaterial() {
  if (!form.assets.materials) form.assets.materials = []
  form.assets.materials.push({ name: '', url: '' })
}
function removeMaterial(i) {
  form.assets.materials.splice(i, 1)
}

function addTier() {
  form.feeTiers.push({
    name: '',
    order: form.feeTiers.length,
    window: { start: '', end: '' },
    'fee-quota': '',
    userType: 'all',
    pointsCost: 0,
    feeCollectAt: 'signup'
  })
}
function removeTier(ti) {
  form.feeTiers.splice(ti, 1)
}

function isWindowFactor(type) {
  return type === 'window_discount' || type === 'window_upcharge'
}
function factorTypeLabel(type) {
  const idx = factorTypeValues.indexOf(type)
  return idx >= 0 ? factorTypeLabels[idx] : ''
}
function handleFactorTypeChange(fi, e) {
  form.feeFactors.factors[fi].type = factorTypeValues[Number(e.detail.value)]
}
function addFactor() {
  form.feeFactors.factors.push({
    type: 'window_discount',
    until: '',
    from: '',
    amount: 0,
    minSegment: '',
    percent: 0
  })
}
function removeFactor(fi) {
  form.feeFactors.factors.splice(fi, 1)
}

function addFormFieldAt(fi) {
  form.formConfig.splice(fi, 0, { key: '', label: '', type: 'text', required: false, options: [], min: undefined, max: undefined })
}
function removeFormField(fi) {
  form.formConfig.splice(fi, 1)
}
function handleFormTypeChange(fi, e) {
  form.formConfig[fi].type = formTypeValues[Number(e.detail.value)]
}
function addFormOption(fi) {
  form.formConfig[fi].options.push('')
}
function removeFormOption(fi, oi) {
  form.formConfig[fi].options.splice(oi, 1)
}

// ---- 报名表单字段模板：让小白用户可一键创建常用表单 ----
const COMMON_FIELDS = {
  name: { key: 'name', label: '姓名', type: 'text', required: true, options: [], min: undefined, max: undefined },
  phone: { key: 'phone', label: '电话', type: 'phone', required: true, options: [], min: undefined, max: undefined },
  remark: { key: 'remark', label: '备注', type: 'textarea', required: false, options: [], min: undefined, max: undefined },
  email: { key: 'email', label: '邮箱', type: 'text', required: false, options: [], min: undefined, max: undefined },
  wechat: { key: 'wechat', label: '微信号', type: 'text', required: false, options: [], min: undefined, max: undefined },
  company: { key: 'company', label: '公司/单位', type: 'text', required: false, options: [], min: undefined, max: undefined },
  position: { key: 'position', label: '职位', type: 'text', required: false, options: [], min: undefined, max: undefined },
  city: { key: 'city', label: '所在城市', type: 'text', required: false, options: [], min: undefined, max: undefined },
  gender: { key: 'gender', label: '性别', type: 'select', required: false, options: ['男', '女', '保密'], min: undefined, max: undefined },
  age: { key: 'age', label: '年龄', type: 'number', required: false, options: [], min: 0, max: 120 },
  industry: { key: 'industry', label: '所属行业', type: 'select', required: false, options: ['互联网', '教育', '金融', '医疗', '制造业', '其他'], min: undefined, max: undefined },
  interest: { key: 'interest', label: '兴趣方向', type: 'multi', required: false, options: ['技术', '产品', '设计', '运营', '市场'], min: undefined, max: undefined },
  source: { key: 'source', label: '获悉渠道', type: 'radio', required: false, options: ['公众号', '朋友圈', '朋友推荐', '其他'], min: undefined, max: undefined },
  memo: { key: 'memo', label: '留言/需求', type: 'textarea', required: false, options: [], min: undefined, max: undefined }
}
const DEFAULT_KEYS = ['name', 'phone', 'remark']
const FORM_TEMPLATES = [
  { name: '基础信息（姓名/电话/备注）', keys: ['name', 'phone', 'remark'] },
  { name: '联系方式（电话/微信/邮箱）', keys: ['phone', 'wechat', 'email'] },
  { name: '职业信息（单位/职位/行业）', keys: ['company', 'position', 'industry'] },
  { name: '个人画像（性别/年龄/城市）', keys: ['gender', 'age', 'city'] },
  { name: '兴趣与来源（兴趣/获悉渠道）', keys: ['interest', 'source'] },
  { name: '补充信息（留言/需求）', keys: ['memo'] }
]
function cloneField(f) {
  return {
    key: f.key || '', label: f.label || '', type: f.type || 'text', required: !!f.required,
    options: Array.isArray(f.options) ? [...f.options] : [],
    min: f.min, max: f.max
  }
}
function insertFieldsAt(fi, fields) {
  form.formConfig.splice(fi, 0, ...fields.map(cloneField))
}
function addDefaultFields() {
  const existing = new Set(form.formConfig.map(f => f.key))
  const fresh = DEFAULT_KEYS.map(k => COMMON_FIELDS[k]).filter(f => f && !existing.has(f.key))
  if (!fresh.length) {
    uni.showToast({ title: '姓名/电话/备注已存在', icon: 'none' })
    return
  }
  insertFieldsAt(form.formConfig.length, fresh)
  uni.showToast({ title: `已添加：${fresh.map(f => f.label).join('、')}`, icon: 'success' })
}
function openTemplatePicker(fi) {
  uni.showActionSheet({
    itemList: FORM_TEMPLATES.map(t => t.name),
    success: (res) => {
      const tpl = FORM_TEMPLATES[res.tapIndex]
      if (!tpl) return
      const existing = new Set(form.formConfig.map(f => f.key))
      const fresh = tpl.keys.map(k => COMMON_FIELDS[k]).filter(f => f && !existing.has(f.key))
      if (fresh.length) insertFieldsAt(fi, fresh)
      uni.showToast({ title: fresh.length ? `已导入「${tpl.name}」` : '模板字段均已存在', icon: 'none' })
    }
  })
}

// ---- 内容解锁/学习资料关联选择 ----
const REL_META = {
  preUnlockArticles: { kind: 'article', title: '选择解锁文章' },
  preUnlockLessons: { kind: 'lesson', title: '选择解锁课时' },
  learningPackageArticles: { kind: 'article', title: '选择资料文章' },
  learningPackageLessons: { kind: 'lesson', title: '选择资料课时' }
}
const relPicker = reactive({ visible: false, target: '', title: '', list: [], selected: [] })
let articleOptions = []
let lessonOptions = []
async function ensureRelOptions(kind) {
  if (kind === 'article') {
    if (!articleOptions.length) {
      try {
        const res = await articleApi.list({ page: 1, pageSize: 500 })
        articleOptions = (res.list || []).map(a => ({ id: a.id, documentId: a.documentId, title: a.title || '' })).filter(a => a.id || a.documentId)
      } catch (e) { articleOptions = [] }
    }
    return articleOptions
  }
  if (!lessonOptions.length) {
    try {
      const res = await getLessonList({ page: 1, pageSize: 500 })
      lessonOptions = (res.list || []).map(l => ({ id: l.id, documentId: l.documentId, title: l.title || '' })).filter(l => l.id || l.documentId)
    } catch (e) { lessonOptions = [] }
  }
  return lessonOptions
}
async function openRelPicker(target) {
  const meta = REL_META[target]
  if (!meta) return
  uni.showLoading({ title: '加载中...' })
  const options = await ensureRelOptions(meta.kind)
  uni.hideLoading()
  relPicker.target = target
  relPicker.title = meta.title
  relPicker.list = options
  relPicker.selected = (form[target] || []).map(x => x.documentId || x.id).filter(Boolean)
  relPicker.visible = true
}
function isRelPicked(it) {
  const id = it.documentId || it.id
  return relPicker.selected.includes(id)
}
function toggleRelPick(it) {
  const id = it.documentId || it.id
  const idx = relPicker.selected.indexOf(id)
  if (idx > -1) relPicker.selected.splice(idx, 1)
  else relPicker.selected.push(id)
}
function confirmRelPicker() {
  const meta = REL_META[relPicker.target]
  if (!meta) return
  form[relPicker.target] = relPicker.list
    .filter(it => relPicker.selected.includes(it.documentId || it.id))
    .map(it => ({ id: it.id, documentId: it.documentId, title: it.title }))
  closeRelPicker()
}
function closeRelPicker() {
  relPicker.visible = false
  relPicker.target = ''
}
function removeRel(target, idx) {
  form[target].splice(idx, 1)
}
const normRel = (arr) => Array.isArray(arr)
  ? arr.map(x => ({ id: x.id, documentId: x.documentId, title: x.title || '' })).filter(x => x.id || x.documentId)
  : []
// 关联提交：数组 → 数字 id 数组（供 document service 的 manyToMany connect；空数组=清空，始终传值避免编辑时旧关系残留）
const relIds = (arr) => Array.isArray(arr)
  ? arr.map(x => x.id ?? x.documentId).filter(v => v != null)
  : []

// ---- 报名奖励配置 ----
const rewardTypeLabels = ['积分', '课程权益', '资料与文章', '优惠券']
const rewardTypeValues = ['points', 'course_trial', 'course_outline', 'coupon']
const conditionLabels = ['无条件', '微信授权登录', '留联系方式', '回答调查问卷']
const conditionValues = ['none', 'wechat_auth', 'contact', 'survey']
const outlineKindLabels = ['文章', '文件链接', '课时']
const outlineKindValues = ['article', 'file', 'lesson']

function rewardTypeName(t) { const i = rewardTypeValues.indexOf(t); return i >= 0 ? rewardTypeLabels[i] : rewardTypeLabels[0] }
function rewardTypeIndex(t) { const i = rewardTypeValues.indexOf(t); return i >= 0 ? i : 0 }
function conditionLabel(c) { const i = conditionValues.indexOf(c); return i >= 0 ? conditionLabels[i] : conditionLabels[0] }
function conditionIndex(c) { const i = conditionValues.indexOf(c); return i >= 0 ? i : 0 }
function outlineKindLabel(k) { const i = outlineKindValues.indexOf(k); return i >= 0 ? outlineKindLabels[i] : outlineKindLabels[0] }
function outlineKindIndex(k) { const i = outlineKindValues.indexOf(k); return i >= 0 ? i : 0 }

function toggleRewardEnabled(e) {
  const on = e?.detail?.value === true || e?.detail?.value === 'true'
  if (!form.rewardConfig) {
    form.rewardConfig = on ? { loginEnabled: true, infoChannels: [], rewards: [] } : null
    return
  }
  form.rewardConfig.loginEnabled = on
  if (!on) { form.rewardConfig.infoChannels = []; form.rewardConfig.rewards = [] }
}

function hasInfoChannel(ch) { return (form.rewardConfig?.infoChannels || []).some(c => c?.channel === ch) }
function toggleInfoChannel(ch) {
  if (!form.rewardConfig) return
  const arr = Array.isArray(form.rewardConfig.infoChannels) ? form.rewardConfig.infoChannels : []
  const i = arr.findIndex(c => c?.channel === ch)
  if (i >= 0) arr.splice(i, 1)
  else arr.push({ channel: ch, label: ch === 'contact' ? '留联系方式' : '回答调查问卷' })
}
function addReward() {
  if (!form.rewardConfig) return
  if (!Array.isArray(form.rewardConfig.rewards)) form.rewardConfig.rewards = []
  form.rewardConfig.rewards.push({ id: `r_${Date.now()}_${form.rewardConfig.rewards.length}`, type: 'points', name: '', mode: 'single', condition: 'none', amount: 50 })
}
function removeReward(ri) { form.rewardConfig.rewards.splice(ri, 1) }
function moveReward(ri, dir) {
  const arr = form.rewardConfig.rewards
  const ni = ri + dir
  if (ni < 0 || ni >= arr.length) return
  const it = arr.splice(ri, 1)[0]
  arr.splice(ni, 0, it)
}
async function pickCourse(ri) {
  uni.showLoading({ title: '加载中...' })
  let list = []
  try {
    const res = await getCourseList({ page: 1, pageSize: 500 })
    list = (res.list || []).map(c => ({ id: c.id, documentId: c.documentId, title: c.title || '' })).filter(c => c.id || c.documentId)
  } catch (e) { list = [] }
  uni.hideLoading()
  if (!list.length) { uni.showToast({ title: '暂无课程', icon: 'none' }); return }
  uni.showActionSheet({
    itemList: list.map(c => c.title),
    success: (res) => {
      const it = list[res.tapIndex]
      const rw = form.rewardConfig.rewards[ri]
      rw.courseId = it.id ?? it.documentId
      rw.courseTitle = it.title
    }
  })
}
async function pickArticle(ri) {
  uni.showLoading({ title: '加载中...' })
  const list = await ensureRelOptions('article')
  uni.hideLoading()
  if (!list.length) { uni.showToast({ title: '暂无文章', icon: 'none' }); return }
  uni.showActionSheet({
    itemList: list.map(a => a.title),
    success: (res) => {
      const it = list[res.tapIndex]
      const rw = form.rewardConfig.rewards[ri]
      rw.articleId = it.id ?? it.documentId
      rw.articleTitle = it.title
    }
  })
}
async function pickLesson(ri) {
  uni.showLoading({ title: '加载中...' })
  const list = await ensureRelOptions('lesson')
  uni.hideLoading()
  if (!list.length) { uni.showToast({ title: '暂无课时', icon: 'none' }); return }
  uni.showActionSheet({
    itemList: list.map(l => l.title),
    success: (res) => {
      const it = list[res.tapIndex]
      const rw = form.rewardConfig.rewards[ri]
      rw.lessonId = it.id ?? it.documentId
      rw.lessonTitle = it.title
    }
  })
}
/** 奖励项加载归一化：condition 优先，兼容旧 loginRequired/channel */
const normReward = (r) => {
  if (!r || typeof r !== 'object') return {}
  return {
    id: r.id || `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: r.type || 'points',
    name: r.name || '',
    mode: r.mode === 'multi' ? 'multi' : 'single',
    condition: r.condition || (r.loginRequired ? 'wechat_auth' : (r.channel || 'none')),
    amount: r.amount,
    courseId: r.courseId, courseTitle: r.courseTitle || '',
    kind: r.kind || 'article',
    articleId: r.articleId, articleTitle: r.articleTitle || '',
    lessonId: r.lessonId, lessonTitle: r.lessonTitle || '',
    link: r.link || '',
    couponId: r.couponId, couponName: r.couponName || '',
  }
}

function toggleVisibleRole(roleName) {
  const idx = form.visibleToRoles.indexOf(roleName)
  if (idx > -1) form.visibleToRoles.splice(idx, 1)
  else form.visibleToRoles.push(roleName)
}

async function loadRoleOptions() {
  try {
    const list = await getAllRoles()
    roleOptions.value = Array.isArray(list) ? list : []
  } catch (e) {
    console.warn('获取角色列表失败，使用空列表', e)
    roleOptions.value = []
  }
}
function formTypeLabel(t) {
  const idx = formTypeValues.indexOf(t)
  return idx >= 0 ? formTypeLabels[idx] : t
}

async function loadSeries() {
  try {
    const res = await listSeries({ page: 1, pageSize: 200 })
    seriesList.value = res.list || []
    syncSeriesIndex()
  } catch (e) {
    seriesList.value = []
  }
}

function syncSeriesIndex() {
  const idx = seriesList.value.findIndex(s => s.documentId === form.belongsToSeries)
  seriesIndex.value = idx >= 0 ? idx + 1 : 0
}

function syncIndexes() {
  checkinModeIndex.value = Math.max(0, checkinModeValues.indexOf(form.checkinMode))
  statusIndex.value = Math.max(0, statusValues.indexOf(form.status))
  feeIndex.value = Math.max(0, feeValues.indexOf(form.feeCollectAt))
  pricingModeIndex.value = Math.max(0, pricingModeValues.indexOf(form.pricingMode))
}

async function loadDetail() {
  if (!activityId.value) return
  try {
    const data = await getActivity(activityId.value)
    if (!data) {
      uni.showToast({ title: '活动不存在', icon: 'none' })
      return
    }
    Object.assign(form, data, {
      startTime: toLocalDT(data.startTime),
      endTime: toLocalDT(data.endTime),
      signupStart: toLocalDT(data.signupStart),
      signupEnd: toLocalDT(data.signupEnd),
      capacity: data.capacity ?? 100,
      usedCapacity: data.usedCapacity ?? 0,
      pointsCost: Number(data.pointsCost || 0),
      feeCollectAt: data.feeCollectAt || 'signup',
      geoEnforced: data.geoEnforced === true,
      geoRadiusM: data.geoRadiusM ?? 500,
      checkinMode: data.checkinMode || 'both',
      status: data.status || 'draft',
      pricingMode: data.pricingMode || 'flat',
      shareRewardPoints: data.shareRewardPoints ?? 0,
      feeTiers: data.feeTiers || [],
      feeFactors: data.feeFactors || { base: 0, factors: [] },
      formConfig: data.formConfig || [],
      rewardConfig: data.rewardConfig && typeof data.rewardConfig === 'object'
        ? {
            loginEnabled: data.rewardConfig.loginEnabled !== false,
            infoChannels: Array.isArray(data.rewardConfig.infoChannels) ? data.rewardConfig.infoChannels : [],
            rewards: Array.isArray(data.rewardConfig.rewards) ? data.rewardConfig.rewards.map(normReward) : [],
          }
        : { loginEnabled: false, infoChannels: [], rewards: [] },
      preUnlockArticles: normRel(data.preUnlockArticles),
      preUnlockLessons: normRel(data.preUnlockLessons),
      learningPackageArticles: normRel(data.learningPackageArticles),
      learningPackageLessons: normRel(data.learningPackageLessons),
      category: data.category || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      visibleToRoles: Array.isArray(data.visibleToRoles) ? data.visibleToRoles : [],
      assets: (data.assets && typeof data.assets === 'object') ? {
        recordingUrl: data.assets.recordingUrl || '',
        materials: Array.isArray(data.assets.materials) ? data.assets.materials : [],
      } : { recordingUrl: '', materials: [] }
    })
    // 回显所属系列（relation 可能是 {documentId}{id} 或数组，归一为 documentId 字符串）
    const seriesRel = data.belongsToSeries || data.series
    form.belongsToSeries = Array.isArray(seriesRel)
      ? (seriesRel[0]?.documentId ?? seriesRel[0]?.id ?? '')
      : (seriesRel?.documentId ?? seriesRel?.id ?? seriesRel ?? '')
    // 回显讲师/场地（relation 可能是对象或数组）
    const relId = (r) => {
      if (!r) return ''
      const row = Array.isArray(r) ? r[0] : r
      return row ? String(row.id ?? row.documentId ?? '') : ''
    }
    lecturerId.value = relId(data.lecturer)
    venueId.value = relId(data.venue)
    syncIndexes()
    syncSeriesIndex()
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    isFormLoaded.value = true
  }
}

async function handleSubmit() {
  if (!form.title.trim()) return uni.showToast({ title: '请输入活动标题', icon: 'none' })
  if (!form.capacity || Number(form.capacity) <= 0) return uni.showToast({ title: '请输入有效容量', icon: 'none' })

  const submitData = {
    title: form.title,
    category: form.category || undefined,
    tags: Array.isArray(form.tags) && form.tags.length ? form.tags : undefined,
    assets: (form.assets?.recordingUrl || (form.assets?.materials && form.assets.materials.length))
      ? {
        recordingUrl: form.assets?.recordingUrl || undefined,
        materials: Array.isArray(form.assets?.materials) ? form.assets.materials.filter(m => m?.name && m?.url) : undefined,
      }
      : undefined,
    description: form.description || undefined,
    belongsToSeries: form.belongsToSeries || undefined,
    lat: form.lat === '' ? undefined : Number(form.lat),
    lng: form.lng === '' ? undefined : Number(form.lng),
    capacity: Number(form.capacity),
    startTime: form.startTime,
    endTime: form.endTime,
    signupStart: form.signupStart,
    signupEnd: form.signupEnd,
    checkinMode: form.checkinMode,
    geoEnforced: form.geoEnforced,
    geoRadiusM: Number(form.geoRadiusM) || 0,
    pointsCost: Number(form.pointsCost) || 0,
    shareRewardPoints: Number(form.shareRewardPoints) || 0,
    feeCollectAt: form.feeCollectAt,
    pricingMode: form.pricingMode,
    feeTiers: form.feeTiers,
    feeFactors: form.feeFactors,
    formConfig: form.formConfig,
    preUnlockArticles: relIds(form.preUnlockArticles),
    preUnlockLessons: relIds(form.preUnlockLessons),
    learningPackageArticles: relIds(form.learningPackageArticles),
    learningPackageLessons: relIds(form.learningPackageLessons),
    rewardConfig: form.rewardConfig && form.rewardConfig.loginEnabled
      ? {
          loginEnabled: true,
          infoChannels: (form.rewardConfig.infoChannels || []).filter(c => c?.channel),
          rewards: (form.rewardConfig.rewards || []).filter(r => r && r.name && r.type).map(r => {
            const base = { id: r.id, type: r.type, name: r.name, mode: r.mode, condition: r.condition }
            if (r.type === 'points') return { ...base, amount: Number(r.amount) || 0 }
            if (r.type === 'course_trial') return { ...base, courseId: r.courseId }
            if (r.type === 'course_outline') {
              if (r.kind === 'article') return { ...base, kind: 'article', articleId: r.articleId }
              if (r.kind === 'file') return { ...base, kind: 'file', link: r.link }
              return { ...base, kind: 'lesson', lessonId: r.lessonId }
            }
            if (r.type === 'coupon') return { ...base, couponId: Number(r.couponId) || 0 }
            return base
          }),
        }
      : undefined,
    status: form.status
  }
  // 清理空 datetime，避免后端校验空字符串
  for (const k of ['startTime', 'endTime', 'signupStart', 'signupEnd']) {
    if (!submitData[k]) delete submitData[k]
  }

  // ---- 资源排期冲突预检 ----
  if (lecturerId.value) submitData.lecturer = Number(lecturerId.value)
  if (venueId.value) submitData.venue = Number(venueId.value)

  const hasRes = Boolean(submitData.lecturer || submitData.venue)
  const hasTime = Boolean(submitData.startTime && submitData.endTime)
  if (hasRes && hasTime) {
    try {
      const chk = await checkSchedule({
        startTime: submitData.startTime,
        endTime: submitData.endTime,
        excludeActivityId: isEdit.value ? activityId.value : undefined,
        ...(submitData.lecturer ? { lecturerId: submitData.lecturer } : {}),
        ...(submitData.venue ? { venueId: submitData.venue } : {})
      })
      if (chk && chk.ok === false && chk.conflicts?.length) {
        const c = chk.conflicts[0]
        const resLabel = c.resourceType === 'venue' ? '场地' : '讲师'
        const msg = `排期冲突：${resLabel}「${c.resourceName || c.resourceId}」在 ${fmtRange(c)} 与活动「${c.conflictActivityTitle || c.conflictActivityId}」重叠。`
        if (chk.suggestions?.length) {
          const cands = chk.suggestions[0]?.candidates || []
          const better = cands.slice(0, 2).map(s => fmtRange(s)).join('；')
          uni.showModal({ title: '排期冲突', content: msg + (better ? `\n建议时段：${better}` : ''), showCancel: false })
        } else {
          uni.showToast({ title: msg, icon: 'none', duration: 3000 })
        }
        return
      }
    } catch (e) {
      // 预检失败不阻断保存（后端仍会校验）
    }
  }

  uni.showLoading({ title: '保存中...' })
  try {
    if (isEdit.value) {
      await updateActivity(activityId.value, submitData)
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      await createActivity(submitData)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
    uni.hideLoading()
    setTimeout(() => {
      uni.navigateBack()
    }, 800)
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: e.message || '保存失败', icon: 'none', duration: 3000 })
  }
}

onLoad((options) => {
  if (options.id) {
    isEdit.value = true
    activityId.value = options.id
  }
})
onMounted(async () => {
  await loadSiteConfig()
  roleGate.value = isFeatureEnabled('roleGate')
  if (roleGate.value) loadRoleOptions()
  loadDetail(); loadSeries(); loadResources(); loadCategories()
})
</script>

<style scoped>
.page-container { min-height: 100vh; background: #f5f5f5; }
.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff; border: none; padding: 15rpx 30rpx; border-radius: 40rpx; font-size: 28rpx;
}
.form-scroll { padding: 100rpx 30rpx 140rpx; height: 100vh; }
.form-section { background: #fff; border-radius: 20rpx; padding: 30rpx; margin-bottom: 30rpx; }
.section-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 30rpx; padding-bottom: 20rpx; border-bottom: 1rpx solid #eee; }
.form-item { margin-bottom: 30rpx; }
.form-row { display: flex; gap: 30rpx; }
.form-item.half { flex: 1; }
.form-label { display: block; font-size: 28rpx; color: #666; margin-bottom: 15rpx; }
.required { color: #ff4d4f; }
.form-input { width: 100%; height: 80rpx; border: 1rpx solid #ddd; border-radius: 10rpx; padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box; }
.form-textarea { width: 100%; height: 160rpx; border: 1rpx solid #ddd; border-radius: 10rpx; padding: 20rpx; font-size: 28rpx; box-sizing: border-box; }
.picker-value { display: flex; justify-content: space-between; align-items: center; height: 80rpx; border: 1rpx solid #ddd; border-radius: 10rpx; padding: 0 20rpx; font-size: 28rpx; }
.picker-create-row { display: flex; align-items: center; gap: 16rpx; }
.picker-grow { flex: 1; min-width: 0; }
.quick-create { flex-shrink: 0; width: 128rpx; text-align: center; line-height: 76rpx; height: 76rpx; border: 1rpx dashed #667eea; color: #667eea; border-radius: 10rpx; font-size: 26rpx; background: rgba(102,126,234,.06); }
.picker-placeholder.empty { color: #999; }
.picker-arrow { font-size: 20rpx; color: #999; }
.btn-save { width: 100%; height: 90rpx; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border: none; border-radius: 45rpx; font-size: 32rpx; font-weight: bold; }
.bottom-action { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 30rpx; background: #fff; box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.1); }
.fee-block { border: 1rpx solid #eee; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; background: #fafbfe; }
.fee-block-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.fee-block-title { font-size: 28rpx; font-weight: bold; color: #333; }
.fee-field { margin-top: 20rpx; }
.btn-add { width: 100%; height: 76rpx; border: 1rpx dashed #667eea; color: #667eea; background: transparent; border-radius: 12rpx; font-size: 28rpx; }
.btn-link-danger { background: transparent; color: #ff4d4f; border: none; font-size: 26rpx; padding: 0; line-height: 1; }
.form-tip { font-size: 24rpx; color: #999; margin: -8rpx 0 20rpx; }
.radio-row { display: flex; gap: 24rpx; align-items: center; }
.radio-opt { font-size: 26rpx; color: #999; padding: 6rpx 24rpx; border: 1rpx solid #ddd; border-radius: 20rpx; }
.radio-opt.on { color: #667eea; border-color: #667eea; background: rgba(102,126,234,.08); }
.opt-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.opt-del { color: #ff4d4f; padding: 0 8rpx; font-size: 28rpx; }
.assets-row { gap: 12rpx; margin-bottom: 16rpx; align-items: center; }
.form-inline { flex: 1; min-width: 0; }
.link-del { color: #ff4d4f; font-size: 26rpx; padding: 0 8rpx; }
.link-add { color: #667eea; font-size: 28rpx; margin-top: 16rpx; text-align: center; }
.visible-roles-group { display: flex; flex-wrap: wrap; gap: 16rpx; }
.visible-role-opt { display: flex; align-items: center; gap: 6rpx; padding: 12rpx 20rpx; border: 1rpx solid #ddd; border-radius: 20rpx; font-size: 26rpx; color: #333; }
.visible-role-opt-selected { border-color: #667eea; color: #fff; background: #667eea; }
.visible-role-check { font-size: 24rpx; }

/* ---- 报名表单模板 ----*/
.template-toolbar { display: flex; gap: 16rpx; flex-wrap: wrap; }
.template-btn { flex: 1; min-width: 280rpx; text-align: center; line-height: 76rpx; height: 76rpx; border: 1rpx dashed #667eea; color: #667eea; border-radius: 10rpx; font-size: 26rpx; background: rgba(102,126,234,.06); }
.template-insert { display: flex; gap: 16rpx; padding: 16rpx 0; border-top: 1rpx dashed #e3e6f0; margin-top: 8rpx; }
.field-slot > .template-insert:first-child { border-top: none; margin-top: 0; }
.template-insert-btn { flex: 1; text-align: center; line-height: 56rpx; height: 56rpx; border: 1rpx dashed #c3c8e8; color: #8a93c2; border-radius: 10rpx; font-size: 24rpx; background: #fff; }

/* ---- 内容解锁/学习资料 ----*/
.fee-block-hint { font-size: 22rpx; color: #999; }
.rel-chips { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 12rpx; }
.rel-chip { display: flex; align-items: center; gap: 8rpx; max-width: 100%; padding: 8rpx 16rpx; background: rgba(102,126,234,.08); border: 1rpx solid rgba(102,126,234,.2); border-radius: 20rpx; }
.rel-chip-name { font-size: 24rpx; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 420rpx; }
.rel-chip-del { color: #ff4d4f; font-size: 24rpx; flex-shrink: 0; padding: 0 4rpx; }

/* ---- 关联内容选择弹窗 ----*/
.rel-mask { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 999; display: flex; align-items: flex-end; }
.rel-panel { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 30rpx; box-sizing: border-box; max-height: 70vh; display: flex; flex-direction: column; }
.rel-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.rel-panel-title { font-size: 30rpx; font-weight: bold; color: #333; }
.rel-panel-close { font-size: 32rpx; color: #999; padding: 0 8rpx; }
.rel-panel-list { flex: 1; min-height: 0; max-height: 50vh; }
.rel-opt { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 8rpx; border-bottom: 1rpx solid #f2f2f2; }
.rel-check { width: 40rpx; height: 40rpx; border: 2rpx solid #ccc; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #fff; font-size: 24rpx; }
.rel-check.on { border-color: #667eea; background: #667eea; }
.rel-check-mark { line-height: 1; }
.rel-opt-name { font-size: 28rpx; color: #333; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rel-panel-footer { display: flex; gap: 20rpx; margin-top: 20rpx; }
.btn-plain { flex: 1; height: 76rpx; border: 1rpx solid #ddd; background: #fff; color: #666; border-radius: 40rpx; font-size: 28rpx; }
.rel-empty { text-align: center; padding: 40rpx 0; }

/* ---- 报名奖励配置 ----*/
.reward-block { border: 1rpx solid #f0f0f0; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; }
.reward-ops { display: flex; align-items: center; gap: 16rpx; }
.btn-link { color: #667eea; font-size: 26rpx; padding: 0; line-height: 1; }
.form-item-inner { margin-top: 12rpx; }
</style>