<script setup lang="ts">
import { history } from "@/audio";
import { computed, ref } from "vue";

const visible = ref(false);
const reversed = computed(() => [...history].reverse());
</script>

<template>
  <div class="display-none! md:display-block! absolute top-2 right-3 text-right">
    <span :class="{ 'cursor-pointer': true, underline: visible }" @click="visible = !visible"
      >history</span
    >
    <ul v-if="visible">
      <li
        v-for="(song, index) in reversed"
        :key="index"
        :style="{ opacity: 1 - index / reversed.length }">
        <span class="display-none">{{ song.artist }} - </span>
        <a :href="song.sourceUrl" class="hover:underline">{{ song.name }}</a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
li {
  background: black;
}

li:hover {
  opacity: 1 !important;
}

li:hover > span {
  display: initial;
}
</style>
