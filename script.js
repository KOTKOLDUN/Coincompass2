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
let barChart = null;
let editingId = null;
let currentUser = null;

// ---- Уведомления ----
function notify(text){
    const n = document.getElementById("notify");
    n.innerText = text;
    n.classList.add("show");
    setTimeout(()=>{ n.classList.remove("show"); }, 2000);
}

// ---- Таб переключения ----
function tab(id, btn){
    document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    btn.classList.add("active");
    render();
}

// ---- Авторизация ----
function showApp(user){
    currentUser = user;
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("mainApp").style.display = "block";
    document.getElementById("logoutBtn").style.display = "inline-block";
    loadExpenses();
}

function login(){
    const email = document.getElementById("loginEmail").value;
    const pass = document.getElementById("loginPassword").value;
    auth.signInWithEmailAndPassword(email, pass)
        .then(res => showApp(res.user))
        .catch(err => notify(err.message));
}

function register(){
    const email = document.getElementById("loginEmail").value;
    const pass = document.getElementById("loginPassword").value;
    auth.createUserWithEmailAndPassword(email, pass)
        .then(res => showApp(res.user))
        .catch(err => notify(err.message));
}

function logout(){
    auth.signOut().then(() => {
        currentUser = null;
        document.getElementById("loginSection").style.display = "block";
        document.getElementById("mainApp").style.display = "none";
        document.getElementById("logoutBtn").style.display = "none";
    });
}

// ---- Загрузка расходов конкретного пользователя ----
function loadExpenses(){
    if(!currentUser) return;
    db.ref("users/" + currentUser.uid + "/expenses").on("value", snapshot=>{
        const data = snapshot.val();
        expenses = data ? Object.keys(data).map(key=>({...data[key], firebaseId:key})) : [];
        render();
    });
}

// ---- Добавление / Редактирование расходов ----
function saveExpense(){
    if(!currentUser){ notify("Необходимо войти"); return; }
    const amount = document.getElementById("amount");
    const category = document.getElementById("category");
    const desc = document.getElementById("desc");
    if(!amount.value) return;

    const expenseData = {
        amount: Number(amount.value),
        category: category.value,
        desc: desc.value || "-",
        date: editingId ? expenses.find(e=>e.firebaseId===editingId).date : new Date().toISOString()
    };

    if(editingId){
        db.ref("users/"+currentUser.uid+"/expenses/"+editingId).update(expenseData);
        notify("Обновлено");
        resetForm();
    } else {
        db.ref("users/"+currentUser.uid+"/expenses").push(expenseData);
        notify("Сохранено");
    }

    amount.value = "";
    desc.value = "";
}

function editEntry(id){
    const item = expenses.find(e=>e.firebaseId===id);
    if(!item) return;

    editingId = id;
    document.getElementById("amount").value = item.amount;
    document.getElementById("category").value = item.category;
    document.getElementById("desc").value = item.desc;
    document.getElementById("formTitle").innerText = "Редактировать расход";
    document.getElementById("submitBtn").innerText = "Обновить запись";
    document.getElementById("cancelBtn").style.display = "block";
    tab('add', document.querySelector('.tab[onclick*="add"]'));
}

function resetForm(){
    editingId = null;
    document.getElementById("amount").value = "";
    document.getElementById("desc").value = "";
    document.getElementById("formTitle").innerText = "Добавить расход";
    document.getElementById("submitBtn").innerText = "Сохранить расход";
    document.getElementById("cancelBtn").style.display = "none";
}

// ---- Удаление расходов ----
function del(firebaseId){
    if(!currentUser) return;
    if(confirm("Удалить запись?")){
        db.ref("users/"+currentUser.uid+"/expenses/"+firebaseId).remove();
        notify("Удалено");
    }
}

// ---- Рендеринг ----
function render(){
    renderHistory();
    renderStats();
    renderMonths();
    renderBarChart();
}

function renderHistory(){
    let html = "";
    expenses.slice().reverse().forEach(e=>{
        let date = new Date(e.date).toLocaleDateString();
        html += `<tr><td>${date}</td><td>${e.category}</td><td>${e.amount} ₽</td><td>${e.desc}</td><td><button class="edit-btn" onclick="editEntry('${e.firebaseId}')">Изменить</button><button class="delete-btn" onclick="del('${e.firebaseId}')">Удалить</button></td></tr>`;
    });
    document.getElementById("historyBody").innerHTML = html;
}

function renderStats(){
    let total=0, cats={};
    expenses.forEach(e=>{ total+=e.amount; cats[e.category] = (cats[e.category]||0)+e.amount; });
    document.getElementById("total").innerText = total + " ₽";
    document.getElementById("count").innerText = expenses.length;

    const ctx = document.getElementById("chart");
    if(chart) chart.destroy();
    if(expenses.length>0){
        chart = new Chart(ctx,{
            type:"doughnut",
            data:{ labels:Object.keys(cats), datasets:[{ data:Object.values(cats), backgroundColor:['#4b6cff','#ff4b4b','#ffb84b','#2ecc71','#9b59b6','#34495e'] }] },
            options:{ maintainAspectRatio:false, plugins:{ legend:{position:"bottom"} } }
        });
    }
}

function renderMonths(){
    let months={};
    expenses.forEach(e=>{
        let m = new Date(e.date).toLocaleString("ru",{month:"long",year:"numeric"});
        months[m] = (months[m] || 0) + e.amount;
    });
    let html = "";
    for(let m in months){ html+=`<tr><td>${m}</td><td>${months[m]} ₽</td></tr>`; }
    document.getElementById("monthBody").innerHTML = html;
}

function exportData(){
    if(!currentUser) return;
    const data = JSON.stringify(expenses);
    const blob = new Blob([data], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "coincompass_backup.json";
    a.click();
}

// ---- Гистограмма (справа от круговой диаграммы) ----
function renderBarChart(){
    if(!currentUser) return;
    const period = document.getElementById("periodSelect").value;
    const now = new Date();
    let labels = [], values = [];

    if(period==='day'){
        for(let i=0;i<24;i++){ labels.push(i+":00"); values.push(0); }
        expenses.forEach(e=>{ const d=new Date(e.date); if(d.toDateString()===now.toDateString()){ values[d.getHours()]+=e.amount; } });
    } else if(period==='week'){
        const daysArr=["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
        for(let i=0;i<7;i++){ labels.push(daysArr[i]); values.push(0); }
        expenses.forEach(e=>{ const d=new Date(e.date); const day=(d.getDay()+0)%7; values[day]+=e.amount; });
    } else { // месяц
        const days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
        for(let i=1;i<=days;i++){ labels.push(i.toString()); values.push(0); }
        expenses.forEach(e=>{ const d=new Date(e.date); if(d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear()){ values[d.getDate()-1]+=e.amount; } });
    }

    const ctx = document.getElementById("barChart");
    if(barChart) barChart.destroy();
    barChart = new Chart(ctx,{
        type:"bar",
        data:{ labels:labels, datasets:[{ label:"Расходы", data:values, backgroundColor:'#36a2eb' }] },
        options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } } }
    });
}

// ---- Слежение за состоянием пользователя ----
auth.onAuthStateChanged(user => {
    if(user) showApp(user);
    else {
        document.getElementById("loginSection").style.display = "block";
        document.getElementById("mainApp").style.display = "none";
        document.getElementById("logoutBtn").style.display = "none";
    }
});
