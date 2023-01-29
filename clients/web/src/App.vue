<script setup lang="ts">
import TheSidebar from "./components/TheSidebar.vue";
import ThePlayer from "./components/ThePlayer.vue";
import { defineAsyncComponent, ref } from "vue";
import canAutoplay from "can-autoplay";
import { visualizerEnabled } from "./visualizer";
const TheChurner = defineAsyncComponent(() => import("./components/TheChurner.vue"));

const clicked = ref(false);

canAutoplay.audio().then(({ result }) => {
  if (result == true) clicked.value = true;
});
</script>

<template>
  <div class="w-full h-full flex justify-between">
    <template v-if="clicked">
      <Suspense v-if="visualizerEnabled">
        <TheChurner />
      </Suspense>
      <TheSidebar />
      <Suspense>
        <ThePlayer />
      </Suspense>
    </template>
    <template v-else>
      <div class="grid place-items-center w-full h-full">
        <button class="p-2 border-white border" @click="clicked = true">
          Click here to enter.
        </button>
      </div>
    </template>
  </div>
</template>
