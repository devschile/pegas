import { readFileSync } from 'fs';

function decodeQuotedPrintable(str) {
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
  return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
}

function parseEmail(body) {
  const results = [];
  body = decodeQuotedPrintable(body);
  const blocks = body.split(/\n\s*-{15,}\s*\n/);

  for (let bi = 0; bi < blocks.length; bi++) {
    let text = blocks[bi].trim();
    let lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 3) continue;

    // Para el primer bloque: saltar header "Your job alert..." y "New jobs match..."
    if (bi === 0) {
      while (lines.length > 0 && /^(your job alert|new jobs match)/i.test(lines[0])) {
        lines.shift();
      }
    }
    // Saltar bloques footer
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

    // Desplazar por badges
    const badgeRe = /^(1 connection|\d+\+? connections|this company is actively hiring|actively hiring|apply with resume|easy apply|be an early applicant|promoted|no longer accepting)$/i;
    if (badgeRe.test(empleador)) { empleador = lines[2] || ''; ubicacion = lines[3] || ''; }
    if (badgeRe.test(ubicacion)) ubicacion = lines[3] || '';

    const jid = url.match(/\/jobs\/view\/(\d+)/);
    const urlLimpia = jid ? `https://www.linkedin.com/jobs/view/${jid[1]}/` : url.split('?')[0];

    const t = titulo.toLowerCase();
    let cat = 'Otros';
    if (/\bfront.?end\b|frontend|\breact\b|\bvue\b|\bangular\b|\bui.ux\b|\bcss\b|\bhtml\b|\btypescript\b|\bjavascript\b|\bjs\b/i.test(t)) cat = 'Frontend';
    else if (/\bback.?end\b|backend|\bnode\b|\bpython\b|\bdjango\b|\bflask\b|\bgo\b|\bgolang\b|\brust\b|\bjava\b|\bspring\b|\bquarkus\b|\.net\b|\bc#\b|\bphp\b|\blaravel\b|\brails\b|\bruby\b/i.test(t)) cat = 'Backend';
    else if (/\bfull.?stack\b|fullstack/i.test(t)) cat = 'Full Stack';
    else if (/\bdevops\b|\bsre\b|\binfra\b|\bcloud\b|\baws\b|\bazure\b|\bgcp\b|\bkubernetes\b|\bdocker\b|\bterraform\b/i.test(t)) cat = 'DevOps';
    else if (/\bdata\b|\banalytics\b|\banalist[ao]s?\b|\banalyst\b|\bmachine.?learning\b|\bml\b|\bai\b|\binteligencia\b|\bartificial\b|\betl\b|\bpower.bi\b|\btableau\b/i.test(t)) cat = 'Data';
    else if (/\bmobile\b|\bandroid\b|\bios\b|\bswift\b|\bkotlin\b|\bflutter\b/i.test(t)) cat = 'Mobile';
    else if (/\bqa\b|\btester\b|\btesting\b|\bcalidad\b|\bquality\b/i.test(t)) cat = 'QA';
    else if (/\bsecurity\b|\bseguridad\b|\bciberseguridad\b|\bpentest\b/i.test(t)) cat = 'Ciberseguridad';
    else if (/\bproject.manager\b|\bscrum.master\b|\bproduct.manager\b|\bproduct.owner\b|\bagile\b|\bjefe\b|\bgerente\b|\blider\b|\blead\b|\btech.lead\b|\bmanager\b|\bdirector\b/i.test(t)) cat = 'Gestión';
    else if (/\bdiseñ|\bdesigner\b|\bfigma\b/i.test(t)) cat = 'Diseño';
    else if (/\bsoporte\b|\bsupport\b|\bhelp.desk\b/i.test(t)) cat = 'Soporte';

    results.push({ titulo, url: urlLimpia, empleador: empleador || '?', ubicacion: ubicacion || 'Chile', categoria: cat });
  }
  return results;
}

const files = ['emails/ejemplo-1.eml', 'emails/ejemplo-2.eml', 'emails/ejemplo-3.eml'];
let total = 0;
for (const file of files) {
  const raw = readFileSync(file, 'utf-8');
  const m = raw.match(/Content-Type: text\/plain[\s\S]*?\n\n([\s\S]*?)(?=------=_Part)/);
  if (!m) continue;
  const jobs = parseEmail(m[1]);
  console.log(`\n📧 ${file.split('/').pop()}: ${jobs.length} jobs`);
  for (const j of jobs) {
    total++;
    console.log(`  ✅ ${j.titulo}  |  🏢 ${j.empleador}  |  📍 ${j.ubicacion}  |  🏷️ ${j.categoria}`);
  }
}
console.log(`\n🎯 Total: ${total} pegas de 3 emails`);
