# Cómo aportar

Gracias por pasar. Este repositorio es la vitrina de
[pegas.devschile.cl](https://pegas.devschile.cl) y se puede levantar completo en
local sin pedirle credenciales a nadie: ver [README](./README.md#levantarlo).

## Lo básico

1. Haz un fork y una rama con nombre descriptivo (`feat/filtro-por-region`).
2. Levanta el proyecto y asegúrate de que los tests pasan antes de empezar.
3. Manda el pull request explicando **qué problema resuelve**, no solo qué
   cambia. Una captura ayuda si es visual.

Todo cambio pasa por pull request y por CI. No hace falta pedir permiso para
abrir uno: si tienes dudas de si vale la pena, ábrelo igual y lo conversamos ahí.

## Lo que el CI va a exigir

- **Los tests pasan** y la cobertura no baja del 80%. El hook de pre-commit los
  corre antes de cada commit; si aportas desde un fork sin el hook instalado, el
  CI los corre igual.
- **Los cambios de interfaz vienen con test.** Componentes y composables tienen
  su `__tests__/` al lado — sigue el patrón del vecino más parecido.

## Convenciones

Están en [`AGENTS.md`](./AGENTS.md). Lo que más se nota al revisar:

- **Código y mensajes de commit en español.** Los commits siguen
  [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`,
  `docs:`, `refactor:`, `style:`, `chore:`).
- **Los comentarios explican el porqué, no el qué.** Un comentario que describe
  lo que la línea siguiente ya dice sobra; uno que explica por qué esa línea es
  así, y qué se rompió sin ella, vale oro.
- **Usa los componentes de chucao** antes de escribir uno propio.

## Algunas cosas que conviene saber

**Los datos de ejemplo son inventados.** Nunca subas un volcado de la base real:
tiene avisos de empresas y cuentas de personas (correo, proveedor de login,
reacciones). Si necesitas más variedad para probar algo, agrega filas a
`dev/fixtures.json`.

**Nunca escribas credenciales en el código**, ni siquiera como valor por defecto
de una variable de entorno. Todo va por `process.env`, sin excepción. Este
repositorio ya arrastró una vez, durante más de un mes, una cadena de conexión a
producción puesta como fallback en un `||`.

**Lo que toca la base se valida en el servidor.** Los datos que llegan por query
string se saturan y validan en `server/api/` antes de tocar SQL, y las consultas
van parametrizadas. Esconder un botón en la interfaz no protege nada: cada
endpoint que escribe revalida el rol contra la base.

**El pipeline de ingestión no vive acá.** Si tu idea es sumar una fuente de
pegas o cambiar cómo se clasifican, abre un issue y lo vemos: eso se cambia en
otro repositorio.

## Reportar un problema de seguridad

No lo abras como issue público. Escribe a la organización por privado y lo
resolvemos antes de darle publicidad.
