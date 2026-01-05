// =======================
// SUPABASE
// =======================
const supabaseClient = window.supabase.createClient(
  "https://rbxadmxxbrhgvbgcclxa.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJieGFkbXh4YnJoZ3ZiZ2NjbHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTQ2MjAsImV4cCI6MjA4MzE5MDYyMH0.AI0_5k8t26J_Vu2WEBMB7lI8mzJDisV5bvKTAv42SjE"

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* ================================
   LOGIN
================================ */
async function login() {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;

  if (!email || !password) {
    alert("Informe email e senha");
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert("Erro ao entrar: " + error.message);
    return;
  }

  iniciarSistema();
}

/* ================================
   INIT
================================ */
async function iniciarSistema() {
  document.getElementById("login-area").style.display = "none";
  document.getElementById("app-area").style.display = "block";

  showTab("dashboard");

  await carregarDashboard();
}

/* ================================
   ABAS
================================ */
function showTab(tabId) {
  document.querySelectorAll(".tab-content").forEach((el) => {
    el.classList.add("hidden");
  });

  document.querySelectorAll(".tab").forEach((el) => {
    el.classList.remove("active");
  });

  const content = document.getElementById(tabId);
  const tab = document.querySelector(`[data-tab="${tabId}"]`);

  if (content) content.classList.remove("hidden");
  if (tab) tab.classList.add("active");
}

/* ================================
   DASHBOARD
================================ */
async function carregarDashboard() {
  const { data, error } = await supabaseClient
    .from("movimentacoes")
    .select("*");

  if (error) {
    console.error(error);
    return;
  }

  const total = data.reduce((s, m) => s + Number(m.valor), 0);
  document.getElementById("saldoTotal").innerText =
    total.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
}

/* ================================
   CARTEIRAS
================================ */
async function carregarCarteiras() {
  const lista = document.getElementById("listaCarteiras");
  lista.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("carteiras")
    .select("*")
    .order("nome");

  if (error) {
    console.error(error);
    return;
  }

  data.forEach((c) => {
    const li = document.createElement("li");
    li.innerText = `${c.nome} — ${Number(c.saldo).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })}`;
    lista.appendChild(li);
  });
}

/* ================================
   PESSOAS
================================ */
async function carregarPessoas() {
  const lista = document.getElementById("listaPessoas");
  lista.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("pessoas")
    .select("*")
    .order("nome");

  if (error) {
    console.error(error);
    return;
  }

  data.forEach((p) => {
    const li = document.createElement("li");
    li.innerText = p.nome;
    lista.appendChild(li);
  });
}

/* ================================
   LOGOUT
================================ */
async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}
