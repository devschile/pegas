-- Cuentas de usuario via OAuth (GitHub, Slack) -- ver server/utils/usuarios.ts.
-- Clave por (proveedor, proveedor_id), no por email: ni GitHub ni Slack
-- garantizan devolver email segun scopes/config de la cuenta. Vincular un
-- mismo humano entre proveedores queda fuera de alcance por ahora.
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    proveedor TEXT NOT NULL CHECK (proveedor IN ('github', 'slack')),
    proveedor_id TEXT NOT NULL,
    email TEXT,
    nombre TEXT,
    avatar_url TEXT,
    rol TEXT NOT NULL DEFAULT 'candidato' CHECK (rol IN ('candidato', 'empresa', 'admin')),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_ultimo_login TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (proveedor, proveedor_id)
);
