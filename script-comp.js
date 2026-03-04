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
    const { data } = await sb.from('comp_tipo')
      .select('nombre')
      .eq('activo', true)
      .order('nombre', { ascending: true });
    const tipos = (data ?? []).map(r => String(r.nombre)).filter(Boolean);
    fillSelect(tipos, tipoComp, "-- Seleccionar tipo --");
  })();

  // 2) Autocomplete por código filtrando por tipo (v_comp)
  if (typeof bindOnce !== "function") {
    window.bindOnce = function (el, event, key, handler) {
      const flag = `__bound_${key}`;
      if (el[flag]) return;
      el.addEventListener(event, handler);
      el[flag] = true;
    };
  }

  bindOnce(codigoInput, "input", "comp_autocomplete", async () => {
    const texto = (codigoInput.value || "").trim().toLowerCase();
    autocomplete.innerHTML = "";
    if (!texto || !tipoComp.value) return;

    const { data } = await window.supabaseClient
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
  bindOnce(btnBuscarComp, "click", "comp_buscar", async () => {
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
      "A": match["A"], "B": match["B"], "C": match["C"], "D": match["D"], "E": match["E"],
      "F": match["F"], "G": match["G"], "H": match["H"], "I": match["I"], "J": match["J"],
      "_img_key": match.img_key, "link_rms": match.link_rms
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

// --- Escucha del selector de unidad (mm/in) y re-render de cotas ---
{
  const unidadSelect = document.getElementById("comp-unidad");
  if (unidadSelect) {
    unidadSelect.value = unidadComp;

    if (typeof bindOnce !== "function") {
      window.bindOnce = function (el, event, key, handler) {
        const flag = `__bound_${key}`;
        if (el[flag]) return;
        el.addEventListener(event, handler);
        el[flag] = true;
      };
    }

    bindOnce(unidadSelect, "change", "comp_unidad", () => {
      unidadComp = unidadSelect.value;
      localStorage.setItem("unidadComp", unidadComp);
      if (window._componentesMatch) renderCotas(window._componentesMatch);
    });
  }
}

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

  // Soporte: "-", "–", "—"
  const rangoRegex = /^([+-]?\d+(?:[.,]\d+)?)\s*[-–—]\s*([+-]?\d+(?:[.,]\d+)?)$/;
  const m = str.match(rangoRegex);
  if (m) {
    const a = aNumeroSeguro(m[1]);
    const b = aNumeroSeguro(m[2]);
    if (isFinite(a) && isFinite(b)) {
      const convA = convertirNumero(a);
      const convB = convertirNumero(b);
      const sufijo = (unidadComp === "in" ? " in" : " mm");
      return `${convA}–${convB}${sufijo}`;
    }
    return str; // si no parsea, muéstralo tal cual
  }
  // Número simple
  const n = aNumeroSeguro(str);
  if (isFinite(n)) {
    return `${convertirNumero(n)}${unidadComp === "in" ? " in" : " mm"}`;
  }
  // Texto técnico
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

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function toSafeHref(url) {
  if (!url) return "";
  const u = String(url).trim();

  // Permitir http(s) y rutas relativas internas
  if (/^https?:\/\//i.test(u) || u.startsWith("/")) return u;

  // Permitir hosts de intranet sin esquema, ej: "rsx-sviis1/rms/..."
  if (/^[a-z0-9._-]+(?:\:[0-9]+)?\//i.test(u)) return "http://" + u;

  // Rechazar esquemas no permitidos (javascript:, data:, etc.)
  return "";
}

function renderCotas(match) {
  const resultsComp = document.getElementById("results-comp");
  const cotasList = resultsComp?.querySelector("#cotas-list");
  if (!cotasList) return;

  const orden = ["A","B","C","D","E","F","G","H","I","J"];
  cotasList.innerHTML = "";

  orden.forEach(label => {
    const raw = match[label]; // A..J directamente
    const mostrado = convertirValorO_Rango(raw);

    // Si no hay valor usable, no renderizar el item
    if (!mostrado || mostrado === "--") return;

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
//  RENDER COMPONENTES (idioma)
// ======================================================

window.renderComponentSelects = function () {
  const tipoComp = document.getElementById("tipoComp");
  if (!tipoComp || !window.supabaseClient) return;

  (async () => {
    const { data } = await window.supabaseClient
      .from("comp_tipo")
      .select("nombre")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    const tipos = (data ?? []).map(r => String(r.nombre)).filter(Boolean);
    fillSelect(tipos, tipoComp, "-- Seleccionar tipo --");
  })();
};

document.getElementById("tipoComp")?.addEventListener("change", (e) => {
  localStorage.setItem('tipoCompLast', String(e.target.value ?? ""));
});

window.renderComponentView = function () {
  const match = window._componentesMatch;
  if (!match) return;

  const resultsComp = document.getElementById("results-comp");
  const imgEl = resultsComp.querySelector("#comp-img");
  const header = resultsComp.querySelector("#comp-header");

  const docCodigo = String(match["NO. DE DIBUJO/PARTE"] ?? "--").trim();
  const nombreDoc = String(match["NOMBRE DE DOCUMENTO"] ?? "--").trim();

  // IMPORTANTE: 'link_rms' debe estar disponible dentro de _componentesMatch.
  // Si no lo has añadido aún, ve al punto 5) de esta guía.
  const linkRmsRaw = String(match.link_rms ?? "").trim();
  const href = toSafeHref(linkRmsRaw);

  const lineaDoc = href
    ? `Documento: <a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(docCodigo)}</a>`
    : `Documento: ${esc(docCodigo)}`;

  header.innerHTML = `
    <div class="comp-title">${esc(nombreDoc)}</div>
    <div class="comp-doc">${lineaDoc}</div>
  `;

  // Imagen
  const src = match._img_key ? `img/${match._img_key}` : null;
  if (src) {
    mostrarImagenCuandoCargue(imgEl, src, tDisplay("Imagen del componente"));
  } else {
    ocultarImagen(imgEl);
  }

  // Cotas
  renderCotas(match);
};
