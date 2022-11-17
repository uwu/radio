/* @refresh reload */
import { render } from "solid-js/web";

import App from "./ui/App";
import "uno.css";
import "./styles.css";

import { clientInstance } from "./syncClient";

render(() => <App />, document.getElementById("root") as HTMLElement);

window["instance"] = clientInstance;

document.head.append(
  <link href={clientInstance.nextSong?.dlUrl} rel="preload" as="audio" />,
  <link href={clientInstance.nextSong?.artUrl} rel="preload" as="image" />
);
