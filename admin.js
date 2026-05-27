async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

const PSW_HSH = "f95c58f0cdcf08664ea0f10556e97fa9294986b3c55c6b8eeb615a5b31d152bd";

//  DEFINIR GLOBAL DESDE EL INICIO
window.showAdminOverlay = function () {
  const overlay = document.getElementById("admin-overlay");

  if (!overlay) return;

  overlay.style.display = "flex";
  document.documentElement.style.overflow = "hidden";
};

document.addEventListener("DOMContentLoaded", () => {

  const overlay = document.getElementById("admin-overlay");
  const btn = document.getElementById("admin-login");
  const cancel = document.getElementById("admin-cancel");
  const input = document.getElementById("admin-pass");

overlay.style.display = "none";

  //  Mostrar overlay correctamente
  window.showAdminOverlay = function () {
    overlay.style.display = "flex";
    document.documentElement.style.overflow = "hidden";
  };

  function hide() {
    overlay.style.display = "none";
    document.documentElement.style.overflow = "";
    input.value = "";
  }

  //  LOGIN
  
btn.addEventListener("click", async () => {

  const pass = input.value;

  await new Promise(r => setTimeout(r, 500)); 

  const hashed = await hashPassword(pass);

  if (hashed === PSW_HSH) {

    sessionStorage.setItem("adminUnlocked", "1");

    hide();

    document.getElementById("admin-content").style.display = "block";

  } else {
    alert("Contraseña incorrecta");
  }

});


  //  REGRESAR
cancel.addEventListener("click", () => {

  hide();

  const ultima = sessionStorage.getItem('lastSection') || "seccion-producto";

  document.querySelectorAll('.seccion')
    .forEach(sec => sec.classList.remove('activa'));

  document.getElementById(ultima).classList.add('activa');

});

  //  ENTER
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") btn.click();
  });

  //  ESC
  document.addEventListener("keydown", (e) => {
    
if (e.key === "Escape" && overlay.style.display !== "none") {
  hide();
}
  });

// ============================
// TABS ADMIN
// ============================

const tabButtons = document.querySelectorAll("[data-admin-tab]");
const panels = document.querySelectorAll(".admin-panel");

function activarTab(tab) {

  // Quitar activo en botones
  tabButtons.forEach(btn => btn.classList.remove("activo"));

  // Ocultar panels
  panels.forEach(p => p.style.display = "none");

  // Activar botón
  document
    .querySelector(`[data-admin-tab="${tab}"]`)
    ?.classList.add("activo");

  // Mostrar panel
  const panel = document.getElementById(`admin-tab-${tab}`);
  if (panel) panel.style.display = "block";
}

// click tabs
tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    activarTab(btn.dataset.adminTab);
  });
});

//  TAB INICIAL
activarTab("prod");

let modoProducto = "nuevo";

const btnNuevo = document.getElementById("btn-modo-nuevo");
const btnEditar = document.getElementById("btn-modo-editar");

btnNuevo?.addEventListener("click", () => {
  modoProducto = "nuevo";

  btnNuevo.classList.add("activo");
  btnEditar.classList.remove("activo");

  limpiarFormulario();
});

btnEditar?.addEventListener("click", () => {
  modoProducto = "editar";

  btnEditar.classList.add("activo");
  btnNuevo.classList.remove("activo");

  // después aquí buscador
});

function limpiarFormulario() {
  document.getElementById("form-producto").reset();

  // dejar solo una parte
  const container = document.getElementById("partes-container");
  container.innerHTML = `
    <div class="parte-item">
      <input type="text" class="prod-parte" placeholder="Número de parte sin guión" required>
    </div>
  `;
}

});
