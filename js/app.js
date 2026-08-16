/**
 * pegas.devschile.cl — Frontend
 * Carga data.json, renderiza con filtros, búsqueda y paginación (25 por página)
 */
(async function () {
  const PAGE_SIZE = 25;
  const list = document.getElementById('pegas-list');
  const searchInput = document.getElementById('search');
  const filterCat = document.getElementById('filter-categoria');
  const filterSrc = document.getElementById('filter-fuente');
  const countVisible = document.getElementById('count-visible');
  const countTotal = document.getElementById('count-total');
  const template = document.getElementById('pega-card');

  // Nombre "bonito" por fuente; para fuentes nuevas cae al valor crudo
  const FUENTE_LABEL = {
    linkedin: 'LinkedIn',
    getonbrd: 'GetOnBoard',
    workingnomads: 'WorkingNomads',
  };
  const labelFuente = f => FUENTE_LABEL[f] || f;

  let pegas = [];
  let categorias = [];
  let fuentes = [];
  let currentPage = 1;
  let filteredPegas = [];
  let paginationEl = null;

  // === Cargar datos ===
  try {
    const resp = await fetch('data/data.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    pegas = data.pegas || [];
    categorias = data.categorias || [];
    fuentes = data.fuentes || [];

    countTotal.textContent = pegas.length.toLocaleString('es-CL');

    if (pegas.length === 0) {
      list.innerHTML = '<div class="empty"><div class="empty-icon">📭</div><p>No hay pegas aún, ¡Vuelve pronto!</p></div>';
      return;
    }
  } catch (err) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">⚠</div><p>Error al cargar las pegas</p></div>';
    return;
  }

  // === Poblar filtros ===
  categorias.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    filterCat.appendChild(opt);
  });
  fuentes.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = labelFuente(f);
    filterSrc.appendChild(opt);
  });

  // === Crear contenedor de paginación ===
  paginationEl = document.createElement('div');
  paginationEl.className = 'pagination';
  list.parentNode.insertBefore(paginationEl, list.nextSibling);

  // === Paginación ===
  function renderPagination(totalFiltered) {
    if (totalFiltered <= PAGE_SIZE) {
      paginationEl.innerHTML = '';
      return;
    }

    const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);
    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, totalFiltered);

    paginationEl.innerHTML = `
      <button id="btn-prev" ${currentPage === 1 ? 'disabled' : ''}>← Anterior</button>
      <span class="page-info">${start}–${end} de ${totalFiltered}</span>
      <button id="btn-next" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente →</button>
    `;

    document.getElementById('btn-prev').addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderPage();
      }
    });
    document.getElementById('btn-next').addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderPage();
      }
    });
  }

  // === Renderizar (solo página actual) ===
  function renderPage() {
    list.innerHTML = '';

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filteredPegas.slice(start, start + PAGE_SIZE);

    countVisible.textContent = filteredPegas.length.toLocaleString('es-CL');

    if (filteredPegas.length === 0) {
      list.innerHTML = '<div class="empty"><div class="empty-icon">🔍</div><p>Ninguna pega coincide</p></div>';
      return;
    }

    pageItems.forEach(pega => {
      const card = template.content.cloneNode(true);

      card.querySelector('.pega-titulo').textContent = pega.titulo;
      card.querySelector('.pega-fecha').textContent = formatDate(pega.fecha_publicacion || pega.fecha_creacion);
      card.querySelector('.pega-empleador').textContent = pega.empleador;
      card.querySelector('.pega-descripcion').textContent = pega.descripcion;
      card.querySelector('.pega-link').href = pega.url;
      card.querySelector('.pega-fuente').textContent = labelFuente(pega.fuente);
      card.querySelector('.badge-categoria').textContent = pega.categoria;
      card.querySelector('.badge-ubicacion').textContent = pega.ubicacion;

      const remoteBadge = card.querySelector('.badge-remote');
      if (pega.tags && pega.tags.includes('remote')) {
        remoteBadge.textContent = '🏠 Remoto';
      } else {
        remoteBadge.remove();
      }

      const sueldoBadge = card.querySelector('.badge-sueldo');
      if (pega.sueldo) {
        sueldoBadge.textContent = '💰 ' + pega.sueldo;
      } else {
        sueldoBadge.remove();
      }

      const article = card.querySelector('.pega-card');
      article.dataset.categoria = pega.categoria;
      article.dataset.fuente = pega.fuente;

      list.appendChild(card);
    });

    renderPagination(filteredPegas.length);
  }

  // === Aplicar filtros ===
  function applyFilters() {
    const q = searchInput.value.toLowerCase().trim();
    const cat = filterCat.value;
    const src = filterSrc.value;

    filteredPegas = pegas.filter(p => {
      if (cat && p.categoria !== cat) return false;
      if (src && p.fuente !== src) return false;
      if (q) {
        const haystack = `${p.titulo} ${p.empleador} ${p.descripcion} ${p.categoria}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    // Reset a página 1 al cambiar filtros
    currentPage = 1;
    renderPage();
  }

  // === Helpers ===
  // "(hoy) 31/07/2026 14:05" — el prefijo relativo solo aparece si es reciente
  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';

    const pad = n => String(n).padStart(2, '0');
    const fecha = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    const hora = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

    const rel = relativeLabel(d);
    return rel ? `(${rel}) ${fecha} ${hora}` : `${fecha} ${hora}`;
  }

  function relativeLabel(d) {
    // Diferencia por día calendario, no por horas transcurridas: algo publicado
    // ayer a las 23:00 no debe decir "hoy" solo porque pasaron 2 horas.
    const soloDia = x => new Date(x.getFullYear(), x.getMonth(), x.getDate());
    const days = Math.round((soloDia(new Date()) - soloDia(d)) / 86400000);

    if (days <= 0) return 'hoy';
    if (days === 1) return 'ayer';
    if (days < 7) return `hace ${days}d`;
    if (days < 30) return `hace ${Math.floor(days / 7)}sem`;
    return null;
  }

  // === Event listeners ===
  searchInput.addEventListener('input', applyFilters);
  filterCat.addEventListener('change', applyFilters);
  filterSrc.addEventListener('change', applyFilters);

  // === Render inicial ===
  filteredPegas = pegas;
  renderPage();
})();
