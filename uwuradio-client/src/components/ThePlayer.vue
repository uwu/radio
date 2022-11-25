<script setup lang="ts">
import { computed } from "vue";
import RangeSlider from "./RangeSlider.vue";
import TheHistory from "./TheHistory.vue";
import { prettySeek, prettyDuration, volume, getDuration, seek } from "@/audio";
import { getClient } from "@/syncClient";

const client = getClient();

// @ts-expect-error IT IS COMPLETELY FINE IF UNDEFINED GETS RETURNED, OPTIONAL CHAINING EXISTS PLEASE SHUT THE FUCK UP.
const quotes = computed(() => client.submitters.get(client.currentSong?.submitter)?.quotes);

const randomQuote = computed(() =>
  quotes.value?.length ? `"${quotes.value[~~(Math.random() * quotes.value.length)]}"` : "",
);
</script>

<template>
  <div class="flex flex-col items-center justify-between h-full w-full relative">
    <span class="text-lg">RADIO.UWU.NETWORK</span>
    <div class="text-center w-70 md:w-100">
      <img class="w-70 h-70 pb-2 md:(w-100 h-100)" :src="client.currentSong?.artUrl" />
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
        <div class="flex items-center gap-3">VOL <RangeSlider v-model="volume" /></div>
      </div>
    </div>
    <span class="text-center">
      {{ randomQuote }}
    </span>
    <TheHistory />
  </div>
</template>
