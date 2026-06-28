<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { audioAnalyser } from "@/audio";

const canvas = ref<HTMLCanvasElement>();

let animationFrame = 0;
let resizeObserver: ResizeObserver | undefined;
let waveformData: Uint8Array;
let lastWidth = 0;
let lastHeight = 0;
let lastRatio = 0;

function resizeCanvas(ctx: CanvasRenderingContext2D) {
  const rect = ctx.canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  if (width === lastWidth && height === lastHeight && ratio === lastRatio) return;

  lastWidth = width;
  lastHeight = height;
  lastRatio = ratio;
  ctx.canvas.width = Math.floor(width * ratio);
  ctx.canvas.height = Math.floor(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawWaveform(ctx: CanvasRenderingContext2D) {
  resizeCanvas(ctx);

  const width = ctx.canvas.width / (window.devicePixelRatio || 1);
  const height = ctx.canvas.height / (window.devicePixelRatio || 1);

  audioAnalyser.getByteTimeDomainData(waveformData);

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  for (let i = 0; i < waveformData.length; i++) {
    const x = (i / (waveformData.length - 1)) * width;
    const y = (waveformData[i] / 255) * height;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.stroke();
  animationFrame = requestAnimationFrame(() => drawWaveform(ctx));
}

onMounted(() => {
  const ctx = canvas.value!.getContext("2d")!;

  audioAnalyser.fftSize = 2048;
  waveformData = new Uint8Array(audioAnalyser.fftSize);

  resizeObserver = new ResizeObserver(() => resizeCanvas(ctx));
  resizeObserver.observe(ctx.canvas);
  drawWaveform(ctx);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
});
</script>

<template>
  <canvas ref="canvas" class="block h-full w-full"></canvas>
</template>
