import { validarLink } from './ads-sanitize';
import type { Resultado } from './ads-validacion';

/**
 * Validación de la carga manual de una pega (panel de admin). Mismo motivo
 * que `ads-validacion.ts`: la base ya impone NOT NULL y la UNIQUE de `url`,
 * pero acá se devuelve un mensaje que dice qué falta en vez de un error de
 * Postgres.
 *
 * `Resultado` se importa de `ads-validacion.ts` en vez de redefinirlo --
 * mismo tipo genérico que ya reusan `ads-eventos.ts` y
 * `relacionadas-eventos.ts`. Declararlo de nuevo acá no rompía nada en
 * tiempo de compilación, pero sí el auto-import de Nitro: dos módulos de
 * `server/utils/` exportando un `Resultado` distinto bajo el mismo nombre
 * hacían que Nitro avisara "Duplicated imports" y se quedara con uno
 * cualquiera de los dos para quien lo usara sin import explícito.
 */

export interface PegaEntrada {
  url: string;
  titulo: string;
  empleador: string;
  descripcion: string;
  categoria: string;
  ubicacion: string;
  sueldo: string | null;
  tags: string | null;
  fecha_publicacion: string | null;
}

const objeto = (b: unknown): Record<string, unknown> | null =>
  typeof b === 'object' && b !== null && !Array.isArray(b) ? (b as Record<string, unknown>) : null;

const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

/** ISO 8601 o `YYYY-MM-DD`; se guarda tal cual para que Postgres resuelva el valor. */
function fecha(v: unknown): string | null {
  const s = texto(v);
  if (!s) return null;
  return Number.isNaN(Date.parse(s)) ? null : s;
}

export function validarPegaEntrada(body: unknown): Resultado<PegaEntrada> {
  const b = objeto(body);
  if (!b) return { ok: false, error: 'el cuerpo debe ser un objeto' };

  const url = validarLink(b.url);
  if (!url) return { ok: false, error: 'url tiene que ser una URL http o https' };

  const titulo = texto(b.titulo);
  if (!titulo) return { ok: false, error: 'titulo es obligatorio' };

  const empleador = texto(b.empleador);
  if (!empleador) return { ok: false, error: 'empleador es obligatorio' };

  const descripcion = texto(b.descripcion);
  if (!descripcion) return { ok: false, error: 'descripcion es obligatoria' };

  const categoria = texto(b.categoria);
  if (!categoria) return { ok: false, error: 'categoria es obligatoria' };

  const ubicacion = texto(b.ubicacion);
  if (!ubicacion) return { ok: false, error: 'ubicacion es obligatoria' };

  const fecha_publicacion = b.fecha_publicacion == null ? null : fecha(b.fecha_publicacion);
  if (b.fecha_publicacion != null && fecha_publicacion === null) {
    return { ok: false, error: 'fecha_publicacion no es una fecha válida' };
  }

  return {
    ok: true,
    valor: {
      url,
      titulo,
      empleador,
      descripcion,
      categoria,
      ubicacion,
      sueldo: texto(b.sueldo),
      tags: texto(b.tags),
      fecha_publicacion,
    },
  };
}
