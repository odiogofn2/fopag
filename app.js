// ===================================================
// SUPABASE (CRIADO UMA ÚNICA VEZ)
// ===================================================
const SUPABASE_URL = "https://rbxadmxxbrhgvbgcclxa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJieGFkbXh4YnJoZ3ZiZ2NjbHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTQ2MjAsImV4cCI6MjA4MzE5MDYyMH0.AI0_5k8t26J_Vu2WEBMB7lI8mzJDisV5bvKTAv42SjE";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ===================================================
// LOGIN
// ===================================================
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnLogin").addEventListener("click", login);
});

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const msg = document.getElementById("loginMsg");

  msg.innerText = "Entrando...";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    msg.innerText = error.message;
    return;
  }

  iniciarSistema();
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

// ===================================================
// SISTEMA
// ===================================================
async function iniciarSistema() {
  document.getElementById("loginView").classList.add("hidden");
  document.getElementById("systemView").classList.remove("hidden");

  showTab("dashboard");

  await carregarCarteiras();
  await carregarPessoas();
  await carregarDashboard();
}

function showTab(tabId) {
  document.querySelectorAll(".tab").forEach(t => t.classList.add("hidden"));
  document.getElementById(tabId).classList.remove("hidden");
}

// ===================================================
// CARTEIRAS
// ===================================================
async function salvarCarteira() {
  const nome = document.getElementById("carteiraNome").value.trim();
  if (!nome) return alert("Informe o nome da carteira");

  const user = (await supabaseClient.auth.getUser()).data.user;

  await supabaseClient.from("carteiras").insert({
    nome,
    user_id: user.id
  });

  document.getElementById("carteiraNome").value = "";
  carregarCarteiras();
}

async function carregarCarteiras() {
  const { data } = await supabaseClient
    .from("carteiras")
    .select("*")
    .order("nome");

  const lista = document.getElementById("listaCarteiras");
  const select = document.getElementById("movCarteira");

  lista.innerHTML = "";
  select.innerHTML = "";

  if (!data) return;

  data.forEach(c => {
    lista.innerHTML += `<li>${c.nome}</li>`;
    select.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
  });
}

// ===================================================
// PESSOAS
// ===================================================
async function salvarPessoa() {
  const nome = document.getElementById("pessoaNome").value.trim();
  if (!nome) return alert("Informe o nome da pessoa");

  const user = (await supabaseClient.auth.getUser()).data.user;

  await supabaseClient.from("pessoas").insert({
    nome,
    user_id: user.id
  });

  document.getElementById("pessoaNome").value = "";
  carregarPessoas();
}

async function carregarPessoas() {
  const { data } = await supabaseClient
    .from("pessoas")
    .select("*")
    .order("nome");

  const lista = document.getElementById("listaPessoas");
  const select = document.getElementById("movPessoa");

  lista.innerHTML = "";
  select.innerHTML = "";

  if (!data) return;

  data.forEach(p => {
    lista.innerHTML += `<li>${p.nome}</li>`;
    select.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
  });
}

// ===================================================
// MOVIMENTAÇÕES (PARCELAMENTO AUTOMÁTICO)
// ===================================================
async function salvarMovimentacao() {
  const desc = document.getElementById("movDesc").value;
  const total = Number(document.getElementById("movValor").value);
  const parcelas = Number(document.getElementById("movParcelas").value || 1);
  const mesBase = Number(document.getElementById("movMes").value);
  const anoBase = Number(document.getElementById("movAno").value);

  const carteira = document.getElementById("movCarteira").value;
  const pessoa = document.getElementById("movPessoa").value;

  if (!desc || !total || !mesBase || !anoBase)
    return alert("Preencha todos os campos");

  const user = (await supabaseClient.auth.getUser()).data.user;
  const valorParcela = total / parcelas;

  for (let i = 0; i < parcelas; i++) {
    let mes = mesBase + i;
    let ano = anoBase;

    if (mes > 12) {
      mes -= 12;
      ano += 1;
    }

    await supabaseClient.from("movimentacoes").insert({
      descricao: desc,
      valor: valorParcela,
      mes,
      ano,
      carteira_id: carteira,
      pessoa_id: pessoa,
      user_id: user.id
    });
  }

  alert("Movimentação salva com sucesso");
  carregarDashboard();
}

// ===================================================
// DASHBOARD
// ===================================================
async function carregarDashboard() {
  const { data } = await supabaseClient
    .from("movimentacoes")
    .select("valor");

  if (!data) return;

  const total = data.reduce((s, m) => s + Number(m.valor), 0);
  document.getElementById("dashboardResumo").innerText =
    `Total registrado: R$ ${total.toFixed(2)}`;
}
