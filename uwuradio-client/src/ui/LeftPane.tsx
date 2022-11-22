import { createMemo, on } from "solid-js";
import { seek, getDuration, prettySeek, prettyDuration, volume, setVolume } from "../audio";
import { clientInstance } from "../syncClient";

// reactivity fun
const timestamps = createMemo(
	on([prettySeek], ([seek]) => (
		<div class="flex">
			{seek}
			<div class="flex-1" />
			{prettyDuration()}
		</div>
	))
);

export default () => (
	<div class="self-center flex flex-col text-center">
		<img class="m-5 aspect-ratio-square" src={clientInstance.currentSong?.artUrl} />
		<p>{clientInstance.currentSong?.name}</p>
		<p>by {clientInstance.currentSong?.artist}</p>

		<div class="mt-2">
			{timestamps()}
			<div class="h-px bg-white" style={`width: ${(100 * seek()!) / getDuration()}%`} />
		</div>

		<div class="flex mt-4 items-center gap-4">
			VOL
			<input
				class="slider flex-1"
				type="range"
				min={0}
				max={1}
				value={volume()}
				step={0.01}
				onInput={(e) => setVolume(e.target.value)}
			/>
		</div>
	</div>
);
