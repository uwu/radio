import { serverUrl } from "./constants";

const serverTime = await fetch(new URL("/api/time", serverUrl)).then((r) => r.json());
export const timeOffset = serverTime - ~~(Date.now() / 1000);
export const currentTimestamp = () => ~~(Date.now() / 1000) + timeOffset;
