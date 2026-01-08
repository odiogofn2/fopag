let categorias = JSON.parse(localStorage.getItem("categorias")) || [
  "Alimentação", "Moradia", "Transporte", "Lazer", "Saúde", "Educação"
];

let pagamentos = JSON.parse(localStorage.getItem("pagamentos")) || [
  "Cartão de Crédito", "Cartão de Débito", "Pix", "Dinheiro"
];

const categoriaEl = () => document.getElementById("categoria");
const pagamentoEl = () => document.getElementById("pagamento");

/* ===== ABAS ===== */
function abrirAba(id, btn) {
  document.querySelectorAll(".aba").forEach(a => a.classList.remove("ativa"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("ativo"));
  document.getElementById(id).classList.add("ativa");
  btn.classList.add("ativo");
}

/* ===== CATEGORIAS ===== */
function renderCategorias() {
  categoriaEl().innerHTML = `<option value="">Categoria</option>`;
  const ul = document.getElementById("listaCategorias");
  ul.innerHTML = "";

  categorias.forEach((c, i) => {
    categoriaEl().innerHTML += `<option>${c}</option>`;
    ul.innerHTML += `<li>${c}<button onclick="removerCategoria(${i})">✕</button></li>`;
  });

  localStorage.setItem("categorias", JSON.stringify(categorias));
}

function addCategoria() {
  const v = document.getElementById("novaCategoria").value.trim();
  if (!v || categorias.includes(v)) return;
  categorias.push(v);
  document.getElementById("novaCategoria").value = "";
  renderCategorias();
}

function removerCategoria(i) {
  if (!confirm("Excluir categoria?")) return;
  categorias.splice(i, 1);
  renderCategorias();
}

/* ===== PAGAMENTOS ===== */
function renderPagamentos() {
  pagamentoEl().innerHTML = `<option value="">Forma de pagamento</option>`;
  const ul = document.getElementById("listaPagamentos");
  ul.innerHTML = "";

  pagamentos.forEach((p, i) => {
    pagamentoEl().innerHTML += `<option>${p}</option>`;
    ul.innerHTML += `<li>${p}<button onclick="removerPagamento(${i})">✕</button></li>`;
  });

  localStorage.setItem("pagamentos", JSON.stringify(pagamentos));
}

function addPagamento() {
  const v = document.getElementById("novoPagamento").value.trim();
  if (!v || pagamentos.includes(v)) return;
  pagamentos.push(v);
  document.getElementById("novoPagamento").value = "";
  renderPagamentos();
}

function removerPagamento(i) {
  if (!confirm("Excluir forma de pagamento?")) return;
  pagamentos.splice(i, 1);
  renderPagamentos();
}

/* ===== INIT ===== */
renderCategorias();
renderPagamentos();
