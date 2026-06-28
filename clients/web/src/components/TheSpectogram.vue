<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { audioAnalyser } from "@/audio";

const canvas = ref<HTMLCanvasElement>();
const props = defineProps<{ colormap: number }>();

const TEXTURE_ROWS = 512;

let animationFrame = 0;
let resizeObserver: ResizeObserver | undefined;
let frequencyData: Uint8Array;
let writeRow = 0;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("could not create spectrogram shader");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "spectrogram shader compile failed");
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vertex = compileShader(
    gl,
    gl.VERTEX_SHADER,
    `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;

      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `,
  );

  const fragment = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;

      uniform sampler2D u_texture;
      uniform float u_rows;
      uniform float u_writeRow;
      uniform int u_colormap;
      varying vec2 v_texCoord;

      vec3 turbo(float value) {
        vec4 kRedVec4 = vec4(0.13572138, 4.61539260, -42.66032258, 132.13108234);
        vec4 kGreenVec4 = vec4(0.09140261, 2.19418839, 4.84296658, -14.18503333);
        vec4 kBlueVec4 = vec4(0.10667330, 12.64194608, -60.58204836, 110.36276771);
        vec2 kRedVec2 = vec2(-152.94239396, 59.28637943);
        vec2 kGreenVec2 = vec2(4.27729857, 2.82956604);
        vec2 kBlueVec2 = vec2(-89.90310912, 27.34824973);
        vec4 v4 = vec4(1.0, value, value * value, value * value * value);
        vec2 v2 = v4.zw * v4.z;

        return clamp(
          vec3(
            dot(v4, kRedVec4) + dot(v2, kRedVec2),
            dot(v4, kGreenVec4) + dot(v2, kGreenVec2),
            dot(v4, kBlueVec4) + dot(v2, kBlueVec2)
          ),
          0.0,
          1.0
        );
      }

      vec3 ramp(float value, vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec3 c4) {
        if (value < 0.25) return mix(c0, c1, value / 0.25);
        if (value < 0.5) return mix(c1, c2, (value - 0.25) / 0.25);
        if (value < 0.75) return mix(c2, c3, (value - 0.5) / 0.25);
        return mix(c3, c4, (value - 0.75) / 0.25);
      }

      vec3 heatmap(float value) {
        vec3 low = vec3(0.0, 0.0, 0.02);
        vec3 blue = vec3(0.0, 0.36, 0.95);
        vec3 cyan = vec3(0.0, 0.95, 0.82);
        vec3 amber = vec3(1.0, 0.58, 0.12);
        vec3 white = vec3(1.0);

        vec3 color = mix(low, blue, smoothstep(0.04, 0.32, value));
        color = mix(color, cyan, smoothstep(0.25, 0.55, value));
        color = mix(color, amber, smoothstep(0.52, 0.78, value));
        return mix(color, white, smoothstep(0.78, 1.0, value));
      }

      vec3 colormap(float value) {
        if (u_colormap == 0) return turbo(value);
        if (u_colormap == 1) return vec3(value);
        if (u_colormap == 2) {
          return ramp(
            value,
            vec3(0.267, 0.005, 0.329),
            vec3(0.230, 0.322, 0.546),
            vec3(0.128, 0.567, 0.551),
            vec3(0.369, 0.789, 0.383),
            vec3(0.993, 0.906, 0.144)
          );
        }
        if (u_colormap == 3) {
          return ramp(
            value,
            vec3(0.001, 0.000, 0.014),
            vec3(0.316, 0.071, 0.485),
            vec3(0.716, 0.215, 0.475),
            vec3(0.986, 0.535, 0.382),
            vec3(0.988, 0.992, 0.749)
          );
        }
        if (u_colormap == 4) {
          return ramp(
            value,
            vec3(0.001, 0.000, 0.014),
            vec3(0.342, 0.063, 0.429),
            vec3(0.735, 0.216, 0.330),
            vec3(0.978, 0.555, 0.034),
            vec3(0.988, 0.998, 0.645)
          );
        }
        if (u_colormap == 5) {
          return ramp(
            value,
            vec3(0.050, 0.030, 0.528),
            vec3(0.494, 0.012, 0.658),
            vec3(0.798, 0.280, 0.470),
            vec3(0.973, 0.586, 0.252),
            vec3(0.940, 0.975, 0.131)
          );
        }

        return heatmap(value);
      }

      void main() {
        float sourceX = pow(v_texCoord.x, 2.0);
        float row = mod(u_writeRow - 1.0 - (1.0 - v_texCoord.y) * (u_rows - 1.0) + u_rows, u_rows);
        float value = texture2D(u_texture, vec2(sourceX, (row + 0.5) / u_rows)).r;
        value = pow(value, 1.35);
        gl_FragColor = vec4(colormap(value), 1.0);
      }
    `,
  );

  const program = gl.createProgram();
  if (!program) throw new Error("could not create spectrogram program");

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "spectrogram program link failed");
  }

  return program;
}

function resizeCanvas(gl: WebGLRenderingContext) {
  const canvas = gl.canvas as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;

  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  gl.viewport(0, 0, canvas.width, canvas.height);
}

function initializeGl(gl: WebGLRenderingContext) {
  const program = createProgram(gl);
  const texture = gl.createTexture();
  const positionLocation = gl.getAttribLocation(program, "a_position");
  const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
  const rowsLocation = gl.getUniformLocation(program, "u_rows");
  const writeRowLocation = gl.getUniformLocation(program, "u_writeRow");
  const colormapLocation = gl.getUniformLocation(program, "u_colormap");

  if (!texture || !rowsLocation || !writeRowLocation || !colormapLocation) {
    throw new Error("could not initialize spectrogram uniforms");
  }

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(texCoordLocation);
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

  gl.useProgram(program);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.LUMINANCE,
    frequencyData.length,
    TEXTURE_ROWS,
    0,
    gl.LUMINANCE,
    gl.UNSIGNED_BYTE,
    null,
  );

  return { rowsLocation, writeRowLocation, colormapLocation };
}

function drawWaterfall(
  gl: WebGLRenderingContext,
  rowsLocation: WebGLUniformLocation,
  writeRowLocation: WebGLUniformLocation,
  colormapLocation: WebGLUniformLocation,
) {
  audioAnalyser.getByteFrequencyData(frequencyData);

  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0,
    0,
    writeRow,
    frequencyData.length,
    1,
    gl.LUMINANCE,
    gl.UNSIGNED_BYTE,
    frequencyData,
  );
  writeRow = (writeRow + 1) % TEXTURE_ROWS;

  gl.uniform1f(rowsLocation, TEXTURE_ROWS);
  gl.uniform1f(writeRowLocation, writeRow);
  gl.uniform1i(colormapLocation, props.colormap);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  animationFrame = requestAnimationFrame(() =>
    drawWaterfall(gl, rowsLocation, writeRowLocation, colormapLocation),
  );
}

onMounted(() => {
  audioAnalyser.fftSize = 2048;
  audioAnalyser.smoothingTimeConstant = 0.5;
  frequencyData = new Uint8Array(audioAnalyser.frequencyBinCount);

  const gl = canvas.value!.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: "high-performance",
    stencil: false,
  });

  if (!gl) {
    console.warn("no webgl, spectrogram disabled.");
    return;
  }

  const { rowsLocation, writeRowLocation, colormapLocation } = initializeGl(gl);
  resizeObserver = new ResizeObserver(() => resizeCanvas(gl));
  resizeObserver.observe(gl.canvas as HTMLCanvasElement);
  resizeCanvas(gl);
  drawWaterfall(gl, rowsLocation, writeRowLocation, colormapLocation);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
});
</script>

<template>
  <canvas ref="canvas" class="block h-full w-full"></canvas>
</template>
