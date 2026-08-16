-- Baseline: contenido de schema.sql tal como estaba antes de que existiera
-- el runner de migraciones. Todo IF NOT EXISTS a propósito -- correr esto
-- contra una base de producción que ya tenía estas tablas es un no-op.

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
    notificado_en_digest BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_pegas_fuente ON pegas(fuente);
CREATE INDEX IF NOT EXISTS idx_pegas_categoria ON pegas(categoria);
CREATE INDEX IF NOT EXISTS idx_pegas_fecha ON pegas(fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_pegas_activo ON pegas(activo);
CREATE INDEX IF NOT EXISTS idx_pegas_notificado ON pegas(notificado_en_digest) WHERE NOT notificado_en_digest;

CREATE TABLE IF NOT EXISTS pipeline_heartbeat (
    fuente TEXT PRIMARY KEY,
    ultima_corrida TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
