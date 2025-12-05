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

// -------------------------------
// Utilidad: convertir texto a número
function toNum(v) {
  if (v === null || v === undefined) return NaN;
  const s = String(v).replace(',', '.').trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

// -------------------------------
// Render del tornillo en SVG
function renderScrewSVG(cotas) {
  const A = toNum(cotas.A);
  const B = toNum(cotas.B);
  const C = toNum(cotas.C);
  const D = toNum(cotas.D);
  const R = toNum(cotas.RADIO);

  const safeA = Number.isFinite(A) ? A : 40;
  const safeB = Number.isFinite(B) ? B : Math.max(safeA - 10, 10);
  const safeC = Number.isFinite(C) ? C : 10;
  const safeD = Number.isFinite(D) ? D : 6;
  const safeR = Number.isFinite(R) ? R : 4;

  const maxVisualWidth = 480;
  const margin = 30;
  const scale = Math.max(0.5, Math.min(8, maxVisualWidth / safeA));
  const svgWidth = Math.round(safeA * scale + margin * 2);
  const svgHeight = 200;

  const shaftY = 80;
  const shaftHeight = 24;
  const headLength = safeC * scale;
  const threadLength = safeB * scale;
  const totalLengthPx = safeA * scale;
  const headRadiusPx = safeD * scale;
  const lowerRadiusPx = safeR * scale;

  const leftX = margin;
  const shaftStart = leftX;
  const shaftEnd = leftX + totalLengthPx;
  const headStart = shaftEnd - headLength;
  const threadStart = shaftStart + (totalLengthPx - headLength - threadLength);

  const svg = `
  <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 L2,4 z" />
      </marker>
      <style>
        .shaft { fill:#ddd; stroke:#333; stroke-width:1; }
        .head { fill:#bbb; stroke:#333; stroke-width:1; }
        .thread { fill:none; stroke:#666; stroke-width:1.4; stroke-linecap:round; }
        .dimline { stroke:#111; stroke-width:1; marker-start:url(#arrow); marker-end:url(#arrow); fill:none; }
        .dimtext { font-family: Arial, sans-serif; font-size:12px; fill:#111; }
      </style>
    </defs>

    <!-- EJE -->
    <rect class="shaft" x="${shaftStart}" y="${shaftY}"
          width="${totalLengthPx - headLength}"
          height="${shaftHeight}"
          rx="${lowerRadiusPx}" ry="${lowerRadiusPx}" />

    <!-- CABEZA -->
    <rect class="head"
          x="${headStart}" 
          y="${shaftY - (headRadiusPx - shaftHeight/2)}"
          width="${headLength}"
          height="${headRadiusPx*2 - shaftHeight}" />
    <circle class="head" cx="${headStart}" cy="${shaftY + shaftHeight/2}" r="${headRadiusPx}" />

    <!-- ROSCA -->
    <g class="thread">
      ${
        [...Array(Math.max(2, Math.floor((shaftEnd - headLength - threadStart)/10)))]
        .map((_,i)=>{
          const x1 = threadStart + i*10;
          const x2 = x1 + 8;
          return `<line x1="${x1}" y1="${shaftY+4}" x2="${x2}" y2="${shaftY+shaftHeight-4}" />`;
        }).join("")
      }
    </g>

    <!-- COTAS A, B, C, D, RADIO -->
    <line class="dimline" x1="${shaftStart}" y1="${shaftY + shaftHeight + 40}"
                         x2="${shaftEnd}" y2="${shaftY + shaftHeight + 40}" />
    <text class="dimtext" x="${(shaftStart+shaftEnd)/2 - 10}"
                          y="${shaftY + shaftHeight + 35}">A=${safeA}</text>

    <line class="dimline" x1="${threadStart}" y1="${shaftY - 20}"
                         x2="${shaftEnd - headLength}" y2="${shaftY - 20}" />
    <text class="dimtext" x="${(threadStart + shaftEnd - headLength)/2 - 10}"
                          y="${shaftY - 25}">B=${safeB}</text>

    <line class="dimline" x1="${headStart}" y1="${shaftY - 45}"
                         x2="${shaftEnd}" y2="${shaftY - 45}" />
    <text class="dimtext" x="${(headStart + shaftEnd)/2 - 10}"
                          y="${shaftY - 50}">C=${safeC}</text>

    <circle cx="${headStart}" cy="${shaftY + shaftHeight/2}"
            r="${headRadiusPx}" fill="none" stroke="#111" stroke-dasharray="3 2" />
    <text class="dimtext"
          x="${headStart - headRadiusPx - 30}"
          y="${shaftY + shaftHeight/2}">D=${safeD}</text>

    <line class="dimline" x1="${shaftStart}" y1="${shaftY - 60}"
                         x2="${shaftStart + Math.min(30, lowerRadiusPx)}" y2="${shaftY - 60}" />
    <text class="dimtext" x="${shaftStart + 8}" y="${shaftY - 65}">R=${safeR}</text>

  </svg>
  `;
  return svg;
}

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
  const tipos = [...new Set(compData.map(x => x["TIPO DE COMPONENTE"]))];

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
        String(row["CODIGO COMPONENTES"]).toLowerCase().includes(texto)
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
    const tipo = tipoComp.value;
    const codigo = codigoInput.value.trim();
  
    if (!tipo || !codigo) {
      resultsComp.innerHTML = `<p>Selecciona tipo y escribe un código.</p>`;
      return;
    }
  
    const match = compData.find(row =>
      row["TIPO DE COMPONENTE"] === tipo &&
      String(row["CODIGO COMPONENTES"]) === codigo
    );
  
    if (!match) {
      resultsComp.innerHTML = `<p>No se encontró el componente.</p>`;
      return;
    }
  
    const cotas = {
      A: match["A"],
      B: match["B"],
      C: match["C"],
      D: match["D"],
      RADIO: match["RADIO"]
    };
  
    resultsComp.innerHTML = renderScrewSVG(cotas);
  });
}
// ======================================================
//  COMPONENTES END
// ======================================================
