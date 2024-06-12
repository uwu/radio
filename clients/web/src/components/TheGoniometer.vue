<script setup lang="ts">
import { onMounted, watchEffect } from "vue";
import { gonioPoints } from "@/analysis";

const id = Math.random().toString(16).split(".")[1];

onMounted(() => {
  const ctx = (document.getElementById(id) as HTMLCanvasElement).getContext("2d")!;

  const W = ctx.canvas.parentElement!.offsetWidth;
  const H = ctx.canvas.parentElement!.offsetHeight;
  ctx.canvas.width = W;
  ctx.canvas.height = H;

  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";

  let lastX = 0,
    lastY = 0;

  const PERSISTENCE = 0.6;

  watchEffect(() => {
    if (!gonioPoints.value) {
      //ctx.clearRect(0, 0, W, H);
      return;
    }

    // draw persistence from previous frame
    ctx.fillStyle = `rgb(0, 0, 0, ${1 - PERSISTENCE})`;
    ctx.fillRect(0, 0, W, H);

    // redraw the metering lines
    ctx.strokeStyle = "rgb(75, 85, 99)"; // uno gray-6
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(W / 4, H / 4);
    ctx.lineTo((W * 3) / 4, (H * 3) / 4);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo((W * 3) / 4, H / 4);
    ctx.lineTo(W / 4, (H * 3) / 4);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(0, H / 2);
    ctx.lineTo(W / 2, H);
    ctx.lineTo(W, H / 2);
    ctx.lineTo(W / 2, 0);
    ctx.stroke();

    // draw points
    const pts = gonioPoints.value;
    ctx.strokeStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo((W / 2) * (1 + lastX), (H / 2) * (1 + lastY));
    for (let i = 0; i < pts.length; i += 2) {
      ctx.lineTo((W / 2) * (1 + pts[i + 1]), (H / 2) * (1 + pts[i]));
    }
    lastX = pts[pts.length - 1];
    lastY = pts[pts.length - 2];

    ctx.stroke();
  });
});
</script>

<template>
  <div>
    <canvas :id="id"></canvas>
  </div>
</template>
