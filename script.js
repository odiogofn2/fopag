/* ================== SUPABASE CONFIG ================== */
const SUPABASE_URL = "https://fwzdxtpkirkyygzoezjx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3emR4dHBraXJreXlnem9lemp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4OTE3MjcsImV4cCI6MjA4MzQ2NzcyN30.JhZaeArVoReH150Z6seCKu8AM1qw9PeZayLfTtfJqIQ";

window.__sb = window.__sb || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const sb = window.__sb;

/* ================== APP CONFIG ================== */
/**
 * Para o Supabase funcionar:
 * - Inclua no index.html (antes do script.js):
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *
 * Tabelas esperadas:
 * - cfg_categorias (nome text UNIQUE)
 * - cfg_pagamentos (nome text UNIQUE)
 * - cfg_pessoas (nome text UNIQUE)
 * - lancamentos (id, tipo, valor, parcelas, local, banco, pessoa, categoria, pagamento, mes)
 */

const TABLES = {
  categorias: "cfg_categorias",
  pagamentos: "cfg_pagamentos",
  pessoas: "cfg_pessoas",
  lancamentos: "lancamentos",
};

// Fallback localStorage (se Supabase falhar)
const STORAGE = {
  lancamentos: "lancamentos",
  categorias: "categorias",
  pagamentos: "pagamentos",
  pessoas: "pessoas",
};

let editId = null;
let useSupabase = true; // se der erro, cai para false

/* ================== INIT ================== */
document.addEventListener("DOMContentLoaded", async () => {
  configurarAbas();

  // garante defaults no local storage (fallback)
  iniciarListasLocal();

  // tenta usar Supabase (se falhar, fica no localStorage)
  await testarSupabase();

  // carrega e renderiza
  await renderTudo();

  // listeners de botões de config
  wireConfigButtons();

  // listener salvar lançamento
  wireFormLancamento();
});

/* ================== UTIL ================== */
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
  // aceita "5,99", "5.99", "1.234,56"
  const v = String(valor).trim();
  const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
  if (isNaN(n)) throw "Valor inválido";
  return n;
}

function gerarId() {
  // id numérico simples
  return Date.now();
}

/* ================== ABAS ================== */
function configurarAbas() {
  const tabs = document.querySelectorAll(".tabs button");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".aba").forEach((a) => a.classList.remove("ativa"));

      btn.classList.add("active");
      const alvo = btn.dataset.aba;
      document.getElementById(alvo).classList.add("ativa");
    });
  });
}

/* ================== STORAGE HELPERS (local) ================== */
const getLocal = (k) => JSON.parse(localStorage.getItem(k)) || [];
const setLocal = (k, v) => localStorage.setItem(k, JSON.stringify(v));

function iniciarListasLocal() {
  if (!localStorage.getItem(STORAGE.categorias)) {
    setLocal(STORAGE.categorias, ["Alimentação", "Moradia", "Transporte", "Lazer"]);
  }
  if (!localStorage.getItem(STORAGE.pagamentos)) {
    setLocal(STORAGE.pagamentos, ["Cartão de Crédito", "Cartão de Débito", "Pix", "Dinheiro"]);
  }
  if (!localStorage.getItem(STORAGE.pessoas)) {
    setLocal(STORAGE.pessoas, ["Só eu"]);
  }
  if (!localStorage.getItem(STORAGE.lancamentos)) {
    setLocal(STORAGE.lancamentos, []);
  }
}

/* ================== SUPABASE SAFE MODE ================== */
async function testarSupabase() {
  try {
    // teste simples: tenta ler 1 linha de categorias
    const { error } = await sb.from(TABLES.categorias).select("nome").limit(1);
    if (error) throw error;
    useSupabase = true;
  } catch (e) {
    console.warn("Supabase indisponível ou tabela não existe. Usando localStorage.", e);
    useSupabase = false;
  }
}

/* ================== DATA ACCESS (Supabase ou Local) ================== */
async function listConfig(tableKey) {
  if (!useSupabase) {
    if (tableKey === "categorias") return getLocal(STORAGE.categorias);
    if (tableKey === "pagamentos") return getLocal(STORAGE.pagamentos);
    if (tableKey === "pessoas") return getLocal(STORAGE.pessoas);
    return [];
  }

  const table = TABLES[tableKey];
  const { data, error } = await sb.from(table).select("nome").order("nome", { ascending: true });
  if (error) throw error;
  return (data || []).map((x) => x.nome);
}

async function addConfig(tableKey, nome) {
  const nomeLimpo = String(nome || "").trim();
  if (!nomeLimpo) throw "Informe um nome válido";

  if (!useSupabase) {
    const key = STORAGE[tableKey];
    const lista = getLocal(key);
    if (lista.includes(nomeLimpo)) throw "Já existe";
    lista.push(nomeLimpo);
    setLocal(key, lista);
    return;
  }

  const table = TABLES[tableKey];
  const { error } = await sb.from(table).insert([{ nome: nomeLimpo }]);
  if (error) throw error;
}

async function delConfig(tableKey, nome) {
  const nomeLimpo = String(nome || "").trim();
  if (!nomeLimpo) return;

  if (!useSupabase) {
    const key = STORAGE[tableKey];
    const lista = getLocal(key).filter((x) => x !== nomeLimpo);
    setLocal(key, lista);
    return;
  }

  const table = TABLES[tableKey];
  const { error } = await sb.from(table).delete().eq("nome", nomeLimpo);
  if (error) throw error;
}

async function listLancamentos() {
  if (!useSupabase) return getLocal(STORAGE.lancamentos);

  const { data, error } = await sb
    .from(TABLES.lancamentos)
    .select("*")
    .order("id", { ascending: false });

  if (error) throw error;

  // normaliza
  return (data || []).map((l) => ({
    id: l.id,
    tipo: l.tipo,
    valor: Number(l.valor) || 0,
    parcelas: Number(l.parcelas) || 1,
    local: l.local || "",
    banco: l.banco || "",
    pessoa: l.pessoa || "Só eu",
    categoria: l.categoria || "",
    pagamento: l.pagamento || "",
    mes: l.mes || "",
  }));
}

async function upsertLancamento(l) {
  if (!useSupabase) {
    let lista = getLocal(STORAGE.lancamentos);
    const idx = lista.findIndex((x) => x.id === l.id);
    if (idx >= 0) lista[idx] = l;
    else lista.push(l);
    setLocal(STORAGE.lancamentos, lista);
    return;
  }

  // IMPORTANT: Se seu 'id' no Supabase for bigint, isso ok.
  // Se for uuid, troque gerarId() para uuid.
  const { error } = await sb.from(TABLES.lancamentos).upsert(l, { onConflict: "id" });
  if (error) throw error;
}

async function deleteLancamento(id) {
  if (!useSupabase) {
    const lista = getLocal(STORAGE.lancamentos).filter((l) => l.id !== id);
    setLocal(STORAGE.lancamentos, lista);
    return;
  }
  const { error } = await sb.from(TABLES.lancamentos).delete().eq("id", id);
  if (error) throw error;
}

/* ================== UI RENDER ================== */
async function renderTudo() {
  await renderCategorias();
  await renderPagamentos();
  await renderPessoas();
  await renderLancamentos();
  await renderRelatorioMensal();
}

async function renderCategorias() {
  const categorias = await safe(async () => await listConfig("categorias"), getLocal(STORAGE.categorias));
  const ul = document.getElementById("listaCategorias");
  const select = document.getElementById("categoria");

  ul.innerHTML = "";
  select.innerHTML = '<option value="">Categoria</option>';

  categorias.forEach((c) => {
    ul.innerHTML += `
      <li>
        ${escapeHtml(c)}
        <button type="button" data-delcat="${escapeHtml(c)}">x</button>
      </li>`;
    select.innerHTML += `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`;
  });

  // bind delete buttons
  ul.querySelectorAll("button[data-delcat]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const nome = btn.getAttribute("data-delcat");
      if (!confirm("Excluir categoria?")) return;
      await safe(async () => await delConfig("categorias", nome), null);
      await renderTudo();
    });
  });
}

async function renderPagamentos() {
  const pagamentos = await safe(async () => await listConfig("pagamentos"), getLocal(STORAGE.pagamentos));
  const ul = document.getElementById("listaPagamentos");
  const select = document.getElementById("pagamento");

  ul.innerHTML = "";
  select.innerHTML = '<option value="">Forma de pagamento</option>';

  pagamentos.forEach((p) => {
    ul.innerHTML += `
      <li>
        ${escapeHtml(p)}
        <button type="button" data-delpag="${escapeHtml(p)}">x</button>
      </li>`;
    select.innerHTML += `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`;
  });

  ul.querySelectorAll("button[data-delpag]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const nome = btn.getAttribute("data-delpag");
      if (!confirm("Excluir forma de pagamento?")) return;
      await safe(async () => await delConfig("pagamentos", nome), null);
      await renderTudo();
    });
  });
}

async function renderPessoas() {
  let pessoas = await safe(async () => await listConfig("pessoas"), getLocal(STORAGE.pessoas));
  // garante "Só eu"
  if (!pessoas.includes("Só eu")) pessoas = ["Só eu", ...pessoas];

  const ul = document.getElementById("listaPessoas");
  const select = document.getElementById("pessoa");

  ul.innerHTML = "";
  select.innerHTML = "";

  pessoas.forEach((p) => {
    const podeRemover = p !== "Só eu";
    ul.innerHTML += `
      <li>
        ${escapeHtml(p)}
        ${
          podeRemover
            ? `<button type="button" data-delpessoa="${escapeHtml(p)}">x</button>`
            : `<span style="opacity:.6;">fixo</span>`
        }
      </li>`;
    select.innerHTML += `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`;
  });

  // default
  if (!select.value) select.value = "Só eu";

  ul.querySelectorAll("button[data-delpessoa]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const nome = btn.getAttribute("data-delpessoa");
      if (!confirm("Excluir pessoa?")) return;
      await safe(async () => await delConfig("pessoas", nome), null);
      await renderTudo();
    });
  });
}

async function renderLancamentos() {
  const lista = await safe(async () => await listLancamentos(), getLocal(STORAGE.lancamentos));
  const ul = document.getElementById("listaLancamentos");
  ul.innerHTML = "";

  let entradas = 0;
  let saidas = 0;

  lista.forEach((l) => {
    const tipo = String(l.tipo || "").toUpperCase();
    const valorTxt = brl(l.valor);
    const parcelasTxt = (Number(l.parcelas) || 1) > 1 ? ` | ${l.parcelas}x` : "";

    ul.innerHTML += `
      <li>
        ${escapeHtml(tipo)} | ${valorTxt}
        | ${escapeHtml(l.pessoa || "Só eu")}
        | ${escapeHtml(l.pagamento || "")}
        | ${escapeHtml(l.banco || "")}
        | ${escapeHtml(l.categoria || "")}
        ${parcelasTxt}
        <button type="button" data-edit="${l.id}">✏️</button>
        <button type="button" data-del="${l.id}">🗑</button>
      </li>
    `;

    if (l.tipo === "entrada") entradas += Number(l.valor) || 0;
    else saidas += Number(l.valor) || 0;
  });

  document.getElementById("totalEntradas").innerText = `Entradas: ${brl(entradas)}`;
  document.getElementById("totalSaidas").innerText = `Saídas: ${brl(saidas)}`;
  document.getElementById("saldo").innerText = `Saldo: ${brl(entradas - saidas)}`;

  // bind edit/delete
  ul.querySelectorAll("button[data-edit]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-edit"));
      const item = lista.find((x) => Number(x.id) === id);
      if (!item) return;
      editId = id;

      document.getElementById("tipo").value = item.tipo || "";
      document.getElementById("valor").value = String(item.valor ?? "").replace(".", ",");
      document.getElementById("parcelas").value = item.parcelas || 1;
      document.getElementById("local").value = item.local || "";
      document.getElementById("banco").value = item.banco || "";
      document.getElementById("pessoa").value = item.pessoa || "Só eu";
      document.getElementById("categoria").value = item.categoria || "";
      document.getElementById("pagamento").value = item.pagamento || "";
      document.getElementById("mes").value = item.mes || "";
    });
  });

  ul.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-del"));
      if (!confirm("Excluir este lançamento?")) return;
      await safe(async () => await deleteLancamento(id), null);
      await renderTudo();
    });
  });
}

/* ================== RELATÓRIO MENSAL POR PESSOA ================== */
async function renderRelatorioMensal() {
  const container = document.getElementById("relatorioMensal");
  if (!container) return;

  const lista = await safe(async () => await listLancamentos(), getLocal(STORAGE.lancamentos));

  const mesRef = (document.getElementById("mes")?.value || "").trim() || mesAtualYYYYMM();

  const lanc = lista.filter((l) => String(l.mes || "") === mesRef);

  if (lanc.length === 0) {
    container.innerHTML = `<div style="opacity:.75;">Sem lançamentos para ${escapeHtml(mesRef)}.</div>`;
    return;
  }

  const agg = {}; // pessoa -> { entradas, saidas, porPagamento, porBanco, porCategoria }

  function ensure(pessoa) {
    if (!agg[pessoa]) {
      agg[pessoa] = { entradas: 0, saidas: 0, porPagamento: {}, porBanco: {}, porCategoria: {} };
    }
    return agg[pessoa];
  }

  function addMap(map, key, valor) {
    if (!map[key]) map[key] = 0;
    map[key] += valor;
  }

  for (const l of lanc) {
    const pessoa = l.pessoa || "Só eu";
    const pagamento = l.pagamento || "Não informado";
    const banco = l.banco || "Não informado";
    const categoria = l.categoria || "Não informado";
    const valor = Number(l.valor) || 0;

    const o = ensure(pessoa);

    if (l.tipo === "entrada") o.entradas += valor;
    else o.saidas += valor;

    // você pediu "por forma de pagamento, banco, categoria" por mês/pessoa
    // aqui soma tudo; se quiser somente SAÍDAS nesses agrupamentos, eu ajusto.
    addMap(o.porPagamento, pagamento, valor);
    addMap(o.porBanco, banco, valor);
    addMap(o.porCategoria, categoria, valor);
  }

  const pessoas = Object.keys(agg).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const bloco = pessoas.map((pessoa) => {
    const r = agg[pessoa];

    const listaTop = (objMap) =>
      Object.entries(objMap)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `<li>${escapeHtml(k)}: <strong>${brl(v)}</strong></li>`)
        .join("") || `<li style="opacity:.75;">(vazio)</li>`;

    return `
      <div style="border:1px solid #e5e7eb; border-radius:10px; padding:12px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <div style="font-weight:700;">${escapeHtml(pessoa)}</div>
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
    ${bloco}
  `;
}

function mesAtualYYYYMM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* ================== EVENTS ================== */
function wireConfigButtons() {
  const btnAddCategoria = document.getElementById("btnAddCategoria");
  const btnAddPagamento = document.getElementById("btnAddPagamento");
  const btnAddPessoa = document.getElementById("btnAddPessoa");

  if (btnAddCategoria) {
    btnAddCategoria.addEventListener("click", async () => {
      const input = document.getElementById("novaCategoria");
      const v = (input?.value || "").trim();
      if (!v) return alert("Informe a categoria");
      await safe(async () => await addConfig("categorias", v), null);
      if (input) input.value = "";
      await renderTudo();
    });
  }

  if (btnAddPagamento) {
    btnAddPagamento.addEventListener("click", async () => {
      const input = document.getElementById("novoPagamento");
      const v = (input?.value || "").trim();
      if (!v) return alert("Informe a forma de pagamento");
      await safe(async () => await addConfig("pagamentos", v), null);
      if (input) input.value = "";
      await renderTudo();
    });
  }

  if (btnAddPessoa) {
    btnAddPessoa.addEventListener("click", async () => {
      const input = document.getElementById("novaPessoa");
      const v = (input?.value || "").trim();
      if (!v) return alert("Informe a pessoa");
      if (v === "Só eu") return alert('"Só eu" já existe e é fixo.');

      await safe(async () => await addConfig("pessoas", v), null);
      if (input) input.value = "";
      await renderTudo();
    });
  }
}

function wireFormLancamento() {
  const form = document.getElementById("formLancamento");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const tipo = document.getElementById("tipo").value;
      const valor = parseValor(document.getElementById("valor").value);
      const parcelas = Math.max(1, parseInt(document.getElementById("parcelas").value) || 1);
      const local = (document.getElementById("local").value || "").trim();
      const banco = (document.getElementById("banco").value || "").trim();
      const pessoa = document.getElementById("pessoa").value;
      const categoria = document.getElementById("categoria").value;
      const pagamento = document.getElementById("pagamento").value;
      const mes = document.getElementById("mes").value;

      if (!tipo || !local || !banco || !pessoa || !categoria || !pagamento || !mes) {
        alert("Preencha todos os campos.");
        return;
      }

      const lanc = {
        id: editId ?? gerarId(),
        tipo,
        valor,
        parcelas,
        local,
        banco,
        pessoa,
        categoria,
        pagamento,
        mes,
      };

      await safe(async () => await upsertLancamento(lanc), null);

      editId = null;
      form.reset();
      document.getElementById("parcelas").value = 1;
      document.getElementById("pessoa").value = "Só eu";

      await renderTudo();
    } catch (err) {
      alert(err);
    }
  });
}

/* ================== SAFE WRAPPER ================== */
async function safe(fn, fallbackValue) {
  try {
    return await fn();
  } catch (e) {
    console.warn("Falha (usando fallback se possível):", e);

    // se falhar supabase, desliga e segue no local
    if (useSupabase) {
      useSupabase = false;
      console.warn("Supabase desativado para esta sessão. Continuando com localStorage.");
    }
    return fallbackValue;
  }
}
