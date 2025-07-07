// i am so sorry for this affront to god. I hope this entire module disappears ASAP. I just need to not fuck over iOS support. - Hazel

import * as mediaSession2 from "./v2/mediaSession";

import * as v2 from "./v2/index";

import { timePromise } from "./timesync";
import { computed } from "vue";

export const canUseV2 = new Audio().canPlayType("audio/ogg");

// @ts-expect-error typescript is no fun
console.log(`using API v${(!!canUseV2) + 1}, ${canUseV2 ? "audio livestreaming" : "legacy chunking"}`);

let v1: typeof import("./v1/index");

export const waitForReady = (canUseV2
  ? Promise.resolve()
  : (async () => {
      v1 = await import("./v1/index");
    })())
      .then(() => timePromise);

export let isReady = false;

waitForReady.then(() => isReady = true);

export let mediaSession = mediaSession2;

export let audioCtx = v2.audioCtx;

export let audioAnalyser = v2.audioAnalyser;

export let currentSong = v2.currentSong;
export let nextSong = v2.nextSong;

export let history = v2.history;

export let reconnecting = () => v2.reconnecting.value;

export let seek = v2.seek;
export let duration = () => v2.duration.value;
export let prettySeek = v2.prettySeek;
export let prettyDuration = () => v2.prettyDuration.value;

export let volumeDbfs = v2.volumeDbfs;

if (!canUseV2)
  waitForReady.then(() => {
    let sc = v1.syncClient.getClient();

    mediaSession = v1.mediaSession;
    audioCtx = v1.audio.audioCtx;
    audioAnalyser = v1.audio.audioAnalyser;
    currentSong = sc.current;
    nextSong = sc.next;
    history = v1.audio.history;
    reconnecting = () => sc.reconnecting;
    // @ts-expect-error undefineds bleh
    seek = v1.audio.seek;
    duration = () => v1.audio.getDuration();
    prettySeek = v1.audio.prettySeek;
    prettyDuration = () => v1.audio.prettyDuration();
    volumeDbfs = v1.audio.volumeDbfs;
  });
