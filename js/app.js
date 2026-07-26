const KEY="alphaOneV22";
let state=load();
let currentCategory="全部",currentSort="score",currentSearch="",favoriteOnly=false;
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("zh-TW",{style:"currency",currency:"TWD",maximumFractionDigits:0}).format(Number(n)||0);
const num=n=>new Intl.NumberFormat("zh-TW",{maximumFractionDigits:2}).format(Number(n)||0);
const pct=n=>`${(Number(n)||0).toFixed(2)}%`;
const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
function load(){
  try{
    const current=JSON.parse(localStorage.getItem(KEY));
    if(current&&Array.isArray(current.stocks)&&Array.isArray(current.trades)&&Array.isArray(current.history)&&Array.isArray(current.dividends))return current;
    const v21=JSON.parse(localStorage.getItem("alphaOneV21"));
    if(v21&&Array.isArray(v21.stocks))return{stocks:v21.stocks,trades:v21.trades||[],history:v21.history||[],dividends:[]};
    for(const k of["alphaOneV20","alphaOneV13","alphaOneV12"]){
      const old=JSON.parse(localStorage.getItem(k));
      if(Array.isArray(old))return{stocks:old.map(s=>({...s,favorite:!!s.favorite})),trades:[],history:[],dividends:[]};
    }
    return{stocks:[],trades:[],history:[],dividends:[]};
  }catch{return{stocks:[],trades:[],history:[],dividends:[]}}
}
function save(){localStorage.setItem(KEY,JSON.stringify(state));render()}
function cls(v){return v>0?"gain":v<0?"loss":"flat"}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1700)}
$("todayText").textContent=new Intl.DateTimeFormat("zh-TW",{year:"numeric",month:"long",day:"numeric",weekday:"long"}).format(new Date());

document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".nav-btn").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");$(b.dataset.page).classList.add("active");scrollTo({top:0,behavior:"smooth"});
});
document.querySelectorAll(".ledger-tab").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".ledger-tab").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".ledger-panel").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");$(b.dataset.ledger).classList.add("active");
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
function totals(all){const totalCost=all.reduce((a,x)=>a+x.totalCost,0),totalValue=all.reduce((a,x)=>a+x.value,0);return{totalCost,totalValue,pnl:totalValue-totalCost,roi:totalCost?(totalValue-totalCost)/totalCost*100:0}}
function realizedTotal(){return state.trades.reduce((sum,t)=>sum+Number(t.realized||0),0)}
function dividendTotal(){return state.dividends.reduce((sum,d)=>sum+Number(d.amount||0),0)}
function sortList(list){return [...list].sort((a,b)=>currentSort==="symbol"?a.symbol.localeCompare(b.symbol,"zh-Hant"):(b[currentSort]||0)-(a[currentSort]||0))}

function render(){
  const all=state.stocks.map(calc),t=totals(all),realized=realizedTotal(),divs=dividendTotal();
  const grand=t.pnl+realized+divs,grandBase=t.totalCost||1;
  $("totalValue").textContent=money(t.totalValue);$("assetSubtext").textContent=`${all.length} 檔持股`;
  $("grandPnl").textContent=money(grand);$("grandPnl").className=cls(grand);$("grandRoi").textContent=pct(grand/grandBase*100);$("grandRoi").className=cls(grand);
  $("unrealizedPnl").textContent=money(t.pnl);$("unrealizedPnl").className=cls(t.pnl);
  $("realizedPnl").textContent=money(realized);$("realizedPnl").className=cls(realized);
  $("dividendTotal").textContent=money(divs);$("totalCost").textContent=money(t.totalCost);
  renderBrief(all,t,realized,divs);renderHistory();renderScores(all);renderHoldings(all);renderTrades();renderDividends();renderAI(all,realized,divs);
}
function renderBrief(all,t,realized,divs){
  if(!all.length){$("dailyBrief").innerHTML="尚未建立持股。先新增庫存、交易或批次匯入，Alpha One 才能產生摘要。";return}
  const top=[...all].sort((a,b)=>b.score-a.score)[0],weak=[...all].sort((a,b)=>a.score-b.score)[0];
  const maxValue=Math.max(...all.map(x=>x.value)),concentration=t.totalValue?maxValue/t.totalValue*100:0;
  const notes=[`未實現損益 ${money(t.pnl)}，已實現損益 ${money(realized)}，累計股息 ${money(divs)}。`,`Alpha Score 最高為 ${top.symbol}（${top.score} 分），最低為 ${weak.symbol}（${weak.score} 分）。`];
  if(concentration>45)notes.push(`最大單一持股占比約 ${concentration.toFixed(1)}%，集中度偏高。`);
  $("dailyBrief").innerHTML=notes.join("<br>");
}
function renderHistory(){
  const h=[...state.history].sort((a,b)=>a.date.localeCompare(b.date)).slice(-12);
  if(!h.length){$("historyChart").innerHTML='<div class="empty" style="width:100%">尚無資產快照</div>';$("historyStats").innerHTML="";return}
  const values=h.map(x=>x.value),min=Math.min(...values),max=Math.max(...values),range=Math.max(1,max-min);
  $("historyChart").innerHTML=h.map(x=>`<div class="history-column"><div class="history-bar" style="height:${18+(x.value-min)/range*82}%"></div><div class="history-label">${x.date.slice(5)}</div></div>`).join("");
  const first=h[0].value,last=h.at(-1).value,change=last-first,rate=first?change/first*100:0;
  $("historyStats").innerHTML=`<div><span>起始資產</span><strong>${money(first)}</strong></div><div><span>目前資產</span><strong>${money(last)}</strong></div><div><span>期間變化</span><strong class="${cls(change)}">${money(change)}｜${pct(rate)}</strong></div>`;
}
$("snapshotBtn").onclick=()=>{
  const all=state.stocks.map(calc),t=totals(all),date=new Date().toISOString().slice(0,10);
  state.history=state.history.filter(x=>x.date!==date);
  state.history.push({date,value:t.totalValue,cost:t.totalCost,pnl:t.pnl,realized:realizedTotal(),dividends:dividendTotal()});
  save();toast("今日資產快照已記錄");
};
function renderScores(all){
  const top=[...all].sort((a,b)=>b.score-a.score).slice(0,4);
  $("scoreList").innerHTML=top.length?top.map(x=>`<div class="score-row"><div><strong>${esc(x.symbol)}</strong><div class="stock-name">${esc(x.name||"")}</div></div><div class="score-badge">${x.score}</div><div class="score-meter"><i style="width:${x.score}%"></i></div></div>`).join(""):'<div class="empty">尚無評分資料</div>';
}
function renderHoldings(all){
  let list=all.filter(x=>currentCategory==="全部"||x.category===currentCategory).filter(x=>!favoriteOnly||x.favorite).filter(x=>!currentSearch||x.symbol.toLowerCase().includes(currentSearch)||String(x.name||"").toLowerCase().includes(currentSearch));
  list=sortList(list);
  $("holdingsList").innerHTML=list.length?list.map(s=>`<article class="holding-card">
    <div class="holding-top">
      <div class="stock-title"><button class="favorite-btn ${s.favorite?"active":""}" data-favorite="${s.id}">${s.favorite?"★":"☆"}</button><div><div class="stock-symbol">${esc(s.symbol)}</div><div class="stock-name">${esc(s.name||"")}</div><span class="category">${esc(s.category||"其他")}</span></div></div>
      <div class="stock-pnl"><strong class="${cls(s.pnl)}">${money(s.pnl)}</strong><span class="${cls(s.roi)}">${pct(s.roi)}</span><div class="score-inline">Alpha Score ${s.score}</div></div>
    </div>
    <div class="holding-metrics">
      <div><span>持有股數</span><strong>${num(s.shares)}</strong></div><div><span>平均成本</span><strong>${num(s.cost)}</strong></div><div><span>目前價格</span><strong>${num(s.price)}</strong></div><div><span>今日漲跌</span><strong class="${cls(s.dayChange)}">${pct(s.dayChange)}</strong></div>
    </div>
    <div class="holding-actions"><button class="mini-btn edit" data-id="${s.id}">修改</button><button class="mini-btn delete" data-id="${s.id}">刪除</button></div>
  </article>`).join(""):'<div class="empty">沒有符合條件的持股。</div>';
  document.querySelectorAll("[data-favorite]").forEach(b=>b.onclick=()=>{state.stocks=state.stocks.map(x=>x.id===b.dataset.favorite?{...x,favorite:!x.favorite}:x);save()});
  document.querySelectorAll(".edit").forEach(b=>b.onclick=()=>openDialog(state.stocks.find(x=>x.id===b.dataset.id)));
  document.querySelectorAll(".delete").forEach(b=>b.onclick=()=>{if(confirm("確定刪除這筆持股？")){state.stocks=state.stocks.filter(x=>x.id!==b.dataset.id);save()}});
}
function renderTrades(){
  const trades=[...state.trades].sort((a,b)=>b.date.localeCompare(a.date));
  const buy=trades.filter(x=>x.type==="buy").reduce((a,x)=>a+x.shares*x.price+x.fee,0);
  const sell=trades.filter(x=>x.type==="sell").reduce((a,x)=>a+x.shares*x.price-x.fee,0);
  $("tradeCount").textContent=trades.length;$("totalBuy").textContent=money(buy);$("totalSell").textContent=money(sell);$("realizedPnl2").textContent=money(realizedTotal());$("realizedPnl2").className=cls(realizedTotal());
  $("tradeList").innerHTML=trades.length?trades.map(t=>`<article class="trade-card">
    <div class="trade-top"><div><div class="stock-symbol">${esc(t.symbol)}</div><div class="stock-name">${esc(t.name||"")}</div><span class="trade-type ${t.type==="sell"?"sell":""}">${t.type==="buy"?"買進":"賣出"}</span></div><strong>${esc(t.date)}</strong></div>
    <div class="trade-metrics"><div><span>股數</span><strong>${num(t.shares)}</strong></div><div><span>成交價</span><strong>${num(t.price)}</strong></div><div><span>手續費</span><strong>${money(t.fee)}</strong></div><div><span>${t.type==="sell"?"已實現損益":"交易金額"}</span><strong class="${t.type==="sell"?cls(t.realized):""}">${t.type==="sell"?money(t.realized):money(t.shares*t.price+t.fee)}</strong></div></div>
    <div class="trade-actions"><button class="mini-btn delete" data-trade-delete="${t.id}">刪除紀錄</button></div>
  </article>`).join(""):'<div class="empty">尚無交易紀錄</div>';
  document.querySelectorAll("[data-trade-delete]").forEach(b=>b.onclick=()=>{if(confirm("刪除交易紀錄不會回復庫存，確定？")){state.trades=state.trades.filter(x=>x.id!==b.dataset.tradeDelete);save()}});
}
function renderDividends(){
  const list=[...state.dividends].sort((a,b)=>b.date.localeCompare(a.date)),now=new Date(),year=String(now.getFullYear()),month=now.toISOString().slice(0,7);
  const total=dividendTotal(),yearTotal=list.filter(x=>x.date.startsWith(year)).reduce((a,x)=>a+x.amount,0),monthTotal=list.filter(x=>x.date.startsWith(month)).reduce((a,x)=>a+x.amount,0);
  $("dividendCount").textContent=list.length;$("dividendTotal2").textContent=money(total);$("yearDividend").textContent=money(yearTotal);$("monthDividend").textContent=money(monthTotal);
  $("dividendList").innerHTML=list.length?list.map(d=>`<article class="trade-card">
    <div class="trade-top"><div><div class="stock-symbol">${esc(d.symbol)}</div><div class="stock-name">${esc(d.name||"")}</div><span class="trade-type dividend">股息</span></div><strong>${esc(d.date)}</strong></div>
    <div class="trade-metrics"><div><span>股息金額</span><strong>${money(d.amount)}</strong></div><div><span>備註</span><strong>${esc(d.note||"—")}</strong></div></div>
    <div class="trade-actions"><button class="mini-btn delete" data-dividend-delete="${d.id}">刪除紀錄</button></div>
  </article>`).join(""):'<div class="empty">尚無股息紀錄</div>';
  document.querySelectorAll("[data-dividend-delete]").forEach(b=>b.onclick=()=>{if(confirm("確定刪除這筆股息？")){state.dividends=state.dividends.filter(x=>x.id!==b.dataset.dividendDelete);save()}});
}
function renderAI(all,realized,divs){
  const avg=all.length?all.reduce((a,x)=>a+x.score,0)/all.length:0;
  $("aiSummary").innerHTML=`<span>今日 Alpha 評分</span><strong>${Math.round(avg||0)} 分</strong><small>${avg>=80?"偏多續抱":avg>=65?"中性偏多":"保守觀察"}</small>`;
  const add=all.filter(x=>x.score>=82).slice(0,4),hold=all.filter(x=>x.score>=65&&x.score<82).slice(0,5),watch=all.filter(x=>x.score<65).slice(0,5),profit=all.filter(x=>x.roi>25).slice(0,5);
  const card=(title,items)=>`<article class="ai-card"><h3>${title}</h3><ul>${items.length?items.map(x=>`<li>${esc(x.symbol)}｜${x.score} 分</li>`).join(""):"<li>目前沒有符合項目</li>"}</ul></article>`;
  $("aiBuckets").innerHTML=card("優先關注",add)+card("續抱觀察",hold)+card("風險留意",watch)+card("停利觀察",profit);
}
function openDialog(s=null){
  $("dialogTitle").textContent=s?"修改持股":"新增持股";$("stockId").value=s?.id||"";$("symbol").value=s?.symbol||"";$("name").value=s?.name||"";$("category").value=s?.category||"ETF";$("shares").value=s?.shares??"";$("cost").value=s?.cost??"";$("price").value=s?.price??0;$("dayChange").value=s?.dayChange??0;$("favorite").checked=!!s?.favorite;$("stockDialog").showModal();
}
$("addBtn").onclick=()=>openDialog();$("closeDialog").onclick=()=>$("stockDialog").close();
$("stockForm").onsubmit=e=>{e.preventDefault();const sid=$("stockId").value;const item={id:sid||uid(),symbol:$("symbol").value.trim().toUpperCase(),name:$("name").value.trim(),category:$("category").value,shares:Number($("shares").value),cost:Number($("cost").value),price:Number($("price").value||0),dayChange:Number($("dayChange").value||0),favorite:$("favorite").checked};if(!item.symbol||item.shares<0||item.cost<0||item.price<0)return;const dup=state.stocks.find(x=>x.symbol===item.symbol&&x.id!==sid);if(dup){toast("股票代號已存在");return}state.stocks=sid?state.stocks.map(x=>x.id===sid?item:x):[...state.stocks,item];$("stockDialog").close();save();toast("持股已儲存")};

$("addTradeBtn").onclick=()=>{$("tradeForm").reset();$("tradeDate").value=new Date().toISOString().slice(0,10);$("tradeFee").value=0;$("tradeDialog").showModal()};
$("closeTradeDialog").onclick=()=>$("tradeDialog").close();
$("tradeForm").onsubmit=e=>{e.preventDefault();const t={id:uid(),date:$("tradeDate").value,symbol:$("tradeSymbol").value.trim().toUpperCase(),name:$("tradeName").value.trim(),category:$("tradeCategory").value,type:$("tradeType").value,shares:Number($("tradeShares").value),price:Number($("tradePrice").value),fee:Number($("tradeFee").value||0),realized:0};if(!t.symbol||!t.date||t.shares<=0||t.price<0)return;let h=state.stocks.find(x=>x.symbol===t.symbol);if(t.type==="buy"){if(!h){h={id:uid(),symbol:t.symbol,name:t.name,category:t.category,shares:0,cost:0,price:t.price,dayChange:0,favorite:false};state.stocks.push(h)}const oldCost=h.shares*h.cost,newCost=t.shares*t.price+t.fee;h.cost=(oldCost+newCost)/(h.shares+t.shares);h.shares+=t.shares;h.price=t.price;h.name=h.name||t.name}else{if(!h||h.shares<t.shares){toast("持股不足，無法賣出");return}t.realized=(t.price-h.cost)*t.shares-t.fee;h.shares-=t.shares;h.price=t.price;if(h.shares===0)state.stocks=state.stocks.filter(x=>x.id!==h.id)}state.trades.push(t);$("tradeDialog").close();save();toast("交易已儲存")};

$("addDividendBtn").onclick=()=>{$("dividendForm").reset();$("dividendDate").value=new Date().toISOString().slice(0,10);$("dividendDialog").showModal()};
$("closeDividendDialog").onclick=()=>$("dividendDialog").close();
$("dividendForm").onsubmit=e=>{e.preventDefault();const d={id:uid(),date:$("dividendDate").value,symbol:$("dividendSymbol").value.trim().toUpperCase(),name:$("dividendName").value.trim(),amount:Number($("dividendAmount").value),note:$("dividendNote").value.trim()};if(!d.date||!d.symbol||d.amount<0)return;state.dividends.push(d);$("dividendDialog").close();save();toast("股息已儲存")};

$("bulkImportBtn").onclick=()=>{$("bulkForm").reset();$("bulkDialog").showModal()};
$("closeBulkDialog").onclick=()=>$("bulkDialog").close();
$("bulkForm").onsubmit=e=>{e.preventDefault();const lines=$("bulkText").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);const imported=[];for(const line of lines){const cols=line.split(/\t|,/).map(x=>x.trim());if(cols.length<5)continue;const [symbol,name,category,shares,cost,price="0",dayChange="0"]=cols;const item={id:uid(),symbol:symbol.toUpperCase(),name,category:["ETF","金融","科技","傳產","其他"].includes(category)?category:"其他",shares:Number(shares),cost:Number(cost),price:Number(price),dayChange:Number(dayChange),favorite:false};if(item.symbol&&Number.isFinite(item.shares)&&Number.isFinite(item.cost))imported.push(item)}if(!imported.length){toast("沒有可匯入的資料");return}if($("bulkReplace").checked)state.stocks=[];for(const item of imported){const old=state.stocks.find(x=>x.symbol===item.symbol);if(old)Object.assign(old,item,{id:old.id,favorite:old.favorite});else state.stocks.push(item)}$("bulkDialog").close();save();toast(`已匯入 ${imported.length} 檔`)};

$("rebuildBtn").onclick=()=>{if(!state.trades.length){toast("沒有交易紀錄可重建");return}if(!confirm("將依交易紀錄重建庫存，現有手動庫存會被取代，確定？"))return;const rebuilt=[];const sorted=[...state.trades].sort((a,b)=>a.date.localeCompare(b.date));for(const t of sorted){let h=rebuilt.find(x=>x.symbol===t.symbol);if(t.type==="buy"){if(!h){h={id:uid(),symbol:t.symbol,name:t.name,category:t.category||"其他",shares:0,cost:0,price:t.price,dayChange:0,favorite:false};rebuilt.push(h)}const oldCost=h.shares*h.cost,newCost=t.shares*t.price+t.fee;h.cost=(oldCost+newCost)/(h.shares+t.shares);h.shares+=t.shares;h.price=t.price}else if(h&&h.shares>=t.shares){h.shares-=t.shares;h.price=t.price}}state.stocks=rebuilt.filter(x=>x.shares>0);save();toast("庫存已依交易重建")};

document.querySelectorAll(".chip").forEach(c=>c.onclick=()=>{document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));c.classList.add("active");currentCategory=c.dataset.category;render()});
$("searchInput").oninput=e=>{currentSearch=e.target.value.trim().toLowerCase();render()};$("sortSelect").onchange=e=>{currentSort=e.target.value;render()};$("favoriteOnly").onchange=e=>{favoriteOnly=e.target.checked;render()};
$("refreshBtn").onclick=async()=>{if(!state.stocks.length){toast("目前沒有持股");return}const b=$("refreshBtn");b.disabled=true;b.textContent="…";let ok=0;for(const s of state.stocks){for(const m of["tse","otc"]){try{const r=await fetch(`https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${m}_${s.symbol}.tw`,{cache:"no-store"});const j=await r.json();const row=j?.msgArray?.[0];if(row){const p=Number(row.z||row.y);if(p>0){s.price=p;s.name=s.name||row.n;ok++;break}}}catch{}}}save();b.disabled=false;b.textContent="↻";toast(`已更新 ${ok} 檔`)};
$("exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify({version:"2.2",...state,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`alpha-one-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)};
$("importBtn").onclick=()=>$("importFile").click();$("importFile").onchange=async e=>{try{const j=JSON.parse(await e.target.files[0].text());if(!Array.isArray(j.stocks))throw 0;state={stocks:j.stocks,trades:Array.isArray(j.trades)?j.trades:[],history:Array.isArray(j.history)?j.history:[],dividends:Array.isArray(j.dividends)?j.dividends:[]};save();toast("匯入完成")}catch{toast("備份格式錯誤")}e.target.value=""};
$("sampleBtn").onclick=()=>{if(state.stocks.length&&!confirm("示範資料會覆蓋目前資料，確定？"))return;state={stocks:[{id:uid(),symbol:"00919",name:"群益台灣精選高息",category:"ETF",shares:127000,cost:21.35,price:24.10,dayChange:.84,favorite:true},{id:uid(),symbol:"0050",name:"元大台灣50",category:"ETF",shares:2000,cost:174.6,price:188.2,dayChange:1.15,favorite:true},{id:uid(),symbol:"2882",name:"國泰金",category:"金融",shares:5000,cost:54.8,price:61.2,dayChange:-.49,favorite:false},{id:uid(),symbol:"3017",name:"奇鋐",category:"科技",shares:300,cost:735,price:812,dayChange:3.42,favorite:true}],trades:[],history:[{date:"2026-07-20",value:10850000,cost:10200000,pnl:650000},{date:"2026-07-22",value:10960000,cost:10250000,pnl:710000},{date:"2026-07-24",value:11120000,cost:10300000,pnl:820000},{date:"2026-07-27",value:11280000,cost:10350000,pnl:930000}],dividends:[{id:uid(),date:"2026-07-15",symbol:"00919",name:"群益台灣精選高息",amount:190500,note:"季度配息"}]};save();toast("示範資料已載入")};
$("clearBtn").onclick=()=>{if(confirm("確定清空所有資料？")){state={stocks:[],trades:[],history:[],dividends:[]};save();toast("已清空")}};
render();