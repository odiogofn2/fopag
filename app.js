const { createClient } = supabase;
const supa = createClient(
  "https://rbxadmxxbrhgvbgcclxa.supabase.co",
  "SUA_ANON_KEY"
);

let userId = null;

async function login() {
  const { data, error } = await supa.auth.signInWithPassword({
    email: email.value,
    password: password.value
  });
  if (error) return alert(error.message);
  userId = data.user.id;
  init();
}

async function register() {
  const { error } = await supa.auth.signUp({
    email: email.value,
    password: password.value
  });
  if (error) alert(error.message);
  else alert("Conta criada");
}

function logout() {
  supa.auth.signOut();
  location.reload();
}

async function init() {
  auth.classList.add("hidden");
  app.classList.remove("hidden");

  carregarCarteiras();
  carregarPessoas();
  carregarDashboard();
}

function showTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

/* DASHBOARD */
async function carregarDashboard() {
  const { data } = await supa.from("movimentacoes").select("*");
  let total = 0, pago = 0;

  data.forEach(m => {
    total += m.valor;
    if (m.pago) pago += m.valor;
  });

  document.getElementById("total").innerText = `R$ ${total.toFixed(2)}`;
  document.getElementById("pago").innerText = `R$ ${pago.toFixed(2)}`;
  document.getElementById("aberto").innerText = `R$ ${(total - pago).toFixed(2)}`;
}

/* MOVIMENTAÇÕES */
async function salvarMovimentacao() {
  const total = Number(valor.value);
  const qtd = Number(parcelas.value);
  const valorParcela = total / qtd;

  const hoje = new Date();

  for (let i = 0; i < qtd; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);

    await supa.from("movimentacoes").insert({
      user_id: userId,
      descricao: descricao.value,
      tipo: tipo.value,
      valor: valorParcela,
      mes: d.getMonth() + 1,
      ano: d.getFullYear(),
      carteira_id: carteira.value || null,
      pessoa_id: pessoa.value || null,
      pago: pago.checked
    });
  }

  alert("Movimentação salva");
  carregarDashboard();
}

/* CARTEIRAS */
async function carregarCarteiras() {
  const { data } = await supa.from("carteiras").select("*").order("nome");
  carteira.innerHTML = `<option value="">Selecione</option>`;
  listaCarteiras.innerHTML = "";
  data.forEach(c => {
    carteira.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
    listaCarteiras.innerHTML += `<li>${c.nome} (${c.tipo})</li>`;
  });
}

async function salvarCarteira() {
  await supa.from("carteiras").insert({
    user_id: userId,
    nome: novaCarteira.value,
    tipo: tipoCarteira.value
  });
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
  await supa.from("pessoas").insert({
    user_id: userId,
    nome: novaPessoa.value
  });
  novaPessoa.value = "";
  carregarPessoas();
}
