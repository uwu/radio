<script setup lang="ts">
import { reactive, computed } from "vue";
import { currentChannel } from "@/channel";

const props = defineProps<{
  name: string;
}>();

const channelName = computed(() => (props.name == "global" ? "" : props.name));

const selected = computed(() => currentChannel.value === channelName.value);
const styles = reactive({
  grid: true,
  "h-12": true,
  "items-center": true,
  "bg-white": selected,
  "text-black": selected,
});
</script>

<template>
  <a :class="styles" :href="'#' + channelName" @click.prevent="currentChannel = channelName">
    <div>{{ name }}</div>
  </a>
</template>
