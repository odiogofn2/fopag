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
let thirdParties = [];
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

/* ================== HELPERS ================== */
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

function monthToDbDate(yyyyMm) {
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) throw "Selecione o mês";
  return `${yyyyMm}-01`;
}

// soma meses sem Date/timezone
function somarMes(yyyyMm, offset) {
  const [y0, m0] = yyyyMm.split("-").map(Number);
  let y = y0;
  let m = m0 + offset;
  while (m > 12) { m -= 12; y += 1; }
  while (m < 1)  { m += 12; y -= 1; }
  return `${y}-${String(m).padStart(2, "0")}`;
}

function getMesFiltro() {
  const el = document.getElementById("mesFiltro");
  return el ? el.value : "";
}

function mesesOrdenados(lista) {
  const s = new Set(lista.map(t => t.month_str).filter(Boolean));
  return Array.from(s).sort((a, b) => a.localeCompare(b));
}

function getSelectedThirdIds() {
  const sel = document.getElementById("terceiros");
  return Array.from(sel.selectedOptions).map(o => o.value);
}

function participanteLabel(t) {
  if (t.is_self) return "Só eu";
  const nome = thirdParties.find(x => x.id === t.third_party_id)?.name;
  return nome || "Terceiro";
}

/* ================== AUTH ================== */
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
  await garantirBancosPadraoSeVazio();
  await carregarTudo();

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

/* ================== LOAD ================== */
async function carregarTudo() {
  await Promise.all([
    carregarCategorias(),
    carregarPagamentos(),
    carregarBancos(),
    carregarTerceiros(),
    carregarTransacoes()
  ]);
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

async function carregarTerceiros() {
  const { data, error } = await sb.from("third_parties").select("id,name").order("name");
  if (error) return alert(error.message);
  thirdParties = data || [];
}

async function carregarTransacoes() {
  const { data, error } = await sb.from("transactions")
    .select("id, group_id, split_id, type, amount, description, month, installment_current, installments_total, category_id, payment_method_id, bank_id, third_party_id, is_self")
    .order("month", { ascending: true });

  if (error) return alert(error.message);

  transactions = (data || []).map(t => ({
    ...t,
    month_str: (typeof t.month === "string") ? t.month.slice(0, 7) : ""
  }));
}

/* ================== DEFAULT BANKS ================== */
async function garantirBancosPadraoSeVazio() {
  if (banks.length > 0) return;

  const padrao = ["Inter", "Nubank", "MercadoPago", "Banco do Brasil"];
  const rows = padrao.map(name => ({ user_id: sessionUser.id, name }));

  const { error } = await sb.from("banks").insert(rows);
  if (error) console.warn("Inserção bancos padrão:", error.message);
}

/* ================== RENDER ================== */
function renderTudo() {
  renderCategorias();
  renderPagamentos();
  renderBancos();
  renderTerceiros();
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

function renderTerceiros() {
  const ul = document.getElementById("listaTerceiros");
  const select = document.getElementById("terceiros");

  ul.innerHTML = "";
  select.innerHTML = "";

  thirdParties.forEach((t) => {
    ul.innerHTML += `
      <li>
        ${t.name}
        <button type="button" onclick="editarTerceiro('${t.id}')">✎</button>
        <button type="button" onclick="removerTerceiro('${t.id}')">✕</button>
      </li>`;
    select.innerHTML += `<option value="${t.id}">${t.name}</option>`;
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
    const partName = participanteLabel(t);

    ul.innerHTML += `
      <li>
        ${t.type.toUpperCase()} | ${t.month_str} | ${fmtBRL(t.amount)}
        | ${catName} | ${payName} | ${bankName} | ${partName}
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

/* ================== CONFIG BINDS ================== */
function bindConfigButtons() {
  document.getElementById("btnAddCategoria")?.addEventListener("click", addCategoria);
  document.getElementById("btnAddPagamento")?.addEventListener("click", addPagamento);
  document.getElementById("btnAddBanco")?.addEventListener("click", addBanco);
  document.getElementById("btnAddTerceiro")?.addEventListener("click", addTerceiro);
}

/* ================== CRUD CONFIG (iguais ao seu padrão) ================== */
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

async function addTerceiro() {
  const input = document.getElementById("novoTerceiro");
  const name = input.value.trim();
  if (!name) return alert("Informe o nome do terceiro");
  const { error } = await sb.from("third_parties").insert({ user_id: sessionUser.id, name });
  if (error) return alert(error.message);
  input.value = "";
  await carregarTerceiros();
  renderTerceiros();
}
async function editarTerceiro(id) {
  const atual = thirdParties.find(t => t.id === id)?.name || "";
  const novo = prompt("Editar terceiro:", atual);
  if (!novo) return;
  const name = novo.trim();
  if (!name) return;
  const { error } = await sb.from("third_parties").update({ name }).eq("id", id);
  if (error) return alert(error.message);
  await carregarTerceiros();
  renderTerceiros();
  renderLancamentos();
}
async function removerTerceiro(id) {
  if (!confirm("Excluir terceiro?")) return;
  const { error } = await sb.from("third_parties").delete().eq("id", id);
  if (error) return alert(error.message);
  await carregarTerceiros();
  await carregarTransacoes();
  renderTudo();
}

/* ================== LANÇAMENTOS ================== */
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
    const baseMonthStr = document.getElementById("mes").value;
    const dividirAuto = document.getElementById("dividirAuto").checked;

    let installments = parseInt(document.getElementById("parcelas").value, 10);
    if (isNaN(installments) || installments < 1) installments = 1;

    const thirdIds = getSelectedThirdIds();

    if (!type) throw "Selecione o tipo";
    if (!description) throw "Informe o local/descrição";
    if (!category_id) throw "Selecione a categoria";
    if (!payment_method_id) throw "Selecione a forma de pagamento";
    if (!bank_id) throw "Selecione o banco";
    if (!baseMonthStr) throw "Selecione o mês";

    const btnSubmit = document.querySelector("#formLancamento button[type='submit']");

    // EDITAR (edita apenas 1 linha)
    if (editId) {
      const { error } = await sb.from("transactions")
        .update({
          type,
          amount: amountTotal,
          description,
          category_id,
          payment_method_id,
          bank_id,
          month: monthToDbDate(baseMonthStr)
          // não muda split/terceiro no edit simples
        })
        .eq("id", editId);

      if (error) return alert(error.message);

      editId = null;
      if (btnSubmit) btnSubmit.textContent = "Salvar";

      e.target.reset();
      document.getElementById("parcelas").value = 1;

      await carregarTransacoes();
      renderLancamentos();
      atualizarGraficosSeAbaAtiva();
      return;
    }

    // ===== NOVO =====
    // Se dividirAuto e tiver terceiros selecionados -> cria 1 linha por pessoa + você
    const usarSplit = dividirAuto && thirdIds.length > 0;
    const split_id = usarSplit ? crypto.randomUUID() : null;

    // parcelas: group_id mantém como antes (parcelas)
    const group_id = installments > 1 ? crypto.randomUUID() : null;

    // função para inserir as linhas de um mês (parcela)
    const inserirLinhasDoMes = async (yyyyMm, totalMes) => {
      // sem split: uma linha só (Só eu)
      if (!usarSplit) {
        return [{
          user_id: sessionUser.id,
          group_id,
          split_id: null,
          third_party_id: null,
          is_self: true,
          type,
          amount: totalMes,
          description,
          category_id,
          payment_method_id,
          bank_id,
          month: monthToDbDate(yyyyMm),
          installment_current: installments > 1 ? (null) : 1,
          installments_total: installments
        }];
      }

      // com split: N terceiros + 1 (você)
      const qtd = thirdIds.length + 1;
      const base = +(totalMes / qtd).toFixed(2);
      let acum = 0;

      const linhas = [];

      // terceiros
      for (let i = 0; i < thirdIds.length; i++) {
        const isLastThird = (i === thirdIds.length - 1);
        // não joga resto aqui; o resto vai no "Só eu"
        const amount = base;
        acum += amount;

        linhas.push({
          user_id: sessionUser.id,
          group_id,
          split_id,
          third_party_id: thirdIds[i],
          is_self: false,
          type,
          amount,
          description,
          category_id,
          payment_method_id,
          bank_id,
          month: monthToDbDate(yyyyMm),
          installment_current: 1,
          installments_total: 1
        });
      }

      // você: recebe o resto para fechar centavos certinho
      const amountSelf = +(totalMes - acum).toFixed(2);

      linhas.push({
        user_id: sessionUser.id,
        group_id,
        split_id,
        third_party_id: null,
        is_self: true,
        type,
        amount: amountSelf,
        description,
        category_id,
        payment_method_id,
        bank_id,
        month: monthToDbDate(yyyyMm),
        installment_current: 1,
        installments_total: 1
      });

      return linhas;
    };

    // parcelas por mês (explode)
    const rows = [];
    const baseParcela = +(amountTotal / installments).toFixed(2);
    let acumuladoParcelas = 0;

    for (let i = 0; i < installments; i++) {
      const isLast = i === installments - 1;
      const totalMes = isLast ? +(amountTotal - acumuladoParcelas).toFixed(2) : baseParcela;
      acumuladoParcelas += totalMes;

      const mm = somarMes(baseMonthStr, i);

      const linhasMes = await inserirLinhasDoMes(mm, totalMes);

      // se for parcelado, setar contador de parcela em todas as linhas daquele mês
      if (installments > 1) {
        linhasMes.forEach(l => {
          l.installment_current = i + 1;
          l.installments_total = installments;
        });
      }

      rows.push(...linhasMes);
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

  // edição simples: não mexe no split
  document.getElementById("dividirAuto").checked = false;
  Array.from(document.getElementById("terceiros").options).forEach(o => o.selected = false);

  const btnSubmit = document.querySelector("#formLancamento button[type='submit']");
  if (btnSubmit) btnSubmit.textContent = "Salvar edição";
}

async function excluirLancamento(id) {
  const t = transactions.find(x => x.id === id);
  if (!t) return;

  // Se for parte de split, oferecer excluir só esta linha ou todo split (desse mês) ou tudo do parcelamento
  const temSplit = !!t.split_id;
  const temParcelas = !!t.group_id && (t.installments_total || 1) > 1;

  if (!temSplit && !temParcelas) {
    if (!confirm("Excluir este lançamento?")) return;
    const { error } = await sb.from("transactions").delete().eq("id", id);
    if (error) return alert(error.message);
    await carregarTransacoes();
    renderLancamentos();
    atualizarGraficosSeAbaAtiva();
    return;
  }

  // menu de exclusão
  let msg = "Escolha:\n\n";
  msg += "1 = Excluir só esta linha\n";
  if (temSplit) msg += "2 = Excluir TODAS as linhas deste racha (mesmo mês)\n";
  if (temParcelas) msg += "3 = Excluir TODAS as parcelas (todas as linhas)\n";
  msg += "\nCancelar = não excluir";

  const escolha = prompt(msg);

  if (escolha === "1") {
    const { error } = await sb.from("transactions").delete().eq("id", id);
    if (error) return alert(error.message);
  }

  if (escolha === "2" && temSplit) {
    // mesmo racha e mesmo mês
    const { error } = await sb.from("transactions")
      .delete()
      .eq("split_id", t.split_id)
      .eq("month", t.month);
    if (error) return alert(error.message);
  }

  if (escolha === "3" && temParcelas) {
    const { error } = await sb.from("transactions")
      .delete()
      .eq("group_id", t.group_id);
    if (error) return alert(error.message);
  }

  await carregarTransacoes();
  renderLancamentos();
  atualizarGraficosSeAbaAtiva();
}

/* ================== GRÁFICOS ================== */
function atualizarGraficosSeAbaAtiva() {
  if (document.getElementById("graficos")?.classList.contains("ativa")) atualizarGraficos();
}

function atualizarGraficos() {
  const lista = transactions;

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

  const gastosBank = {};
  baseFiltrada.forEach(t => {
    if (t.type !== "saida") return;
    const nome = banks.find(b => b.id === t.bank_id)?.name || "Sem banco";
    gastosBank[nome] = (gastosBank[nome] || 0) + Number(t.amount);
  });
  const bankLabels = Object.keys(gastosBank);
  const bankValues = bankLabels.map(k => +gastosBank[k].toFixed(2));

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

  chartMensal = new Chart(el, { type: "bar", data, options: { responsive: true, plugins: { legend: { position: "top" } } } });
}

function renderChartCategorias(labels, values) {
  const el = document.getElementById("graficoCategorias");
  if (!el || !window.Chart) return;

  const data = { labels, datasets: [{ label: "Gastos por categoria", data: values }] };

  if (chartCategorias) { chartCategorias.data = data; chartCategorias.update(); return; }

  chartCategorias = new Chart(el, { type: "doughnut", data, options: { responsive: true, plugins: { legend: { position: "right" } } } });
}

function renderChartBancos(labels, values) {
  const el = document.getElementById("graficoBancos");
  if (!el || !window.Chart) return;

  const data = { labels, datasets: [{ label: "Gastos por banco", data: values }] };

  if (chartBancos) { chartBancos.data = data; chartBancos.update(); return; }

  chartBancos = new Chart(el, { type: "doughnut", data, options: { responsive: true, plugins: { legend: { position: "right" } } } });
}

function renderChartSaldo(labels, values) {
  const el = document.getElementById("graficoSaldo");
  if (!el || !window.Chart) return;

  const data = { labels, datasets: [{ label: "Saldo acumulado", data: values, tension: 0.25 }] };

  if (chartSaldo) { chartSaldo.data = data; chartSaldo.update(); return; }

  chartSaldo = new Chart(el, { type: "line", data, options: { responsive: true, plugins: { legend: { position: "top" } } } });
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

window.editarTerceiro = editarTerceiro;
window.removerTerceiro = removerTerceiro;
