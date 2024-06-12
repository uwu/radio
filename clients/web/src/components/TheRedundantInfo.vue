<script setup lang="ts">
import WaveForm from "@/components/WaveForm.vue";
import AudioSpectrum from "@/components/AudioSpectrum.vue";
import {
  downscaled,
  singlePeriod,
  fftd,
  slice,
  enableAnalysis,
  peakDbfs,
  rmsDbfs,
  peakHoldDbfs
} from "@/analysis";
import { getDuration, seek } from "@/audio";

// metering mostly copied from REAPER
const RMS_OFFSET = 14; // dbFS, copied from REAPER

// range +2 to -18dbFS, 0dbFS at 10% down from the top of the meter
const displayPk = () => 0.1 + 0.05 * -peakDbfs();
const displayPkHold = () => 0.1 + 0.05 * -peakHoldDbfs();
// range -2 to -22dbFS, 0dbFS at 10% up off the top of the meter
// or a range of (rms() + offset) of +12 to -8dbFS, 0 at 60% down
const displayRms = () => 0.6 + 0.05 * -(rmsDbfs() + RMS_OFFSET);

const peakTicks = [1, 0, -3, -6, -9, -12].map((s) => 0.1 + 0.05 * -s);

const rmsTicks = [-3, -6, -9, -12, -15, -18, -21].map((s) => 0.6 + 0.05 * -(s + RMS_OFFSET));
</script>

<template>
  <div class="z-5 absolute w-screen h-screen bg-black flex flex-col gap-2">
    <span class="text-lg z-1 mt-2 text-center">redundant information mode</span>

    <div class="grid grid-rows-3 grid-flow-col grid-cols-[1fr_auto] flex-grow">
      <div class="relative">
        <div
          class="absolute top-0 bottom-2 b-l-white border-l-1"
          :style="{ left: (100 * (seek ?? 0)) / getDuration() + '%' }" />

        <WaveForm :fill="true" :waveform="downscaled" class="mt-4" />
        <div>moodbar</div>
      </div>

      <div class="relative">
        <div class="absolute top-33% bottom-2 b-l-white border-l-1 left-50%" />

        <WaveForm :fill="false" :waveform="singlePeriod" />
        <WaveForm :fill="true" :waveform="slice" />
        <div>scrolling spectrogram</div>
      </div>

      <div class="flex">
        <AudioSpectrum :waveform="fftd" class="flex-1" />
        <div class="aspect-ratio-square flex-shrink-0">goniometer</div>
      </div>

      <div class="grid-col-start-2 grid-row-span-3 ml-8 w-30 relative">
        <div
          class="absolute bottom-0 left-2 w-5 bg-white"
          :style="{ top: 100 * displayPk() + '%' }" />
        <div 
          class="absolute left-2 w-5 border-t-4 b-t-gray-3"
          :style="{ top: 100 * displayPkHold() + '%' }" />
        <div
          class="absolute bottom-0 left-9 w-2 bg-white"
          :style="{ top: 100 * displayRms() + '%' }" />

        <div
          v-for="t of peakTicks"
          :key="'pt' + t"
          class="absolute w-7 border-t b-t-gray-6"
          :style="{ top: 100 * t + '%' }" />

        <div
          v-for="t of rmsTicks"
          :key="'rt' + t"
          class="absolute left-9 w-4 border-t b-t-gray-6"
          :style="{ top: 100 * t + '%' }" />
      </div>
    </div>

    <div class="absolute h-12 bottom-0 right-0 p-2 flex gap-1">
      <button class="h-8 bg-black border border-white p-1" @click="enableAnalysis = false">
        close
      </button>
    </div>
  </div>
</template>
