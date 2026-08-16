-- Documentacion del esquema actual, NO se ejecuta directamente.
-- La fuente de verdad y lo que corre en cada arranque del contenedor es
-- migrations/ (ver scripts/init-db.js). Este archivo se mantiene al dia a
-- mano como referencia legible de como queda la base tras aplicar todas
-- las migraciones.

-- Tabla de pegas - pega.devschile.cl
CREATE TABLE IF NOT EXISTS pegas (
    id SERIAL PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    titulo TEXT NOT NULL,
    empleador TEXT,
    descripcion TEXT,
    categoria TEXT,
    ubicacion TEXT,
    sueldo TEXT,
    tags TEXT,
    fecha_publicacion TIMESTAMP,
    fuente TEXT NOT NULL DEFAULT 'linkedin',
    email_origen TEXT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    -- Si ya se incluyó en un resumen de Slack. DEFAULT FALSE para que toda
    -- pega nueva salga en el próximo resumen automáticamente.
    notificado_en_digest BOOLEAN NOT NULL DEFAULT FALSE
);

-- Índices para búsqueda
CREATE INDEX IF NOT EXISTS idx_pegas_fuente ON pegas(fuente);
CREATE INDEX IF NOT EXISTS idx_pegas_categoria ON pegas(categoria);
CREATE INDEX IF NOT EXISTS idx_pegas_fecha ON pegas(fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_pegas_activo ON pegas(activo);
CREATE INDEX IF NOT EXISTS idx_pegas_notificado ON pegas(notificado_en_digest) WHERE NOT notificado_en_digest;

-- Registra la última vez que cada disparador del pipeline (Gmail, GetOnBoard
-- + WorkingNomads, digest de Slack) efectivamente corrió, sin importar si
-- encontró datos nuevos o no. Vive en la base -- no en estado interno de
-- n8n -- porque ese estado se demostró frágil (se pierde con ediciones del
-- workflow) y porque un trigger puede dejar de dispararse en silencio sin
-- que nada lo note. Un chequeo periódico aparte compara ultima_corrida
-- contra el intervalo esperado de cada fuente y avisa si alguna se atrasó.
CREATE TABLE IF NOT EXISTS pipeline_heartbeat (
    fuente TEXT PRIMARY KEY,
    ultima_corrida TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
