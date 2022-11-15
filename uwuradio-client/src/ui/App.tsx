import type {Component} from 'solid-js';
import { clientInstance } from '../syncClient';
import ProgressBar from './ProgressBar';

const App: Component = () => {
	return (
    <div class="bg-black text-white grid grid-cols-2 h-screen p-10 children:p-5">
      <div class="self-center flex flex-col text-center">
        <img class="m-5" src={clientInstance.currentSong?.artUrl} />
        <p>{clientInstance.currentSong?.name}</p>
        <p>by {clientInstance.currentSong?.artist}</p>

        <ProgressBar />
      </div>
      <div class="border-l border-white"></div>
    </div>
  );
};

export default App;