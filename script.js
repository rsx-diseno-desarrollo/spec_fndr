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
  const compData = window.data.comp; // toda la hoja "comp"

  const tipoComp = document.getElementById("tipoComp");
  const codigoInput = document.getElementById("codigoComp");
  const autocompleteList = document.getElementById("autocomplete-list");
  const btnBuscarComp = document.getElementById("btnBuscarComp");
  const resultsComp = document.getElementById("results-comp");

  // ------------------------------------------------------
  // Llenar selector de tipos (por ahora solo TORNILLO)
  // ------------------------------------------------------
  const tipos = [...new Set(compData.map(x => x["TIPO"]))];

  tipos.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    tipoComp.appendChild(opt);
  });

  // ------------------------------------------------------
  // Autocompletar por código
  // ------------------------------------------------------
  codigoInput.addEventListener("input", () => {
    const texto = codigoInput.value.toLowerCase();
    autocompleteList.innerHTML = "";

    if (texto.length < 1) return;

    let filtrados = compData.filter(row =>
      String(row["CODIGO"]).toLowerCase().includes(texto)
    );

    filtrados.slice(0, 10).forEach(row => {
      const div = document.createElement("div");
      div.classList.add("autocomplete-item");
      div.textContent = row["CODIGO"];
      div.addEventListener("click", () => {
        codigoInput.value = row["CODIGO"];
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
    const tipo = tipoComp.value;
    const codigo = codigoInput.value.trim();

    if (!tipo || !codigo) {
      resultsComp.innerHTML = `<p>Selecciona tipo y escribe un código.</p>`;
      return;
    }

    // Filtrar
    const match = compData.find(row =>
      row["TIPO"] === tipo &&
      String(row["CODIGO"]) === codigo
    );

    if (!match) {
      resultsComp.innerHTML = `<p>No se encontró el componente.</p>`;
      return;
    }

    // ----------------------------------------------------
    // Mostrar SOLO las cotas (columnas A, B, C, D, etc.)
    // ----------------------------------------------------
    const columnasIgnorar = ["TIPO", "CODIGO", "DESCRIPCION"];

    let html = `<h4>Resultados:</h4><div class="tabla-cotas">`;

    Object.keys(match).forEach(col => {
      if (!columnasIgnorar.includes(col) && match[col] !== "" && match[col] !== null) {
        html += `
          <div><strong>${col}:</strong> ${match[col]}</div>
        `;
      }
    });

    html += `</div>`;

    resultsComp.innerHTML = html;
  });
}
// ======================================================
//  COMPONENTES END
// ======================================================
