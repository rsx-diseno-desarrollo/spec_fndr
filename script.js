// ----------------------------
// MENU
// ----------------------------
const botonMenu = document.querySelector('.boton-menu');
const menu = document.querySelector('.menu');

botonMenu.addEventListener('click', () => {
  menu.classList.toggle('abierto');
});

// ----------------------------
// CARGAR EXCEL Y BUSCADOR
// ----------------------------
async function cargarExcel() {
  const url = "specs.xlsx";
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const allData = {};
    workbook.SheetNames.forEach(sheetName => {
      allData[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    });

    window.data = allData;
    console.log("Datos cargados:", allData);

    //  PRODUCTO
    // ======================================================
    const specs = allData.prod;
    const clienteSelect = document.getElementById("cliente");
    const nombreSelect = document.getElementById("nombre");

    const clientes = [...new Set(specs.map(s => s["CLIENTE"]))];
    const nombres = [...new Set(specs.map(s => s["NOMBRE"]))];

    clientes.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      clienteSelect.appendChild(opt);
    });

    nombres.forEach(n => {
      const opt = document.createElement("option");
      opt.value = n;
      opt.textContent = n;
      nombreSelect.appendChild(opt);
    });

    function buscar() {
      const parte = document.getElementById("parte").value.toLowerCase();
      const cliente = clienteSelect.value.toLowerCase();
      const nombre = nombreSelect.value.toLowerCase();

      const filtered = specs.filter(spec => {
        const partesArray = String(spec["NO. PARTE"] || "")
          .split(",")
          .map(p => p.trim().toLowerCase());

        return (
          (parte === "" || partesArray.some(p => p.includes(parte))) &&
          (cliente === "" || spec["CLIENTE"].toLowerCase() === cliente) &&
          (nombre === "" || spec["NOMBRE"].toLowerCase() === nombre)
        );
      });

      const resultsDiv = document.getElementById("results-prod");
      resultsDiv.innerHTML = "";
      filtered.forEach(spec => {
        resultsDiv.innerHTML += `
          <div class="spec">
            <strong>${spec["CLIENTE"]}</strong><br>
            Código: ${spec["CODIGO"]}<br>
            No. de Parte: ${spec["NO. PARTE"]}<br>
            Nombre: ${spec["NOMBRE"]}<br>
            <a href="${spec["LIGA"]}" target="_blank">Abrir RMS</a>
          </div>
        `;
      });
    }

    document.getElementById("parte").addEventListener("input", buscar);
    clienteSelect.addEventListener("change", buscar);
    nombreSelect.addEventListener("change", buscar);
  
    //  PRODUCTO END
    // ======================================================

  } catch (error) {
    console.error("Error al cargar el Excel:", error);
  }
}

cargarExcel();

// ----------------------------
// CAMBIO DE SECCIONES
// ----------------------------
document.querySelectorAll('.menu a').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const target = link.dataset.section;

    document.querySelectorAll('.seccion').forEach(sec => sec.classList.remove('activa'));
    document.getElementById(target).classList.add('activa');

    localStorage.setItem('seccionActiva', target);

    menu.classList.remove('abierto'); // cerrar menú
  });
});

// Restaurar sección activa al cargar
window.addEventListener('load', () => {
  const ultimaSeccion = localStorage.getItem('seccionActiva');
  if (ultimaSeccion) {
    document.querySelectorAll('.seccion').forEach(sec => sec.classList.remove('activa'));
    document.getElementById(ultimaSeccion).classList.add('activa');
  }
});

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

  // --- Mapa centralizado (fácil de extender) ---
  const imagenPorTipo = {
    "TORNILLO": "img/tornillo_plantilla.png"
    // "TUERCA": "img/tuerca_plantilla.png",
    // "LAINA":  "img/laina_plantilla.png",
  };

  // --- Unidad seleccionada y último match para re-render ---
  let unidadComp = localStorage.getItem("unidadComp") || "mm";
  let ultimoMatch = null;

  // Inicializar selector de unidad una sola vez
  if (unidadSelect) {
    unidadSelect.value = unidadComp;
    unidadSelect.addEventListener("change", () => {
      unidadComp = unidadSelect.value;
      localStorage.setItem("unidadComp", unidadComp);
      // Si ya hay un componente mostrado, re-renderizamos las cotas con la nueva unidad
      if (ultimoMatch) renderCotas(ultimoMatch);
    });
  }

  // ------------------------------------------------------
  // Autocompletar por código (filtra por tipo seleccionado)
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

  // Cerrar autocompletar al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (e.target !== codigoInput) {
      autocompleteList.innerHTML = "";
    }
  });

  // ------------------------------------------------------
  // Conversión de unidades
  // ------------------------------------------------------
  function convertirValor(valorMm) {
    // Evitar que "" se convierta a 0
    if (valorMm === "" || valorMm === null || valorMm === undefined) return "--";
    const num = Number(valorMm);
    if (!isFinite(num)) return valorMm ?? "--";

    if (unidadComp === "in") {
      const pulgadas = num / 25.4;
      return `${pulgadas.toFixed(3)}`; // 3 decimales
    }
    // mm: entero si es exacto, si no con hasta 2 decimales
    return Number.isInteger(num) ? `${num}` : `${num.toFixed(2)}`;
  }

  // ------------------------------------------------------
  // Render de cotas (reusable)
  // ------------------------------------------------------
  function renderCotas(match) {
    const cotasList = resultsComp.querySelector("#cotas-list");
    if (!cotasList) return;

    const cotas = {
      A: match["A"],
      B: match["B"],
      C: match["C"],
      D: match["D"],
      E: match["RADIO"], // si quieres mostrar "R" en la etiqueta, cambia la llave a "R"
      // Extras NO métricos:
      "Trhead": `1/2" - 20 UNF_2A`,
      "Hardness Grade": `8° - 33-39 Rc.`
    };

    cotasList.innerHTML = ""; // limpia anterior

    Object.entries(cotas).forEach(([label, value]) => {
      const item = document.createElement("div");
      item.className = "cota-item";

      // Determinar si el valor se debe convertir (solo en cotas A–E/R)
      const esCotaMetrica = ["A", "B", "C", "D", "E", "R", "RADIO"].includes(label.toUpperCase());

      // Valor mostrado según unidad seleccionada
      const valueShown = esCotaMetrica
        ? convertirValor(value)
        : (value ?? "--");

      // Sufijo de unidad para métricas
      const sufijoUnidad = esCotaMetrica ? (unidadComp === "in" ? ' in' : ' mm') : '';

      item.innerHTML = `
        <span class="cota-label">${label}:</span>
        <span class="cota-value">${valueShown}${sufijoUnidad}</span>
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
      resultsComp.querySelector("#cotas-list")?.replaceChildren();
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

    // 3) Cotas (guardar último match y renderizar)
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
// ======================================================
//  EMPAQUE
// ======================================================
function iniciarEmpaque() {
  const empData = (window.data && window.data.emp) ? window.data.emp : [];

  const selCliente = document.getElementById("emp-cliente");
  const inputParte = document.getElementById("emp-parte");
  const autoList   = document.getElementById("emp-autocomplete");
  const btnBuscar  = document.getElementById("emp-btn-buscar");
  const results    = document.getElementById("emp-results");
  const tableBody  = document.querySelector("#emp-table tbody");

  if (!selCliente || !inputParte || !autoList || !btnBuscar || !results || !tableBody) return;

  // --- 1) Llenar selector de clientes ---
  const clientes = [...new Set(empData.map(x => String(x["CLIENTE"] ?? "").trim()))]
                    .filter(Boolean).sort();
  clientes.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    selCliente.appendChild(opt);
  });

  // --- 2) Autocompletar por No. de parte (filtra por cliente seleccionado) ---
  inputParte.addEventListener("input", () => {
    const texto = inputParte.value.toLowerCase().trim();
    autoList.innerHTML = "";
    if (texto.length < 1) return;

    const clienteSel = String(selCliente.value ?? "");
    let fuente = empData;
    if (clienteSel) {
      fuente = fuente.filter(row => String(row["CLIENTE"] ?? "") === clienteSel);
    }

    const filtrados = fuente.filter(row =>
      String(row["NO. DE PARTE"] ?? "").toLowerCase().includes(texto)
    );

    filtrados.slice(0, 12).forEach(row => {
      const div = document.createElement("div");
      div.classList.add("autocomplete-item");
      div.textContent = row["NO. DE PARTE"];
      div.addEventListener("click", () => {
        inputParte.value = row["NO. DE PARTE"];
        autoList.innerHTML = "";
      });
      autoList.appendChild(div);
    });
  });

  // Cerrar autocompletar si el clic fue fuera del wrapper
  const wrapperParte = inputParte.closest(".field.with-autocomplete");
  document.addEventListener("click", (e) => {
    if (e.target !== inputParte && !wrapperParte.contains(e.target)) {
      autoList.innerHTML = "";
    }
  });

  // --- 3) Acción del botón Buscar ---
  btnBuscar.addEventListener("click", () => {
    const cliente = String(selCliente.value ?? "").trim();
    const parte   = String(inputParte.value ?? "").trim();

    if (!cliente || !parte) {
      setEmpHeader(results, `<span class="msg-warn">Select CLIENT and write a Part number.</span>`);
      clearEmpTable(tableBody);
      return;
    }

    const match = empData.find(row =>
      String(row["CLIENTE"] ?? "") === cliente &&
      String(row["NO. DE PARTE"] ?? "") === parte
    );

    if (!match) {
      setEmpHeader(results, `<span class="msg-empty">No packing specs found for this client and part number.</span>`);
      clearEmpTable(tableBody);
      return;
    }

    // Encabezado: CLIENTE / NO. DE PARTE
    const parteShown   = (String(match["NO. DE PARTE"] ?? "").trim() || "--");
    const clienteShown = (String(match["CLIENTE"] ?? "").trim() || "--");
    const headerText = `${clienteShown} / ${parteShown}`;

    // Render de tabla
    const detalles = [
      ["PALLET",                   match["COD TARIMA"]],
      ["STRINGERS",                match["LARGUEROS"]],
      ["TOP/BOTTOM BEAM",          match["POLIN SUP/INF"]],
      ["STRAP",                    match["FLEJE"]],
      ["Springs per Layer",        match["MxC"]],
      ["Layers",                   match["CAMAS"]],
      ["Springs per Pallet",       match["MxT"]],
      ["NET PACKING WEIGHT (Kg)",  match["PESO NETO EMPAQUE (Kg)"]],
    ];

    renderEmpTable(tableBody, detalles, headerText);
  });

  // ---- utilidades ----
  function setEmpHeader(resultsRoot, html) {
    const header = resultsRoot.querySelector("#emp-header");
    if (header) header.innerHTML = html || "";
  }

  function clearEmpTable(tbody) {
    tbody.innerHTML = "";
  }

  function renderEmpTable(tbody, rows, headerText) {
    tbody.innerHTML = "";
  
        
      // Fila de encabezado dentro de la tabla
        const headerRow = document.createElement("tr");
        const headerCell = document.createElement("th");
        headerCell.colSpan = 2; // ocupa ambas columnas
        headerCell.className = "table-title";
        headerCell.textContent = headerText;
        headerRow.appendChild(headerCell);
        tbody.appendChild(headerRow);

      const emphasized = new Set([
        "NET PACKING WEIGHT (Kg)"  // PESO NETO
      ]);
    rows.forEach(([label, value], idx) => {
      const tr = document.createElement("tr");

      
    const th = document.createElement("th");
    th.scope = "row";
    th.className = "label-cell" + (emphasized.has(label) ? " is-emphasis" : "");
    th.textContent = label;

    const td = document.createElement("td");
    td.className = "value-cell" + (emphasized.has(label) ? " is-emphasis" : "");
    td.textContent = (value ?? "--");

      tr.appendChild(th);
      tr.appendChild(td);
      tbody.appendChild(tr);
    });
  }
}

// Llama iniciarEmpaque cuando los datos estén listos (igual que componentes)
window.addEventListener("load", () => {
  const waitEmp = setInterval(() => {
    if (!window.data) return;
    clearInterval(waitEmp);
    iniciarEmpaque();
  }, 200);
});
// ======================================================
//  EMPAQUE END
// ======================================================
