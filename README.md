# Videos Next Layer

Pipeline automatizado de edición de video vertical (9:16) con **Remotion** + **Google Drive**,
pensado para los reels de **Next Layer** (impresión 3D).

Un plan de edición en JSON + los clips crudos del proyecto en Drive → un reel listo para publicar,
con gancho animado, subtítulos karaoke transcritos del audio real, corte de silencios, SFX propios
y corrección de color.

```bash
npm run reel -- --plan plans/video-46.json     # -> renders/video-46-reel.mp4
```

## 1. Estructura esperada en Drive

La carpeta raíz (`DRIVE_FOLDER_ID`) contiene una subcarpeta por video, y cada proyecto trae sus
componentes dispersos:

```
Carpeta raíz/
├── Video 46/
│   ├── Videos/     ← .MOV / .mp4 de cámara (4K, HEVC, con metadato de rotación)
│   ├── Sonido/     ← Musica/, SFX/, Audios/
│   ├── Archivos/   ← imágenes y otros insumos
│   ├── Proyecto/
│   └── Export/
├── Video 45/
└── ...
```

`fetchDriveClip.ts` recorre el proyecto completo, baja lo que sea video/audio/imagen respetando la
estructura de carpetas en `public/input/<proyecto>/` y deja un `manifest.json` con todo clasificado.

## 2. Credenciales de Google Cloud

Copia `.env.example` a `.env` y elige **una** opción.

### Opción A — Service Account (recomendada para automatizar)

1. [Google Cloud Console](https://console.cloud.google.com/) → proyecto nuevo o existente.
2. **APIs y servicios → Biblioteca** → habilita **Google Drive API**.
3. **Credenciales → Crear credenciales → Cuenta de servicio**.
4. En la cuenta creada: **Claves → Agregar clave → JSON**. Guarda el archivo como
   `credentials.json` en la raíz (está en `.gitignore`).
5. **Importante:** comparte la carpeta de Drive con el `client_email` del JSON
   (`...@...iam.gserviceaccount.com`) con permiso de **Lector**. Sin eso la API responde 404.
6. `GOOGLE_SERVICE_ACCOUNT_KEY=./credentials.json` (también acepta el JSON inline o en base64).

### Opción B — OAuth2 con tu cuenta

Útil cuando la carpeta te la compartieron y no puedes agregar la Service Account.

1. Habilita la Drive API igual que arriba.
2. **Credenciales → ID de cliente de OAuth → Aplicación de escritorio**.
3. Genera un *refresh token* con scope `https://www.googleapis.com/auth/drive.readonly`
   (por ejemplo en [OAuth Playground](https://developers.google.com/oauthplayground/), marcando
   *Use your own OAuth credentials*).
4. Completa `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`.

## 3. El flujo completo

```bash
npm run status                                   # dónde quedó todo y cuál es el paso que sigue
npm run fetch-drive -- --list                    # ver proyectos disponibles
npm run fetch-drive -- --project "Video 46"      # baja todo a public/input/video-46/
npm run audio -- --dir public/input/video-46     # extrae el audio de cada clip a WAV 16 kHz
npm run transcribe -- --dir public/input/video-46/_audio --model medium --language es
npm run fonts                                    # baja las tipografías al repo (una sola vez)
npm run sfx                                      # genera los efectos (una sola vez)
npm run reel -- --plan plans/video-46.json       # proxies + corte de silencios + render
```

Qué hace cada paso:

| Script | Qué resuelve |
| --- | --- |
| `status` | Radiografía del pipeline: qué está hecho, qué falta y el comando que sigue. Se deduce del disco, así que sirve para retomar una sesión cortada. |
| `fetch-drive` | Descarga el proyecto desde Drive con caché por tamaño y arma el `manifest.json`. |
| `audio` | Extrae el audio de cada clip a WAV mono 16 kHz (lo que necesita whisper). |
| `transcribe` | Instala whisper.cpp, detecta qué clips tienen voz (mide el nivel, no transcribe B-roll mudo) y guarda frases + palabras con timestamp. Filtra las marcas que whisper inventa en los silencios (`[BLANK_AUDIO]`, `(música)`). |
| `fonts` | Descarga Anton e Inter a `public/fonts/` y genera `src/fonts.generated.ts`. El Chrome del render no siempre puede salir a fonts.gstatic.com, así que las fuentes viven en el repo. |
| `sfx` | Sintetiza `whoosh`, `tick`, `riser` e `impact` en `public/sfx/` — sin samples externos, sin problemas de licencia. |
| `reel` | Normaliza cada fuente a un proxy 1080x1920 H.264 (aplica la rotación de cámara y baja el 4K/HEVC), **corta los silencios** usando la transcripción, arma los props y renderiza. |
| `review` | Saca 8 frames parejos del render (`npm run review -- renders/video-46-reel.mp4`) y un resumen del nivel de audio, para revisar sin sacar cada frame a mano. |

## 4. El plan de edición

Un JSON por video en `plans/`. Define el orden de los clips, el gancho y los textos:

```jsonc
{
  "project": "video-46",
  "dir": "public/input/video-46/Videos",
  "hook": "El filamento ya no *cabía*",   // *lo marcado* va resaltado en color de acento
  "cta": "Next Layer",
  "ctaSub": "Impresión 3D",
  "accentColor": "#FF8A3D",
  "clips": [
    {
      "file": "DSCF7528.MOV",
      "label": "01 · El problema",         // chip superior
      "caption": "Carretes por todos lados", // solo se usa si el clip no tiene voz
      "startFromSeconds": 1.2,
      "durationInSeconds": 4.2
    }
  ]
}
```

- **Clip con voz** → se descarta el silencio y cada tramo hablado se vuelve un corte con
  subtítulos karaoke (la palabra que suena se pinta con el color de acento).
- **Clip sin voz (B-roll)** → se usa la ventana `startFromSeconds` + `durationInSeconds` y el
  `caption` escrito a mano.
- `ignoreSpeech: true` fuerza a tratar un clip como B-roll.

## 5. Composiciones

| Composición | Para qué |
| --- | --- |
| `VerticalReel` | El montaje: varios cortes, transiciones, gancho, subtítulos, SFX, grade y barra de progreso segmentada. |
| `VerticalClip` | Un solo clip a pantalla completa con gancho y subtítulos opcionales. |
| `SampleSource` | Clip sintético para probar el pipeline sin Drive (`npm run sample`). |

Todas en 1080x1920 @ 30fps. `npm run dev` abre Remotion Studio para revisar y ajustar props en vivo.

### Sistema gráfico de `VerticalReel`

- **Gancho**: tipografía display (Anton) que entra palabra por palabra, con caja de acento en lo resaltado.
- **Subtítulos**: pastilla con blur, 2-3 palabras por pantalla, palabra activa en color de acento.
- **Chips de sección**: `01 · El problema`, entran desde la izquierda.
- **Color**: saturación/contraste + split-tone cálido-frío, viñeta y grano de película animado.
- **Movimiento**: zoom lento por corte y golpe de escala al entrar.
- **Sonido**: voz original + riser de apertura, whoosh en cada corte e impacto en el cierre.
- **Progreso**: barra segmentada, un tramo por corte.

## 6. Retomar una sesión cortada

Todos los pasos son reanudables: descargas, proxies, transcripciones y renders se saltan si el
resultado ya existe y está al día (`--force` para rehacerlos a propósito). Para continuar trabajo
de otra sesión:

1. `npm run status` — estado real, deducido del disco.
2. `docs/journal.md` — el *por qué* de las decisiones y qué quedó esperando una decisión humana.
3. `CLAUDE.md` — las reglas de trabajo del repo.

## 7. Notas

- **FFmpeg/ffprobe** vienen con Remotion (`npx remotion ffmpeg`), no hay que instalar nada aparte.
- **Los .MOV de cámara** son 4K HEVC 10 bits con rotación en el contenedor: el paso de proxy los
  deja en 1080x1920 H.264 8 bits, que es lo que hace el render viable.
- **Música**: deja el archivo en `Sonido/Musica/` del proyecto y pásalo con `--music`. Ojo con usar
  temas comerciales: los detecta el Content ID de Instagram y YouTube.
- `.env`, `credentials*.json`, `public/input/`, `out/` y `whisper.cpp/` están ignorados por git;
  los reels terminados van a `renders/`.
