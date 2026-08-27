/**
 * Tests de la categorización de pegas.
 *
 * Ejecutar: node n8n/test-categorizar.js
 *
 * Los títulos de los casos son reales (salieron del corpus publicado en
 * pegas.devschile.cl). Casi todos los casos de acá abajo son regresiones que
 * de verdad estaban en producción, no ejemplos inventados: mientras esta
 * suite pase, ninguna de esas vuelve.
 *
 * Como el orden de las reglas ES la lógica, la mitad de los casos existen
 * para fijar un desempate concreto ("Python ML Engineer" es Backend y no AI,
 * "Analista QA Funcional" es QA y no Data/BI). Si mueves un bloque de reglas
 * en categorizar.js, lo que se rompe acá te dice a quién le sacaste la pega.
 */
import { categorizar, CATEGORIAS } from './categorizar.js';

let fallas = 0;
function chequear(titulo, esperada) {
  const real = categorizar(titulo);
  const ok = real === esperada;
  if (!ok) fallas++;
  console.log(`  ${ok ? 'ok  ' : 'FALLA'}  ${esperada.padEnd(14)} ← "${titulo}"${ok ? '' : `  (dio "${real}")`}`);
}

console.log('\n— Cada categoría produce al menos un resultado —');
chequear('Senior Frontend Developer React', 'Frontend');
chequear('Desarrollador Backend Python/Django', 'Backend');
chequear('Full Stack Engineer', 'Full Stack');
chequear('DevOps Engineer AWS/Kubernetes', 'DevOps');
chequear('QA Automation Engineer', 'QA');
chequear('Senior AI Engineer (LLM)', 'AI/ML');
chequear('Senior Data Engineer (Databricks)', 'Data/BI');
chequear('Android Developer Kotlin', 'Mobile');
chequear('Pentester / Ethical Hacker', 'Ciberseguridad');
chequear('UX/UI Designer', 'Diseño');
chequear('Tech Lead', 'Liderazgo');
chequear('Analista de Soporte Técnico', 'Soporte');
chequear('Ingeniero Civil Industrial', 'Otros');

console.log('\n— AI sale de Data/BI, pero no le gana al stack explícito —');
chequear('AI Automation Engineer', 'AI/ML');
chequear('Machine Learning Engineer', 'AI/ML');
chequear('Forward Deployed AI Engineer', 'AI/ML');
chequear('Líder Técnico IA', 'AI/ML');
chequear('Prompt Engineer', 'AI/ML');
// El stack manda: estos dos siguen donde estaban antes del cambio.
chequear('Senior Python Machine Learning Engineer', 'Backend');
chequear('React AI Chatbot Developer', 'Frontend');
// Y "data" a secas sigue siendo Data/BI: la IA es el modificador, no el eje.
chequear('Data Scientist', 'Data/BI');
chequear('Senior BI Developer (Tableau)', 'Data/BI');
chequear('Arquitecto de Datos Sr.', 'Data/BI');

console.log('\n— Dev genérico sin stack en el título cae en Full Stack —');
chequear('Software Engineer', 'Full Stack');
chequear('Senior Software Engineer (Chile)', 'Full Stack');
chequear('Ingeniero/a de Software', 'Full Stack');
chequear('Programador/a', 'Full Stack');
chequear('Desarrollador Senior', 'Full Stack');
// "Ingeniero" a secas NO alcanza: hay pegas que no son de desarrollo.
chequear('Ingeniero(a) de Estudios Actuariales', 'Otros');
chequear('Práctica de Ingeniería Civil Industrial para área de Riesgos', 'Otros');

console.log('\n— Backend ampliado (antes caían en Otros) —');
chequear('Especialista COBOL Mainframe', 'Backend');
chequear('Software Engineer (Elixir/Phoenix) - Latin America', 'Backend');
chequear('Desarrollador Scala Senior', 'Backend');

console.log('\n— Plataformas de ecosistema: Otros, y antes del dev genérico —');
chequear('Shopify Developer', 'Otros');
chequear('Salesforce Developer', 'Otros');
chequear('Consultor/a SAP Re (Real Estate Management)', 'Otros');

console.log('\n— Regresiones de borde de palabra (\\b no matchea dentro de una palabra) —');
// \bsecurity\b no matchea "cybersecurity": estas dos terminaban en Liderazgo y Otros.
chequear('Cybersecurity Lead', 'Ciberseguridad');
chequear('Senior Cybersecurity Specialist', 'Ciberseguridad');
// \binfra\b no matchea "Infraestructura"/"Infrastructure".
chequear('Ingeniero de Infraestructura', 'DevOps');
chequear('Infrastructure Engineer', 'DevOps');
// \bmobile\b no matchea "móvil".
chequear('Desarrollador Movil Semi-Senior', 'Mobile');
chequear('Desarrollador de aplicaciones para móviles', 'Mobile');

console.log('\n— Desempates de orden —');
// QA antes que Data/BI: "analista" no puede secuestrar una pega de QA...
chequear('Analista QA Funcional (Manual)', 'QA');
// ...pero "Data Quality Analyst" sí es Data/BI: el "quality" califica al dato.
chequear('Data Quality Analyst / Data Steward', 'Data/BI');
// QA antes que AI y que Mobile.
chequear('Senior QA Engineer (AI Platform Systems)', 'QA');
chequear('QA Automatizador Mobile', 'QA');
// Diseño antes que Liderazgo: son pegas de diseño con modificador de rol.
chequear('Líder UX/UI', 'Diseño');
chequear('UX Design Manager', 'Diseño');
// Data/BI antes que Liderazgo, por el mismo motivo.
chequear('Engineering Manager, Data Acquisition Bulk', 'Data/BI');
chequear('Jefe/a de Ingeniería y Gobierno de Datos', 'Data/BI');
// Liderazgo ampliada con arquitecto / subgerente / VP / CTO.
chequear('Arquitecto/a de Sistemas', 'Liderazgo');
chequear('Subgerente de Tecnologías de la Información', 'Liderazgo');
chequear('VP of Engineering', 'Liderazgo');

console.log('\n— Guarda de avisos que no son de TI —');
// "Analyst"/"Manager" acá son ruido: sin la guarda caían en Data/BI y Liderazgo.
chequear('Social Media & Community Analyst', 'Otros');
chequear('Community Manager', 'Otros');
chequear('Content Reviewer - United States', 'Otros');
chequear('Looking For Online ESL Teachers - Remote', 'Otros');

console.log('\n— Entradas degeneradas —');
chequear('', 'Otros');
chequear('☁️', 'Otros');

const fuera = ['Frontend', 'Backend', 'Full Stack', 'DevOps', 'QA', 'AI/ML', 'Data/BI', 'Mobile',
  'Ciberseguridad', 'Diseño', 'Liderazgo', 'Soporte', 'Otros'].filter(c => !CATEGORIAS.includes(c));
if (fuera.length) {
  fallas++;
  console.log(`\n  FALLA  categorías que la función devuelve pero no están en CATEGORIAS: ${fuera.join(', ')}`);
}

console.log(fallas === 0 ? '\nTodo ok\n' : `\n${fallas} falla(s)\n`);
process.exit(fallas === 0 ? 0 : 1);
