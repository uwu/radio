<script setup lang="ts">
import { onMounted, watchEffect } from "vue";
import { currentSpecto } from "@/analysis";

const id = Math.random().toString(16).split(".")[1];

onMounted(() => {
  const ctx = (document.getElementById(id) as HTMLCanvasElement).getContext("2d")!;

  const W = ctx.canvas.parentElement!.offsetWidth;
  const H = ctx.canvas.parentElement!.offsetHeight;
  ctx.canvas.width = W;
  ctx.canvas.height = H;

  watchEffect(() => {
    ctx.clearRect(0, 0, W, H);
    if (!currentSpecto.value) return;

    const spHeight = currentSpecto.value[0];
    const spData = currentSpecto.value.subarray(1);

    const spWidth = spData.length / spHeight;

    for (let y = 0; y < spHeight; y++)
      for (let x = 0; x < spWidth; x++) {
        const idx = y + (x * spHeight);

        ctx.fillStyle = `rgb(255, 255, 255, ${255 * spData[idx] / 100})`
        ctx.fillRect(x, y, 1, 1);
      }
  });
});
</script>

<template>
  <div>
    <canvas :id="id"></canvas>
  </div>
</template>
