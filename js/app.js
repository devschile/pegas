/**
 * pega.devschile.cl — Frontend
 * Carga data.json y renderiza con filtros y búsqueda
 */
(async function () {
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
      list.innerHTML = '<div class="empty"><div class="empty-icon">📭</div><p>No hay pegas aún. ¡Vuelve pronto!</p></div>';
      return;
    }
  } catch (err) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><p>Error al cargar las pegas. Intenta recargar.</p></div>';
    console.error('Error cargando data.json:', err);
    return;
  }

  // === Poblar filtros ===
  categorias.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    filterCat.appendChild(opt);
  });
  fuentes.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f === 'linkedin' ? 'LinkedIn' : f;
    filterSrc.appendChild(opt);
  });

  // === Renderizar ===
  function render(filtered) {
    list.innerHTML = '';
    countVisible.textContent = filtered.length.toLocaleString('es-CL');

    if (filtered.length === 0) {
      list.innerHTML = '<div class="empty"><div class="empty-icon">🔍</div><p>Ninguna pega coincide con los filtros.</p></div>';
      return;
    }

    filtered.forEach(pega => {
      const card = template.content.cloneNode(true);

      card.querySelector('.pega-titulo').textContent = pega.titulo;
      card.querySelector('.pega-fecha').textContent = formatDate(pega.fecha_creacion);
      card.querySelector('.pega-empleador').textContent = pega.empleador;
      card.querySelector('.pega-descripcion').textContent = pega.descripcion;
      card.querySelector('.pega-link').href = pega.url;
      card.querySelector('.badge-categoria').textContent = pega.categoria;
      card.querySelector('.badge-ubicacion').textContent = pega.ubicacion;
      card.querySelector('.badge-fuente').textContent = pega.fuente === 'linkedin' ? 'LinkedIn' : pega.fuente;

      // Data attributes para filtros
      const article = card.querySelector('.pega-card');
      article.dataset.categoria = pega.categoria;
      article.dataset.fuente = pega.fuente;

      list.appendChild(card);
    });
  }

  // === Filtrar ===
  function filter() {
    const q = searchInput.value.toLowerCase().trim();
    const cat = filterCat.value;
    const src = filterSrc.value;

    const filtered = pegas.filter(p => {
      if (cat && p.categoria !== cat) return false;
      if (src && p.fuente !== src) return false;
      if (q) {
        const haystack = `${p.titulo} ${p.empleador} ${p.descripcion} ${p.categoria}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    render(filtered);
  }

  // === Helpers ===
  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} sem`;
    return d.toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // === Event listeners ===
  searchInput.addEventListener('input', filter);
  filterCat.addEventListener('change', filter);
  filterSrc.addEventListener('change', filter);

  // === Render inicial ===
  render(pegas);
})();
