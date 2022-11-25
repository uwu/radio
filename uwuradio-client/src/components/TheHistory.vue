<script setup lang="ts">
import { history } from "@/audio";
</script>

<template>
  <ul class="display-none! md:display-block! absolute bottom-2 left-3">
    <li
      v-for="(song, index) in history"
      :key="index"
      :style="{ opacity: (index + 1) / history.length }">
      <a :href="song.sourceUrl" class="hover:underline">{{ song.name }}</a>
      <span class="display-none"> - {{ song.artist }}</span>
    </li>
  </ul>
</template>

<style>
li:hover > span {
  display: initial;
}
</style>
