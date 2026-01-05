const { createClient } = supabase;

const supa = createClient(
  "https://rbxadmxxbrhgvbgcclxa.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJieGFkbXh4YnJoZ3ZiZ2NjbHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTQ2MjAsImV4cCI6MjA4MzE5MDYyMH0.AI0_5k8t26J_Vu2WEBMB7lI8mzJDisV5bvKTAv42SjE"
);

/* AUTH */
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supa.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);

  init();
}

async function register() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supa.auth.signUp({ email, password });
  if (error) alert(error.message);
  else alert("Conta criada com sucesso");
}

function logout() {
  supa.auth.signOut();
  location.reload();
}

/* INIT */
async function init() {
  auth.classList.add("hidden");
  app.classList.remove("hidden");

  preencherMesAno();
  carregarCarteiras();
  carregarPessoas();
  carregarDashboard();
}

/* TABS */
function showTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

/* DASHBOARD */
async function carregarDashboard() {
  const mes = filtroMes.value;
  const ano = filtroAno.value;

  let q = supa.from("movimentacoes").select("*");
  if (mes) q = q.eq("mes", mes);
  if (ano) q = q.eq("ano", ano);

  const { data } = await q;

  let total = 0, pago = 0, aberto = 0, outros = 0;

  data.forEach(m => {
    total += m.valor;
    m.pago ? pago += m.valor : aberto += m.valor;
    if (m.pessoa_id) outros += m.valor;
  });

  totalGasto.innerText = total.toFixed(2);
  totalPago.innerText = pago.toFixed(2);
  totalAberto.innerText = aberto.toFixed(2);
  totalOutros.innerText = outros.toFixed(2);
  qtd.innerText = data.length;
}

/* MOVIMENTAÇÃO + PARCELAMENTO */
async function salvarMovimentacao() {
  const desc = descricao.value;
  const total = Number(valor.value);
  const parcelasQtd = Number(parcelas.value);
  const carteiraId = carteira.value || null;
  const pessoaId = pessoa.value || null;
  const pagoCheck = pago.checked;

  const hoje = new Date();
  const valorParcela = total / parcelasQtd;

  for (let i = 0; i < parcelasQtd; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);

    await supa.from("movimentacoes").insert({
      descricao: `${desc} (${i + 1}/${parcelasQtd})`,
      valor: valorParcela,
      mes: d.getMonth() + 1,
      ano: d.getFullYear(),
      carteira_id: carteiraId,
      pessoa_id: pessoaId,
      pago: pagoCheck
    });
  }

  alert("Movimentação salva com sucesso");
  carregarDashboard();
}

/* CARTEIRAS */
async function carregarCarteiras() {
  const { data } = await supa.from("carteiras").select("*").order("nome");

  carteira.innerHTML = `<option value="">Selecione</option>`;
  listaCarteiras.innerHTML = "";

  data.forEach(c => {
    carteira.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
    listaCarteiras.innerHTML += `<li>${c.nome}</li>`;
  });
}

async function salvarCarteira() {
  if (!novaCarteira.value) return;
  await supa.from("carteiras").insert({ nome: novaCarteira.value });
  novaCarteira.value = "";
  carregarCarteiras();
}

/* PESSOAS */
async function carregarPessoas() {
  const { data } = await supa.from("pessoas").select("*").order("nome");

  pessoa.innerHTML = `<option value="">Selecione</option>`;
  listaPessoas.innerHTML = "";

  data.forEach(p => {
    pessoa.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
    listaPessoas.innerHTML += `<li>${p.nome}</li>`;
  });
}

async function salvarPessoa() {
  if (!novaPessoa.value) return;
  await supa.from("pessoas").insert({ nome: novaPessoa.value });
  novaPessoa.value = "";
  carregarPessoas();
}

/* AUX */
function preencherMesAno() {
  filtroMes.innerHTML = `<option value="">Mês</option>`;
  filtroAno.innerHTML = `<option value="">Ano</option>`;

  for (let i = 1; i <= 12; i++)
    filtroMes.innerHTML += `<option value="${i}">${i}</option>`;

  const atual = new Date().getFullYear();
  for (let y = atual - 2; y <= atual + 1; y++)
    filtroAno.innerHTML += `<option value="${y}">${y}</option>`;
}
