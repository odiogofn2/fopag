let lancamentos = JSON.parse(localStorage.getItem("lancamentos")) || [];
let editandoId = null;

const msg = document.getElementById("mensagem");

document.getElementById("parcelado").addEventListener("change", e => {
  document.getElementById("qtdParcelas").disabled = e.target.value !== "sim";
});

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function mostrarMensagem(texto) {
  msg.textContent = texto;
  setTimeout(() => msg.textContent = "", 3000);
}

function salvarLancamento() {
  const tipo = tipoEl().value;
  const valor = parseFloat(valorEl().value.replace(",", "."));
  const local = localEl().value;

  if (!tipo || isNaN(valor) || valor <= 0 || !local) {
    mostrarMensagem("Preencha todos os campos corretamente.");
    return;
  }

  const dados = {
    id: editandoId || gerarId(),
    tipo,
    valor,
    local
  };

  if (editandoId) {
    lancamentos = lancamentos.map(l => l.id === editandoId ? dados : l);
  } else {
    lancamentos.push(dados);
  }

  salvarStorage();
  limparFormulario();
  renderizar();
}

function editar(id) {
  const l = lancamentos.find(x => x.id === id);
  if (!l) return;

  editandoId = id;
  tipoEl().value = l.tipo;
  valorEl().value = l.valor;
  localEl().value = l.local;
}

function excluir(id) {
  if (!confirm("Excluir lançamento?")) return;
  lancamentos = lancamentos.filter(l => l.id !== id);
  salvarStorage();
  renderizar();
}

function cancelarEdicao() {
  limparFormulario();
}

function limparFormulario() {
  editandoId = null;
  tipoEl().value = "";
  valorEl().value = "";
  localEl().value = "";
}

function salvarStorage() {
  localStorage.setItem("lancamentos", JSON.stringify(lancamentos));
}

function renderizar() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  let entradas = 0, saidas = 0;

  lancamentos.forEach(l => {
    l.tipo === "entrada" ? entradas += l.valor : saidas += l.valor;

    lista.innerHTML += `
      <li>
        <div class="info">
          <div>${l.local}</div>
          <div class="valor ${l.tipo}">R$ ${l.valor.toFixed(2)}</div>
        </div>
        <div>
          <button onclick="editar('${l.id}')">✏️</button>
          <button onclick="excluir('${l.id}')">🗑️</button>
        </div>
      </li>
    `;
  });

  document.getElementById("totalEntradas").textContent = `R$ ${entradas.toFixed(2)}`;
  document.getElementById("totalSaidas").textContent = `R$ ${saidas.toFixed(2)}`;
  document.getElementById("saldo").textContent = `R$ ${(entradas - saidas).toFixed(2)}`;
}

const tipoEl = () => document.getElementById("tipo");
const valorEl = () => document.getElementById("valor");
const localEl = () => document.getElementById("local");

renderizar();
