console.log("Sistema carregado");

// ===== SUPABASE INIT =====
const supabaseClient = window.supabase.createClient(
  "https://rbxadmxxbrhgvbgcclxa.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJieGFkbXh4YnJoZ3ZiZ2NjbHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTQ2MjAsImV4cCI6MjA4MzE5MDYyMH0.AI0_5k8t26J_Vu2WEBMB7lI8mzJDisV5bvKTAv42SjE"
);

// ===== ABAS =====
function showTab(id) {
  document.querySelectorAll("section").forEach(s => {
    s.style.display = "none";
  });

  const tab = document.getElementById(id);
  if (tab) {
    tab.style.display = "block";
  }
}

// ===== LOGIN SIMPLES =====
async function login() {
  alert("Use o Supabase Auth real depois");
  iniciarSistema();
}

// ===== INIT =====
async function iniciarSistema() {
  console.log("Login realizado com sucesso.");
  await carregarCarteiras();
  await carregarPessoas();
  await carregarDashboard();
}

// ===== CARTEIRAS =====
async function carregarCarteiras() {

  const select = document.getElementById("mov_carteira");
  const area = document.getElementById("listaCarteiras");

  const { data, error } = await supabaseClient
    .from("carteiras")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    console.log(error);
    return;
  }

  // popular select
  if (select) {
    data.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nome;
      select.appendChild(opt);
    });
  }

  // listar
  if (area) {
    area.innerHTML = JSON.stringify(data);
  }
}

async function cadastrarCarteira() {

  const nome = document.getElementById("carteira_nome");
  const tipo = document.getElementById("carteira_tipo");

  await supabaseClient.from("carteiras").insert({
    nome: nome.value,
    tipo: tipo.value
  });

  await carregarCarteiras();
}


// ===== PESSOAS =====
async function carregarPessoas() {

  const select = document.getElementById("mov_pessoa");
  const area = document.getElementById("listaPessoas");

  const { data, error } = await supabaseClient
    .from("pessoas")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    console.log(error);
    return;
  }

  if (select) {
    data.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.nome;
      select.appendChild(opt);
    });
  }

  if (area) {
    area.innerHTML = JSON.stringify(data);
  }
}

async function cadastrarPessoa() {
  const nome = document.getElementById("pessoa_nome");

  await supabaseClient.from("pessoas").insert({
    nome: nome.value
  });

  await carregarPessoas();
}


// ===== MOVIMENTAÇÕES + PARCELAMENTO =====
async function cadastrarMovimentacao() {

  const desc = document.getElementById("mov_desc");
  const pessoa = document.getElementById("mov_pessoa");
  const carteira = document.getElementById("mov_carteira");
  const valor = document.getElementById("mov_valor");
  const tipo = document.getElementById("mov_tipo");
  const dataRef = document.getElementById("mov_data");
  const parcelas = document.getElementById("mov_parcelas");
  const dividaPessoa = document.getElementById("mov_dividaPessoa");

  const qtd = Number(parcelas.value || 1);

  for (let i = 1; i <= qtd; i++) {

    const baseDate = new Date(dataRef.value);
    baseDate.setMonth(baseDate.getMonth() + (i - 1));

    await supabaseClient.from("movimentacoes").insert({
      descricao: desc.value,
      pessoa_id: pessoa.value || null,
      carteira_id: carteira.value || null,
      valor: valor.value,
      tipo: tipo.value,
      data_referencia: baseDate.toISOString().substr(0,10),

      parcelas: qtd,
      parcela_atual: i,

      divida_outra_pessoa: dividaPessoa.value,
      status_pagamento: "pendente"
    });
  }

  alert("Parcelas criadas automaticamente.");
  await carregarDashboard();
}


// ===== DASHBOARD =====
async function carregarDashboard() {

  const mes = document.getElementById("filtroMes").value;
  const ano = document.getElementById("filtroAno").value;

  const { data, error } = await supabaseClient
    .from("movimentacoes")
    .select("*");

  if (error) {
    console.log(error);
    return;
  }

  const tbody = document.getElementById("tabelaDash");
  if (!tbody) return;

  tbody.innerHTML = "";

  let totalEntrada = 0;
  let totalSaida = 0;

  data.forEach(m => {

    const d = new Date(m.data_referencia);
    const mMes = d.getMonth() + 1;
    const mAno = d.getFullYear();

    if (mMes != mes || mAno != ano) return;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${m.descricao}</td>
      <td>${m.tipo}</td>
      <td>${m.valor}</td>
      <td>${m.parcela_atual}/${m.parcelas}</td>
      <td>${mes}/${ano}</td>
    `;

    tbody.appendChild(tr);

    if (m.tipo === "entrada") totalEntrada += Number(m.valor);
    if (m.tipo === "saida") totalSaida += Number(m.valor);
  });

  const resumo = document.getElementById("resumo");
  if (resumo) {
    resumo.innerHTML = `
      Entradas: ${totalEntrada}<br/>
      Saídas: ${totalSaida}<br/>
      Saldo: ${totalEntrada - totalSaida}
    `;
  }
}
