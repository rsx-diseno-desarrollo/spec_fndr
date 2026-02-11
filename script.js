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

// Iniciamos cada sección cuando langReady está listo y el DOM existe.
Promise.all([langReady]).then(() => {
  initProductoDesdeSupabase();
  initEmpaqueDesdeSupabase();
  initTstsDesdeSupabase();
});

function bindOnce(el, event, key, handler) {
  const flag = `__bound_${key}`;
  if (el[flag]) return;
  el.addEventListener(event, handler);
  el[flag] = true;
}

// ======================================================
//  PRODUCTO (con soporte de idioma)
// ======================================================
async function initProductoDesdeSupabase() {
  const sb = window.supabaseClient;
  const clienteSelect = document.getElementById("cliente");
  const tipoSelect    = document.getElementById("nombre");   // aquí usamos tipo_prod
  const parteInput    = document.getElementById("parte");
  const resultsDiv    = document.getElementById("results-prod");

  if (!clienteSelect || !tipoSelect || !parteInput || !resultsDiv) return;

  // 1) Llenar selects (distinct cliente y tipo_prod) desde la vista v_prod_specs
  const { data: clientesData } = await sb.from('v_prod_specs').select('cliente').order('cliente', { ascending: true });
  const clientes = [...new Set((clientesData ?? []).map(r => r.cliente).filter(Boolean))];
  fillSelect(clientes, clienteSelect, "-- Seleccionar cliente --");

  const { data: tiposData } = await sb.from('v_prod_specs').select('tipo_prod').order('tipo_prod', { ascending: true });
  const tipos = [...new Set((tiposData ?? []).map(r => r.tipo_prod).filter(Boolean))];
  fillSelect(tipos, tipoSelect, "-- Seleccionar tipo --");

  // 2) Búsqueda reactiva
  async function buscarProducto() {
    const parte   = (parteInput.value || "").trim();
    const cliente = clienteSelect.value || "";
    const tipo    = tipoSelect.value || "";

    let q = sb.from('v_prod_specs').select('*').limit(200);
    if (parte)   q = q.ilike('num_parte', `%${parte}%`); // ilike: filtro texto libre
    if (cliente) q = q.eq('cliente', cliente);
    if (tipo)    q = q.eq('tipo_prod', tipo);           // <--- usamos tipo_prod

    const { data, error } = await q;
    resultsDiv.innerHTML = "";

    (data ?? []).forEach(row => {
      const div = document.createElement("div");
      div.className = "spec";
      div.innerHTML = `
        <strong>${row.cliente}</strong><br>
        ${tDisplay("Código")}: ${row.codigo}<br>
        ${tDisplay("No. de Parte")}: ${row.num_parte}<br>
        ${tDisplay("Nombre")}: ${row.tipo_prod ?? "--"}<br>
        <a href="${row.link_rms}" target="_blank">${tDisplay("Abrir RMS")}</a>`;
      resultsDiv.appendChild(div);
    });
  }

  parteInput.addEventListener("input",  buscarProducto);
  clienteSelect.addEventListener("change", buscarProducto);
  tipoSelect.addEventListener("change",  buscarProducto);

  buscarProducto(); // primera ejecución
}

//Función que lang.js espera

window.renderProductoSelects = function () {
initProductoDesdeSupabase();
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
//  EMPAQUE
// ======================================================
function initEmpaqueDesdeSupabase() {
  const sb = window.supabaseClient;
  const selCliente = document.getElementById("emp-cliente");
  const inputParte = document.getElementById("emp-parte");
  const autoList   = document.getElementById("emp-autocomplete");
  const btnBuscar  = document.getElementById("emp-btn-buscar");
  const results    = document.getElementById("emp-results");
  const tbody      = document.querySelector("#emp-table tbody");

  if (!selCliente || !inputParte || !btnBuscar || !tbody) return;

  // Clientes
  (async () => {
    const { data } = await sb.from('v_empaque').select('cliente').order('cliente', { ascending: true });
    const unique = [...new Set((data ?? []).map(r => r.cliente).filter(Boolean))];
    fillSelect(unique, selCliente, "-- Seleccionar cliente --");
  })();

  // Autocomplete por parte (filtrable por cliente)
  bindOnce(inputParte, "input", "emp_autocomplete", async () => {
    const texto = (inputParte.value || "").trim().toLowerCase();
    autoList.innerHTML = "";
    if (!texto) return;

    let q = sb.from('v_empaque').select('num_parte')
      .ilike('num_parte', `%${texto}%`).limit(25);
    if (selCliente.value) q = q.eq('cliente', selCliente.value);

    const { data } = await q;
+   const unique = [...new Set((data ?? []).map(r => String(r.num_parte).trim().toUpperCase()))];
+   unique.forEach(p => {
      const div = document.createElement("div");
      div.className = "autocomplete-item";
      div.textContent = p;
      div.onclick = () => { inputParte.value = p; autoList.innerHTML = ""; };
      autoList.appendChild(div);
    });
  });


  // Buscar y pintar
  bindOnce(btnBuscar, "click", "emp_buscar", async () => {
    const cliente = selCliente.value;
    const parte   = (inputParte.value || "").trim();
    tbody.innerHTML = "";
    results.querySelector("#emp-header").innerHTML = "";

    if (!cliente || !parte) {
      results.querySelector("#emp-header").innerHTML =
        `<span class="msg-warn">${tDisplay("Seleccione CLIENTE y escriba un Número de pieza.")}</span>`;
      return;
    }

    const { data } = await sb.from('v_empaque').select('*')
      .eq('cliente', cliente).eq('num_parte', parte).limit(1);
    const match = (data ?? [])[0];
    if (!match) {
      results.querySelector("#emp-header").innerHTML =
        `<span class="msg-empty">${tDisplay("No se encontraron specs de empaque para ese cliente y número de parte.")}</span>`;
      return;
    }
   // Encabezado con link a RMS
   results.querySelector("#emp-header").innerHTML =
     `${match.cliente ?? "--"} / ${match.num_parte ?? "--"} — ${match.link_rms}${tDisplay("Abrir RMS")}</a>`;

    const rows = [
      ["TARIMA", match.cod_tarima],
      ["LARGUEROS", match.largueros],
      ["POLIN SUP/INF", match.polin_sup_inf],
      ["FLEJE", match.fleje],
      ["MUELLES x CAMA", match.mxc],
      ["CAMAS", match.camas],
      ["MUELLES x TARIMA", match.mxt],
      ["PESO NETO EMPAQUE (Kg)", match.peso_neto]
    ];
  });
}

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
  initEmpaqueDesdeSupabase();
};


// ======================================================
// TsTs: PLANTILLAS (con soporte de idioma)
// ======================================================
function initTstsDesdeSupabase() {
  const sb = window.supabaseClient;
  const selCliente  = document.getElementById("tsts-cliente");
  const inputParte  = document.getElementById("tsts-parte");
  const autoList    = document.getElementById("tsts-autocomplete");
  const btnBuscar   = document.getElementById("tsts-btn-buscar");
  const resultsRoot = document.getElementById("tsts-results");

  if (!selCliente || !inputParte || !btnBuscar || !resultsRoot) return;

  // Clientes
  (async () => {
    const { data } = await sb.from('v_tsts').select('cliente').order('cliente', { ascending: true });
    const unique = [...new Set((data ?? []).map(r => r.cliente).filter(Boolean))];
    fillSelect(unique, selCliente, "-- Seleccionar cliente --");
  })();

  // Autocomplete por parte
  inputParte.addEventListener("input", async () => {
    const texto = (inputParte.value || "").trim().toLowerCase();
    autoList.innerHTML = "";
    if (!texto) return;

    let q = sb.from('v_tsts').select('num_parte')
      .ilike('num_parte', `%${texto}%`)
      .limit(12);
    if (selCliente.value) q = q.eq('cliente', selCliente.value);

    const { data } = await q;
    [...new Set((data ?? []).map(r => r.num_parte))].forEach(p => {
      const div = document.createElement("div");
      div.className = "autocomplete-item";
      div.textContent = p;
      div.onclick = () => { inputParte.value = p; autoList.innerHTML = ""; };
      autoList.appendChild(div);
    });
  });

  // Buscar y render
  + bindOnce(btnBuscar, "click", "tsts_buscar", async () => {
    const cliente = selCliente.value;
    const parte   = (inputParte.value || "").trim();
    resultsRoot.innerHTML = "";

    if (!cliente || !parte) {
      resultsRoot.innerHTML = `<span class="msg-warn">${tDisplay("Seleccione CLIENTE y escriba un Número de pieza.")}</span>`;
      return;
    }

    const { data } = await sb.from('v_tsts').select('*')
      .eq('cliente', cliente)
      .eq('num_parte', parte)
      .order('no_hoja', { ascending: true });

    const rows = data ?? [];
    if (!rows.length) {
      resultsRoot.innerHTML = `<span class="msg-empty">${tDisplay("No se encontraron plantillas para ese cliente y número de parte.")}</span>`;
      return;
    }
    
 const r0 = rows[0];
 const tipoHoja   = r0.tipo_hoja ?? "--";
 const numMuestra = r0.num_muestra ?? "--";
 const clienteTxt = r0.cliente ?? cliente;
 let html = `
   <h4><strong>${tDisplay("Cliente")}:</strong> ${clienteTxt}</h4>
   <h4><strong>${tDisplay("No. de Parte")}:</strong> ${parte}</h4>
   <h4><strong>${tDisplay("Tipo de Plantilla")}:</strong> ${tipoHoja}</h4>
   <h4><strong>${tDisplay("Muestra")}:</strong> ${numMuestra}</h4>
   <br>
   <table class="emp-table">
     <thead>
       <tr class="table-title">
         <th>${tDisplay("N° HOJA")}</th>
         <th>${tDisplay("Tipo de pieza")}</th>
         <th>${tDisplay("PLANTILLA")}</th>
         <th>${tDisplay("Molde")}</th>
         <th>${tDisplay("MUESTRA")}</th>
         <th>${tDisplay("Muestra detalle")}</th>
       </tr>
     </thead>
     <tbody>
       ${rows.map(r => `
         <tr>
           <td class="value-cell">${r.no_hoja ?? "--"}</td>
           <td class="value-cell">${r.tipo_pieza ?? "--"}</td>
           <td class="value-cell">${r.no_plantilla ?? "--"}</td>
           <td class="value-cell">${r.molde ?? "--"}</td>
           <td class="value-cell">${numMuestra}</td>
           <td class="value-cell">${r.muestra_detalle ?? "--"}</td>
         </tr>
       `).join("")}
     </tbody>
   </table>`;

    resultsRoot.innerHTML = html;
  });
}

// ------- Hooks para idioma, igual que Producto/Empaque -------
window.renderTstsSelects = function () {
  initTstsDesdeSupabase();
};
