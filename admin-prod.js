document.addEventListener("DOMContentLoaded", () => {

  const formProd = document.getElementById("form-producto");
  const containerPartes = document.getElementById("partes-container");
  const btnAddParte = document.getElementById("add-parte");
  const selectCliente = document.getElementById("prod-cliente");

const btnModoNuevo = document.getElementById("btn-modo-nuevo");
const btnModoEditar = document.getElementById("btn-modo-editar");

const formNuevo = document.getElementById("form-producto");
const modoEditar = document.getElementById("modo-editar-container");

function inicializarAutocompleteAdmin() {

  const inputBuscar = document.getElementById("buscar-doc");
  const containerAuto = document.getElementById("autocomplete-docs");

  if (!inputBuscar || !containerAuto) return;

  inputBuscar.addEventListener("input", () => {

    const valor = inputBuscar.value.toLowerCase();
    containerAuto.innerHTML = "";

    if (!valor) {
      containerAuto.classList.remove("active");
      return;
    }

    const filtrados = docsCache.filter(doc =>
      doc.codigo.toLowerCase().includes(valor)
    );

    if (filtrados.length === 0) {
      containerAuto.classList.remove("active");
      return;
    }

    containerAuto.classList.add("active");

    filtrados.slice(0, 10).forEach(doc => {

      const div = document.createElement("div");
      div.className = "autocomplete-item";

      div.textContent = `${doc.codigo} - ${doc.tipo_prod}`;

      div.addEventListener("click", () => {
        inputBuscar.value = doc.codigo;
        containerAuto.innerHTML = "";
        containerAuto.classList.remove("active");
      });

      containerAuto.appendChild(div);

    });

  });

}


// 🔹 modo nuevo
btnModoNuevo?.addEventListener("click", () => {

  formNuevo.style.display = "block";
  modoEditar.style.display = "none";

  btnModoNuevo.classList.add("activo");
  btnModoEditar.classList.remove("activo");

});

// 🔹 modo editar
btnModoEditar?.addEventListener("click", () => {

  formNuevo.style.display = "none";
  modoEditar.style.display = "block";

  btnModoEditar.classList.add("activo");
  btnModoNuevo.classList.remove("activo");

  inicializarAutocompleteAdmin();

});

let docsCache = []; // guardamos resultados

// =========================
// CARGAR TODOS LOS CÓDIGOS
// =========================
async function cargarDocsAutocomplete() {

  const { data, error } = await window.supabaseClient
    .from("docs")
    .select("id, codigo, tipo_prod")
    .eq("seccion", "PRODUCTO");

  if (error) {
    console.error(error);
    return;
  }

  docsCache = data;
}

cargarDocsAutocomplete();

document.addEventListener("click", (e) => {

  const inputBuscar = document.getElementById("buscar-doc");
  const containerAuto = document.getElementById("autocomplete-docs");

  if (!inputBuscar || !containerAuto) return;

  if (!containerAuto.contains(e.target) && e.target !== inputBuscar) {
    containerAuto.innerHTML = "";
    containerAuto.classList.remove("active");
  }

});


// =========================
// CARGAR CLIENTES
// =========================
async function cargarClientes() {

  const { data, error } = await window.supabaseClient
    .from("clientes")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");

  if (error) {
    console.error("Error cargando clientes:", error);
    return;
  }

  // limpiar por si se recarga
  selectCliente.innerHTML = `<option value="">Seleccionar cliente</option>`;

  data.forEach(cliente => {
    const opt = document.createElement("option");
    opt.value = cliente.nombre; // importante (usas nombre después)
    opt.textContent = cliente.nombre;
    selectCliente.appendChild(opt);
  });

}

// ejecutar
cargarClientes();


  // =========================
  // AGREGAR PARTES DINÁMICAS
  // =========================
  btnAddParte?.addEventListener("click", () => {

    const div = document.createElement("div");
    div.className = "parte-item";

    div.innerHTML = `
      <input type="text" class="prod-parte" placeholder="Número de parte sin guión" required>
      <button type="button" class="remove-parte">❌</button>
    `;

    containerPartes.appendChild(div);

    div.querySelector("input").focus();
  });

const containerEditPartes = document.getElementById("edit-partes-container");
const btnAddEditParte = document.getElementById("add-edit-parte");

// agregar nuevas partes dinámicamente
btnAddEditParte?.addEventListener("click", () => {

  const div = document.createElement("div");
  div.className = "parte-item";

  div.innerHTML = `
    <input type="text" class="edit-parte" placeholder="Número de parte sin guión">
    <button type="button" class="remove-parte">❌</button>
  `;

  containerEditPartes.appendChild(div);

});

  // =========================
  // ELIMINAR PARTES
  // =========================
  document.addEventListener("click", (e) => {

  if (e.target.classList.contains("remove-parte")) {
    e.target.parentElement.remove();
  }
});

// =========================
// MODO EDITAR
// =========================

const btnBuscar = document.getElementById("btn-buscar-doc");
const btnGuardarEdit = document.getElementById("btn-guardar-edicion");

btnBuscar?.addEventListener("click", async () => {

  const input = document.getElementById("buscar-doc").value;

  if (!input) {
    alert("Escribe algo para buscar");
    return;
  }

  const { data, error } = await window.supabaseClient
  .from("docs")
  .select(`
    id,
    codigo,
    tipo_prod,
    link_rms,
    prod_docs_partes (
      partes (
        id,
        num_parte,
        clientes (
          nombre
        )
      )
    )
  `)
  .ilike("codigo", `%${input}%`);

  if (error) {
    console.error(error);
    alert("Error buscando");
    return;
  }

  if (data.length === 0) {
    alert("No encontrado");
    return;
  }

  const doc = data[0];

  // MOSTRAR RESULTADOS
  const clienteNombre = doc.prod_docs_partes[0]?.partes?.clientes?.nombre || "N/A";

  document.getElementById("res-cliente").textContent = clienteNombre;
  document.getElementById("res-codigo").textContent = doc.codigo;
  document.getElementById("res-tipo").textContent = doc.tipo_prod;

  const lista = document.getElementById("res-partes");
  lista.innerHTML = "";

  doc.prod_docs_partes.forEach(rel => {
    const li = document.createElement("li");
    li.textContent = rel.partes.num_parte;
    lista.appendChild(li);
  });

  document.getElementById("resultado-doc").style.display = "block";
  document.getElementById("editar-doc").style.display = "block";

  document.getElementById("edit-link").value = doc.link_rms;

  window.docEditando = doc.id;

});

btnGuardarEdit?.addEventListener("click", async () => {

  const confirmacion = confirm("¿Estás seguro de que quieres guardar los cambios?");
  if (!confirmacion) return;

  const linkNuevo = document.getElementById("edit-link").value;
  const nuevasPartesInputs = document.querySelectorAll(".edit-parte");
  

const nuevasPartes = Array.from(nuevasPartesInputs)
  .map(i => i.value.replace(/-/g, "").trim())
  .filter(p => p !== "");

// =========================
// VALIDAR DUPLICADOS LOCALES
// =========================
const duplicadosLocales = nuevasPartes.filter((parte, index) =>
  nuevasPartes.indexOf(parte) !== index
);

if (duplicadosLocales.length > 0) {
  alert(`Hay números de parte duplicados:\n${[...new Set(duplicadosLocales)].join(", ")}`);
  return;
}

// =========================
// VALIDAR EXISTENTES EN BD
// =========================
if (nuevasPartes.length > 0) {

  const { data: partesExistentes, error: errorExistentes } = await window.supabaseClient
    .from("partes")
    .select("num_parte")
    .in("num_parte", nuevasPartes);

  if (errorExistentes) {
    console.error(errorExistentes);
    alert("Error validando partes");
    return;
  }

  if (partesExistentes.length > 0) {

    const existentes = partesExistentes.map(p => p.num_parte);

    alert(`Estas partes ya existen:\n${existentes.join(", ")}`);

    return;
  }

}

  const { error } = await window.supabaseClient
    .from("docs")
    .update({ link_rms: linkNuevo })
    .eq("id", window.docEditando);

// =========================
// INSERTAR NUEVAS PARTES
// =========================
if (nuevasPartes.length > 0) {

  // 1. obtener cliente desde partes existentes
  const { data: relData } = await window.supabaseClient
    .from("prod_docs_partes")
    .select(`
      partes (
        cliente_id
      )
    `)
    .eq("doc_id", window.docEditando)
    .limit(1);

  const clienteId = relData[0]?.partes?.cliente_id;

  // 2. insertar nuevas partes
  const partesInsert = nuevasPartes.map(p => ({
    num_parte: p,
    cliente_id: clienteId
  }));

  const { data: partesData, error: partesError } = await window.supabaseClient
    .from("partes")
    .insert(partesInsert)
    .select();

  if (partesError) throw partesError;

  // 3. crear relación
  const relaciones = partesData.map(p => ({
    parte_id: p.id,
    doc_id: window.docEditando
  }));

  const { error: relError } = await window.supabaseClient
    .from("prod_docs_partes")
    .insert(relaciones);

  if (relError) throw relError;

}

  if (error) {
    console.error(error);
    alert("Error al actualizar");
    return;
  }

  alert("Actualizado correctamente ✅");

});

  // =========================
  // SUBMIT FORM
  // =========================
  formProd?.addEventListener("submit", async (e) => {
  e.preventDefault();

const confirmacion = confirm("¿Estás seguro de que quieres guardar el registro?");

if (!confirmacion) return;

  const clienteNombre = document.getElementById("prod-cliente").value;
  const tipo = document.getElementById("prod-tipo").value;
  const docCodigo = document.getElementById("prod-doc").value;
  const link = document.getElementById("prod-link").value;

  const partesInputs = document.querySelectorAll(".prod-parte");

  const partes = Array.from(partesInputs)
    .map(i => i.value.replace(/-/g, "").trim())
    .filter(p => p !== "");

  if (!clienteNombre || !tipo || !docCodigo || !link || partes.length === 0) {
    alert("Todos los campos son obligatorios");
    return;
  }

  try {

// =========================
// VALIDAR PARTES EXISTENTES
// =========================
const { data: docsExistentes } = await window.supabaseClient
  .from("docs")
  .select("codigo, tipo_prod")
  .eq("codigo", docCodigo);

if (docsExistentes.length > 0) {
  alert(`Ya existe un documento con este código`);
  return;
}

const { data: partesExistentes, error: errorExistentes } = await window.supabaseClient
  .from("partes")
  .select("num_parte")
  .in("num_parte", partes);

if (errorExistentes) throw errorExistentes;

    // =========================
    // 1. OBTENER ID CLIENTE
    // =========================
    const { data: clienteData, error: clienteError } = await window.supabaseClient
      .from("clientes")
      .select("id")
      .eq("nombre", clienteNombre)
      .single();

    if (clienteError) throw clienteError;

    const clienteId = clienteData.id;

    // =========================
    // 2. INSERTAR DOC
    // =========================
    const { data: docData, error: docError } = await window.supabaseClient
      .from("docs")
      .insert([{
        codigo: docCodigo,
        link_rms: link,
        tipo_prod: tipo,
	seccion: "PRODUCTO"
      }])
      .select()
      .single();

    if (docError) throw docError;

    const docId = docData.id;

    // =========================
// 3. PROCESAR PARTES CORRECTO
// =========================

// 1. Obtener partes existentes
const { data: partesExistentesBD, error: errorPartesExistentes } = await window.supabaseClient
  .from("partes")
  .select("id, num_parte")
  .in("num_parte", partes);

if (errorPartesExistentes) throw errorPartesExistentes;

const mapaExistentes = new Map(
  partesExistentesBD.map(p => [p.num_parte, p.id])
);

// 2. Separar nuevas vs existentes
const nuevas = [];
const existentes = [];

partes.forEach(p => {
  if (mapaExistentes.has(p)) {
    existentes.push({
      num_parte: p,
      id: mapaExistentes.get(p)
    });
  } else {
    nuevas.push(p);
  }
});

// =========================
// 4. INSERTAR NUEVAS PARTES
// =========================
let partesInsertadas = [];

if (nuevas.length > 0) {

  const partesInsert = nuevas.map(p => ({
    num_parte: p,
    cliente_id: clienteId
  }));

  const { data, error } = await window.supabaseClient
    .from("partes")
    .insert(partesInsert)
    .select();

  if (error) throw error;

  partesInsertadas = data;
}

// =========================
// 5. UNIR TODAS LAS PARTES
// =========================
const todasPartes = [
  ...partesInsertadas,
  ...existentes.map(p => ({
    id: p.id,
    num_parte: p.num_parte
  }))
];

// =========================
// 6. VALIDAR RELACIONES EXISTENTES
// =========================
const { data: relacionesExistentes, error: errorRelaciones } = await window.supabaseClient
  .from("prod_docs_partes")
  .select("parte_id")
  .eq("doc_id", docId);

if (errorRelaciones) throw errorRelaciones;

const yaRelacionados = new Set(
  relacionesExistentes.map(r => r.parte_id)
);

// =========================
// 7. CREAR RELACIONES NUEVAS
// =========================
const relacionesFinales = todasPartes
  .filter(p => !yaRelacionados.has(p.id))
  .map(p => ({
    parte_id: p.id,
    doc_id: docId
  }));

if (relacionesFinales.length > 0) {

  const { error: relError } = await window.supabaseClient
    .from("prod_docs_partes")
    .insert(relacionesFinales);

  if (relError) throw relError;

}

    //  TODO OK
    alert("Registro guardado correctamente ");

    formProd.reset();

  } catch (err) {
    console.error("Error:", err);
    alert("Error al guardar");
  }
});

});
