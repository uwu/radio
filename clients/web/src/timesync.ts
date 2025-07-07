import { serverUrl } from "./constants";

async function measureTimeOffset() {
  const timeBefore = Date.now() / 1000;

  const serverTime = await fetch(new URL("/api/time", serverUrl)).then((r) => r.json());

  const timeNow = Date.now() / 1000;

  const RTT = timeNow - timeBefore;
  return serverTime + (RTT / 2) - timeNow;
}

async function updateTimeOffset() {
  let offsets = [];
  // sample a few times to improve precision
  let sum = 0;
  for (let i = 0; i < 5; i++)
  {
    let oset = await measureTimeOffset()
    offsets.push(oset);
    sum += oset;
  }

  timeOffset = sum / offsets.length;

  const stdDev = Math.sqrt((offsets.map(x => (x - timeOffset) ** 2)).reduce((a,b) => a + b) / 5);

  console.log(`time offset from server: ${(timeOffset * 1000).toFixed(1)}ms, stddev = ${stdDev * 1000}`)
}

export let timeOffset = 0;
export const timePromise = updateTimeOffset();

export const currentTimestamp = () => Date.now() / 1000 + timeOffset;
