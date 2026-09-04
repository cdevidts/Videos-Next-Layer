# OmniRoute paso a paso (para quien nunca abrió una terminal)

Guía completa para dejar OmniRoute andando en tu computador. Tiempo real: unos 20 minutos la
primera vez. Después son 2 segundos.

**Qué vas a lograr:** un comando extra, `claude-omni`, que usa modelos gratis de otros proveedores.
Tu `claude` de siempre no se toca.

**Antes de empezar, ten claro:** esto funciona solo en tu computador, no desde el celular. Y el que
te responde con `claude-omni` no es Claude, son otros modelos.

---

## Parte 0 · Instalar Node.js (sin terminal, 5 min)

OmniRoute está hecho en Node.js. Si no lo tienes, nada de lo demás funciona.

1. Entra a **https://nodejs.org**
2. Descarga el botón grande que dice **LTS** (es la versión estable).
3. Abre el archivo descargado y dale siguiente, siguiente, instalar. Como cualquier programa.

Listo. No hay que configurar nada.

---

## Parte 1 · Abrir la terminal

Es una ventana donde escribes texto y aprietas Enter. No se rompe nada por abrirla.

**En Mac:**
1. Aprieta `Command` + `barra espaciadora` (se abre el buscador).
2. Escribe `Terminal` y aprieta Enter.
3. Se abre una ventana blanca o negra con una línea de texto y un cursor parpadeando.

**En Windows:**
1. Aprieta la tecla de Windows.
2. Escribe `PowerShell` y aprieta Enter.
3. Se abre una ventana azul oscuro.

Puedes copiar y pegar en esa ventana como en cualquier lado (`Command+V` en Mac,
`Ctrl+V` o clic derecho en Windows).

---

## Parte 2 · Instalar OmniRoute (1 comando)

Copia esta línea, pégala en la terminal y aprieta Enter:

```bash
npm install -g omniroute
```

**Qué vas a ver:** un montón de texto pasando, unas barritas de progreso, y al final algo como
`added 200 packages in 45s`. Puede tardar un par de minutos. Eso es todo.

**Si aparece un error que dice `EACCES` o `permission denied`** (típico en Mac): escribe esto en
vez de lo anterior:

```bash
sudo npm install -g omniroute
```

Te va a pedir la contraseña de tu computador. **Ojo: mientras escribes la contraseña no se ve
nada, ni puntitos.** Es normal, escríbela igual y aprieta Enter.

---

## Parte 3 · Prenderlo

Escribe esto y aprieta Enter:

```bash
omniroute
```

**Qué vas a ver:** unas líneas de texto y algo tipo `listening on port 20128`. La ventana se queda
"pegada", como si estuviera trabajando. **Eso está bien: significa que está prendido.**

⚠️ **No cierres esa ventana.** Si la cierras, OmniRoute se apaga. Déjala abierta en segundo plano
(minimizada está bien).

---

## Parte 4 · Configurarlo desde el navegador

Ahora sí, nada de terminal.

1. Abre tu navegador y entra a **http://localhost:20128**
2. Se abre un panel de control. Busca la sección **Endpoints**.
3. Genera una API key. Te va a mostrar un texto largo tipo `sk-or-a1b2c3...`
   **Cópialo y guárdalo** en algún lado por un rato — lo necesitas en la Parte 5.
4. Ahora anda a la sección **Providers**. Ahí conectas los proveedores de modelos.
   Empieza por los que dicen *free* o no piden API key: con esos ya funciona.

---

## Parte 5 · Conectar Claude Code

Hay que agregar dos líneas en un archivo de configuración de Claude Code. Tienes dos formas.

### Forma A — Que Claude lo haga por ti (la más fácil)

Abre Claude Code como siempre (la app de escritorio) y pídele exactamente esto, reemplazando la
key por la tuya:

> Edita mi archivo `~/.claude/settings.json` y agrega dentro de `env` estas dos variables:
> `ANTHROPIC_BASE_URL` con el valor `http://localhost:20128/v1` y `ANTHROPIC_AUTH_TOKEN` con el
> valor `<PEGA-TU-KEY-ACÁ>`. Haz una copia de respaldo del archivo antes de tocarlo.

Claude sabe hacer eso. Es un archivo suyo.

**Importante:** con la Forma A, **todo** tu Claude Code pasa por OmniRoute. Si el gateway está
apagado, Claude Code deja de responder. Para volver atrás, le pides que borre esas dos líneas.

### Forma B — Solo cuando tú quieras (más segura, necesita el repo bajado)

Si tienes este repositorio en tu computador, en la terminal escribe:

```bash
bash scripts/setup-omniroute.sh link --key TU_KEY_ACÁ
```

Eso crea un comando aparte llamado `claude-omni`. Entonces:

| Escribes | Quién responde |
| --- | --- |
| `claude` | Claude de siempre, intacto |
| `claude-omni` | Modelos gratis vía OmniRoute |

Y `claude-omni` prende el gateway solo si está apagado, así que ni te preocupas de la Parte 3.

---

## Parte 6 · Comprobar que quedó bien

No adivines: revísalo.

1. Con el gateway prendido, usa Claude Code (o `claude-omni`) y escríbele cualquier cosa.
2. Vuelve a **http://localhost:20128** en el navegador.
3. En el panel deberías ver que registró la petición: aparece actividad, el proveedor que usó y
   los tokens gastados.

**Si el panel se queda en cero**, no está pasando por OmniRoute. Revisa que la key esté bien
pegada (sin espacios de más al principio o al final).

---

## Parte 7 · El día a día

Cada vez que enciendes el computador, OmniRoute está apagado. Para prenderlo:

- **Si usaste la Forma B:** no haces nada, `claude-omni` lo prende solo.
- **Si usaste la Forma A:** abre la terminal y escribe `omniroute`, o dale doble clic al archivo
  `scripts/omniroute-mac.command` (Mac) o `scripts/omniroute-windows.bat` (Windows) de este repo.

---

## Parte 8 · Cómo deshacer todo

Si te arrepientes o algo se rompe:

```bash
bash scripts/setup-omniroute.sh revert
```

Eso borra el comando `claude-omni`, saca la configuración global (dejando un respaldo) y apaga el
gateway.

Si usaste la Forma A y no tienes el repo bajado, pídele a Claude Code que borre esas dos variables
de `~/.claude/settings.json`.

Para desinstalarlo del todo: `npm uninstall -g omniroute`

---

## Si algo falla

| Qué ves | Qué significa | Qué hacer |
| --- | --- | --- |
| `command not found: npm` | No quedó instalado Node.js | Repite la Parte 0 y **cierra y vuelve a abrir la terminal** |
| `command not found: omniroute` | La Parte 2 falló | Repite la Parte 2 y lee el error completo |
| `EACCES` / `permission denied` | Falta de permisos | Usa `sudo` como dice la Parte 2 |
| `port 20128 already in use` | Ya estaba prendido | No hagas nada, ya está andando |
| Claude Code no responde nada | El gateway está apagado y usaste la Forma A | Prende el gateway, o borra las dos variables |
| El panel marca cero peticiones | La key está mal | Genera una key nueva en Endpoints y repite la Parte 5 |
