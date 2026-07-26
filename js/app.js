const KEY="alphaOneV13";
let stocks=load();
let currentCategory="全部";
let currentSort="value";
let currentSearch="";
let favoriteOnly=false;
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("zh-TW",{style:"currency",currency:"TWD",maximumFractionDigits:0}).format(Number(n)||0);
const num=n=>new Intl.NumberFormat("zh-TW",{maximumFractionDigits:2}).format(Number(n)||0);
const pct=n=>`${(Number(n)||0).toFixed(2)}%`;
const id=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
function load(){
  try{
    const raw=JSON.parse(localStorage.getItem(KEY));
    if(Array.isArray(raw))return raw;
    const old=JSON.parse(localStorage.getItem("alphaOneV12"));
    return Array.isArray(old)?old.map(x=>({...x,favorite:!!x.favorite})):[];
  }catch{return[]}
}
function save(){localStorage.setItem(KEY,JSON.stringify(stocks));render()}
function cls(v){return v>0?"gain":v<0?"loss":"flat"}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1700)}
$("todayText").textContent=new Intl.DateTimeFormat("zh-TW",{year:"numeric",month:"long",day:"numeric",weekday:"long"}).format(new Date());

function calc(s){const cost=s.shares*s.cost,value=s.shares*s.price,pnl=value-cost,roi=cost?pnl/cost*100:0;return{...s,totalCost:cost,value,pnl,roi}}
function sortList(list){
  return [...list].sort((a,b)=>{
    if(currentSort==="symbol")return a.symbol.localeCompare(b.symbol,"zh-Hant");
    return (b[currentSort]||0)-(a[currentSort]||0);
  });
}
function render(){
  const all=stocks.map(calc);
  const totalCost=all.reduce((a,x)=>a+x.totalCost,0),totalValue=all.reduce((a,x)=>a+x.value,0),pnl=totalValue-totalCost,roi=totalCost?pnl/totalCost*100:0;
  $("totalValue").textContent=money(totalValue);$("totalCost").textContent=money(totalCost);$("holdingCount").textContent=all.length;
  $("totalPnl").textContent=money(pnl);$("totalPnl").className=cls(pnl);$("totalRoi").textContent=pct(roi);$("totalRoi").className=cls(roi);
  const daySorted=[...all].sort((a,b)=>b.dayChange-a.dayChange);
  $("bestStock").textContent=daySorted.length?`${daySorted[0].symbol} ${pct(daySorted[0].dayChange)}`:"—";
  $("worstStock").textContent=daySorted.length?`${daySorted.at(-1).symbol} ${pct(daySorted.at(-1).dayChange)}`:"—";
  renderVisuals(all,totalValue);
  let list=all.filter(x=>currentCategory==="全部"||x.category===currentCategory)
    .filter(x=>!favoriteOnly||x.favorite)
    .filter(x=>!currentSearch||x.symbol.toLowerCase().includes(currentSearch)||String(x.name||"").toLowerCase().includes(currentSearch));
  list=sortList(list);
  $("holdingsList").innerHTML=list.length?list.map(s=>`<article class="holding-card">
    <div class="holding-top">
      <div class="stock-title">
        <button class="favorite-btn ${s.favorite?"active":""}" data-favorite="${s.id}" aria-label="收藏">${s.favorite?"★":"☆"}</button>
        <div><div class="stock-symbol">${esc(s.symbol)}</div><div class="stock-name">${esc(s.name||"")}</div><span class="category">${esc(s.category||"其他")}</span></div>
      </div>
      <div class="stock-pnl"><strong class="${cls(s.pnl)}">${money(s.pnl)}</strong><span class="${cls(s.roi)}">${pct(s.roi)}</span></div>
    </div>
    <div class="holding-metrics">
      <div><span>持有股數</span><strong>${num(s.shares)}</strong></div>
      <div><span>平均成本</span><strong>${num(s.cost)}</strong></div>
      <div><span>目前價格</span><strong>${num(s.price)}</strong></div>
      <div><span>今日漲跌</span><strong class="${cls(s.dayChange)}">${pct(s.dayChange)}</strong></div>
    </div>
    <div class="holding-actions"><button class="mini-btn edit" data-id="${s.id}">修改</button><button class="mini-btn delete" data-id="${s.id}">刪除</button></div>
  </article>`).join(""):'<div class="empty">沒有符合條件的持股。</div>';
  document.querySelectorAll("[data-favorite]").forEach(b=>b.addEventListener("click",()=>{stocks=stocks.map(x=>x.id===b.dataset.favorite?{...x,favorite:!x.favorite}:x);save()}));
  document.querySelectorAll(".edit").forEach(b=>b.addEventListener("click",()=>openDialog(stocks.find(x=>x.id===b.dataset.id))));
  document.querySelectorAll(".delete").forEach(b=>b.addEventListener("click",()=>{if(confirm("確定刪除這筆持股？")){stocks=stocks.filter(x=>x.id!==b.dataset.id);save()}}));
}
function renderVisuals(all,totalValue){
  const categories=["ETF","金融","科技","傳產","其他"];
  const colors=["#45b7ff","#8d7dff","#ff7695","#42d59b","#ffc85a"];
  const sums=categories.map(c=>all.filter(x=>x.category===c).reduce((a,x)=>a+x.value,0));
  const stops=[];let acc=0;
  sums.forEach((v,i)=>{if(totalValue>0&&v>0){const start=acc/totalValue*100;acc+=v;const end=acc/totalValue*100;stops.push(`${colors[i]} ${start}% ${end}%`)}})
  $("allocationDonut").style.background=stops.length?`conic-gradient(${stops.join(",")})`:"#13243b";
  $("donutCenter").textContent=`${all.length} 檔`;
  $("allocationLegend").innerHTML=categories.map((c,i)=>`<div class="legend-item"><span><i class="legend-dot" style="background:${colors[i]}"></i>${c}</span><strong>${totalValue?sums[i]/totalValue*100:0 .toFixed?.(1)}${totalValue?(sums[i]/totalValue*100).toFixed(1):"0.0"}%</strong></div>`).join("").replace(/0undefined/g,"0.0");
  const profit=all.filter(x=>x.pnl>0).length,loss=all.filter(x=>x.pnl<0).length,total=Math.max(1,all.length);
  $("profitCount").textContent=profit;$("lossCount").textContent=loss;
  $("profitBar").style.width=`${profit/total*100}%`;$("lossBar").style.width=`${loss/total*100}%`;
  const top=[...all].sort((a,b)=>b.pnl-a.pnl)[0];
  $("topMover").innerHTML=top?`目前未實現損益最高：<strong class="${cls(top.pnl)}">${esc(top.symbol)} ${money(top.pnl)}</strong>`:"尚無持股資料";
}
function openDialog(s=null){
  $("dialogTitle").textContent=s?"修改持股":"新增持股";$("stockId").value=s?.id||"";$("symbol").value=s?.symbol||"";$("name").value=s?.name||"";
  $("category").value=s?.category||"ETF";$("shares").value=s?.shares??"";$("cost").value=s?.cost??"";$("price").value=s?.price??0;$("dayChange").value=s?.dayChange??0;$("favorite").checked=!!s?.favorite;
  $("stockDialog").showModal();
}
$("addBtn").addEventListener("click",()=>openDialog());
$("closeDialog").addEventListener("click",()=>$("stockDialog").close());
$("stockForm").addEventListener("submit",e=>{
  e.preventDefault();
  const sid=$("stockId").value;
  const item={id:sid||id(),symbol:$("symbol").value.trim().toUpperCase(),name:$("name").value.trim(),category:$("category").value,shares:Number($("shares").value),cost:Number($("cost").value),price:Number($("price").value||0),dayChange:Number($("dayChange").value||0),favorite:$("favorite").checked};
  if(!item.symbol||item.shares<0||item.cost<0||item.price<0)return;
  const dup=stocks.find(x=>x.symbol===item.symbol&&x.id!==sid);if(dup){toast("股票代號已存在");return}
  stocks=sid?stocks.map(x=>x.id===sid?item:x):[...stocks,item];$("stockDialog").close();save();toast("持股已儲存");
});
document.querySelectorAll(".chip").forEach(c=>c.addEventListener("click",()=>{
  document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));c.classList.add("active");currentCategory=c.dataset.category;render();
}));
$("searchInput").addEventListener("input",e=>{currentSearch=e.target.value.trim().toLowerCase();render()});
$("sortSelect").addEventListener("change",e=>{currentSort=e.target.value;render()});
$("favoriteOnly").addEventListener("change",e=>{favoriteOnly=e.target.checked;render()});
$("refreshBtn").addEventListener("click",async()=>{
  if(!stocks.length){toast("目前沒有持股");return}
  const b=$("refreshBtn");b.disabled=true;b.textContent="…";let ok=0;
  for(const s of stocks){
    for(const m of ["tse","otc"]){
      try{
        const r=await fetch(`https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${m}_${s.symbol}.tw`,{cache:"no-store"});
        const j=await r.json();const row=j?.msgArray?.[0];if(row){const p=Number(row.z||row.y);if(p>0){s.price=p;s.name=s.name||row.n;ok++;break}}
      }catch{}
    }
  }
  save();b.disabled=false;b.textContent="↻";toast(`已更新 ${ok} 檔`);
});
$("exportBtn").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify({version:"1.3",stocks,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`alpha-one-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);
});
$("importBtn").addEventListener("click",()=>$("importFile").click());
$("importFile").addEventListener("change",async e=>{try{const j=JSON.parse(await e.target.files[0].text());const arr=Array.isArray(j)?j:j.stocks;if(!Array.isArray(arr))throw 0;stocks=arr;save();toast("匯入完成")}catch{toast("備份格式錯誤")}e.target.value=""});
$("sampleBtn").addEventListener("click",()=>{
  if(stocks.length&&!confirm("示範資料會覆蓋目前資料，確定？"))return;
  stocks=[
    {id:id(),symbol:"00919",name:"群益台灣精選高息",category:"ETF",shares:127000,cost:21.35,price:24.10,dayChange:0.84,favorite:true},
    {id:id(),symbol:"0050",name:"元大台灣50",category:"ETF",shares:2000,cost:174.6,price:188.2,dayChange:1.15,favorite:true},
    {id:id(),symbol:"2882",name:"國泰金",category:"金融",shares:5000,cost:54.8,price:61.2,dayChange:-0.49,favorite:false},
    {id:id(),symbol:"3017",name:"奇鋐",category:"科技",shares:300,cost:735,price:812,dayChange:3.42,favorite:true}
  ];save();toast("示範資料已載入");
});
$("clearBtn").addEventListener("click",()=>{if(confirm("確定清空所有資料？")){stocks=[];save();toast("已清空")}});
render();