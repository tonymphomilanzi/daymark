import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
uniform vec2  uResolution;
uniform float uTime;
uniform float uAmp;
uniform float uMode; // 0 idle, 1 listen, 2 speak

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.07;
    a *= 0.55;
  }
  return v;
}

vec3 palette(float amp) {
  vec3 idle = vec3(0.12, 0.78, 1.0);
  vec3 talk = vec3(0.55, 0.93, 1.0);
  vec3 peak = vec3(1.0, 0.68, 0.18);
  vec3 c = mix(idle, talk, smoothstep(0.05, 0.65, amp));
  return mix(c, peak, smoothstep(0.62, 1.0, amp));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
  float r = length(uv);
  float ang = atan(uv.y, uv.x);
  float t = uTime;
  float amp = uAmp;
  float speak = smoothstep(0.8, 2.0, uMode);

  float wob =
      0.016 * sin(ang * 3.0 + t * 1.2)
    + 0.010 * sin(ang * 8.0 - t * 2.4)
    + 0.022 * (fbm(uv * 3.4 + vec2(t * 0.22, t * 0.17)) - 0.5)
    + 0.070 * amp * sin(ang * (5.0 + 12.0 * amp) + t * (3.5 + 9.0 * amp));

  float radius = 0.20 + 0.03 * speak + wob;
  float d = abs(r - radius);

  float core = smoothstep(radius, radius - 0.17, r);
  float hole = smoothstep(0.07 + amp * 0.02, 0.11 + amp * 0.03, r);
  core *= hole;

  float glow = 0.010 / (d + 0.0018);
  glow *= 0.28 + amp * 1.1;

  float rings = 0.0;
  for (int i = 0; i < 4; i++) {
    float rr = 0.29 + float(i) * 0.065;
    float segs = 7.0 + float(i) * 3.0;
    float dash = smoothstep(0.38, 0.5, abs(fract(ang / 3.14159265 * segs + t * 0.12) - 0.5));
    rings += (0.0038 / (abs(r - rr - amp * 0.012) + 0.0004)) * dash * (0.55 - float(i) * 0.08);
  }

  float sectors = 48.0;
  float sa = (ang + 3.14159265) / 6.2831853;
  float sid = floor(sa * sectors);
  float n = hash(vec2(sid, floor(t * 14.0)));
  float band = mix(0.15, 1.0, n) * amp;
  float barLen = 0.305 + band * 0.20;
  float bar =
      smoothstep(0.012, 0.0, abs(fract(sa * sectors) - 0.5) - 0.008)
    * smoothstep(0.275, 0.32, r)
    * smoothstep(barLen, barLen - 0.05, r);

  float sweep = pow(max(0.0, cos(ang - t * 1.35)), 32.0) * smoothstep(0.58, 0.18, r);

  vec3 col = palette(amp);
  vec3 c = vec3(0.0);
  c += col * core * (0.18 + amp * 0.55);
  c += col * glow * 0.18;
  c += col * rings;
  c += col * bar * (0.45 + amp * 1.6);
  c += mix(col, vec3(1.0), 0.55) * sweep * (0.35 + amp * 0.5);
  c += col * exp(-r * 6.0) * (0.08 + amp * 0.2);

  float alpha = clamp(core * 0.7 + glow * 0.22 + rings * 0.8 + bar + sweep * 0.6, 0.0, 1.0);
  gl_FragColor = vec4(c, alpha);
}
`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(s));
  }
  return s;
}

/** Fake talk: phrases, gaps, plosives — not a continuous sine. */
export function speechEnvelope(t) {
  const phrase = Math.sin(t * 0.85) > -0.15;
  if (!phrase) return 0.03 + 0.02 * Math.sin(t * 2.1);
  const formant =
    Math.abs(Math.sin(t * 17.0)) *
    Math.abs(Math.sin(t * 11.3 + Math.sin(t * 3.0)));
  const plosive = Math.pow(Math.max(0, Math.sin(t * 5.4)), 10);
  return Math.min(1, 0.22 + 0.7 * formant + 0.4 * plosive);
}

export function VoiceCore({
  speaking = false,
  listening = false,
  className = "h-72 w-72",
}) {
  const canvasRef = useRef(null);
  const ampRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uResolution");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uAmp = gl.getUniformLocation(prog, "uAmp");
    const uMode = gl.getUniformLocation(prog, "uMode");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    let raf = 0;
    const start = performance.now();

    const draw = (now) => {
      const t = (now - start) / 1000;
      const target = speaking ? speechEnvelope(t) : listening ? 0.12 + 0.06 * Math.sin(t * 2.2) : 0.04;
      ampRef.current += (target - ampRef.current) * 0.2;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uAmp, ampRef.current);
      gl.uniform1f(uMode, speaking ? 2 : listening ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      gl.deleteProgram(prog);
    };
  }, [speaking, listening]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", background: "transparent" }}
    />
  );
}