const SOURCE_LABEL: Record<string, string> = {
  linkedin: 'LinkedIn',
  getonbrd: 'GetOnBoard',
  workingnomads: 'WorkingNomads',
  jobicy: 'Jobicy',
  himalayas: 'Himalayas',
};

export function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] || source;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Zona fija en vez del huso del proceso: el contenedor corre en UTC y el
 * navegador en el huso de quien mira, así que `getDate()` daba días
 * distintos en SSR y en cliente y Vue reportaba hydration mismatch (cerca
 * de medianoche UTC el server ya decía "hoy" y el cliente todavía no).
 * Además es lo correcto de producto: es una bolsa de trabajo chilena, las
 * fechas se leen en hora de Chile venga de donde venga la visita.
 */
const ZONA = 'America/Santiago';

function diaEnChile(date: Date): { year: number; month: number; day: number } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const parte = (tipo: string) => Number(partes.find(p => p.type === tipo)?.value);
  return { year: parte('year'), month: parte('month'), day: parte('day') };
}

/**
 * "hoy" para el mismo día calendario; de ayer hacia atrás, "19 Agosto 2026".
 *
 * Se compara por día calendario y no por horas transcurridas: algo publicado
 * ayer a las 23:00 no debe decir "hoy" solo porque pasaron 2 horas. Sin la
 * hora a propósito -- en un listado de ofertas no aporta, y alargaba la
 * línea de meta lo suficiente como para empujar los badges.
 */
export function formatDate(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const dia = diaEnChile(date);
  const hoy = diaEnChile(now);
  const comparable = (d: typeof dia) => d.year * 10000 + d.month * 100 + d.day;
  if (comparable(dia) >= comparable(hoy)) return 'hoy';

  return `${dia.day} ${MESES[dia.month - 1]} ${dia.year}`;
}
