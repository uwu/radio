import { effect, ref } from "vue";
import { startSyncClient, currentChannel as selectedChannel } from "./syncClient";

export const currentChannel = ref(window.location.hash.substring(1));

effect(async () => {
  window.location.hash = "#" + currentChannel.value;

  const channel = currentChannel.value === "" ? null : currentChannel.value;
  selectedChannel.value = channel;

  const hub = await startSyncClient();
  await hub.invoke("RequestState", channel);
});
