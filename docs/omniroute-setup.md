# Instrucciones para el agente: instalar OmniRoute en esta máquina

**Este archivo NO es para la usuaria. Es la lista de tareas del agente.**
Si estás leyendo esto, hazlo tú: no le pases comandos a la usuaria para que los copie, salvo en el
único paso donde es inevitable (Paso 4).

## Objetivo

Dejar funcionando un comando `claude-omni` en esta máquina, que corre Claude Code enrutado por
OmniRoute (modelos gratis de otros proveedores).

**Regla que no se rompe:** el comando `claude` de la usuaria queda intacto. No uses `--global`, no
escribas `ANTHROPIC_BASE_URL` ni `ANTHROPIC_AUTH_TOKEN` en `~/.claude/settings.json`. Si el gateway
se cae y `claude` dejó de funcionar por algo que hiciste, es un error grave: revísalo.

Contexto: la usuaria no trabaja con la terminal. Habla en español, sin jerga, y solo cuando
necesites algo de ella. Al final, dile en dos líneas qué comando usar y cuándo.

---

## Paso 1 · Node.js

```bash
node -v
```

Necesita v18 o superior.

- Si falta y hay `brew` (Mac): `brew install node`
- Si falta y hay `winget` (Windows): `winget install OpenJS.NodeJS.LTS`
- Si no hay gestor de paquetes: dile que entre a https://nodejs.org, descargue el botón **LTS**,
  lo instale como cualquier programa y te avise. Después cierra y reabre la terminal.

## Paso 2 · Instalar OmniRoute sin pedir contraseña

`npm install -g` suele fallar con `EACCES` y eso obligaría a pedirle la contraseña a la usuaria.
Evítalo configurando un prefijo en su carpeta personal:

```bash
npm config get prefix                      # si ya apunta al home, salta esto
npm config set prefix "$HOME/.npm-global"
npm install -g omniroute
```

Luego asegúrate de que `$HOME/.npm-global/bin` esté en el PATH: agrégalo al final de `~/.zshrc`
(Mac) o `~/.bashrc` (Linux/Git Bash) si no está, y verifica con `command -v omniroute`.

Si aun así falla, léele el error completo, no lo resumas.

## Paso 3 · Levantar el gateway y comprobarlo

```bash
bash scripts/setup-omniroute.sh install
```

Comprueba de verdad que respondió:

```bash
curl -sf http://localhost:20128/ >/dev/null && echo ARRIBA || echo CAIDO
```

Si dice CAIDO, revisa `~/.omniroute/gateway.log` antes de seguir.

## Paso 4 · La API key (único paso donde necesitas a la usuaria)

Primero fíjate si se puede sacar por consola, así le ahorras el trámite:

```bash
omniroute --help
```

Si hay un subcomando para crear o listar API keys, úsalo. Si no lo hay, pídeselo así, tal cual:

> Necesito una clave para conectar Claude Code. Abre esto en tu navegador:
> **http://localhost:20128** → sección **Endpoints** → crea una API key → pégamela acá.

No sigas hasta tenerla.

## Paso 5 · Crear el comando `claude-omni`

```bash
bash scripts/setup-omniroute.sh link --key <LA_KEY>
```

Nunca agregues `--global`. Si el script avisa que `~/.local/bin` no está en el PATH, agrégalo tú a
`~/.zshrc` o `~/.bashrc` y verifica con `command -v claude-omni`.

## Paso 6 · Proveedores

Los modelos gratis no se conectan solos. Dile:

> Última cosa: abre **http://localhost:20128** → sección **Providers** y conecta los que digan
> *free* o que no pidan API key. Con esos ya funciona.

## Paso 7 · Verificar que sirve (no lo des por hecho)

```bash
claude-omni -p "responde solo: ok"
```

Debe contestar. Después confirma que la petición pasó por el gateway: revisa que el panel de
`http://localhost:20128` registre actividad, o busca la petición en `~/.omniroute/gateway.log`.

Comprueba además que no rompiste nada:

```bash
command -v claude          # debe seguir existiendo
grep -c ANTHROPIC_BASE_URL ~/.claude/settings.json 2>/dev/null   # debe dar 0 o no existir el archivo
```

Si el segundo comando devuelve algo distinto de 0, sácalo: no debe estar ahí.

## Paso 8 · Cerrar

Dile exactamente esto, sin agregar pasos:

> Listo. Ahora tienes dos comandos:
> · `claude` → Claude normal, como siempre
> · `claude-omni` → cuando se te acaben los créditos
>
> No hay nada que activar ni desactivar: son dos comandos distintos. El segundo prende el gateway
> solo si hace falta. Cuando se renueven tus créditos, vuelves a usar `claude`.

Y agrega una entrada en `docs/journal.md` diciendo que quedó instalado, en qué máquina y con qué
puerto.

---

## Si algo se rompe después

```bash
bash scripts/setup-omniroute.sh status    # ver cómo quedó
bash scripts/setup-omniroute.sh revert    # deshacer todo
```

---

## Cómo trabaja `claude-omni` con este repo (para cuando pregunte)

`claude-omni` no es un agente distinto: es el mismo binario de Claude Code, apuntado a otro
backend de modelo con dos variables de entorno (`ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`) y
nada más. Tiene las mismas herramientas — Bash, Read, Edit, git — porque es literalmente el mismo
programa. Por eso trabajar en el repo es idéntico a como se hace con `claude`, no hay nada
adicional que instalar para eso:

```bash
git clone https://github.com/cdevidts/Videos-Next-Layer.git   # si no está ya clonado
cd Videos-Next-Layer
claude-omni
```

Si el repo ya está clonado en la máquina, basta `cd` a esa carpeta y correr `claude-omni` ahí. El
`git push` al final usa las mismas credenciales de git que ya tenga configuradas esa máquina (SSH
key o `gh auth`) — no depende de OmniRoute para nada de eso.

Lo único distinto entre `claude` y `claude-omni` es la calidad del modelo que responde: modelos
gratis por detrás rinden peor en trabajo que requiere razonar sobre muchos archivos a la vez
(alinear timestamps de audio, depurar un fallo de build, diseñar un componente nuevo). Para
volumen — variantes de copy, renombrar, ajustes chicos al plan de un video — sirve igual de bien.
