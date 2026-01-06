console.log("app.js iniciado");

/* ===========================
   CONFIG
=========================== */
const SUPABASE_URL =
 "https://rbxadmxxbrhgvbgcclxa.supabase.co";

const SUPABASE_ANON_KEY =
 "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJieGFkbXh4YnJoZ3ZiZ2NjbHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTQ2MjAsImV4cCI6MjA4MzE5MDYyMH0.AI0_5k8t26J_Vu2WEBMB7lI8mzJDisV5bvKTAv42SjE";


/* ===========================
   CLIENT
=========================== */
const supaClient =
 supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


/* ===========================
   TELAS
=========================== */
function irRegistro() {
 document
  .getElementById("login-area")
  .classList.add("hidden");

 document
  .getElementById("register-area")
  .classList.remove("hidden");
}


function voltarLogin() {
 document
  .getElementById("register-area")
  .classList.add("hidden");

 document
  .getElementById("login-area")
  .classList.remove("hidden");
}


/* ===========================
   ABAS
=========================== */
function showTab(nome) {

 const dash =
  document.getElementById(
   "dashboard-tab"
  );

 const cart =
  document.getElementById(
   "carteiras-tab"
  );


 if (nome === "carteiras") {
   cart.classList.remove("hidden");
   dash.classList.add("hidden");
 } else {
   dash.classList.remove("hidden");
   cart.classList.add("hidden");
 }

 carregarCarteiras();
 carregarDashboard();
}


/* ===========================
   AUTH
=========================== */
async function login() {

 const email =
  document.getElementById(
   "email"
  ).value.trim();

 const password =
  document.getElementById(
   "password"
  ).value.trim();


 const { error } =
  await supaClient
   .auth
   .signInWithPassword({
     email,
     password
   });

 if (error) {
  alert(error.message);
  return;
 }

 iniciarSistema();
}


async function registrar() {

 const email =
  document.getElementById(
   "reg-email"
  ).value.trim();

 const password =
  document.getElementById(
   "reg-pass"
  ).value.trim();


 const { error } =
  await supaClient
   .auth
   .signUp({
     email,
     password
   });

 if (error) {
  alert(error.message);
  return;
 }

 alert(
  "Verifique seu email"
 );
}


async function logout() {
 await supaClient.auth.signOut();
 location.reload();
}


/* ===========================
   ESTADO
=========================== */
async function iniciarSistema() {

 document
  .getElementById("app-area")
  .classList.remove("hidden");

 document
  .getElementById("login-area")
  .classList.add("hidden");

 carregarCarteiras();
 carregarDashboard();
}


/* ===========================
   DADOS
=========================== */
async function carregarCarteiras() {

 const user =
  (await supaClient.auth.getUser())
   .data.user;

 if (!user) return;


 const { data, error } =
  await supaClient
   .from("carteiras")
   .select("*")
   .order("nome",
    { ascending: true });


 if (error) {
  alert(error.message);
  return;
 }


 const lista =
  document.getElementById(
   "lista"
  );

 lista.innerHTML = "";


 data.forEach(c => {

  lista.innerHTML += `

   <div class="item">
    <b>${c.nome}</b>
    <br>Tipo: ${c.tipo}
    <br>Saldo Inicial: ${c.saldo_inicial}
    <br>Limite: ${c.limite}
    <br>${c.observacao || ""}
   </div><br>
  `;
 });
}



async function carregarDashboard() {

 const user =
  (await supaClient.auth.getUser())
   .data.user;

 if (!user) return;


 const { data, error } =
  await supa
   .from("carteiras")
   .select("*");


 if (error) {
  alert(error.message);
  return;
 }


 const dash =
  document.getElementById(
   "dash"
  );

 dash.innerHTML = "";


 let total = 0;


 data.forEach(c => {
  total +=
   Number(c.saldo_inicial || 0);
 });


 dash.innerHTML =
  `<h3>Saldo Total das Carteiras: ${total}</h3>`;
}



/* ===========================
   AUTO RUN
=========================== */
(async ()=>{

 const { data } =
  await supaClient
   .auth
   .getSession();


 if (data.session) {
   iniciarSistema();
 }

})();
