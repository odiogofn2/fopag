console.log("app.js iniciado");

const SUPABASE_URL =
 "https://rbxadmxxbrhgvbgcclxa.supabase.co";

const SUPABASE_ANON_KEY =
 "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJieGFkbXh4YnJoZ3ZiZ2NjbHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTQ2MjAsImV4cCI6MjA4MzE5MDYyMH0.AI0_5k8t26J_Vu2WEBMB7lI8mzJDisV5bvKTAv42SjE";

const supaClient =
 supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
 );


/* DEIXAR GLOBAL (CSS NAO SERÁ ALTERADO) */
window.SUPABASE_URL =
 SUPABASE_URL;

window.SUPABASE_ANON_KEY =
 SUPABASE_ANON_KEY;


/* ===========================
   AUTH
=========================== */
async function login() {

 const email =
  document
   .getElementById("email")
   .value.trim();

 const password =
  document
   .getElementById("password")
   .value.trim();


 if (!email || !password) {
  alert("Preencha email e senha");
  return;
 }


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


async function logout() {
 await supaClient.auth.signOut();
 location.reload();
}



/* ===========================
   SISTEMA
=========================== */
async function iniciarSistema() {


 const loginArea =
  document
   .getElementById("login-area");

 const appArea =
  document
   .getElementById("app-area");


 if (!loginArea || !appArea) {
  alert("Erro interno de DOM");
  return;
 }


 loginArea.classList.add("hidden");
 appArea.classList.remove("hidden");

}



function showTab(nome) {


 const dash =
  document
   .getElementById(
    "dashboard-tab"
   );

 const cart =
  document
   .getElementById(
    "carteiras-tab"
   );

 const pes =
  document
   .getElementById(
    "pessoas-tab"
   );


 if (nome==="carteiras"){
   cart.classList.remove("hidden");
   dash.classList.add("hidden");
 } else {
   dash.classList.remove("hidden");
   cart.classList.add("hidden");
 }


}



async function salvarCarteira() {
 /* a tela já faz insert */
 location.href =
  "carteiras.html";
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
  document
   .getElementById(
    "dash"
   );

 if (!dash) return;


 let total = 0;

 data.forEach(c=>{
   total +=
    Number(
     c.saldo_inicial || 0
    );
 });



 dash.innerHTML =
  `<h3>Saldo Total: ${total}</h3>`;

}


/* AUTO INIT */
(async ()=>{


 const { data } =
  await supaClient
   .auth
   .getSession();


 if (data.session){
   iniciarSistema();
 }


})();


