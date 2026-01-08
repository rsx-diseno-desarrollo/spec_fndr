//  COMPONENTES
// ======================================================

window.addEventListener("load", () => {
  // Esperar a que los datos ya estén cargados
  const waitData = setInterval(() => {
    if (!window.data) return;
    clearInterval(waitData);
    iniciarComponentes();
  }, 200);
});


function iniciarComponentes() {
  const compData = (window.data && window.data.comp) ? window.data.comp : [];

  const tipoComp = document.getElementById("tipoComp");
  const codigoInput = document.getElementById("codigoComp");
  const autocompleteList = document.getElementById("autocomplete-list");
  const btnBuscarComp = document.getElementById("btnBuscarComp");
  const resultsComp = document.getElementById("results-comp");
  const imgEl = resultsComp.querySelector("#comp-img");
  const unidadSelect = document.getElementById("comp-unidad"); // <select mm/in>

  // Unidad persistida (default mm)
  let unidadComp = localStorage.getItem("unidadComp") || "mm";
  if (unidadSelect) unidadSelect.value = unidadComp;
  // Último resultado válido para re-render (al cambiar unidad)
  let ultimoMatch = null;

  if (unidadSelect) {
    unidadSelect.addEventListener("change", () => {
      unidadComp = unidadSelect.value;
      localStorage.setItem("unidadComp", unidadComp);
      // Si ya hay un componente mostrado, re-renderizamos las cotas
      if (ultimoMatch) renderCotas(ultimoMatch);
    });
  }
  
  if (!tipoComp || !codigoInput || !autocompleteList || !btnBuscarComp || !resultsComp || !imgEl) return;

  // ------------------------------------------------------
  // Llenar selector de tipos
  // ------------------------------------------------------
  const tipos = [...new Set(compData.map(x => String(x["TIPO DE COMPONENTE"] ?? "").trim()))].filter(t => t);
  tipos.sort().forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    tipoComp.appendChild(opt);
  });

  // --- 0) Estado inicial: ocultar y limpiar imagen ---
  ocultarImagen(imgEl);

  // --- Mapa centralizado ---
  const imagenPorTipo = {
     "BOLT": "img/tornillo_plantilla.png",
    "TUERCA":   "img/tuerca_plantilla.png",
    "LAINA":    "img/laina_plantilla.png",
    // "ARANDELA": "img/arandela_plantilla.png",
    // "PASADOR":  "img/pasador_plantilla.png",
  };

  // ------------------------------------------------------
  // Autocompletar por código
  // ------------------------------------------------------
  codigoInput.addEventListener("input", () => {
    const texto = codigoInput.value.toLowerCase().trim();
    autocompleteList.innerHTML = "";
    if (texto.length < 1) return;

    const tipoSel = String(tipoComp.value ?? "");
    let fuente = compData;
    if (tipoSel) {
      fuente = fuente.filter(row => String(row["TIPO DE COMPONENTE"] ?? "") === tipoSel);
    }

    const filtrados = fuente.filter(row =>
      String(row["CODIGO COMPONENTES"] ?? "").toLowerCase().includes(texto)
    );

    filtrados.slice(0, 10).forEach(row => {
      const div = document.createElement("div");
      div.classList.add("autocomplete-item");
      div.textContent = row["CODIGO COMPONENTES"];
      div.addEventListener("click", () => {
        codigoInput.value = row["CODIGO COMPONENTES"];
        autocompleteList.innerHTML = "";
      });
      autocompleteList.appendChild(div);
    });
  });
  
    document.addEventListener("click", (e) => {
    if (e.target !== codigoInput && !autocompleteList.contains(e.target)) {
      autocompleteList.innerHTML = "";
    }
  });
  
  function convertirValor(valorMm) {
    // Evitar que "" se convierta a 0
    if (valorMm === "" || valorMm === null || valorMm === undefined) return "--";
    const num = Number(valorMm);
    if (!isFinite(num)) return valorMm ?? "--";
  
    if (unidadComp === "in") {
      const pulgadas = num / 25.4;
      return `${pulgadas.toFixed(3)}`; // 3 decimales en pulgadas
    }
    // mm: entero si es exacto, si no 2 decimales
    return Number.isInteger(num) ? `${num}` : `${num.toFixed(2)}`;
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

  
function renderCotas(match) {
  const cotasList = resultsComp.querySelector("#cotas-list");
  if (!cotasList) return;

  const cotas = {
    A: match["A"],
    B: match["B"],
    C: match["C"],
    D: match["D"],
    E: match["RADIO"],          // si prefieres etiqueta "R", cambia la key a "R"
    // NO convertir (texto/códigos):
    "Thread": `1/2" - 20 UNF_2A`,
    "Hardness grade": `8° - 33-39 Rc.`
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
      <span class="cota-label">${label}:</span>
      <span class="cota-value">${mostrado}</span>
    `;
    cotasList.appendChild(item);
  });
}


  // ------------------------------------------------------
  // Acción del botón "Buscar"
  // ------------------------------------------------------
  btnBuscarComp.addEventListener("click", () => {
    const tipo = String(tipoComp.value ?? "");
    const codigo = String(codigoInput.value ?? "").trim();

    if (!tipo || !codigo) {
      showMessage("Selecciona tipo y escribe un código.", "warn");
      ocultarImagen(imgEl);
      // Limpiar cotas si no hay datos
      resultsComp.querySelector("#cotas-list")?.replaceChildren();
      return;
    }

    const match = compData.find(row =>
      String(row["TIPO DE COMPONENTE"] ?? "") === tipo &&
      String(row["CODIGO COMPONENTES"] ?? "") === codigo
    );

    if (!match) {
      showMessage("No se encontró el componente.", "empty");
      ocultarImagen(imgEl);
      return;
    }

    // 1) Encabezado arriba
    const header = resultsComp.querySelector("#comp-header");
    if (header) {
      const numeroDibujo = String(match["NO. DE DIBUJO/PARTE"] ?? "").trim();
      const nombreDocumento = String(match["NOMBRE DE DOCUMENTO"] ?? "").trim();

      const numeroDibujoShown = numeroDibujo || "--";
      const nombreDocumentoShown = nombreDocumento || "--";

      header.textContent = `${numeroDibujoShown} / ${nombreDocumentoShown}`;
    }

    // 2) Imagen (cambiar y mostrar solo cuando cargue)
    const src = imagenPorTipo[tipo]; // sin default para no mostrar si no existe
    if (!src) {
      showMessage(`No hay imagen registrada para tipo: ${tipo}`, "warn");
      ocultarImagen(imgEl);
    } else {
      mostrarImagenCuandoCargue(imgEl, src, `Imagen del componente ${tipo}`);
    }

    // 3) Cotas (guardar último match y render)
    ultimoMatch = match;
    renderCotas(match);
  });

  // ------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------
  function showMessage(text, kind = "info") {
    const msgClass = kind === "warn" ? "msg-warn"
                  : kind === "empty" ? "msg-empty"
                  : kind === "error" ? "msg-error"
                  : "msg-info";

    const header = resultsComp.querySelector("#comp-header");
    if (header) {
      header.innerHTML = `<span class="${msgClass}">${text}</span>`;
    }
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
}

// ======================================================
//  COMPONENTES END
