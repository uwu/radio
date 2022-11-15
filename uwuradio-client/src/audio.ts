import {createSignal, createMemo, createEffect} from "solid-js"
import {Howl} from "howler"

let audioPlayer: Howl;

window["audio"] = () => audioPlayer;

const prettyFormatTime = (time: number) => `${~~(time / 60)}:${(~~(time % 60)).toString().padStart(2, "0")}`;

const [seek, setSeek] = createSignal<number>();
export { seek };
export const prettySeek = createMemo(() => prettyFormatTime(seek()!))

createEffect(() => console.log(prettySeek(), "/", prettyFormatTime(audioPlayer?.duration() ?? 0)))

setInterval(() => setSeek(audioPlayer?.seek()), 100)

export const seekTo = (seek: number) => audioPlayer?.seek(seek);

export function play(url: string, seek: number) {
	audioPlayer?.stop();
	
	audioPlayer = new Howl({
		src: url,
		html5: true,
	});

	audioPlayer.once("play", () => {
		audioPlayer.seek(seek);
	})
	
	audioPlayer.play()
}