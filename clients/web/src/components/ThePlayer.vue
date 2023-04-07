<script setup lang="ts">
import { computed } from "vue";
import isButterchurnSupported from "butterchurn/lib/isSupported.min";
import RangeSlider from "./RangeSlider.vue";
import TheHistory from "./TheHistory.vue";
import { prettySeek, prettyDuration, volume, getDuration, seek } from "@/audio";
import TheClients from "./TheClients.vue";
import { timePromise } from "@/util";
import { visualizerEnabled } from "@/visualizer";
import { startSyncClient, currentSong, submitters, reconnecting } from "@/syncClient";

const visualizerSupported = isButterchurnSupported();

await timePromise.then(startSyncClient);

const quotes = computed(() => submitters.get(currentSong.value.submitter)?.quotes);

const randomQuote = computed(() =>
  quotes.value?.length ? `"${quotes.value[~~(Math.random() * quotes.value.length)]}"` : "",
);
</script>

<template>
  <div class="flex flex-col items-center justify-between h-full w-full relative">
    <div
      v-if="reconnecting"
      class="absolute w-full min-h-8 bg-#fedc6c color-black z-5 text-center grid content-center">
      reconnecting...
    </div>
    <TheClients />
    <span class="text-lg z-1 mt-2">RADIO.UWU.NETWORK</span>
    <div class="text-center w-70 md:w-100" id="player">
      <img class="w-70 h-70 pb-2 md:(w-100 h-100)" :src="currentSong.artUrl" />
      <div class="md:text-xl">
        <div>{{ currentSong.name }}</div>
        <div>by {{ currentSong.artist }}</div>
      </div>
      <div class="text-sm">submitted by {{ currentSong.submitter }}</div>
      <div class="p-5 w-full">
        <div class="flex justify-between w-full">
          <span>{{ prettySeek }}</span>
          <span>{{ prettyDuration() }}</span>
        </div>
        <div class="w-full mb-4">
          <div
            class="h-px bg-white"
            :style="{ width: (100 * (seek ?? 0)) / getDuration() + '%' }" />
        </div>
        <div class="flex items-center gap-3">VOL <RangeSlider v-model="volume" /></div>
      </div>
    </div>
    <span class="text-center">
      {{ randomQuote }}
    </span>
    <TheHistory />
    <button
      v-if="visualizerSupported"
      class="absolute bottom-2 right-2 h-8 bg-black border border-white p-1"
      @click="visualizerEnabled = true">
      enable visualizer
    </button>
  </div>
</template>
