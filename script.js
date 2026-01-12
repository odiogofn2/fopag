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

/* ================== INIT ================== */
document.addEventListener("DOMContentLoaded", async () => {
  configurarAbas();
  wireAuthButtons();

  // Se já tiver sessão, entra direto
  const { data } = await sb.auth.getSession();
  if (data?.session?.user) {
    currentUser = data.session.user;
    await enterApp();
  }
});

/* ================== UI HELPERS ================== */
function $(id) { return document.getElementById(id); }

function showAuthMsg(msg) {
  const el = $("authMsg");
  if (!el) return;
  el.textContent = msg || "";
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
  return `${yyyyMM}-01`; // date
}

function dateToYYYYMM(dateStr) {
  if (!dateStr) return "";
  return String(dateStr).slice(0, 7);
}

function addMonthsToYYYYMM01(dateYYYYMM01, addMonths) {
  // recebe "YYYY-MM-01" -> devolve "YYYY-MM-01" com meses incrementados
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
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".aba").forEach((a) => a.classList.remove("ativa"));

      btn.classList.add("active");
      document.getElementById(btn.dataset.aba).classList.add("ativa");
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
    setViews(false);
    showAuthMsg("Você saiu.");
  });
}

async function enterApp() {
  // garante user
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

/* ================== DATA ACCESS (OWN via RLS) ================== */
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
  // upsert em lote
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
  await renderRelatorioMensal();
}

/* ================== RENDER CONFIG + SELECTS ================== */
async function renderBancos() {
  const bancos = await listSimple(T.banks);

  // config list
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

  // select
  const sel = $("banco");
  sel.innerHTML = `<option value="">Banco</option>`;
  bancos.forEach(b => (sel.innerHTML += `<option value="${b.id}">${escapeHtml(b.name)}</option>`));
}

async function renderCategorias() {
  const cats = await listSimple(T.categories);

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

  const sel = $("categoria");
  sel.innerHTML = `<option value="">Categoria</option>`;
  cats.forEach(c => (sel.innerHTML += `<option value="${c.id}">${escapeHtml(c.name)}</option>`));
}

async function renderPagamentos() {
  const pays = await listSimple(T.payment_methods);

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

  const sel = $("pagamento");
  sel.innerHTML = `<option value="">Forma de pagamento</option>`;
  pays.forEach(p => (sel.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)}</option>`));
}

async function renderPessoas() {
  const people = await listSimple(T.third_parties);

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

  const sel = $("pessoa");
  sel.innerHTML = `<option value="__self__">Só eu</option>`;
  people.forEach(p => (sel.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)}</option>`));
}

/* ================== APP EVENTS ================== */
let appEventsWired = false;
function wireAppEvents() {
  if (appEventsWired) return;
  appEventsWired = true;

  $("btnAddBanco").addEventListener("click", async () => {
    try {
      const v = ($("novoBanco").value || "").trim();
      if (!v) return alert("Informe o banco.");
      await insertSimple(T.banks, v);
      $("novoBanco").value = "";
      await renderTudo();
    } catch (e) { alert(e.message || String(e)); }
  });

  $("btnAddCategoria").addEventListener("click", async () => {
    try {
      const v = ($("novaCategoria").value || "").trim();
      if (!v) return alert("Informe a categoria.");
      await insertSimple(T.categories, v);
      $("novaCategoria").value = "";
      await renderTudo();
    } catch (e) { alert(e.message || String(e)); }
  });

  $("btnAddPagamento").addEventListener("click", async () => {
    try {
      const v = ($("novoPagamento").value || "").trim();
      if (!v) return alert("Informe a forma de pagamento.");
      await insertSimple(T.payment_methods, v);
      $("novoPagamento").value = "";
      await renderTudo();
    } catch (e) { alert(e.message || String(e)); }
  });

  $("btnAddPessoa").addEventListener("click", async () => {
    try {
      const v = ($("novaPessoa").value || "").trim();
      if (!v) return alert("Informe a pessoa.");
      await insertSimple(T.third_parties, v);
      $("novaPessoa").value = "";
      await renderTudo();
    } catch (e) { alert(e.message || String(e)); }
  });

  $("formLancamento").addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const type = $("tipo").value;
      const amount = parseValor($("valor").value);
      const installmentsTotal = Math.max(1, parseInt($("parcelas").value || "1", 10) || 1);
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

      // EDITAR: edita apenas a linha (parcela) selecionada
      if (editTxId) {
        const payload = {
          id: editTxId,
          user_id: currentUser.id,
          type,
          amount,
          description,
          month: monthFirstDay,
          bank_id,
          category_id,
          payment_method_id,
          is_self,
          third_party_id,
          // mantém parcelas coerentes na linha editada
          installment_current: 1,
          installments_total: installmentsTotal,
        };

        // Observação: se você editar uma parcela antiga (ex: 3/10), eu mantenho current/total real na render (abaixo).
        // Aqui estamos simplificando: editar vira “uma linha” com 1/total.
        // Se quiser editar preservando 3/10, eu ajusto com base no item atual.
        await upsertManyTransactions([payload]);

        editTxId = null;
        $("formLancamento").reset();
        $("parcelas").value = 1;

        await renderLancamentos();
        await renderRelatorioMensal();
        return;
      }

      // NOVO: cria parcelas reais usando group_id
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
      await renderRelatorioMensal();

    } catch (err) {
      console.error(err);
      alert(err.message || String(err));
    }
  });
}

/* ================== LANCAMENTOS LIST + EDIT/DELETE ================== */
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
        <button type="button" data-del="${t.id}" data-group="${t.group_id || ""}" data-total="${t.installments_total || 1}">🗑</button>
      </li>
    `;

    if (t.type === "entrada") entradas += t.amount;
    else saidas += t.amount;
  });

  $("totalEntradas").innerText = `Entradas: ${brl(entradas)}`;
  $("totalSaidas").innerText = `Saídas: ${brl(saidas)}`;
  $("saldo").innerText = `Saldo: ${brl(entradas - saidas)}`;

  // delete
  ul.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      const group = btn.getAttribute("data-group") || "";
      const total = parseInt(btn.getAttribute("data-total") || "1", 10) || 1;

      // Se for parcelado e tiver group_id, pergunta se exclui 1 ou todas
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

      await renderLancamentos();
      await renderRelatorioMensal();
    });
  });

  // edit
  ul.querySelectorAll("button[data-edit]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-edit");
      const item = lista.find(x => x.id === id);
      if (!item) return;

      editTxId = id;

      $("tipo").value = item.type || "";
      $("valor").value = String(item.amount ?? "").replace(".", ",");
      $("parcelas").value = item.installments_total || 1;
      $("descricao").value = item.description || "";
      $("mes").value = dateToYYYYMM(item.month);

      $("banco").value = item.bank_id || "";
      $("categoria").value = item.category_id || "";
      $("pagamento").value = item.payment_method_id || "";

      $("pessoa").value = item.is_self ? "__self__" : (item.third_party_id || "__self__");
    });
  });
}

/* ================== RELATÓRIO MENSAL ================== */
async function renderRelatorioMensal() {
  const container = $("relatorioMensal");
  const mesRef = ($("mes")?.value || "").trim();
  if (!mesRef) {
    container.innerHTML = `<div style="opacity:.75;">Selecione um mês no formulário para ver o resumo.</div>`;
    return;
  }

  const mesDate = monthInputToDateFirstDay(mesRef);
  const lista = await listTransactions();
  const lanc = lista.filter(t => String(t.month || "") === mesDate);

  if (lanc.length === 0) {
    container.innerHTML = `<div style="opacity:.75;">Sem lançamentos para ${escapeHtml(mesRef)}.</div>`;
    return;
  }

  const agg = {};
  const ensure = (p) => {
    if (!agg[p]) agg[p] = { entradas: 0, saidas: 0, porPagamento: {}, porBanco: {}, porCategoria: {} };
    return agg[p];
  };
  const addMap = (m, k, v) => { m[k] = (m[k] || 0) + v; };

  for (const t of lanc) {
    const pessoa = t.person_name || "Só eu";
    const o = ensure(pessoa);

    if (t.type === "entrada") o.entradas += t.amount;
    else o.saidas += t.amount;

    // agrupando total do mês da pessoa (entrada+saída). Se quiser só SAÍDAS aqui, eu mudo em 1 if.
    addMap(o.porPagamento, t.payment_name || "Não informado", t.amount);
    addMap(o.porBanco, t.bank_name || "Não informado", t.amount);
    addMap(o.porCategoria, t.category_name || "Não informado", t.amount);
  }

  const pessoas = Object.keys(agg).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const listaTop = (objMap) =>
    Object.entries(objMap)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `<li>${escapeHtml(k)}: <strong>${brl(v)}</strong></li>`)
      .join("") || `<li style="opacity:.75;">(vazio)</li>`;

  const blocos = pessoas.map((p) => {
    const r = agg[p];
    return `
      <div style="border:1px solid #e5e7eb; border-radius:10px; padding:12px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <div style="font-weight:700;">${escapeHtml(p)}</div>
          <div style="opacity:.85;">
            Entradas: <strong>${brl(r.entradas)}</strong> |
            Saídas: <strong>${brl(r.saidas)}</strong> |
            Saldo: <strong>${brl(r.entradas - r.saidas)}</strong>
          </div>
        </div>

        <div style="margin-top:10px;">
          <div style="font-weight:600; margin-bottom:6px;">Por forma de pagamento</div>
          <ul style="margin-left:18px;">${listaTop(r.porPagamento)}</ul>
        </div>

        <div style="margin-top:10px;">
          <div style="font-weight:600; margin-bottom:6px;">Por banco</div>
          <ul style="margin-left:18px;">${listaTop(r.porBanco)}</ul>
        </div>

        <div style="margin-top:10px;">
          <div style="font-weight:600; margin-bottom:6px;">Por categoria</div>
          <ul style="margin-left:18px;">${listaTop(r.porCategoria)}</ul>
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div style="margin-bottom:10px; opacity:.8;">
      Mês de referência: <strong>${escapeHtml(mesRef)}</strong>
    </div>
    ${blocos}
  `;
}
