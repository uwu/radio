<script setup lang="ts">
import { computed, ref } from "vue";
import AudioSpectrum from "@/components/AudioSpectrum.vue";
import LiveWaveForm from "@/components/LiveWaveForm.vue";
import MoodBar from "@/components/MoodBar.vue";
import TheGoniometer from "@/components/TheGoniometer.vue";
import TheSpectogram from "@/components/TheSpectogram.vue";
import WaveForm from "@/components/WaveForm.vue";
import {
  downscaled,
  enableAnalysis,
  moodbar,
  peakDbfsL,
  peakDbfsR,
  rmsDbfsL,
  rmsDbfsR,
  peakHoldDbfsL,
  peakHoldDbfsR,
  volumeMeteringMidSide,
} from "@/analysis";
import { getDuration, seek } from "@/audio";
import { getClient } from "@/syncClient";

const RMS_OFFSET = 14;
const client = getClient();

const clamp01 = (value: number) => {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
};

const meterTop = (value: number) => `${100 * clamp01(value)}%`;
const displayPkL = () => 0.1 + 0.05 * -peakDbfsL();
const displayPkR = () => 0.1 + 0.05 * -peakDbfsR();
const displayPkHoldL = () => 0.1 + 0.05 * -peakHoldDbfsL();
const displayPkHoldR = () => 0.1 + 0.05 * -peakHoldDbfsR();
const displayRmsL = () => 0.6 + 0.05 * -(rmsDbfsL() + RMS_OFFSET);
const displayRmsR = () => 0.6 + 0.05 * -(rmsDbfsR() + RMS_OFFSET);

const peakTicks = [0, -3, -6, -9, -12].map((s) => 0.1 + 0.05 * -s);
const rmsTicks = [-3, -6, -9, -12, -15, -18, -21].map((s) => 0.6 + 0.05 * -(s + RMS_OFFSET));
const waterfallColormaps = ["turbomap", "grayscale", "viridis", "magma", "inferno", "plasma"];
const waterfallColormap = ref(waterfallColormaps.indexOf("magma"));
const playheadLeft = computed(() => {
  const duration = getDuration();
  if (!duration) return "0%";

  return `${Math.min(100, Math.max(0, (100 * (seek.value ?? 0)) / duration))}%`;
});

function nextWaterfallColormap() {
  waterfallColormap.value = (waterfallColormap.value + 1) % waterfallColormaps.length;
}
</script>

<template>
  <div class="viz-shell">
    <div class="viz-topbar">
      <div class="header-track">
        <span>{{ client.currentSong?.name ?? "loading..." }}</span>
        <span v-if="client.currentSong?.artist">by {{ client.currentSong.artist }}</span>
      </div>
      <button class="viz-button" @click="enableAnalysis = false">close</button>
    </div>

    <main class="viz-grid">
      <section class="viz-panel">
        <div class="viz-fill">
          <AudioSpectrum />
        </div>
      </section>

      <section class="viz-panel">
        <div class="stereo-panel">
          <div class="stereo-scope">
            <TheGoniometer />
          </div>

          <div class="meter-panel">
            <button
              class="viz-button meter-mode"
              :style="{
                background: volumeMeteringMidSide ? 'white' : 'black',
                color: volumeMeteringMidSide ? 'black' : 'white',
              }"
              @click="volumeMeteringMidSide = !volumeMeteringMidSide">
              {{ volumeMeteringMidSide ? "M/S" : "L/R" }}
            </button>

            <div class="meter-label left-label">L</div>
            <div class="meter-label right-label">R</div>

            <div class="meter-bar rms-left" :style="{ top: meterTop(displayRmsL()) }" />
            <div class="meter-bar peak-left" :style="{ top: meterTop(displayPkL()) }" />
            <div class="meter-hold hold-left" :style="{ top: meterTop(displayPkHoldL()) }" />

            <div class="meter-bar peak-right" :style="{ top: meterTop(displayPkR()) }" />
            <div class="meter-hold hold-right" :style="{ top: meterTop(displayPkHoldR()) }" />
            <div class="meter-bar rms-right" :style="{ top: meterTop(displayRmsR()) }" />

            <div
              v-for="t of peakTicks"
              :key="'pt' + t"
              class="meter-tick peak-tick"
              :style="{ top: meterTop(t) }" />
            <div
              v-for="t of rmsTicks"
              :key="'rtl' + t"
              class="meter-tick rms-tick-left"
              :style="{ top: meterTop(t) }" />
            <div
              v-for="t of rmsTicks"
              :key="'rtr' + t"
              class="meter-tick rms-tick-right"
              :style="{ top: meterTop(t) }" />
          </div>
        </div>
      </section>

      <section class="viz-panel">
        <div class="viz-panel-controls">
          <button class="colormap-button" @click="nextWaterfallColormap">
            map: {{ waterfallColormaps[waterfallColormap] }}
          </button>
        </div>
        <div class="viz-fill">
          <TheSpectogram :colormap="waterfallColormap" />
        </div>
      </section>

      <section class="viz-panel">
        <div class="overview-panel">
          <div class="mood-strip">
            <MoodBar :moodbar="moodbar" />
            <div class="playhead" :style="{ left: playheadLeft }" />
          </div>

          <div class="overview-wave">
            <WaveForm :fill="true" :waveform="downscaled" />
            <div class="playhead" :style="{ left: playheadLeft }" />
          </div>

          <div class="detail-wave">
            <LiveWaveForm />
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.viz-shell {
  position: fixed;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100vw;
  height: 100vh;
  padding: 10px;
  overflow: hidden;
  background: black;
}

.viz-topbar {
  display: flex;
  flex: 0 0 32px;
  align-items: center;
  justify-content: space-between;
  min-height: 0;
  letter-spacing: 0;
}

.header-track {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 8px;
  overflow: hidden;
  color: white;
}

.header-track span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-track span:last-child {
  opacity: 0.7;
}

.viz-button {
  height: 28px;
  padding: 0 10px;
  color: white;
  background: black;
  border: 1px solid white;
}

.viz-grid {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  min-height: 0;
  overflow: hidden;
}

.viz-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid white;
  background: black;
}

.viz-panel-controls {
  display: flex;
  flex: 0 0 28px;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 5px 8px;
  color: white;
  font-size: 13px;
  line-height: 18px;
  border-bottom: 1px solid white;
}

.colormap-button {
  height: 20px;
  min-width: 0;
  padding: 0 6px;
  overflow: hidden;
  color: white;
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: black;
  border: 1px solid white;
}

.viz-fill {
  flex: 1;
  min-height: 0;
}

.stereo-panel {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) 86px;
  gap: 10px;
  min-height: 0;
  padding: 8px;
}

.stereo-scope {
  display: grid;
  align-self: stretch;
  justify-self: stretch;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  place-items: center;
}

.meter-panel {
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.meter-mode {
  position: absolute;
  top: 0;
  left: 43px;
  z-index: 1;
  transform: translateX(-50%);
}

.meter-label {
  position: absolute;
  bottom: 0;
  color: white;
  font-size: 12px;
}

.left-label {
  left: 18px;
}

.right-label {
  left: 68px;
}

.meter-bar {
  position: absolute;
  bottom: 18px;
  background: white;
}

.rms-left,
.rms-right {
  width: 8px;
}

.rms-left {
  left: 4px;
}

.peak-left {
  left: 18px;
  width: 20px;
}

.peak-right {
  left: 48px;
  width: 20px;
}

.rms-right {
  left: 74px;
}

.meter-hold {
  position: absolute;
  height: 0;
  border-top: 4px solid white;
}

.hold-left {
  left: 18px;
  width: 20px;
}

.hold-right {
  left: 48px;
  width: 20px;
}

.meter-tick {
  position: absolute;
  height: 0;
  border-top: 1px solid white;
}

.peak-tick {
  left: 18px;
  width: 56px;
}

.rms-tick-left {
  left: 4px;
  width: 12px;
}

.rms-tick-right {
  left: 74px;
  width: 12px;
}

.overview-panel {
  display: grid;
  flex: 1;
  grid-template-rows: 42px minmax(54px, 0.38fr) minmax(0, 1fr);
  gap: 8px;
  min-height: 0;
  padding: 10px;
}

.mood-strip,
.overview-wave,
.detail-wave {
  position: relative;
  min-height: 0;
  overflow: hidden;
  background: black;
}

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: white;
  pointer-events: none;
}

@media (max-width: 760px) {
  .viz-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: repeat(4, minmax(0, 1fr));
  }

  .stereo-panel {
    grid-template-columns: minmax(0, 1fr) 84px;
    padding: 8px;
  }

  .viz-panel-controls {
    flex-basis: 24px;
    padding: 3px 6px;
  }
}
</style>
