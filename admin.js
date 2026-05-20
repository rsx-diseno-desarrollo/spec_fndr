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

});
