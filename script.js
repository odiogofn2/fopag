let lancamentos = JSON.parse(localStorage.getItem("lancamentos")) || [];
let pagamentos = JSON.parse(localStorage.getItem("pagamentos")) || [
  "Cartão de Crédito",
  "Cartão de Débito",
  "Pix",
  "Dinheiro",
  "Vale Alimentação"
];

let editandoId = null;

const pagamentoEl = () => document.getElementById("pagamento");
const filtroMesEl = () => document.getElementById("filtroMes");

document.getElementById("parcelado").addEventListener("change", e => {
  document.getElementById("qtdParcelas").disabled = !e.target.checked;
});

function mostrarMensagem(msg) {
  const el = document.getElementById("mensagem");
  el.innerText = msg;
  setTimeout(() => el.innerText = "", 3000);
}

/* =====================
   FORMAS DE PAGAMENTO
===================== */

function renderPagamentos() {
  pagamentoEl().innerHTML = `<option value="">Forma de pagamento</option>`;
  pagamentos.forEach(p => {
    pagamentoEl().innerHTML += `<option>${p}</option>`;
  });

  const lista = document.getElementById("listaPagamentos");
  lista.innerHTML = "";

  pagamentos.forEach((p, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${p}
      <button onclick="removerPagamento(${i})">X</button>
    `;
    lista.appendChild(li);
  });

  localStorage.setItem("pagamentos", JSON.stringify(pagamentos));
}

function addPagamento() {
  const val = document.getElementById("novoPagamento").value.trim();
  if (!val || pagamentos.includes(val)) return;
  pagamentos.push(val);
  document.getElementById("novoPagamento").value = "";
  renderPagamentos();
}

function removerPagamento(i) {
  if (!confirm("Excluir forma de pagamento?")) return;
  pagamentos.splice(i, 1);
  renderPagamentos();
}

/* =====================
   LANÇAMENTOS
===================== */

function salvarLancamento() {
  const tipo = document.getElementById("tipo").value;
  const valor = parseFloat(document.getElementById("valor").value.replace(",", "."));
  const local = document.getElementById("local").value;
  const categoria = document.getElementById("categoria").value;
  const pagamento = pagamentoEl().value;

  if (!tipo || isNaN(valor) || valor <= 0 || !local || !categoria || !pagamento) {
    mostrarMensagem("Preencha todos os campos.");
    return;
  }

  const parcelas = document.getElementById("parcelado").checked
    ? Number(document.getElementById("qtdParcelas").value)
    : 1;

  const grupo = parcelas > 1 ? crypto.randomUUID() : null;
  const valorParcela = valor / parcelas;

  for (let i = 1; i <= parcelas; i++) {
    const data = new Date();
    data.setMonth(data.getMonth() + (i - 1));

    lancamentos.push({
      id: crypto.randomUUID(),
      grupo,
      tipo,
      valor: valorParcela,
      local,
      categoria,
      pagamento,
      parcelaAtual: i,
      totalParcelas: parcelas,
      data: data.toISOString()
    });
  }

  salvarStorage();
  renderizar();
}

function renderizar() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  let filtrados = [...lancamentos];
  if (filtroMesEl().value) {
    filtrados = filtrados.filter(l => l.data.slice(0,7) === filtroMesEl().value);
  }

  let ent = 0, sai = 0;

  filtrados.forEach(l => {
    l.tipo === "entrada" ? ent += l.valor : sai += l.valor;

    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${l.tipo} - R$ ${l.valor.toFixed(2)}</strong>
      <div>${l.local} (${l.pagamento})</div>
      <small>${l.categoria}</small>
    `;
    lista.appendChild(li);
  });

  document.getElementById("totalEntradas").innerText = ent.toFixed(2);
  document.getElementById("totalSaidas").innerText = sai.toFixed(2);
  document.getElementById("saldo").innerText = (ent - sai).toFixed(2);
}

function salvarStorage() {
  localStorage.setItem("lancamentos", JSON.stringify(lancamentos));
}

renderPagamentos();
renderizar();
