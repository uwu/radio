import magic from "@/assets/magic.mp3";
import { watchEffect } from "vue";
import { getDuration, seek } from "./audio";
import { currentSong } from "./syncClient";

export let initalized = false;

const audio = new Audio(magic);
audio.loop = true;

// Don't want any trouble with autoplay
export function setupMediaSession() {
  if (initalized) return;
  initalized = true;

  audio.play();

  // Polyfill Media Session API so it can still be a data source even if it
  // isn't supported by the browser.
  // @ts-ignore
  navigator.mediaSession ??= {
    setPositionState() {},
  };
  // @ts-ignore
  window.MediaMetadata ??= class {
    album?: string;
    artist?: string;
    artwork?: MediaImage[];
    title?: string;

    constructor(data: MediaMetadataInit) {
      this.album = data.album ?? "";
      this.artist = data.artist ?? "";
      this.artwork = data.artwork ?? [];
      this.title = data.title ?? "";
    }
  };

  watchEffect(() => {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.value.name,
      artist: currentSong.value.artist,
      album: currentSong.value.album ?? "",
      artwork: currentSong.value.artUrl !== undefined ? [{ src: currentSong.value.artUrl! }] : [],
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
