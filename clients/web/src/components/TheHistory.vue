<script setup lang="ts">
import { history } from "@/compatibility";
import { computed, ref } from "vue";
import { useMediaQuery } from "@vueuse/core";

const visible = ref(false);
const isDesktop = useMediaQuery("(min-width: 768px)");
const reversed = computed(() => history.slice(isDesktop.value ? -10 : 0).reverse());

const visibleClasses = computed(() => Object.fromEntries([
  "w-screen", "h-screen",
  "md:w-auto", "md:h-auto",
  "bg-black", "md:bg-transparent",
].map((e) => [e, visible.value])));
</script>

<template>
  <div class="absolute top-0 right-0 pt-2 pr-3 text-right" :class="visibleClasses">
    <span :class="{ 'cursor-pointer': true, underline: visible }" @click="visible = !visible"
      >history</span
    >
    <ul v-if="visible">
      <li
        v-for="(song, index) in reversed"
        :key="index"
        :style="{ opacity: 1 - index / reversed.length }"
        class="hover:bg-black hover:opacity-100!">
        <span class="display-none">{{ song.artist }} - </span>
        <a :href="song.sourceUrl" class="hover:underline">{{ song.name }}</a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
li:hover > span {
  display: initial;
}
</style>
