/* ================== STORAGE ================== */
const STORAGE = {
  lancamentos: 'lancamentos',
  categorias: 'categorias',
  pagamentos: 'pagamentos'
};

let editId = null;

/* ================== INIT ================== */
document.addEventListener('DOMContentLoaded', () => {
  iniciarListas();
  renderCategorias();
  renderPagamentos();
  renderLancamentos();
  configurarAbas();
});

/* ================== UTIL ================== */
const get = key => JSON.parse(localStorage.getItem(key)) || [];
const set = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const gerarId = () => Date.now() + Math.floor(Math.random() * 1000);

function parseValor(valor) {
  // aceita 5,99 ou 5.99 e também 1.234,56
  const v = String(valor).trim();
  if (!v) throw 'Informe o valor';
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
  if (isNaN(n) || n <= 0) throw 'Valor inválido';
  return n;
}

function normalizarMes(yyyyMm) {
  // garante formato YYYY-MM
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) throw 'Selecione o mês';
  return yyyyMm;
}

function somarMes(yyyyMm, offset) {
  const [y, m] = yyyyMm.split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}`;
}

/* ================== ABAS ================== */
function configurarAbas() {
  const tabs = document.querySelectorAll('.tabs button');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.aba').forEach(a => a.classList.remove('ativa'));

      btn.classList.add('active');
      const alvo = btn.dataset.aba || (btn.getAttribute('onclick')?.includes('configuracoes') ? 'configuracoes' : 'lancamentos');
      const id = btn.dataset.aba ? btn.dataset.aba : btn.getAttribute('onclick')?.includes('configuracoes') ? 'configuracoes' : 'lancamentos';
      document.getElementById(id).classList.add('ativa');
    });
  });
}

/* ================== LISTAS PADRÃO ================== */
function iniciarListas() {
  if (!localStorage.getItem(STORAGE.categorias)) {
    set(STORAGE.categorias, ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Outros']);
  }
  if (!localStorage.getItem(STORAGE.pagamentos)) {
    set(STORAGE.pagamentos, ['Cartão de Crédito', 'Cartão de Débito', 'Pix', 'Dinheiro']);
  }
}

/* ================== CATEGORIAS (CRUD simples) ================== */
function renderCategorias() {
  const categorias = get(STORAGE.categorias);
  const ul = document.getElementById('listaCategorias');
  const select = document.getElementById('categoria');

  ul.innerHTML = '';
  select.innerHTML = '<option value="">Categoria</option>';

  categorias.forEach((c, i) => {
    ul.innerHTML += `
      <li>
        ${c}
        <button type="button" onclick="editarCategoria(${i})">✎</button>
        <button type="button" onclick="removerCategoria(${i})">✕</button>
      </li>`;
    select.innerHTML += `<option>${c}</option>`;
  });

  set(STORAGE.categorias, categorias);
}

document.getElementById('btnAddCategoria').onclick = () => {
  const input = document.getElementById('novaCategoria');
  const v = input.value.trim();
  if (!v) return alert('Informe a categoria');

  const categorias = get(STORAGE.categorias);
  if (categorias.includes(v)) return alert('Essa categoria já existe');

  categorias.push(v);
  set(STORAGE.categorias, categorias);
  input.value = '';
  renderCategorias();
};

function editarCategoria(i) {
  const categorias = get(STORAGE.categorias);
  const atual = categorias[i];
  const novo = prompt('Editar categoria:', atual);
  if (!novo) return;

  const v = novo.trim();
  if (!v) return;

  if (categorias.includes(v) && v !== atual) return alert('Já existe uma categoria com esse nome.');

  // Atualiza também nos lançamentos existentes
  const lanc = get(STORAGE.lancamentos).map(l => l.categoria === atual ? { ...l, categoria: v } : l);

  categorias[i] = v;
  set(STORAGE.categorias, categorias);
  set(STORAGE.lancamentos, lanc);

  renderCategorias();
  renderLancamentos();
}

function removerCategoria(i) {
  const categorias = get(STORAGE.categorias);
  const nome = categorias[i];

  const lanc = get(STORAGE.lancamentos);
  const emUso = lanc.some(l => l.categoria === nome);
  if (emUso) {
    const ok = confirm(`A categoria "${nome}" está em uso em lançamentos. Excluir mesmo assim? (os lançamentos ficarão com categoria vazia)`);
    if (!ok) return;
  }

  categorias.splice(i, 1);
  set(STORAGE.categorias, categorias);

  if (emUso) {
    const atualizados = lanc.map(l => l.categoria === nome ? { ...l, categoria: '' } : l);
    set(STORAGE.lancamentos, atualizados);
  }

  renderCategorias();
  renderLancamentos();
}

/* ================== PAGAMENTOS (CRUD simples) ================== */
function renderPagamentos() {
  const pagamentos = get(STORAGE.pagamentos);
  const ul = document.getElementById('listaPagamentos');
  const select = document.getElementById('pagamento');

  ul.innerHTML = '';
  select.innerHTML = '<option value="">Forma de pagamento</option>';

  pagamentos.forEach((p, i) => {
    ul.innerHTML += `
      <li>
        ${p}
        <button type="button" onclick="editarPagamento(${i})">✎</button>
        <button type="button" onclick="removerPagamento(${i})">✕</button>
      </li>`;
    select.innerHTML += `<option>${p}</option>`;
  });

  set(STORAGE.pagamentos, pagamentos);
}

document.getElementById('btnAddPagamento').onclick = () => {
  const input = document.getElementById('novoPagamento');
  const v = input.value.trim();
  if (!v) return alert('Informe a forma de pagamento');

  const pagamentos = get(STORAGE.pagamentos);
  if (pagamentos.includes(v)) return alert('Essa forma de pagamento já existe');

  pagamentos.push(v);
  set(STORAGE.pagamentos, pagamentos);
  input.value = '';
  renderPagamentos();
};

function editarPagamento(i) {
  const pagamentos = get(STORAGE.pagamentos);
  const atual = pagamentos[i];
  const novo = prompt('Editar forma de pagamento:', atual);
  if (!novo) return;

  const v = novo.trim();
  if (!v) return;

  if (pagamentos.includes(v) && v !== atual) return alert('Já existe uma forma de pagamento com esse nome.');

  // Atualiza também nos lançamentos existentes
  const lanc = get(STORAGE.lancamentos).map(l => l.pagamento === atual ? { ...l, pagamento: v } : l);

  pagamentos[i] = v;
  set(STORAGE.pagamentos, pagamentos);
  set(STORAGE.lancamentos, lanc);

  renderPagamentos();
  renderLancamentos();
}

function removerPagamento(i) {
  const pagamentos = get(STORAGE.pagamentos);
  const nome = pagamentos[i];

  const lanc = get(STORAGE.lancamentos);
  const emUso = lanc.some(l => l.pagamento === nome);
  if (emUso) {
    const ok = confirm(`"${nome}" está em uso em lançamentos. Excluir mesmo assim? (os lançamentos ficarão com pagamento vazio)`);
    if (!ok) return;
  }

  pagamentos.splice(i, 1);
  set(STORAGE.pagamentos, pagamentos);

  if (emUso) {
    const atualizados = lanc.map(l => l.pagamento === nome ? { ...l, pagamento: '' } : l);
    set(STORAGE.lancamentos, atualizados);
  }

  renderPagamentos();
  renderLancamentos();
}

/* ================== LANCAMENTOS ================== */
document.getElementById('formLancamento').addEventListener('submit', (e) => {
  e.preventDefault();

  try {
    const tipo = document.getElementById('tipo').value;
    const valorTotal = parseValor(document.getElementById('valor').value);
    const local = document.getElementById('local').value.trim();
    const categoria = document.getElementById('categoria').value;
    const pagamento = document.getElementById('pagamento').value;
    const mesBase = normalizarMes(document.getElementById('mes').value);

    let qtdParcelas = parseInt(document.getElementById('parcelas').value, 10);
    if (isNaN(qtdParcelas) || qtdParcelas < 1) qtdParcelas = 1;

    if (!tipo) throw 'Selecione o tipo';
    if (!local) throw 'Informe o local/descrição';
    if (!categoria) throw 'Selecione a categoria';
    if (!pagamento) throw 'Selecione a forma de pagamento';

    let lista = get(STORAGE.lancamentos);

    // Se estiver editando, só permite editar UMA parcela (registro)
    if (editId) {
      lista = lista.map(l => {
        if (l.id !== editId) return l;
        return {
          ...l,
          tipo,
          valor: valorTotal, // edição direta altera valor desta parcela
          local,
          categoria,
          pagamento,
          mes: mesBase
        };
      });

      set(STORAGE.lancamentos, lista);
      editId = null;
      e.target.reset();
      document.getElementById('parcelas').value = 1;
      renderLancamentos();
      return;
    }

    // NOVO lançamento: se qtdParcelas > 1, gera N registros (um por mês)
    const grupoId = qtdParcelas > 1 ? gerarId() : null;

    // Distribui valor igualmente (arredonda para 2 casas) e ajusta última parcela
    const valorParcelaBase = +(valorTotal / qtdParcelas).toFixed(2);
    let acumulado = 0;

    for (let i = 0; i < qtdParcelas; i++) {
      const isUltima = i === qtdParcelas - 1;
      const valorParcela = isUltima
        ? +(valorTotal - acumulado).toFixed(2)
        : valorParcelaBase;

      acumulado += valorParcela;

      lista.push({
        id: gerarId() + i,
        grupoId,
        tipo,
        valor: valorParcela,
        local,
        categoria,
        pagamento,
        mes: somarMes(mesBase, i),
        parcelaAtual: qtdParcelas > 1 ? (i + 1) : 1,
        totalParcelas: qtdParcelas
      });
    }

    set(STORAGE.lancamentos, lista);

    e.target.reset();
    document.getElementById('parcelas').value = 1;

    renderLancamentos();

  } catch (err) {
    alert(err);
  }
});

function renderLancamentos() {
  const lista = get(STORAGE.lancamentos);
  const ul = document.getElementById('listaLancamentos');
  ul.innerHTML = '';

  let entradas = 0;
  let saidas = 0;

  // ordena por mês (e por parcela)
  const ordenada = [...lista].sort((a, b) => {
    if (a.mes === b.mes) return (a.parcelaAtual || 1) - (b.parcelaAtual || 1);
    return a.mes.localeCompare(b.mes);
  });

  ordenada.forEach(l => {
    ul.innerHTML += `
      <li>
        ${l.tipo.toUpperCase()} | ${l.mes} | R$ ${l.valor.toFixed(2)}
        | ${l.categoria} | ${l.pagamento}
        ${l.totalParcelas > 1 ? `| ${l.parcelaAtual}/${l.totalParcelas}` : ''}
        <button type="button" onclick="editarLancamento(${l.id})">✏️</button>
        <button type="button" onclick="excluirLancamento(${l.id})">🗑</button>
      </li>
    `;

    if (l.tipo === 'entrada') entradas += l.valor;
    else saidas += l.valor;
  });

  document.getElementById('totalEntradas').innerText = `Entradas: R$ ${entradas.toFixed(2)}`;
  document.getElementById('totalSaidas').innerText = `Saídas: R$ ${saidas.toFixed(2)}`;
  document.getElementById('saldo').innerText = `Saldo: R$ ${(entradas - saidas).toFixed(2)}`;
}

function editarLancamento(id) {
  const l = get(STORAGE.lancamentos).find(x => x.id === id);
  if (!l) return;

  editId = id;

  document.getElementById('tipo').value = l.tipo;
  document.getElementById('valor').value = l.valor.toFixed(2).replace('.', ',');
  document.getElementById('parcelas').value = 1; // edição altera só esta parcela
  document.getElementById('local').value = l.local;
  document.getElementById('categoria').value = l.categoria;
  document.getElementById('pagamento').value = l.pagamento;
  document.getElementById('mes').value = l.mes;
}

function excluirLancamento(id) {
  const lista = get(STORAGE.lancamentos);
  const l = lista.find(x => x.id === id);
  if (!l) return;

  // à vista
  if (!l.grupoId) {
    if (!confirm('Excluir este lançamento?')) return;
    const nova = lista.filter(x => x.id !== id);
    set(STORAGE.lancamentos, nova);
    renderLancamentos();
    return;
  }

  // parcelado: perguntar 1 ou todas
  const escolha = prompt(
    'Lançamento parcelado.\n\n' +
    '1 = Excluir só esta parcela\n' +
    '2 = Excluir TODAS as parcelas\n\n' +
    'Cancelar = não excluir'
  );

  if (escolha === '1') {
    const nova = lista.filter(x => x.id !== id);
    set(STORAGE.lancamentos, nova);
    renderLancamentos();
    return;
  }

  if (escolha === '2') {
    const nova = lista.filter(x => x.grupoId !== l.grupoId);
    set(STORAGE.lancamentos, nova);
    renderLancamentos();
    return;
  }

  // qualquer outra coisa: cancela
}

/* ===== Expor funções globais usadas em onclick ===== */
window.editarLancamento = editarLancamento;
window.excluirLancamento = excluirLancamento;
window.removerCategoria = removerCategoria;
window.editarCategoria = editarCategoria;
window.removerPagamento = removerPagamento;
window.editarPagamento = editarPagamento;

/* ================== INIT RENDER ================== */
renderCategorias();
renderPagamentos();
renderLancamentos();
