/* ================== SUPABASE CONFIG ================== */
const SUPABASE_URL = "https://fwzdxtpkirkyygzoezjx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3emR4dHBraXJreXlnem9lemp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4OTE3MjcsImV4cCI6MjA4MzQ2NzcyN30.JhZaeArVoReH150Z6seCKu8AM1qw9PeZayLfTtfJqIQ";

window.__sb = window.__sb || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const sb = window.__sb;

/* ================== TABELAS ================== */
const T = {
  banks: "banks",
  categories: "categories",
  payment_methods: "payment_methods",
  third_parties: "third_parties",
  transactions: "transactions",
};

/* ================== ESTADO ================== */
let currentUser = null;
let editTxId = null;
let editTxMeta = null; // { group_id, installment_current, installments_total }
let appEventsWired = false;

/* ================== INIT ================== */
document.addEventListener("DOMContentLoaded", async () => {
  configurarAbas();
  wireAuthButtons();

  // sessão automática
  const { data } = await sb.auth.getSession();
  if (data?.session?.user) {
    currentUser = data.session.user;
    await enterApp();
  }
});

/* ================== HELPERS ================== */
function $(id) { return document.getElementById(id); }

function showAuthMsg(msg) {
  const el = $("authMsg");
  if (el) el.textContent = msg || "";
}

function setViews(isLogged) {
  $("authView").style.display = isLogged ? "none" : "block";
  $("appView").style.display = isLogged ? "block" : "none";
}

function brl(n) {
  return (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseValor(valor) {
  // aceita 5,99 e 5.99 e 1.234,56
  const v = String(valor || "").trim();
  const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
  if (isNaN(n)) throw new Error("Valor inválido.");
  return n;
}

function monthInputToDateFirstDay(yyyyMM) {
  if (!/^\d{4}-\d{2}$/.test(String(yyyyMM || ""))) throw new Error("Mês inválido.");
  return `${yyyyMM}-01`;
}

function dateToYYYYMM(dateStr) {
  if (!dateStr) return "";
  return String(dateStr).slice(0, 7);
}

function addMonthsToYYYYMM01(dateYYYYMM01, addMonths) {
  const [y, m] = String(dateYYYYMM01).split("-").map(Number);
  const d = new Date(y, (m - 1) + addMonths, 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}-01`;
}

function uuid() {
  return crypto.randomUUID();
}

/* ================== ABAS ================== */
function configurarAbas() {
  const tabs = document.querySelectorAll(".tabs button");
  tabs.forEach((btn) => {
    btn.addEventListener("click", async () => {
      tabs.forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".aba").forEach((a) => a.classList.remove("ativa"));

      btn.classList.add("active");
      const target = document.getElementById(btn.dataset.aba);
      target.classList.add("ativa");

      if (btn.dataset.aba === "resumo" && currentUser) {
        await renderResumoTab();
      }
    });
  });
}

/* ================== AUTH ================== */
function wireAuthButtons() {
  $("btnLogin")?.addEventListener("click", async () => {
    try {
      showAuthMsg("Autenticando...");
      const email = ($("email").value || "").trim();
      const password = $("senha").value || "";

      if (!email || !password) {
        showAuthMsg("Informe email e senha.");
        return;
      }

      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;

      currentUser = data.user;
      showAuthMsg("");
      await enterApp();
    } catch (e) {
      console.error(e);
      showAuthMsg(e?.message || "Falha no login.");
    }
  });

  $("btnLogout")?.addEventListener("click", async () => {
    await sb.auth.signOut();
    currentUser = null;
    editTxId = null;
    editTxMeta = null;
    setViews(false);
    showAuthMsg("Você saiu.");
  });
}

async function enterApp() {
  const { data } = await sb.auth.getUser();
  currentUser = data?.user || currentUser;

  if (!currentUser) {
    setViews(false);
    return;
  }

  $("userBadge").textContent = `Logado: ${currentUser.email || currentUser.id}`;
  setViews(true);

  wireAppEvents();
  await renderTudo();
}

/* ================== DB ACCESS ================== */
async function listSimple(table) {
  const { data, error } = await sb.from(table).select("id,name").order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function insertSimple(table, name) {
  const v = String(name || "").trim();
  if (!v) throw new Error("Informe um nome válido.");
  const payload = { id: uuid(), user_id: currentUser.id, name: v };
  const { error } = await sb.from(table).insert([payload]);
  if (error) throw error;
}

async function deleteSimple(table, id) {
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) throw error;
}

async function listTransactions() {
  const { data, error } = await sb
    .from(T.transactions)
    .select(`
      id,
      group_id,
      type,
      amount,
      description,
      month,
      installment_current,
      installments_total,
      bank_id,
      category_id,
      payment_method_id,
      third_party_id,
      is_self,
      banks:bank_id ( id, name ),
      categories:category_id ( id, name ),
      payment_methods:payment_method_id ( id, name ),
      third_parties:third_party_id ( id, name )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(t => ({
    id: t.id,
    group_id: t.group_id,
    type: t.type,
    amount: Number(t.amount) || 0,
    description: t.description || "",
    month: t.month, // date
    installment_current: Number(t.installment_current) || 1,
    installments_total: Number(t.installments_total) || 1,
    bank_id: t.bank_id,
    category_id: t.category_id,
    payment_method_id: t.payment_method_id,
    third_party_id: t.third_party_id,
    is_self: !!t.is_self,
    bank_name: t.banks?.name || "Não informado",
    category_name: t.categories?.name || "Não informado",
    payment_name: t.payment_methods?.name || "Não informado",
    person_name: t.is_self ? "Só eu" : (t.third_parties?.name || "Terceiro"),
  }));
}

async function upsertManyTransactions(rows) {
  const { error } = await sb.from(T.transactions).upsert(rows);
  if (error) throw error;
}

async function deleteTransaction(id) {
  const { error } = await sb.from(T.transactions).delete().eq("id", id);
  if (error) throw error;
}

async function deleteTransactionsByGroup(group_id) {
  const { error } = await sb.from(T.transactions).delete().eq("group_id", group_id);
  if (error) throw error;
}

/* ================== RENDER TUDO ================== */
async function renderTudo() {
  await Promise.all([
    renderBancos(),
    renderCategorias(),
    renderPagamentos(),
    renderPessoas(),
  ]);

  await renderLancamentos();

  // se estiver na aba resumo, atualiza também
  const resumoAtivo = document.getElementById("resumo")?.classList.contains("ativa");
  if (resumoAtivo) await renderResumoTab();
}

/* ================== RENDER CONFIG + SELECTS ================== */
async function renderBancos() {
  const bancos = await listSimple(T.banks);

  const sel = $("banco");
  sel.innerHTML = `<option value="">Banco</option>`;
  bancos.forEach(b => (sel.innerHTML += `<option value="${b.id}">${escapeHtml(b.name)}</option>`));

  const ul = $("listaBancos");
  ul.innerHTML = "";
  bancos.forEach(b => {
    ul.innerHTML += `
      <li>
        ${escapeHtml(b.name)}
        <button type="button" data-delbank="${b.id}">x</button>
      </li>`;
  });

  ul.querySelectorAll("button[data-delbank]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delbank");
      if (!confirm("Excluir banco?")) return;
      await deleteSimple(T.banks, id);
      await renderTudo();
    });
  });
}

async function renderCategorias() {
  const cats = await listSimple(T.categories);

  const sel = $("categoria");
  sel.innerHTML = `<option value="">Categoria</option>`;
  cats.forEach(c => (sel.innerHTML += `<option value="${c.id}">${escapeHtml(c.name)}</option>`));

  const ul = $("listaCategorias");
  ul.innerHTML = "";
  cats.forEach(c => {
    ul.innerHTML += `
      <li>
        ${escapeHtml(c.name)}
        <button type="button" data-delcat="${c.id}">x</button>
      </li>`;
  });

  ul.querySelectorAll("button[data-delcat]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delcat");
      if (!confirm("Excluir categoria?")) return;
      await deleteSimple(T.categories, id);
      await renderTudo();
    });
  });
}

async function renderPagamentos() {
  const pays = await listSimple(T.payment_methods);

  const sel = $("pagamento");
  sel.innerHTML = `<option value="">Forma de pagamento</option>`;
  pays.forEach(p => (sel.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)}</option>`));

  const ul = $("listaPagamentos");
  ul.innerHTML = "";
  pays.forEach(p => {
    ul.innerHTML += `
      <li>
        ${escapeHtml(p.name)}
        <button type="button" data-delpay="${p.id}">x</button>
      </li>`;
  });

  ul.querySelectorAll("button[data-delpay]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delpay");
      if (!confirm("Excluir forma de pagamento?")) return;
      await deleteSimple(T.payment_methods, id);
      await renderTudo();
    });
  });
}

async function renderPessoas() {
  const people = await listSimple(T.third_parties);

  const sel = $("pessoa");
  sel.innerHTML = `<option value="__self__">Só eu</option>`;
  people.forEach(p => (sel.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)}</option>`));

  const ul = $("listaPessoas");
  ul.innerHTML = `<li>Só eu <span style="opacity:.6;">fixo</span></li>`;
  people.forEach(p => {
    ul.innerHTML += `
      <li>
        ${escapeHtml(p.name)}
        <button type="button" data-delperson="${p.id}">x</button>
      </li>`;
  });

  ul.querySelectorAll("button[data-delperson]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delperson");
      if (!confirm("Excluir pessoa?")) return;
      await deleteSimple(T.third_parties, id);
      await renderTudo();
    });
  });
}

/* ================== EVENTS ================== */
function wireAppEvents() {
  if (appEventsWired) return;
  appEventsWired = true;

  $("btnAddBanco")?.addEventListener("click", async () => {
    const v = ($("novoBanco").value || "").trim();
    if (!v) return alert("Informe o banco.");
    await insertSimple(T.banks, v);
    $("novoBanco").value = "";
    await renderTudo();
  });

  $("btnAddCategoria")?.addEventListener("click", async () => {
    const v = ($("novaCategoria").value || "").trim();
    if (!v) return alert("Informe a categoria.");
    await insertSimple(T.categories, v);
    $("novaCategoria").value = "";
    await renderTudo();
  });

  $("btnAddPagamento")?.addEventListener("click", async () => {
    const v = ($("novoPagamento").value || "").trim();
    if (!v) return alert("Informe a forma de pagamento.");
    await insertSimple(T.payment_methods, v);
    $("novoPagamento").value = "";
    await renderTudo();
  });

  $("btnAddPessoa")?.addEventListener("click", async () => {
    const v = ($("novaPessoa").value || "").trim();
    if (!v) return alert("Informe a pessoa.");
    await insertSimple(T.third_parties, v);
    $("novaPessoa").value = "";
    await renderTudo();
  });

  $("btnAtualizarResumo")?.addEventListener("click", async () => {
    await renderResumoTab();
  });

  $("resumoPessoaSelect")?.addEventListener("change", async () => {
    await renderResumoPessoaTabela();
  });

  $("formLancamento")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const type = $("tipo").value;
      const amount = parseValor($("valor").value);
      const installmentsTotalInput = Math.max(1, parseInt($("parcelas").value || "1", 10) || 1);
      const description = ($("descricao").value || "").trim();
      const monthFirstDay = monthInputToDateFirstDay($("mes").value);

      const bank_id = $("banco").value || null;
      const category_id = $("categoria").value || null;
      const payment_method_id = $("pagamento").value || null;

      const pessoaVal = $("pessoa").value;
      const is_self = pessoaVal === "__self__";
      const third_party_id = is_self ? null : pessoaVal;

      if (!type || !description || !monthFirstDay || !bank_id || !category_id || !payment_method_id) {
        alert("Preencha todos os campos.");
        return;
      }

      // ===== EDITAR (somente a linha selecionada) =====
      if (editTxId) {
        const keepCurrent = editTxMeta?.installment_current ?? 1;
        const keepTotal = editTxMeta?.installments_total ?? installmentsTotalInput;
        const keepGroup = editTxMeta?.group_id ?? null;

        const payload = {
          id: editTxId,
          user_id: currentUser.id,
          group_id: keepGroup,
          type,
          amount,
          description,
          month: monthFirstDay,
          bank_id,
          category_id,
          payment_method_id,
          is_self,
          third_party_id,
          installment_current: keepCurrent,
          installments_total: keepTotal,
        };

        await upsertManyTransactions([payload]);

        // reset edição
        editTxId = null;
        editTxMeta = null;
        $("parcelas").disabled = false;

        $("formLancamento").reset();
        $("parcelas").value = 1;

        await renderLancamentos();
        const resumoAtivo = document.getElementById("resumo")?.classList.contains("ativa");
        if (resumoAtivo) await renderResumoTab();
        return;
      }

      // ===== NOVO (parcelas reais) =====
      const installmentsTotal = installmentsTotalInput;
      const group_id = installmentsTotal > 1 ? uuid() : null;

      const rows = [];
      for (let i = 1; i <= installmentsTotal; i++) {
        rows.push({
          id: uuid(),
          user_id: currentUser.id,
          group_id,
          type,
          amount,
          description,
          month: addMonthsToYYYYMM01(monthFirstDay, i - 1),
          installment_current: i,
          installments_total: installmentsTotal,
          bank_id,
          category_id,
          payment_method_id,
          is_self,
          third_party_id,
        });
      }

      await upsertManyTransactions(rows);

      $("formLancamento").reset();
      $("parcelas").value = 1;

      await renderLancamentos();
      const resumoAtivo = document.getElementById("resumo")?.classList.contains("ativa");
      if (resumoAtivo) await renderResumoTab();

    } catch (err) {
      console.error(err);
      alert(err.message || String(err));
    }
  });
}

/* ================== LANÇAMENTOS (COMPLETO) ================== */
async function renderLancamentos() {
  const lista = await listTransactions();
  const ul = $("listaLancamentos");
  ul.innerHTML = "";

  let entradas = 0;
  let saidas = 0;

  lista.forEach(t => {
    const parcelasTxt = (t.installments_total || 1) > 1
      ? ` | ${t.installment_current}/${t.installments_total}`
      : "";

    ul.innerHTML += `
      <li>
        ${escapeHtml(String(t.type || "").toUpperCase())} | ${brl(t.amount)}
        | ${escapeHtml(t.person_name)}
        | ${escapeHtml(t.payment_name)}
        | ${escapeHtml(t.bank_name)}
        | ${escapeHtml(t.category_name)}
        ${parcelasTxt}
        <button type="button" data-edit="${t.id}">✏️</button>
        <button type="button"
          data-del="${t.id}"
          data-group="${t.group_id || ""}"
          data-total="${t.installments_total || 1}">🗑</button>
      </li>
    `;

    if (t.type === "entrada") entradas += t.amount;
    else saidas += t.amount;
  });

  $("totalEntradas").innerText = `Entradas: ${brl(entradas)}`;
  $("totalSaidas").innerText = `Saídas: ${brl(saidas)}`;
  $("saldo").innerText = `Saldo: ${brl(entradas - saidas)}`;

  // ===== EXCLUIR =====
  ul.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      const group = btn.getAttribute("data-group") || "";
      const total = parseInt(btn.getAttribute("data-total") || "1", 10) || 1;

      if (group && total > 1) {
        const resp = prompt('Excluir "uma" parcela ou "todas" do grupo? (digite: uma / todas)');
        if (!resp) return;
        const r = resp.trim().toLowerCase();

        if (r === "todas") {
          if (!confirm("Confirma excluir TODAS as parcelas do grupo?")) return;
          await deleteTransactionsByGroup(group);
        } else if (r === "uma") {
          if (!confirm("Confirma excluir SOMENTE esta parcela?")) return;
          await deleteTransaction(id);
        } else {
          alert('Resposta inválida. Digite "uma" ou "todas".');
          return;
        }
      } else {
        if (!confirm("Excluir este lançamento?")) return;
        await deleteTransaction(id);
      }

      // se estava editando algo que foi apagado, reseta
      if (editTxId === id) {
        editTxId = null;
        editTxMeta = null;
        $("parcelas").disabled = false;
        $("formLancamento").reset();
        $("parcelas").value = 1;
      }

      await renderLancamentos();
      const resumoAtivo = document.getElementById("resumo")?.classList.contains("ativa");
      if (resumoAtivo) await renderResumoTab();
    });
  });

  // ===== EDITAR =====
  ul.querySelectorAll("button[data-edit]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-edit");
      const item = lista.find(x => x.id === id);
      if (!item) return;

      editTxId = id;
      editTxMeta = {
        group_id: item.group_id || null,
        installment_current: item.installment_current || 1,
        installments_total: item.installments_total || 1,
      };

      $("tipo").value = item.type || "";
      $("valor").value = String(item.amount ?? "").replace(".", ",");
      $("descricao").value = item.description || "";
      $("mes").value = dateToYYYYMM(item.month);

      $("banco").value = item.bank_id || "";
      $("categoria").value = item.category_id || "";
      $("pagamento").value = item.payment_method_id || "";

      $("pessoa").value = item.is_self ? "__self__" : (item.third_party_id || "__self__");

      // parcelas: mostra o total mas bloqueia para não quebrar o grupo
      $("parcelas").value = item.installments_total || 1;
      $("parcelas").disabled = true;
    });
  });
}

/* ================== RESUMO TAB ================== */
async function renderResumoTab() {
  await renderResumoTabelaGeral();
  await renderResumoPessoaSelect();
  await renderResumoPessoaTabela();
}

/* ======= TABELA 1: MÊS x PESSOA (SALDO) ======= */
async function renderResumoTabelaGeral() {
  const container = $("resumoTabela");
  const tx = await listTransactions();

  if (!tx.length) {
    container.innerHTML = `<div style="opacity:.75;">Sem lançamentos cadastrados.</div>`;
    return;
  }

  // Pessoas (colunas)
  const pessoasSet = new Set(["Só eu"]);
  tx.forEach(t => pessoasSet.add(t.person_name || "Só eu"));
  const pessoas = Array.from(pessoasSet).sort((a, b) => a.localeCompare(b, "pt-BR"));

  // Meses (linhas)
  const mesesSet = new Set();
  tx.forEach(t => mesesSet.add(dateToYYYYMM(t.month)));
  const meses = Array.from(mesesSet).sort();

  const pivot = {};
  for (const mes of meses) pivot[mes] = {};

  for (const t of tx) {
    const mes = dateToYYYYMM(t.month);
    const pessoa = t.person_name || "Só eu";
    const signed = (t.type === "entrada") ? t.amount : -t.amount; // saldo
    pivot[mes][pessoa] = (pivot[mes][pessoa] || 0) + signed;
  }

  const ths = [`<th style="text-align:left; padding:8px; border-bottom:1px solid #e5e7eb;">Mês</th>`]
    .concat(pessoas.map(p => `<th style="text-align:right; padding:8px; border-bottom:1px solid #e5e7eb;">${escapeHtml(p)}</th>`))
    .join("");

  const rows = meses.map(mes => {
    const tds = pessoas.map(p => {
      const val = pivot[mes][p] || 0;
      return `<td style="text-align:right; padding:8px; border-bottom:1px solid #f1f5f9;">${brl(val)}</td>`;
    }).join("");

    return `
      <tr>
        <td style="text-align:left; padding:8px; border-bottom:1px solid #f1f5f9;"><strong>${escapeHtml(mes)}</strong></td>
        ${tds}
      </tr>`;
  }).join("");

  container.innerHTML = `
    <div style="overflow:auto;">
      <table style="width:100%; border-collapse:collapse;">
        <thead><tr>${ths}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/* ======= SELECT: PESSOAS (para Tabela 2) ======= */
async function renderResumoPessoaSelect() {
  const sel = $("resumoPessoaSelect");
  if (!sel) return;

  const tx = await listTransactions();
  const pessoasSet = new Set(["Só eu"]);
  tx.forEach(t => pessoasSet.add(t.person_name || "Só eu"));
  const pessoas = Array.from(pessoasSet).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const current = sel.value || pessoas[0] || "Só eu";

  sel.innerHTML = "";
  pessoas.forEach(p => {
    sel.innerHTML += `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`;
  });

  const opt = Array.from(sel.options).find(o => o.value === current);
  if (opt) sel.value = current;
}

/* ======= TABELA 2: (PESSOA) MÊS x PAGAMENTO (APENAS SAÍDAS) ======= */
async function renderResumoPessoaTabela() {
  const container = $("resumoPessoaTabela");
  const sel = $("resumoPessoaSelect");
  if (!container || !sel) return;

  const pessoaEscolhida = sel.value || "Só eu";
  const tx = await listTransactions();

  const filtrados = tx.filter(t => {
    const pessoa = t.person_name || "Só eu";
    return pessoa === pessoaEscolhida && t.type === "saida";
  });

  if (!filtrados.length) {
    container.innerHTML = `<div style="opacity:.75;">Sem gastos (saídas) para ${escapeHtml(pessoaEscolhida)}.</div>`;
    return;
  }

  // colunas: formas de pagamento
  const paySet = new Set();
  filtrados.forEach(t => paySet.add(t.payment_name || "Não informado"));
  const pays = Array.from(paySet).sort((a, b) => a.localeCompare(b, "pt-BR"));

  // linhas: meses
  const mesesSet = new Set();
  filtrados.forEach(t => mesesSet.add(dateToYYYYMM(t.month)));
  const meses = Array.from(mesesSet).sort();

  const pivot = {};
  meses.forEach(m => pivot[m] = {});
  for (const t of filtrados) {
    const mes = dateToYYYYMM(t.month);
    const pay = t.payment_name || "Não informado";
    pivot[mes][pay] = (pivot[mes][pay] || 0) + t.amount;
  }

  const ths = [`<th style="text-align:left; padding:8px; border-bottom:1px solid #e5e7eb;">Mês</th>`]
    .concat(pays.map(p => `<th style="text-align:right; padding:8px; border-bottom:1px solid #e5e7eb;">${escapeHtml(p)}</th>`))
    .join("");

  const rows = meses.map(mes => {
    const tds = pays.map(p => {
      const val = pivot[mes][p] || 0;
      return `<td style="text-align:right; padding:8px; border-bottom:1px solid #f1f5f9;">${brl(val)}</td>`;
    }).join("");

    return `
      <tr>
        <td style="text-align:left; padding:8px; border-bottom:1px solid #f1f5f9;"><strong>${escapeHtml(mes)}</strong></td>
        ${tds}
      </tr>`;
  }).join("");

  container.innerHTML = `
    <div style="margin-bottom:10px; opacity:.85;">
      Pessoa: <strong>${escapeHtml(pessoaEscolhida)}</strong> — Gastos por mês x forma de pagamento
    </div>
    <div style="overflow:auto;">
      <table style="width:100%; border-collapse:collapse;">
        <thead><tr>${ths}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
