<template>
  <view class="color-picker">
    <view class="current-color" :style="{ backgroundColor: modelValue }" @click="showPalette = !showPalette" />
    <input type="color" :value="modelValue" @input="onInput" class="native-input" />
    <view v-if="showPalette" class="palette">
      <view
        v-for="color in presetColors"
        :key="color"
        class="palette-color"
        :style="{ backgroundColor: color }"
        @click="select(color)"
      />
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '#667eea' }
})
const emit = defineEmits(['update:modelValue'])

const showPalette = ref(false)
const presetColors = [
  '#667eea', '#0056D2', '#14BF95', '#A435F0', '#02262B', '#D8232A',
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2',
]

function onInput(e) {
  emit('update:modelValue', e.target.value)
}

function select(color) {
  emit('update:modelValue', color)
  showPalette.value = false
}
</script>

<style scoped>
.color-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}
.current-color {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid #ddd;
  cursor: pointer;
}
.native-input {
  width: 40px;
  height: 32px;
  border: none;
  cursor: pointer;
}
.palette {
  position: absolute;
  top: 100%;
  left: 0;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  z-index: 1000;
}
.palette-color {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
}
.palette-color:hover {
  transform: scale(1.1);
}
</style>
