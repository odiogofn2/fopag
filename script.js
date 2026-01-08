/* ========= STORAGE ========= */
const STORAGE = {
  lancamentos: 'lancamentos',
  categorias: 'categorias',
  pagamentos: 'pagamentos'
};

let editId = null;

/* ========= INIT ========= */
document.addEventListener('DOMContentLoaded', () => {
  iniciarListas();
  renderCategorias();
  renderPagamentos();
  renderLancamentos();
});

/* ========= UTIL ========= */
const gerarId = () => Date.now();

const parseValor = v => {
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
  if (isNaN(n)) throw 'Valor inválido';
  return n;
};

const get = k => JSON.parse(localStorage.getItem(k)) || [];
const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));

/* ========= ABAS ========= */
function trocarAba(id, btn) {
  document.querySelectorAll('.aba').forEach(a => a.classList.remove('ativa'));
  document.getElementById(id).classList.add('ativa');

  document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

/* ========= LISTAS INICIAIS ========= */
function iniciarListas() {
  if (!localStorage.getItem(STORAGE.categorias)) {
    set(STORAGE.categorias, ['Alimentação', 'Moradia', 'Transporte']);
  }
  if (!localStorage.getItem(STORAGE.pagamentos)) {
    set(STORAGE.pagamentos, ['Cartão de Crédito', 'Cartão de Débito', 'Pix', 'Dinheiro']);
  }
}

/* ========= CATEGORIAS ========= */
function renderCategorias() {
  const ul = document.getElementById('listaCategorias');
  const select = document.getElementById('categoria');

  ul.innerHTML = '';
  select.innerHTML = '<option value="">Categoria</option>';

  get(STORAGE.categorias).forEach((c, i) => {
    ul.innerHTML += `<li>${c} <button onclick="delCategoria(${i})">x</button></li>`;
    select.innerHTML += `<option>${c}</option>`;
  });
}

function addCategoria() {
  const v = novaCategoria.value.trim();
  if (!v) return alert('Informe a categoria');
  const lista = get(STORAGE.categorias);
  lista.push(v);
  set(STORAGE.categorias, lista);
  novaCategoria.value = '';
  renderCategorias();
}

function delCategoria(i) {
  const lista = get(STORAGE.categorias);
  lista.splice(i, 1);
  set(STORAGE.categorias, lista);
  renderCategorias();
}

/* ========= PAGAMENTOS ========= */
function renderPagamentos() {
  const ul = document.getElementById('listaPagamentos');
  const select = document.getElementById('pagamento');

  ul.innerHTML = '';
  select.innerHTML = '<option value="">Forma de pagamento</option>';

  get(STORAGE.pagamentos).forEach((p, i) => {
    ul.innerHTML += `<li>${p} <button onclick="delPagamento(${i})">x</button></li>`;
    select.innerHTML += `<option>${p}</option>`;
  });
}

function addPagamento() {
  const v = novoPagamento.value.trim();
  if (!v) return alert('Informe a forma de pagamento');
  const lista = get(STORAGE.pagamentos);
  lista.push(v);
  set(STORAGE.pagamentos, lista);
  novoPagamento.value = '';
  renderPagamentos();
}

function delPagamento(i) {
  const lista = get(STORAGE.pagamentos);
  lista.splice(i, 1);
  set(STORAGE.pagamentos, lista);
  renderPagamentos();
}

/* ========= LANCAMENTOS ========= */
formLancamento.addEventListener('submit', e => {
  e.preventDefault();

  try {
    const valorNum = parseValor(valor.value);
    const qtdParcelas = parseInt(parcelas.value) || 1;

    const lanc = {
      id: editId ?? gerarId(),
      tipo: tipo.value,
      valor: valorNum,
      parcelas: qtdParcelas,
      local: local.value,
      categoria: categoria.value,
      pagamento: pagamento.value,
      mes: mesFiltro.value
    };

    let lista = get(STORAGE.lancamentos);
    lista = editId
      ? lista.map(l => l.id === editId ? lanc : l)
      : [...lista, lanc];

    set(STORAGE.lancamentos, lista);
    editId = null;
    formLancamento.reset();
    parcelas.value = 1;

    renderLancamentos();

  } catch (err) {
    alert(err);
  }
});

function renderLancamentos() {
  const ul = document.getElementById('listaLancamentos');
  ul.innerHTML = '';

  let ent = 0, sai = 0;

  get(STORAGE.lancamentos).forEach(l => {
    ul.innerHTML += `
      <li>
        ${l.tipo.toUpperCase()} | R$ ${l.valor.toFixed(2)} 
        | ${l.categoria} 
        ${l.parcelas > 1 ? `| ${l.parcelas}x` : ''}
        <button onclick="editar(${l.id})">✏️</button>
        <button onclick="excluir(${l.id})">🗑</button>
      </li>
    `;

    l.tipo === 'entrada' ? ent += l.valor : sai += l.valor;
  });

  totalEntradas.innerText = `Entradas: R$ ${ent.toFixed(2)}`;
  totalSaidas.innerText = `Saídas: R$ ${sai.toFixed(2)}`;
  saldo.innerText = `Saldo: R$ ${(ent - sai).toFixed(2)}`;
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
  mesFiltro.value = l.mes;
}

function excluir(id) {
  if (!confirm('Excluir este lançamento?')) return;
  set(STORAGE.lancamentos, get(STORAGE.lancamentos).filter(l => l.id !== id));
  renderLancamentos();
}
