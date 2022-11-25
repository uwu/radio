import magic from "@/assets/magic.mp3";
import { watchEffect } from "vue";
import { getDuration, seek, volume } from "./audio";
import { getClient } from "./syncClient";

export let initalized = false;

const audio = new Audio(magic);
audio.loop = true;

// Don't want any trouble with autoplay
export function setupMediaSession() {
  if (initalized) return;
  initalized = true;

  if ("mediaSession" in navigator) {
    const client = getClient();
    audio.play();

    watchEffect(() => {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: client.currentSong?.name,
        artist: client.currentSong?.artist,
        album: client.currentSong?.album,
        artwork: client.currentSong?.artUrl !== undefined ? [{ src: client.currentSong?.artUrl! }] : [],
      });
    });
    
    // Seperate effect since this is called every second
    watchEffect(() => {
      if (!isNaN(seek.value ?? 0)) {
        navigator.mediaSession.setPositionState({
          position: seek.value,
          duration: getDuration(),
        });
      }
    });
  }
}
