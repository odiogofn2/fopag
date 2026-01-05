// =====================
// SUPABASE
// =====================
const supabase = window.supabase.createClient(
  "https://rbxadmxxbrhgvbgcclxa.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJieGFkbXh4YnJoZ3ZiZ2NjbHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTQ2MjAsImV4cCI6MjA4MzE5MDYyMH0.AI0_5k8t26J_Vu2WEBMB7lI8mzJDisV5bvKTAv42SjE"
);

// =====================
// LOGIN
// =====================
document.getElementById("btnLogin").addEventListener("click", login);

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const msg = document.getElementById("loginMsg");

  msg.innerText = "Entrando...";

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    msg.innerText = error.message;
    return;
  }

  iniciarSistema();
}

async function logout() {
  await supabase.auth.signOut();
  location.reload();
}

// =====================
// SISTEMA
// =====================
async function iniciarSistema() {
  document.getElementById("loginView").classList.add("hidden");
  document.getElementById("systemView").classList.remove("hidden");

  carregarCarteiras();
  carregarPessoas();
  carregarDashboard();
}

function showTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

// =====================
// CARTEIRAS
// =====================
async function salvarCarteira() {
  const nome = carteiraNome.value;

  await supabase.from("carteiras").insert({ nome });
  carregarCarteiras();
}

async function carregarCarteiras() {
  const { data } = await supabase.from("carteiras").select("*").order("nome");
  listaCarteiras.innerHTML = "";
  movCarteira.innerHTML = "";

  data.forEach(c => {
    listaCarteiras.innerHTML += `<li>${c.nome}</li>`;
    movCarteira.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
  });
}

// =====================
// PESSOAS
// =====================
async function salvarPessoa() {
  const nome = pessoaNome.value;

  await supabase.from("pessoas").insert({ nome });
  carregarPessoas();
}

async function carregarPessoas() {
  const { data } = await supabase.from("pessoas").select("*").order("nome");
  listaPessoas.innerHTML = "";
  movPessoa.innerHTML = "";

  data.forEach(p => {
    listaPessoas.innerHTML += `<li>${p.nome}</li>`;
    movPessoa.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
  });
}

// =====================
// MOVIMENTAÇÕES
// =====================
async function salvarMovimentacao() {
  const parcelas = Number(movParcelas.value);
  const valor = Number(movValor.value) / parcelas;

  for (let i = 0; i < parcelas; i++) {
    await supabase.from("movimentacoes").insert({
      descricao: movDesc.value,
      valor,
      mes: Number(movMes.value) + i,
      ano: Number(movAno.value),
      carteira_id: movCarteira.value,
      pessoa_id: movPessoa.value
    });
  }

  alert("Movimentação salva!");
  carregarDashboard();
}

// =====================
// DASHBOARD
// =====================
async function carregarDashboard() {
  const { data } = await supabase.from("movimentacoes").select("valor");
  const total = data.reduce((s, m) => s + Number(m.valor), 0);
  dashboardResumo.innerText = `Total registrado: R$ ${total.toFixed(2)}`;
}
