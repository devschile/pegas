/**
 * Categorización de pegas por título — FUENTE DE VERDAD ÚNICA.
 *
 * Antes existían cinco copias de esta función (una en `parser-code.js` y
 * cuatro nodos Code distintos dentro de `workflow.json`) que se habían ido
 * separando entre sí: la copia de GetOnBoard no tenía regla de "Gestión" ni
 * de "Soporte", y la de LinkedIn evaluaba Data antes que QA mientras las
 * otras cuatro lo hacían al revés. De ahí salía que "Soporte" tuviera 1 sola
 * pega en producción con 945 publicadas, y que "Analista QA Funcional"
 * quedara en Data o en QA según por qué fuente hubiera entrado.
 *
 * Los nodos Code de n8n no pueden importar módulos, así que las copias siguen
 * existiendo, pero ya no se editan a mano: `node n8n/sync-categorizar.js`
 * toma el bloque entre los marcadores de abajo y lo reinyecta en
 * `parser-code.js` y en cada nodo de `workflow.json`. Se edita solo este archivo.
 *
 * EL ORDEN DE LAS REGLAS ES LA LÓGICA: se evalúan de arriba a abajo y gana la
 * primera que matchea, así que mover un bloque reclasifica pegas que hoy caen
 * bien. Cada bloque documenta por qué está donde está.
 *
 * Complemento, no reemplazo: GetOnBoard y WorkingNomads además traen su
 * propia categoría de origen (`CATEGORIA_FALLBACK` en sus nodos), que se usa
 * solo cuando el título no alcanza para decidir y esta función devuelve
 * 'Otros'. Por eso hay pegas bien clasificadas cuyo título, por sí solo, no
 * matchea ninguna regla de acá.
 */

// ===== INICIO categorizar (bloque inyectado por sync-categorizar.js) =====
function categorizar(t) {
  t = (t || '').toLowerCase();

  // 0. Guarda de avisos que no son de TI. Va PRIMERO porque varios de estos
  // títulos traen palabras que más abajo son señal fuerte de otra cosa:
  // "Social Media & Community *Analyst*" caía en Data y "*Community Manager*"
  // caería en Liderazgo. Lista corta y explícita a propósito — acá un falso
  // positivo saca del listado una pega que sí era válida.
  if (/\bcontent (reviewer|creator|writer)\b|\besl\b|\bteacher\b|\bprofesor|\btutor(ing|ía)?\b|\bredactor|\bcopywriter\b|\bcommunity (manager|analyst)\b|\bsocial media\b|\bappointment setting?\b|\bvideo editor\b|\bshort-form video\b|\bcoletor de dados\b|\bphoto collection\b|\bdeduplication collection\b/i.test(t)) return 'Otros';

  // 1-4. Stack explícito en el título: la señal más confiable que hay, así que
  // va antes que cualquier rol. Se conservan tal cual venían de producción,
  // incluido que \breact\b gane antes que Mobile en "React Native" (cambiarlo
  // movería pegas que hoy están clasificadas como Frontend).
  if (/\bfront.?end\b|frontend|\breact\b|\bvue\b|\bangular\b|\bui.ux\b|\bcss\b|\bhtml\b|\btypescript\b|\bjavascript\b|\bjs\b/i.test(t)) return 'Frontend';

  // Backend ampliado con lenguajes y runtimes de servidor que no estaban y por
  // eso caían en Otros (COBOL/mainframe, Elixir/Phoenix, Scala, C++...).
  // Ojo: acá NO van las plataformas de ecosistema (Shopify, Salesforce, SAP,
  // ServiceNow, Oracle...) — esas tienen su propia regla más abajo, a Otros.
  if (/\bback.?end\b|backend|\bnode\b|\bpython\b|\bdjango\b|\bflask\b|\bfastapi\b|\bgo\b|\bgolang\b|\brust\b|\bjava\b|\bspring\b|\bquarkus\b|\.net\b|\bc#\b|\bc\+\+|\bphp\b|\blaravel\b|\bsymfony\b|\brails\b|\bruby\b|\bnestjs\b|\bcobol\b|\bmainframe\b|\bas.?400\b|\bscala\b|\belixir\b|\bphoenix\b|\berlang\b|\bclojure\b|\bperl\b|\bdelphi\b|\brest api(s)?\b|\bapi(s)? rest\b|\bmicroservici/i.test(t)) return 'Backend';

  if (/\bfull.?stack\b|fullstack/i.test(t)) return 'Full Stack';

  // \binfra\b no matcheaba "Infraestructura" ni "Infrastructure" (no hay borde
  // de palabra dentro de la palabra), así que esos avisos dependían de que la
  // fuente trajera categoría propia y si no se iban a Otros.
  if (/\bdevops\b|\bsre\b|\binfra(estructura|structure)?\b|\bcloud\b|\baws\b|\bazure\b|\bgcp\b|\bkubernetes\b|\bdocker\b|\bterraform\b|\bdeploy(ment)?\b|\bsys.?admin\b/i.test(t)) return 'DevOps';

  // 5. QA. Va antes de AI y de Data/BI —como ya hacían 4 de las 5 copias— para
  // que "Analista QA Funcional" sea QA y no Data por la palabra "analista", y
  // que "Senior QA Engineer (AI Platform Systems)" sea QA y no AI. La excepción
  // por \bdata\b es para el caso inverso: "Data Quality Analyst" es Data/BI,
  // el "quality" ahí califica al dato, no al rol.
  if (/\bqa\b|\bsdet\b|\btester\b|\btesting\b|\bcalidad\b|\bquality\b/i.test(t) && !/\bdata\b/i.test(t)) return 'QA';

  // 6. Soporte. Antes de Data/BI por el mismo motivo que QA: "Analista de
  // Soporte Técnico" y "Analista de Soporte y Monitoreo (NOC)" caían en Data
  // por la palabra "analista". Además, esta regla solo existía en la copia de
  // LinkedIn — las otras cuatro fuentes no podían producir la categoría nunca,
  // y de ahí que "Soporte" tuviera 1 sola pega con 945 publicadas.
  if (/\bsoporte\b|\bsupport\b|\bhelp.?desk\b|\bservice.?desk\b|\bmesa de ayuda\b|\bnoc\b/i.test(t)) return 'Soporte';

  // 6. IA/ML/LLM. Categoría nueva: estos términos vivían dentro de la regla de
  // Data y se llevaban 72 de sus 194 pegas ("AI Engineer", "AI Automation
  // Engineer", "Forward Deployed AI Engineer"), que no son ingeniería de datos.
  // Va antes de Data/BI pero después del stack explícito, para que un
  // "Python ML Engineer" siga siendo Backend igual que hoy.
  if (/\bia\b|\ba\.?i\.?\b|\bml\b|\bmlops\b|\bllm(s)?\b|\bgen.?ai\b|\bnlp\b|\bmachine.?learning\b|\bdeep.?learning\b|\bcomputer vision\b|\binteligencia artificial\b|\bartificial intelligence\b|\bprompt engineer/i.test(t)) return 'AI/ML';

  // 7. Data/BI (antes "Data"). Sin los términos de IA, que subieron a la regla
  // anterior, y con \bbi\b agregado: solo estaba \bpower.bi\b, así que
  // "Senior BI Developer (Tableau)" no matcheaba por "BI".
  if (/\bdata\b|\bdatos\b|\banalis(ta|tas)\b|\banalyst(s)?\b|\banalytics\b|\betl\b|\belt\b|\bbi\b|\bpower.?bi\b|\btableau\b|\blooker\b|\bqlik\b|\bwarehouse\b|\bdbt\b|\bspark\b|\bsnowflake\b|\bdatabricks\b/i.test(t)) return 'Data/BI';

  if (/\bmobile\b|\bm[oó]vil(es)?\b|\bandroid\b|\bios\b|\bswift\b|\bkotlin\b|\bflutter\b|\breact.native\b/i.test(t)) return 'Mobile';

  // \bsecurity\b no matcheaba "cybersecurity" por el mismo motivo que \binfra\b:
  // "Cybersecurity Lead" terminaba en Liderazgo y "Senior Cybersecurity
  // Specialist" en Otros.
  if (/\bsecurity\b|\bcyber|\bciber|\bseguridad\b|\bpentest|\bethical hack|\bdevsecops\b|\binfosec\b|\bappsec\b|\bsoc\b/i.test(t)) return 'Ciberseguridad';

  // 8. Diseño va ANTES de Liderazgo: "Líder UX/UI", "UX Design Lead" y
  // "UX Design Manager" son pegas de diseño con un modificador de rol, no
  // pegas de liderazgo. (La copia de LinkedIn las mandaba a Gestión.)
  if (/\bdiseñ|\bdesign(er)?\b|\bart director\b|\bux\b|\bui\b|\bfigma\b|\bsketch\b|\bphotoshop\b|\billustrator\b/i.test(t)) return 'Diseño';

  // 9. Liderazgo (antes "Gestión"), ampliada con arquitecto/CTO/subgerente/VP,
  // que caían en Otros. Va después del stack, de Data/BI y de Diseño a
  // propósito: un "Arquitecto de Datos" o un "Engineering Manager, Data" siguen
  // siendo pegas de datos — el liderazgo es el modificador, no el eje.
  if (/\bproject.manager\b|\bscrum.master\b|\bproduct.manager\b|\bproduct.owner\b|\bagile\b|\bjefe\b|\bgerente\b|\bsub.?gerente\b|\bl[ií]der\b|\blead\b|\btech.?lead\b|\bmanager\b|\bdirector\b|\bcoordinador\b|\barquitect|\barchitect\b|\bcto\b|\bcio\b|\bciso\b|\bhead of\b|\bvp\b|\bvicepresident/i.test(t)) return 'Liderazgo';

  // 11. Plataformas de ecosistema. Van ANTES de la regla de dev genérico
  // porque si no "Shopify Developer" o "Consultor/a SAP" se colarían a
  // Full Stack por la palabra "developer"/"desarrollador".
  if (/\bshopify\b|\bsalesforce\b|\bsap\b|\babap\b|\bservicenow\b|\bodoo\b|\bmagento\b|\bwordpress\b|\bdrupal\b|\bsharepoint\b|\bdynamics\b|\bsiebel\b|\bpeoplesoft\b|\boracle\b/i.test(t)) return 'Otros';

  // 12. Dev genérico sin stack en el título ("Software Engineer",
  // "Desarrollador/a Senior", "Programador/a"): era el 70% de Otros. Va al
  // final justo por eso — solo agarra lo que ninguna regla más específica
  // reclamó. "Ingeniero" a secas NO entra: en el corpus hay "Ingeniero Civil
  // Industrial" y "Ingeniero de Estudios Actuariales", que no son pegas dev.
  if (/\bsoftware engineer\b|\bsoftware develop|\bingenier[oa]?(?:\/a|\(a\))?\s+(?:de\s+|en\s+)?software\b|\bingenier[ií]a de software\b|\bdesarrollador|\bdesarrolladora|\bdesarrollo de software\b|\bdeveloper\b|\bprogramador|\bprogramadora|\bweb develop/i.test(t)) return 'Full Stack';

  return 'Otros';
}
// ===== FIN categorizar =====

/**
 * Lista canónica de categorías. La usa `sync-categorizar.js --check` para
 * detectar drift: si un nodo devuelve o mapea una categoría que no está acá
 * (por ejemplo el viejo 'Data' después de renombrar a 'Data/BI'), el chequeo
 * falla en vez de dejar una categoría huérfana suelta en producción.
 */
const CATEGORIAS = [
  'AI/ML',
  'Backend',
  'Ciberseguridad',
  'Data/BI',
  'DevOps',
  'Diseño',
  'Frontend',
  'Full Stack',
  'Liderazgo',
  'Mobile',
  'Otros',
  'QA',
  'Soporte',
];

export { categorizar, CATEGORIAS };
