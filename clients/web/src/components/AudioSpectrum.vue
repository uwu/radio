<script setup lang="ts">
import { onMounted, watchEffect } from "vue";
import { enableAnalysis } from "@/analysis";

const id = Math.random().toString(16).split(".")[1];

enableAnalysis.value = true;

const props = defineProps<{ waveform: Float32Array | undefined }>();

function movingMax(buf: Float32Array, n: number) {
  const output = new Float32Array(buf.length - n);

  for (let i = 0; i < (buf.length - n); i++) {
    output[i] = Math.max(...buf.slice(i, i + n));
  }
  return output;
}

onMounted(() => {
  const ctx = (document.getElementById(id) as HTMLCanvasElement).getContext("2d")!;

  const W = ctx.canvas.offsetWidth;
  const H = ctx.canvas.offsetHeight;
  ctx.canvas.width = W;
  ctx.canvas.height = H;

  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";

  watchEffect(() => {
    let buffer = props.waveform;
    if (!buffer) return;
    buffer = movingMax(buffer, 2);
    //const len = buffer.length;
    const len = ~~(buffer.length * .7); // hand tuned value lol dont worry about it
    const dx = W / len;

    buffer = buffer.map((s) => Math.log10(1 + s));

    const scale = 1 / 3.5 /*Math.max(...buffer)*/;
    const xScale = W / Math.log10(1 + len * dx);

    ctx.clearRect(0, 0, W, H);

    let x = 0;
    ctx.moveTo(0, H);
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      ctx.lineTo(Math.log10(1 + x) * xScale, H * (1 - buffer[i] * scale));
      x += dx;
    }
    
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();

    ctx.fill();
  });
});
</script>

<template>
  <canvas :id="id" style="width: 100%; height: 100px"></canvas>
</template>
