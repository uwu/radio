<script setup lang="ts">
import { history } from "@/audio";
</script>

<template>
  <TransitionGroup name="history" tag="ul" class="absolute bottom-2 left-3">
    <li
      v-for="(song, index) in history"
      :key="song.historyId"
      :style="{ opacity: (index + 1) / history.length }">
      {{ song.name }}
      <span> - {{ song.artist }}</span>
    </li>
  </TransitionGroup>
</template>

<style>
li {
  transition: 0.3s;
}

li:hover {
  opacity: 1 !important;
}

li > span {
  display: none;
}

li:hover > span {
  display: initial;
}

.history-move,
.history-enter-active,
.history-leave-active {
  transition: 0.3s;
}
</style>
