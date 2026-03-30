import { useState } from "react";

const fmtAmt=(shop,n)=>{
  if(!n)return shop.symbol+"0.00";
  return shop.symbol+Number(n).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});
};
const FULFILLED=new Set(["FULFILLED","GOOD FEEDBACK","GOOD FEEDBACK RECEIVED","EXCHANGED"]);
const RETURNED=new Set(["RTRN REQSTD","RETRN RCVD","RETURN REQUESTED","RETURN RECEIVED","REFUNDED"]);

function buildSales(sales){
  const now=new Date();const curY=now.getFullYear(),curM=now.getMonth();
  const fyStart=curM<3?new Date(curY-1,3,6):new Date(curY,3,6);
  const total=sales.reduce((a,s)=>a+(s.amount||0),0);
  const monthly=sales.filter(s=>{const d=new Date(s.date);return d.getFullYear()===curY&&d.getMonth()===curM;});
  const fy=sales.filter(s=>new Date(s.date)>=fyStart);
  const fulfilled=sales.filter(s=>FULFILLED.has(s.ful||s.status)).length;
  const returned=sales.filter(s=>RETURNED.has(s.ful||s.status)).length;
  const pending=sales.filter(s=>!FULFILLED.has(s.ful||s.status)&&!RETURNED.has(s.ful||s.status)).length;
  const custMap={};
  sales.forEach(s=>{if(!s.customer)return;if(!custMap[s.customer])custMap[s.customer]={name:s.customer,orders:0,total:0};custMap[s.customer].orders++;custMap[s.customer].total+=s.amount||0;});
  const topCusts=Object.values(custMap).sort((a,b)=>b.total-a.total).slice(0,10);
  const monthData=[];
  for(let i=5;i>=0;i--){const d=new Date(curY,curM-i,1);const mY=d.getFullYear(),mM=d.getMonth();const mS=sales.filter(s=>{const sd=new Date(s.date);return sd.getFullYear()===mY&&sd.getMonth()===mM;});monthData.push({label:d.toLocaleString("default",{month:"short",year:"2-digit"}),rev:mS.reduce((a,s)=>a+(s.amount||0),0),orders:mS.length});}
  const payMap={};sales.forEach(s=>{const p=s.pay||"SHOP";payMap[p]=(payMap[p]||0)+(s.amount||0);});
  const monthRev=monthly.reduce((a,s)=>a+(s.amount||0),0);
  const fyRev=fy.reduce((a,s)=>a+(s.amount||0),0);
  return{total,monthRev,fyRev,fulfilled,returned,pending,topCusts,monthData,payMap,count:sales.length};
}
function buildCust(sales){
  const custMap={};
  sales.forEach(s=>{if(!s.customer)return;if(!custMap[s.customer])custMap[s.customer]={name:s.customer,orders:0,total:0,lastDate:""};custMap[s.customer].orders++;custMap[s.customer].total+=s.amount||0;if(!custMap[s.customer].lastDate||s.date>custMap[s.customer].lastDate)custMap[s.customer].lastDate=s.date;});
  const list=Object.values(custMap).sort((a,b)=>b.total-a.total);
  const totalRev=list.reduce((a,c)=>a+c.total,0);
  const avgOrder=sales.length?totalRev/sales.length:0;
  return{list,totalRev,avgOrder};
}
function buildExp(exps){
  const catMap={};exps.forEach(e=>{const c=e.cat||"Other";catMap[c]=(catMap[c]||0)+(e.amount||0);});
  const total=exps.reduce((a,e)=>a+(e.amount||0),0);
  return{total,sorted:Object.entries(catMap).sort((a,b)=>b[1]-a[1]),count:exps.length};
}
function buildPurch(purch){
  const total=purch.reduce((a,p)=>a+(p.total||0),0);
  const supMap={};purch.forEach(p=>{const s=p.supplier||p.sup||"Unknown";if(!supMap[s])supMap[s]={name:s,orders:0,total:0};supMap[s].orders++;supMap[s].total+=p.total||0;});
  return{total,suppliers:Object.values(supMap).sort((a,b)=>b.total-a.total),count:purch.length};
}
function buildPL(sales,exps,purch){
  const revenue=sales.reduce((a,s)=>a+(s.amount||0),0);
  const expenses=exps.reduce((a,e)=>a+(e.amount||0),0);
  const cogs=purch.reduce((a,p)=>a+(p.total||0),0);
  const grossProfit=revenue-cogs;
  const netProfit=grossProfit-expenses;
  return{revenue,expenses,cogs,grossProfit,netProfit};
}

const TH=({children,right})=><th style={{padding:"7px 10px",textAlign:right?"right":"left",fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>{children}</th>;
const TD=({children,right,bold,color})=><td style={{padding:"7px 10px",textAlign:right?"right":"left",fontWeight:bold?800:400,color:color||"#374151",fontSize:12}}>{children}</td>;
const KPI=({l,v,shop})=>(
  <div style={{background:shop.accentBg,borderRadius:8,padding:"8px 10px",border:"1px solid "+shop.accent+"22"}}>
    <p style={{margin:0,fontSize:12,fontWeight:900,color:shop.accentText}}>{v}</p>
    <p style={{margin:0,fontSize:10,color:shop.accent+"99"}}>{l}</p>
  </div>
);

function printReport(title,shop,html){
  const win=window.open("","_blank");
  if(!win){alert("Please allow popups.");return;}
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title} — ${shop.name}</title>
<style>*{box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:12px;color:#0f172a;padding:24px;}
h1{font-size:20px;font-weight:900;margin:0 0 4px;}h2{font-size:13px;font-weight:800;margin:16px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;}
p.sub{color:#64748b;font-size:11px;margin:0 0 20px;}table{width:100%;border-collapse:collapse;margin-bottom:16px;}
th{background:#0f172a;color:white;padding:7px 10px;text-align:left;font-size:10px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;}
.thr{text-align:right}.num{text-align:right;font-weight:700;font-family:monospace;}td{padding:7px 10px;border-bottom:1px solid #f1f5f9;}
tr:nth-child(even)td{background:#f8fafc;}.tot td{font-weight:900;font-size:13px;background:#f0fdf4!important;}
.kpi{display:inline-block;margin:0 10px 10px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 14px;}
.kv{font-size:18px;font-weight:900;display:block;}.kl{font-size:10px;color:#64748b;}
@page{size:A4;margin:15mm;}@media print{body{padding:0;}}</style></head><body>
<h1>${title}</h1><p class="sub">${shop.name} · Generated ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}</p>
${html}</body></html>`);
  win.document.close();
  setTimeout(()=>{win.print();win.onafterprint=()=>win.close();},500);
}

function getPrintHTML(key,sales,exps,purch,shop){
  const sym=shop.symbol;
  const f=n=>sym+Number(n||0).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});
  if(key==="sales"){
    const d=buildSales(sales);
    return`<div><span class="kpi"><span class="kv">${f(d.total)}</span><span class="kl">Lifetime Revenue</span></span><span class="kpi"><span class="kv">${d.count}</span><span class="kl">Total Orders</span></span><span class="kpi"><span class="kv">${f(d.monthRev)}</span><span class="kl">This Month</span></span><span class="kpi"><span class="kv">${f(d.fyRev)}</span><span class="kl">Financial Year</span></span><span class="kpi"><span class="kv">${d.fulfilled}</span><span class="kl">Fulfilled</span></span><span class="kpi"><span class="kv">${d.pending}</span><span class="kl">Pending</span></span></div>
<h2>Monthly Revenue (Last 6 Months)</h2><table><thead><tr><th>Month</th><th>Orders</th><th class="thr">Revenue</th></tr></thead><tbody>${d.monthData.map(m=>`<tr><td>${m.label}</td><td>${m.orders}</td><td class="num">${f(m.rev)}</td></tr>`).join("")}</tbody></table>
<h2>Top 10 Customers</h2><table><thead><tr><th>#</th><th>Customer</th><th>Orders</th><th class="thr">Total Spend</th></tr></thead><tbody>${d.topCusts.map((c,i)=>`<tr><td>${i+1}</td><td>${c.name}</td><td>${c.orders}</td><td class="num">${f(c.total)}</td></tr>`).join("")}</tbody></table>
<h2>Payment Method Breakdown</h2><table><thead><tr><th>Method</th><th class="thr">Revenue</th></tr></thead><tbody>${Object.entries(d.payMap).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${k}</td><td class="num">${f(v)}</td></tr>`).join("")}</tbody></table>`;
  }
  if(key==="customers"){
    const d=buildCust(sales);
    return`<div><span class="kpi"><span class="kv">${d.list.length}</span><span class="kl">Unique Customers</span></span><span class="kpi"><span class="kv">${f(d.totalRev)}</span><span class="kl">Total Revenue</span></span><span class="kpi"><span class="kv">${f(d.avgOrder)}</span><span class="kl">Avg Order Value</span></span></div>
<h2>All Customers by Spend</h2><table><thead><tr><th>#</th><th>Customer</th><th>Orders</th><th class="thr">Total Spend</th><th>Last Order</th></tr></thead><tbody>${d.list.map((c,i)=>`<tr><td>${i+1}</td><td>${c.name}</td><td>${c.orders}</td><td class="num">${f(c.total)}</td><td>${c.lastDate||"—"}</td></tr>`).join("")}</tbody></table>`;
  }
  if(key==="expenses"){
    const d=buildExp(exps);
    return`<div><span class="kpi"><span class="kv">${d.count}</span><span class="kl">Records</span></span><span class="kpi"><span class="kv">${f(d.total)}</span><span class="kl">Total</span></span></div>
<h2>Expenses by Category</h2><table><thead><tr><th>Category</th><th class="thr">Amount</th><th class="thr">%</th></tr></thead><tbody>${d.sorted.map(([k,v])=>`<tr><td>${k}</td><td class="num">${f(v)}</td><td class="num">${d.total?((v/d.total)*100).toFixed(1):0}%</td></tr>`).join("")}<tr class="tot"><td>TOTAL</td><td class="num">${f(d.total)}</td><td class="num">100%</td></tr></tbody></table>`;
  }
  if(key==="purchases"){
    const d=buildPurch(purch);
    return`<div><span class="kpi"><span class="kv">${d.count}</span><span class="kl">Orders</span></span><span class="kpi"><span class="kv">${f(d.total)}</span><span class="kl">Total</span></span></div>
<h2>Purchases by Supplier</h2><table><thead><tr><th>Supplier</th><th>Orders</th><th class="thr">Value</th></tr></thead><tbody>${d.suppliers.map(s=>`<tr><td>${s.name}</td><td>${s.orders}</td><td class="num">${f(s.total)}</td></tr>`).join("")}<tr class="tot"><td>TOTAL</td><td>${d.count}</td><td class="num">${f(d.total)}</td></tr></tbody></table>`;
  }
  if(key==="pl"){
    const d=buildPL(sales,exps,purch);
    const isP=d.netProfit>=0;
    return`<h2>Profit & Loss Summary</h2><table><thead><tr><th>Item</th><th class="thr">Amount</th></tr></thead><tbody>
<tr><td>💰 Total Revenue</td><td class="num" style="color:#15803d">${f(d.revenue)}</td></tr>
<tr><td>📦 Cost of Goods</td><td class="num" style="color:#dc2626">- ${f(d.cogs)}</td></tr>
<tr><td><strong>Gross Profit</strong></td><td class="num"><strong style="color:${d.grossProfit>=0?"#15803d":"#dc2626"}">${f(d.grossProfit)}</strong></td></tr>
<tr><td>💳 Operating Expenses</td><td class="num" style="color:#dc2626">- ${f(d.expenses)}</td></tr>
<tr class="tot"><td>${isP?"✅ NET PROFIT":"❌ NET LOSS"}</td><td class="num" style="color:${isP?"#15803d":"#dc2626"};font-size:15px">${isP?"":"-"}${f(Math.abs(d.netProfit))}</td></tr>
</tbody></table>`;
  }
  return`<p>Stock data not yet connected.</p>`;
}

export default function ReportsPanel({shop,sales=[],customers=[],exps=[],purch=[],shopId}){
  const [active,setActive]=useState(null);
  const [hov,setHov]=useState(null);

  const REPORTS=[
    {key:"sales",    t:"Sales Report",    d:"Revenue, orders and customer breakdown",  ic:"📊"},
    {key:"customers",t:"Customer Report", d:"Top customers by spend and order count",  ic:"👥"},
    {key:"pl",       t:"P&L Statement",   d:"Revenue, costs and net profit/loss",      ic:"💹"},
    {key:"expenses", t:"Expense Report",  d:"Expense breakdown by category",           ic:"💳"},
    {key:"purchases",t:"Purchase Report", d:"Supplier purchases and payment status",   ic:"📦"},
    {key:"stock",    t:"Stock Report",    d:"Inventory levels — connect stock data",   ic:"🏷️"},
  ];

  const renderPreview=(key)=>{
    if(key==="sales"){
      const d=buildSales(sales);
      return(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
            <KPI l="Lifetime Revenue" v={fmtAmt(shop,d.total)} shop={shop}/>
            <KPI l="This Month" v={fmtAmt(shop,d.monthRev)} shop={shop}/>
            <KPI l="Financial Year" v={fmtAmt(shop,d.fyRev)} shop={shop}/>
            <KPI l="Total Orders" v={d.count} shop={shop}/>
            <KPI l="Fulfilled" v={d.fulfilled} shop={shop}/>
            <KPI l="Pending" v={d.pending} shop={shop}/>
          </div>
          <p style={{margin:"0 0 6px",fontSize:10,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>Last 6 Months</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:14}}>
            <thead><tr style={{background:"#f8fafc"}}><TH>Month</TH><TH>Orders</TH><TH right>Revenue</TH></tr></thead>
            <tbody>{d.monthData.map((m,i)=><tr key={i} style={{borderTop:"1px solid #f1f5f9"}}><TD>{m.label}</TD><TD>{m.orders}</TD><TD right bold color={shop.accent}>{fmtAmt(shop,m.rev)}</TD></tr>)}</tbody>
          </table>
          <p style={{margin:"0 0 6px",fontSize:10,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>Top 5 Customers</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f8fafc"}}><TH>#</TH><TH>Customer</TH><TH>Orders</TH><TH right>Spend</TH></tr></thead>
            <tbody>{d.topCusts.slice(0,5).map((c,i)=><tr key={i} style={{borderTop:"1px solid #f1f5f9"}}><TD color="#94a3b8">{i+1}</TD><TD bold>{c.name}</TD><TD>{c.orders}</TD><TD right bold color={shop.accent}>{fmtAmt(shop,c.total)}</TD></tr>)}</tbody>
          </table>
        </div>
      );
    }
    if(key==="customers"){
      const d=buildCust(sales);
      return(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
            <KPI l="Unique Customers" v={d.list.length} shop={shop}/>
            <KPI l="Total Revenue" v={fmtAmt(shop,d.totalRev)} shop={shop}/>
            <KPI l="Avg Order Value" v={fmtAmt(shop,d.avgOrder)} shop={shop}/>
          </div>
          <p style={{margin:"0 0 6px",fontSize:10,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>Top 10 Customers</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f8fafc"}}><TH>#</TH><TH>Customer</TH><TH>Orders</TH><TH right>Total Spend</TH></tr></thead>
            <tbody>{d.list.slice(0,10).map((c,i)=><tr key={i} style={{borderTop:"1px solid #f1f5f9"}}><TD color="#94a3b8">{i+1}</TD><TD bold>{c.name}</TD><TD>{c.orders}</TD><TD right bold color={shop.accent}>{fmtAmt(shop,c.total)}</TD></tr>)}</tbody>
          </table>
        </div>
      );
    }
    if(key==="pl"){
      const d=buildPL(sales,exps,purch);const isP=d.netProfit>=0;
      const rows=[
        {l:"💰 Total Revenue",v:d.revenue,color:"#15803d",bold:false},
        {l:"📦 Cost of Goods (Purchases)",v:-d.cogs,color:"#dc2626",bold:false},
        {l:"Gross Profit",v:d.grossProfit,color:d.grossProfit>=0?"#15803d":"#dc2626",bold:true},
        {l:"💳 Operating Expenses",v:-d.expenses,color:"#dc2626",bold:false},
        {l:isP?"✅ NET PROFIT":"❌ NET LOSS",v:d.netProfit,color:isP?"#15803d":"#dc2626",bold:true},
      ];
      return(
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <tbody>{rows.map((r,i)=>(
            <tr key={i} style={{borderTop:"1px solid #f1f5f9",background:r.bold?shop.accentBg:"white"}}>
              <td style={{padding:"8px 10px",fontWeight:r.bold?800:400}}>{r.l}</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:r.bold?900:700,color:r.color,fontFamily:"monospace"}}>
                {r.v<0?"-":""}{shop.symbol}{Math.abs(r.v).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})}
              </td>
            </tr>
          ))}</tbody>
        </table>
      );
    }
    if(key==="expenses"){
      const d=buildExp(exps);
      if(!d.count)return<p style={{color:"#94a3b8",fontSize:13}}>No expense records yet.</p>;
      return(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            <KPI l="Records" v={d.count} shop={shop}/>
            <KPI l="Total Expenses" v={fmtAmt(shop,d.total)} shop={shop}/>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f8fafc"}}><TH>Category</TH><TH right>Amount</TH><TH right>%</TH></tr></thead>
            <tbody>{d.sorted.map(([k,v],i)=><tr key={i} style={{borderTop:"1px solid #f1f5f9"}}><TD>{k}</TD><TD right bold color={shop.accent}>{fmtAmt(shop,v)}</TD><TD right>{d.total?((v/d.total)*100).toFixed(1):0}%</TD></tr>)}</tbody>
          </table>
        </div>
      );
    }
    if(key==="purchases"){
      const d=buildPurch(purch);
      if(!d.count)return<p style={{color:"#94a3b8",fontSize:13}}>No purchase records yet.</p>;
      return(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            <KPI l="Purchase Orders" v={d.count} shop={shop}/>
            <KPI l="Total Value" v={fmtAmt(shop,d.total)} shop={shop}/>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f8fafc"}}><TH>Supplier</TH><TH>Orders</TH><TH right>Value</TH></tr></thead>
            <tbody>{d.suppliers.map((s,i)=><tr key={i} style={{borderTop:"1px solid #f1f5f9"}}><TD bold>{s.name}</TD><TD>{s.orders}</TD><TD right bold color={shop.accent}>{fmtAmt(shop,s.total)}</TD></tr>)}</tbody>
          </table>
        </div>
      );
    }
    return<p style={{color:"#94a3b8",fontSize:13}}>Stock data not yet connected. Add products via the Products tab.</p>;
  };

  return(
    <div style={{fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <div style={{marginBottom:24}}>
        <h2 style={{margin:"0 0 4px",fontSize:20,fontWeight:800,color:"#0f172a"}}>Reports</h2>
        <p style={{margin:0,fontSize:13,color:"#94a3b8"}}>{shop.name} · {sales.length} sales · Live data</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:16}}>
        {REPORTS.map(r=>{
          const isA=active===r.key,isH=hov===r.key;
          return(
            <div key={r.key}
              onMouseEnter={()=>setHov(r.key)}
              onMouseLeave={()=>setHov(null)}
              style={{background:"white",borderRadius:16,border:isA?"2px solid "+shop.accent:isH?"1px solid "+shop.accent+"55":"1px solid #f1f5f9",boxShadow:isH||isA?"0 8px 24px "+shop.accent+"22":"0 1px 6px rgba(0,0,0,0.06)",transition:"all 0.18s",overflow:"hidden"}}>
              <div style={{padding:"20px 20px 16px"}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{width:46,height:46,borderRadius:13,background:shop.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{r.ic}</div>
                  <span style={{fontSize:10,fontWeight:700,color:"#15803d",background:"#dcfce7",border:"1px solid #bbf7d0",borderRadius:999,padding:"2px 8px"}}>● Live</span>
                </div>
                <h3 style={{margin:"0 0 4px",fontSize:15,fontWeight:800,color:"#0f172a"}}>{r.t}</h3>
                <p style={{margin:"0 0 14px",fontSize:12,color:"#94a3b8",lineHeight:1.5}}>{r.d}</p>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setActive(isA?null:r.key)}
                    style={{flex:1,padding:"8px 0",borderRadius:9,border:"1px solid "+shop.accent+"44",background:isA?shop.accent:shop.accentBg,color:isA?"white":shop.accentText,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>
                    {isA?"▲ Hide":"👁 Preview"}
                  </button>
                  <button onClick={()=>printReport(r.t,shop,getPrintHTML(r.key,sales,exps,purch,shop))}
                    style={{flex:1,padding:"8px 0",borderRadius:9,border:"1px solid #e2e8f0",background:"#f8fafc",color:"#374151",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="#0f172a";e.currentTarget.style.color="white";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="#f8fafc";e.currentTarget.style.color="#374151";}}>
                    🖨 Print / PDF
                  </button>
                </div>
              </div>
              {isA&&(
                <div style={{borderTop:"1px solid "+shop.accent+"22",padding:"16px 20px 20px",background:"#fafafa",maxHeight:440,overflowY:"auto"}}>
                  {renderPreview(r.key)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}