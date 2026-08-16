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

/**
 * Compara por día calendario, no por horas transcurridas: algo publicado
 * ayer a las 23:00 no debe decir "hoy" solo porque pasaron 2 horas.
 */
export function relativeLabel(date: Date, now: Date = new Date()): string | null {
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const dayDiff = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86400000);

  if (dayDiff <= 0) return 'hoy';
  if (dayDiff === 1) return 'ayer';
  if (dayDiff < 7) return `hace ${dayDiff}d`;
  if (dayDiff < 30) return `hace ${Math.floor(dayDiff / 7)}sem`;
  return null;
}

/** "31/07/2026 14:05 - hoy" — el sufijo relativo solo aparece si es reciente. */
export function formatDate(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (value: number) => String(value).padStart(2, '0');
  const dateLabel = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  const timeLabel = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  const suffix = relativeLabel(date, now);
  return suffix ? `${dateLabel} ${timeLabel} - ${suffix}` : `${dateLabel} ${timeLabel}`;
}
