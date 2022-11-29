<script setup lang="ts">
import {  ref } from "vue";

const clients = [
  {
    name: "android",
    url: "https://nightly.link/uwu/radio/workflows/build-android/master/uwuradio.zip",
  },
  {
    name: "discord bot",
    url: "https://discord.com/oauth2/authorize?client_id=1045796505535135855&permissions=3145728&scope=bot%20applications.commands",
  },
];

const visible = ref(false);
</script>

<template>
  <div class="display-none! md:display-block! absolute top-0 left-0 pt-2 pl-3">
    <span :class="{ 'cursor-pointer': true, underline: visible }" @click="visible = !visible"
      >clients</span
    >
    <ul v-if="visible">
      <li
        v-for="client in clients">
        <a :href="client.url" target="_blank" class="hover:underline">{{ client.name }}</a>
      </li>
    </ul>
  </div>
</template>
