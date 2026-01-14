// ----------------------------
// MENU
// ----------------------------
const botonMenu = document.querySelector('.boton-menu');
const menu = document.querySelector('.menu');

botonMenu.addEventListener('click', () => {
  menu.classList.toggle('abierto');
});

// ============================
// ESTADO PRODUCTO (para idioma)
// ============================
window._productoSpecs = [];
window._productoFiltered = [];
// ============================
// ESTADO EMPAQUE (para idioma)
// ============================
window._empaqueData = [];
window._empaqueMatch = null;

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
    window._productoSpecs = allData.prod || [];
    window._empaqueData  = allData.emp  || [];
    window._tstsData = allData.tsts || [];
    console.log("Datos cargados:", allData);
    
  } catch (error) {
    console.error("Error al cargar el Excel:", error);
  }
}

Promise.all([cargarExcel(), langReady]).then(() => {
  initProducto(window._productoSpecs);
  initEmpaque(window._empaqueData);
  initTsts(window._tstsData);
});

// ======================================================
//  PRODUCTO (con soporte de idioma)
// ======================================================
function initProducto(specs) {
  window._productoSpecs = specs;

  const clienteSelect = document.getElementById("cliente");
  const nombreSelect  = document.getElementById("nombre");
  const parteInput    = document.getElementById("parte");
  const resultsDiv    = document.getElementById("results-prod");

  // Obtener valores únicos (ES internos)
  const clientes = [...new Set(specs.map(s => s["CLIENTE"]))].filter(Boolean);
  const nombres  = [...new Set(specs.map(s => s["NOMBRE"]))].filter(Boolean);

  // Llenar selects usando helper de idioma
  fillSelectFromExcel(clientes, clienteSelect, "-- Seleccionar cliente --");
  fillSelectFromExcel(nombres, nombreSelect, "-- Seleccionar tipo --");

  function buscarProducto() {
    const parte   = parteInput.value.toLowerCase().trim();
    const cliente = clienteSelect.value.toLowerCase();
    const nombre  = nombreSelect.value.toLowerCase();

    window._productoFiltered = specs.filter(spec => {
      const partesArray = String(spec["NO. PARTE"] || "")
        .split(",")
        .map(p => p.trim().toLowerCase());

      return (
        (parte === "" || partesArray.some(p => p.includes(parte))) &&
        (cliente === "" || String(spec["CLIENTE"]).toLowerCase() === cliente) &&
        (nombre === "" || String(spec["NOMBRE"]).toLowerCase() === nombre)
      );
    });

    renderProductoResultados();
  }

  function renderProductoResultados() {
    resultsDiv.innerHTML = "";

    window._productoFiltered.forEach(spec => {
      const div = document.createElement("div");
      div.className = "spec";

      div.innerHTML = `
        <strong>${spec["CLIENTE"]}</strong><br>
        ${tDisplay("Código")}: ${spec["CODIGO"]}<br>
        ${tDisplay("No. de Parte")}: ${spec["NO. PARTE"]}<br>
        ${tDisplay("Nombre")}: ${spec["NOMBRE"]}<br>
        <a href="${spec["LIGA"]}" target="_blank">${tDisplay("Abrir RMS")}</a>`;

      resultsDiv.appendChild(div);
    });
  }

  // Eventos
  parteInput.addEventListener("input", buscarProducto);
  clienteSelect.addEventListener("change", buscarProducto);
  nombreSelect.addEventListener("change", buscarProducto);
}

//Función que lang.js espera
window.renderProductoSelects = function () {
  if (!window._productoSpecs.length) return;
  initProducto(window._productoSpecs);
};

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


// ======================================================
//  EMPAQUE (con soporte de idioma)
// ======================================================
function initEmpaque(empData) {
  window._empaqueData = empData;

  const selCliente = document.getElementById("emp-cliente");
  const inputParte = document.getElementById("emp-parte");
  const autoList   = document.getElementById("emp-autocomplete");
  const btnBuscar  = document.getElementById("emp-btn-buscar");
  const results    = document.getElementById("emp-results");
  const tableBody  = document.querySelector("#emp-table tbody");

  if (!selCliente || !inputParte || !btnBuscar || !tableBody) return;

  // ---- CLIENTES (select traducible) ----
  const clientes = [...new Set(empData.map(x => String(x["CLIENTE"] ?? "").trim()))]
    .filter(Boolean).sort();

  fillSelectFromExcel(clientes, selCliente, "-- Seleccionar cliente --");

  // ---- AUTOCOMPLETE ----
  inputParte.addEventListener("input", () => {
    const texto = inputParte.value.toLowerCase().trim();
    autoList.innerHTML = "";
    if (!texto) return;

    const clienteSel = selCliente.value;
    let fuente = empData;

    if (clienteSel) {
      fuente = fuente.filter(row => row["CLIENTE"] === clienteSel);
    }

    fuente
      .filter(row =>
        String(row["NO. DE PARTE"] ?? "").toLowerCase().includes(texto)
      )
      .slice(0, 12)
      .forEach(row => {
        const div = document.createElement("div");
        div.className = "autocomplete-item";
        div.textContent = row["NO. DE PARTE"];
        div.onclick = () => {
          inputParte.value = row["NO. DE PARTE"];
          autoList.innerHTML = "";
        };
        autoList.appendChild(div);
      });
  });

  // ---- BOTÓN BUSCAR ----
  btnBuscar.addEventListener("click", buscarEmpaque);

  function buscarEmpaque() {
    const cliente = selCliente.value;
    const parte   = inputParte.value.trim();

    window._empaqueMatch = null;
    clearEmpaque(tableBody, results);

    if (!cliente || !parte) {
      setEmpHeader(
        results,
        `<span class="msg-warn">${tDisplay("Seleccione CLIENTE y escriba un Número de pieza.")}</span>`
      );
      return;
    }

    const match = empData.find(row =>
      row["CLIENTE"] === cliente &&
      row["NO. DE PARTE"] === parte
    );

    if (!match) {
      setEmpHeader(
        results,
        `<span class="msg-empty">${tDisplay("No se encontraron specs de empaque para ese cliente y número de parte.")}</span>`
      );
      return;
    }

    window._empaqueMatch = match;
    renderEmpaqueTable();
  }
}

// ======================================================
//  RENDER EMPAQUE (usado por lang.js)
// ======================================================
window.renderEmpaqueTable = function () {
  const match = window._empaqueMatch;
  const tbody = document.querySelector("#emp-table tbody");
  const results = document.getElementById("emp-results");

  clearEmpaque(tbody, results);

  if (!match) return;

  // Encabezado
  const headerText =
    `${match["CLIENTE"] || "--"} / ${match["NO. DE PARTE"] || "--"}`;
  setEmpHeader(results, headerText);

  const rows = [
    ["TARIMA", match["COD TARIMA"]],
    ["LARGUEROS", match["LARGUEROS"]],
    ["POLIN SUP/INF", match["POLIN SUP/INF"]],
    ["FLEJE", match["FLEJE"]],
    ["MUELLES x CAMA", match["MxC"]],
    ["CAMAS", match["CAMAS"]],
    ["MUELLES x TARIMA", match["MxT"]],
    ["PESO NETO EMPAQUE (Kg)", match["PESO NETO EMPAQUE (Kg)"]],
  ];

  rows.forEach(([label, value]) => {
    const tr = document.createElement("tr");

    const th = document.createElement("th");
    th.className = "label-cell";
    th.textContent = tDisplay(label);

    const td = document.createElement("td");
    td.className = "value-cell";
    td.textContent = value ?? "--";

    tr.appendChild(th);
    tr.appendChild(td);
    tbody.appendChild(tr);
  });
};

// ---- UTILIDADES ----
function setEmpHeader(root, html) {
  const header = root.querySelector("#emp-header");
  if (header) header.innerHTML = html || "";
}

function clearEmpaque(tbody, resultsRoot) {
  tbody.innerHTML = "";
  setEmpHeader(resultsRoot, "");
}

window.renderEmpaqueSelects = function () {
  if (!window._empaqueData.length) return;
  initEmpaque(window._empaqueData);
};


// ======================================================
// TsTs: PLANTILLAS (con soporte de idioma)
// ======================================================
function initTsts(tstsData) {
  window._tstsData = tstsData;

  // Referencias a la UI de la sección TsTs
  const selCliente   = document.getElementById("tsts-cliente");
  const inputParte   = document.getElementById("tsts-parte");
  const autoList     = document.getElementById("tsts-autocomplete");
  const btnBuscar    = document.getElementById("tsts-btn-buscar");
  const resultsRoot  = document.getElementById("tsts-results");

  // Si no existe la sección en el DOM, no prosigue (igual que haces en Empaque)
  if (!selCliente || !inputParte || !btnBuscar || !resultsRoot) return;

  // ------- CLIENTES (select traducible) -------
  const clientes = [...new Set(tstsData.map(x => String(x["CLIENTE"] ?? "").trim()))]
                    .filter(Boolean)
                    .sort();
  // Usa tu helper existente para traducibles y placeholder:
  fillSelectFromExcel(clientes, selCliente, "-- Seleccionar cliente --");

  // ------- AUTOCOMPLETE por No. de Parte (filtrado opcional por cliente) -------
  inputParte.addEventListener("input", () => {
    const texto = inputParte.value.toLowerCase().trim();
    autoList.innerHTML = "";
    if (!texto) return;

    const clienteSel = selCliente.value;
    let fuente = tstsData;
    if (clienteSel) {
      fuente = fuente.filter(row => String(row["CLIENTE"]) === clienteSel);
    }

    // Únicos por parte en la fuente filtrada:
    const partesUnicas = [...new Set(fuente.map(r => String(r["NO. DE PARTE"] ?? "")))]
                          .filter(Boolean);

    partesUnicas
      .filter(p => p.toLowerCase().includes(texto))
      .slice(0, 12) // límite de sugerencias
      .forEach(p => {
        const div = document.createElement("div");
        div.className = "autocomplete-item";
        div.textContent = p;
        div.onclick = () => {
          inputParte.value = p;
          autoList.innerHTML = "";
        };
        autoList.appendChild(div);
      });
  });

  // ------- BOTÓN BUSCAR -------
  btnBuscar.addEventListener("click", buscarTsts);

  function buscarTsts() {
    const cliente = selCliente.value;
    const parte    = inputParte.value.trim();

    // Limpia resultados
    resultsRoot.innerHTML = "";

    // Validaciones
    if (!cliente || !parte) {
      resultsRoot.innerHTML = `<span class="msg-warn">${tDisplay("Seleccione CLIENTE y escriba un Número de pieza.")}</span>`;
      return;
    }

    // Filtrado exacto (CLIENTE + NO. DE PARTE)
    const matchRows = tstsData.filter(row =>
      String(row["CLIENTE"])      === cliente &&
      String(row["NO. DE PARTE"]) === parte
    );

    if (!matchRows.length) {
      resultsRoot.innerHTML = `<span class="msg-empty">${tDisplay("No se encontraron plantillas para ese cliente y número de parte.")}</span>`;
      return;
    }

    // Según tu requerimiento: encabezados arriba
    const tipoPlantilla = String(matchRows[0]["TIPO DE PLANTILLA"] ?? "--");

    // Encabezado superior (No. de Parte + Tipo de Plantilla)
    let html = `
      <h4><strong>${tDisplay("No. de Parte")}:</strong> ${parte}</h4>
      <h4><strong>${tDisplay("Tipo de Plantilla")}:</strong> ${tipoPlantilla}</h4>
      <br>
    `;

    // Tabla (usa los estilos ya definidos en styles.css)
    html += `
      <table class="emp-table">
        <thead>
          <tr class="table-title">
            <th>${tDisplay("N° HOJA")}</th>
            <th>${tDisplay("PLANTILLA")}</th>
            <th>${tDisplay("MUESTRA")}</th>
          </tr>
        </thead>
        <tbody>
          ${matchRows.map(row => `
            <tr>
              <td class="value-cell">${row["NO. DE HOJA"] ?? "--"}</td>
              <td class="value-cell">${row["NO. DE PLANTILLA"] ?? "--"}</td>
              <td class="value-cell">${row["NO. DE MUESTRA"] ?? "--"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    resultsRoot.innerHTML = html;
  }
}

// ------- Hooks para idioma, igual que Producto/Empaque -------
window.renderTstsSelects = function () {
  if (!window._tstsData?.length) return;
  initTsts(window._tstsData);
};
