import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  RotateCcw,
} from "lucide-react";

type CameraPresetKey = "speaker" | "frontRow" | "auditorium" | "podium";
type LightingMood = "warm" | "daylight" | "gala";

const CAMERA_PRESETS: Record<
  CameraPresetKey,
  { label: string; pos: [number, number, number]; target: [number, number, number] }
> = {
  frontRow: { label: "Front Row", pos: [0, 2.35, 5.2], target: [0, 1.15, 0] },
  speaker: { label: "Speaker POV", pos: [0, 1.82, -0.68], target: [0, 1.25, 5.5] },
  podium: { label: "Lectern Detail", pos: [1.85, 1.65, 1.95], target: [0, 1.05, 0] },
  auditorium: { label: "Auditorium Wide", pos: [5.4, 3.8, 7.6], target: [0, 1.0, 0.4] },
};

const TELEPROMPTER_PROMPTS = [
  {
    title: "Keynote Opening",
    lines: [
      "Good morning everyone.",
      "Pause 2 seconds · Eye contact left-center-right.",
      "Open with one clear question for the room.",
    ],
  },
  {
    title: "Project Defense",
    lines: [
      "State the core problem in 1 sentence.",
      "Walk through architecture & trade-offs.",
      "Close with measurable impact.",
    ],
  },
  {
    title: "Executive Briefing",
    lines: [
      "Lead with the recommendation first.",
      "Share 2 supporting data points.",
      "End with clear next steps & owners.",
    ],
  },
] as const;

// Pre-allocated scratch math helpers (zero GC inside animation loop)
const _dummy = new THREE.Object3D();
const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _color = new THREE.Color();

function createWoodTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#8a6242";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 64; i++) {
    const y = i * 8;
    ctx.fillStyle = i % 2 === 0 ? "rgba(60, 38, 20, 0.14)" : "rgba(210, 175, 130, 0.08)";
    ctx.fillRect(0, y, 512, 6);
    ctx.fillStyle = "rgba(45, 25, 10, 0.25)";
    ctx.fillRect(0, y + 7, 512, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 4);
  tex.anisotropy = maxAniso;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 122);
  grad.addColorStop(0, "rgba(15, 23, 42, 0.55)");
  grad.addColorStop(0.55, "rgba(15, 23, 42, 0.2)");
  grad.addColorStop(1, "rgba(15, 23, 42, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

function drawTeleprompterCanvas(
  canvas: HTMLCanvasElement,
  promptIndex: number,
  micEnergy: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const prompt = TELEPROMPTER_PROMPTS[promptIndex] ?? TELEPROMPTER_PROMPTS[0];
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

  ctx.fillStyle = "#60a5fa";
  ctx.font = "600 22px sans-serif";
  ctx.fillText(`SPEAKMATE STAGE · ${prompt.title.toUpperCase()}`, 26, 46);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "500 24px sans-serif";
  prompt.lines.forEach((line, idx) => {
    ctx.fillText(line, 26, 98 + idx * 42);
  });

  // Voice level meter bar on teleprompter
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(26, canvas.height - 38, canvas.width - 52, 14);
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(26, canvas.height - 38, (canvas.width - 52) * Math.min(1, micEnergy), 14);
}

export function StageStudio3DPage() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetKey>("frontRow");
  const [lightingMood, setLightingMood] = useState<LightingMood>("warm");
  const [promptIndex, setPromptIndex] = useState(0);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  const presetTargetRef = useRef<CameraPresetKey | null>("frontRow");
  const lightingMoodRef = useRef<LightingMood>("warm");
  const promptIndexRef = useRef(0);
  const micEnergyRef = useRef(0.18);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const freqDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    lightingMoodRef.current = lightingMood;
  }, [lightingMood]);

  useEffect(() => {
    promptIndexRef.current = promptIndex;
  }, [promptIndex]);

  function stopMicMonitor() {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (micCtxRef.current) {
      void micCtxRef.current.close();
      micCtxRef.current = null;
    }
    analyserRef.current = null;
    freqDataRef.current = null;
    micEnergyRef.current = 0.18;
    setMicActive(false);
  }

  async function toggleMicMonitor() {
    if (micActive) {
      stopMicMonitor();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      micStreamRef.current = stream;
      micCtxRef.current = ctx;
      analyserRef.current = analyser;
      freqDataRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      setMicActive(true);
    } catch {
      setMicActive(false);
    }
  }

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Software WebGL guard
    const isSoftwareGl = (() => {
      const probe = document.createElement("canvas").getContext("webgl2");
      if (!probe) return true;
      const ext = probe.getExtension("WEBGL_debug_renderer_info");
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension("WEBGL_lose_context")?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: "high-performance",
      });
    } catch {
      setWebglError("WebGL is unavailable in this browser environment.");
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError("3D WebGL context was interrupted. Click Reset View or reload.");
    };
    renderer.domElement.addEventListener("webglcontextlost", handleContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.042);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      46,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      80
    );
    camera.position.set(...CAMERA_PRESETS.frontRow.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.frontRow.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 1.1;
    controls.maxDistance = 15;
    controls.addEventListener("start", () => {
      presetTargetRef.current = null;
    });

    // Studio 3-point lighting rig (warm key vs cool hemisphere fill + rim)
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.2);
    keyLight.position.set(4.5, 8.2, 5.0);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -7;
    keyLight.shadow.camera.right = 7;
    keyLight.shadow.camera.top = 7;
    keyLight.shadow.camera.bottom = -7;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 22;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    rimLight.position.set(-5.0, 5.5, -4.5);
    scene.add(rimLight);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const woodTex = createWoodTexture(maxAniso);
    const contactTex = createContactShadowTexture();

    // Shared materials with varied roughness/metalness
    const oakStageMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.62,
      metalness: 0.04,
    });
    const darkWalnutMat = new THREE.MeshStandardMaterial({
      color: 0x3b281c,
      roughness: 0.48,
      metalness: 0.08,
    });
    const brushedAluminumMat = new THREE.MeshStandardMaterial({
      color: 0xd8e2ef,
      roughness: 0.22,
      metalness: 0.9,
    });
    const matteCarbonMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.78,
      metalness: 0.12,
    });
    const acrylicBlueMat = new THREE.MeshPhysicalMaterial({
      color: 0x1d4ed8,
      roughness: 0.14,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const voiceRingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.3,
    });

    // 1. Auditorium Floor & Elevated Stage Platform (bottom-grounded)
    const hallFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.88, metalness: 0.05 })
    );
    hallFloor.rotation.x = -Math.PI / 2;
    hallFloor.position.y = -0.36;
    hallFloor.receiveShadow = true;
    scene.add(hallFloor);

    const stageGroup = new THREE.Group();
    const stageDeck = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.36, 5.2), oakStageMat);
    stageDeck.position.set(0, -0.18, -0.3);
    stageDeck.receiveShadow = true;
    stageGroup.add(stageDeck);

    const stageTrim = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.06, 5.3), brushedAluminumMat);
    stageTrim.position.set(0, -0.02, -0.3);
    stageGroup.add(stageTrim);

    const frontStep = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.18, 0.45), oakStageMat);
    frontStep.position.set(0, -0.27, 2.52);
    frontStep.receiveShadow = true;
    stageGroup.add(frontStep);
    scene.add(stageGroup);

    // 2. Hero Composite 10-Part Procedural Keynote Lectern (pivoted at y=0)
    const lecternGroup = new THREE.Group();
    lecternGroup.position.set(0, 0, 0);

    // Contact shadow plane directly under lectern
    const contactPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 1.4),
      new THREE.MeshBasicMaterial({
        map: contactTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
      })
    );
    contactPlane.rotation.x = -Math.PI / 2;
    contactPlane.position.y = 0.02;
    lecternGroup.add(contactPlane);

    // Part 1: Beveled base plinth
    const plinthShape = new THREE.Shape();
    plinthShape.moveTo(-0.46, -0.32);
    plinthShape.lineTo(0.46, -0.32);
    plinthShape.lineTo(0.46, 0.32);
    plinthShape.lineTo(-0.46, 0.32);
    plinthShape.closePath();
    const plinthGeo = new THREE.ExtrudeGeometry(plinthShape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2,
    });
    plinthGeo.rotateX(-Math.PI / 2);
    const plinthMesh = new THREE.Mesh(plinthGeo, matteCarbonMat);
    plinthMesh.position.y = 0.015;
    plinthMesh.castShadow = true;
    plinthMesh.receiveShadow = true;
    lecternGroup.add(plinthMesh);

    // Part 2: Tapered walnut core pedestal
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.02, 0.34), darkWalnutMat);
    pedestal.position.set(0, 0.57, -0.02);
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    lecternGroup.add(pedestal);

    // Part 3: Glossy cobalt front baffle panel
    const frontBaffle = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.88, 0.04), acrylicBlueMat);
    frontBaffle.position.set(0, 0.58, 0.17);
    frontBaffle.castShadow = true;
    lecternGroup.add(frontBaffle);

    // Part 4 & 5: Brushed aluminum vertical side rails
    const railGeo = new THREE.CylinderGeometry(0.022, 0.022, 1.04, 16);
    [-0.31, 0.31].forEach((xPos) => {
      const rail = new THREE.Mesh(railGeo, brushedAluminumMat);
      rail.position.set(xPos, 0.58, 0.06);
      rail.castShadow = true;
      lecternGroup.add(rail);
    });

    // Part 6: Angled reading surface deck
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.045, 0.54), darkWalnutMat);
    deskTop.position.set(0, 1.12, 0.02);
    deskTop.rotation.x = 0.2;
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    lecternGroup.add(deskTop);

    // Part 7: Paper-stop metallic lip
    const lipMesh = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.032, 0.022), brushedAluminumMat);
    lipMesh.position.set(0, 1.08, 0.27);
    lipMesh.rotation.x = 0.2;
    lecternGroup.add(lipMesh);

    // Part 8: Embedded live CanvasTexture teleprompter display
    const teleCanvas = document.createElement("canvas");
    teleCanvas.width = 512;
    teleCanvas.height = 256;
    drawTeleprompterCanvas(teleCanvas, 0, 0.18);
    const teleTex = new THREE.CanvasTexture(teleCanvas);
    teleTex.colorSpace = THREE.SRGBColorSpace;
    teleTex.anisotropy = maxAniso;
    const teleScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.28),
      new THREE.MeshBasicMaterial({ map: teleTex })
    );
    teleScreen.position.set(0, 1.155, 0.01);
    teleScreen.rotation.x = -Math.PI / 2 + 0.2;
    lecternGroup.add(teleScreen);

    // Part 9: Dual Gooseneck Studio Microphones (TubeGeometry + LatheGeometry capsule)
    const capsuleProfile = [
      new THREE.Vector2(0.001, 0),
      new THREE.Vector2(0.014, 0.006),
      new THREE.Vector2(0.016, 0.038),
      new THREE.Vector2(0.01, 0.056),
      new THREE.Vector2(0.001, 0.06),
    ];
    const capsuleGeo = new THREE.LatheGeometry(capsuleProfile, 16);

    [-0.22, 0.22].forEach((xOffset) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(xOffset, 1.14, 0.16),
        new THREE.Vector3(xOffset * 0.9, 1.32, 0.18),
        new THREE.Vector3(xOffset * 0.55, 1.44, 0.06),
        new THREE.Vector3(xOffset * 0.42, 1.42, -0.04),
      ]);
      const neckGeo = new THREE.TubeGeometry(curve, 20, 0.007, 10, false);
      const neck = new THREE.Mesh(neckGeo, matteCarbonMat);
      neck.castShadow = true;
      lecternGroup.add(neck);

      const capsule = new THREE.Mesh(capsuleGeo, brushedAluminumMat);
      capsule.position.set(xOffset * 0.42, 1.42, -0.04);
      capsule.rotation.x = -Math.PI * 0.65;
      lecternGroup.add(capsule);
    });

    // Part 10: Audio-reactive podium energy ring
    const voiceRing = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 12, 32), voiceRingMat);
    voiceRing.position.set(0, 0.72, 0.195);
    lecternGroup.add(voiceRing);

    scene.add(lecternGroup);

    // 3. Acoustic Backdrop Wall + Overhead Lighting Truss (composite)
    const backdropGroup = new THREE.Group();
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(10.8, 4.6, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.05 })
    );
    backWall.position.set(0, 2.1, -2.75);
    backWall.receiveShadow = true;
    backdropGroup.add(backWall);

    // Instanced acoustic vertical wood slats along backdrop (36 slats)
    const slatGeo = new THREE.BoxGeometry(0.12, 4.1, 0.08);
    const slatMesh = new THREE.InstancedMesh(slatGeo, darkWalnutMat, 36);
    for (let i = 0; i < 36; i++) {
      const x = -5.1 + i * 0.292;
      _dummy.position.set(x, 2.1, -2.61);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      slatMesh.setMatrixAt(i, _dummy.matrix);
    }
    slatMesh.instanceMatrix.needsUpdate = true;
    slatMesh.computeBoundingSphere();
    backdropGroup.add(slatMesh);

    // Overhead aluminum lighting truss & 4 spotlight cans
    const trussBeam = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.16, 0.16), brushedAluminumMat);
    trussBeam.position.set(0, 4.35, 0.6);
    backdropGroup.add(trussBeam);

    const lampCanGeo = new THREE.CylinderGeometry(0.11, 0.15, 0.28, 16);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0xfff7ed });
    const lensGeo = new THREE.CircleGeometry(0.12, 16);
    [-3.2, -1.1, 1.1, 3.2].forEach((xPos) => {
      const can = new THREE.Mesh(lampCanGeo, matteCarbonMat);
      can.position.set(xPos, 4.12, 0.6);
      can.rotation.x = 0.35;
      backdropGroup.add(can);

      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.position.set(xPos, 3.99, 0.55);
      lens.rotation.x = Math.PI / 2 + 0.35;
      backdropGroup.add(lens);
    });
    scene.add(backdropGroup);

    // 4. Instanced Auditorium Audience Seating (48 chairs across 4 curved rows)
    const seatGeo = new THREE.BoxGeometry(0.56, 0.72, 0.52);
    const seatMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.72,
      metalness: 0.08,
    });
    const seatCount = 48;
    const seatsInstanced = new THREE.InstancedMesh(seatGeo, seatMat, seatCount);
    let idx = 0;
    for (let row = 0; row < 4; row++) {
      const zBase = 3.8 + row * 1.18;
      const yBase = 0.0 + row * 0.22;
      for (let col = 0; col < 12; col++) {
        const angle = (col - 5.5) * 0.11;
        const radius = 6.2 + row * 1.2;
        const x = Math.sin(angle) * radius;
        const z = zBase - (1 - Math.cos(angle)) * 2.1;
        _dummy.position.set(x, yBase, z);
        _dummy.rotation.set(0, -angle, 0);
        const s = 0.94 + ((idx * 17) % 10) * 0.012;
        _dummy.scale.set(s, s, s);
        _dummy.updateMatrix();
        seatsInstanced.setMatrixAt(idx, _dummy.matrix);

        _color.setHSL(0.6 + ((idx % 5) - 2) * 0.008, 0.55, 0.32 + (row * 0.03));
        seatsInstanced.setColorAt(idx, _color);
        idx++;
      }
    }
    seatsInstanced.instanceMatrix.needsUpdate = true;
    if (seatsInstanced.instanceColor) seatsInstanced.instanceColor.needsUpdate = true;
    seatsInstanced.computeBoundingSphere();
    scene.add(seatsInstanced);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Resize handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Animation loop with software WebGL afterDraw pacing
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let lastCanvasRedraw = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (sync && state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // Update live mic energy if active
      if (analyserRef.current && freqDataRef.current) {
        analyserRef.current.getByteFrequencyData(freqDataRef.current);
        let sum = 0;
        for (let i = 0; i < freqDataRef.current.length; i++) {
          sum += freqDataRef.current[i];
        }
        const avg = sum / (freqDataRef.current.length * 255);
        micEnergyRef.current = THREE.MathUtils.damp(
          micEnergyRef.current,
          Math.min(1, avg * 2.8 + 0.12),
          10,
          dt
        );
      } else {
        const gentle = 0.22 + Math.sin(now * 0.002) * 0.08;
        micEnergyRef.current = THREE.MathUtils.damp(micEnergyRef.current, gentle, 4, dt);
      }

      // Reactively scale podium energy ring glow
      const ringScale = 0.96 + micEnergyRef.current * 0.16;
      voiceRing.scale.set(ringScale, ringScale, 1);
      voiceRingMat.emissiveIntensity = 0.7 + micEnergyRef.current * 2.0;

      // Apply lighting mood smoothly
      const mood = lightingMoodRef.current;
      const targetBgHex = mood === "daylight" ? 0x1e3a5f : mood === "gala" ? 0x090d16 : 0x0f172a;
      _color.setHex(targetBgHex);
      (scene.background as THREE.Color).lerp(_color, 1 - Math.exp(-5 * dt));
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(scene.background as THREE.Color);
      }
      keyLight.intensity = THREE.MathUtils.damp(
        keyLight.intensity,
        mood === "daylight" ? 2.6 : mood === "gala" ? 1.5 : 2.15,
        5,
        dt
      );
      rimLight.intensity = THREE.MathUtils.damp(
        rimLight.intensity,
        mood === "gala" ? 1.85 : 1.05,
        5,
        dt
      );

      // Refresh teleprompter texture periodically (every 150ms)
      if (now - lastCanvasRedraw > 150) {
        drawTeleprompterCanvas(teleCanvas, promptIndexRef.current, micEnergyRef.current);
        teleTex.needsUpdate = true;
        lastCanvasRedraw = now;
      }

      // Smooth damped camera preset transitions
      const activePreset = presetTargetRef.current;
      if (activePreset) {
        const cfg = CAMERA_PRESETS[activePreset];
        _targetPos.set(...cfg.pos);
        _targetLook.set(...cfg.target);
        const alpha = 1 - Math.exp(-5.5 * dt);
        camera.position.lerp(_targetPos, alpha);
        controls.target.lerp(_targetLook, alpha);
        if (camera.position.distanceTo(_targetPos) < 0.02) {
          presetTargetRef.current = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
      controls.dispose();
      envTarget.dispose();
      woodTex.dispose();
      contactTex.dispose();
      teleTex.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
      stopMicMonitor();
    };
  }, []);

  function selectCamera(preset: CameraPresetKey) {
    setCameraPreset(preset);
    presetTargetRef.current = preset;
  }

  return (
    <div className="relative h-[calc(100vh-116px)] min-h-[540px] w-full overflow-hidden rounded-xl border border-[#E6E8F0] bg-[#0F131A]">
      {/* Isolated WebGL Canvas Container */}
      <div ref={mountRef} className="h-full w-full" />

      {webglError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0F131A] p-6 text-center text-white">
          <div className="max-w-sm">
            <p className="text-base font-semibold">3D Auditorium Preview Unavailable</p>
            <p className="mt-2 text-xs text-slate-300">{webglError}</p>
          </div>
        </div>
      )}

      {/* Minimal Top-Left Scene Title (Solid/RGBA surface — zero backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-white/15 bg-[#141726]/90 px-4 py-2.5 text-white">
        <p className="text-xs font-semibold text-indigo-200">
          3D Public Speaking Auditorium · Three.js Studio
        </p>
        <p className="mt-0.5 text-xs text-slate-300">
          Drag to orbit · Scroll to zoom · Rehearse from Speaker POV
        </p>
      </div>

      {/* Collapsible Unified Bottom Control Dock (<= 15% viewport height, solid/rgba surface) */}
      <div className="absolute bottom-4 left-1/2 z-10 w-[min(920px,94%)] -translate-x-1/2">
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-t-lg border border-b-0 border-white/15 bg-[#141726]/92 px-3.5 py-1 text-xs font-medium text-slate-200 hover:text-white cursor-pointer"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" /> Show Stage Controls
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> Hide Controls
              </>
            )}
          </button>
        </div>

        {!dockCollapsed && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-[#141726]/94 px-4 py-3 text-xs text-slate-200">
            {/* Camera Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(Object.keys(CAMERA_PRESETS) as CameraPresetKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectCamera(key)}
                  className={`rounded-md px-2.5 py-1.5 font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    cameraPreset === key
                      ? "bg-[#635BDB] text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {CAMERA_PRESETS[key].label}
                </button>
              ))}
            </div>

            {/* Stage Lighting Mood */}
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: "warm", label: "Keynote Warm" },
                  { id: "daylight", label: "Daylight" },
                  { id: "gala", label: "Evening Gala" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setLightingMood(m.id)}
                  className={`rounded-md px-2.5 py-1.5 font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    lightingMood === m.id
                      ? "bg-white text-[#141726]"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Teleprompter Cue & Live Mic Meter */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPromptIndex((prev) => (prev + 1) % TELEPROMPTER_PROMPTS.length)}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-1.5 font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Cue: {TELEPROMPTER_PROMPTS[promptIndex].title}
              </button>

              <button
                type="button"
                onClick={() => void toggleMicMonitor()}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium whitespace-nowrap cursor-pointer ${
                  micActive
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
              >
                {micActive ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                {micActive ? "Mic Meter On" : "Test Voice Meter"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
