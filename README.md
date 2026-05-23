# CitySynth

CitySynth es un secuenciador audiovisual generativo en arte ASCII, con estética terminal/chiptune, interacción en tiempo real y climas que afectan tanto la visual como el audio.

## Demo

Cuando GitHub Pages esté activo, podés jugarlo online desde:

- `https://vlasvlasvlas.github.io/citysynth/`

## Características principales

- Skyline ASCII interactivo de 8 edificios.
- 8 canales sonoros independientes (uno por edificio).
- Edición en vivo de:
  - Volumen por canal
  - Timbre (`sine`, `triangle`, `square`, `sawtooth`)
  - Escala musical
  - Frecuencia raíz
- 4 barridos secuenciadores simultáneos:
  - Izquierda → Derecha
  - Derecha → Izquierda
  - Arriba → Abajo
  - Abajo → Arriba
- Delay/feedback por barrido (eco por dirección).
- Climas reactivos:
  - `clear`
  - `rain`
  - `snow`
  - `storm`
  - `bees`
- Modo vida urbana con 3 estados:
  - `OFF`
  - `ON + DRONE`
  - `ON - DRONE`
- Configuración inicial por `config.yaml`.

## Controles de uso

- Click sobre ventanas: prende/apaga notas.
- `[ CONFIG ]`: abre sidebar con audio, canales, barridos, clima y herramientas.
- `[ ? ]`: abre ayuda rápida dentro de la app.
- `VIDA`: alterna entre los 3 modos de simulación urbana.

## Cambios recientes incluidos

- Abejas simplificadas con char único `*`.
- Lluvia visual uniforme con `│`.
- Sonido de gotas más fuerte.
- En tormenta, gotas al menos 2x de intensidad respecto a lluvia.
- Corrección de conexiones de delay para evitar acumulación de rutas wet en el audio.

## Estructura del proyecto

- `index.html`: layout principal y controles.
- `style.css`: temas ANSI/terminal y UI.
- `app.js`: motor visual, simulación, secuenciador y audio WebAudio.
- `config.yaml`: estado inicial de clima/audio/canales/barridos.

## Ejecución local

Como la app carga `config.yaml` vía `fetch`, necesitás servirla por HTTP local (no abrir `index.html` con `file://`).

Opciones simples:

1. Python

```bash
cd citysynth
python3 -m http.server 8080
```

Abrí: `http://localhost:8080`

2. Node (si usás un server estático equivalente)

Cualquier servidor estático funciona mientras sirva los archivos en la raíz del repo.

## Deploy automático con GitHub Actions + Pages

Este repo incluye workflow para deploy automático a GitHub Pages en cada push a `main`.

Pasos necesarios (una sola vez en GitHub):

1. Ir a `Settings > Pages`.
2. En `Build and deployment`, elegir `Source: GitHub Actions`.
3. Verificar que el workflow `Deploy to GitHub Pages` corra en el próximo push.

Luego de eso, cada push a `main` publica la versión nueva.

## Stack técnico

- HTML5
- CSS3
- JavaScript Vanilla
- Web Audio API
- JS-YAML (CDN)

## Licencia

Si querés, te agrego una licencia explícita (`MIT`, por ejemplo) en un próximo commit.
