// =======================
// SUPABASE
// =======================
const supabaseClient = window.supabase.createClient(
  "https://rbxadmxxbrhgvbgcclxa.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJieGFkbXh4YnJoZ3ZiZ2NjbHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTQ2MjAsImV4cCI6MjA4MzE5MDYyMH0.AI0_5k8t26J_Vu2WEBMB7lI8mzJDisV5bvKTAv42SjE"
);

// =======================
// LOGIN
// =======================
document.getElementById("btnLogin").onclick = login;

async function login() {
  const email = email.value;
  const password = password.value;
  const msg = loginMsg;

  msg.innerText = "Entrando...";

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return msg.innerText = error.message;

  iniciarSistema();
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

// =======================
// SISTEMA
// =======================
async function iniciarSistema() {
  loginView.classList.add("hidden");
  systemView.classList.remove("hidden");

  await carregarCarteiras();
  await carregarPessoas();
  showTab("dashboard");
  carregarDashboard();
}

function showTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.add("hidden"));
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}

// =======================
// CARTEIRAS
// =======================
async function salvarCarteira() {
  const user = (await supabaseClient.auth.getUser()).data.user;
  await supabaseClient.from("carteiras").insert({ nome: carteiraNome.value, user_id: user.id });
  carteiraNome.value = "";
  carregarCarteiras();
}

async function carregarCarteiras() {
  const { data } = await supabaseClient.from("carteiras").select("*").order("nome");
  listaCarteiras.innerHTML = movCarteira.innerHTML = "";
  data?.forEach(c => {
    listaCarteiras.innerHTML += `<li>${c.nome}</li>`;
    movCarteira.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
  });
}

// =======================
// PESSOAS
// =======================
async function salvarPessoa() {
  const user = (await supabaseClient.auth.getUser()).data.user;
  await supabaseClient.from("pessoas").insert({ nome: pessoaNome.value, user_id: user.id });
  pessoaNome.value = "";
  carregarPessoas();
}

async function carregarPessoas() {
  const { data } = await supabaseClient.from("pessoas").select("*").order("nome");
  listaPessoas.innerHTML = movPessoa.innerHTML = "";
  data?.forEach(p => {
    listaPessoas.innerHTML += `<li>${p.nome}</li>`;
    movPessoa.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
  });
}

// =======================
// MOVIMENTAÇÕES
// =======================
async function salvarMovimentacao() {
  const user = (await supabaseClient.auth.getUser()).data.user;

  const parcelas = Number(movParcelas.value || 1);
  const valorParcela = Number(movValor.value) / parcelas;
  const percentual = Number(movPercentual.value || 100);

  for (let i = 0; i < parcelas; i++) {
    let mes = Number(movMes.value) + i;
    let ano = Number(movAno.value);
    if (mes > 12) { mes -= 12; ano++; }

    await supabaseClient.from("movimentacoes").insert({
      descricao: movDesc.value,
      valor: valorParcela * (percentual / 100),
      mes,
      ano,
      status: movStatus.value,
      carteira_id: movCarteira.value,
      pessoa_id: movPessoa.value,
      user_id: user.id
    });
  }

  alert("Movimentação salva");
  carregarDashboard();
}

// =======================
// DASHBOARD
// =======================
async function carregarDashboard() {
  const mes = filtroMes.value;
  const ano = filtroAno.value;

  let query = supabaseClient.from("movimentacoes").select("*");
  if (mes) query = query.eq("mes", mes);
  if (ano) query = query.eq("ano", ano);

  const { data } = await query;

  let total = 0, pago = 0, pendente = 0;

  data?.forEach(m => {
    total += Number(m.valor);
    if (m.status === "pago") pago += Number(m.valor);
    else pendente += Number(m.valor);
  });

  dashboardResumo.innerHTML = `
    <p>Total: R$ ${total.toFixed(2)}</p>
    <p>Pago: R$ ${pago.toFixed(2)}</p>
    <p>Pendente: R$ ${pendente.toFixed(2)}</p>
  `;
}
