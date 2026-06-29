<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";
import { gonioPoints } from "@/analysis";

const canvas = ref<HTMLCanvasElement>();
const frame = ref<HTMLDivElement>();

let ctx: CanvasRenderingContext2D | undefined;
let resizeObserver: ResizeObserver | undefined;
let lastX = 0;
let lastY = 0;
let lastCanvasSize = 0;
let lastRatio = 0;

const PERSISTENCE = 0.6;

function resizeCanvas() {
  if (!ctx) return;

  const rect = frame.value!.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const size = Math.max(1, Math.floor(Math.min(rect.width, rect.height)));
  if (size === lastCanvasSize && ratio === lastRatio) return;

  lastCanvasSize = size;
  lastRatio = ratio;
  ctx.canvas.style.width = `${size}px`;
  ctx.canvas.style.height = `${size}px`;
  ctx.canvas.width = Math.floor(size * ratio);
  ctx.canvas.height = Math.floor(size * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawGuide(ctx: CanvasRenderingContext2D, size: number) {
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(size / 4, size / 4);
  ctx.lineTo((size * 3) / 4, (size * 3) / 4);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo((size * 3) / 4, size / 4);
  ctx.lineTo(size / 4, (size * 3) / 4);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(0, size / 2);
  ctx.lineTo(size / 2, size);
  ctx.lineTo(size, size / 2);
  ctx.closePath();
  ctx.stroke();
}

function drawGoniometer() {
  if (!ctx) return;

  resizeCanvas();

  const size = ctx.canvas.width / (window.devicePixelRatio || 1);
  const pts = gonioPoints.value;

  ctx.fillStyle = `rgb(0, 0, 0, ${1 - PERSISTENCE})`;
  ctx.fillRect(0, 0, size, size);
  drawGuide(ctx, size);

  if (!pts?.length) return;

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo((size / 2) * (1 + lastX), (size / 2) * (1 + lastY));

  for (let i = 0; i < pts.length; i += 2) {
    ctx.lineTo((size / 2) * (1 + pts[i + 1]), (size / 2) * (1 + pts[i]));
  }

  lastX = pts[pts.length - 1];
  lastY = pts[pts.length - 2];
  ctx.stroke();
}

onMounted(() => {
  ctx = canvas.value!.getContext("2d")!;
  resizeObserver = new ResizeObserver(drawGoniometer);
  resizeObserver.observe(frame.value!);
  watchEffect(drawGoniometer);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<template>
  <div ref="frame" class="goniometer-frame">
    <canvas ref="canvas" class="block"></canvas>
  </div>
</template>

<style scoped>
.goniometer-frame {
  display: grid;
  width: 82%;
  height: 82%;
  min-width: 0;
  min-height: 0;
  margin: auto;
  overflow: hidden;
  place-items: center;
}
</style>
