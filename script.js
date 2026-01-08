/* ================== SUPABASE CONFIG ================== */
const SUPABASE_URL = "https://fwzdxtpkirkyygzoezjx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3emR4dHBraXJreXlnem9lemp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4OTE3MjcsImV4cCI6MjA4MzQ2NzcyN30.JhZaeArVoReH150Z6seCKu8AM1qw9PeZayLfTtfJqIQ";

window.__sb = window.__sb || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const sb = window.__sb;

/* ================== ESTADO ================== */
let sessionUser = null;

let categories = [];
let paymentMethods = [];
let banks = [];
let transactions = [];

let editId = null;

/* ================== CHARTS ================== */
let chartMensal = null;
let chartCategorias = null;
let chartBancos = null;
let chartSaldo = null;

/* ================== INIT ================== */
document.addEventListener("DOMContentLoaded", async () => {
  configurarAbas();
  configurarFiltroMes();
  configurarAuthUI();

  bindConfigButtons();

  const { data } = await sb.auth.getSession();
  sessionUser = data.session?.user || null;

  await aplicarEstadoAuth();

  sb.auth.onAuthStateChange(async (_event, newSession) => {
    sessionUser = newSession?.user || null;
    await aplicarEstadoAuth();
  });
});

/* ================== UI HELPERS ================== */
function show(elId, yes) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.style.display = yes ? "" : "none";
}

function fmtBRL(n) {
  return `R$ ${Number(n).toFixed(2).replace(".", ",")}`;
}

function parseValor(valor) {
  const v = String(valor).trim();
  if (!v) throw "Informe o valor";
  const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
  if (isNaN(n) || n <= 0) throw "Valor inválido";
  return +n.toFixed(2);
}

function normalizarMes(yyyyMm) {
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) throw "Selecione o mês";
  return yyyyMm;
}

function monthToDate(yyyyMm) {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

function dateToMonthStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function somarMes(yyyyMm, offset) {
  const d = monthToDate(yyyyMm);
  d.setMonth(d.getMonth() + offset);
  return dateToMonthStr(d);
}

function getMesFiltro() {
  const el = document.getElementById("mesFiltro");
  return el ? el.value : "";
}

function mesesOrdenados(lista) {
  const s = new Set(lista.map(t => t.month_str).filter(Boolean));
  return Array.from(s).sort((a, b) => a.localeCompare(b));
}

/* ================== AUTH UI ================== */
function configurarAuthUI() {
  const formAuth = document.getElementById("formAuth");
  const btnLogout = document.getElementById("btnLogout");
  const btnLogout2 = document.getElementById("btnLogout2");

  formAuth.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("authEmail").value.trim();
    const pass = document.getElementById("authPass").value;

    let res = await sb.auth.signInWithPassword({ email, password: pass });
    if (res.error) {
      const sign = await sb.auth.signUp({ email, password: pass });
      if (sign.error) return alert(sign.error.message);
      return alert("Conta criada! Se exigir confirmação por e-mail, confirme e tente entrar novamente.");
    }
  });

  btnLogout.addEventListener("click", async () => sb.auth.signOut());
  btnLogout2.addEventListener("click", async () => sb.auth.signOut());
}

async function aplicarEstadoAuth() {
  const logado = !!sessionUser;

  show("authBox", !logado);
  show("tabs", logado);

  const appSections = ["lancamentos", "graficos", "configuracoes"];
  appSections.forEach(id => show(id, logado));

  if (!logado) return;

  ativarAba("lancamentos");

  await carregarTudo();
  await garantirBancosPadraoSeVazio(); // Inter, Nubank, MercadoPago, Banco do Brasil

  await carregarTudo(); // recarrega depois de possível insert
  renderTudo();
}

/* ================== ABAS ================== */
function configurarAbas() {
  const tabs = document.querySelectorAll(".tabs button");
  tabs.forEach(btn => btn.addEventListener("click", () => ativarAba(btn.dataset.aba)));
}

function ativarAba(id) {
  const abas = ["lancamentos", "graficos", "configuracoes"];

  document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
  const btn = document.querySelector(`.tabs button[data-aba="${id}"]`);
  if (btn) btn.classList.add("active");

  abas.forEach(secId => {
    const sec = document.getElementById(secId);
    if (!sec) return;
    sec.classList.remove("ativa");
    sec.style.display = "none";
  });

  const alvo = document.getElementById(id);
  if (alvo) {
    alvo.classList.add("ativa");
    alvo.style.display = "";
  }

  if (id === "graficos") atualizarGraficos();
}

/* ================== FILTRO ================== */
function configurarFiltroMes() {
  const el = document.getElementById("mesFiltro");
  if (!el) return;

  if (!el.value) {
    const hoje = new Date();
    el.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  }

  el.addEventListener("change", () => {
    renderLancamentos();
    if (document.getElementById("graficos")?.classList.contains("ativa")) atualizarGraficos();
  });
}

/* ================== LOAD DATA ================== */
async function carregarTudo() {
  await Promise.all([carregarCategorias(), carregarPagamentos(), carregarBancos(), carregarTransacoes()]);
}

async function carregarCategorias() {
  const { data, error } = await sb.from("categories").select("id,name").order("name");
  if (error) return alert(error.message);
  categories = data || [];
}

async function carregarPagamentos() {
  const { data, error } = await sb.from("payment_methods").select("id,name").order("name");
  if (error) return alert(error.message);
  paymentMethods = data || [];
}

async function carregarBancos() {
  const { data, error } = await sb.from("banks").select("id,name").order("name");
  if (error) return alert(error.message);
  banks = data || [];
}

async function carregarTransacoes() {
  const { data, error } = await sb.from("transactions")
    .select("id, group_id, type, amount, description, month, installment_current, installments_total, category_id, payment_method_id, bank_id")
    .order("month", { ascending: true });

  if (error) return alert(error.message);

  transactions = (data || []).map(t => ({
    ...t,
    month_str: dateToMonthStr(new Date(t.month))
  }));
}

/* ================== DEFAULT BANKS ================== */
async function garantirBancosPadraoSeVazio() {
  // se já tem banco cadastrado, não mexe
  if (banks.length > 0) return;

  const padrao = ["Inter", "Nubank", "MercadoPago", "Banco do Brasil"];
  const rows = padrao.map(name => ({ user_id: sessionUser.id, name }));

  const { error } = await sb.from("banks").insert(rows);
  if (error) {
    // se der conflito por unique etc, só ignora
    console.warn("Não consegui inserir bancos padrão:", error.message);
  }
}

/* ================== RENDER ================== */
function renderTudo() {
  renderCategorias();
  renderPagamentos();
  renderBancos();
  renderLancamentos();
}

function renderCategorias() {
  const ul = document.getElementById("listaCategorias");
  const select = document.getElementById("categoria");
  ul.innerHTML = "";
  select.innerHTML = `<option value="">Categoria</option>`;

  categories.forEach((c) => {
    ul.innerHTML += `
      <li>
        ${c.name}
        <button type="button" onclick="editarCategoria('${c.id}')">✎</button>
        <button type="button" onclick="removerCategoria('${c.id}')">✕</button>
      </li>`;
    select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
}

function renderPagamentos() {
  const ul = document.getElementById("listaPagamentos");
  const select = document.getElementById("pagamento");
  ul.innerHTML = "";
  select.innerHTML = `<option value="">Forma de pagamento</option>`;

  paymentMethods.forEach((p) => {
    ul.innerHTML += `
      <li>
        ${p.name}
        <button type="button" onclick="editarPagamento('${p.id}')">✎</button>
        <button type="button" onclick="removerPagamento('${p.id}')">✕</button>
      </li>`;
    select.innerHTML += `<option value="${p.id}">${p.name}</option>`;
  });
}

function renderBancos() {
  const ul = document.getElementById("listaBancos");
  const select = document.getElementById("banco");
  ul.innerHTML = "";
  select.innerHTML = `<option value="">Banco</option>`;

  banks.forEach((b) => {
    ul.innerHTML += `
      <li>
        ${b.name}
        <button type="button" onclick="editarBanco('${b.id}')">✎</button>
        <button type="button" onclick="removerBanco('${b.id}')">✕</button>
      </li>`;
    select.innerHTML += `<option value="${b.id}">${b.name}</option>`;
  });
}

function renderLancamentos() {
  const ul = document.getElementById("listaLancamentos");
  ul.innerHTML = "";

  const mesFiltro = getMesFiltro();
  const filtrada = mesFiltro ? transactions.filter(t => t.month_str === mesFiltro) : transactions;

  let entradas = 0, saidas = 0;

  filtrada.forEach(t => {
    const catName = categories.find(c => c.id === t.category_id)?.name || "";
    const payName = paymentMethods.find(p => p.id === t.payment_method_id)?.name || "";
    const bankName = banks.find(b => b.id === t.bank_id)?.name || "";

    ul.innerHTML += `
      <li>
        ${t.type.toUpperCase()} | ${t.month_str} | ${fmtBRL(t.amount)}
        | ${catName} | ${payName} | ${bankName}
        ${t.installments_total > 1 ? `| ${t.installment_current}/${t.installments_total}` : ""}
        <button type="button" onclick="editarLancamento('${t.id}')">✏️</button>
        <button type="button" onclick="excluirLancamento('${t.id}')">🗑️</button>
      </li>
    `;

    if (t.type === "entrada") entradas += Number(t.amount);
    else saidas += Number(t.amount);
  });

  document.getElementById("totalEntradas").innerText = `Entradas: ${fmtBRL(entradas)}`;
  document.getElementById("totalSaidas").innerText = `Saídas: ${fmtBRL(saidas)}`;
  document.getElementById("saldo").innerText = `Saldo: ${fmtBRL(entradas - saidas)}`;
}

/* ================== BIND BOTÕES ================== */
function bindConfigButtons() {
  document.getElementById("btnAddCategoria")?.addEventListener("click", addCategoria);
  document.getElementById("btnAddPagamento")?.addEventListener("click", addPagamento);
  document.getElementById("btnAddBanco")?.addEventListener("click", addBanco);
}

/* ================== CRUD: CATEGORIAS ================== */
async function addCategoria() {
  const input = document.getElementById("novaCategoria");
  const name = input.value.trim();
  if (!name) return alert("Informe a categoria");

  const { error } = await sb.from("categories").insert({ user_id: sessionUser.id, name });
  if (error) return alert(error.message);

  input.value = "";
  await carregarCategorias();
  renderCategorias();
  atualizarGraficosSeAbaAtiva();
}

async function editarCategoria(id) {
  const atual = categories.find(c => c.id === id)?.name || "";
  const novo = prompt("Editar categoria:", atual);
  if (!novo) return;

  const name = novo.trim();
  if (!name) return;

  const { error } = await sb.from("categories").update({ name }).eq("id", id);
  if (error) return alert(error.message);

  await carregarCategorias();
  renderCategorias();
  renderLancamentos();
  atualizarGraficosSeAbaAtiva();
}

async function removerCategoria(id) {
  if (!confirm("Excluir categoria? (lançamentos ficam sem categoria)")) return;

  const { error } = await sb.from("categories").delete().eq("id", id);
  if (error) return alert(error.message);

  await carregarCategorias();
  await carregarTransacoes();
  renderTudo();
  atualizarGraficosSeAbaAtiva();
}

/* ================== CRUD: PAGAMENTOS ================== */
async function addPagamento() {
  const input = document.getElementById("novoPagamento");
  const name = input.value.trim();
  if (!name) return alert("Informe a forma de pagamento");

  const { error } = await sb.from("payment_methods").insert({ user_id: sessionUser.id, name });
  if (error) return alert(error.message);

  input.value = "";
  await carregarPagamentos();
  renderPagamentos();
  atualizarGraficosSeAbaAtiva();
}

async function editarPagamento(id) {
  const atual = paymentMethods.find(p => p.id === id)?.name || "";
  const novo = prompt("Editar forma de pagamento:", atual);
  if (!novo) return;

  const name = novo.trim();
  if (!name) return;

  const { error } = await sb.from("payment_methods").update({ name }).eq("id", id);
  if (error) return alert(error.message);

  await carregarPagamentos();
  renderPagamentos();
  renderLancamentos();
  atualizarGraficosSeAbaAtiva();
}

async function removerPagamento(id) {
  if (!confirm("Excluir forma de pagamento? (lançamentos ficam sem pagamento)")) return;

  const { error } = await sb.from("payment_methods").delete().eq("id", id);
  if (error) return alert(error.message);

  await carregarPagamentos();
  await carregarTransacoes();
  renderTudo();
  atualizarGraficosSeAbaAtiva();
}

/* ================== CRUD: BANCOS ================== */
async function addBanco() {
  const input = document.getElementById("novoBanco");
  const name = input.value.trim();
  if (!name) return alert("Informe o banco");

  const { error } = await sb.from("banks").insert({ user_id: sessionUser.id, name });
  if (error) return alert(error.message);

  input.value = "";
  await carregarBancos();
  renderBancos();
  atualizarGraficosSeAbaAtiva();
}

async function editarBanco(id) {
  const atual = banks.find(b => b.id === id)?.name || "";
  const novo = prompt("Editar banco:", atual);
  if (!novo) return;

  const name = novo.trim();
  if (!name) return;

  const { error } = await sb.from("banks").update({ name }).eq("id", id);
  if (error) return alert(error.message);

  await carregarBancos();
  renderBancos();
  renderLancamentos();
  atualizarGraficosSeAbaAtiva();
}

async function removerBanco(id) {
  if (!confirm("Excluir banco? (lançamentos ficam sem banco)")) return;

  const { error } = await sb.from("banks").delete().eq("id", id);
  if (error) return alert(error.message);

  await carregarBancos();
  await carregarTransacoes();
  renderTudo();
  atualizarGraficosSeAbaAtiva();
}

/* ================== CRUD: LANÇAMENTOS ================== */
document.getElementById("formLancamento").addEventListener("submit", salvarLancamento);

async function salvarLancamento(e) {
  e.preventDefault();

  try {
    const type = document.getElementById("tipo").value;
    const amountTotal = parseValor(document.getElementById("valor").value);
    const description = document.getElementById("local").value.trim();
    const category_id = document.getElementById("categoria").value;
    const payment_method_id = document.getElementById("pagamento").value;
    const bank_id = document.getElementById("banco").value;
    const baseMonthStr = normalizarMes(document.getElementById("mes").value);

    let installments = parseInt(document.getElementById("parcelas").value, 10);
    if (isNaN(installments) || installments < 1) installments = 1;

    if (!type) throw "Selecione o tipo";
    if (!description) throw "Informe o local/descrição";
    if (!category_id) throw "Selecione a categoria";
    if (!payment_method_id) throw "Selecione a forma de pagamento";
    if (!bank_id) throw "Selecione o banco";

    // editar 1 registro
    if (editId) {
      const { error } = await sb.from("transactions")
        .update({
          type,
          amount: amountTotal,
          description,
          category_id,
          payment_method_id,
          bank_id,
          month: monthToDate(baseMonthStr)
        })
        .eq("id", editId);

      if (error) return alert(error.message);

      editId = null;
      e.target.reset();
      document.getElementById("parcelas").value = 1;

      await carregarTransacoes();
      renderLancamentos();
      atualizarGraficosSeAbaAtiva();
      return;
    }

    // novo: parcelas (explode por mês)
    const group_id = installments > 1 ? crypto.randomUUID() : null;

    const base = +(amountTotal / installments).toFixed(2);
    let acumulado = 0;

    const rows = [];
    for (let i = 0; i < installments; i++) {
      const isLast = i === installments - 1;
      const amount = isLast ? +(amountTotal - acumulado).toFixed(2) : base;
      acumulado += amount;

      const m = somarMes(baseMonthStr, i);
      rows.push({
        user_id: sessionUser.id,
        group_id,
        type,
        amount,
        description,
        category_id,
        payment_method_id,
        bank_id,
        month: monthToDate(m),
        installment_current: installments > 1 ? (i + 1) : 1,
        installments_total: installments
      });
    }

    const { error } = await sb.from("transactions").insert(rows);
    if (error) return alert(error.message);

    e.target.reset();
    document.getElementById("parcelas").value = 1;

    await carregarTransacoes();
    renderLancamentos();
    atualizarGraficosSeAbaAtiva();

  } catch (err) {
    alert(err);
  }
}

async function editarLancamento(id) {
  const t = transactions.find(x => x.id === id);
  if (!t) return;

  editId = id;
  document.getElementById("tipo").value = t.type;
  document.getElementById("valor").value = Number(t.amount).toFixed(2).replace(".", ",");
  document.getElementById("parcelas").value = 1;
  document.getElementById("local").value = t.description;
  document.getElementById("categoria").value = t.category_id || "";
  document.getElementById("pagamento").value = t.payment_method_id || "";
  document.getElementById("banco").value = t.bank_id || "";
  document.getElementById("mes").value = t.month_str;
}

async function excluirLancamento(id) {
  const t = transactions.find(x => x.id === id);
  if (!t) return;

  if (!t.group_id) {
    if (!confirm("Excluir este lançamento?")) return;
    const { error } = await sb.from("transactions").delete().eq("id", id);
    if (error) return alert(error.message);

    await carregarTransacoes();
    renderLancamentos();
    atualizarGraficosSeAbaAtiva();
    return;
  }

  const escolha = prompt(
    "Lançamento parcelado.\n\n" +
    "1 = Excluir só esta parcela\n" +
    "2 = Excluir TODAS as parcelas\n\n" +
    "Cancelar = não excluir"
  );

  if (escolha === "1") {
    const { error } = await sb.from("transactions").delete().eq("id", id);
    if (error) return alert(error.message);

    await carregarTransacoes();
    renderLancamentos();
    atualizarGraficosSeAbaAtiva();
    return;
  }

  if (escolha === "2") {
    const { error } = await sb.from("transactions").delete().eq("group_id", t.group_id);
    if (error) return alert(error.message);

    await carregarTransacoes();
    renderLancamentos();
    atualizarGraficosSeAbaAtiva();
  }
}

/* ================== GRÁFICOS ================== */
function atualizarGraficosSeAbaAtiva() {
  if (document.getElementById("graficos")?.classList.contains("ativa")) atualizarGraficos();
}

function atualizarGraficos() {
  const lista = transactions;

  // (1) Entradas x Saídas por mês
  const meses = mesesOrdenados(lista);
  const entradasMes = [];
  const saidasMes = [];

  meses.forEach(m => {
    let e = 0, s = 0;
    lista.filter(t => t.month_str === m).forEach(t => {
      if (t.type === "entrada") e += Number(t.amount);
      else s += Number(t.amount);
    });
    entradasMes.push(+e.toFixed(2));
    saidasMes.push(+s.toFixed(2));
  });

  // (2) Gastos por categoria (respeita filtro)
  const mesFiltro = getMesFiltro();
  const baseFiltrada = mesFiltro ? lista.filter(t => t.month_str === mesFiltro) : lista;

  const gastosCat = {};
  baseFiltrada.forEach(t => {
    if (t.type !== "saida") return;
    const nome = categories.find(c => c.id === t.category_id)?.name || "Sem categoria";
    gastosCat[nome] = (gastosCat[nome] || 0) + Number(t.amount);
  });

  const catLabels = Object.keys(gastosCat);
  const catValues = catLabels.map(k => +gastosCat[k].toFixed(2));

  // (NOVO) Gastos por banco (respeita filtro)
  const gastosBank = {};
  baseFiltrada.forEach(t => {
    if (t.type !== "saida") return;
    const nome = banks.find(b => b.id === t.bank_id)?.name || "Sem banco";
    gastosBank[nome] = (gastosBank[nome] || 0) + Number(t.amount);
  });

  const bankLabels = Object.keys(gastosBank);
  const bankValues = bankLabels.map(k => +gastosBank[k].toFixed(2));

  // (3) Saldo acumulado
  let acum = 0;
  const saldoAcum = meses.map((m, idx) => {
    const net = entradasMes[idx] - saidasMes[idx];
    acum += net;
    return +acum.toFixed(2);
  });

  renderChartMensal(meses, entradasMes, saidasMes);
  renderChartCategorias(catLabels, catValues);
  renderChartBancos(bankLabels, bankValues);
  renderChartSaldo(meses, saldoAcum);
}

function renderChartMensal(labels, entradas, saidas) {
  const el = document.getElementById("graficoMensal");
  if (!el || !window.Chart) return;

  const data = { labels, datasets: [{ label: "Entradas", data: entradas }, { label: "Saídas", data: saidas }] };

  if (chartMensal) { chartMensal.data = data; chartMensal.update(); return; }

  chartMensal = new Chart(el, {
    type: "bar",
    data,
    options: { responsive: true, plugins: { legend: { position: "top" } } }
  });
}

function renderChartCategorias(labels, values) {
  const el = document.getElementById("graficoCategorias");
  if (!el || !window.Chart) return;

  const data = { labels, datasets: [{ label: "Gastos por categoria", data: values }] };

  if (chartCategorias) { chartCategorias.data = data; chartCategorias.update(); return; }

  chartCategorias = new Chart(el, {
    type: "doughnut",
    data,
    options: { responsive: true, plugins: { legend: { position: "right" } } }
  });
}

function renderChartBancos(labels, values) {
  const el = document.getElementById("graficoBancos");
  if (!el || !window.Chart) return;

  const data = { labels, datasets: [{ label: "Gastos por banco", data: values }] };

  if (chartBancos) { chartBancos.data = data; chartBancos.update(); return; }

  chartBancos = new Chart(el, {
    type: "doughnut",
    data,
    options: { responsive: true, plugins: { legend: { position: "right" } } }
  });
}

function renderChartSaldo(labels, values) {
  const el = document.getElementById("graficoSaldo");
  if (!el || !window.Chart) return;

  const data = { labels, datasets: [{ label: "Saldo acumulado", data: values, tension: 0.25 }] };

  if (chartSaldo) { chartSaldo.data = data; chartSaldo.update(); return; }

  chartSaldo = new Chart(el, {
    type: "line",
    data,
    options: { responsive: true, plugins: { legend: { position: "top" } } }
  });
}

/* ===== Expor para onclick ===== */
window.editarLancamento = editarLancamento;
window.excluirLancamento = excluirLancamento;

window.editarCategoria = editarCategoria;
window.removerCategoria = removerCategoria;

window.editarPagamento = editarPagamento;
window.removerPagamento = removerPagamento;

window.editarBanco = editarBanco;
window.removerBanco = removerBanco;
