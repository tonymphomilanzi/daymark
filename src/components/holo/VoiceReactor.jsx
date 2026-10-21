import { useEffect, useRef, useState } from "react";

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

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash(i);
  float n100 = hash(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = p * 2.07 + vec3(0.17, 0.31, 0.11);
    a *= 0.5;
  }
  return v;
}
mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  float t = uTime;
  float amp = uAmp;
  float talk = uTalk;

  vec3 ro = vec3(0.0, 0.0, 2.55);
  vec3 rd = normalize(vec3(uv * 1.35, -1.35));
  float yaw = t * 0.18;
  float pit = 0.18 + 0.08 * sin(t * 0.23);
  rd.xz *= rot(yaw); ro.xz *= rot(yaw);
  rd.yz *= rot(pit); ro.yz *= rot(pit);

  float rad = 0.72 + amp * 0.28 + uLow * 0.12;
  float b = dot(ro, rd);
  float c = dot(ro, ro) - rad * rad;
  float h = b * b - c;

  vec3 idle = vec3(0.25, 0.72, 0.92);
  vec3 hot  = vec3(1.0, 0.72, 0.28);
  vec3 pal  = mix(idle, vec3(0.7, 0.96, 1.0), talk);
  pal = mix(pal, hot, smoothstep(0.25, 1.0, amp));

  vec3 col = vec3(0.0);
  float alpha = 0.0;
  float r2 = dot(uv, uv);

  float corona = exp(-r2 * 6.5) * (0.14 + amp * 0.9);
  col += pal * corona;
  alpha += corona * 0.55;

  if (h > 0.0) {
    float t0 = max(0.0, -b - sqrt(h));
    float t1 = -b + sqrt(h);
    float dt = (t1 - t0) / 22.0;
    float dens = 0.0;
    vec3 acc = vec3(0.0);

    for (int i = 0; i < 22; i++) {
      vec3 p = ro + rd * (t0 + (float(i) + 0.5) * dt);
      float n = fbm(p * (1.5 + amp * 1.2) + vec3(t * 0.35, t * 0.22, t * 0.18));
      n = fbm(p * 2.2 + vec3(n * 1.6, t * 0.3, -t * 0.2));
      float d = length(p);
      float shell = smoothstep(rad, rad - 0.48, d) * smoothstep(0.08, 0.32, d);
      float field = smoothstep(0.22, 0.8, n + amp * 0.65 + uMid * 0.4);
      float fil = smoothstep(0.55, 0.95, fbm(p * (4.0 + amp * 5.0) + t * 0.8));
      float sample = shell * (0.2 + field + fil * (0.3 + amp)) * (1.0 + amp * 2.2) * dt * 3.1;
      vec3 tone = mix(pal, vec3(1.0), field * 0.45);
      tone = mix(tone, hot, fil * amp);
      acc += tone * sample * (1.0 - dens);
      dens += sample * (1.0 - dens);
    }

    vec3 nrm = normalize(ro + rd * t0);
    float fres = pow(1.0 - max(dot(-rd, nrm), 0.0), 2.2);
    col += acc * 1.25 + mix(pal, vec3(1.0), 0.5) * fres * (0.5 + amp * 1.4);
    alpha += clamp(dens + fres * 0.6, 0.0, 1.0);
  }

  float ring = abs(length(uv) - (0.40 + amp * 0.06));
  float ringA = 0.002 / (ring + 0.0008);
  col += pal * ringA * (0.25 + amp);
  alpha += ringA * 0.3;

  float core = exp(-r2 * 70.0) * (0.3 + amp * 2.2);
  col += mix(pal, vec3(1.0), 0.7) * core;
  alpha += core * 0.55;

  gl_FragColor = vec4(pow(max(col, 0.0), vec3(0.9)), clamp(alpha, 0.0, 1.0));
}
`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
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

export function VoiceReactor({ size = 132, label = "J.A.R.V.I.S." }) {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const levelRef = useRef({ amp: 0, low: 0, mid: 0, high: 0, talk: 0, meter: 0 });
  const [status, setStatus] = useState("TAP TO LISTEN");
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

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let raf = 0;
    let lastUi = 0;
    const t0 = performance.now();
    const lvl = levelRef.current;

    const draw = (now) => {
      const t = (now - t0) / 1000;
      const a = audioRef.current;

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
    <div className="flex shrink-0 items-center gap-2">
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
          <div
            className="h-full bg-cyan-300"
            style={{ width: `${Math.round(meter * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}