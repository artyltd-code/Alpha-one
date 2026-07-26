const KEY="alphaOneV20";
let stocks=load();
let currentCategory="全部",currentSort="score",currentSearch="",favoriteOnly=false;
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("zh-TW",{style:"currency",currency:"TWD",maximumFractionDigits:0}).format(Number(n)||0);
const num=n=>new Intl.NumberFormat("zh-TW",{maximumFractionDigits:2}).format(Number(n)||0);
const pct=n=>`${(Number(n)||0).toFixed(2)}%`;
const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(Array.isArray(x))return x;for(const k of["alphaOneV13","alphaOneV12"]){const old=JSON.parse(localStorage.getItem(k));if(Array.isArray(old))return old.map(s=>({...s,favorite:!!s.favorite}))}return[]}catch{return[]}}
function save(){localStorage.setItem(KEY,JSON.stringify(stocks));render()}
function cls(v){return v>0?"gain":v<0?"loss":"flat"}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1700)}
$("todayText").textContent=new Intl.DateTimeFormat("zh-TW",{year:"numeric",month:"long",day:"numeric",weekday:"long"}).format(new Date());

document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".nav-btn").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");$(b.dataset.page).classList.add("active");scrollTo({top:0,behavior:"smooth"});
});
$("goHoldings").onclick=()=>document.querySelector('[data-page="holdingsPage"]').click();

function alphaScore(s){
  let score=60;
  score+=Math.max(-20,Math.min(20,s.roi*0.7));
  score+=Math.max(-10,Math.min(10,s.dayChange*2));
  if(s.favorite)score+=4;
  if(s.category==="ETF")score+=5;
  if(s.category==="金融")score+=3;
  return Math.round(Math.max(0,Math.min(100,score)));
}
function calc(s){const totalCost=s.shares*s.cost,value=s.shares*s.price,pnl=value-totalCost,roi=totalCost?pnl/totalCost*100:0;const base={...s,totalCost,value,pnl,roi};return{...base,score:alphaScore(base)}}
function sortList(list){return [...list].sort((a,b)=>currentSort==="symbol"?a.symbol.localeCompare(b.symbol,"zh-Hant"):(b[currentSort]||0)-(a[currentSort]||0))}

function render(){
  const all=stocks.map(calc);
  const totalCost=all.reduce((a,x)=>a+x.totalCost,0),totalValue=all.reduce((a,x)=>a+x.value,0),pnl=totalValue-totalCost,roi=totalCost?pnl/totalCost*100:0;
  $("totalValue").textContent=money(totalValue);$("totalCost").textContent=money(totalCost);$("assetSubtext").textContent=`${all.length} 檔持股`;
  $("totalPnl").textContent=money(pnl);$("totalPnl").className=cls(pnl);$("totalRoi").textContent=pct(roi);$("totalRoi").className=cls(roi);
  $("favoriteCount").textContent=all.filter(x=>x.favorite).length;
  const ds=[...all].sort((a,b)=>b.dayChange-a.dayChange);
  $("bestStock").textContent=ds.length?`${ds[0].symbol} ${pct(ds[0].dayChange)}`:"—";
  $("worstStock").textContent=ds.length?`${ds.at(-1).symbol} ${pct(ds.at(-1).dayChange)}`:"—";
  renderBrief(all,pnl,roi);renderScores(all);renderVisuals(all,totalValue);renderHoldings(all);renderAI(all,roi);
}
function renderBrief(all,pnl,roi){
  if(!all.length){$("dailyBrief").innerHTML="尚未建立持股。先到「持股」頁新增資料，Alpha One 才能產生戰情摘要。";return}
  const top=[...all].sort((a,b)=>b.score-a.score)[0];
  const weak=[...all].sort((a,b)=>a.score-b.score)[0];
  const concentration=all.length?Math.max(...all.map(x=>x.value))/all.reduce((a,x)=>a+x.value,0)*100:0;
  const notes=[];
  notes.push(pnl>=0?`目前整體未實現獲利 ${money(pnl)}，總報酬率 ${pct(roi)}。`:`目前整體未實現虧損 ${money(Math.abs(pnl))}，總報酬率 ${pct(roi)}。`);
  notes.push(`Alpha Score 最高為 ${top.symbol}（${top.score} 分），最低為 ${weak.symbol}（${weak.score} 分）。`);
  if(concentration>45)notes.push(`最大單一持股占比約 ${concentration.toFixed(1)}%，集中度偏高。`);
  $("dailyBrief").innerHTML=notes.join("<br>");
}
function renderScores(all){
  const top=[...all].sort((a,b)=>b.score-a.score).slice(0,4);
  $("scoreList").innerHTML=top.length?top.map(x=>`<div class="score-row"><div><strong>${esc(x.symbol)}</strong><div class="stock-name">${esc(x.name||"")}</div></div><div class="score-badge">${x.score}</div><div class="score-meter"><i style="width:${x.score}%"></i></div></div>`).join(""):'<div class="empty">尚無評分資料</div>';
}
function renderVisuals(all,totalValue){
  const cats=["ETF","金融","科技","傳產","其他"],colors=["#45b7ff","#8d7dff","#ff7695","#42d59b","#ffc85a"];
  const sums=cats.map(c=>all.filter(x=>x.category===c).reduce((a,x)=>a+x.value,0));
  let acc=0,stops=[];
  sums.forEach((v,i)=>{if(totalValue&&v){const s=acc/totalValue*100;acc+=v;const e=acc/totalValue*100;stops.push(`${colors[i]} ${s}% ${e}%`)}})
  $("allocationDonut").style.background=stops.length?`conic-gradient(${stops.join(",")})`:"#13243b";
  $("donutCenter").textContent=`${all.length} 檔`;
  $("allocationLegend").innerHTML=cats.map((c,i)=>`<div class="legend-item"><span><i class="dot" style="background:${colors[i]}"></i>${c}</span><strong>${totalValue?(sums[i]/totalValue*100).toFixed(1):"0.0"}%</strong></div>`).join("");
  const p=all.filter(x=>x.pnl>0).length,l=all.filter(x=>x.pnl<0).length,t=Math.max(1,all.length);
  $("profitCount").textContent=p;$("lossCount").textContent=l;$("profitBar").style.width=`${p/t*100}%`;$("lossBar").style.width=`${l/t*100}%`;
}
function renderHoldings(all){
  let list=all.filter(x=>currentCategory==="全部"||x.category===currentCategory)
    .filter(x=>!favoriteOnly||x.favorite)
    .filter(x=>!currentSearch||x.symbol.toLowerCase().includes(currentSearch)||String(x.name||"").toLowerCase().includes(currentSearch));
  list=sortList(list);
  $("holdingsList").innerHTML=list.length?list.map(s=>`<article class="holding-card">
    <div class="holding-top">
      <div class="stock-title">
        <button class="favorite-btn ${s.favorite?"active":""}" data-favorite="${s.id}">${s.favorite?"★":"☆"}</button>
        <div><div class="stock-symbol">${esc(s.symbol)}</div><div class="stock-name">${esc(s.name||"")}</div><span class="category">${esc(s.category||"其他")}</span></div>
      </div>
      <div class="stock-pnl"><strong class="${cls(s.pnl)}">${money(s.pnl)}</strong><span class="${cls(s.roi)}">${pct(s.roi)}</span><div class="score-inline">Alpha Score ${s.score}</div></div>
    </div>
    <div class="holding-metrics">
      <div><span>持有股數</span><strong>${num(s.shares)}</strong></div>
      <div><span>平均成本</span><strong>${num(s.cost)}</strong></div>
      <div><span>目前價格</span><strong>${num(s.price)}</strong></div>
      <div><span>今日漲跌</span><strong class="${cls(s.dayChange)}">${pct(s.dayChange)}</strong></div>
    </div>
    <div class="holding-actions"><button class="mini-btn edit" data-id="${s.id}">修改</button><button class="mini-btn delete" data-id="${s.id}">刪除</button></div>
  </article>`).join(""):'<div class="empty">沒有符合條件的持股。</div>';
  document.querySelectorAll("[data-favorite]").forEach(b=>b.onclick=()=>{stocks=stocks.map(x=>x.id===b.dataset.favorite?{...x,favorite:!x.favorite}:x);save()});
  document.querySelectorAll(".edit").forEach(b=>b.onclick=()=>openDialog(stocks.find(x=>x.id===b.dataset.id)));
  document.querySelectorAll(".delete").forEach(b=>b.onclick=()=>{if(confirm("確定刪除這筆持股？")){stocks=stocks.filter(x=>x.id!==b.dataset.id);save()}});
}
function renderAI(all,roi){
  const avg=all.length?all.reduce((a,x)=>a+x.score,0)/all.length:0;
  $("aiSummary").innerHTML=`<span>今日 Alpha 評分</span><strong>${Math.round(avg||0)} 分</strong><small>${avg>=80?"偏多續抱":avg>=65?"中性偏多":"保守觀察"}</small>`;
  const add=all.filter(x=>x.score>=82).slice(0,4),hold=all.filter(x=>x.score>=65&&x.score<82).slice(0,5),watch=all.filter(x=>x.score<65).slice(0,5),profit=all.filter(x=>x.roi>25).slice(0,5);
  const card=(title,items)=>`<article class="ai-card"><h3>${title}</h3><ul>${items.length?items.map(x=>`<li>${esc(x.symbol)}｜${x.score} 分</li>`).join(""):"<li>目前沒有符合項目</li>"}</ul></article>`;
  $("aiBuckets").innerHTML=card("優先關注",add)+card("續抱觀察",hold)+card("風險留意",watch)+card("停利觀察",profit);
}
function openDialog(s=null){
  $("dialogTitle").textContent=s?"修改持股":"新增持股";$("stockId").value=s?.id||"";$("symbol").value=s?.symbol||"";$("name").value=s?.name||"";
  $("category").value=s?.category||"ETF";$("shares").value=s?.shares??"";$("cost").value=s?.cost??"";$("price").value=s?.price??0;$("dayChange").value=s?.dayChange??0;$("favorite").checked=!!s?.favorite;
  $("stockDialog").showModal();
}
$("addBtn").onclick=()=>openDialog();$("closeDialog").onclick=()=>$("stockDialog").close();
$("stockForm").onsubmit=e=>{
  e.preventDefault();const sid=$("stockId").value;
  const item={id:sid||uid(),symbol:$("symbol").value.trim().toUpperCase(),name:$("name").value.trim(),category:$("category").value,shares:Number($("shares").value),cost:Number($("cost").value),price:Number($("price").value||0),dayChange:Number($("dayChange").value||0),favorite:$("favorite").checked};
  if(!item.symbol||item.shares<0||item.cost<0||item.price<0)return;
  const dup=stocks.find(x=>x.symbol===item.symbol&&x.id!==sid);if(dup){toast("股票代號已存在");return}
  stocks=sid?stocks.map(x=>x.id===sid?item:x):[...stocks,item];$("stockDialog").close();save();toast("持股已儲存");
};
document.querySelectorAll(".chip").forEach(c=>c.onclick=()=>{document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));c.classList.add("active");currentCategory=c.dataset.category;render()});
$("searchInput").oninput=e=>{currentSearch=e.target.value.trim().toLowerCase();render()};$("sortSelect").onchange=e=>{currentSort=e.target.value;render()};$("favoriteOnly").onchange=e=>{favoriteOnly=e.target.checked;render()};
$("refreshBtn").onclick=async()=>{
  if(!stocks.length){toast("目前沒有持股");return}const b=$("refreshBtn");b.disabled=true;b.textContent="…";let ok=0;
  for(const s of stocks){for(const m of["tse","otc"]){try{const r=await fetch(`https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${m}_${s.symbol}.tw`,{cache:"no-store"});const j=await r.json();const row=j?.msgArray?.[0];if(row){const p=Number(row.z||row.y);if(p>0){s.price=p;s.name=s.name||row.n;ok++;break}}}catch{}}}
  save();b.disabled=false;b.textContent="↻";toast(`已更新 ${ok} 檔`);
};
$("exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify({version:"2.0",stocks,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`alpha-one-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)};
$("importBtn").onclick=()=>$("importFile").click();$("importFile").onchange=async e=>{try{const j=JSON.parse(await e.target.files[0].text());const arr=Array.isArray(j)?j:j.stocks;if(!Array.isArray(arr))throw 0;stocks=arr;save();toast("匯入完成")}catch{toast("備份格式錯誤")}e.target.value=""};
$("sampleBtn").onclick=()=>{if(stocks.length&&!confirm("示範資料會覆蓋目前資料，確定？"))return;stocks=[
{id:uid(),symbol:"00919",name:"群益台灣精選高息",category:"ETF",shares:127000,cost:21.35,price:24.10,dayChange:.84,favorite:true},
{id:uid(),symbol:"0050",name:"元大台灣50",category:"ETF",shares:2000,cost:174.6,price:188.2,dayChange:1.15,favorite:true},
{id:uid(),symbol:"2882",name:"國泰金",category:"金融",shares:5000,cost:54.8,price:61.2,dayChange:-.49,favorite:false},
{id:uid(),symbol:"3017",name:"奇鋐",category:"科技",shares:300,cost:735,price:812,dayChange:3.42,favorite:true},
{id:uid(),symbol:"6669",name:"緯穎",category:"科技",shares:100,cost:2240,price:2195,dayChange:-1.2,favorite:false}
];save();toast("示範資料已載入")};
$("clearBtn").onclick=()=>{if(confirm("確定清空所有資料？")){stocks=[];save();toast("已清空")}};
render();