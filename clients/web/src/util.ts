import { serverUrl } from "./constants";

export let timeOffset = 0;
export const timePromise = fetch(new URL("/api/time", serverUrl))
  .then((r) => r.json())
  .then((serverTime) => void (timeOffset = serverTime - ~~(Date.now() / 1000)));

export const currentTimestamp = () => ~~(Date.now() / 1000) + timeOffset;
