<script setup lang="ts">
import TheSidebar from "./components/TheSidebar.vue";
import ThePlayer from "./components/ThePlayer.vue";
import { defineAsyncComponent, ref } from "vue";
// @ts-expect-error this lib is not typed lol
import canAutoplay from "can-autoplay";
import { visualizerEnabled } from "./visualizer";
import { setupMediaSession } from "./mediaSession";
import { audioCtx } from "./audio";
const TheChurner = defineAsyncComponent(() => import("./components/TheChurner.vue"));

interface CanAutoplay {
  result: boolean;
}

const clicked = ref(false);

canAutoplay.audio().then(({ result }: CanAutoplay) => {
  if (result == true) clicked.value = true;
});

function handleEnterClick() {
  clicked.value = true;
  
  // two workarounds needed for iOS:
  // the media session setup calls play(), which is blocked outside of dom events
  // audio contexts created out of events are also paused by default, so need resuming from inside one
  setupMediaSession();
  audioCtx.resume();
}
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
        <button class="p-2 border-white border" @click="handleEnterClick">
          Click here to enter.
        </button>
      </div>
    </template>
  </div>
</template>
