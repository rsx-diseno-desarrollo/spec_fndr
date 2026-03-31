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
//  PRODUCTO
// ======================================================
async function initProductoDesdeSupabase() {
  const sb = window.supabaseClient;
  const clienteSelect = document.getElementById("cliente");
  const tipoSelect    = document.getElementById("nombre");
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

 // let q = sb.from('v_prod_specs').select('*').limit(500);
  let q = sb.from('v_prod_specs').select('cliente,codigo,tipo_prod, num_parte,link_rms').limit(500);

  if (parte)   q = q.ilike('num_parte', `%${parte}%`);
  if (cliente) q = q.eq('cliente', cliente);
  if (tipo)    q = q.eq('tipo_prod', tipo);

  const { data } = await q;
  resultsDiv.innerHTML = "";

  // AGRUPAR POR CODIGO
  const grouped = new Map();

  (data ?? []).forEach(r => {
    if (!grouped.has(r.codigo)) {
      grouped.set(r.codigo, {
        cliente: r.cliente,
        codigo:  r.codigo,
        tipo:    r.tipo_prod,
        link:    r.link_rms,
        partes:  new Set()
      });
    }
    grouped.get(r.codigo).partes.add(r.num_parte);
  });

// Pintar como máximo 21 cards
const MAX_CARDS = 21;
const top = Array.from(grouped.values()).slice(0, MAX_CARDS);

top.forEach(item => {
  const card = document.createElement("div");
  card.className = "spec";
  const partesTxt = [...item.partes].join(", ");
  card.innerHTML = `
    <strong>${item.cliente}</strong><br>
    ${tDisplay("Código")}: ${item.codigo}<br>
    ${tDisplay("No. de Parte")}: ${partesTxt}<br>
    ${tDisplay("Nombre")}: ${tDisplay(item.tipo)}<br>
    <a href="${item.link}" target="_blank">${tDisplay("Abrir RMS")}</a>`;
  
  resultsDiv.appendChild(card);
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
    const unique = [...new Set((data ?? []).map(r => String(r.num_parte).trim().toUpperCase()))];
    unique.forEach(p => {
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
  const parte = (inputParte.value || "").trim();

  tbody.innerHTML = "";
  const empHeaderEl = results.querySelector("#emp-header");
  if (empHeaderEl) empHeaderEl.innerHTML = "";

  if (!cliente || !parte) {
    if (empHeaderEl) empHeaderEl.innerHTML =
      `<span class="msg-warn">${tDisplay("Seleccione CLIENTE y escriba un Número de pieza.")}</span>`;
    return;
  }

  const { data } = await sb.from('v_empaque').select(`
    cliente,
    num_parte,
    cod_tarima, largueros, polin_sup_inf, fleje, mxc, camas, mxt, peso_neto, peso_bruto,
    doc_codigo,
    link_rms
  `)
  .eq('cliente', cliente)
  .eq('num_parte', parte)
  .limit(1);

  const match = (data ?? [])[0];
  if (!match) {
    if (empHeaderEl) empHeaderEl.innerHTML =
      `<span class="msg-empty">${tDisplay("No se encontraron specs de empaque para ese cliente y número de parte.")}</span>`;
    return;
  }

  // --- Encabezado IN-TABLE (igual estilo que Plantillas, reusando .comp-title/.comp-doc) ---
  const clienteTxt  = String(match.cliente ?? "").trim();
  const parteTxt    = String(match.num_parte ?? "").trim();
  const docCodigo   = String(match.doc_codigo ?? "--").trim();
  const href        = toSafeHref(String(match.link_rms ?? "").trim());

  const docHtml = href
    ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(docCodigo)}</a>`
    : `${esc(docCodigo)}`;

  const table = document.getElementById("emp-table");

  // Limpia cualquier <thead> previo
  let thead = table.querySelector("thead");
  if (thead) thead.remove();

  // Construye el thead con una sola fila-title que contiene el bloque (2 líneas)
  thead = document.createElement("thead");
  const trTitle = document.createElement("tr");
  trTitle.className = "table-title";
  const thTitle = document.createElement("th");
  thTitle.colSpan = 2;
  thTitle.innerHTML = `
    <div class="comp-title">${esc(clienteTxt)} - ${esc(parteTxt)}</div>
    <div class="comp-doc">Documento: ${docHtml}</div>
  `;
  trTitle.appendChild(thTitle);
  thead.appendChild(trTitle);
  table.prepend(thead);

  // (opcional) deja vacío el caption si existe para no duplicar encabezados
  const cap = table.querySelector("caption#emp-cap");
  if (cap) cap.innerHTML = "";

  // --- Filas de datos (como ya lo hacías) ---
  const rows = [
    ["TARIMA", match.cod_tarima],
    ["LARGUEROS", match.largueros],
    ["POLIN SUP/INF", match.polin_sup_inf],
    ["FLEJE", match.fleje],
    ["MUELLES x CAMA", match.mxc],
    ["CAMAS", match.camas],
    ["MUELLES x TARIMA", match.mxt],
    ["PESO NETO EMPAQUE (Kg)", match.peso_neto],
    ["PESO BRUTO EMPAQUE (Kg)", match.peso_bruto]
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

// --- Utilidades compartidas para encabezados (Componentes/Empaque) ---
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function toSafeHref(url) {
  if (!url) return "";
  const u = String(url).trim();
  // http/https o rutas relativas
  if (/^https?:\/\//i.test(u) || u.startsWith("/")) return u;
  // host de intranet sin esquema (rsx-sviis1/rms/...)
  if (/^[a-z0-9._-]+(?:\:[0-9]+)?\//i.test(u)) return "http://" + u;
  return "";
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
  bindOnce(inputParte, "input", "tsts_autocomplete", async () => {
    const texto = (inputParte.value || "").trim().toLowerCase();
    autoList.innerHTML = "";
    if (!texto) return;
  
    let q = sb.from('v_tsts').select('num_parte')
      .ilike('num_parte', `%${texto}%`)
      .limit(12);
    if (selCliente.value) q = q.eq('cliente', selCliente.value);
  
    const { data } = await q;
  
    const unique = [...new Set((data ?? []).map(r => String(r.num_parte).trim().toUpperCase()))];
  
    unique.forEach(p => {
      const div = document.createElement("div");
      div.className = "autocomplete-item";
      div.textContent = p;
      div.onclick = () => { inputParte.value = p; autoList.innerHTML = ""; };
      autoList.appendChild(div);
    });
  });

  // Buscar y render
    bindOnce(btnBuscar, "click", "tsts_buscar", async () => {
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
      .order('no_hoja_num', { ascending: true });

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
         <th>${tDisplay("PLANTILLA")}</th>
         <th>${tDisplay("MOLDE")}</th>
         <th>${tDisplay("N° MUESTRA")}</th>
       </tr>
     </thead>
     <tbody>
       ${rows.map(r => `
         <tr>
           <td class="value-cell">${r.no_tip_hoja ?? "--"}</td>
           <td class="value-cell">${r.no_plantilla ?? "--"}</td>
           <td class="value-cell">${r.molde ?? "--"}</td>
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
