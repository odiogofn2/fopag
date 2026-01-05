console.log("app.js carregado");

/* =============================
   SUPABASE (UMA ÚNICA VEZ)
============================= */
const SUPABASE_URL = "https://rbxadmxxbrhgvbgcclxa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJieGFkbXh4YnJoZ3ZiZ2NjbHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTQ2MjAsImV4cCI6MjA4MzE5MDYyMH0.AI0_5k8t26J_Vu2WEBMB7lI8mzJDisV5bvKTAv42SjE";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* =============================
   LOGIN
============================= */
async function login() {
  console.log("clicou em entrar");

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (!emailInput || !passwordInput) {
    alert("Campos de login não encontrados");
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Preencha email e senha");
    return;
  }

  const { error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    alert(error.message);
    return;
  }

  iniciarSistema();
}

/* =============================
   INIT
============================= */
function iniciarSistema() {
  console.log("Sistema iniciado");

  const loginArea = document.getElementById("login-area");
  const appArea = document.getElementById("app-area");

  if (!loginArea || !appArea) {
    alert("Erro interno: áreas não encontradas");
    return;
  }

  loginArea.classList.add("hidden");
  appArea.classList.remove("hidden");
}

/* =============================
   LOGOUT
============================= */
async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}
