<script setup lang="ts">
//import { watchEffect } from "vue";
import { wavePath, enableAnalysis } from "@/analysis";
enableAnalysis.value = true;
</script>

<template>
  <svg viewBox="0 0 10000 2000">
    <path stroke="white" :d="wavePath" />
  </svg>
</template>


