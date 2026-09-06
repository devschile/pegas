import { createError, defineEventHandler, readMultipartFormData } from 'h3';
import { UTApi } from 'uploadthing/server';
import { validarImagen } from '../../utils/ads-imagen';

/**
 * Sube una imagen de banner a UploadThing y devuelve su URL https.
 *
 * El archivo se valida por sus bytes ANTES de salir del servidor: subir
 * primero y preguntar después significaría dejar cualquier cosa alojada bajo
 * nuestra cuenta.
 *
 * `UPLOADTHING_TOKEN` se lee del entorno. En local puede no estar, y en ese
 * caso el endpoint responde 503 con una explicación en vez de reventar al
 * arrancar: el resto del sitio tiene que poder levantarse sin esa credencial,
 * que es lo que permite trabajar con `dev/` sin pedirle nada a nadie.
 */
export default defineEventHandler(async event => {
  await requireAdmin(event);

  if (!process.env.UPLOADTHING_TOKEN) {
    throw createError({
      statusCode: 503,
      message: 'falta UPLOADTHING_TOKEN: pega la URL de la imagen a mano o configura la credencial',
    });
  }

  const partes = await readMultipartFormData(event);
  const archivo = partes?.find(p => p.name === 'archivo' && p.filename);
  const r = validarImagen(archivo?.data ? new Uint8Array(archivo.data) : null);
  if (!r.ok) throw createError({ statusCode: 400, message: r.error });

  const subida = await new UTApi().uploadFiles(
    new File([new Uint8Array(archivo!.data)], r.nombre, { type: r.mime }),
  );

  if (subida.error || !subida.data) {
    throw createError({ statusCode: 502, message: 'UploadThing rechazó la subida' });
  }

  return { url: subida.data.ufsUrl, nombre: r.nombre };
});
