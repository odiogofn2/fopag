const { createClient } = supabase;
const supa = createClient(
  "https://rbxadmxxbrhgvbgcclxa.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJieGFkbXh4YnJoZ3ZiZ2NjbHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTQ2MjAsImV4cCI6MjA4MzE5MDYyMH0.AI0_5k8t26J_Vu2WEBMB7lI8mzJDisV5bvKTAv42SjE"
);

// AUTH
async function login() {
  const email = emailInput.value;
  const password = passwordInput.value;
  await supa.auth.signInWithPassword({ email, password });
  init();
}

async function register() {
  const email = emailInput.value;
  const password = passwordInput.value;
  await supa.auth.signUp({ email, password });
  alert("Conta criada");
}

async function logout() {
  await supa.auth.signOut();
  location.reload();
}

async function init() {
  document.getElementById("auth").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  carregarPessoas();
  carregarCarteiras();
  preencherMesAno();
}

// UI
function showTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

// MÊS / ANO
function preencherMesAno() {
  const mes = document.getElementById("mes");
  const ano = document.getElementById("ano");
  for (let i = 1; i <= 12; i++) mes.innerHTML += `<option>${i}</option>`;
  const atual = new Date().getFullYear();
  for (let y = atual - 3; y <= atual + 1; y++) ano.innerHTML += `<option>${y}</option>`;
}

// MOVIMENTAÇÃO COM PARCELAMENTO
async function salvarMovimentacao() {
  const parcelas = Number(parcelasSelect.value);
  const valor = Number(valorInput.value) / parcelas;
  const hoje = new Date();

  for (let i = 0; i < parcelas; i++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    await supa.from("movimentacoes").insert({
      descricao: descricaoInput.value,
      valor,
      mes: data.getMonth() + 1,
      ano: data.getFullYear(),
      carteira_id: carteiraSelect.value,
      pessoa_id: pessoaSelect.value || null,
      pago
    });
  }
  alert("Movimentação lançada");
}
