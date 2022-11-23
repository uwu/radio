<script setup lang="ts">
import ChannelLink from "./ChannelLink.vue";
</script>

<template>
  <div class="border-r border-white w-80 h-full text-center text-lg flex flex-col">
    <div class="border-b border-white">
      <ChannelLink name="global" />
    </div>
    <ChannelLink name="yellowsink" />
    <ChannelLink name="toonlink" />
    <ChannelLink name="alyxia" />
    <ChannelLink name="redstonekasi" />
    <ChannelLink name="xirreal" />
    <ChannelLink name="phorcys" />
  </div>
</template>

<style scoped>
a {
  @apply h-10;
}
</style>
