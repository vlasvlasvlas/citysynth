// Helper de límites
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

// DEFINICIONES DE ESCALAS MUSICALES (Semitonos desde la fundamental)
const SCALES = {
  pentatonic_major: [0, 2, 4, 7, 9, 12, 14, 16],
  pentatonic_minor: [0, 3, 5, 7, 10, 12, 15, 17],
  major: [0, 2, 4, 5, 7, 9, 11, 12],
  dorian: [0, 2, 3, 5, 7, 9, 10, 12],
  phrygian: [0, 1, 3, 5, 7, 8, 10, 12],
  lydian: [0, 2, 4, 6, 7, 9, 11, 12],
  minor: [0, 2, 3, 5, 7, 8, 10, 12],
  whole_tone: [0, 2, 4, 6, 8, 10, 12, 14],
  blues: [0, 3, 5, 6, 7, 10, 12, 15]
};

// CONFIGURACIÓN DE LOS EDIFICIOS DEL SKYLINE (8 edificios en 80 columnas de ancho)
const BUILDINGS_CONFIG = [
  { id: 0, start_x: 2,  width: 7,  bh: 12, floors: 6, cols: 3, type: "zen" },
  { id: 1, start_x: 12, width: 7,  bh: 18, floors: 8, cols: 3, type: "bass" },
  { id: 2, start_x: 22, width: 8,  bh: 14, floors: 7, cols: 3, type: "arp" },
  { id: 3, start_x: 34, width: 11, bh: 18, floors: 8, cols: 4, type: "pad" }, // Central, aloja el ascensor
  { id: 4, start_x: 47, width: 7,  bh: 13, floors: 6, cols: 3, type: "noise" },
  { id: 5, start_x: 55, width: 7,  bh: 11, floors: 5, cols: 3, type: "aeolian" },
  { id: 6, start_x: 63, width: 7,  bh: 17, floors: 8, cols: 3, type: "whole" },
  { id: 7, start_x: 71, width: 7,  bh: 13, floors: 6, cols: 3, type: "blues" }
];

// Estado global de la aplicación
const state = {
  audioEnabled: true,
  masterVolume: 0.5,
  weatherVolume: 0.5, // Volumen específico del clima
  weatherIntensity: 1.0, // Intensidad visual/física del clima
  lifeMode: "on_drone", // off, on_drone, on_silent
  weather: "clear", // clear, rain, snow, storm, bees
  currentTheme: "dos-blue",
  currentPreset: "default_city",
  thematicPresets: [],
  mobilePerformanceMode: false,
  
  // Llenar Azar Automático
  autoRandomActive: false,
  autoRandomInterval: 5, // segundos
  autoRandomElapsed: 0, // ms acumulados
  
  buildings: [],
  stars: [],
  rainDrops: [],
  snowDrops: [],
  bees: [],
  coordMap: Array(24).fill(null).map(() => Array(80).fill(null)), // O(1) mapeo de x,y a ventana
  
  elevator_y: 19, // y-position del ascensor
  elevatorState: "idle", // idle, up, pause, down
  elevatorTargetY: 19,
  
  // Secuenciador Unificado por Delta Time
  lastTime: performance.now(),
  sweeps: {
    L_TO_R: { active: false, pos: 0, bpm: 120, elapsed: 0, delayTime: 0, delayFeedback: 0 },
    R_TO_L: { active: false, pos: 79, bpm: 120, elapsed: 0, delayTime: 0, delayFeedback: 0 },
    T_TO_B: { active: false, pos: 0, bpm: 120, elapsed: 0, delayTime: 0, delayFeedback: 0 },
    B_TO_T: { active: false, pos: 23, bpm: 120, elapsed: 0, delayTime: 0, delayFeedback: 0 }
  },
  
  vehicles: [], // Vehículos de la calle (Modo Vida)
  
  // Configuración de los 8 canales de audio correspondientes a cada edificio
  channels: [
    { volume: 0.8, timbre: "sine", scale: "pentatonic_major", rootFreq: 130.81, notes: [] }, // Canal 0 (zen)
    { volume: 0.8, timbre: "triangle", scale: "phrygian", rootFreq: 65.41, notes: [] },     // Canal 1 (bass)
    { volume: 0.8, timbre: "square", scale: "dorian", rootFreq: 130.81, notes: [] },       // Canal 2 (arp)
    { volume: 0.8, timbre: "triangle", scale: "lydian", rootFreq: 261.63, notes: [] },       // Canal 3 (pad)
    { volume: 0.8, timbre: "square", scale: "pentatonic_minor", rootFreq: 440.00, notes: [] }, // Canal 4 (noise)
    { volume: 0.8, timbre: "sine", scale: "minor", rootFreq: 220.00, notes: [] },         // Canal 5 (aeolian)
    { volume: 0.8, timbre: "triangle", scale: "whole_tone", rootFreq: 261.63, notes: [] },    // Canal 6 (whole)
    { volume: 0.8, timbre: "square", scale: "blues", rootFreq: 523.25, notes: [] }         // Canal 7 (blues)
  ],
  activeChannelIdx: 0, // Canal que se está editando en la UI actualmente
  
  frameCount: 0,
};

// Referencias del DOM
const refs = {
  stageCanvas: document.getElementById("stageCanvas"),
  volumeSlider: document.getElementById("volumeSlider"),
  volumeVal: document.getElementById("volumeVal"),
  themeSelect: document.getElementById("themeSelect"),
  presetSelect: document.getElementById("presetSelect"),
  audioToggle: document.getElementById("audioToggle"),
  weatherSelect: document.getElementById("weatherSelect"),
  weatherVolume: document.getElementById("weatherVolume"),
  weatherVolumeVal: document.getElementById("weatherVolumeVal"),
  weatherIntensity: document.getElementById("weatherIntensity"),
  weatherIntensityVal: document.getElementById("weatherIntensityVal"),
  
  btnClear: document.getElementById("btnClear"),
  btnRandom: document.getElementById("btnRandom"),
  btnLifeToggle: document.getElementById("btnLifeToggle"),
  
  autoRandomToggle: document.getElementById("autoRandomToggle"),
  autoRandomInterval: document.getElementById("autoRandomInterval"),
  autoRandomIntervalVal: document.getElementById("autoRandomIntervalVal"),

  // Elementos de edición de canal
  channelSelect: document.getElementById("channelSelect"),
  channelVolume: document.getElementById("channelVolume"),
  channelVolumeVal: document.getElementById("channelVolumeVal"),
  channelTimbre: document.getElementById("channelTimbre"),
  channelScale: document.getElementById("channelScale"),
  channelRoot: document.getElementById("channelRoot"),

  // Sidebar y Modales
  btnOpenConfig: document.getElementById("btnOpenConfig"),
  btnCloseConfig: document.getElementById("btnCloseConfig"),
  btnOpenHelp: document.getElementById("btnOpenHelp"),
  btnCloseHelp: document.getElementById("btnCloseHelp"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  configSidebar: document.getElementById("configSidebar"),
  helpModal: document.getElementById("helpModal"),
};

// Mapeo de colores ANSI según el tipo de edificio
function getBuildingColor(type) {
  switch (type) {
    case "zen": return "ansi-green";
    case "bass": return "ansi-blue";
    case "arp": return "ansi-magenta";
    case "pad": return "ansi-yellow";
    case "noise": return "ansi-red";
    case "aeolian": return "ansi-green";
    case "whole": return "ansi-cyan";
    case "blues": return "ansi-yellow";
    default: return "ansi-white";
  }
}

function isLifeEnabled() {
  return state.lifeMode !== "off";
}

function isLifeDroneEnabled() {
  return state.lifeMode === "on_drone";
}

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getClimateDensityMultiplier() {
  return clamp(state.weatherIntensity, 0, 1);
}

function setupPerformanceMode() {
  const isSmallScreen = window.matchMedia && window.matchMedia("(max-width: 900px)").matches;
  const lowMemory = typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4;
  state.mobilePerformanceMode = Boolean(isSmallScreen || lowMemory);
}

// Motor de audio de 8 bits seco (Chiptune puro) con soporte LFO, Delays y Climas
const audio = {
  ctx: null,
  sweeps: {
    L_TO_R: { delay: null, feedback: null, wetGain: null },
    R_TO_L: { delay: null, feedback: null, wetGain: null },
    T_TO_B: { delay: null, feedback: null, wetGain: null },
    B_TO_T: { delay: null, feedback: null, wetGain: null }
  },
  
  beeDrone: null,
  beeDroneGain: null,
  beeLFO: null,
  
  carDrone: null,
  carDroneGain: null,
  carDroneFilter: null,
  
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Inicializar nodos de delay para cada barrido
    ["L_TO_R", "R_TO_L", "T_TO_B", "B_TO_T"].forEach(sweepId => {
      const delay = this.ctx.createDelay(1.0);
      const feedback = this.ctx.createGain();
      const wetGain = this.ctx.createGain();
      
      delay.delayTime.value = state.sweeps[sweepId].delayTime / 1000;
      feedback.gain.value = state.sweeps[sweepId].delayFeedback / 100;
      wetGain.gain.value = 0.4; // volumen de la señal procesada
      
      feedback.connect(delay);
      delay.connect(feedback);
      delay.connect(wetGain);
      wetGain.connect(this.ctx.destination);
      
      this.sweeps[sweepId] = { delay, feedback, wetGain };
    });
  },
  
  playTone(freq, timbre = "square", chVol = 0.8, duration = 0.12, isBeeNear = false, sweepId = null) {
    if (!state.audioEnabled) return;
    this.init();
    
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = timbre;
    
    // Modulación por abejas: vibrato LFO rápido si hay abejas cerca
    if (isBeeNear) {
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 8.5; // Frecuencia del zumbido
      lfoGain.gain.value = 16;   // Amplitud de la vibración de tono
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + duration + 0.05);
    }
    
    osc.frequency.setValueAtTime(freq, now);
    
    // Consecuencias climáticas: Nieve congela el sonido (decaimiento más corto y seco)
    let finalDuration = duration;
    if (state.weather === "snow") {
      finalDuration = duration * 0.5;
    }
    
    // Cálculo final de ganancia (volumen canal * volumen maestro)
    const finalVol = state.masterVolume * chVol * 0.12;
    gainNode.gain.setValueAtTime(finalVol, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + finalDuration);
    
    osc.connect(gainNode);
    
    // Conexión dry directa a la salida
    gainNode.connect(this.ctx.destination);
    
    // Conexión wet si el barrido tiene Delay y Feedback
    if (sweepId && this.sweeps[sweepId]) {
      const s = state.sweeps[sweepId];
      if (s.delayTime > 0) {
        const sweepDelay = this.sweeps[sweepId];
        sweepDelay.delay.delayTime.setValueAtTime(s.delayTime / 1000, now);
        sweepDelay.feedback.gain.setValueAtTime(s.delayFeedback / 100, now);
        
        // Conectar solo la entrada al delay; salida wet preconectada en init()
        gainNode.connect(sweepDelay.delay);
      }
    }
    
    osc.start(now);
    osc.stop(now + finalDuration + 0.02);
  },

  // Generación de blip para salpicadura de gota de lluvia
  playRainDrip() {
    if (!state.audioEnabled) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    osc.type = "sine";
    const freq = 1800 + Math.random() * 800;
    osc.frequency.setValueAtTime(freq, now);
    // Barrido de frecuencia descendente (pitch sweep) para emular la gota chiptune
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + 0.03);
    
    // Gotas más fuertes: base alta en lluvia y al menos el doble en tormenta
    const stormMultiplier = state.weather === "storm" ? 2.0 : 1.0;
    const dripVol = state.masterVolume * state.weatherVolume * (0.15 + 0.85 * getClimateDensityMultiplier()) * 0.28 * stormMultiplier;
    gainNode.gain.setValueAtTime(dripVol, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  },

  // Sonido grave analógico de trueno
  playThunder() {
    if (!state.audioEnabled) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    osc.type = "triangle";
    
    osc.frequency.setValueAtTime(75, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.85);
    
    // Incorpora el volumen del clima
    const thunderVol = state.masterVolume * state.weatherVolume * (0.15 + 0.85 * getClimateDensityMultiplier()) * 0.6;
    gainNode.gain.setValueAtTime(thunderVol * 0.16, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.9);
  },
  
  // Drone para enjambre de abejas
  startBeeDrone() {
    if (!state.audioEnabled || this.beeDrone) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 55; // La1 (low drone A1)
    
    // Modulación LFO para vibración de abejas
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 12; // vibración rápida
    lfoGain.gain.value = 6;    // oscilar frecuencia +/- 6Hz
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    // Ajuste de volumen con volumen del clima
    const vol = state.masterVolume * state.weatherVolume * (0.15 + 0.85 * getClimateDensityMultiplier()) * 0.04;
    gainNode.gain.setValueAtTime(vol, now);
    
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    lfo.start(now);
    osc.start(now);
    
    this.beeDrone = osc;
    this.beeDroneGain = gainNode;
    this.beeLFO = lfo;
  },

  stopBeeDrone() {
    if (this.beeDrone) {
      try {
        this.beeDrone.stop();
        this.beeLFO.stop();
      } catch(e) {}
      this.beeDrone = null;
      this.beeDroneGain = null;
      this.beeLFO = null;
    }
  },

  updateBeeDroneVolume() {
    if (this.beeDroneGain) {
      const now = this.ctx.currentTime;
      const vol = state.masterVolume * state.weatherVolume * (0.15 + 0.85 * getClimateDensityMultiplier()) * 0.04;
      this.beeDroneGain.gain.setValueAtTime(vol, now);
    }
  },

  startCarDrone() {
    if (!state.audioEnabled || this.carDrone) return;
    this.init();
    const now = this.ctx.currentTime;
    
    // Crear oscilador y filtro lowpass para emular rumor de motores de tránsito
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gainNode = this.ctx.createGain();
    
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(45, now); // 45Hz hum grave
    
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(120, now); // Rumor de fondo cálido
    
    gainNode.gain.setValueAtTime(0, now);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    osc.start(now);
    
    this.carDrone = osc;
    this.carDroneGain = gainNode;
    this.carDroneFilter = filter;
  },

  stopCarDrone() {
    if (this.carDrone) {
      try {
        this.carDrone.stop();
      } catch(e) {}
      this.carDrone = null;
      this.carDroneGain = null;
      this.carDroneFilter = null;
    }
  },

  updateCarDroneVolume() {
    if (!this.carDroneGain) return;
    const now = this.ctx.currentTime;
    
    let targetVol = 0;
    if (state.audioEnabled && isLifeDroneEnabled() && state.vehicles && state.vehicles.length > 0) {
      // 0.05 de volumen base por auto (escalable hasta 3 autos máx)
      targetVol = state.masterVolume * 0.05 * Math.min(state.vehicles.length, 3);
    }
    this.carDroneGain.gain.setTargetAtTime(targetVol, now, 0.2); // Transición suave
  }
};

// Actualiza las notas de un canal en base a su frecuencia raíz y escala seleccionadas
function updateChannelNotes(chIdx) {
  const ch = state.channels[chIdx];
  const intervals = SCALES[ch.scale] || SCALES.pentatonic_major;
  const base = ch.rootFreq;
  ch.notes = intervals.map(interval => base * Math.pow(2, interval / 12));
}

// Inicializar notas para todos los canales
function initAllChannelNotes() {
  for (let i = 0; i < state.channels.length; i++) {
    updateChannelNotes(i);
  }
}

// Configura las estrellas en el cielo
function createStars() {
  state.stars = [];
  for (let i = 0; i < 18; i++) {
    let x = Math.floor(Math.random() * 80);
    let y = Math.floor(Math.random() * 7);
    if (x >= 53 && x <= 67 && y >= 1 && y <= 6) {
      x = (x + 20) % 80;
    }
    state.stars.push({
      x,
      y,
      phase: Math.floor(Math.random() * 3)
    });
  }
}

// Configura las gotas de lluvia
function createRain() {
  state.rainDrops = [];
  const density = getClimateDensityMultiplier();
  const baseCount = state.mobilePerformanceMode ? 18 : 35;
  const count = Math.max(4, Math.floor(baseCount * density));
  for (let i = 0; i < count; i++) {
    state.rainDrops.push({
      x: Math.random() * 80,
      y: Math.random() * 20,
      speed: 0.5 + Math.random() * 0.7
    });
  }
}

// Configura las gotas de nieve
function createSnow() {
  state.snowDrops = [];
  const density = getClimateDensityMultiplier();
  const baseCount = state.mobilePerformanceMode ? 18 : 35;
  const count = Math.max(4, Math.floor(baseCount * density));
  for (let i = 0; i < count; i++) {
    state.snowDrops.push({
      x: Math.random() * 80,
      y: Math.random() * 20,
      speed: 0.15 + Math.random() * 0.25,
      driftOffset: Math.random() * 10
    });
  }
}

// Configura las abejas
function createBees() {
  state.bees = [];
  const density = getClimateDensityMultiplier();
  const baseCount = state.mobilePerformanceMode ? 4 : 6;
  const count = Math.max(1, Math.floor(baseCount * density));
  for (let i = 0; i < count; i++) {
    state.bees.push({
      x: 10 + Math.floor(Math.random() * 60),
      y: 2 + Math.floor(Math.random() * 12)
    });
  }
}

// Mueve las gotas de lluvia
function stepRain() {
  state.rainDrops.forEach(drop => {
    const intensityMul = 0.35 + getClimateDensityMultiplier() * 1.6;
    const speedMultiplier = (state.weather === "storm" ? 1.5 : 1.0) * intensityMul;
    drop.y += drop.speed * speedMultiplier;
    if (drop.y > 20) {
      drop.y = -Math.random() * 5;
      drop.x = Math.random() * 80;
      if (Math.random() < 0.1 * getClimateDensityMultiplier()) {
        audio.playRainDrip();
      }
    }
  });
}

// Mueve las gotas de nieve (oscilan horizontalmente)
function stepSnow() {
  state.snowDrops.forEach(drop => {
    const intensityMul = 0.35 + getClimateDensityMultiplier() * 1.4;
    drop.y += drop.speed * intensityMul;
    drop.x += Math.sin(state.frameCount * 0.15 + drop.driftOffset) * 0.1;
    if (drop.y > 20) {
      drop.y = -Math.random() * 5;
      drop.x = Math.random() * 80;
    }
    drop.x = (drop.x + 80) % 80;
  });
}

// Mueve las abejas de forma aleatoria (Random Walk)
function stepBees() {
  state.bees.forEach(bee => {
    const dx = Math.floor(Math.random() * 3) - 1;
    const dy = Math.floor(Math.random() * 3) - 1;
    bee.x = clamp(bee.x + dx, 0, 79);
    bee.y = clamp(bee.y + dy, 1, 18);
  });
}

// Retorna verdadero si hay una abeja en un radio cercano de una coordenada
function checkBeeNear(x, y) {
  if (state.weather !== "bees") return false;
  return state.bees.some(b => {
    const dist = Math.abs(b.x - x) + Math.abs(b.y - y);
    return dist <= 2;
  });
}

// Simula el movimiento y spawn de vehículos en doble carril (Modo Vida)
function stepVehicles() {
  if (!isLifeEnabled()) {
    if (state.vehicles.length > 0) {
      state.vehicles = [];
      audio.updateCarDroneVolume();
    }
    return;
  }

  // 1. Mover vehículos existentes
  state.vehicles.forEach(v => {
    v.x += v.speed;
  });

  // Eliminar vehículos que salen de la pantalla
  state.vehicles = state.vehicles.filter(v => {
    if (v.speed > 0 && v.x > 82) return false;
    if (v.speed < 0 && v.x < -4) return false;
    return true;
  });

  // 2. Spawneo aleatorio de nuevos vehículos (máximo 4 simultáneos)
  if (state.vehicles.length < 4 && Math.random() < 0.05) {
    const lane = Math.random() < 0.5 ? 0 : 1; // 0 = Oeste->Este (fila 21), 1 = Este->Oeste (fila 22)
    const y = lane === 0 ? 21 : 22;
    const speed = lane === 0 ? (0.3 + Math.random() * 0.3) : -(0.3 + Math.random() * 0.3);
    const x = lane === 0 ? -3 : 81;

    const types = ["taxi", "car", "moto"];
    const type = types[Math.floor(Math.random() * types.length)];

    let color = "ansi-blue";
    let chars = "■■";

    if (type === "taxi") {
      color = "ansi-yellow";
      chars = "■■";
    } else if (type === "moto") {
      color = "ansi-red";
      chars = "•";
    } else {
      const carColors = ["ansi-blue", "ansi-cyan", "ansi-white"];
      color = carColors[Math.floor(Math.random() * carColors.length)];
      chars = "■■";
    }

    // Comprobar colisión para no encimar vehículos al nacer
    const collision = state.vehicles.some(v => v.y === y && Math.abs(v.x - x) < 8);
    if (!collision) {
      state.vehicles.push({ x, y, speed, type, color, chars });
      audio.updateCarDroneVolume();
    }
  }
}

// Lógica de movimiento física del ascensor
let elevatorTickCount = 0;
function stepElevator() {
  elevatorTickCount++;
  if (elevatorTickCount % 2 !== 0) return; // corre a 6 FPS aprox
  
  if (state.elevatorState === "idle") {
    if (Math.random() < 0.05) { // 5% de chance de partir
      state.elevatorTargetY = 3 + Math.floor(Math.random() * 15);
      state.elevatorState = "up";
    }
  } else if (state.elevatorState === "up") {
    if (state.elevator_y > state.elevatorTargetY) {
      state.elevator_y -= 1;
    } else {
      state.elevatorState = "pause";
      setTimeout(() => {
        state.elevatorState = "down";
      }, 1200);
    }
  } else if (state.elevatorState === "down") {
    if (state.elevator_y < 19) {
      state.elevator_y += 1;
    } else {
      state.elevatorState = "idle";
    }
  }
}

// Inicialización de la red de ventanas y mapeado
function initSkyline() {
  const ground_y = 20;
  state.buildings = [];
  state.coordMap = Array(24).fill(null).map(() => Array(80).fill(null));
  
  BUILDINGS_CONFIG.forEach((bConfig, bIdx) => {
    const windowMatrix = [];
    const roof_y = ground_y - bConfig.bh;
    
    for (let f = 0; f < bConfig.floors; f++) {
      const row = [];
      for (let c = 0; c < bConfig.cols; c++) {
        let wx;
        
        if (bIdx === 3) {
          // El edificio central contiene el ascensor en las columnas 38, 39, 40.
          // Distribuimos las ventanas exclusivamente en las alas laterales.
          const colsMap = [35, 36, 42, 43];
          wx = colsMap[c];
        } else {
          wx = bConfig.start_x + 1;
          if (bConfig.cols > 1) {
            wx += Math.floor((bConfig.width - 2) * c / (bConfig.cols - 1));
          } else {
            wx += Math.floor(bConfig.width / 2);
          }
        }
        
        let wy = roof_y + 1;
        if (bConfig.floors > 1) {
          wy += Math.floor((bConfig.bh - 2) * f / (bConfig.floors - 1));
        } else {
          wy += Math.floor(bConfig.bh / 2);
        }
        
        row.push({
          on: Math.random() < 0.25,
          x: wx,
          y: wy
        });
        
        // Registrar en el mapa rápido de coordenadas
        state.coordMap[wy][wx] = { buildingIdx: bIdx, floor: f, col: c };
      }
      windowMatrix.push(row);
    }
    
    state.buildings.push({
      config: bConfig,
      windows: windowMatrix
    });
  });
}

// Cambiar el encendido de una ventana manualmente
function toggleWindow(bIdx, floor, col) {
  const b = state.buildings[bIdx];
  if (!b) return;
  const win = b.windows[floor][col];
  win.on = !win.on;
  
  // Forzar redibujado instantáneo del canvas para feedback visual inmediato
  drawCanvas();
  
  if (win.on) {
    const ch = state.channels[bIdx];
    const floors = b.config.floors;
    const freqIdx = floors - 1 - floor;
    const freq = ch.notes[freqIdx % ch.notes.length] || 220;
    const hasBee = checkBeeNear(win.x, win.y);
    audio.playTone(freq, ch.timbre, ch.volume, 0.15, hasBee, null);
  }
}

// Simula la vida urbana autónoma
function simulateResidentialLife() {
  if (!isLifeEnabled()) return;
  
  state.buildings.forEach(b => {
    b.windows.forEach(row => {
      row.forEach(win => {
        if (Math.random() < 0.015) {
          win.on = !win.on;
        }
      });
    });
  });
}

// Disparar las notas y acciones del barrido
function processSweepAction(bIdx, floor, col, sweepId) {
  const b = state.buildings[bIdx];
  const win = b.windows[floor][col];
  if (win.on) {
    const ch = state.channels[bIdx];
    const floors = b.config.floors;
    const freqIdx = floors - 1 - floor;
    const freq = ch.notes[freqIdx % ch.notes.length];
    const hasBee = checkBeeNear(win.x, win.y);
    audio.playTone(freq, ch.timbre, ch.volume, 0.12, hasBee, sweepId);
  }
}

// Tick lógico para un barrido individual
function tickSweep(sweepId) {
  const sweep = state.sweeps[sweepId];
  
  // Avanzar posición
  if (sweepId === "L_TO_R") {
    sweep.pos = (sweep.pos + 1) % 80;
  } else if (sweepId === "R_TO_L") {
    sweep.pos = (sweep.pos - 1 + 80) % 80;
  } else if (sweepId === "T_TO_B") {
    sweep.pos = (sweep.pos + 1) % 24;
  } else if (sweepId === "B_TO_T") {
    sweep.pos = (sweep.pos - 1 + 24) % 24;
  }
  
  const targetPos = sweep.pos;
  const ground_y = 20;
  
  // Analizar intersecados
  if (sweepId === "L_TO_R" || sweepId === "R_TO_L") {
    for (let y = 0; y < ground_y; y++) {
      const match = state.coordMap[y][targetPos];
      if (match) {
        processSweepAction(match.buildingIdx, match.floor, match.col, sweepId);
      }
    }
  } else {
    if (targetPos < ground_y) {
      for (let x = 0; x < 80; x++) {
        const match = state.coordMap[targetPos][x];
        if (match) {
          processSweepAction(match.buildingIdx, match.floor, match.col, sweepId);
        }
      }
    }
  }
}

// Bucle principal de actualización de secuenciadores por Delta Time
function updateSequencers(now) {
  const delta = now - state.lastTime;
  state.lastTime = now;
  
  Object.keys(state.sweeps).forEach(sweepId => {
    const sweep = state.sweeps[sweepId];
    if (sweep.active) {
      // Modulación de BPM por el clima
      let effectiveBpm = sweep.bpm;
      if (state.weather === "snow") {
        effectiveBpm = sweep.bpm * 0.6; // Nieve reduce la velocidad un 40%
      } else if (state.weather === "storm") {
        effectiveBpm = sweep.bpm * (1.0 + Math.sin(state.frameCount * 0.08) * 0.25);
      }
      
      const stepInterval = (60000 / effectiveBpm) / 4;
      sweep.elapsed += delta;
      
      // Evitar avalancha sonora
      if (sweep.elapsed > stepInterval * 2) {
        sweep.elapsed = stepInterval * 2;
      }
      
      while (sweep.elapsed >= stepInterval) {
        sweep.elapsed -= stepInterval;
        tickSweep(sweepId);
      }
    }
  });
}

// Renderizado principal del lienzo de caracteres
function drawCanvas() {
  const width = 80;
  const height = 24;
  const ground_y = 20;
  
  state.frameCount++;
  if (state.mobilePerformanceMode && state.frameCount % 2 !== 0) return;
  
  // 1. Inicializar buffers planos
  const buf = Array(height).fill(null).map(() => Array(width).fill(" "));
  const colors = Array(height).fill(null).map(() => Array(width).fill("ansi-grey"));
  
  // 2. Dibujar estrellas parpadeantes en el cielo (solo si no hay tormenta densa)
  if (state.weather !== "storm" || Math.random() < 0.6 * getClimateDensityMultiplier()) {
    state.stars.forEach(star => {
      if (star.y < ground_y) {
        const chars = [".", "*", "+"];
        const charIdx = (state.frameCount + star.phase) % 3;
        buf[star.y][star.x] = chars[charIdx];
        colors[star.y][star.x] = "ansi-grey";
      }
    });
  }
  
  // 3. Dibujar Luna ASCII (solo si no hay tormenta/lluvia densa)
  if (state.weather !== "storm" && state.weather !== "rain" && getClimateDensityMultiplier() < 0.9) {
    const moon_x = 56;
    const moon_y = 2;
    const moonLines = [
      "  ,-.",
      " (   `",
      "  `-'"
    ];
    moonLines.forEach((line, dy) => {
      for (let dx = 0; dx < line.length; dx++) {
        const char = line[dx];
        if (char !== " ") {
          const py = moon_y + dy;
          const px = moon_x + dx;
          if (py < height && px < width) {
            buf[py][px] = char;
            colors[py][px] = "ansi-yellow";
          }
        }
      }
    });
  }
  
  // 4. Dibujar siluetas de edificios
  state.buildings.forEach(b => {
    const roof_y = ground_y - b.config.bh;
    for (let y = roof_y; y < ground_y; y++) {
      for (let x = b.config.start_x; x < b.config.start_x + b.config.width; x++) {
        buf[y][x] = "█";
        colors[y][x] = "ansi-darkgrey";
      }
    }
    
    // Adorno del techo en ASCII
    let roofASCII = "  /||\\  ";
    if (b.config.id % 2 === 0) roofASCII = " _/|_ ";
    
    const rx = b.config.start_x + Math.floor((b.config.width - roofASCII.length) / 2);
    const ry = roof_y - 1;
    if (ry >= 0) {
      for (let dx = 0; dx < roofASCII.length; dx++) {
        const char = roofASCII[dx];
        if (char !== " ") {
          buf[ry][rx + dx] = char;
          colors[ry][rx + dx] = "ansi-grey";
        }
      }
    }
  });
  
  // 5. Dibujar conducto vertical del ascensor (Dentro del Edificio 3, Columnas 38, 39, 40)
  for (let y = 3; y < ground_y; y++) {
    buf[y][38] = "│";
    colors[y][38] = "ansi-grey";
    buf[y][39] = " "; // Vaciamos el relleno de bloque para crear el conducto del ascensor
    buf[y][40] = "│";
    colors[y][40] = "ansi-grey";
  }
  // Dibujar el carro del ascensor
  if (state.elevator_y >= 3 && state.elevator_y < ground_y) {
    buf[state.elevator_y][39] = "█";
    colors[state.elevator_y][39] = "ansi-cyan";
  }
  
  // 6. Dibujar Ventanas interactuables
  state.buildings.forEach(b => {
    b.windows.forEach(row => {
      row.forEach(win => {
        buf[win.y][win.x] = win.on ? "█" : "■";
        if (win.on) {
          colors[win.y][win.x] = getBuildingColor(b.config.type);
        } else {
          colors[win.y][win.x] = "ansi-grey";
        }
      });
    });
  });
  
  // 7. Letreros de Neón de los edificios activos
  state.buildings.forEach(b => {
    let word = "";
    let color = "";
    if (b.config.id === 0 && state.sweeps.T_TO_B.active) { word = "ZEN"; color = "ansi-green"; }
    else if (b.config.id === 2 && state.sweeps.L_TO_R.active) { word = "ARP"; color = "ansi-magenta"; }
    else if (b.config.id === 4 && state.sweeps.R_TO_L.active) { word = "SFX"; color = "ansi-red"; }
    else if (b.config.id === 7 && state.sweeps.B_TO_T.active) { word = "BLUES"; color = "ansi-yellow"; }
    
    if (word) {
      const roof_y = ground_y - b.config.bh;
      const sy = roof_y + 2;
      const sx = b.config.start_x + Math.floor((b.config.width - word.length) / 2);
      
      const blink = (state.frameCount % 8 < 6);
      if (blink) {
        for (let dx = 0; dx < word.length; dx++) {
          buf[sy][sx + dx] = word[dx];
          colors[sy][sx + dx] = color;
        }
      }
    }
  });

  // 8. Dibujar suelo mojado y reflejos (Filas 20 a 23)
  for (let y = ground_y; y < height; y++) {
    for (let x = 0; x < width; x++) {
      buf[y][x] = (x + y) % 3 === 0 ? "░" : "·";
      colors[y][x] = "ansi-darkgrey";
    }
  }
  
  // Reflejos del letrero neon activo en el suelo
  state.buildings.forEach(b => {
    let word = "";
    let color = "";
    if (b.config.id === 0 && state.sweeps.T_TO_B.active) { word = "ZEN"; color = "ansi-green"; }
    else if (b.config.id === 2 && state.sweeps.L_TO_R.active) { word = "ARP"; color = "ansi-magenta"; }
    else if (b.config.id === 4 && state.sweeps.R_TO_L.active) { word = "SFX"; color = "ansi-red"; }
    else if (b.config.id === 7 && state.sweeps.B_TO_T.active) { word = "BLUES"; color = "ansi-yellow"; }
    
    if (word) {
      const sx = b.config.start_x + Math.floor((b.config.width - word.length) / 2);
      const center_x = sx + Math.floor(word.length / 2);
      for (let gy = ground_y; gy < height; gy++) {
        const spread = (gy - ground_y + 1);
        for (let rx = center_x - spread; rx <= center_x + spread; rx++) {
          if (rx >= 0 && rx < width && Math.random() < 0.65) {
            buf[gy][rx] = "~";
            colors[gy][rx] = color;
          }
        }
      }
    }

    // Reflejo vertical de ventanas encendidas sobre suelo mojado
    b.windows.forEach(row => {
      row.forEach(win => {
        if (win.on) {
          const colorClass = getBuildingColor(b.config.type);
          for (let gy = ground_y; gy < height; gy++) {
            if (Math.random() < 0.4) {
              buf[gy][win.x] = "∼";
              colors[gy][win.x] = colorClass;
            }
          }
        }
      });
    });
  });

  // 8b. Dibujar vehículos del tránsito en la calle (Modo Vida)
  state.vehicles.forEach(v => {
    const px = Math.floor(v.x);
    const py = v.y;
    if (py >= ground_y && py < height) {
      for (let i = 0; i < v.chars.length; i++) {
        const cx = px + i;
        if (cx >= 0 && cx < width) {
          buf[py][cx] = v.chars[i];
          colors[py][cx] = v.color;
        }
      }
    }
  });

  // 9. Renderizado de partículas de clima
  if (state.weather === "rain" || state.weather === "storm") {
    state.rainDrops.forEach(drop => {
      const rx = Math.floor(drop.x);
      const ry = Math.floor(drop.y);
      if (ry >= 0 && ry < ground_y && rx >= 0 && rx < width) {
        if (Math.random() < getClimateDensityMultiplier()) {
          buf[ry][rx] = "│";
          colors[ry][rx] = "ansi-blue";
        }
      }
    });
  } else if (state.weather === "snow") {
    state.snowDrops.forEach(drop => {
      const rx = Math.floor(drop.x);
      const ry = Math.floor(drop.y);
      if (ry >= 0 && ry < ground_y && rx >= 0 && rx < width) {
        buf[ry][rx] = drop.driftOffset < 5 ? "*" : "+";
        colors[ry][rx] = "ansi-white";
      }
    });
  } else if (state.weather === "bees") {
    state.bees.forEach((bee) => {
      const rx = Math.floor(bee.x);
      const ry = Math.floor(bee.y);
      if (ry >= 0 && ry < height && rx >= 0 && rx < width) {
        buf[ry][rx] = "*";
        colors[ry][rx] = "ansi-yellow";
      }
    });
  }

  // 9b. Estados vacíos / hints rápidos
  const activeSweeps = Object.values(state.sweeps).some(s => s.active);
  const activeWindows = state.buildings.some(b => b.windows.some(row => row.some(w => w.on)));
  let hint = "";
  if (!activeSweeps) {
    hint = "[SIN BARRIDOS ACTIVOS]";
  } else if (!activeWindows) {
    hint = "[SIN VENTANAS ACTIVAS]";
  } else if ((state.weather === "rain" || state.weather === "snow" || state.weather === "storm" || state.weather === "bees") && state.weatherIntensity <= 0.02) {
    hint = "[INTENSIDAD CLIMA EN 0%]";
  }
  if (hint) {
    const startX = Math.max(0, Math.floor((width - hint.length) / 2));
    const y = 0;
    for (let i = 0; i < hint.length && startX + i < width; i++) {
      buf[y][startX + i] = hint[i];
      colors[y][startX + i] = "ansi-yellow";
    }
  }

  // 10. Computar la ubicación y colisión visual de los playheads
  const playhead_V = Array(height).fill(null).map(() => Array(width).fill(false));
  const playhead_H = Array(height).fill(null).map(() => Array(width).fill(false));
  
  if (state.sweeps.L_TO_R.active) {
    const sx = state.sweeps.L_TO_R.pos;
    for (let y = 0; y < ground_y; y++) playhead_V[y][sx] = true;
  }
  if (state.sweeps.R_TO_L.active) {
    const sx = state.sweeps.R_TO_L.pos;
    for (let y = 0; y < ground_y; y++) playhead_V[y][sx] = true;
  }
  if (state.sweeps.T_TO_B.active) {
    const sy = state.sweeps.T_TO_B.pos;
    if (sy < ground_y) {
      for (let x = 0; x < width; x++) playhead_H[sy][x] = true;
    }
  }
  if (state.sweeps.B_TO_T.active) {
    const sy = state.sweeps.B_TO_T.pos;
    if (sy < ground_y) {
      for (let x = 0; x < width; x++) playhead_H[sy][x] = true;
    }
  }

  // 11. Compilar el buffer plano a un string HTML enriquecido
  let html = "";
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let char = buf[y][x];
      let styleClass = colors[y][x];
      
      const vActive = playhead_V[y][x];
      const hActive = playhead_H[y][x];
      
      if (vActive && hActive) {
        char = "┼";
        styleClass = "ansi-intersect";
      } else if (vActive) {
        if (char === " ") char = "│";
        styleClass = "ansi-cursor-v";
      } else if (hActive) {
        if (char === " ") char = "─";
        styleClass = "ansi-cursor-h";
      }
      
      const isWindow = state.coordMap[y][x];
      if (isWindow) {
        html += `<span class="interactive-window ${styleClass}" data-b="${isWindow.buildingIdx}" data-f="${isWindow.floor}" data-c="${isWindow.col}">${char}</span>`;
      } else {
        html += `<span class="${styleClass}">${char}</span>`;
      }
    }
    html += "\n";
  }
  
  refs.stageCanvas.innerHTML = html;
}

// Carga los valores del canal activo a los inputs de la UI
function syncActiveChannelToUI() {
  const ch = state.channels[state.activeChannelIdx];
  refs.channelVolume.value = Math.round(ch.volume * 100);
  refs.channelVolumeVal.textContent = `${Math.round(ch.volume * 100)}%`;
  refs.channelTimbre.value = ch.timbre;
  refs.channelScale.value = ch.scale;
  refs.channelRoot.value = String(ch.rootFreq);
}

function rebuildWeatherParticles() {
  createRain();
  createSnow();
  createBees();
}

function applyThemePreset(themeName) {
  if (themeName) {
    setTheme(themeName);
    state.currentTheme = themeName;
    if (refs.themeSelect) refs.themeSelect.value = themeName;
  }
}

function normalizePreset(rawPreset, fallbackId) {
  const preset = rawPreset || {};
  const id = preset.id || fallbackId;
  return {
    id,
    label: preset.label || id,
    theme: preset.theme || "dos-blue",
    weather: preset.weather || "clear",
    weatherVolume: preset.weatherVolume,
    weatherIntensity: preset.weatherIntensity,
    lifeMode: preset.lifeMode,
    autoRandomActive: preset.autoRandomActive,
    autoRandomInterval: preset.autoRandomInterval,
    buildings: Array.isArray(preset.buildings) ? cloneDeep(preset.buildings) : null,
    channels: Array.isArray(preset.channels) ? cloneDeep(preset.channels) : null,
    sweeps: preset.sweeps ? cloneDeep(preset.sweeps) : null
  };
}

function populatePresetSelect() {
  if (!refs.presetSelect) return;
  refs.presetSelect.innerHTML = "";
  state.thematicPresets.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.label;
    refs.presetSelect.appendChild(opt);
  });
  refs.presetSelect.value = state.currentPreset;
}

function applyPresetById(presetId, syncUI = true) {
  const preset = state.thematicPresets.find(p => p.id === presetId);
  if (!preset) return;
  state.currentPreset = preset.id;

  if (preset.lifeMode) state.lifeMode = preset.lifeMode;
  if (preset.weather) state.weather = preset.weather;
  if (typeof preset.weatherVolume === "number") state.weatherVolume = clamp(preset.weatherVolume, 0, 1);
  if (typeof preset.weatherIntensity === "number") state.weatherIntensity = clamp(preset.weatherIntensity, 0, 1);
  if (typeof preset.autoRandomActive === "boolean") state.autoRandomActive = preset.autoRandomActive;
  if (typeof preset.autoRandomInterval === "number") state.autoRandomInterval = clamp(preset.autoRandomInterval, 1, 15);

  if (preset.buildings) {
    BUILDINGS_CONFIG.length = 0;
    preset.buildings.forEach(b => BUILDINGS_CONFIG.push(cloneDeep(b)));
  }

  if (preset.channels) {
    preset.channels.forEach((ch, idx) => {
      if (!state.channels[idx]) return;
      if (typeof ch.volume === "number") state.channels[idx].volume = ch.volume;
      if (typeof ch.timbre === "string") state.channels[idx].timbre = ch.timbre;
      if (typeof ch.scale === "string") state.channels[idx].scale = ch.scale;
      if (typeof ch.rootFreq === "number") state.channels[idx].rootFreq = ch.rootFreq;
    });
    initAllChannelNotes();
  }

  if (preset.sweeps) {
    Object.keys(state.sweeps).forEach(sweepId => {
      const src = preset.sweeps[sweepId];
      if (!src) return;
      if (typeof src.active === "boolean") state.sweeps[sweepId].active = src.active;
      if (typeof src.pos === "number") state.sweeps[sweepId].pos = src.pos;
      if (typeof src.bpm === "number") state.sweeps[sweepId].bpm = src.bpm;
      if (typeof src.delayTime === "number") state.sweeps[sweepId].delayTime = src.delayTime;
      if (typeof src.delayFeedback === "number") state.sweeps[sweepId].delayFeedback = src.delayFeedback;
      state.sweeps[sweepId].elapsed = 0;
    });
  }

  applyThemePreset(preset.theme);
  initSkyline();
  rebuildWeatherParticles();

  if (state.weather === "bees") audio.startBeeDrone();
  else audio.stopBeeDrone();
  if (isLifeDroneEnabled()) audio.startCarDrone();
  audio.updateBeeDroneVolume();
  audio.updateCarDroneVolume();

  if (syncUI) syncDOMToState();
}

// Enlace de los Controles de la Consola
function bindConsoleUI() {
  // Configuración de Sidebar y Modales
  refs.btnOpenConfig.addEventListener("click", () => {
    refs.configSidebar.classList.add("open");
  });

  refs.btnCloseConfig.addEventListener("click", () => {
    refs.configSidebar.classList.remove("open");
  });

  refs.btnOpenHelp.addEventListener("click", () => {
    refs.helpModal.classList.add("open");
    refs.modalBackdrop.classList.add("open");
  });

  refs.btnCloseHelp.addEventListener("click", () => {
    refs.helpModal.classList.remove("open");
    refs.modalBackdrop.classList.remove("open");
  });

  refs.modalBackdrop.addEventListener("click", () => {
    refs.helpModal.classList.remove("open");
    refs.modalBackdrop.classList.remove("open");
  });

  // Master Volume
  refs.volumeSlider.addEventListener("input", (e) => {
    state.masterVolume = Number(e.target.value) / 100;
    refs.volumeVal.textContent = `${e.target.value}%`;
    audio.updateBeeDroneVolume();
    audio.updateCarDroneVolume(); // Actualizar volumen del rumor de tráfico
  });

  // Audio General Toggle
  refs.audioToggle.addEventListener("change", (e) => {
    state.audioEnabled = e.target.checked;
    if (state.audioEnabled) {
      audio.init();
      if (state.weather === "bees") {
        audio.startBeeDrone();
      }
      if (isLifeDroneEnabled()) {
        audio.startCarDrone();
        audio.updateCarDroneVolume();
      }
    } else {
      audio.stopBeeDrone();
      audio.stopCarDrone(); // Detener el rumor de tráfico
    }
  });

  // --- SECCIÓN CANALES INDIVIDUALES ---
  // Selección de canal
  refs.channelSelect.addEventListener("change", (e) => {
    state.activeChannelIdx = parseInt(e.target.value);
    syncActiveChannelToUI();
  });

  // Volumen del canal
  refs.channelVolume.addEventListener("input", (e) => {
    const ch = state.channels[state.activeChannelIdx];
    ch.volume = Number(e.target.value) / 100;
    refs.channelVolumeVal.textContent = `${e.target.value}%`;
  });

  // Timbre de onda del canal
  refs.channelTimbre.addEventListener("change", (e) => {
    const ch = state.channels[state.activeChannelIdx];
    ch.timbre = e.target.value;
  });

  // Escala musical del canal
  refs.channelScale.addEventListener("change", (e) => {
    const ch = state.channels[state.activeChannelIdx];
    ch.scale = e.target.value;
    updateChannelNotes(state.activeChannelIdx);
  });

  // Frecuencia raíz del canal
  refs.channelRoot.addEventListener("change", (e) => {
    const ch = state.channels[state.activeChannelIdx];
    ch.rootFreq = parseFloat(e.target.value);
    updateChannelNotes(state.activeChannelIdx);
  });

  // Limpiar red (ventanas)
  refs.btnClear.addEventListener("click", () => {
    state.buildings.forEach(b => {
      b.windows.forEach(row => {
        row.forEach(w => w.on = false);
      });
    });
    drawCanvas();
  });

  // Llenar al azar
  refs.btnRandom.addEventListener("click", () => {
    state.buildings.forEach(b => {
      b.windows.forEach(row => {
        row.forEach(w => w.on = Math.random() < 0.28);
      });
    });
    drawCanvas();
  });

  // Azar Automático Toggle
  refs.autoRandomToggle.addEventListener("change", (e) => {
    state.autoRandomActive = e.target.checked;
    state.autoRandomElapsed = 0;
  });

  // Azar Automático Interval Slider
  refs.autoRandomInterval.addEventListener("input", (e) => {
    state.autoRandomInterval = Number(e.target.value);
    refs.autoRandomIntervalVal.textContent = `${e.target.value}s`;
  });

  // Alternar simulación autónoma de vida
  refs.btnLifeToggle.addEventListener("click", () => {
    if (state.lifeMode === "off") {
      state.lifeMode = "on_drone";
    } else if (state.lifeMode === "on_drone") {
      state.lifeMode = "on_silent";
    } else {
      state.lifeMode = "off";
    }

    const span = refs.btnLifeToggle.querySelector("span");
    if (span) {
      span.textContent = state.lifeMode === "off"
        ? "[ VIDA: OFF ]"
        : (state.lifeMode === "on_drone" ? "[ VIDA: ON + DRONE ]" : "[ VIDA: ON - DRONE ]");
    }

    if (!isLifeEnabled()) {
      state.vehicles = []; // Limpiar vehículos de inmediato al apagar vida
      audio.updateCarDroneVolume(); // Silenciar drone de autos
      return;
    }

    if (isLifeDroneEnabled()) {
      audio.startCarDrone();
    }
    audio.updateCarDroneVolume();
  });

  // Clic en la stage (MOUSEDOWN para capturar clics rápidos antes de que innerHTML reemplace nodos)
  refs.stageCanvas.addEventListener("mousedown", (e) => {
    const winEl = e.target.closest(".interactive-window");
    if (winEl) {
      const bIdx = parseInt(winEl.dataset.b);
      const f = parseInt(winEl.dataset.f);
      const c = parseInt(winEl.dataset.c);
      toggleWindow(bIdx, f, c);
    }
  });

  // Enlace del Selector de Tema
  refs.themeSelect.addEventListener("change", (e) => {
    applyThemePreset(e.target.value);
  });

  // Enlace de presets temáticos
  refs.presetSelect.addEventListener("change", (e) => {
    applyPresetById(e.target.value, true);
  });

  // Enlace del Selector de Clima
  refs.weatherSelect.addEventListener("change", (e) => {
    state.weather = e.target.value;
    
    // Controlar enjambre de abejas
    if (state.weather === "bees") {
      audio.startBeeDrone();
    } else {
      audio.stopBeeDrone();
    }
    
    if (state.weather === "snow" && state.snowDrops.length === 0) createSnow();
    if (state.weather === "bees" && state.bees.length === 0) createBees();
    rebuildWeatherParticles();
  });

  // Slider de volumen del clima
  refs.weatherVolume.addEventListener("input", (e) => {
    state.weatherVolume = Number(e.target.value) / 100;
    refs.weatherVolumeVal.textContent = `${e.target.value}%`;
    audio.updateBeeDroneVolume();
  });

  // Slider de intensidad del clima (impacta densidad y velocidad visual)
  refs.weatherIntensity.addEventListener("input", (e) => {
    state.weatherIntensity = Number(e.target.value) / 100;
    refs.weatherIntensityVal.textContent = `${e.target.value}%`;
    rebuildWeatherParticles();
  });

  // Enlace de Activación de Flechas de Secuenciador
  document.querySelectorAll(".arrow-btn").forEach(btn => {
    const sweepId = btn.dataset.sweep;
    btn.addEventListener("click", () => {
      const sweep = state.sweeps[sweepId];
      sweep.active = !sweep.active;
      btn.classList.toggle("active", sweep.active);
      
      // Reiniciar playhead a posición de inicio al encenderse
      if (sweep.active) {
        if (sweepId === "L_TO_R") sweep.pos = 0;
        else if (sweepId === "R_TO_L") sweep.pos = 79;
        else if (sweepId === "T_TO_B") sweep.pos = 0;
        else if (sweepId === "B_TO_T") sweep.pos = 23;
        sweep.elapsed = 0;
      }
    });
  });

  // Enlace de los 4 Sliders de BPM, Delay Time y Feedback del Secuenciador
  ["L_TO_R", "R_TO_L", "T_TO_B", "B_TO_T"].forEach(sweepId => {
    const bpmSlider = document.getElementById(`bpmSlider_${sweepId}`);
    const bpmLabel = document.getElementById(`bpmVal_${sweepId}`);
    
    bpmSlider.addEventListener("input", (e) => {
      state.sweeps[sweepId].bpm = Number(e.target.value);
      bpmLabel.textContent = e.target.value;
    });

    const dlySlider = document.getElementById(`delayTime_${sweepId}`);
    const dlyLabel = document.getElementById(`delayTimeVal_${sweepId}`);

    dlySlider.addEventListener("input", (e) => {
      state.sweeps[sweepId].delayTime = Number(e.target.value);
      dlyLabel.textContent = `${e.target.value}ms`;
      // Actualizar el nodo de Audio de inmediato si ya está inicializado
      if (audio.ctx && audio.sweeps[sweepId]) {
        const now = audio.ctx.currentTime;
        audio.sweeps[sweepId].delay.delayTime.setValueAtTime(Number(e.target.value) / 1000, now);
      }
    });

    const fdbkSlider = document.getElementById(`delayFeedback_${sweepId}`);
    const fdbkLabel = document.getElementById(`delayFeedbackVal_${sweepId}`);

    fdbkSlider.addEventListener("input", (e) => {
      state.sweeps[sweepId].delayFeedback = Number(e.target.value);
      fdbkLabel.textContent = `${e.target.value}%`;
      // Actualizar el nodo de Audio de inmediato si ya está inicializado
      if (audio.ctx && audio.sweeps[sweepId]) {
        const now = audio.ctx.currentTime;
        audio.sweeps[sweepId].feedback.gain.setValueAtTime(Number(e.target.value) / 100, now);
      }
    });
  });
}

// Activar audio al primer click en la página
document.addEventListener("click", () => {
  audio.init();
  if (state.audioEnabled) {
    if (state.weather === "bees") {
      audio.startBeeDrone();
    }
    if (isLifeDroneEnabled()) {
      audio.startCarDrone();
      audio.updateCarDroneVolume();
    }
  }
}, { once: true });

// Bucle secundario de simulación física y eventos (12 FPS = 83ms)
function startSecondaryLoops() {
  state.lastTime = performance.now();
  const tickMs = state.mobilePerformanceMode ? 120 : 83;
  
  setInterval(() => {
    const now = performance.now();
    
    // Procesar avance del secuenciador asíncrono
    updateSequencers(now);
    
    // Procesar física climática
    if (state.weather === "rain" || state.weather === "storm") {
      stepRain();
      
      // Relámpagos aleatorios en tormenta
      if (state.weather === "storm" && Math.random() < 0.008 * getClimateDensityMultiplier()) {
        document.body.classList.add("lightning-flash");
        audio.playThunder();
        setTimeout(() => {
          document.body.classList.remove("lightning-flash");
        }, 80);
      }
    } else if (state.weather === "snow") {
      stepSnow();
    } else if (state.weather === "bees") {
      stepBees();
    }
    
    // Procesar Azar Automático de ventanas
    if (state.autoRandomActive) {
      state.autoRandomElapsed += tickMs;
      if (state.autoRandomElapsed >= state.autoRandomInterval * 1000) {
        state.autoRandomElapsed = 0;
        state.buildings.forEach(b => {
          b.windows.forEach(row => {
            row.forEach(w => w.on = Math.random() < 0.28);
          });
        });
      }
    }
    
    stepVehicles();
    stepElevator();
    drawCanvas();
  }, tickMs);

  // Simulación autónoma vecinal lenta (cada 1.5 segundos)
  setInterval(() => {
    simulateResidentialLife();
  }, 1500);
}

// Cambiar el tema visual de la consola en la etiqueta body
function setTheme(themeName) {
  document.body.classList.remove(
    "theme-dos-blue",
    "theme-light-paper",
    "theme-green-screen",
    "theme-amber-terminal",
    "theme-dark-city"
  );
  
  if (themeName) {
    document.body.classList.add(`theme-${themeName}`);
    state.currentTheme = themeName;
  }
}

// Cargar y procesar la configuración YAML de manera asíncrona
async function loadConfig() {
  try {
    const response = await fetch('./config.yaml');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const yamlText = await response.text();
    const config = jsyaml.load(yamlText);

    if (config) {
      // 1. Cargar Estado Inicial
      if (config.initial_state) {
        state.masterVolume = config.initial_state.masterVolume !== undefined ? config.initial_state.masterVolume : state.masterVolume;
        state.weatherVolume = config.initial_state.weatherVolume !== undefined ? config.initial_state.weatherVolume : state.weatherVolume;
        state.weatherIntensity = config.initial_state.weatherIntensity !== undefined ? clamp(config.initial_state.weatherIntensity, 0, 1) : state.weatherIntensity;
        if (config.initial_state.lifeMode !== undefined) {
          state.lifeMode = config.initial_state.lifeMode;
        } else if (config.initial_state.lifeActive !== undefined) {
          state.lifeMode = config.initial_state.lifeActive ? "on_drone" : "off";
        }
        state.weather = config.initial_state.weather !== undefined ? config.initial_state.weather : state.weather;
        state.currentTheme = config.initial_state.theme !== undefined ? config.initial_state.theme : state.currentTheme;
        state.currentPreset = config.initial_state.preset !== undefined ? config.initial_state.preset : state.currentPreset;
        state.autoRandomActive = config.initial_state.autoRandomActive !== undefined ? config.initial_state.autoRandomActive : state.autoRandomActive;
        state.autoRandomInterval = config.initial_state.autoRandomInterval !== undefined ? config.initial_state.autoRandomInterval : state.autoRandomInterval;
      }

      // 2. Cargar Configuración de Edificios
      if (config.buildings && Array.isArray(config.buildings)) {
        BUILDINGS_CONFIG.length = 0;
        config.buildings.forEach(b => BUILDINGS_CONFIG.push(b));
      }

      // 3. Cargar Canales
      if (config.channels && Array.isArray(config.channels)) {
        config.channels.forEach((ch, idx) => {
          if (state.channels[idx]) {
            state.channels[idx].volume = ch.volume !== undefined ? ch.volume : state.channels[idx].volume;
            state.channels[idx].timbre = ch.timbre !== undefined ? ch.timbre : state.channels[idx].timbre;
            state.channels[idx].scale = ch.scale !== undefined ? ch.scale : state.channels[idx].scale;
            state.channels[idx].rootFreq = ch.rootFreq !== undefined ? ch.rootFreq : state.channels[idx].rootFreq;
          }
        });
      }

      // 4. Cargar Secuenciadores (Sweeps)
      if (config.sweeps) {
        Object.keys(config.sweeps).forEach(sweepId => {
          if (state.sweeps[sweepId] && config.sweeps[sweepId]) {
            const yamlSweep = config.sweeps[sweepId];
            state.sweeps[sweepId].active = yamlSweep.active !== undefined ? yamlSweep.active : state.sweeps[sweepId].active;
            state.sweeps[sweepId].pos = yamlSweep.pos !== undefined ? yamlSweep.pos : state.sweeps[sweepId].pos;
            state.sweeps[sweepId].bpm = yamlSweep.bpm !== undefined ? yamlSweep.bpm : state.sweeps[sweepId].bpm;
            state.sweeps[sweepId].delayTime = yamlSweep.delayTime !== undefined ? yamlSweep.delayTime : state.sweeps[sweepId].delayTime;
            state.sweeps[sweepId].delayFeedback = yamlSweep.delayFeedback !== undefined ? yamlSweep.delayFeedback : state.sweeps[sweepId].delayFeedback;
          }
        });
      }

      // 5. Presets temáticos configurables en YAML
      const presetsFromYaml = Array.isArray(config.thematic_presets) ? config.thematic_presets : [];
      const defaultPreset = normalizePreset({
        id: "default_city",
        label: "Ciudad Base",
        theme: state.currentTheme,
        weather: state.weather,
        weatherVolume: state.weatherVolume,
        weatherIntensity: state.weatherIntensity,
        lifeMode: state.lifeMode,
        autoRandomActive: state.autoRandomActive,
        autoRandomInterval: state.autoRandomInterval,
        buildings: BUILDINGS_CONFIG,
        channels: state.channels.map(ch => ({
          volume: ch.volume,
          timbre: ch.timbre,
          scale: ch.scale,
          rootFreq: ch.rootFreq
        })),
        sweeps: state.sweeps
      }, "default_city");
      state.thematicPresets = [defaultPreset, ...presetsFromYaml.map((p, idx) => normalizePreset(p, `preset_${idx + 1}`))];
    }
  } catch (error) {
    console.error("Error al cargar config.yaml:", error);
  }
}

// Sincronizar todos los inputs y visuales de la barra lateral con el estado
function syncDOMToState() {
  if (refs.volumeSlider) {
    refs.volumeSlider.value = Math.round(state.masterVolume * 100);
    refs.volumeVal.textContent = `${Math.round(state.masterVolume * 100)}%`;
  }
  if (refs.audioToggle) {
    refs.audioToggle.checked = state.audioEnabled;
  }
  if (refs.weatherSelect) {
    refs.weatherSelect.value = state.weather;
  }
  if (refs.presetSelect) {
    refs.presetSelect.value = state.currentPreset;
  }
  if (refs.weatherVolume) {
    refs.weatherVolume.value = Math.round(state.weatherVolume * 100);
    refs.weatherVolumeVal.textContent = `${Math.round(state.weatherVolume * 100)}%`;
  }
  if (refs.weatherIntensity) {
    refs.weatherIntensity.value = Math.round(state.weatherIntensity * 100);
    refs.weatherIntensityVal.textContent = `${Math.round(state.weatherIntensity * 100)}%`;
  }
  if (refs.autoRandomToggle) {
    refs.autoRandomToggle.checked = state.autoRandomActive;
  }
  if (refs.autoRandomInterval) {
    refs.autoRandomInterval.value = state.autoRandomInterval;
    refs.autoRandomIntervalVal.textContent = `${state.autoRandomInterval}s`;
  }
  if (refs.btnLifeToggle) {
      const span = refs.btnLifeToggle.querySelector("span");
      if (span) {
      span.textContent = state.lifeMode === "off"
        ? "[ VIDA: OFF ]"
        : (state.lifeMode === "on_drone" ? "[ VIDA: ON + DRONE ]" : "[ VIDA: ON - DRONE ]");
      }
  }

  // Sincronizar active channel selectors/sliders
  syncActiveChannelToUI();

  // Sincronizar sweeps (botones activos y sliders)
  Object.keys(state.sweeps).forEach(sweepId => {
    const sweep = state.sweeps[sweepId];
    
    // Activar/desactivar botón visualmente
    const btn = document.querySelector(`.arrow-btn[data-sweep="${sweepId}"]`);
    if (btn) {
      btn.classList.toggle("active", sweep.active);
    }
    
    // Sincronizar sliders y labels
    const bpmSlider = document.getElementById(`bpmSlider_${sweepId}`);
    const bpmLabel = document.getElementById(`bpmVal_${sweepId}`);
    if (bpmSlider && bpmLabel) {
      bpmSlider.value = sweep.bpm;
      bpmLabel.textContent = sweep.bpm;
    }

    const dlySlider = document.getElementById(`delayTime_${sweepId}`);
    const dlyLabel = document.getElementById(`delayTimeVal_${sweepId}`);
    if (dlySlider && dlyLabel) {
      dlySlider.value = sweep.delayTime;
      dlyLabel.textContent = `${sweep.delayTime}ms`;
    }

    const fdbkSlider = document.getElementById(`delayFeedback_${sweepId}`);
    const fdbkLabel = document.getElementById(`delayFeedbackVal_${sweepId}`);
    if (fdbkSlider && fdbkLabel) {
      fdbkSlider.value = sweep.delayFeedback;
      fdbkLabel.textContent = `${sweep.delayFeedback}%`;
    }
  });
}

// Inicialización de la aplicación
async function initApp() {
  setupPerformanceMode();

  // Cargar configuración de YAML antes de inicializar notas y skyline
  await loadConfig();

  createStars();
  rebuildWeatherParticles();
  
  initAllChannelNotes();
  initSkyline();
  bindConsoleUI();
  populatePresetSelect();
  applyThemePreset(state.currentTheme);
  
  // Sincronizar UI con el estado configurado en el YAML
  syncDOMToState();

  // Aplicar preset inicial si existe (permite escenas temáticas YAML)
  if (state.currentPreset) {
    applyPresetById(state.currentPreset, true);
  }
  
  // Si el modo vida está activo y el audio está habilitado, iniciar el drone de autos
  if (isLifeDroneEnabled() && state.audioEnabled) {
    audio.startCarDrone();
    audio.updateCarDroneVolume();
  }
  
  // Forzar actualización inicial
  drawCanvas();
  
  // Iniciar bucles principales
  startSecondaryLoops();
}

// Cargar aplicación al inicio
initApp();
