import { serverUrl } from "./constants";

async function measureTimeOffset() {
  const timeBefore = Date.now() / 1000;

  const serverTime = await fetch(new URL("/api/time", serverUrl)).then((r) => r.json());

  const timeNow = Date.now() / 1000;

  const RTT = timeNow - timeBefore;
  return serverTime + (RTT / 2) - timeNow;
}

async function updateTimeOffset() {
  // sample a few times to improve precision
  const results = [await measureTimeOffset(), await measureTimeOffset(), await measureTimeOffset()];
  timeOffset = results.reduce((a, b) => a + b) / 3;
}

export let timeOffset = 0;
export const timePromise = updateTimeOffset();

export const currentTimestamp = () => Date.now() / 1000 + timeOffset;
