<script setup lang="ts">
import { useElementHover, useIdle, useWindowSize } from "@vueuse/core";
import { computed, effect, onMounted, onUnmounted, ref, watch } from "vue";
import butterchurn from "butterchurn";
import butterchurnPresets from "butterchurn-presets";
import { waitForReady, audioCtx, audioAnalyser, currentSong } from "@/compatibility";
import { visualizerEnabled } from "@/visualizer";
import TheChurnerSelect from "./TheChurnerSelect.vue";

await waitForReady;

const presets = butterchurnPresets.getPresets();
const presetNames = Object.keys(presets);
const preset = ref("");

const { width, height } = useWindowSize({
  includeScrollbar: false,
});
const canvas = ref();

const randomize = ref(true);

const menu = ref();
const { idle } = useIdle(2000);
const hovering = useElementHover(menu);
const showMenu = computed(() => hovering.value || !idle.value);

let visualizer: butterchurn.Visualizer;
let janitor: Array<() => void> = [];

onMounted(() => {
  visualizer = butterchurn.createVisualizer(audioCtx, canvas.value, {
    width: width.value,
    height: height.value,
  });

  visualizer.connectAudio(audioAnalyser);

  const clearPresetWatch = watch(preset, () => {
    visualizer.loadPreset(presets[preset.value], 2.5);
  });

  const randomizePreset = () => {
    if (!randomize.value) return;
    const randomPreset = presetNames[Math.floor(Math.random() * presetNames.length)];
    preset.value = randomPreset;
  };
  const presetInterval = setInterval(randomizePreset, 25 * 1000);
  randomizePreset();

  const clearRenderEffect = effect(() => {
    visualizer.setRendererSize(width.value, height.value);
  });

  const clearTitleWatch = watch(currentSong, () => {
    if (currentSong.value) visualizer.launchSongTitleAnim(currentSong.value.name);
  });
  if (currentSong.value !== undefined && currentSong.value?.submitter !== "...")
    visualizer.launchSongTitleAnim(currentSong.value.name);

  let stopRender = false;
  const render = () => {
    visualizer.render();
    if (!stopRender) requestAnimationFrame(() => render());
  };
  render();

  janitor.push(
    clearPresetWatch,
    clearRenderEffect,
    clearTitleWatch,
    () => clearInterval(presetInterval),
    () => (stopRender = true),
  );
});

onUnmounted(() => {
  visualizer.disconnectAudio(audioAnalyser);
  janitor.forEach((f) => f());
});
</script>

<template>
  <div :class="'z-4' + (showMenu ? '' : ' cursor-none')">
    <canvas ref="canvas" :width="width" :height="height" class="absolute"></canvas>
    <Transition>
      <div ref="menu" v-if="showMenu" class="absolute h-12 bottom-0 right-0 p-2 flex gap-1">
        <TheChurnerSelect v-model="preset" v-model:randomize="randomize" />
        <button class="h-8 bg-black border border-white p-1" @click="visualizerEnabled = false">
          stop visualizer
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>
