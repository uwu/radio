<script setup lang="ts">
import WaveForm from "@/components/WaveForm.vue";
import AudioSpectrum from "@/components/AudioSpectrum.vue";
import TheGoniometer from "@/components/TheGoniometer.vue";
import {
  downscaled,
  singlePeriod,
  fftd,
  slice,
  enableAnalysis,
  peakDbfsL,
  peakDbfsR,
  rmsDbfsL,
  rmsDbfsR,
  peakHoldDbfsL,
  peakHoldDbfsR,
} from "@/analysis";
import { getDuration, seek } from "@/audio";

// metering mostly copied from REAPER
const RMS_OFFSET = 14; // dbFS, copied from REAPER

// range +2 to -18dbFS, 0dbFS at 10% down from the top of the meter
const displayPkL = () => 0.1 + 0.05 * -peakDbfsL();
const displayPkR = () => 0.1 + 0.05 * -peakDbfsR();
const displayPkHoldL = () => 0.1 + 0.05 * -peakHoldDbfsL();
const displayPkHoldR = () => 0.1 + 0.05 * -peakHoldDbfsR();
// range -2 to -22dbFS, 0dbFS at 10% up off the top of the meter
// or a range of (rms() + offset) of +12 to -8dbFS, 0 at 60% down
const displayRmsL = () => 0.6 + 0.05 * -(rmsDbfsL() + RMS_OFFSET);
const displayRmsR = () => 0.6 + 0.05 * -(rmsDbfsR() + RMS_OFFSET);

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
        <TheGoniometer class="aspect-ratio-square flex-shrink-0" />
      </div>

      <div class="grid-col-start-2 grid-row-span-3 ml-8 w-25 mr-17 relative overflow-clip">
        <div
          class="absolute bottom-0 left-2 w-2 bg-white"
          :style="{ top: 100 * displayRmsL() + '%' }" />
        <div
          class="absolute bottom-0 left-6 w-5 bg-white"
          :style="{ top: 100 * displayPkL() + '%' }" />
        <div
          class="absolute left-6 w-5 border-t-4 b-t-gray-3"
          :style="{ top: 100 * displayPkHoldL() + '%' }" />

        <div
          class="absolute bottom-0 left-14 w-5 bg-white"
          :style="{ top: 100 * displayPkR() + '%' }" />
        <div
          class="absolute left-14 w-5 border-t-4 b-t-gray-3"
          :style="{ top: 100 * displayPkHoldR() + '%' }" />
        <div
          class="absolute bottom-0 left-21 w-2 bg-white"
          :style="{ top: 100 * displayRmsR() + '%' }" />

        <div
          v-for="t of peakTicks"
          :key="'pt' + t"
          class="absolute left-6 w-13 border-t b-t-gray-6"
          :style="{ top: 100 * t + '%' }" />

        <div
          v-for="t of rmsTicks"
          :key="'rtl' + t"
          class="absolute w-4 border-t b-t-gray-6"
          :style="{ top: 100 * t + '%' }" />
        <div
          v-for="t of rmsTicks"
          :key="'rtr' + t"
          class="absolute w-4 left-21 border-t b-t-gray-6"
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
