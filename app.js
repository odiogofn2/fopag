console.log("Sistema carregado");

/* ========= SUPABASE – DECLARADO UMA ÚNICA VEZ ========= */
const supabaseClient = supabase.createClient(
  "https://rbxadmxxbrhgvbgcclxa.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJieGFkbXh4YnJoZ3ZiZ2NjbHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTQ2MjAsImV4cCI6MjA4MzE5MDYyMH0.AI0_5k8t26J_Vu2WEBMB7lI8mzJDisV5bvKTAv42SjE"
);

/* ========= LOGIN ========= */
async function login() {

  const email = document.getElementById("email");
  const senha = document.getElementById("senha");

  if (!email || !senha) {
    alert("Campos de login não encontrados na tela.");
    return;
  }

  const { error, data } = await supabaseClient.auth.signInWithPassword({
    email: email.value,
    password: senha.value
  });

  if (error) {
    alert("Erro no login: " + error.message);
    return;
  }

  console.log("Login realizado com sucesso.");
  iniciarSistema();
}

/* ========= INICIAR ========= */
async function iniciarSistema() {

  const dashboard = document.getElementById("dashboard");

  if (!dashboard) {
    alert("Dashboard não encontrado no HTML.");
    return;
  }

  dashboard.style.display = "block";

  await carregarCarteiras();
  await carregarPessoas();
  await carregarDashboard();
}

/* ========= CARTEIRAS ========= */
async function carregarCarteiras() {

  const lista = document.getElementById("listaCarteiras");
  lista.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("carteiras")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    console.log(error);
    return;
  }

  (data || []).forEach(c => {
    const li = document.createElement("li");
    li.textContent = c.nome + " – " + (c.descricao || "");
    lista.appendChild(li);
  });
}

/* ========= PESSOAS ========= */
async function carregarPessoas() {

  const lista = document.getElementById("listaPessoas");
  lista.innerHTML = "";

  const { data } = await supabaseClient
    .from("pessoas")
    .select("*")
    .order("nome", { ascending: true });

  (data || []).forEach(p => {
    const li = document.createElement("li");
    li.textContent = p.nome + " (" + p.tipo + ")";
    lista.appendChild(li);
  });
}

/* ========= DASHBOARD ========= */
async function carregarDashboard() {

  const tabela = document.getElementById("tabelaDash");

  const { data } = await supabaseClient
    .from("movimentacoes")
    .select("*");

  tabela.innerHTML = "";

  let totalEntrada = 0;
  let totalSaida = 0;

  (data || []).forEach(m => {

    if (m.tipo === "entrada") totalEntrada += Number(m.valor);
    if (m.tipo === "saida") totalSaida += Number(m.valor);

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${m.descricao}</td>
      <td>${m.tipo}</td>
      <td>${m.valor}</td>
      <td>${m.parcela_atual}/${m.parcelas}</td>
      <td>${m.mes}/${m.ano}</td>
    `;

    tabela.appendChild(tr);
  });

  document.getElementById("resumo").innerHTML = `
    Entradas: ${totalEntrada}<br>
    Saídas: ${totalSaida}<br>
    Saldo: ${totalEntrada - totalSaida}
  `;
}

/* ========= CADASTRAR MOVIMENTAÇÃO COM PARCELAMENTO AUTOMÁTICO ========= */
async function cadastrarMovimentacao() {

  const desc = document.getElementById("mov_desc");
  const pessoa = document.getElementById("mov_pessoa");
  const carteira = document.getElementById("mov_carteira");
  const valor = document.getElementById("mov_valor");
  const tipo = document.getElementById("mov_tipo");
  const parcelas = document.getElementById("mov_parcelas");
  const dataRef = document.getElementById("mov_data");

  if (!desc || !valor || !tipo || !dataRef) {
    alert("Preencha: Descrição, Valor, Tipo e Data de Referência.");
    return;
  }

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
      parcela_atual: i
    });
  }

  alert("Movimentação cadastrada em " + qtd + " vezes!");

  await carregarDashboard();
}
