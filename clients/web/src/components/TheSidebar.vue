<script setup lang="ts">
import ChannelLink from "./ChannelLink.vue";
</script>

<template>
  <!-- display-none! here is a TEMPFIX. We'll add a proper menu for this LATER. -->
  <div
    class="display-none! md:display-block! border-r border-white w-80 h-full text-center text-lg flex flex-col">
    <div class="border-b border-white">
      <ChannelLink name="global" />
    </div>
    <ChannelLink name="yellowsink" />
    <ChannelLink name="toonlink" />
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
