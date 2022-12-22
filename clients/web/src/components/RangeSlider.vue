<script setup lang="ts">
// @ts-nocheck TypeScript is actually wrong. I'm not joking.
import { computed } from "vue";

const props = defineProps(["modelValue"]);
defineEmits(["update:modelValue"]);
const vol = computed(() => parseFloat(props.modelValue));
</script>

<template>
  <input
    :value="vol"
    @input="$emit('update:modelValue', $event?.target?.value?.toString?.())"
    type="range"
    min="0"
    max="1"
    step="0.01" />
</template>

<style scoped>
input {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 25px;
  padding: 12px 0;
  background: white content-box;
}

input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 8px;
  height: 25px;
  outline: solid white 1px;
  background: black;
  cursor: pointer;
}

input::-moz-range-thumb {
  appearance: none;
  outline: none;
  border: none;
  border-radius: 0;
  width: 8px;
  height: 25px;
  outline: solid white 1px;
  background: black;
  cursor: pointer;
}
</style>
