import {
  XCC_SHADER_CONTROLS,
  type XccShaderSettingName,
  type XccShaderSettings,
} from './shader_settings';

const VERTEX_SHADER = `#version 300 es
out vec2 vUv;

void main() {
  vec2 position = vec2(
    gl_VertexID == 2 ? 3.0 : -1.0,
    gl_VertexID == 1 ? 3.0 : -1.0
  );

  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Adapted from the supplied Shadertoy shader in temp/SHADER2. The Shadertoy
// entry point and uniforms are translated to WebGL2, while the original tape
// wave, crease, switching noise, bloom, and AC beat effects remain intact.
const VHS_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uSheet;
uniform vec2 uResolution;
uniform float uTime;
uniform float uLoading;
uniform float uTapeWaveAmount;
uniform float uTapeJitterAmount;
uniform float uTapeJitterFrequency;
uniform float uTapeJitterSpeed;
uniform float uCreaseFrequency;
uniform float uCreaseSpeed;
uniform float uCreaseThreshold;
uniform float uCreaseWidth;
uniform float uCreaseStrength;
uniform float uSwitchingNoiseHeight;
uniform float uSwitchingVerticalJump;
uniform float uSwitchingHorizontalJitter;
uniform float uBloomSpacing;
uniform float uBloomStrength;
uniform float uBrightness;
uniform float uAcBeatSpeed;
uniform float uAcBeatStrength;
uniform float uAcBeatThreshold;
uniform float uAcBeatMaximum;
uniform float uBarrelDistortion;
uniform float uVignetteStrength;

out vec4 outColor;

const float PI = 3.14159265;

vec3 tex2D(sampler2D source, vec2 uv) {
  vec3 color = texture(source, uv).xyz;
  if (0.5 < abs(uv.x - 0.5)) {
    color = vec3(0.1);
  }
  return color;
}

float hash(vec2 value) {
  return fract(sin(dot(value, vec2(89.44, 19.36))) * 22189.22);
}

// Adapted from the user-supplied, freely usable Shadertoy TV-static shader.
// Tiny lower bounds preserve its output while preventing division by zero at
// the exact point where the long evolution loop wraps.
float tvStaticNoise(vec2 position, float evolve) {
  float evolution = max(fract(evolve * 0.01), 0.000001);
  float cx = position.x * evolution;
  float cy = max(position.y * evolution, 0.000001);
  float divisor = fract(
    fract(cx * 2.4 / cy * 23.0) *
    fract(cx * evolve / pow(abs(cy), 0.05))
  );
  return fract(23.0 * fract(2.0 / max(divisor, 0.000001)));
}

float interpolatedHash(vec2 value, vec2 resolution) {
  float h00 = hash(floor(value * resolution) / resolution);
  float h10 = hash(floor(value * resolution + vec2(1.0, 0.0)) / resolution);
  float h01 = hash(floor(value * resolution + vec2(0.0, 1.0)) / resolution);
  float h11 = hash(floor(value * resolution + vec2(1.0)) / resolution);
  vec2 position = smoothstep(
    vec2(0.0),
    vec2(1.0),
    mod(value * resolution, 1.0)
  );
  return (h00 * (1.0 - position.x) + h10 * position.x) * (1.0 - position.y) +
    (h01 * (1.0 - position.x) + h11 * position.x) * position.y;
}

float noise(vec2 value) {
  float sum = 0.0;
  for (int octave = 1; octave < 9; octave++) {
    float scale = pow(2.0, float(octave));
    sum += interpolatedHash(value + vec2(octave), vec2(2.0 * scale)) / scale;
  }
  return sum;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  if (uLoading > 0.5) {
    outColor = vec4(vec3(tvStaticNoise(gl_FragCoord.xy, uTime)), 1.0);
    return;
  }

  vec2 centeredUv = uv * 2.0 - 1.0;
  float radiusSquared = dot(centeredUv, centeredUv);
  vec2 noisyUv = centeredUv * (1.0 + uBarrelDistortion * radiusSquared);
  noisyUv = noisyUv * 0.5 + 0.5;

  // Tape wave.
  noisyUv.x += (noise(vec2(noisyUv.y, uTime)) - 0.5) * uTapeWaveAmount;
  noisyUv.x +=
    (noise(vec2(noisyUv.y * uTapeJitterFrequency, uTime * uTapeJitterSpeed)) - 0.5) *
    uTapeJitterAmount;

  // Tape crease.
  float creasePhase = clamp(
    (sin(noisyUv.y * uCreaseFrequency - uTime * PI * uCreaseSpeed) - uCreaseThreshold) *
      noise(vec2(uTime)),
    0.0,
    uCreaseWidth
  ) * uCreaseStrength;
  float creaseNoise = max(
    noise(vec2(noisyUv.y * uTapeJitterFrequency, uTime * uTapeJitterSpeed)) - 0.5,
    0.0
  );
  noisyUv.x -= creaseNoise * creasePhase;

  // Switching noise.
  float switchingPhase = uSwitchingNoiseHeight <= 0.0
    ? 0.0
    : smoothstep(uSwitchingNoiseHeight, 0.0, noisyUv.y);
  noisyUv.y += switchingPhase * uSwitchingVerticalJump;
  noisyUv.x += switchingPhase *
    (noise(vec2(uv.y * uTapeJitterFrequency, uTime * uTapeJitterSpeed)) - 0.5) *
    uSwitchingHorizontalJitter;

  vec3 color = tex2D(uSheet, noisyUv);
  color *= 1.0 - creasePhase;
  color = mix(color, color.yzx, switchingPhase);

  // Bloom and horizontal color bleed.
  for (float offset = -4.0; offset < 2.5; offset += 1.0) {
    color += vec3(
      tex2D(uSheet, noisyUv + vec2(offset, 0.0) * uBloomSpacing).r,
      tex2D(uSheet, noisyUv + vec2(offset - 2.0, 0.0) * uBloomSpacing).g,
      tex2D(uSheet, noisyUv + vec2(offset - 4.0, 0.0) * uBloomSpacing).b
    ) * uBloomStrength;
  }
  color *= uBrightness;

  // AC beat.
  color *= 1.0 + clamp(
    noise(vec2(0.0, uv.y + uTime * uAcBeatSpeed)) * uAcBeatStrength - uAcBeatThreshold,
    0.0,
    uAcBeatMaximum
  );

  float vignette = 1.0 - uVignetteStrength *
    smoothstep(0.2, 1.0, radiusSquared);
  color *= max(vignette, 0.0);

  outColor = vec4(color, 1.0);
}
`;

const FRAME_INTERVAL_MS = 1000 / 60;

export class WebGlUnavailableError extends Error {
  override name = 'WebGlUnavailableError';
}

export class WebGlSheetRenderer {
  readonly canvas: HTMLCanvasElement;
  textureUploadCount = 0;

  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly texture: WebGLTexture;
  private readonly vertexArray: WebGLVertexArrayObject;
  private readonly timeUniform: WebGLUniformLocation;
  private readonly resolutionUniform: WebGLUniformLocation;
  private readonly loadingUniform: WebGLUniformLocation;
  private readonly settingUniforms: Record<XccShaderSettingName, WebGLUniformLocation>;
  private settings: XccShaderSettings;
  private animationFrame: number | null = null;
  private startTime = 0;
  private lastDrawTime = 0;
  private frameCount = 0;
  private hasTexture = false;
  private loading = false;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, initialSettings: XccShaderSettings) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      preserveDrawingBuffer: false,
      premultipliedAlpha: false,
      stencil: false,
    });

    if (!gl) {
      throw new WebGlUnavailableError('WebGL2 is unavailable in this browser.');
    }

    this.gl = gl;
    this.program = createProgram(gl, VERTEX_SHADER, VHS_FRAGMENT_SHADER);

    const texture = gl.createTexture();
    const vertexArray = gl.createVertexArray();
    const timeUniform = gl.getUniformLocation(this.program, 'uTime');
    const resolutionUniform = gl.getUniformLocation(this.program, 'uResolution');
    const loadingUniform = gl.getUniformLocation(this.program, 'uLoading');

    if (!texture || !vertexArray || !timeUniform || !resolutionUniform || !loadingUniform) {
      throw new Error('WebGL could not allocate the shader renderer resources.');
    }

    this.texture = texture;
    this.vertexArray = vertexArray;
    this.timeUniform = timeUniform;
    this.resolutionUniform = resolutionUniform;
    this.loadingUniform = loadingUniform;
    this.settings = { ...initialSettings };
    this.settingUniforms = Object.fromEntries(
      XCC_SHADER_CONTROLS.map(({ name }) => {
        const uniformName = `u${name[0].toUpperCase()}${name.slice(1)}`;
        const location = gl.getUniformLocation(this.program, uniformName);
        if (!location) {
          throw new Error(`WebGL could not find shader setting uniform ${uniformName}.`);
        }
        return [name, location];
      }),
    ) as Record<XccShaderSettingName, WebGLUniformLocation>;

    gl.bindVertexArray(this.vertexArray);
    gl.useProgram(this.program);
    gl.uniform1i(gl.getUniformLocation(this.program, 'uSheet'), 0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    canvas.dataset.webglReady = 'true';
    canvas.dataset.textureUploads = '0';
    canvas.dataset.framesDrawn = '0';
    canvas.dataset.signal = 'sheet';
  }

  updateTexture(source: HTMLCanvasElement): void {
    this.assertActive();

    const maximumTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE) as number;
    if (source.width > maximumTextureSize || source.height > maximumTextureSize) {
      throw new Error(
        `Captured sheet ${source.width}×${source.height} exceeds WebGL texture limit ${maximumTextureSize}.`,
      );
    }

    this.canvas.width = source.width;
    this.canvas.height = source.height;
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      source,
    );

    const error = this.gl.getError();
    if (error !== this.gl.NO_ERROR) {
      throw new Error(`WebGL texture upload failed with error code ${error}.`);
    }

    this.hasTexture = true;
    this.textureUploadCount++;
    this.canvas.dataset.textureUploads = String(this.textureUploadCount);
    this.draw(performance.now());
  }

  setSettings(settings: XccShaderSettings): void {
    this.assertActive();
    this.settings = { ...settings };
    this.draw(performance.now());
  }

  setLoading(loading: boolean): void {
    this.assertActive();
    this.loading = loading;
    this.canvas.dataset.signal = loading ? 'static' : 'sheet';

    if (loading) {
      this.start();
    }
    this.draw(performance.now());
  }

  start(): void {
    this.assertActive();
    if (this.animationFrame !== null || (!this.hasTexture && !this.loading)) {
      return;
    }

    this.startTime = performance.now();
    this.lastDrawTime = 0;

    // Animation is the core output of this page. Do not suppress it based on
    // the operating system's reduced-motion preference.
    this.canvas.dataset.motion = 'animated';
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.gl.deleteTexture(this.texture);
    this.gl.deleteVertexArray(this.vertexArray);
    this.gl.deleteProgram(this.program);
    this.canvas.dataset.webglReady = 'false';
    this.destroyed = true;
  }

  private readonly frame = (now: number): void => {
    if (now - this.lastDrawTime >= FRAME_INTERVAL_MS) {
      this.draw(now);
      this.lastDrawTime = now;
    }
    this.animationFrame = requestAnimationFrame(this.frame);
  };

  private draw(now: number): void {
    if ((!this.hasTexture && !this.loading) || this.destroyed) {
      return;
    }

    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vertexArray);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1f(this.timeUniform, (now - this.startTime) * 0.001);
    gl.uniform2f(this.resolutionUniform, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.loadingUniform, this.loading ? 1 : 0);
    for (const { name } of XCC_SHADER_CONTROLS) {
      gl.uniform1f(this.settingUniforms[name], this.settings[name]);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.frameCount++;
    if (this.frameCount === 1 || this.frameCount % 30 === 0) {
      this.canvas.dataset.framesDrawn = String(this.frameCount);
    }
  }

  private assertActive(): void {
    if (this.destroyed) {
      throw new Error('Cannot use a destroyed WebGL sheet renderer.');
    }
  }
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();

  if (!program) {
    throw new Error('WebGL could not create a shader program.');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(
      `WebGL program link failed: ${gl.getProgramInfoLog(program) ?? 'unknown error'}`,
    );
  }

  return program;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new Error('WebGL could not create a shader.');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'unknown error';
    gl.deleteShader(shader);
    throw new Error(`WebGL shader compilation failed: ${message}`);
  }

  return shader;
}
