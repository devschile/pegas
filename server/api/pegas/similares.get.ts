import { defineEventHandler, getQuery } from 'h3';
import { buscarPegasSimilares } from '../../utils/pegas-db';

function aTexto(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Admin-only: se consulta mientras se llena el formulario de alta manual
 * (`PanelAgregarPega.vue`), no es información pública -- no hay razón para
 * exponerle a cualquiera qué pegas activas tiene cada empleador antes de
 * que el aviso exista.
 */
export default defineEventHandler(async event => {
  await requireAdmin(event);

  const q = getQuery(event);
  return buscarPegasSimilares({
    titulo: aTexto(q.titulo),
    empleador: aTexto(q.empleador),
    url: aTexto(q.url),
  });
});
