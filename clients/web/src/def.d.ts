type PresetMap = unknown;

declare module "butterchurn" {
  interface VisualizerOptions {
    width: number;
    height: number;
  }

  class Visualizer {
    connectAudio(node: AudioNode);
    disconnectAudio(node: AudioNode);
    loadPreset(preset: PresetMap, loadTime: number);
    setRendererSize(width: number, height: number);
    render();
    launchSongTitleAnim(text: string);
  }

  function createVisualizer(
    ctx: AudioContext,
    canvas: HTMLCanvasElement,
    opts: VisualizerOptions,
  ): Visualizer;
}

declare module "butterchurn-presets" {
  function getPresets(): Record<string, PresetMap>;
}

declare module "butterchurn/lib/isSupported.min" {
  export default function isButterchurnSupported(): boolean;
}

declare module "can-autoplay" {
  function audio(): Promise<{ result: boolean }>;
}
