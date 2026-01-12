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
      setEmpHeader(results, `<span class="msg-empty">No se encontraron specs de empaque para ese cliente y número de parte.</span>`);
      clearEmpTable(tableBody);
      return;
    }

    // Encabezado: CLIENTE / NO. DE PARTE
    const parteShown   = (String(match["NO. DE PARTE"] ?? "").trim() || "--");
    const clienteShown = (String(match["CLIENTE"] ?? "").trim() || "--");
    const headerText = `${clienteShown} / ${parteShown}`;

    // Render de tabla
    const detalles = [
      ["TARIMA",                   match["COD TARIMA"]],
      ["LARGUEROS",                match["LARGUEROS"]],
      ["POLIN SUP/INF",          match["POLIN SUP/INF"]],
      ["FLEJE",                    match["FLEJE"]],
      ["MUELLES x CAMA",        match["MxC"]],
      ["CAMAS",                   match["CAMAS"]],
      ["MUELLES x TARIMA",       match["MxT"]],
      ["PESO NETO EMPAQUE (Kg)",  match["PESO NETO EMPAQUE (Kg)"]],
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
        "PESO NETO EMPAQUE (Kg)"  // PESO NETO
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
