import { createEffect, createSignal } from "solid-js";

export default () => {
  let ref: HTMLDivElement;

  const [width, setWidth] = createSignal();

  createEffect(() => {
    ref.onresize = () => {
      setWidth(ref.clientWidth);
    };
  });

  return (
    <div ref={ref!} class="mt-2">
      <div class="h-px bg-white" style={`width: `} />
    </div>
  )
}