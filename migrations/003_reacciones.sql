-- Like/dislike y guardado por usuario -- ver server/utils/reacciones.ts.
-- La PK compuesta ya garantiza una fila por (usuario, pega); la fila se
-- borra en vez de quedar "vacia" (reaccion NULL y guardada FALSE) para que
-- getMyPegas no necesite ningun WHERE -- cualquier fila que exista es, por
-- definicion, algo para mostrar en /mis-pegas.
CREATE TABLE IF NOT EXISTS pegas_estado_usuario (
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    pega_id INTEGER NOT NULL REFERENCES pegas(id) ON DELETE CASCADE,
    reaccion TEXT CHECK (reaccion IN ('like', 'dislike')),
    guardada BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (usuario_id, pega_id)
);
