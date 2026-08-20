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

  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
  if (startOfDay(date).getTime() >= startOfDay(now).getTime()) return 'hoy';

  return `${date.getDate()} ${MESES[date.getMonth()]} ${date.getFullYear()}`;
}
