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

    // --- PRODUCTOS ---
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
    // --- PRODUCTOS END ---

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

  if (!tipoComp || !codigoInput || !autocompleteList || !btnBuscarComp || !resultsComp) return;

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
  // Acción del botón "Buscar"
  // ------------------------------------------------------
  btnBuscarComp.addEventListener("click", () => {
    const tipo = String(tipoComp.value ?? "");
    const codigo = String(codigoInput.value ?? "").trim();

    if (!tipo || !codigo) {
      showMessage("Selecciona tipo y escribe un código.", "warn");
      return;
    }

    const match = compData.find(row =>
      String(row["TIPO DE COMPONENTE"] ?? "") === tipo &&
      String(row["CODIGO COMPONENTES"] ?? "") === codigo
    );

    if (!match) {
      showMessage("No se encontró el componente.", "empty");
      return;
    }

    // Tomar cotas directamente (solo texto)
    const cotas = {
      A: match["A"],
      B: match["B"],
      C: match["C"],
      D: match["D"],
      RADIO: match["RADIO"]
    };

    // Actualizar etiquetas de cotas en el viewer existente
    const set = (id, label, val) => {
      const el = resultsComp.querySelector(`#${id}`);
      if (el) el.textContent = `${label}=${val ?? '--'}`;
    };
    set("cota-A", "A", cotas.A);
    set("cota-B", "B", cotas.B);
    set("cota-C", "C", cotas.C);
    set("cota-D", "D", cotas.D);
    set("cota-R", "R", cotas.RADIO);

    // (Opcional) Mostrar encabezado con tipo/código sin eliminar el viewer
    const viewer = resultsComp.querySelector("#viewer-tornillo");
    if (viewer) {
      resultsComp.innerHTML = `
        <div class="card card-comp">
          <div class="card-header"><strong>${tipo}</strong> — Código: ${codigo}</div>
        </div>
      `;
      resultsComp.appendChild(viewer);
    }
  });

  // Mensajes arriba del viewer sin perder el PNG
  function showMessage(text, kind = "info") {
    const viewer = resultsComp.querySelector("#viewer-tornillo");
    const msgClass =
      kind === "warn" ? "msg-warn" :
      kind === "empty" ? "msg-empty" :
      kind === "error" ? "msg-error" : "msg-info";

    resultsComp.innerHTML = `<div class="${msgClass}">${text}</div>`;
    if (viewer) resultsComp.appendChild(viewer);
  }
}
// ======================================================
//  COMPONENTES END
// ======================================================
