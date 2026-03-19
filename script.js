const firebaseConfig = {
apiKey: "AIzaSyDUKNKvSuoPYrCe7d6Xnc8rIdfq7ZMVf2k",
authDomain: "coincompass-hack.firebaseapp.com",
projectId: "coincompass-hack",
storageBucket: "coincompass-hack.firebasestorage.app",
messagingSenderId: "972639367478",
appId: "1:972639367478:web:49ce98b93c2cabd3250397",
databaseURL: "https://coincompass-hack-default-rtdb.europe-west1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.database();
const auth = firebase.auth();

let expenses = [];
let chart = null;
let editingId = null;



auth.onAuthStateChanged(user=>{

if(user){

document.getElementById("auth").style.display="none";
document.getElementById("app").style.display="block";
document.getElementById("mainNav").style.display="flex";

loadUserExpenses(user.uid)

}else{

document.getElementById("auth").style.display="block";
document.getElementById("app").style.display="none";
document.getElementById("mainNav").style.display="none";

}

});



function register(){

let email=document.getElementById("email").value
let pass=document.getElementById("password").value

auth.createUserWithEmailAndPassword(email,pass)
.then(()=>notify("Аккаунт создан"))
.catch(e=>alert(e.message))

}



function login(){

let email=document.getElementById("email").value
let pass=document.getElementById("password").value

auth.signInWithEmailAndPassword(email,pass)
.then(()=>notify("Вход выполнен"))
.catch(e=>alert(e.message))

}



function logout(){
auth.signOut()
}



function loadUserExpenses(uid){

db.ref("users/"+uid+"/expenses").on("value",(snapshot)=>{

const data=snapshot.val()

expenses=data ? Object.keys(data).map(key=>({...data[key],firebaseId:key})) : []

render()

})

}



function notify(text){

let n=document.getElementById("notify")

n.innerText=text

n.classList.add("show")

setTimeout(()=>{n.classList.remove("show")},2000)

}



function tab(id,btn){

document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"))

document.getElementById(id).classList.add("active")

document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"))

btn.classList.add("active")

}



function saveExpense(){

let amount=document.getElementById("amount")
let category=document.getElementById("category")
let desc=document.getElementById("desc")

if(!amount.value) return

const uid=auth.currentUser.uid

const expenseData={

amount:Number(amount.value),
category:category.value,
desc:desc.value || "-",
date:new Date().toISOString()

}

db.ref("users/"+uid+"/expenses").push(expenseData)

notify("Сохранено")

amount.value=""
desc.value=""

}



function del(firebaseId){

const uid=auth.currentUser.uid

db.ref("users/"+uid+"/expenses/"+firebaseId).remove()

notify("Удалено")

}



function render(){

renderHistory()
renderStats()
renderMonths()

}



function renderHistory(){

let html=""

expenses.slice().reverse().forEach(e=>{

let date=new Date(e.date).toLocaleDateString()

html+=`

<tr>

<td>${date}</td>
<td>${e.category}</td>
<td>${e.amount} ₽</td>
<td>${e.desc}</td>

<td>

<button class="delete-btn" onclick="del('${e.firebaseId}')">Удалить</button>

</td>

</tr>

`

})

document.getElementById("historyBody").innerHTML=html

}



function renderStats(){

let total=0
let cats={}

expenses.forEach(e=>{

total+=e.amount

cats[e.category]=(cats[e.category]||0)+e.amount

})

document.getElementById("total").innerText=total+" ₽"

document.getElementById("count").innerText=expenses.length

let ctx=document.getElementById("chart")

if(chart) chart.destroy()

chart=new Chart(ctx,{

type:"doughnut",

data:{

labels:Object.keys(cats),

datasets:[{

data:Object.values(cats),

backgroundColor:['#4b6cff','#ff4b4b','#ffb84b','#2ecc71','#9b59b6','#34495e']

}]

},

options:{

plugins:{legend:{position:"bottom"}}

}

})

}



function renderMonths(){

let months={}

expenses.forEach(e=>{

let m=new Date(e.date).toLocaleString("ru",{month:"long",year:"numeric"})

months[m]=(months[m]||0)+e.amount

})

let html=""

for(let m in months){

html+=`<tr><td>${m}</td><td>${months[m]} ₽</td></tr>`

}

document.getElementById("monthBody").innerHTML=html

}
