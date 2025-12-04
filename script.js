
// ====== MENÚ (toggle y navegación entre secciones) ======
const botonMenu = document.querySelector('.boton-menu');
const menu = document.querySelector('.menu');

if (botonMenu && menu) {
  botonMenu.addEventListener('click', () => {
    menu.classList.toggle('abierto');
  });
}

document.querySelectorAll('.menu a').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const target = link.dataset.section;
    document.querySelectorAll('.seccion').forEach(sec => sec.classList.remove('activa'));
    document.getElementById(target)?.classList.add('activa');
    localStorage.setItem('seccionActiva', target);
    menu?.classList.remove('abierto');
  });
});

// Restaurar sección activa al cargar
window.addEventListener('load', () => {
  const ultimaSeccion = localStorage.getItem('seccionActiva');
  if (ultimaSeccion) {
    document.querySelectorAll('.seccion').forEach(sec => sec.classList.remove('activa'));
    document.getElementById(ultimaSeccion)?.classList.add('activa');
  }
});

// ====== CARGA DE EXCEL (SheetJS) ======
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
    inicializarProductos(allData.prod || []);

    // --- COMPONENTES ---
    inicializarComponentes(allData.comp || []);

  } catch (error) {
    console.error("Error al cargar el Excel:", error);
  }
}
cargarExcel();

// ====== PRODUCTOS ======
function inicializarProductos(specs = []) {
  const clienteSelect = document.getElementById("cliente");
  const nombreSelect = document.getElementById("nombre");

  if (!clienteSelect || !nombreSelect) return;

  const clientes = [...new Set(specs.map(s => s["CLIENTE"]).filter(Boolean))];
  const nombres = [...new Set(specs.map(s => s["NOMBRE"]).filter(Boolean))];

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
    const parte = (document.getElementById("parte")?.value || "").toLowerCase();
    const cliente = (clienteSelect.value || "").toLowerCase();
    const nombre = (nombreSelect.value || "").toLowerCase();

    const filtered = specs.filter(spec => {
      const partesArray = String(spec["NO. PARTE"] || "")
        .split(",")
        .map(p => p.trim().toLowerCase());

      return (
        (parte === "" || partesArray.some(p => p.includes(parte))) &&
        (cliente === "" || String(spec["CLIENTE"] || "").toLowerCase() === cliente) &&
        (nombre === "" || String(spec["NOMBRE"] || "").toLowerCase() === nombre)
      );
    });

    const resultsDiv = document.getElementById("results-prod");
    if (!resultsDiv) return;
    resultsDiv.innerHTML = "";
    filtered.forEach(spec => {
      resultsDiv.innerHTML += `
        <div class="spec">
          <strong>${spec["CLIENTE"] || ""}</strong><br>
          Código: ${spec["CODIGO"] || ""}<br>
          No. de Parte: ${spec["NO. PARTE"] || ""}<br>
          Nombre: ${spec["NOMBRE"] || ""}<br>
          <a href="${spec["LIGA"]}" target="_blank">Abrir RMS</a>
        </div>
      `;
    });
  }

  document.getElementById("parte")?.addEventListener("input", buscar);
  clienteSelect.addEventListener("change", buscar);
  nombreSelect.addEventListener("change", buscar);
}

// ====== COMPONENTES ======
function inicializarComponentes(componentes = []) {
  const tipoSelect = document.getElementById("tipoComp");
  const autocompleteList = document.getElementById("autocomplete-list");
  const inputCodigo = document.getElementById("codigoComp");
  const resultsDiv = document.getElementById("results-comp");

  if (!tipoSelect || !inputCodigo || !resultsDiv) return;

  // Popular tipos
  const tipos = [...new Set(componentes.map(c => c["TIPO DE COMPONENTE"]).filter(Boolean))];
  tipos.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    tipoSelect.appendChild(opt);
  });

  // Autocompletado
  inputCodigo.addEventListener("input", function () {
    const val = this.value.toLowerCase();
    if (!autocompleteList) return;
    autocompleteList.innerHTML = "";
    if (!val) return;

    const sugerencias = componentes
      .map(c => String(c["CODIGO COMPONENTES"] || ""))
      .filter(codigo => codigo.toLowerCase().includes(val));

    sugerencias.slice(0, 10).forEach(s => {
      const div = document.createElement("div");
      div.textContent = s;
      div.addEventListener("click", () => {
        inputCodigo.value = s;
        autocompleteList.innerHTML = "";
        buscarComponentes(componentes, tipoSelect, resultsDiv);
      });
      autocompleteList.appendChild(div);
    });
  });

  // Cerrar autocompletado al hacer click fuera
  document.addEventListener("click", (e) => {
    const clickedInside =
      e.target === inputCodigo ||
      e.target === autocompleteList ||
      e.target?.parentElement === autocompleteList;
    if (!clickedInside && autocompleteList) autocompleteList.innerHTML = "";
  });

  // Eventos de búsqueda
  tipoSelect.addEventListener("change", () => buscarComponentes(componentes, tipoSelect, resultsDiv));
  inputCodigo.addEventListener("input", () => buscarComponentes(componentes, tipoSelect, resultsDiv));
}

function buscarComponentes(componentes, tipoSelect, resultsDiv) {
  const codigo = (document.getElementById("codigoComp")?.value || "").toLowerCase();
  const tipo = (tipoSelect.value || "").toLowerCase();

  const filtered = componentes.filter(comp => {
    const codigosArray = String(comp["CODIGO COMPONENTES"] || "")
      .split(",")
      .map(c => c.trim().toLowerCase());
    return (
      (codigo === "" || codigosArray.some(c => c.includes(codigo))) &&
      (tipo === "" || String(comp["TIPO DE COMPONENTE"] || "").toLowerCase() === tipo)
    );
  });

  resultsDiv.innerHTML = "";
  filtered.forEach(comp => {
    resultsDiv.innerHTML += `
      <div class="spec">
        <strong>${comp["NO. DE DIBUJO/PARTE"] || ""}</strong> - ${comp["NOMBRE DE DOCUMENTO"] || ""}<br>
        Código(s): ${comp["CODIGO COMPONENTES"] || ""}<br>
        <a href="${comp["LIGA"]}" target="_blank">Abrir RMS</a>
        <button class="ver-cotas" data-cotas='${JSON.stringify(comp)}'>Ver cotas</button>
      </div>
    `;
  });

  // Agregar evento a los botones
  document.querySelectorAll(".ver-cotas").forEach(btn => {
    btn.addEventListener("click", e => {
      const compData = JSON.parse(e.currentTarget.dataset.cotas);
      mostrarCotas(compData);
    });
  });
}

// ====== MODAL / SVG ======
function mostrarCotas(comp) {
  const modal = document.getElementById("modal-cotas");
  if (!modal) return;

  const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  setTxt("cota-A", `A: ${comp["A"] ?? "-"}`);
  setTxt("cota-B", `B: ${comp["B"] ?? "-"}`);
  setTxt("cota-C", `C: ${comp["C"] ?? "-"}`);
  setTxt("cota-D", `D: ${comp["D"] ?? "-"}`);
  setTxt("cota-R", `Radio: ${comp["RADIO"] ?? "-"}`);

  modal.style.display = "flex";
}

// Cerrar modal (click en botón y tecla ESC)
document.getElementById("cerrar-modal")?.addEventListener("click", () => {
  const modal = document.getElementById("modal-cotas");
  if (modal) modal.style.display = "none";
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const modal = document.getElementById("modal-cotas");
    if (modal) modal.style.display = "none";
  }
