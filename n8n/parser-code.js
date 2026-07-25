/**
 * Parser de LinkedIn Job Alert Digest — para n8n Code node
 * Extrae titulo, url (limpia), empleador, ubicacion, categoria
 * de emails multipart/alternative con text/plain en quoted-printable.
 * 
 * Probado con 11/11 pegas de 3 emails reales (Julio 2026).
 * v1.1: detección de sueldo/rango salarial en título y descripción.
 */

const items = $input.all();
const output = [];

// --- Quoted-printable decoder con soporte UTF-8 multi-byte ---
function decodeQP(str) {
  str = str.replace(/=\r?\n/g, '');
  const bytes = [];
  let i = 0;
  while (i < str.length) {
    if (str[i] === '=' && i + 2 < str.length && /^[0-9A-Fa-f]{2}$/.test(str.substring(i+1, i+3))) {
      bytes.push(parseInt(str.substring(i+1, i+3), 16));
      i += 3;
    } else {
      bytes.push(str.charCodeAt(i));
      i++;
    }
  }
  try { return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes)); }
  catch (_) { return str; }
}

// --- Categorización ---
function categorizar(t) {
  t = t.toLowerCase();
  if (/\bfront.?end\b|frontend|\breact\b|\bvue\b|\bangular\b|\bui.ux\b|\bcss\b|\bhtml\b|\btypescript\b|\bjavascript\b|\bjs\b/i.test(t)) return 'Frontend';
  if (/\bback.?end\b|backend|\bnode\b|\bpython\b|\bdjango\b|\bflask\b|\bgo\b|\bgolang\b|\brust\b|\bjava\b|\bspring\b|\bquarkus\b|\.net\b|\bc#\b|\bphp\b|\blaravel\b|\brails\b|\bruby\b/i.test(t)) return 'Backend';
  if (/\bfull.?stack\b|fullstack/i.test(t)) return 'Full Stack';
  if (/\bdevops\b|\bsre\b|\binfra\b|\bcloud\b|\baws\b|\bazure\b|\bgcp\b|\bkubernetes\b|\bdocker\b|\bterraform\b/i.test(t)) return 'DevOps';
  if (/\bdata\b|\banalytics\b|\banalist[ao]s?\b|\banalyst\b|\bmachine.?learning\b|\bml\b|\bai\b|\binteligencia\b|\bartificial\b|\betl\b|\bpower.bi\b|\btableau\b|\blooker\b/i.test(t)) return 'Data';
  if (/\bmobile\b|\bandroid\b|\bios\b|\bswift\b|\bkotlin\b|\bflutter\b|\breact.native\b/i.test(t)) return 'Mobile';
  if (/\bqa\b|\btester\b|\btesting\b|\bcalidad\b|\bquality\b/i.test(t)) return 'QA';
  if (/\bsecurity\b|\bseguridad\b|\bciberseguridad\b|\bpentest\b/i.test(t)) return 'Ciberseguridad';
  if (/\bproject.manager\b|\bscrum.master\b|\bproduct.manager\b|\bproduct.owner\b|\bagile\b|\bjefe\b|\bgerente\b|\blider\b|\blead\b|\btech.lead\b|\bmanager\b|\bdirector\b|\bcoordinador\b/i.test(t)) return 'Gestión';
  if (/\bdiseñ|\bdesigner\b|\bfigma\b|\bsketch\b|\bphotoshop\b|\billustrator\b/i.test(t)) return 'Diseño';
  if (/\bsoporte\b|\bsupport\b|\bhelp.desk\b|\bservice.desk\b/i.test(t)) return 'Soporte';
  return 'Otros';
}

// --- Badge patterns (se colocan donde iría la empresa) ---
const BADGE_RE = /^(1 connection|\d+\+? connections|this company is actively hiring|actively hiring|apply with resume|easy apply|be an early applicant|promoted|no longer accepting)$/i;

// --- Detección de sueldo/rango salarial ---
function extraerSueldo(texto) {
  if (!texto) return null;
  // Pesos chilenos: $1.500.000, $1500000, CLP 1.500.000, CLP$1.5M
  let m = texto.match(/(?:CLP\s*)?\$\s*[\d.,]+\s*(?:[.-]\s*(?:CLP\s*)?\$\s*[\d.,]+)?\s*(?:CLP|clp|pesos|l[ií]quido|bruto|liquido)?/i);
  if (m) return m[0].trim();
  // UF
  m = texto.match(/UF\s*[\d.,]+/i);
  if (m) return m[0].trim();
  // USD / dólares
  m = texto.match(/(?:USD|usd|U\$)\s*[\d.,]+/i);
  if (m) return m[0].trim();
  // Renta/Sueldo/Salario: $X
  m = texto.match(/(?:renta|sueldo|salario|remuneraci[oó]n)\s*:?\s*(?:hasta|desde|entre)?\s*(?:CLP\s*)?\$?\s*[\d.,]+\s*(?:[.-]\s*(?:CLP\s*)?\$?\s*[\d.,]+)?\s*(?:CLP|clp|pesos|l[ií]quido|bruto)?/i);
  if (m) return m[0].trim();
  return null;
}

// --- Procesar cada email ---
for (const item of items) {
  let body = item.json.textPlain || item.json.body || '';
  if (typeof body === 'object' && body.content) body = body.content;
  if (!body || body.length < 20) continue;

  body = decodeQP(body);
  const blocks = body.split(/\n\s*-{15,}\s*\n/);

  for (let bi = 0; bi < blocks.length; bi++) {
    let lines = blocks[bi].trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Bloque 0: saltar header "Your job alert..." y "New jobs match..."
    if (bi === 0) {
      while (lines.length > 0 && /^(your job alert|new jobs match)/i.test(lines[0])) lines.shift();
    }
    // Saltar footer/upsell
    if (/^(see all jobs|stand out|this email was|you are receiving|manage your|unsubscribe|©|linkedin and|learn why|help:)/i.test(lines[0])) continue;
    if (lines.length < 3) continue;

    const titulo = lines[0];
    let empleador = lines[1] || '';
    let ubicacion = lines[2] || '';
    let url = '';
    for (const l of lines) {
      if (/^view job:\s*/i.test(l)) { url = l.replace(/^view job:\s*/i, '').trim(); break; }
    }
    if (!url || !titulo) continue;

    // Desplazar si hay badge
    if (BADGE_RE.test(empleador)) { empleador = lines[2] || ''; ubicacion = lines[3] || ''; }
    if (BADGE_RE.test(ubicacion)) ubicacion = lines[3] || '';

    // Limpiar URL
    const jid = url.match(/\/jobs\/view\/(\d+)/);
    const urlLimpia = jid ? `https://www.linkedin.com/jobs/view/${jid[1]}/` : url.split('?')[0];

    output.push({
      json: {
        titulo,
        url: urlLimpia,
        empleador: empleador || 'No especificado',
        ubicacion: ubicacion || 'Chile',
        sueldo: extraerSueldo(titulo + ' ' + (lines.slice(0, 6).join(' '))),
        descripcion: `${titulo} en ${empleador || 'empresa'}${ubicacion ? ', ' + ubicacion : ''}`,
        categoria: categorizar(titulo),
        fuente: 'linkedin',
        email_origen: item.json.to || item.json.To || '',
        fecha_publicacion: new Date().toISOString()
      }
    });
  }
}

return output;
