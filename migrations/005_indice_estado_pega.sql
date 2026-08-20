-- Conteos públicos de like/nolike/guardado por pega (los muestra PegaCard).
-- La PK de pegas_estado_usuario es (usuario_id, pega_id), así que no hay
-- ningún índice que sirva para agregar por pega_id solo: sin esto, cada
-- fila del listado dispara un seq scan de la tabla de estados.
CREATE INDEX IF NOT EXISTS idx_pegas_estado_pega ON pegas_estado_usuario(pega_id);
