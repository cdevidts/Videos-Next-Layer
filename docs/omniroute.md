# OmniRoute con Claude Code

Notas de setup para enrutar clientes de IA a través de [OmniRoute](https://github.com/diegosouzapw/OmniRoute)
(`omniroute@3.8.50`, licencia MIT). Es herramienta local de desarrollo, no forma parte del
pipeline de video de este repo.

## Qué es y qué no es

OmniRoute es un **gateway self-hosted** que corre en tu máquina (`localhost:20128`) y expone un
endpoint único hacia ~352 proveedores de modelos, con fallback automático cuando uno se queda sin
cuota.

Lo que sí resuelve:

- Un solo endpoint para muchos proveedores, con reintentos y fallback.
- Aprovechar las capas gratuitas de decenas de proveedores (el proyecto habla de ~1.5 mil millones
  de tokens mensuales sumando free tiers).
- Compresión de tokens y ruteo por costo/latencia/salud del proveedor.

Lo que **no** resuelve:

- **No da Claude ilimitado.** No levanta el límite de tu plan de Anthropic: lo que hace es mandar
  los pedidos a *otros* modelos. Si ruteas Claude Code por OmniRoute sin poner una API key de
  Anthropic, el que responde ya no es Claude.
- Cada proveedor debajo mantiene sus propios límites; "ilimitado" es la suma de muchos free tiers,
  no un permiso infinito.

## Instalación (en tu máquina, no en una sesión remota)

El gateway escucha en `localhost`, así que tiene que correr en el mismo equipo donde usas Claude
Code. En una sesión de Claude Code en la web esto no aplica: el contenedor es efímero y no ve tu
`localhost`.

```bash
npm install -g omniroute
omniroute                    # levanta el gateway en http://localhost:20128
```

Después, una sola vez:

1. Abre `http://localhost:20128` → sección **Endpoints** → genera una API key.
2. En **Providers**, conecta los proveedores que vayas a usar (API key u OAuth). Arranca con los
   keyless para probar.

## Conectar Claude Code

OmniRoute expone `/v1/messages` (estilo Anthropic) además de `/v1/chat/completions`. Claude Code se
apunta con dos variables de entorno:

```bash
export ANTHROPIC_BASE_URL=http://localhost:20128/v1
export ANTHROPIC_AUTH_TOKEN=<la API key del dashboard>
```

Para dejarlo permanente hay dos caminos:

- **Por shell** (afecta solo a las terminales donde lo exportes): agrega esas dos líneas a tu
  `~/.zshrc` o `~/.bashrc`.
- **Por Claude Code** (afecta a todas tus sesiones): agrega el bloque `env` en
  `~/.claude/settings.json`. Haz respaldo del archivo antes de editarlo.

```jsonc
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://localhost:20128/v1",
    "ANTHROPIC_AUTH_TOKEN": "<la API key del dashboard>"
  }
}
```

Para volver atrás: borra esas dos claves (o las líneas del shell) y reinicia Claude Code. Con
`model: "auto"` el gateway elige proveedor solo; para forzar uno, se especifica el modelo.

## Antes de dejarlo prendido para todo

- **Calidad según la tarea.** El trabajo pesado de este repo (alinear la transcripción con la
  energía del audio, depurar el fallo de certificados en el render, diseñar los componentes de
  Remotion) es razonamiento largo con muchos archivos. Los modelos de capa gratuita rinden bastante
  menos ahí. El patrón que funciona es híbrido: OmniRoute para volumen —renombrar, formatear,
  generar variantes de copy, tareas repetitivas— y Claude para la arquitectura y el debugging.
- **Tus datos salen a terceros.** Todo lo que mandes viaja al proveedor que el router elija, y
  varias capas gratuitas se reservan el derecho de entrenar con lo que reciben. Para el pipeline de
  video da lo mismo; para material de clientes, credenciales o contratos, no lo usaría.
- **Es una dependencia más.** Si el gateway se cae o no está levantado, Claude Code deja de
  responder hasta que revientes las variables de entorno.
- **Nunca commitees el `.env`** que OmniRoute genera en su instalación: trae credenciales.
