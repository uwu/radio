import { createMemo } from "solid-js";
import { clientInstance } from "../syncClient";

const quotes = createMemo(() => clientInstance.submitters.get(clientInstance.currentSong?.submitter)?.quotes);

const randomQuote = createMemo(() => (quotes() ? quotes()[~~(Math.random() * quotes().length)] : undefined));

export default () => (
	<div>
		The right pane is a work in progress.
		<br />
		The current song was submitted by {clientInstance.currentSong?.submitter}.
		<br />
		{randomQuote()}
	</div>
);
