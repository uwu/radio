import type { Component } from "solid-js";
import LeftPane from "./LeftPane";
import RightPane from "./RightPane"

const App: Component = () => {
  return (
    <div class="bg-black text-white grid grid-cols-2 h-screen p-10 children:p-5">
      <LeftPane />
      <div class="border-l border-white">
	      <RightPane />
      </div>
    </div>
  );
};

export default App;