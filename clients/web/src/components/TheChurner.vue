<script setup lang="ts">
import { useWindowSize } from "@vueuse/core";
import { effect, onMounted, onUnmounted, ref, watch } from "vue";
import butterchurn from "butterchurn";
import butterchurnPresets from "butterchurn-presets";
import { audioCtx, audioAnalyser } from "@/audio";
import { timePromise } from "@/util";
import { getClient } from "@/syncClient";
import { visualizerEnabled } from "@/visualizer";

const client = await timePromise.then(() => getClient());

const presets = butterchurnPresets.getPresets();

const { width, height } = useWindowSize({
  includeScrollbar: false,
});
const canvas = ref();

let visualizer: butterchurn.Visualizer;
let janitor: Array<() => void> = [];

onMounted(() => {
  visualizer = butterchurn.createVisualizer(audioCtx, canvas.value, {
    width: width.value,
    height: height.value,
  });

  visualizer.connectAudio(audioAnalyser);

  const randomizePreset = () => {
    const randomPreset =
      Object.keys(presets)[Math.floor(Math.random() * Object.keys(presets).length)];
    visualizer.loadPreset(presets[randomPreset], 2.5);
  };
  const presetInterval = setInterval(randomizePreset, 25 * 1000);
  randomizePreset();

  const clearRenderEffect = effect(() => {
    visualizer.setRendererSize(width.value, height.value);
  });

  const clearTitleWatch = watch(client.current, () => {
    if (client.current.value) visualizer.launchSongTitleAnim(client.current.value.name);
  });
  if (client.currentSong !== undefined && client.currentSong?.submitter !== "...")
    visualizer.launchSongTitleAnim(client.currentSong.name);

  let stopRender = false;
  const render = () => {
    visualizer.render();
    if (!stopRender) requestAnimationFrame(() => render());
  };
  render();

  janitor.push(
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
  <div class="z-4">
    <canvas ref="canvas" :width="width" :height="height" class="absolute"></canvas>
    <button
      class="absolute bottom-3 right-3 bg-black border border-white p-1"
      @click="visualizerEnabled = false">
      stop visualizer
    </button>
  </div>
</template>
