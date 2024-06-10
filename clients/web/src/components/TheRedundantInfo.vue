<script setup lang="ts">
import WaveForm from "@/components/WaveForm.vue";
import AudioSpectrum from "@/components/AudioSpectrum.vue";
import { downscaled, singlePeriod, fftd, enableAnalysis } from "@/analysis";
import { getDuration, seek } from "@/audio";
</script>

<template>
  <div class="z-5 absolute w-screen h-screen bg-black flex flex-col gap-2">
    <span class="text-lg z-1 mt-2 text-center">redundant information mode</span>

    <div class="grid grid-rows-3 grid-flow-col grid-cols-[1fr_auto] flex-grow">
      <div class="relative">
        <div
          class="absolute top-0 bottom-2 b-l-white border-l-1"
          :style="{ left: (100 * (seek ?? 0)) / getDuration() + '%' }"></div>

        <WaveForm :fill="true" :waveform="downscaled" class="mt-4" />
        <div>moodbar</div>
      </div>

      <div>
        <WaveForm :fill="false" :waveform="singlePeriod" />
        <div>scrolling wave</div>
        <div>scrolling spectrogram</div>
      </div>

      <div class="flex">
        <AudioSpectrum :waveform="fftd" class="flex-1" />
        <div class="aspect-ratio-square flex-shrink-0">goniometer</div>
      </div>

      <div class="grid-col-start-2 grid-row-span-3 w-50">volume meter & slider</div>
    </div>

    <div class="absolute h-12 bottom-0 right-0 p-2 flex gap-1">
      <button class="h-8 bg-black border border-white p-1" @click="enableAnalysis = false">
        close
      </button>
    </div>
  </div>
</template>
