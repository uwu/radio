import { createSignal, createMemo, createEffect } from "solid-js";
import { Howl } from "howler";

let audioPlayer: Howl;

window["audio"] = () => audioPlayer;

export const [volume, setVolume] = createSignal(1);

createEffect(() => {
  volume();
  audioPlayer?.volume(volume());
});

const prettyFormatTime = (time: number) =>
  `${~~(time / 60)}:${(~~(time % 60)).toString().padStart(2, "0")}`;

const [seek, setSeek] = createSignal<number>();
export { seek };
export const prettySeek = createMemo(() => prettyFormatTime(seek()!));

setInterval(() => setSeek(audioPlayer?.seek()), 100);

export const seekTo = (seek: number) => audioPlayer?.seek(seek);

export const getDuration = () => audioPlayer?.duration();
export const prettyDuration = () => prettyFormatTime(getDuration());

export function play(url: string, seek: number) {
  audioPlayer?.stop();

  audioPlayer = new Howl({
    src: url,
    html5: true,
    format: "mp3",
    volume: volume(),
  });

  audioPlayer.once("play", () => audioPlayer.seek(seek));

  audioPlayer.play();
}
