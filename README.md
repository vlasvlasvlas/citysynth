# CitySynth

CitySynth es un secuenciador audiovisual generativo en arte ASCII, con estética terminal/chiptune, interacción en tiempo real y climas que afectan visual, comportamiento y audio.

## Demo

- [GitHub Pages](https://vlasvlasvlas.github.io/citysynth/)

## Qué incluye hoy

- Skyline ASCII interactivo de 8 edificios.
- 8 canales sonoros independientes (uno por edificio) con mute binario, timbre, escala y nota raíz.
- 4 barridos secuenciadores simultáneos (`→`, `←`, `↓`, `↑`) con BPM por barrido.
- Climas reactivos: `clear`, `rain`, `snow`, `storm`, `bees`.
- Modo vida urbana con 3 estados:
  - `OFF`
  - `ON + DRONE`
  - `ON - DRONE`
- Presets temáticos cargados desde YAML.
- Overlay inicial de arranque (`CLICK PARA INICIAR`) y también inicio por cualquier tecla.

## Cambios funcionales importantes

- El audio no arranca al abrir la página: se desbloquea por gesto de usuario (click o tecla).
- El mensaje `[SIN BARRIDOS ACTIVOS]` fue removido.
- Un único volumen maestro controla toda la salida de audio.
- La salida final de audio se fuerza a mono antes del limiter y del destino.
- Nieve tiene un micro-sonido de impacto corto, seco y suave.
- Abejas ajustadas a un drone más agudo y suave.
- Clima con reverb dedicada (`REV CLIMA`) implementada como reverb real por convolución (no eco simple).
- Gotas de lluvia retocadas para un ataque más brillante y corto, más parecido a gotas.
- Delay/echo de barridos arranca siempre en `0` (la persona lo sube si quiere).

## Controles principales

- Click en ventanas: enciende/apaga nota.
- `[ CONFIG ]`: abre sidebar de controles.
- `[ ? ]`: ayuda rápida.
- `MUTE EDIFICIO`: silencia y oculta el edificio seleccionado.
- `VIDA`: alterna `OFF` / `ON + DRONE` / `ON - DRONE`.
- `NOTA DRONE` (visible en `ON + DRONE`): cambia frecuencia base del drone de vida en tiempo real.

## Defaults actuales

Estos valores se fuerzan al iniciar y al cambiar de preset:

- `INT CLIMA`: `50%`
- `REV CLIMA`: `0%`
- `AUTO AZAR INTERV`: `2s`
- Delay/Feedback de barridos: `0` por defecto

## YAML (`config.yaml`) explicado

La app carga `config.yaml` por `fetch` al inicio. Estructura principal:

- `initial_state`: estado inicial general de la app.
- `buildings`: geometría y tipo de los 8 edificios.
- `channels`: configuración musical y mute por edificio/canal.
- `sweeps`: estado inicial de cada barrido.
- `thematic_presets`: presets completos seleccionables en UI.

### 1) `initial_state`

Ejemplo de claves:

- `masterVolume`: volumen maestro (`0..1`).
- `weatherIntensity`: intensidad clima (`0..1`).
- `weatherReverb`: mezcla de reverb de clima (`0..1`).
- `lifeMode`: `off | on_drone | on_silent`.
- `weather`: `clear | rain | snow | storm | bees`.
- `theme`: tema visual.
- `preset`: id de preset a cargar al inicio.
- `autoRandomActive`: azar automático ON/OFF.
- `autoRandomInterval`: intervalo (segundos).

Nota: aunque YAML pueda traer otros valores de clima, la app actualmente fija `VOL/INT/REV` en `50/50/0` al inicio y al aplicar presets.

### 2) `buildings`

Cada edificio define:

- `id`
- `start_x`
- `width`
- `bh` (altura)
- `floors`
- `cols`
- `type`

### 3) `channels`

Cada canal (0..7) define:

- `muted` (`true | false`)
- `timbre` (`sine`, `triangle`, `square`, `sawtooth`)
- `scale` (por ejemplo `minor`, `dorian`, `blues`, etc.)
- `rootFreq` (Hz)

### 4) `sweeps`

Para cada barrido (`L_TO_R`, `R_TO_L`, `T_TO_B`, `B_TO_T`):

- `active`
- `pos`
- `bpm`
- `delayTime`
- `delayFeedback`

Nota: delay/feedback quedan inicializados en `0` por defecto en runtime.

### 5) `thematic_presets`

Cada preset puede definir:

- estado general (`theme`, `weather`, `lifeMode`, auto azar)
- `buildings` completo
- `channels` completo
- `sweeps` completo

Al seleccionar preset, la app aplica configuración visual/musical y fuerza defaults de clima y echo según lo indicado arriba.

## Estructura del repo

- `index.html`: estructura UI + controles.
- `style.css`: temas terminal/ANSI y estilos.
- `app.js`: motor de simulación, render ASCII, secuenciador y audio WebAudio.
- `config.yaml`: configuración inicial y presets.

## Ejecutar local

La app necesita servidor HTTP (porque carga YAML por `fetch`).

```bash
cd citysynth
python3 -m http.server 8000
```

Abrir: [http://localhost:8000](http://localhost:8000)

## Deploy

Deploy automático a GitHub Pages en cada push a `main` (workflow ya incluido).

## Stack

- HTML5
- CSS3
- JavaScript (Vanilla)
- Web Audio API
- JS-YAML (CDN)
## License

MIT License — © 2026 [Vladimiro Bellini](https://github.com/vlasvlasvlas). Free to use and modify, attribution required.
