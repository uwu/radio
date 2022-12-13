import { createApp } from "vue";
import App from "./App.vue";

// styles
import "@unocss/reset/tailwind.css";
import "uno.css";
import "./assets/styles.css";

// hopefully fix IOS
// @ts-ignore
window.AudioContext = window.AudioContext || window.webkitAudioContext;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
createApp(App).mount("#app");
