import type { PoolClient } from 'pg';
import { query, withTransaction } from './db';
import type { AdEntrada, EmpresaEntrada } from './ads-validacion';

/**
 * Escrituras del panel de ads. Cada una va junto con su registro en `ads_log`
 * dentro de la misma transacción: un log que puede quedar desfasado de lo que
 * registra no sirve para auditar nada.
 */

export type AccionLog =
  | 'crear'
  | 'editar'
  | 'activar'
  | 'desactivar'
  | 'borrar'
  | 'crear_empresa'
  | 'editar_empresa'
  | 'activar_empresa'
  | 'desactivar_empresa'
  | 'borrar_empresa';

async function registrarLog(
  client: PoolClient,
  entrada: {
    ad_id: number | null;
    empresa_id: number | null;
    usuario_id: number;
    accion: AccionLog;
    detalle: unknown;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO ads_log (ad_id, empresa_id, usuario_id, accion, detalle)
     VALUES ($1,$2,$3,$4,$5)`,
    [entrada.ad_id, entrada.empresa_id, entrada.usuario_id, entrada.accion, JSON.stringify(entrada.detalle)],
  );
}

const COLUMNAS_AD = `id, empresa_id, nombre, formato, imagen_desktop_url, imagen_movil_url, alt,
                     html, alto_desktop, alto_movil, link, activo, ubicaciones,
                     inicia_en, termina_en, fecha_creacion, fecha_actualizacion`;

/**
 * Listado para el panel: trae TODOS los ads, prendidos y apagados, con el
 * nombre y el estado de su empresa — un ad prendido cuya empresa está apagada
 * no se publica, y el panel tiene que poder mostrar por qué.
 */
export async function listarAdsAdmin() {
  const { rows } = await query(
    `SELECT a.id, a.empresa_id, a.nombre, a.formato, a.imagen_desktop_url, a.imagen_movil_url,
            a.alt, a.html, a.alto_desktop, a.alto_movil, a.link, a.activo, a.ubicaciones,
            a.inicia_en, a.termina_en, a.fecha_creacion, a.fecha_actualizacion,
            e.nombre AS empresa_nombre, e.slug AS empresa_slug,
            e.activo AS empresa_activa, e.es_casa
     FROM ads a
     JOIN empresas e ON e.id = a.empresa_id
     ORDER BY e.nombre, a.nombre`,
  );
  return rows;
}

export async function listarEmpresas() {
  const { rows } = await query(
    `SELECT e.id, e.nombre, e.slug, e.sitio_url, e.contacto_email, e.activo, e.es_casa,
            e.fecha_creacion,
            COUNT(a.id)::int AS ads_total,
            COUNT(a.id) FILTER (WHERE a.activo)::int AS ads_activos
     FROM empresas e
     LEFT JOIN ads a ON a.empresa_id = e.id
     GROUP BY e.id
     ORDER BY e.es_casa DESC, e.nombre`,
  );
  return rows;
}

export async function crearAd(entrada: AdEntrada, usuarioId: number) {
  return withTransaction(async client => {
    const { rows } = await client.query(
      `INSERT INTO ads (empresa_id, nombre, formato, imagen_desktop_url, imagen_movil_url, alt,
                        html, alto_desktop, alto_movil, link, activo, ubicaciones,
                        inicia_en, termina_en, creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING ${COLUMNAS_AD}`,
      [
        entrada.empresa_id, entrada.nombre, entrada.formato, entrada.imagen_desktop_url,
        entrada.imagen_movil_url, entrada.alt, entrada.html, entrada.alto_desktop,
        entrada.alto_movil, entrada.link, entrada.activo, entrada.ubicaciones,
        entrada.inicia_en, entrada.termina_en, usuarioId,
      ],
    );
    const ad = rows[0];
    await registrarLog(client, {
      ad_id: ad.id,
      empresa_id: entrada.empresa_id,
      usuario_id: usuarioId,
      accion: 'crear',
      detalle: { nombre: ad.nombre, formato: ad.formato, ubicaciones: ad.ubicaciones, activo: ad.activo },
    });
    return ad;
  });
}

export async function actualizarAd(id: number, entrada: AdEntrada, usuarioId: number) {
  return withTransaction(async client => {
    // Se lee el estado anterior dentro de la transacción, con FOR UPDATE, para
    // saber si esto es una edición o un encendido/apagado sin correr contra
    // otra edición simultánea.
    const previo = await client.query('SELECT nombre, activo FROM ads WHERE id = $1 FOR UPDATE', [id]);
    if (previo.rows.length === 0) return null;

    const { rows } = await client.query(
      `UPDATE ads SET empresa_id=$2, nombre=$3, formato=$4, imagen_desktop_url=$5,
                      imagen_movil_url=$6, alt=$7, html=$8, alto_desktop=$9, alto_movil=$10,
                      link=$11, activo=$12, ubicaciones=$13, inicia_en=$14, termina_en=$15,
                      fecha_actualizacion = NOW()
       WHERE id = $1
       RETURNING ${COLUMNAS_AD}`,
      [
        id, entrada.empresa_id, entrada.nombre, entrada.formato, entrada.imagen_desktop_url,
        entrada.imagen_movil_url, entrada.alt, entrada.html, entrada.alto_desktop,
        entrada.alto_movil, entrada.link, entrada.activo, entrada.ubicaciones,
        entrada.inicia_en, entrada.termina_en,
      ],
    );
    const ad = rows[0];
    const cambioEstado = previo.rows[0].activo !== ad.activo;
    await registrarLog(client, {
      ad_id: id,
      empresa_id: entrada.empresa_id,
      usuario_id: usuarioId,
      accion: cambioEstado ? (ad.activo ? 'activar' : 'desactivar') : 'editar',
      detalle: { nombre: ad.nombre, antes: previo.rows[0], ahora: { nombre: ad.nombre, activo: ad.activo } },
    });
    return ad;
  });
}

export async function borrarAd(id: number, usuarioId: number) {
  return withTransaction(async client => {
    const previo = await client.query(
      `SELECT ${COLUMNAS_AD} FROM ads WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (previo.rows.length === 0) return false;
    const ad = previo.rows[0];

    // `detalle` guarda la fila completa antes de borrarla: `ads_log` no tiene
    // clave foránea a `ads` a propósito (ver la migración 007), así que el
    // `ad_id` sobrevive, pero el resto de los datos solo existe acá.
    await registrarLog(client, {
      ad_id: id,
      empresa_id: ad.empresa_id,
      usuario_id: usuarioId,
      accion: 'borrar',
      detalle: ad,
    });
    await client.query('DELETE FROM ads WHERE id = $1', [id]);
    return true;
  });
}

export async function crearEmpresa(entrada: EmpresaEntrada, usuarioId: number) {
  return withTransaction(async client => {
    const { rows } = await client.query(
      `INSERT INTO empresas (nombre, slug, sitio_url, contacto_email, activo, es_casa)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, nombre, slug, sitio_url, contacto_email, activo, es_casa, fecha_creacion`,
      [entrada.nombre, entrada.slug, entrada.sitio_url, entrada.contacto_email, entrada.activo, entrada.es_casa],
    );
    const empresa = rows[0];
    await registrarLog(client, {
      ad_id: null,
      empresa_id: empresa.id,
      usuario_id: usuarioId,
      accion: 'crear_empresa',
      detalle: { nombre: empresa.nombre, slug: empresa.slug, es_casa: empresa.es_casa },
    });
    return empresa;
  });
}

export async function actualizarEmpresa(id: number, entrada: EmpresaEntrada, usuarioId: number) {
  return withTransaction(async client => {
    const previo = await client.query('SELECT nombre, activo FROM empresas WHERE id = $1 FOR UPDATE', [id]);
    if (previo.rows.length === 0) return null;

    const { rows } = await client.query(
      `UPDATE empresas SET nombre=$2, slug=$3, sitio_url=$4, contacto_email=$5, activo=$6,
                           es_casa=$7, fecha_actualizacion = NOW()
       WHERE id = $1
       RETURNING id, nombre, slug, sitio_url, contacto_email, activo, es_casa, fecha_creacion`,
      [id, entrada.nombre, entrada.slug, entrada.sitio_url, entrada.contacto_email, entrada.activo, entrada.es_casa],
    );
    const empresa = rows[0];
    const cambioEstado = previo.rows[0].activo !== empresa.activo;
    await registrarLog(client, {
      ad_id: null,
      empresa_id: id,
      usuario_id: usuarioId,
      accion: cambioEstado ? (empresa.activo ? 'activar_empresa' : 'desactivar_empresa') : 'editar_empresa',
      detalle: { nombre: empresa.nombre, antes: previo.rows[0], ahora: { nombre: empresa.nombre, activo: empresa.activo } },
    });
    return empresa;
  });
}

/** Últimos movimientos, para la pestaña de actividad del panel. */
export async function listarLog(limite = 100) {
  const { rows } = await query(
    `SELECT l.id, l.ad_id, l.empresa_id, l.accion, l.detalle, l.fecha,
            u.nombre AS usuario_nombre
     FROM ads_log l
     LEFT JOIN usuarios u ON u.id = l.usuario_id
     ORDER BY l.fecha DESC
     LIMIT $1`,
    [Math.min(Math.max(limite, 1), 500)],
  );
  return rows;
}
