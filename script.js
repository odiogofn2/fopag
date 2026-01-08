/* ================== STORAGE ================== */
const STORAGE = {
  lancamentos: 'lancamentos',
  categorias: 'categorias',
  pagamentos: 'pagamentos'
};

let editId = null;

/* ================== CHARTS ================== */
let chartMensal = null;      // (1) Entradas x Saídas por mês
let chartCategorias = null;  // (2) Gastos por categoria
let chartSaldo = null;       // (3) Saldo acumulado

/* ================== INIT ================== */
document.addEventListener('DOMContentLoaded', () => {
  iniciarListas();
  configurarAbas();
  configurarFiltroMes();

  renderCategorias();
  renderPagamentos();
  renderLancamentos();
});

/* ================== UTIL ================== */
const get = key => JSON.parse(localStorage.getItem(key)) || [];
const set = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const gerarId = () => Date.now() + Math.floor(Math.random() * 1000);

function parseValor(valor) {
  // aceita 5,99 / 5.99 / 1.234,56
  const v = String(valor).trim();
  if (!v) throw 'Informe o valor';

  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
  if (isNaN(n) || n <= 0) throw 'Valor inválido';

  return n;
}

function normalizarMes(yyyyMm) {
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

function getMesFiltro() {
  const el = document.getElementById('mesFiltro');
  return el ? el.value : '';
}

function mesesOrdenados(lista) {
  const s = new Set(lista.map(l => l.mes).filter(Boolean));
  return Array.from(s).sort((a, b) => a.localeCompare(b));
}

/* ================== ABAS ================== */
function configurarAbas() {
  const tabs = document.querySelectorAll('.tabs button');

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.aba').forEach(a => a.classList.remove('ativa'));

      btn.classList.add('active');
      const id = btn.dataset.aba;
      document.getElementById(id).classList.add('ativa');

      if (id === 'graficos') atualizarGraficos();
    });
  });
}

/* ================== FILTRO MÊS ================== */
function configurarFiltroMes() {
  const el = document.getElementById('mesFiltro');
  if (!el) return;

  // inicia com mês atual se vazio
  if (!el.value) {
    const hoje = new Date();
    const y = hoje.getFullYear();
    const m = String(hoje.getMonth() + 1).padStart(2, '0');
    el.value = `${y}-${m}`;
  }

  el.addEventListener('change', () => {
    renderLancamentos();
    // gráficos podem usar o filtro no gráfico 2
    // só atualiza se estiver na aba gráficos
    if (document.getElementById('graficos').classList.contains('ativa')) {
      atualizarGraficos();
    }
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

/* ================== CATEGORIAS (CRUD) ================== */
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

document.getElementById('btnAddCategoria').addEventListener('click', () => {
  const input = document.getElementById('novaCategoria');
  const v = input.value.trim();
  if (!v) return alert('Informe a categoria');

  const categorias = get(STORAGE.categorias);
  if (categorias.includes(v)) return alert('Essa categoria já existe');

  categorias.push(v);
  set(STORAGE.categorias, categorias);
  input.value = '';
  renderCategorias();
  atualizarGraficosSeAbaAtiva();
});

function editarCategoria(i) {
  const categorias = get(STORAGE.categorias);
  const atual = categorias[i];
  const novo = prompt('Editar categoria:', atual);
  if (!novo) return;

  const v = novo.trim();
  if (!v) return;

  if (categorias.includes(v) && v !== atual) return alert('Já existe uma categoria com esse nome.');

  const lanc = get(STORAGE.lancamentos).map(l => l.categoria === atual ? { ...l, categoria: v } : l);

  categorias[i] = v;
  set(STORAGE.categorias, categorias);
  set(STORAGE.lancamentos, lanc);

  renderCategorias();
  renderLancamentos();
  atualizarGraficosSeAbaAtiva();
}

function removerCategoria(i) {
  const categorias = get(STORAGE.categorias);
  const nome = categorias[i];

  const lanc = get(STORAGE.lancamentos);
  const emUso = lanc.some(l => l.categoria === nome);
  if (emUso) {
    const ok = confirm(`A categoria "${nome}" está em uso. Excluir mesmo assim? (os lançamentos ficarão com categoria vazia)`);
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
  atualizarGraficosSeAbaAtiva();
}

/* ================== PAGAMENTOS (CRUD) ================== */
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

document.getElementById('btnAddPagamento').addEventListener('click', () => {
  const input = document.getElementById('novoPagamento');
  const v = input.value.trim();
  if (!v) return alert('Informe a forma de pagamento');

  const pagamentos = get(STORAGE.pagamentos);
  if (pagamentos.includes(v)) return alert('Essa forma de pagamento já existe');

  pagamentos.push(v);
  set(STORAGE.pagamentos, pagamentos);
  input.value = '';
  renderPagamentos();
  atualizarGraficosSeAbaAtiva();
});

function editarPagamento(i) {
  const pagamentos = get(STORAGE.pagamentos);
  const atual = pagamentos[i];
  const novo = prompt('Editar forma de pagamento:', atual);
  if (!novo) return;

  const v = novo.trim();
  if (!v) return;

  if (pagamentos.includes(v) && v !== atual) return alert('Já existe uma forma de pagamento com esse nome.');

  const lanc = get(STORAGE.lancamentos).map(l => l.pagamento === atual ? { ...l, pagamento: v } : l);

  pagamentos[i] = v;
  set(STORAGE.pagamentos, pagamentos);
  set(STORAGE.lancamentos, lanc);

  renderPagamentos();
  renderLancamentos();
  atualizarGraficosSeAbaAtiva();
}

function removerPagamento(i) {
  const pagamentos = get(STORAGE.pagamentos);
  const nome = pagamentos[i];

  const lanc = get(STORAGE.lancamentos);
  const emUso = lanc.some(l => l.pagamento === nome);
  if (emUso) {
    const ok = confirm(`"${nome}" está em uso. Excluir mesmo assim? (os lançamentos ficarão com pagamento vazio)`);
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
  atualizarGraficosSeAbaAtiva();
}

/* ================== LANCAMENTOS: salvar / editar / excluir ================== */
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

    // editar só este registro
    if (editId) {
      lista = lista.map(l => {
        if (l.id !== editId) return l;
        return { ...l, tipo, valor: valorTotal, local, categoria, pagamento, mes: mesBase };
      });

      set(STORAGE.lancamentos, lista);
      editId = null;

      e.target.reset();
      document.getElementById('parcelas').value = 1;
      renderLancamentos();
      atualizarGraficosSeAbaAtiva();
      return;
    }

    // novo: gera parcelas por mês
    const grupoId = qtdParcelas > 1 ? gerarId() : null;

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
    atualizarGraficosSeAbaAtiva();

  } catch (err) {
    alert(err);
  }
});

function renderLancamentos() {
  const lista = get(STORAGE.lancamentos);
  const ul = document.getElementById('listaLancamentos');
  ul.innerHTML = '';

  const mesFiltro = getMesFiltro();
  const filtrada = mesFiltro ? lista.filter(l => l.mes === mesFiltro) : lista;

  let entradas = 0;
  let saidas = 0;

  const ordenada = [...filtrada].sort((a, b) => {
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
        <button type="button" onclick="excluirLancamento(${l.id})">🗑️</button>
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
  document.getElementById('parcelas').value = 1;
  document.getElementById('local').value = l.local;
  document.getElementById('categoria').value = l.categoria;
  document.getElementById('pagamento').value = l.pagamento;
  document.getElementById('mes').value = l.mes;
}

function excluirLancamento(id) {
  const lista = get(STORAGE.lancamentos);
  const l = lista.find(x => x.id === id);
  if (!l) return;

  if (!l.grupoId) {
    if (!confirm('Excluir este lançamento?')) return;
    set(STORAGE.lancamentos, lista.filter(x => x.id !== id));
    renderLancamentos();
    atualizarGraficosSeAbaAtiva();
    return;
  }

  const escolha = prompt(
    'Lançamento parcelado.\n\n' +
    '1 = Excluir só esta parcela\n' +
    '2 = Excluir TODAS as parcelas\n\n' +
    'Cancelar = não excluir'
  );

  if (escolha === '1') {
    set(STORAGE.lancamentos, lista.filter(x => x.id !== id));
    renderLancamentos();
    atualizarGraficosSeAbaAtiva();
    return;
  }

  if (escolha === '2') {
    set(STORAGE.lancamentos, lista.filter(x => x.grupoId !== l.grupoId));
    renderLancamentos();
    atualizarGraficosSeAbaAtiva();
    return;
  }
}

/* ================== GRÁFICOS ================== */
function atualizarGraficosSeAbaAtiva() {
  if (document.getElementById('graficos').classList.contains('ativa')) {
    atualizarGraficos();
  }
}

function atualizarGraficos() {
  const lista = get(STORAGE.lancamentos);

  // (1) Entradas x Saídas por mês
  const meses = mesesOrdenados(lista);
  const entradasMes = [];
  const saidasMes = [];

  meses.forEach(m => {
    let e = 0, s = 0;
    lista.filter(l => l.mes === m).forEach(l => {
      if (l.tipo === 'entrada') e += l.valor;
      else s += l.valor;
    });
    entradasMes.push(+e.toFixed(2));
    saidasMes.push(+s.toFixed(2));
  });

  // (2) Gastos por categoria (respeita filtro)
  const mesFiltro = getMesFiltro();
  const baseCat = mesFiltro ? lista.filter(l => l.mes === mesFiltro) : lista;
  const gastosPorCategoria = {};

  baseCat.forEach(l => {
    if (l.tipo !== 'saida') return;
    const c = l.categoria || 'Sem categoria';
    gastosPorCategoria[c] = (gastosPorCategoria[c] || 0) + l.valor;
  });

  const cats = Object.keys(gastosPorCategoria);
  const catsVals = cats.map(c => +gastosPorCategoria[c].toFixed(2));

  // (3) Saldo acumulado
  const saldoAcumulado = [];
  let acum = 0;
  meses.forEach((m, idx) => {
    const net = entradasMes[idx] - saidasMes[idx];
    acum += net;
    saldoAcumulado.push(+acum.toFixed(2));
  });

  renderChartMensal(meses, entradasMes, saidasMes);
  renderChartCategorias(cats, catsVals, mesFiltro);
  renderChartSaldo(meses, saldoAcumulado);
}

function renderChartMensal(labels, entradas, saidas) {
  const el = document.getElementById('graficoMensal');
  if (!el || !window.Chart) return;

  const data = {
    labels,
    datasets: [
      { label: 'Entradas', data: entradas },
      { label: 'Saídas', data: saidas }
    ]
  };

  if (chartMensal) {
    chartMensal.data = data;
    chartMensal.update();
    return;
  }

  chartMensal = new Chart(el, {
    type: 'bar',
    data,
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } }
    }
  });
}

function renderChartCategorias(labels, values, mesFiltro) {
  const el = document.getElementById('graficoCategorias');
  if (!el || !window.Chart) return;

  const titulo = mesFiltro ? `Gastos por Categoria (${mesFiltro})` : 'Gastos por Categoria (Todos os meses)';

  const data = {
    labels,
    datasets: [{ label: titulo, data: values }]
  };

  if (chartCategorias) {
    chartCategorias.data = data;
    chartCategorias.update();
    return;
  }

  chartCategorias = new Chart(el, {
    type: 'doughnut',
    data,
    options: {
      responsive: true,
      plugins: { legend: { position: 'right' } }
    }
  });
}

function renderChartSaldo(labels, values) {
  const el = document.getElementById('graficoSaldo');
  if (!el || !window.Chart) return;

  const data = {
    labels,
    datasets: [{ label: 'Saldo acumulado', data: values, tension: 0.25 }]
  };

  if (chartSaldo) {
    chartSaldo.data = data;
    chartSaldo.update();
    return;
  }

  chartSaldo = new Chart(el, {
    type: 'line',
    data,
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } }
    }
  });
}

/* ===== Expor funções globais usadas em onclick ===== */
window.editarLancamento = editarLancamento;
window.excluirLancamento = excluirLancamento;
window.removerCategoria = removerCategoria;
window.editarCategoria = editarCategoria;
window.removerPagamento = removerPagamento;
window.editarPagamento = editarPagamento;
window.editarPagamento = editarPagamento;
window.editarCategoria = editarCategoria;
