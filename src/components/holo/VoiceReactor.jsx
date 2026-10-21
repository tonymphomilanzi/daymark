import { useEffect, useRef, useState } from "react";
import { reactorTheme } from "./reactorTheme";

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform float uAmp;
uniform float uLow;
uniform float uMid;
uniform float uHigh;
uniform float uTalk;
uniform vec3  uCyan;
uniform vec3  uIce;
uniform vec3  uHot;
uniform vec3  uCore;

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

vec2 sphereHit(vec3 ro, vec3 rd, float rad) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - rad * rad;
  float h = b * b - c;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}

float field(vec3 p, float t) {
  vec3 n = normalize(p);
  float lon = atan(n.x, n.z);
  float lat = n.y;
  float w = 0.42 + uAmp * 0.7 + uTalk * 0.25;

  vec3 q = n;
  q += w * 0.22 * vec3(
    sin(n.y * 2.4 + t),
    sin(n.z * 2.1 - t * 0.85),
    sin(n.x * 2.6 + t * 0.7)
  );

  float f = 0.0;
  f += 0.90 * sin(q.x * 2.5 + q.z * 0.9 + t * 0.65);
  f += 0.70 * sin(q.y * 3.2 - t * 0.55);
  f += 0.55 * sin(dot(q, vec3(0.82, 0.28, 1.05)) * 3.3 + t * 0.42);
  f += 0.40 * sin(dot(q, vec3(-0.72, 1.0, 0.18)) * 4.0 - t * 0.38);
  f += 0.35 * sin(lon * 2.0 + lat * 2.6 + t * 0.5);
  f += uAmp * 0.55 * sin(lat * 5.0 + lon * 3.0 + t * 2.4);
  f += uMid * 0.35 * sin(lon * 4.0 - t * 1.8);
  return f;
}

vec4 shadeSurface(vec3 p, vec3 n, vec3 rd, float face, float t) {
  float f = field(p, t);

  float envelope = pow(smoothstep(0.08, 1.25, abs(f)), 0.82);
  float ridges = sin(f * 16.5);
  ridges *= ridges;
  float hatch = mix(1.0, 0.45 + 0.55 * (0.5 + 0.5 * sin(f * 42.0)), 0.72);

  float glow = envelope * (0.22 + 0.78 * ridges) * hatch;
  glow *= 1.0 + uAmp * 1.35 + uTalk * 0.35;

  vec3 l = normalize(vec3(0.45, 0.55, 0.7));
  float ndl = 0.55 + 0.45 * max(dot(n, l), 0.0);
  float ndv = max(dot(n, -rd), 0.0);
  float fres = pow(1.0 - ndv, 2.65);
  float spec = pow(max(dot(reflect(-l, n), -rd), 0.0), 48.0) * envelope;

  vec3 pal = mix(uCyan, uIce, ridges * envelope * 0.55);
  pal = mix(pal, uHot, uTalk * smoothstep(0.35, 1.0, uAmp) * envelope);

  vec3 col = pal * glow * ndl * 1.55;
  col += pal * fres * (0.40 + uAmp * 0.35) * face;
  col += uIce * spec * 0.85 * face;

  float alpha = (glow * 0.9 + fres * 0.45) * face;
  return vec4(col, clamp(alpha, 0.0, 1.0));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  float t = uTime * (0.32 + uAmp * 1.6 + uTalk * 0.5);

  vec3 ro = vec3(0.0, 0.02, 2.72);
  vec3 rd = normalize(vec3(uv * 1.12, -1.0));

  float yaw = uTime * 0.12;
  float pit = 0.16 + 0.06 * sin(uTime * 0.21);
  rd.xz *= rot(yaw); ro.xz *= rot(yaw);
  rd.yz *= rot(pit); ro.yz *= rot(pit);

  float rad = 1.0 + uAmp * 0.025 + uLow * 0.02;
  vec2 hit = sphereHit(ro, rd, rad);

  vec3 col = vec3(0.0);
  float alpha = 0.0;
  float r = length(uv);

  float halo = exp(-pow(max(r - 0.42, 0.0) * 18.0, 2.0)) * (0.08 + uAmp * 0.18);
  col += uCyan * halo;
  alpha += halo;

  if (hit.y > 0.0) {
    vec3 pFar  = ro + rd * hit.y;
    vec3 pNear = ro + rd * max(hit.x, 0.0);
    vec3 nFar  = normalize(pFar);
    vec3 nNear = normalize(pNear);

    vec4 back  = shadeSurface(pFar,  nFar,  rd, 0.28, t);
    vec4 front = shadeSurface(pNear, nNear, rd, 1.00, t);

    vec3 rgb = uCore;
    rgb = rgb * (1.0 - back.a) + back.rgb;
    rgb = rgb + front.rgb;

    float a = max(0.88, max(back.a, front.a));

    float ndv = max(dot(nNear, -rd), 0.0);
    float rim = pow(1.0 - ndv, 3.2);
    rgb += uCyan * rim * 0.55;
    a = max(a, rim * 0.5);

    col += rgb;
    alpha = max(alpha, a);
  }

  gl_FragColor = vec4(pow(max(col, 0.0), vec3(0.92)), clamp(alpha, 0.0, 1.0));
}
`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

function hexToRgb(hex) {
  const n = String(hex || "").replace("#", "").trim();
  const full = n.length === 3 ? n.split("").map((c) => c + c).join("") : n;
  const v = parseInt(full, 16);
  if (!Number.isFinite(v) || full.length !== 6) return [0, 0, 0];
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

function hzEnergy(freq, sampleRate, fftSize, hz0, hz1) {
  const bin = sampleRate / fftSize;
  const from = Math.max(0, Math.floor(hz0 / bin));
  const to = Math.min(freq.length - 1, Math.ceil(hz1 / bin));
  let sum = 0;
  let n = 0;
  for (let i = from; i <= to; i++) {
    sum += freq[i];
    n++;
  }
  return n ? sum / n / 255 : 0;
}

function teardown(audio) {
  if (!audio) return;
  try {
    audio.stream?.getTracks().forEach((t) => t.stop());
  } catch {}
  try {
    audio.ctx?.close();
  } catch {}
}

export function VoiceReactor({
  size = 168,
  label = "J.A.R.V.I.S.",
  colors = reactorTheme,
}) {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const colorsRef = useRef(colors);
  colorsRef.current = colors;
  const levelRef = useRef({ amp: 0, low: 0, mid: 0, high: 0, talk: 0, meter: 0 });
  const [status, setStatus] = useState("OFF");
  const [meter, setMeter] = useState(0);

  const arm = async () => {
    teardown(audioRef.current);
    audioRef.current = null;
    setStatus("ARMING");

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx || !navigator.mediaDevices?.getUserMedia) {
      setStatus("NO AUDIO API");
      return;
    }

    try {
      const ctx = new Ctx();
      await ctx.resume();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });

      const source = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      gain.gain.value = 4.5;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -20;
      analyser.smoothingTimeConstant = 0.2;

      const mute = ctx.createGain();
      mute.gain.value = 0;

      source.connect(gain);
      gain.connect(analyser);
      analyser.connect(mute);
      mute.connect(ctx.destination);

      audioRef.current = {
        ctx,
        stream,
        analyser,
        floatTime: new Float32Array(analyser.fftSize),
        byteTime: new Uint8Array(analyser.fftSize),
        freq: new Uint8Array(analyser.frequencyBinCount),
      };
      setStatus("LISTENING");
    } catch (err) {
      audioRef.current = null;
      setStatus(err?.name === "NotAllowedError" ? "MIC BLOCKED" : "MIC OFF");
    }
  };

  useEffect(() => () => teardown(audioRef.current), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: true });
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

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uAmp = gl.getUniformLocation(prog, "uAmp");
    const uLow = gl.getUniformLocation(prog, "uLow");
    const uMid = gl.getUniformLocation(prog, "uMid");
    const uHigh = gl.getUniformLocation(prog, "uHigh");
    const uTalk = gl.getUniformLocation(prog, "uTalk");
    const uCyan = gl.getUniformLocation(prog, "uCyan");
    const uIce = gl.getUniformLocation(prog, "uIce");
    const uHot = gl.getUniformLocation(prog, "uHot");
    const uCore = gl.getUniformLocation(prog, "uCore");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let raf = 0;
    let lastUi = 0;
    const t0 = performance.now();
    const lvl = levelRef.current;

    const draw = (now) => {
      const t = (now - t0) / 1000;
      const a = audioRef.current;
      const theme = colorsRef.current || reactorTheme;
      const [cr, cg, cb] = hexToRgb(theme.cyan);
      const [ir, ig, ib] = hexToRgb(theme.ice);
      const [hr, hg, hb] = hexToRgb(theme.hot);
      const [or_, og, ob] = hexToRgb(theme.core);

      if (a?.ctx?.state === "suspended") a.ctx.resume().catch(() => {});

      if (a?.analyser && a.ctx?.state === "running") {
        let peak = 0;
        if (a.analyser.getFloatTimeDomainData) {
          a.analyser.getFloatTimeDomainData(a.floatTime);
          for (let i = 0; i < a.floatTime.length; i++) {
            const v = Math.abs(a.floatTime[i]);
            if (v > peak) peak = v;
          }
        } else {
          a.analyser.getByteTimeDomainData(a.byteTime);
          for (let i = 0; i < a.byteTime.length; i++) {
            const v = Math.abs((a.byteTime[i] - 128) / 128);
            if (v > peak) peak = v;
          }
        }
        a.analyser.getByteFrequencyData(a.freq);
        const sr = a.ctx.sampleRate;
        const fft = a.analyser.fftSize;
        const low = hzEnergy(a.freq, sr, fft, 80, 250);
        const mid = hzEnergy(a.freq, sr, fft, 250, 2000);
        const high = hzEnergy(a.freq, sr, fft, 2000, 5000);
        const speech = hzEnergy(a.freq, sr, fft, 100, 3600);

        const raw = Math.min(1, peak * 10 + speech * 1.1);
        const talking = peak > 0.018 || speech > 0.08;

        lvl.amp += (raw - lvl.amp) * (raw > lvl.amp ? 0.65 : 0.14);
        lvl.low += (low - lvl.low) * 0.3;
        lvl.mid += (mid - lvl.mid) * 0.3;
        lvl.high += (high - lvl.high) * 0.35;
        lvl.talk += ((talking ? 1 : 0) - lvl.talk) * (talking ? 0.45 : 0.12);
        lvl.meter = raw;

        if (now - lastUi > 80) {
          lastUi = now;
          setMeter(raw);
          setStatus(talking ? "SPEAKING" : "LISTENING");
        }
      } else {
        const idle = 0.05 + 0.03 * (0.5 + 0.5 * Math.sin(t * 1.3));
        lvl.amp += (idle - lvl.amp) * 0.05;
        lvl.talk += (0 - lvl.talk) * 0.05;
        lvl.meter += (0 - lvl.meter) * 0.05;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== ((w * dpr) | 0) || canvas.height !== ((h * dpr) | 0)) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uAmp, lvl.amp);
      gl.uniform1f(uLow, lvl.low);
      gl.uniform1f(uMid, lvl.mid);
      gl.uniform1f(uHigh, lvl.high);
      gl.uniform1f(uTalk, lvl.talk);
      gl.uniform3f(uCyan, cr, cg, cb);
      gl.uniform3f(uIce, ir, ig, ib);
      gl.uniform3f(uHot, hr, hg, hb);
      gl.uniform3f(uCore, or_, og, ob);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      gl.deleteProgram(prog);
    };
  }, []);

  return (
    <div className="flex shrink-0 items-center gap-3">
      <button
        type="button"
        onClick={arm}
        className="relative block bg-transparent p-0"
        style={{ width: size, height: size }}
        aria-label="Enable microphone"
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
      </button>
      <div className="hidden sm:block">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">{label}</p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-400/80">
          {status}
        </p>
        <div className="mt-2 h-[3px] w-16 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-cyan-300" style={{ width: `${Math.round(meter * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}