<script setup lang="ts">
import TheSidebar from "./components/TheSidebar.vue";
import ThePlayer from "./components/ThePlayer.vue";
import { ref } from "vue";
// @ts-expect-error this lib is not typed lol
import canAutoplay from "can-autoplay";

interface CanAutoplay {
  result: boolean;
}

const clicked = ref(false);

canAutoplay.audio().then(({ result }: CanAutoplay) => {
  if (result == true) clicked.value = true;
});
</script>

<template>
  <div class="w-full h-full flex justify-between">
    <template v-if="clicked">
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
