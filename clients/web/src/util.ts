import { serverUrl } from "./constants";

export let timeOffset = 0;
export const timePromise = (async () => {
  const timeBefore = ~~(Date.now() / 1000);

  const serverTime = await fetch(new URL("/api/time", serverUrl)).then((r) => r.json());

  const timeNow = ~~(Date.now() / 1000);

  timeOffset = serverTime - ~~((timeNow - timeBefore) / 2) - timeNow;
})();

export const currentTimestamp = () => ~~(Date.now() / 1000) + timeOffset;
