-- Esquema de desarrollo local para pegas.devschile.cl
--
-- Copia plana de las tablas que este sitio consulta, extraida del esquema real
-- con pg_dump. El historial de migraciones vive en el repositorio del core, que
-- es privado -- acá solo interesa levantar algo con la forma correcta.
--
-- No lo edites a mano para "arreglar" un test: si el sitio necesita una columna
-- que acá no está, el que quedó atrás es este archivo, y hay que pedir que se
-- regenere desde las migraciones reales.
--
-- Uso: pnpm dev:db (ver README).


CREATE TABLE public.ads (
    id integer NOT NULL,
    nombre text NOT NULL,
    tipo text NOT NULL,
    imagen_url text,
    alt text,
    html text,
    link text,
    activo boolean DEFAULT false NOT NULL,
    ubicaciones text[] NOT NULL,
    creado_por integer,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_actualizacion timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ads_contenido_excluyente CHECK ((((tipo = 'imagen'::text) AND (imagen_url IS NOT NULL) AND (html IS NULL)) OR ((tipo = 'html'::text) AND (html IS NOT NULL) AND (imagen_url IS NULL)))),
    CONSTRAINT ads_imagen_necesita_link CHECK (((tipo <> 'imagen'::text) OR (link IS NOT NULL))),
    CONSTRAINT ads_link_protocolo CHECK (((link IS NULL) OR (link ~* '^https?://'::text))),
    CONSTRAINT ads_tipo_check CHECK ((tipo = ANY (ARRAY['imagen'::text, 'html'::text]))),
    CONSTRAINT ads_ubicaciones_validas CHECK (((cardinality(ubicaciones) >= 1) AND (NOT (ubicaciones @> ARRAY[NULL::text])) AND (ubicaciones <@ ARRAY['header'::text, 'listado'::text, 'footer'::text])))
);

CREATE SEQUENCE public.ads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.ads_id_seq OWNED BY public.ads.id;

CREATE TABLE public.pegas (
    id integer NOT NULL,
    url text NOT NULL,
    titulo text NOT NULL,
    empleador text,
    descripcion text,
    categoria text,
    ubicacion text,
    sueldo text,
    tags text,
    fecha_publicacion timestamp without time zone,
    fuente text DEFAULT 'linkedin'::text NOT NULL,
    email_origen text,
    activo boolean DEFAULT true,
    fecha_creacion timestamp without time zone DEFAULT now(),
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    notificado_en_digest boolean DEFAULT false NOT NULL
);

CREATE TABLE public.pegas_estado_usuario (
    usuario_id integer NOT NULL,
    pega_id integer NOT NULL,
    reaccion text,
    guardada boolean DEFAULT false NOT NULL,
    fecha_actualizacion timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pegas_estado_usuario_reaccion_check CHECK ((reaccion = ANY (ARRAY['like'::text, 'dislike'::text])))
);

CREATE SEQUENCE public.pegas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.pegas_id_seq OWNED BY public.pegas.id;

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    proveedor text NOT NULL,
    proveedor_id text NOT NULL,
    email text,
    nombre text,
    avatar_url text,
    rol text DEFAULT 'candidato'::text NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_ultimo_login timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT usuarios_proveedor_check CHECK ((proveedor = ANY (ARRAY['github'::text, 'slack'::text]))),
    CONSTRAINT usuarios_rol_check CHECK ((rol = ANY (ARRAY['candidato'::text, 'empresa'::text, 'admin'::text])))
);

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;

ALTER TABLE ONLY public.ads ALTER COLUMN id SET DEFAULT nextval('public.ads_id_seq'::regclass);

ALTER TABLE ONLY public.pegas ALTER COLUMN id SET DEFAULT nextval('public.pegas_id_seq'::regclass);

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);

ALTER TABLE ONLY public.ads
    ADD CONSTRAINT ads_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pegas_estado_usuario
    ADD CONSTRAINT pegas_estado_usuario_pkey PRIMARY KEY (usuario_id, pega_id);

ALTER TABLE ONLY public.pegas
    ADD CONSTRAINT pegas_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pegas
    ADD CONSTRAINT pegas_url_key UNIQUE (url);

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_unique UNIQUE (email);

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_proveedor_proveedor_id_key UNIQUE (proveedor, proveedor_id);

CREATE INDEX idx_ads_activo ON public.ads USING btree (activo) WHERE activo;

CREATE INDEX idx_pegas_activo ON public.pegas USING btree (activo);

CREATE INDEX idx_pegas_categoria ON public.pegas USING btree (categoria);

CREATE INDEX idx_pegas_estado_pega ON public.pegas_estado_usuario USING btree (pega_id);

CREATE INDEX idx_pegas_fecha ON public.pegas USING btree (fecha_creacion DESC);

CREATE INDEX idx_pegas_fuente ON public.pegas USING btree (fuente);

CREATE INDEX idx_pegas_notificado ON public.pegas USING btree (notificado_en_digest) WHERE (NOT notificado_en_digest);

ALTER TABLE ONLY public.ads
    ADD CONSTRAINT ads_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.pegas_estado_usuario
    ADD CONSTRAINT pegas_estado_usuario_pega_id_fkey FOREIGN KEY (pega_id) REFERENCES public.pegas(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.pegas_estado_usuario
    ADD CONSTRAINT pegas_estado_usuario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

