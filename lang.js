
// lang.js
(() => {
  // Idioma actual (persistido)
  let LANG = localStorage.getItem('lang') || 'es';
  // Diccionario en memoria
  let SpecFinderDict = {};

  // Promesa para avisar cuando el diccionario esté listo
  let _resolveReady;
  const langReady = new Promise((resolve) => { _resolveReady = resolve; });

  // 1) Cargar diccionario
  async function loadDict() {
    try {
      const res = await fetch('dict.json', { cache: 'no-cache' }); // cache busting simple
      SpecFinderDict = await res.json();
      _resolveReady?.(); // avisar que ya se puede usar tDisplay
    } catch (err) {
      console.error('Error cargando dict.json:', err);
      // En caso de error, resolvemos igual para no bloquear la app (tDisplay hará fallback)
      _resolveReady?.();
    }
  }

  // 2) Traductor display por clave en español
  function tDisplay(spanishKey) {
    if (spanishKey === null || spanishKey === undefined) return '';
    const key = String(spanishKey);
    const entry = SpecFinderDict[key];
    if (!entry) return key;                // Fallback: muestra ES si no hay clave
    return entry[LANG] || entry['es'] || key;
  }

  // 3) Aplicar traducciones a elementos marcados
  function applyTranslationsToDOM() {
    // Cambia lang del documento (accesibilidad/SEO)
    document.documentElement.setAttribute('lang', LANG);

    // data-text -> innerText
    document.querySelectorAll('[data-text]').forEach(el => {
      const key = el.getAttribute('data-text');
      const translated = tDisplay(key);
      if (translated) el.textContent = translated;
    });

    // data-placeholder -> placeholder
    document.querySelectorAll('[data-placeholder]').forEach(el => {
      const key = el.getAttribute('data-placeholder');
      const translated = tDisplay(key);
      if (translated) el.setAttribute('placeholder', translated);
    });

    // data-alt -> alt
    document.querySelectorAll('[data-alt]').forEach(el => {
      const key = el.getAttribute('data-alt');
      const translated = tDisplay(key);
      if (translated) el.setAttribute('alt', translated);
    });

    // Resaltar botón activo
    document.getElementById('btn-es')?.classList.toggle('active', LANG === 'es');
    document.getElementById('btn-en')?.classList.toggle('active', LANG === 'en');
  }
  
  function rerenderDrivenUI() {
  // Producto
  if (typeof window.renderProductoSelects === 'function') window.renderProductoSelects();

  // Empaque
  if (typeof window.renderEmpaqueSelects === 'function') window.renderEmpaqueSelects();

  // Componentes
  if (typeof window.renderComponentSelects === 'function') window.renderComponentSelects();
  if (typeof window.renderComponentView === 'function') window.renderComponentView();

  // TsTs
  if (typeof window.renderTstsSelects === 'function') window.renderTstsSelects();
}

  // 5) Cambiar idioma (toggle)
  function setLanguage(lang) {
    LANG = lang;
    localStorage.setItem('lang', lang);
    applyTranslationsToDOM();
    rerenderDrivenUI();
  }

  // 6) Bootstrap (cuando el DOM está listo)
  document.addEventListener('DOMContentLoaded', async () => {
    await loadDict();            // carga dict.json
    applyTranslationsToDOM();    // traduce textos estáticos

    // Eventos de los botones ES/EN
    const btnES = document.getElementById('btn-es');
    const btnEN = document.getElementById('btn-en');
    btnES?.addEventListener('click', () => setLanguage('es'));
    btnEN?.addEventListener('click', () => setLanguage('en'));
  });

  langReady.then(() => {
  if (typeof window.renderProductoSelects === 'function') window.renderProductoSelects();
  if (typeof window.renderEmpaqueSelects === 'function') window.renderEmpaqueSelects();
  if (typeof window.renderComponentSelects === 'function') window.renderComponentSelects();
  if (typeof window.renderComponentView === 'function') window.renderComponentView();
  if (typeof window.renderTstsSelects === 'function') window.renderTstsSelects();
});

  // Llenar un <select> con valores desde Excel (valor ES interno, display traducido)
  function fillSelect(valuesES, selectEl, placeholderKey) {
    selectEl.innerHTML = '';

    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = tDisplay(placeholderKey); // ej: "-- Seleccionar cliente --"
    selectEl.appendChild(ph);

    valuesES.forEach(valEs => {
      const opt = document.createElement('option');
      opt.value = valEs;                 // valor original (ES) para la lógica interna
      opt.textContent = tDisplay(valEs); // display traducido si existe en dict.json
      selectEl.appendChild(opt);
    });
  }

  // Render de la tabla de Empaque (headers y valores categóricos)
  function renderEmpaqueTableFromRows(rowsES) {
    const table = document.getElementById('emp-table');
    const tbody = table.querySelector('tbody');

    const headersES = [
      "NO. DE PARTE","COD TARIMA","LARGUEROS","POLIN SUP/INF","FLEJE",
      "MxC","CAMAS","MxT","PESO NETO EMPAQUE (Kg)","LINK"
    ];

    // <thead>
    const thead = table.tHead || table.createTHead();
    const headRow = thead.rows[0] || thead.insertRow();
    headRow.innerHTML = '';
    headersES.forEach(h => {
      const th = document.createElement('th');
      th.textContent = tDisplay(h);
      headRow.appendChild(th);
    });

    // <tbody>
    tbody.innerHTML = '';
    rowsES.forEach(row => {
      const tr = document.createElement('tr');
      headersES.forEach(h => {
        const td = document.createElement('td');
        const val = row[h];
        td.textContent = tDisplay(String(val ?? '')); // traduce si hay clave; si no, deja tal cual
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  // 7) Helpers globales (expuestos)
  window.tDisplay = tDisplay;
  window.getLang = () => LANG;
  window.setLanguage = setLanguage;
  window.applyTranslationsToDOM = applyTranslationsToDOM;
  window.langReady = langReady;
  // Exponer también los helpers opcionales
  window.fillSelect = fillSelect;
  window.renderEmpaqueTableFromRows = renderEmpaqueTableFromRows;
})();
