import { createApp } from "vue";
import App from "./App.vue";

// styles
import "@unocss/reset/tailwind.css";
import "uno.css";
import "./assets/styles.css";

// dark favicon
if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
  document.head.querySelector("link")!.href = "https://uwu.network/favicon-white.ico";


// eslint-disable-next-line @typescript-eslint/no-unused-vars
createApp(App).mount("#app");
