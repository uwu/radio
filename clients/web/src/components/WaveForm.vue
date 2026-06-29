<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";

const canvas = ref<HTMLCanvasElement>();
const props = defineProps<{ waveform: Float32Array | undefined; fill: boolean }>();

let ctx: CanvasRenderingContext2D | undefined;
let resizeObserver: ResizeObserver | undefined;
let lastWidth = 0;
let lastHeight = 0;
let lastRatio = 0;

function resizeCanvas() {
  if (!ctx) return;

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

function maxAbs(buffer: Float32Array) {
  let peak = 0;

  for (let i = 0; i < buffer.length; i++) {
    peak = Math.max(peak, Math.abs(buffer[i]));
  }

  return Math.max(1, peak);
}

function drawFilledWaveform(ctx: CanvasRenderingContext2D, buffer: Float32Array, width: number, height: number) {
  const scale = 1 / maxAbs(buffer);

  ctx.beginPath();
  ctx.moveTo(0, height / 2);

  for (let x = 0; x < width; x++) {
    const start = Math.floor((x / width) * buffer.length);
    const end = Math.max(start + 1, Math.floor(((x + 1) / width) * buffer.length));
    let peak = 0;

    for (let i = start; i < Math.min(end, buffer.length); i++) {
      peak = Math.max(peak, Math.abs(buffer[i]));
    }

    ctx.lineTo(x, (height / 2) * (1 - peak * scale));
  }

  for (let x = width - 1; x >= 0; x--) {
    const start = Math.floor((x / width) * buffer.length);
    const end = Math.max(start + 1, Math.floor(((x + 1) / width) * buffer.length));
    let peak = 0;

    for (let i = start; i < Math.min(end, buffer.length); i++) {
      peak = Math.max(peak, Math.abs(buffer[i]));
    }

    ctx.lineTo(x, (height / 2) * (1 + peak * scale));
  }

  ctx.closePath();
  ctx.fill();
}

function drawLineWaveform(ctx: CanvasRenderingContext2D, buffer: Float32Array, width: number, height: number) {
  const scale = 1 / maxAbs(buffer);
  const step = Math.max(1, Math.floor(buffer.length / Math.max(1, width * 2)));

  ctx.beginPath();
  ctx.moveTo(0, height / 2);

  for (let i = 0; i < buffer.length; i += step) {
    const x = (i / Math.max(1, buffer.length - 1)) * width;
    const y = (height / 2) * (1 - buffer[i] * scale);
    ctx.lineTo(x, y);
  }

  ctx.stroke();

  ctx.strokeStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();
}

function drawWaveform() {
  if (!ctx) return;

  resizeCanvas();

  const width = ctx.canvas.width / (window.devicePixelRatio || 1);
  const height = ctx.canvas.height / (window.devicePixelRatio || 1);
  const buffer = props.waveform;

  ctx.clearRect(0, 0, width, height);
  if (!buffer?.length) return;

  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;

  if (props.fill) drawFilledWaveform(ctx, buffer, width, height);
  else drawLineWaveform(ctx, buffer, width, height);
}

onMounted(() => {
  ctx = canvas.value!.getContext("2d")!;
  resizeObserver = new ResizeObserver(drawWaveform);
  resizeObserver.observe(ctx.canvas);
  watchEffect(drawWaveform);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<template>
  <canvas ref="canvas" class="block h-full w-full"></canvas>
</template>
