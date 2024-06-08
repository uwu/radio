<script setup lang="ts">
import { onMounted, watchEffect } from "vue";
import { enableAnalysis } from "@/analysis";

enableAnalysis.value = true;

const props = defineProps<{ waveform: Float32Array | undefined, fill: boolean }>();

onMounted(() => {
  const ctx = (document.getElementById("wfcanvas") as HTMLCanvasElement).getContext("2d")!;

  const W = ctx.canvas.offsetWidth;
  const H = ctx.canvas.offsetHeight;
  ctx.canvas.width = W;
  ctx.canvas.height = H;

  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";

  watchEffect(() => {
    const buffer = props.waveform;
    if (!buffer) return;
    const len = buffer.length;

    const dx = W / len;

    ctx.clearRect(0, 0, W, H);

    // draw top half
    let x = 0;
    ctx.moveTo(0, H / 2);
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      ctx.lineTo(x, (H / 2) * (1 - buffer[i]));
      x += dx;
    }

    if (props.fill) {
      // draw bottom half, a mirror of the top half
      for (let i = len - 1; i >= 0; i--) {
        ctx.lineTo(x, (H / 2) * (1 + buffer[i]));
        x -= dx;
      }
      ctx.closePath();
      ctx.fill();
    }
    else {
      ctx.stroke();
    }
  });
});
</script>

<template>
  <canvas id="wfcanvas" style="width: 100%; height: 100px"></canvas>
</template>
