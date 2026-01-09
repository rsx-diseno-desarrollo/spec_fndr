
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

  // 4) Re-render de contenido que viene del Excel
  //    Define estas funciones en tus scripts principales para regenerar selects/tablas usando tDisplay().
  function rerenderExcelDrivenUI() {
    // Ejemplos (ajusta a tus funciones reales si existen):
    if (typeof window.renderEmpaqueSelects === 'function') window.renderEmpaqueSelects();
    if (typeof window.renderProductoSelects === 'function') window.renderProductoSelects();
    if (typeof window.renderEmpaqueTable === 'function')   window.renderEmpaqueTable();
    if (typeof window.renderComponentView === 'function')   window.renderComponentView();
  }

  // 5) Cambiar idioma (toggle)
  function setLanguage(lang) {
    LANG = lang;
    localStorage.setItem('lang', lang);
    applyTranslationsToDOM();
    rerenderExcelDrivenUI();
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

  // 7) Helpers globales para usar en tus renders de Excel
  window.tDisplay = tDisplay;
  window.getLang = () => LANG;
  window.setLanguage = setLanguage;
  window.applyTranslationsToDOM = applyTranslationsToDOM;
  window.langReady = langReady;
})();
