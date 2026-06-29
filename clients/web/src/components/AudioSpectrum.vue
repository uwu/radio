<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { audioAnalyser } from "@/audio";

const canvas = ref<HTMLCanvasElement>();

let animationFrame = 0;
let resizeObserver: ResizeObserver | undefined;
let frequencyData: Uint8Array;
let smoothed: Float32Array;

function resizeCanvas(ctx: CanvasRenderingContext2D) {
  const rect = ctx.canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));

  ctx.canvas.width = Math.floor(width * ratio);
  ctx.canvas.height = Math.floor(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  smoothed = new Float32Array(width);
}

function drawSpectrum(ctx: CanvasRenderingContext2D) {
  const width = ctx.canvas.width / (window.devicePixelRatio || 1);
  const height = ctx.canvas.height / (window.devicePixelRatio || 1);

  audioAnalyser.getByteFrequencyData(frequencyData);

  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, height);

  for (let x = 0; x < width; x++) {
    const from = Math.floor((x / width) ** 2 * frequencyData.length);
    const to = Math.max(
      from + 1,
      Math.floor(((x + 1) / width) ** 2 * frequencyData.length),
    );
    let peak = 0;

    for (let bin = from; bin < Math.min(to, frequencyData.length); bin++) {
      peak = Math.max(peak, frequencyData[bin]);
    }

    const next = (peak / 255) ** 0.72;
    smoothed[x] = Math.max(next, smoothed[x] * 0.86);
    ctx.lineTo(x, height * (1 - smoothed[x]));
  }

  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  animationFrame = requestAnimationFrame(() => drawSpectrum(ctx));
}

onMounted(() => {
  const ctx = canvas.value!.getContext("2d")!;

  audioAnalyser.fftSize = 2048;
  audioAnalyser.smoothingTimeConstant = 0.68;
  frequencyData = new Uint8Array(audioAnalyser.frequencyBinCount);
  smoothed = new Float32Array(1);

  resizeObserver = new ResizeObserver(() => resizeCanvas(ctx));
  resizeObserver.observe(ctx.canvas);
  resizeCanvas(ctx);
  drawSpectrum(ctx);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
});
</script>

<template>
  <canvas ref="canvas" class="block h-full w-full"></canvas>
</template>
