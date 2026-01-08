let lancamentos = JSON.parse(localStorage.getItem("lancamentos")) || [];
let categorias = JSON.parse(localStorage.getItem("categorias")) || [];
let editandoId = null;

const msg = document.getElementById("mensagem");

if (categorias.length === 0) {
  categorias = [
    { id: gerarId(), nome: "Alimentação" },
    { id: gerarId(), nome: "Transporte" },
    { id: gerarId(), nome: "Moradia" },
    { id: gerarId(), nome: "Lazer" },
    { id: gerarId(), nome: "Outros" }
  ];
  salvarCategorias();
}

document.getElementById("parcelado").addEventListener("change", e => {
  document.getElementById("qtdParcelas").disabled = e.target.value !== "sim";
});

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function mostrarMensagem(t) {
  msg.textContent = t;
  setTimeout(() => msg.textContent = "", 3000);
}

/* ================= CATEGORIAS ================= */

function abrirCategorias() {
  document.getElementById("modalCategorias").style.display = "flex";
  renderizarCategorias();
}

function fecharCategorias() {
  document.getElementById("modalCategorias").style.display = "none";
}

function adicionarCategoria() {
  const nome = document.getElementById("novaCategoria").value.trim();
  if (!nome) return;
  categorias.push({ id: gerarId(), nome });
  salvarCategorias();
  document.getElementById("novaCategoria").value = "";
  renderizarCategorias();
  renderizarSelectCategorias();
}

function editarCategoria(id) {
  const c = categorias.find(x => x.id === id);
  const novo = prompt("Editar categoria:", c.nome);
  if (!novo) return;
  c.nome = novo;
  salvarCategorias();
  renderizarCategorias();
  renderizarSelectCategorias();
}

function excluirCategoria(id) {
  if (!confirm("Excluir categoria?")) return;
  categorias = categorias.filter(c => c.id !== id);
  salvarCategorias();
  renderizarCategorias();
  renderizarSelectCategorias();
}

function salvarCategorias() {
  localStorage.setItem("categorias", JSON.stringify(categorias));
}

function renderizarCategorias() {
  const ul = document.getElementById("listaCategorias");
  ul.innerHTML = "";
  categorias.forEach(c => {
    ul.innerHTML += `
      <li>
        <span>${c.nome}</span>
        <div>
          <button onclick="editarCategoria('${c.id}')">✏️</button>
          <button onclick="excluirCategoria('${c.id}')">🗑️</button>
        </div>
      </li>
    `;
  });
}

function renderizarSelectCategorias() {
  const sel = document.getElementById("categoria");
  sel.innerHTML = `<option value="">Categoria</option>`;
  categorias.forEach(c => {
    sel.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
  });
}

/* ================= LANÇAMENTOS ================= */

function salvarLancamento() {
  const tipo = tipoEl().value;
  const valorTotal = parseFloat(valorEl().value.replace(",", "."));
  const local = localEl().value;
  const categoriaId = categoriaEl().value;
  const parcelado = document.getElementById("parcelado").value;
  const qtdParcelas = parseInt(document.getElementById("qtdParcelas").value) || 1;

  if (!tipo || !local || !categoriaId || isNaN(valorTotal) || valorTotal <= 0) {
    mostrarMensagem("Preencha todos os campos corretamente.");
    return;
  }

  if (parcelado === "nao" || qtdParcelas === 1) {
    lancamentos.push({
      id: gerarId(),
      grupo: null,
      tipo,
      valor: valorTotal,
      local,
      categoriaId,
      parcelaAtual: 1,
      totalParcelas: 1,
      data: new Date().toISOString()
    });
  } else {
    const grupo = gerarId();
    const valorParcela = +(valorTotal / qtdParcelas).toFixed(2);

    for (let i = 0; i < qtdParcelas; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() + i);

      lancamentos.push({
        id: gerarId(),
        grupo,
        tipo,
        valor: valorParcela,
        local,
        categoriaId,
        parcelaAtual: i + 1,
        totalParcelas: qtdParcelas,
        data: d.toISOString()
      });
    }
  }

  salvarLancamentos();
  limparFormulario();
  renderizar();
}

function excluir(id) {
  const l = lancamentos.find(x => x.id === id);
  if (!l) return;

  if (!l.grupo) {
    if (!confirm("Excluir lançamento?")) return;
    lancamentos = lancamentos.filter(x => x.id !== id);
  } else {
    const op = prompt("1 = Somente esta parcela\n2 = Todas as parcelas");
    if (op === "1") lancamentos = lancamentos.filter(x => x.id !== id);
    else if (op === "2") lancamentos = lancamentos.filter(x => x.grupo !== l.grupo);
    else return;
  }

  salvarLancamentos();
  renderizar();
}

function limparFormulario() {
  editandoId = null;
  tipoEl().value = "";
  valorEl().value = "";
  localEl().value = "";
  categoriaEl().value = "";
  document.getElementById("parcelado").value = "nao";
  document.getElementById("qtdParcelas").value = "";
  document.getElementById("qtdParcelas").disabled = true;
}

function salvarLancamentos() {
  localStorage.setItem("lancamentos", JSON.stringify(lancamentos));
}

function renderizar() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  let ent = 0, sai = 0;

  lancamentos.forEach(l => {
    l.tipo === "entrada" ? ent += l.valor : sai += l.valor;
    const cat = categorias.find(c => c.id === l.categoriaId)?.nome || "";

    lista.innerHTML += `
      <li>
        <div>
          <div>${l.local} (${cat})</div>
          <div class="valor ${l.tipo}">R$ ${l.valor.toFixed(2)}</div>
        </div>
        <div>
          <button onclick="excluir('${l.id}')">🗑️</button>
        </div>
      </li>
    `;
  });

  document.getElementById("totalEntradas").textContent = `R$ ${ent.toFixed(2)}`;
  document.getElementById("totalSaidas").textContent = `R$ ${sai.toFixed(2)}`;
  document.getElementById("saldo").textContent = `R$ ${(ent - sai).toFixed(2)}`;
}

/* HELPERS */
const tipoEl = () => document.getElementById("tipo");
const valorEl = () => document.getElementById("valor");
const localEl = () => document.getElementById("local");
const categoriaEl = () => document.getElementById("categoria");

renderizarSelectCategorias();
renderizar();
