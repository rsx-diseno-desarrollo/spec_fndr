//  COMPONENTES
// ======================================================

// ============================
// ESTADO COMPONENTES (idioma)
// ============================
let unidadComp = localStorage.getItem("unidadComp") || "mm";
window._componentesData = [];
window._componentesMatch = null;


(function initComponentesDesdeSupabase() {
  const sb = window.supabaseClient;
  const tipoComp      = document.getElementById("tipoComp");
  const codigoInput   = document.getElementById("codigoComp");
  const autocomplete  = document.getElementById("autocomplete-list");
  const btnBuscarComp = document.getElementById("btnBuscarComp");

  if (!tipoComp || !codigoInput || !autocomplete || !btnBuscarComp) return;

  // 1) Tipos activos (comp_tipo.nombre)
  (async () => {
    const { data } = await sb.from('comp_tipo').select('nombre').eq('activo', true).order('nombre', { ascending: true });
    const tipos = (data ?? []).map(r => String(r.nombre)).filter(Boolean);
    fillSelectFromExcel(tipos, tipoComp, "-- Seleccionar tipo --");
  })();

  // 2) Autocomplete por código filtrando por tipo (v_comp)
  codigoInput.addEventListener("input", async () => {
    const texto = (codigoInput.value || "").trim().toLowerCase();
    autocomplete.innerHTML = "";
    if (!texto || !tipoComp.value) return;

    const { data } = await sb
      .from('v_comp')
      .select('codigo')
      .eq('tipo', tipoComp.value)
      .ilike('codigo', `%${texto}%`)
      .limit(10);

    [...new Set((data ?? []).map(r => r.codigo))].forEach(code => {
      const div = document.createElement("div");
      div.classList.add("autocomplete-item");
      div.textContent = code;
      div.onclick = () => { codigoInput.value = code; autocomplete.innerHTML = ""; };
      autocomplete.appendChild(div);
    });
  });

  // 3) Buscar 1 componente y render
  btnBuscarComp.addEventListener("click", async () => {
    const tipo   = tipoComp.value || "";
    const codigo = (codigoInput.value || "").trim();
    if (!tipo || !codigo) {
      showMessage(tDisplay("Seleccione tipo y escriba un código."), "warn");
      const imgEl = document.getElementById("comp-img");
      imgEl?.removeAttribute("src");
      document.getElementById("cotas-list")?.replaceChildren();
      return;
    }

    const { data } = await sb.from('v_comp').select('*')
      .eq('tipo', tipo).eq('codigo', codigo).limit(1);
    const match = (data ?? [])[0];
    if (!match) {
      showMessage("No se encontró el componente.", "empty");
      return;
    }

    // Guarda el match en el formato que ya consume tu render actual
    window._componentesMatch = {
      "TIPO DE COMPONENTE": match.tipo,
      "CODIGO COMPONENTES": match.codigo,
      "NO. DE DIBUJO/PARTE": match.doc_codigo ?? "--",
      "NOMBRE DE DOCUMENTO": match.nombre ?? "--",
      // Cotas: si aún no tienes columnas A..J en DB, déjalas null/undefined
      "A": match.a, "B": match.b, "C": match.c, "D": match.d,
      "RADIO": match.e, "E": match.e, "F": match.f, "G": match.g, "H": match.h, "I": match.i, "J": match.j,
      // img_key = nombre.png que viene de DB (ct.img_key)
      "_img_key": match.img_key
    };

    // Imagen desde tu carpeta local del repo
    const imgEl = document.getElementById("comp-img");
    const src = window._componentesMatch._img_key
      ? `img/${window._componentesMatch._img_key}`
      : null;
    if (src) {
      mostrarImagenCuandoCargue(imgEl, src, tDisplay("Imagen del componente"));
    } else {
      showMessage("No hay imagen registrada para este tipo.", "warn");
      imgEl?.removeAttribute("src");
    }

    // Render encabezado + cotas
    renderComponentView();
  });
})();

// Convierte un número en mm a texto en la unidad seleccionada
function convertirNumero(numMm) {
  if (!isFinite(numMm)) return "--";
  if (unidadComp === "in") {
    const inches = numMm / 25.4;
    return inches.toFixed(3);    // 3 decimales en pulgadas
  }
  return Number.isInteger(numMm) ? String(numMm) : numMm.toFixed(2); // mm
}

// Intenta convertir un string a número (soporta coma decimal)
function aNumeroSeguro(s) {
  if (s === null || s === undefined) return NaN;
  const limpio = String(s).trim().replace(",", "."); // por si viene decimal con coma
  const n = Number(limpio);
  return isFinite(n) ? n : NaN;
}

// Convierte un valor que puede ser número o rango "a-b"
function convertirValorO_Rango(raw) {
  if (raw === "" || raw === null || raw === undefined) return "--";

  const str = String(raw).trim();

  // 1) Detectar rango "a - b" con guion normal, largo o en-dash
  //    admite espacios alrededor del separador
  const rangoRegex = /^([+-]?\d+(?:[.,]\d+)?)\s*[-–—]\s*([+-]?\d+(?:[.,]\d+)?)$/;
  const m = str.match(rangoRegex);
  if (m) {
    const a = aNumeroSeguro(m[1]);
    const b = aNumeroSeguro(m[2]);
    if (isFinite(a) && isFinite(b)) {
      const convA = convertirNumero(a);
      const convB = convertirNumero(b);
      const sufijo = (unidadComp === "in" ? " in" : " mm");
      // usa un en-dash (–) para legibilidad en rangos
      return `${convA}–${convB}${sufijo}`;
    }
    // si no se pudo convertir, devuelve tal cual
    return str;
  }

  // 2) No es rango: intenta numero simple
  const n = aNumeroSeguro(str);
  if (isFinite(n)) {
    return `${convertirNumero(n)}${unidadComp === "in" ? " in" : " mm"}`;
  }

  // 3) Valor no numérico (p.ej. "M8 x 1.25", "Ø12"): déjalo tal cual
  return str;
}

function showMessage(text, kind = "info") {
  const resultsComp = document.getElementById("results-comp");
  if (!resultsComp) return;

  const header = resultsComp.querySelector("#comp-header");
  if (!header) return;

  const msgClass = kind === "warn" ? "msg-warn"
                : kind === "empty" ? "msg-empty"
                : kind === "error" ? "msg-error"
                : "msg-info";

  header.innerHTML = `<span class="${msgClass}">${text}</span>`;
}

function ocultarImagen(img) {
    img.classList.remove("is-visible");
    img.removeAttribute("src");
    img.alt = "Imagen del componente";
  }

  function mostrarImagenCuandoCargue(img, src, alt) {
    img.classList.remove("is-visible"); // ocultar mientras carga
    img.alt = alt || "Imagen del componente";
    img.onload = () => img.classList.add("is-visible");
    img.onerror = () => {
      showMessage("No se pudo cargar la imagen del componente.", "error");
      img.classList.remove("is-visible");
      img.removeAttribute("src");
    };
    img.src = src;
  }

function renderCotas(match) {
  const resultsComp = document.getElementById("results-comp");
  const cotasList = resultsComp?.querySelector("#cotas-list");
  if (!cotasList) return;

  const cotas = {
    A: match["A"],
    B: match["B"],
    C: match["C"],
    D: match["D"],
    E: match["RADIO"],          // si prefieres etiqueta "R", cambia la key a "R"
    // NO convertir (texto/códigos):
    "CUERDA": `1/2" - 20 UNF_2A`,
    "GRADO DE DUREZA": `8° - 33-39 Rc.`
  };

  cotasList.innerHTML = "";

    Object.entries(cotas).forEach(([label, rawValue]) => {
    const esMetrica = ["A","B","C","D","E","R","RADIO"].includes(label.toUpperCase());
    const mostrado  = esMetrica
      ? convertirValorO_Rango(rawValue)           // <-- AQUÍ
      : (rawValue ?? "--");

    const item = document.createElement("div");
    item.className = "cota-item";
    item.innerHTML = `
      <span class="cota-label">${tDisplay(label)}:</span>
      <span class="cota-value">${mostrado}</span>
    `;
    cotasList.appendChild(item);
  });
}

// ======================================================
//  COMPONENTES END

// ======================================================
//  RENDER COMPONENTES (idioma)
// ======================================================

window.renderComponentSelects = function () {
  const tipoComp = document.getElementById("tipoComp");
  if (!tipoComp) return;

  const compData = (window.data && window.data.comp) ? window.data.comp : [];
  const tiposES = [...new Set(compData.map(x => String(x["TIPO DE COMPONENTE"] ?? "").trim()))]
                  .filter(Boolean)
                  .sort();

  // Limpia y vuelve a llenar usando helper que ya traduce el placeholder
  fillSelectFromExcel(tiposES, tipoComp, "-- Seleccionar tipo --");

  // Si quieres que se conserve la selección actual (si existía), vuelve a setear value:
  // const prev = localStorage.getItem('tipoCompLast') ?? "";
  // if (prev && tiposES.includes(prev)) tipoComp.value = prev;
};

// (Opcional) Guarda la última selección para restaurarla tras re-render
document.getElementById("tipoComp")?.addEventListener("change", (e) => {
  localStorage.setItem('tipoCompLast', String(e.target.value ?? ""));
});

window.renderComponentView = function () {
  const match = window._componentesMatch;
  if (!match) return;

  const resultsComp = document.getElementById("results-comp");
  const imgEl = resultsComp.querySelector("#comp-img");
  const header = resultsComp.querySelector("#comp-header");

  const numero = String(match["NO. DE DIBUJO/PARTE"] ?? "--").trim();
  const nombre = String(match["NOMBRE DE DOCUMENTO"] ?? "--").trim();
  header.textContent = `${numero} / ${nombre}`;

  // Imagen (preferimos la de DB -> 'img/<img_key>')
  const src = match._img_key ? `img/${match._img_key}` : null;
  if (src) {
    mostrarImagenCuandoCargue(imgEl, src, tDisplay("Imagen del componente"));
  }

  // Cotas
  renderCotas(match);
};
