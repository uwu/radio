<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";

const canvas = ref<HTMLCanvasElement>();
const props = defineProps<{ moodbar: Uint8ClampedArray | undefined }>();

let resizeObserver: ResizeObserver | undefined;
let ctx: CanvasRenderingContext2D | undefined;
let stripCanvas: HTMLCanvasElement | undefined;
let stripCtx: CanvasRenderingContext2D | undefined;

function resizeCanvas() {
  if (!ctx) return;

  const rect = ctx.canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));

  ctx.canvas.width = Math.floor(width * ratio);
  ctx.canvas.height = Math.floor(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawMoodBar() {
  if (!ctx) return;

  resizeCanvas();

  const width = ctx.canvas.width / (window.devicePixelRatio || 1);
  const height = ctx.canvas.height / (window.devicePixelRatio || 1);
  const buffer = props.moodbar;

  ctx.clearRect(0, 0, width, height);
  if (!buffer?.length) return;

  const columns = Math.floor(buffer.length / 3);
  if (!columns) return;

  stripCanvas ??= document.createElement("canvas");
  stripCtx ??= stripCanvas.getContext("2d")!;

  if (stripCanvas.width !== columns || stripCanvas.height !== 1) {
    stripCanvas.width = columns;
    stripCanvas.height = 1;
  }

  const image = stripCtx.createImageData(columns, 1);
  for (let i = 0; i < columns; i++) {
    const source = i * 3;
    const target = i * 4;

    image.data[target] = buffer[source];
    image.data[target + 1] = buffer[source + 1];
    image.data[target + 2] = buffer[source + 2];
    image.data[target + 3] = 255;
  }

  stripCtx.putImageData(image, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(stripCanvas, 0, 0, columns, 1, 0, 0, width, height);
}

onMounted(() => {
  ctx = canvas.value!.getContext("2d")!;
  resizeObserver = new ResizeObserver(drawMoodBar);
  resizeObserver.observe(ctx.canvas);
  watchEffect(drawMoodBar);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<template>
  <canvas ref="canvas" class="block h-full w-full"></canvas>
</template>
