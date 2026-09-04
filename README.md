# Videos Next Layer

Pipeline automatizado de edición de video vertical (9:16) con **Remotion** + **Google Drive**.

Un solo comando baja los assets del proyecto desde Drive, mide el clip con ffprobe y renderiza un
Short/Reel de 1080x1920 con gancho superior, subtítulos opcionales y barra de progreso animada.

```bash
npm run process -- --project "Video 41" --hook "Tu gancho aquí"
# -> out/final.mp4
```

## 1. Estructura esperada en Drive

La carpeta raíz (`DRIVE_FOLDER_ID`) contiene una subcarpeta por video. Cada proyecto trae sus
componentes dispersos y el script los recorre recursivamente:

```
Carpeta raíz/
├── Video 41/
│   ├── Videos/     ← .MOV / .mp4  (de aquí sale el clip principal: el más pesado)
│   ├── Sonido/     ← Musica/, SFX/, Audios/
│   ├── Archivos/   ← imágenes y otros insumos
│   ├── Proyecto/
│   └── Export/
├── Video 43/
└── ...
```

No hace falta que los nombres coincidan: el script baja todo lo que sea video, audio o imagen
(configurable con `DRIVE_ASSET_KINDS`) respetando la estructura de carpetas dentro de
`public/input/<proyecto>/`, y escribe un `manifest.json` con la clasificación de cada asset.

## 2. Credenciales de Google Cloud

Elige **una** de las dos opciones y copia `.env.example` a `.env`.

### Opción A — Service Account (recomendada para automatizar)

1. [Google Cloud Console](https://console.cloud.google.com/) → crea o elige un proyecto.
2. **APIs y servicios → Biblioteca** → habilita **Google Drive API**.
3. **APIs y servicios → Credenciales → Crear credenciales → Cuenta de servicio**.
4. En la cuenta creada: **Claves → Agregar clave → Crear clave nueva → JSON**. Descarga el archivo
   como `credentials.json` en la raíz del repo (ya está en `.gitignore`).
5. **Importante:** abre la carpeta en Drive → **Compartir** → agrega el `client_email` del JSON
   (algo como `nombre@proyecto.iam.gserviceaccount.com`) con permiso de **Lector**. Sin esto la API
   responde 404 aunque la carpeta exista.
6. En `.env`: `GOOGLE_SERVICE_ACCOUNT_KEY=./credentials.json`
   (también acepta el JSON en una línea o en base64, útil para CI).

### Opción B — OAuth2 con tu cuenta personal

Sirve cuando la carpeta te la compartieron a ti y no puedes agregar a la Service Account.

1. Habilita la Drive API igual que arriba.
2. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación de escritorio**.
3. Genera un *refresh token* con scope `https://www.googleapis.com/auth/drive.readonly`
   (por ejemplo con [OAuth Playground](https://developers.google.com/oauthplayground/), activando
   *Use your own OAuth credentials*).
4. En `.env`: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`.

## 3. Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Abre Remotion Studio para previsualizar y ajustar props en vivo. |
| `npm run fetch-drive -- --list` | Lista los proyectos disponibles en la carpeta raíz. |
| `npm run fetch-drive -- --project "Video 41"` | Descarga ese proyecto a `public/input/video-41/`. |
| `npm run process -- --project "Video 41"` | Pipeline completo: Drive → metadata → render. |
| `npm run process -- --skip-fetch` | Renderiza con lo ya descargado (sin volver a bajar). |
| `npm run render` | Render directo con los `defaultProps` de la composición. |
| `npm run sample` | Genera `public/input/sample.mp4` para probar sin Drive. |
| `npm run typecheck` | `tsc --noEmit`. |

### Flags útiles de `process`

```bash
npm run process -- \
  --project "Video 41" \        # carpeta del proyecto (nombre parcial o ID)
  --clip DSCF7555 \             # fuerza el clip principal (por defecto, el más pesado)
  --hook "Compra energía en 3 clics" \
  --subtitles ./subs.json \     # [{ "text": "...", "fromSeconds": 0, "toSeconds": 2.5 }]
  --audio input/video-41/Sonido/Musica/track.mp3 \
  --start 12 --max-seconds 30 \ # recorta desde el segundo 12, máximo 30 s
  --accent "#22D3EE" \
  --transcode \                 # normaliza .MOV a H.264/mp4 antes de renderizar
  --out-file out/video-41.mp4 \
  --dry-run                     # solo escribe out/props.json, no renderiza
```

`--dry-run`, `--kinds`, `--max-size` y `--folder` también funcionan en `fetch-drive`.

## 4. La composición `VerticalClip`

`src/Root.tsx` registra `VerticalClip` en 1080x1920 @ 30fps con 900 frames (30 s) por defecto. Si
llega `durationInSeconds` en los props (lo calcula `processClip.ts` con ffprobe) o si el archivo se
puede leer con `@remotion/media-utils`, `calculateMetadata` ajusta la duración al clip real.

Props (`src/lib/types.ts`):

| Prop | Descripción |
| --- | --- |
| `src` | Ruta del video fuente relativa a `public/` (o URL absoluta). |
| `hook` | Texto de gancho / título superior. |
| `subtitles` | Opcional: `{ text, fromSeconds, toSeconds }[]`. |
| `audioSrc`, `audioVolume`, `videoVolume` | Pista de audio externa y niveles. |
| `startFromSeconds`, `durationInSeconds` | Recorte del clip fuente. |
| `accentColor` | Color de la barra de progreso y del subrayado del gancho. |

El video usa `<OffthreadVideo>` con `objectFit: cover`, centrado y recortado a 9:16; la barra de
progreso del borde inferior se calcula con `useCurrentFrame()` y `useVideoConfig()`.

## 5. Notas

- **`.MOV` de cámara:** `OffthreadVideo` los decodifica con el FFmpeg que trae Remotion, así que
  normalmente no hace falta convertir. Si el preview del Studio va lento, usa `--transcode`.
- **FFmpeg/ffprobe:** vienen incluidos con Remotion (`npx remotion ffprobe`), no se instala nada aparte.
- **Tailwind v4** está habilitado vía `@remotion/tailwind-v4` en `remotion.config.ts`; los valores
  animados van en estilos inline (recomendación de Remotion) y el layout estático en clases.
- `.env`, `credentials*.json`, `public/input/` y `out/` están ignorados por git.
