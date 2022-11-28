import { ref, watch } from "vue";

export const currentChannel = ref(window.location.hash.substring(1));
watch(currentChannel, () => {
  window.location.hash = "#" + currentChannel.value;
});
