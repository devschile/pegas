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
    empresa_id integer NOT NULL,
    nombre text NOT NULL,
    formato text NOT NULL,
    imagen_desktop_url text,
    imagen_movil_url text,
    alt text,
    html text,
    alto_desktop integer,
    alto_movil integer,
    link text,
    activo boolean DEFAULT false NOT NULL,
    ubicaciones text[] NOT NULL,
    inicia_en timestamp with time zone,
    termina_en timestamp with time zone,
    creado_por integer,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_actualizacion timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ads_altos_positivos CHECK ((((alto_desktop IS NULL) OR ((alto_desktop >= 1) AND (alto_desktop <= 600))) AND ((alto_movil IS NULL) OR ((alto_movil >= 1) AND (alto_movil <= 600))))),
    CONSTRAINT ads_contenido_excluyente CHECK ((((formato = 'imagen'::text) AND (imagen_desktop_url IS NOT NULL) AND (imagen_movil_url IS NOT NULL) AND (link IS NOT NULL) AND (html IS NULL)) OR ((formato = 'html'::text) AND (html IS NOT NULL) AND (imagen_desktop_url IS NULL) AND (imagen_movil_url IS NULL)))),
    CONSTRAINT ads_formato_check CHECK ((formato = ANY (ARRAY['imagen'::text, 'html'::text]))),
    CONSTRAINT ads_imagenes_origen CHECK ((((imagen_desktop_url IS NULL) OR (imagen_desktop_url ~* '^(https?://|/)'::text)) AND ((imagen_movil_url IS NULL) OR (imagen_movil_url ~* '^(https?://|/)'::text)))),
    CONSTRAINT ads_link_protocolo CHECK (((link IS NULL) OR (link ~* '^https?://'::text))),
    CONSTRAINT ads_ubicaciones_validas CHECK (((cardinality(ubicaciones) >= 1) AND (NOT (ubicaciones @> ARRAY[NULL::text])) AND (ubicaciones <@ ARRAY['header'::text, 'listado'::text, 'footer'::text]))),
    CONSTRAINT ads_vigencia_coherente CHECK (((inicia_en IS NULL) OR (termina_en IS NULL) OR (termina_en > inicia_en)))
);

CREATE TABLE public.ads_eventos (
    id bigint NOT NULL,
    ad_id integer NOT NULL,
    tipo text NOT NULL,
    ubicacion text NOT NULL,
    posicion smallint,
    pagina smallint,
    dispositivo text NOT NULL,
    fecha timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ads_eventos_dispositivo_check CHECK ((dispositivo = ANY (ARRAY['desktop'::text, 'movil'::text]))),
    CONSTRAINT ads_eventos_posicion_solo_listado CHECK (((ubicacion = 'listado'::text) OR ((posicion IS NULL) AND (pagina IS NULL)))),
    CONSTRAINT ads_eventos_tipo_check CHECK ((tipo = ANY (ARRAY['impresion'::text, 'click'::text]))),
    CONSTRAINT ads_eventos_ubicacion_check CHECK ((ubicacion = ANY (ARRAY['header'::text, 'listado'::text, 'footer'::text])))
);

CREATE SEQUENCE public.ads_eventos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.ads_eventos_id_seq OWNED BY public.ads_eventos.id;

CREATE SEQUENCE public.ads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.ads_id_seq OWNED BY public.ads.id;

CREATE TABLE public.ads_log (
    id bigint NOT NULL,
    ad_id integer,
    empresa_id integer,
    usuario_id integer,
    accion text NOT NULL,
    detalle jsonb,
    fecha timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ads_log_accion_check CHECK ((accion = ANY (ARRAY['crear'::text, 'editar'::text, 'activar'::text, 'desactivar'::text, 'borrar'::text, 'crear_empresa'::text, 'editar_empresa'::text, 'activar_empresa'::text, 'desactivar_empresa'::text, 'borrar_empresa'::text])))
);

CREATE SEQUENCE public.ads_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.ads_log_id_seq OWNED BY public.ads_log.id;

CREATE TABLE public.empresas (
    id integer NOT NULL,
    nombre text NOT NULL,
    slug text NOT NULL,
    sitio_url text,
    contacto_email text,
    activo boolean DEFAULT true NOT NULL,
    es_casa boolean DEFAULT false NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_actualizacion timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT empresas_sitio_protocolo CHECK (((sitio_url IS NULL) OR (sitio_url ~* '^https?://'::text))),
    CONSTRAINT empresas_slug_formato CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))
);

CREATE SEQUENCE public.empresas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.empresas_id_seq OWNED BY public.empresas.id;

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

ALTER TABLE ONLY public.ads_eventos ALTER COLUMN id SET DEFAULT nextval('public.ads_eventos_id_seq'::regclass);

ALTER TABLE ONLY public.ads_log ALTER COLUMN id SET DEFAULT nextval('public.ads_log_id_seq'::regclass);

ALTER TABLE ONLY public.empresas ALTER COLUMN id SET DEFAULT nextval('public.empresas_id_seq'::regclass);

ALTER TABLE ONLY public.pegas ALTER COLUMN id SET DEFAULT nextval('public.pegas_id_seq'::regclass);

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);

ALTER TABLE ONLY public.ads_eventos
    ADD CONSTRAINT ads_eventos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ads_log
    ADD CONSTRAINT ads_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ads
    ADD CONSTRAINT ads_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_slug_key UNIQUE (slug);

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

CREATE INDEX idx_ads_empresa ON public.ads USING btree (empresa_id);

CREATE INDEX idx_ads_eventos_ad_fecha ON public.ads_eventos USING btree (ad_id, fecha DESC);

CREATE INDEX idx_ads_eventos_agregado ON public.ads_eventos USING btree (ad_id, tipo, ubicacion, fecha);

CREATE INDEX idx_ads_log_fecha ON public.ads_log USING btree (fecha DESC);

CREATE INDEX idx_pegas_activo ON public.pegas USING btree (activo);

CREATE INDEX idx_pegas_categoria ON public.pegas USING btree (categoria);

CREATE INDEX idx_pegas_estado_pega ON public.pegas_estado_usuario USING btree (pega_id);

CREATE INDEX idx_pegas_fecha ON public.pegas USING btree (fecha_creacion DESC);

CREATE INDEX idx_pegas_fuente ON public.pegas USING btree (fuente);

CREATE INDEX idx_pegas_notificado ON public.pegas USING btree (notificado_en_digest) WHERE (NOT notificado_en_digest);

ALTER TABLE ONLY public.ads
    ADD CONSTRAINT ads_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.ads
    ADD CONSTRAINT ads_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ads_eventos
    ADD CONSTRAINT ads_eventos_ad_id_fkey FOREIGN KEY (ad_id) REFERENCES public.ads(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.pegas_estado_usuario
    ADD CONSTRAINT pegas_estado_usuario_pega_id_fkey FOREIGN KEY (pega_id) REFERENCES public.pegas(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.pegas_estado_usuario
    ADD CONSTRAINT pegas_estado_usuario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

