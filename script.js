<!-- Menu script -->
<script>
  const botonMenu = document.querySelector('.boton-menu');
  const menu = document.querySelector('.menu');

  botonMenu.addEventListener('click', () => {
    menu.classList.toggle('abierto');
  });
</script>
<!-- Menu script END -->
  
<!-- SheetJS -->
<script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
<!-- SheetJS END -->
  
<!-- Cargar excel -->
  <script>
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

// --- COMPONENTES ---
const componentes = allData.comp;
const tipoSelect = document.getElementById("tipoComp");
const autocompleteList = document.getElementById("autocomplete-list");

// Autocompletado
document.getElementById("codigoComp").addEventListener("input", function() {
  const val = this.value.toLowerCase();
  autocompleteList.innerHTML = "";
  if (!val) return;
  const sugerencias = componentes
    .map(c => c["CODIGO COMPONENTES"])
    .filter(codigo => codigo.toLowerCase().includes(val));
  sugerencias.slice(0, 10).forEach(s => {
    const div = document.createElement("div");
    div.textContent = s;
    div.addEventListener("click", () => {
      document.getElementById("codigoComp").value = s;
      autocompleteList.innerHTML = "";
      buscarComponentes();
    });
    autocompleteList.appendChild(div);
  });
});

// Botón para mostrar cotas
function buscarComponentes() {
  const codigo = document.getElementById("codigoComp").value.toLowerCase();
  const tipo = tipoSelect.value.toLowerCase();

  const filtered = componentes.filter(comp => {
    const codigosArray = String(comp["CODIGO COMPONENTES"] || "")
      .split(",")
      .map(c => c.trim().toLowerCase());
    return (
      (codigo === "" || codigosArray.some(c => c.includes(codigo))) &&
      (tipo === "" || comp["TIPO DE COMPONENTE"].toLowerCase() === tipo)
    );
  });

  const resultsDiv = document.getElementById("results-comp");
  resultsDiv.innerHTML = "";
  filtered.forEach(comp => {
    resultsDiv.innerHTML += `
      <div class="spec">
        <strong>${comp["NO. DE DIBUJO/PARTE"]}</strong> - ${comp["NOMBRE DE DOCUMENTO"]}<br>
        Código(s): ${comp["CODIGO COMPONENTES"]}<br>
        <button class="ver-cotas" data-cotas='${JSON.stringify(comp)}'>Buscar</button>
      </div>
    `;
  });

  // Agregar evento a los botones
  document.querySelectorAll(".ver-cotas").forEach(btn => {
    btn.addEventListener("click", e => {
      const compData = JSON.parse(e.target.dataset.cotas);
      mostrarCotas(compData);
    });
  });
}

// Mostrar modal con cotas
function mostrarCotas(comp) {
  const modal = document.getElementById("modal-cotas");
  document.getElementById("cota-A").textContent = `A: ${comp["A"]}`;
  document.getElementById("cota-B").textContent = `B: ${comp["B"]}`;
  document.getElementById("cota-C").textContent = `C: ${comp["C"]}`;
  document.getElementById("cota-D").textContent = `D: ${comp["D"]}`;
  document.getElementById("cota-R").textContent = `Radio: ${comp["RADIO"]}`;
  modal.style.display = "flex";

}

// Cerrar modal
document.getElementById("cerrar-modal").addEventListener("click", () => {
  document.getElementById("modal-cotas").style.display = "none";
});



// --- COMPONENTES END ---

} catch (error) {
 console.error("Error al cargar el Excel:", error);
}
}
cargarExcel();
    
  document.querySelectorAll('.menu a').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const target = link.dataset.section;
    document.querySelectorAll('.seccion').forEach(sec => sec.classList.remove('activa'));
    document.getElementById(target).classList.add('activa');
    localStorage.setItem('seccionActiva', target); // Guardar sección
    menu.classList.remove('abierto'); // Cerrar menú
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

</script>