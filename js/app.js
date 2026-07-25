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
      list.innerHTML = '<div class="empty"><div class="empty-icon">📭</div><p>no hay pegas aún, ¡vuelve pronto!</p></div>';
      return;
    }
  } catch (err) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">⚠</div><p>error al cargar las pegas</p></div>';
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
    opt.textContent = f === 'linkedin' ? 'LinkedIn' : f;
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
      <button id="btn-prev" ${currentPage === 1 ? 'disabled' : ''}>← anterior</button>
      <span class="page-info">${start}–${end} de ${totalFiltered}</span>
      <button id="btn-next" ${currentPage === totalPages ? 'disabled' : ''}>siguiente →</button>
    `;

    document.getElementById('btn-prev').addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        applyFilters();
      }
    });
    document.getElementById('btn-next').addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        applyFilters();
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
      list.innerHTML = '<div class="empty"><div class="empty-icon">🔍</div><p>ninguna pega coincide con los filtros</p></div>';
      return;
    }

    pageItems.forEach(pega => {
      const card = template.content.cloneNode(true);

      card.querySelector('.pega-titulo').textContent = pega.titulo;
      card.querySelector('.pega-fecha').textContent = formatDate(pega.fecha_creacion);
      card.querySelector('.pega-empleador').textContent = pega.empleador;
      card.querySelector('.pega-descripcion').textContent = pega.descripcion;
      card.querySelector('.pega-link').href = pega.url;
      card.querySelector('.badge-categoria').textContent = pega.categoria;
      card.querySelector('.badge-ubicacion').textContent = pega.ubicacion;

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
  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'hoy';
    if (days === 1) return 'ayer';
    if (days < 7) return `hace ${days}d`;
    if (days < 30) return `hace ${Math.floor(days / 7)}sem`;
    return d.toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // === Event listeners ===
  searchInput.addEventListener('input', applyFilters);
  filterCat.addEventListener('change', applyFilters);
  filterSrc.addEventListener('change', applyFilters);

  // === Render inicial ===
  filteredPegas = pegas;
  renderPage();
})();
