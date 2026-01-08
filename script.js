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

const gerarId = () => Date.now();

function parseValor(valor) {
  const n = parseFloat(valor.replace(/\./g, '').replace(',', '.'));
  if (isNaN(n)) throw 'Valor inválido';
  return n;
}

/* ================== ABAS ================== */
function configurarAbas() {
  document.querySelectorAll('.tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.aba').forEach(a => a.classList.remove('ativa'));

      btn.classList.add('active');
      document.getElementById(btn.dataset.aba).classList.add('ativa');
    });
  });
}

/* ================== LISTAS PADRÃO ================== */
function iniciarListas() {
  if (!localStorage.getItem(STORAGE.categorias)) {
    set(STORAGE.categorias, ['Alimentação', 'Moradia', 'Transporte']);
  }
  if (!localStorage.getItem(STORAGE.pagamentos)) {
    set(STORAGE.pagamentos, [
      'Cartão de Crédito',
      'Cartão de Débito',
      'Pix',
      'Dinheiro'
    ]);
  }
}

/* ================== CATEGORIAS ================== */
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
        <button onclick="removerCategoria(${i})">x</button>
      </li>`;
    select.innerHTML += `<option>${c}</option>`;
  });
}

document.getElementById('btnAddCategoria').onclick = () => {
  const input = document.getElementById('novaCategoria');
  if (!input.value.trim()) return alert('Informe a categoria');

  const categorias = get(STORAGE.categorias);
  categorias.push(input.value.trim());
  set(STORAGE.categorias, categorias);

  input.value = '';
  renderCategorias();
};

function removerCategoria(i) {
  const categorias = get(STORAGE.categorias);
  categorias.splice(i, 1);
  set(STORAGE.categorias, categorias);
  renderCategorias();
}

/* ================== PAGAMENTOS ================== */
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
        <button onclick="removerPagamento(${i})">x</button>
      </li>`;
    select.innerHTML += `<option>${p}</option>`;
  });
}

document.getElementById('btnAddPagamento').onclick = () => {
  const input = document.getElementById('novoPagamento');
  if (!input.value.trim()) return alert('Informe a forma de pagamento');

  const pagamentos = get(STORAGE.pagamentos);
  pagamentos.push(input.value.trim());
  set(STORAGE.pagamentos, pagamentos);

  input.value = '';
  renderPagamentos();
};

function removerPagamento(i) {
  const pagamentos = get(STORAGE.pagamentos);
  pagamentos.splice(i, 1);
  set(STORAGE.pagamentos, pagamentos);
  renderPagamentos();
}

/* ================== LANCAMENTOS ================== */
document.getElementById('formLancamento').addEventListener('submit', e => {
  e.preventDefault();

  try {
    const lancamento = {
      id: editId ?? gerarId(),
      tipo: tipo.value,
      valor: parseValor(valor.value),
      parcelas: parseInt(parcelas.value) || 1,
      local: local.value,
      categoria: categoria.value,
      pagamento: pagamento.value,
      mes: mes.value
    };

    let lista = get(STORAGE.lancamentos);
    lista = editId
      ? lista.map(l => l.id === editId ? lancamento : l)
      : [...lista, lancamento];

    set(STORAGE.lancamentos, lista);

    editId = null;
    e.target.reset();
    parcelas.value = 1;

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

  lista.forEach(l => {
    ul.innerHTML += `
      <li>
        ${l.tipo.toUpperCase()} | R$ ${l.valor.toFixed(2)}
        | ${l.categoria}
        ${l.parcelas > 1 ? `| ${l.parcelas}x` : ''}
        <button onclick="editar(${l.id})">✏️</button>
        <button onclick="excluir(${l.id})">🗑</button>
      </li>
    `;

    l.tipo === 'entrada'
      ? entradas += l.valor
      : saidas += l.valor;
  });

  totalEntradas.innerText = `Entradas: R$ ${entradas.toFixed(2)}`;
  totalSaidas.innerText = `Saídas: R$ ${saidas.toFixed(2)}`;
  saldo.innerText = `Saldo: R$ ${(entradas - saidas).toFixed(2)}`;
}

function editar(id) {
  const l = get(STORAGE.lancamentos).find(x => x.id === id);
  if (!l) return;

  editId = id;
  tipo.value = l.tipo;
  valor.value = l.valor.toFixed(2).replace('.', ',');
  parcelas.value = l.parcelas;
  local.value = l.local;
  categoria.value = l.categoria;
  pagamento.value = l.pagamento;
  mes.value = l.mes;
}

function excluir(id) {
  if (!confirm('Excluir este lançamento?')) return;
  set(
    STORAGE.lancamentos,
    get(STORAGE.lancamentos).filter(l => l.id !== id)
  );
  renderLancamentos();
}
