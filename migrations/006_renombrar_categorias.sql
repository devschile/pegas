-- Renombra dos categorías. Los nombres viven como texto plano en pegas.categoria
-- (no hay tabla de categorías ni FK), y el frontend arma el nav y los filtros
-- con un SELECT DISTINCT sobre esa columna, así que renombrar es un UPDATE y
-- nada más: no hay nada que migrar del lado de la app.
--
--   Data    → Data/BI    : la categoría se quedó con "analista/analyst/BI" pero
--                          perdió todo lo de IA/ML, que pasó a la categoría AI/ML.
--   Gestión → Liderazgo  : misma categoría, ampliada con arquitecto/CTO/subgerente.
--
-- El slug de una categoría sale de slugify() sobre su nombre, así que esto
-- también mueve sus URLs: /categoria/data → /categoria/data-bi y
-- /categoria/gestion → /categoria/liderazgo. Las viejas estaban indexadas, así
-- que hay un 301 de cada una en el routeRules de web/nuxt.config.ts.
--
-- Esto NO reclasifica: solo cambia la etiqueta de las filas que ya estaban en
-- esas dos categorías. Para volver a pasar el clasificador sobre las pegas
-- existentes: node scripts/reclasificar.js --aplicar
UPDATE pegas SET categoria = 'Data/BI', fecha_actualizacion = NOW() WHERE categoria = 'Data';
UPDATE pegas SET categoria = 'Liderazgo', fecha_actualizacion = NOW() WHERE categoria = 'Gestión';
