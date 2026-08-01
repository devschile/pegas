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
