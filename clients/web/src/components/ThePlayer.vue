<script setup lang="ts">
import { computed } from "vue";
import isButterchurnSupported from "butterchurn/lib/isSupported.min";
import RangeSlider from "./RangeSlider.vue";
import TheHistory from "./TheHistory.vue";
import { prettySeek, prettyDuration, volumeDbfs, getDuration, seek } from "@/audio";
import { getClient } from "@/syncClient";
import TheClients from "./TheClients.vue";
import { timePromise } from "@/util";
import { visualizerEnabled } from "@/visualizer";
import fallbackart from "@/assets/fallbackart_10x.png";

const visualizerSupported = isButterchurnSupported();

const client = await timePromise.then(() => getClient());

// @ts-expect-error IT IS COMPLETELY FINE IF UNDEFINED GETS RETURNED, OPTIONAL CHAINING EXISTS PLEASE SHUT THE FUCK UP.
const quotes = computed(() => client.submitters.get(client.currentSong?.submitter)?.quotes);

const randomQuote = computed(() =>
  quotes.value?.length ? `"${quotes.value[~~(Math.random() * quotes.value.length)]}"` : "",
);
</script>

<template>
  <div class="flex flex-col items-center justify-between h-full w-full relative">
    <div
      v-if="client.reconnecting"
      class="absolute w-full min-h-8 bg-#fedc6c color-black z-5 text-center grid content-center">
      reconnecting...
    </div>
    <TheClients />
    <span class="text-lg z-1 mt-2">RADIO.UWU.NETWORK</span>
    <div class="text-center w-70 md:w-100" id="player">
      <div
        class="w-70 h-70 mb-2 md:(w-100 h-100)"
        :style="{ background: `center / contain no-repeat url(${client.currentSong?.artUrl ?? fallbackart})` }"
      />

      <div class="md:text-xl">
        <div>{{ client.currentSong?.name }}</div>
        <div>by {{ client.currentSong?.artist }}</div>
      </div>
      <div class="text-sm">submitted by {{ client.currentSong?.submitter }}</div>
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
        <div class="flex items-center gap-3">VOL <RangeSlider v-model="volumeDbfs" :min="-60" :max="0" /></div>
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
