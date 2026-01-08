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
  const valorTotal = parseFloat(valorEl().value.replace(",", "."));
  const local = localEl().value;
  const parcelado = document.getElementById("parcelado").value;
  const qtdParcelas = parseInt(document.getElementById("qtdParcelas").value) || 1;

  if (!tipo || isNaN(valorTotal) || valorTotal <= 0 || !local) {
    mostrarMensagem("Preencha todos os campos corretamente.");
    return;
  }

  // edição simples (sem parcelamento)
  if (editandoId) {
    lancamentos = lancamentos.map(l =>
      l.id === editandoId
        ? { ...l, tipo, valor: valorTotal, local }
        : l
    );
    salvarStorage();
    limparFormulario();
    renderizar();
    return;
  }

  // À VISTA
  if (parcelado === "nao" || qtdParcelas === 1) {
    lancamentos.push({
      id: gerarId(),
      grupo: null,
      tipo,
      valor: valorTotal,
      local,
      parcelaAtual: 1,
      totalParcelas: 1,
      data: new Date().toISOString()
    });
  }
  // PARCELADO REAL
  else {
    const grupoId = gerarId();
    const valorParcela = +(valorTotal / qtdParcelas).toFixed(2);

    for (let i = 0; i < qtdParcelas; i++) {
      const data = new Date();
      data.setMonth(data.getMonth() + i);

      lancamentos.push({
        id: gerarId(),
        grupo: grupoId,
        tipo,
        valor: valorParcela,
        local,
        parcelaAtual: i + 1,
        totalParcelas: qtdParcelas,
        data: data.toISOString()
      });
    }
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

  document.getElementById("parcelado").value = "nao";
  document.getElementById("qtdParcelas").disabled = true;
}

function excluir(id) {
  if (!confirm("Excluir este lançamento?")) return;
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
  document.getElementById("parcelado").value = "nao";
  document.getElementById("qtdParcelas").value = "";
  document.getElementById("qtdParcelas").disabled = true;
}

function salvarStorage() {
  localStorage.setItem("lancamentos", JSON.stringify(lancamentos));
}

function renderizar() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  let entradas = 0, saidas = 0;

  lancamentos
    .sort((a, b) => new Date(a.data) - new Date(b.data))
    .forEach(l => {
      l.tipo === "entrada" ? entradas += l.valor : saidas += l.valor;

      const parcelaInfo =
        l.totalParcelas > 1
          ? ` (${l.parcelaAtual}/${l.totalParcelas})`
          : "";

      lista.innerHTML += `
        <li>
          <div class="info">
            <div>${l.local}${parcelaInfo}</div>
            <div class="valor ${l.tipo}">
              R$ ${l.valor.toFixed(2)}
            </div>
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
