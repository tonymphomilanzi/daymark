import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m*=m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

const ENERGY_VERT = `
${NOISE}
uniform float uTime;
uniform float uAmp;
attribute vec3 aBary;
varying vec3 vBary;
varying vec3 vN;
varying vec3 vV;
varying float vNrg;
void main() {
  vBary = aBary;
  float t = uTime;
  float n = snoise(position * 1.35 + vec3(t * 0.28, t * 0.21, t * 0.17));
  float n2 = snoise(position * 3.4 - vec3(t * 0.41, t * 0.33, t * 0.29));
  float disp = n * 0.07 + n2 * 0.025 + uAmp * (0.10 + n * 0.16);
  vec3 p = position + normal * disp;
  vNrg = disp;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vec4 view = viewMatrix * world;
  vN = normalize(mat3(modelMatrix) * normal);
  vV = cameraPosition - world.xyz;
  gl_Position = projectionMatrix * view;
}
`;

const ENERGY_FRAG = `
uniform float uAmp;
uniform vec3 uCyan;
uniform vec3 uPeak;
varying vec3 vBary;
varying vec3 vN;
varying vec3 vV;
varying float vNrg;
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(vV);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 2.6);
  float edge = min(min(vBary.x, vBary.y), vBary.z);
  float wire = 1.0 - smoothstep(0.0, fwidth(edge) * 1.35, edge);
  vec3 col = mix(uCyan, vec3(0.85, 0.98, 1.0), fres);
  col = mix(col, uPeak, smoothstep(0.55, 1.0, uAmp) * (0.35 + fres * 0.65));
  float body = 0.045 + fres * 0.42 + abs(vNrg) * 1.8 + uAmp * 0.22;
  vec3 rgb = col * (body + wire * (0.85 + uAmp * 1.1));
  float alpha = clamp(body * 0.9 + wire + fres * 0.35, 0.0, 1.0);
  gl_FragColor = vec4(rgb, alpha);
}
`;

const CORE_VERT = `
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = cameraPosition - world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const CORE_FRAG = `
uniform float uAmp;
uniform vec3 uCyan;
varying vec3 vN;
varying vec3 vV;
void main() {
  float fres = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 1.8);
  float glow = 0.35 + uAmp * 0.55;
  vec3 col = mix(uCyan * glow, vec3(1.0), fres * 0.7 + uAmp * 0.25);
  gl_FragColor = vec4(col, 0.55 + uAmp * 0.35);
}
`;

const RING_VERT = `
uniform float uTime;
uniform float uAmp;
varying float vA;
void main() {
  vA = uv.x;
  vec3 p = position;
  p *= 1.0 + uAmp * 0.04;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const RING_FRAG = `
uniform float uTime;
uniform float uAmp;
uniform vec3 uCyan;
varying float vA;
void main() {
  float dash = smoothstep(0.22, 0.5, abs(fract(vA * 28.0 - uTime * 0.12) - 0.5));
  float sweep = pow(max(0.0, sin(vA * 6.28318 - uTime * 1.4)), 18.0);
  vec3 col = mix(uCyan, vec3(1.0), sweep);
  float a = (0.18 + uAmp * 0.45) * dash + sweep * 0.8;
  gl_FragColor = vec4(col, a);
}
`;

const SPARK_VERT = `
uniform float uTime;
uniform float uAmp;
attribute float aSeed;
varying float vA;
void main() {
  float t = uTime * (0.12 + aSeed * 0.18);
  vec3 p = position;
  p += normalize(position) * sin(t + aSeed * 40.0) * (0.04 + uAmp * 0.08);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.6 + aSeed * 2.8 + uAmp * 2.0) * (180.0 / -mv.z);
  vA = 0.25 + aSeed * 0.55;
}
`;

const SPARK_FRAG = `
uniform vec3 uCyan;
varying float vA;
void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float d = dot(uv, uv);
  if (d > 1.0) discard;
  float g = exp(-d * 3.2);
  gl_FragColor = vec4(uCyan, g * vA);
}
`;

function speechEnvelope(t) {
  const phrase = Math.sin(t * 0.72) > -0.18;
  if (!phrase) return 0.04 + 0.03 * Math.sin(t * 1.8);
  const formant = Math.abs(Math.sin(t * 16.2)) * Math.abs(Math.sin(t * 10.4 + Math.sin(t * 2.7)));
  const plosive = Math.pow(Math.max(0, Math.sin(t * 5.1)), 10);
  return Math.min(1, 0.2 + 0.72 * formant + 0.42 * plosive);
}

function barycentric(geometry) {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  const count = geo.attributes.position.count;
  const bary = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 3) {
    bary.set([1, 0, 0], i * 3);
    bary.set([0, 1, 0], (i + 1) * 3);
    bary.set([0, 0, 1], (i + 2) * 3);
  }
  geo.setAttribute("aBary", new THREE.BufferAttribute(bary, 3));
  return geo;
}

function makeMat(vert, frag, extra = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: 0 },
      uCyan: { value: new THREE.Color("#3ce7ff") },
      uPeak: { value: new THREE.Color("#ffb43c") },
    },
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    ...extra,
  });
  return mat;
}

export function StarkBackdrop({
  speaking = false,
  listening = false,
  simulateSpeech = true,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const flags = useRef({ speaking, listening, simulateSpeech });
  const reduced = useReducedMotion();
  flags.current = { speaking, listening, simulateSpeech };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    camera.position.set(0, 0.12, 4.15);

    const root = new THREE.Group();
    scene.add(root);

    const cyan = new THREE.Color("#3ce7ff");

    const energyGeo = barycentric(new THREE.IcosahedronGeometry(1, 4));
    const energyMat = makeMat(ENERGY_VERT, ENERGY_FRAG, { side: THREE.DoubleSide });
    const energy = new THREE.Mesh(energyGeo, energyMat);
    root.add(energy);

    const cageGeo = new THREE.IcosahedronGeometry(1.18, 1);
    const cage = new THREE.LineSegments(
      new THREE.WireframeGeometry(cageGeo),
      new THREE.LineBasicMaterial({
        color: 0x7af0ff,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    root.add(cage);

    const coreMat = makeMat(CORE_VERT, CORE_FRAG);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.38, 48, 48), coreMat);
    root.add(core);

    const shellMat = makeMat(CORE_VERT, CORE_FRAG);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1.55, 48, 48), shellMat);
    shell.material = shellMat.clone();
    shell.material.uniforms = {
      uTime: { value: 0 },
      uAmp: { value: 0 },
      uCyan: { value: cyan.clone() },
      uPeak: { value: new THREE.Color("#ffb43c") },
    };
    root.add(shell);

    const rings = [];
    const ringMat = makeMat(RING_VERT, RING_FRAG, { side: THREE.DoubleSide });
    const ringDefs = [
      [1.42, [1.15, 0.2, 0.35]],
      [1.58, [0.35, 1.2, -0.4]],
      [1.74, [-0.2, 0.4, 1.1]],
    ];
    ringDefs.forEach(([r, rot], i) => {
      const mat = ringMat.clone();
      mat.uniforms = {
        uTime: { value: 0 },
        uAmp: { value: 0 },
        uCyan: { value: cyan.clone() },
        uPeak: { value: new THREE.Color("#ffb43c") },
      };
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, 0.007, 12, 180), mat);
      mesh.rotation.set(rot[0], rot[1], rot[2]);
      mesh.userData.speed = 0.12 + i * 0.07;
      root.add(mesh);
      rings.push(mesh);
    });

    const count = 900;
    const sparkGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(1.7 + Math.random() * 1.8);
      pos.set([v.x, v.y, v.z], i * 3);
      seed[i] = Math.random();
    }
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    sparkGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const sparkMat = makeMat(SPARK_VERT, SPARK_FRAG);
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    root.add(sparks);

    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.55, 0.18);
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(bloom);

    const mouse = { x: 0, y: 0 };
    const onMove = (e) => {
      const r = wrap.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const setSize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w < 2 || h < 2) return;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      bloom.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(setSize);
    ro.observe(wrap);
    setSize();

    const uniforms = [energyMat, coreMat, shell.material, sparkMat, ...rings.map((r) => r.material)];
    let raf = 0;
    let amp = 0;
    const t0 = performance.now();

    const tick = (now) => {
      const t = (now - t0) / 1000;
      const { speaking, listening, simulateSpeech } = flags.current;
      const live = speaking || simulateSpeech;
      const target = live
        ? speechEnvelope(t)
        : listening
          ? 0.12 + 0.05 * Math.sin(t * 2.1)
          : 0.05 + 0.02 * Math.sin(t * 1.4);
      amp += (target - amp) * 0.18;

      uniforms.forEach((m) => {
        if (!m.uniforms) return;
        m.uniforms.uTime.value = t;
        m.uniforms.uAmp.value = amp;
      });

      if (!reduced) {
        root.rotation.y = t * 0.08 + mouse.x * 0.18;
        root.rotation.x = 0.12 + mouse.y * 0.1;
        cage.rotation.y = -t * 0.11;
        core.scale.setScalar(1 + amp * 0.12 + Math.sin(t * 2.2) * 0.02);
        rings.forEach((ring) => {
          ring.rotation.z += ring.userData.speed * 0.01;
          ring.rotation.x += ring.userData.speed * 0.004;
        });
        sparks.rotation.y = t * 0.05;
        camera.position.x += (mouse.x * 0.35 - camera.position.x) * 0.04;
        camera.position.y += (0.12 + mouse.y * 0.2 - camera.position.y) * 0.04;
        camera.lookAt(0, 0, 0);
      }

      composer.render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      energyGeo.dispose();
      cageGeo.dispose();
      sparkGeo.dispose();
      uniforms.forEach((m) => m.dispose?.());
      composer.dispose();
      renderer.dispose();
    };
  }, [reduced]);

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[100vh] overflow-hidden"
      aria-hidden
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_0%,rgba(3,8,12,0.18)_48%,rgba(3,8,12,0.78)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#03080c]" />
    </div>
  );
}