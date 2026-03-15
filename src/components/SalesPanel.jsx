import PanelContainer from "./ui/PanelContainer";
import { dbDeleteSale } from "../db";

export default function SalesPanel({
  Badge,
  customers,
  filtSales,
  fmt,
  formatDate,
  openMenu,
  search,
  sales,
  salesPeriod,
  setEditRow,
  setInvoiceRow,
  setModal,
  setOpenMenu,
  setSalesData,
  setSearch,
  setSelCustomer,
  setSelRow,
  setSalesPeriod,
  shop,
  shopId,
  TD
}) {
  return (
    <PanelContainer>
      {(()=>{
        const now=new Date();
        const periodFilter=(s)=>{
          if(!s.date)return false;
          const d=new Date(s.date);
          if(salesPeriod==="day"){
            return d.toDateString()===now.toDateString();
          } else if(salesPeriod==="week"){
            const weekAgo=new Date(now);weekAgo.setDate(now.getDate()-7);
            return d>=weekAgo;
          } else if(salesPeriod==="month"){
            return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
          } else if(salesPeriod==="year"){
            return d.getFullYear()===now.getFullYear();
          } else if(salesPeriod==="lifetime"){
            return true;
          }
          return true;
        };
        const prevFilter=(s)=>{
          if(salesPeriod==="lifetime")return false;
          if(!s.date)return false;
          const d=new Date(s.date);
          if(salesPeriod==="day"){
            const yd=new Date(now);yd.setDate(now.getDate()-1);
            return d.toDateString()===yd.toDateString();
          } else if(salesPeriod==="week"){
            const w2=new Date(now);w2.setDate(now.getDate()-14);
            const w1=new Date(now);w1.setDate(now.getDate()-7);
            return d>=w2&&d<w1;
          } else if(salesPeriod==="month"){
            const pm=now.getMonth()===0?11:now.getMonth()-1;
            const py=now.getMonth()===0?now.getFullYear()-1:now.getFullYear();
            return d.getMonth()===pm&&d.getFullYear()===py;
          } else if(salesPeriod==="year"){
            return d.getFullYear()===now.getFullYear()-1;
          }
          return false;
        };

        const cur=sales.filter(periodFilter);
        const prev=sales.filter(prevFilter);
        const curRevenue=cur.reduce((s,x)=>s+(Number(x.amount)||0),0);
        const prevRevenue=prev.reduce((s,x)=>s+(Number(x.amount)||0),0);
        const curOrders=cur.length;
        const prevOrders=prev.length;
        const curQty=cur.reduce((s,x)=>s+(Number(x.qty)||1),0);
        const prevQty=prev.reduce((s,x)=>s+(Number(x.qty)||1),0);
        const curAOV=curOrders>0?curRevenue/curOrders:0;
        const prevAOV=prevOrders>0?prevRevenue/prevOrders:0;

        const trend=(cur,prev)=>{
          if(prev===0)return{pct:cur>0?100:0,plus:true};
          const p=Math.round(((cur-prev)/prev)*100);
          return{pct:Math.abs(p),plus:p>=0};
        };
        const tRev=trend(curRevenue,prevRevenue);
        const tOrd=trend(curOrders,prevOrders);
        const tQty=trend(curQty,prevQty);
        const tAOV=trend(curAOV,prevAOV);
        const periodLabel={day:"vs yesterday",week:"vs last week",month:"vs last month",year:"vs last year",lifetime:"all time"}[salesPeriod];

        const CARDS=[
          {label:"Total Orders",val:curOrders,raw:curOrders,trend:tOrd,icon:"📋",color:"#3b82f6",fmt:(v)=>v},
          {label:"Total Quantity",val:curQty,raw:curQty,trend:tQty,icon:"📦",color:"#8b5cf6",fmt:(v)=>v+" units"},
          {label:"Total Revenue",val:curRevenue,raw:curRevenue,trend:tRev,icon:"💰",color:shop.k[0],fmt:(v)=>fmt(shopId,v)},
          {label:"Avg Order Value",val:curAOV,raw:curAOV,trend:tAOV,icon:"📈",color:"#f59e0b",fmt:(v)=>fmt(shopId,parseFloat(v.toFixed(2)))},
        ];

        return(
          <div style={{background:"white",borderRadius:20,border:"1px solid #f1f5f9",boxShadow:"0 2px 16px rgba(0,0,0,0.06)",overflow:"hidden"}}>
            <div style={{padding:"18px 24px 14px",borderBottom:"1px solid #f8fafc",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
              <div>
                <h3 style={{margin:0,fontSize:15,fontWeight:900,color:"#0f172a",letterSpacing:"-0.01em"}}>Sales Overview</h3>
                <p style={{margin:"2px 0 0",fontSize:12,color:"#94a3b8"}}>Performance metrics for {shop.name}</p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:3,background:"#f8fafc",borderRadius:12,padding:4,border:"1px solid #f1f5f9"}}>
                {[["day","Day"],["week","Week"],["month","Month"],["year","Year"],["lifetime","Lifetime"]].map(([id,lbl])=>(
                  <button key={id} onClick={()=>setSalesPeriod(id)}
                    style={{
                      padding:"6px 16px",borderRadius:9,border:"none",cursor:"pointer",
                      fontFamily:"inherit",fontSize:12,fontWeight:700,
                      transition:"all 0.18s ease",
                      background:salesPeriod===id?shop.accent:"transparent",
                      color:salesPeriod===id?"white":"#64748b",
                      boxShadow:salesPeriod===id?"0 2px 8px "+shop.accent+"44":"none",
                    }}>{lbl}</button>
                ))}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:0}}>
              {CARDS.map((card,i)=>{
                const isLast=i===CARDS.length-1;
                const spark=[40,55,35,70,60,80,card.raw>0?90:20].map(v=>v+Math.random()*10);
                const sparkMax=Math.max(...spark);
                const sparkMin=Math.min(...spark);
                const sparkRange=sparkMax-sparkMin||1;
                const W=80,H=32;
                const pts=spark.map((v,j)=>{
                  const x=(j/(spark.length-1))*W;
                  const y=H-((v-sparkMin)/sparkRange)*(H-6)-3;
                  return `${x},${y}`;
                }).join(" ");
                const fillPts=`0,${H} ${pts} ${W},${H}`;
                return(
                  <div key={card.label}
                    style={{
                      padding:"24px 26px 20px",
                      borderRight:isLast?"none":"1px solid "+card.color+"22",
                      position:"relative",
                      transition:"all 0.22s ease",
                      background:"linear-gradient(145deg,"+card.color+"11,"+card.color+"06)",
                      cursor:"default",
                    }}
                    onMouseEnter={e=>{
                      e.currentTarget.style.background="linear-gradient(145deg,"+card.color+"22,"+card.color+"0f)";
                      e.currentTarget.style.boxShadow="inset 0 0 0 1px "+card.color+"33, 0 8px 28px "+card.color+"22";
                      e.currentTarget.style.transform="translateY(-2px)";
                      const icon=e.currentTarget.querySelector(".card-icon");
                      if(icon){icon.style.background=card.color;icon.style.transform="scale(1.12)";}
                    }}
                    onMouseLeave={e=>{
                      e.currentTarget.style.background="linear-gradient(145deg,"+card.color+"11,"+card.color+"06)";
                      e.currentTarget.style.boxShadow="none";
                      e.currentTarget.style.transform="translateY(0)";
                      const icon=e.currentTarget.querySelector(".card-icon");
                      if(icon){icon.style.background=card.color+"18";icon.style.transform="scale(1)";}
                    }}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:4,background:"linear-gradient(90deg,"+card.color+","+card.color+"66)",borderRadius:"0 0 0 0"}}/>
                    <div style={{position:"absolute",right:-20,top:-20,width:90,height:90,borderRadius:"50%",background:card.color+"0e",pointerEvents:"none"}}/>
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16,position:"relative"}}>
                      <div className="card-icon" style={{width:44,height:44,borderRadius:14,background:card.color+"18",border:"1px solid "+card.color+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,transition:"all 0.22s ease",boxShadow:"0 2px 8px "+card.color+"22"}}>{card.icon}</div>
                      <div style={{display:"flex",alignItems:"center",gap:3,background:card.trend.plus?"#f0fdf4":"#fff5f5",borderRadius:999,padding:"5px 10px",border:card.trend.plus?"1px solid #86efac":"1px solid #fca5a5",boxShadow:card.trend.plus?"0 1px 4px #bbf7d044":"0 1px 4px #fecaca44"}}>
                        <span style={{fontSize:10,fontWeight:900,color:card.trend.plus?"#16a34a":"#dc2626"}}>{card.trend.plus?"▲":"▼"} {card.trend.pct}%</span>
                      </div>
                    </div>
                    <p style={{margin:"0 0 4px",fontSize:10,fontWeight:800,color:card.color,textTransform:"uppercase",letterSpacing:"0.09em",opacity:0.9,position:"relative"}}>{card.label}</p>
                    <p style={{margin:"0 0 2px",fontSize:30,fontWeight:900,color:"#0f172a",letterSpacing:"-0.04em",lineHeight:1,position:"relative"}}>{card.fmt(card.val)}</p>
                    <p style={{margin:"0 0 16px",fontSize:11,color:card.trend.plus?"#16a34a":"#dc2626",fontWeight:700,position:"relative"}}>
                      {card.trend.plus?"+":"-"}{card.trend.pct}% {periodLabel}
                    </p>
                    <svg width={W} height={H} style={{display:"block",opacity:0.7}}>
                      <defs>
                        <linearGradient id={"sg"+i} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={card.color} stopOpacity="0.25"/>
                          <stop offset="100%" stopColor={card.color} stopOpacity="0.02"/>
                        </linearGradient>
                      </defs>
                      <polygon points={fillPts} fill={"url(#sg"+i+")"}/>
                      <polyline points={pts} fill="none" stroke={card.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      <div style={{background:"white",borderRadius:18,padding:20,boxShadow:"0 2px 16px rgba(0,0,0,0.07)",border:"1px solid #f1f5f9",overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid "+shop.accent+"12",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",background:"linear-gradient(135deg,"+shop.accent+"0a,"+shop.accent+"04)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,background:"white",border:"1px solid "+shop.accent+"44",borderRadius:10,padding:"7px 12px",flex:1,minWidth:180}}>
            <span style={{color:"#94a3b8"}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search invoice or customer…"
              style={{border:"none",background:"transparent",outline:"none",fontSize:13,color:"#374151",width:"100%",fontFamily:"inherit"}}/>
          </div>
          <select style={{border:"1px solid #e2e8f0",borderRadius:10,padding:"7px 11px",fontSize:13,color:"#374151",background:"white",fontFamily:"inherit"}}>
            <option>All Status</option><option>Paid</option><option>Pending</option>
          </select>
          <select style={{border:"1px solid #e2e8f0",borderRadius:10,padding:"7px 11px",fontSize:13,color:"#374151",background:"white",fontFamily:"inherit"}}>
            <option>All Tags</option><option>VIP</option><option>New Customer</option><option>Wholesale</option>
          </select>
          <button onClick={()=>setModal("import-sales")}
            style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:10,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
            <span>⬇</span> Import
          </button>
          <button onClick={()=>setModal("export-sales")}
            style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:10,border:"1px solid "+shop.accent+"66",background:shop.accentBg,color:shop.accentText,fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
            <span>⬆</span> Export
          </button>
          <button onClick={()=>setModal("new-sale")} style={{padding:"7px 18px",borderRadius:10,border:"none",background:shop.accent,color:"white",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 3px 10px "+shop.accent+"44"}}>+ New Sale</button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"linear-gradient(90deg,#0f172a,#1e293b)"}}>{["Inv.","Date","Customer Name","Amount","Qty","Status","Tag","Remarks","Actions"].map(h=><th key={h} style={{textAlign:"left",padding:"11px 16px",fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.85)",textTransform:"uppercase",letterSpacing:"0.07em",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
            <tbody>
              {filtSales.map((s,i)=>(
                <tr key={s.id} style={{borderBottom:"1px solid #f8fafc",background:i%2===0?"white":"#fafafa",position:"relative"}}
                  onMouseEnter={e=>e.currentTarget.style.background=shop.accent+"0d"}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"white":"#fafafa"}>
                  <TD ch={s.id} mono c={shop.accent} fw={700}/>
                  <TD ch={formatDate(s.date)} c="#64748b"/>
                  <td style={{padding:"12px 20px"}} onClick={e=>{
                      e.stopPropagation();
                      const c=customers.find(x=>x.name===s.customer)||{
                        id:s.id,
                        name:s.customer,
                        phone:s.contact||s.phone||"—",
                        whatsapp:s.contact||s.phone||"—",
                        address:s.address||"—",
                        notes:s.remarks||s.rem||"",
                        purchases:1,
                        spend:s.amount||0,
                        last:s.date||"—",
                        tag:s.tag||"",
                      };
                      setSelCustomer(c);
                    }}>
                    <span style={{fontWeight:600,color:"#1e293b",cursor:"pointer",borderBottom:"1px dashed #94a3b8",paddingBottom:1}}>{s.customer}</span>
                  </td>
                  <TD ch={fmt(shopId,s.amount)} fw={900} c="#0f172a"/>
                  <TD ch={s.qty||"1"} c="#475569" fw={600}/>
                  <td style={{padding:"10px 16px"}}><Badge l={s.ful||s.status||"PENDING"}/></td>
                  <td style={{padding:"10px 16px"}}>{s.tag&&<Badge l={s.tag}/>}</td>
                  <TD ch={s.rem||"—"} c="#94a3b8"/>
                  <td style={{padding:"8px 12px",whiteSpace:"nowrap"}} onClick={e=>e.stopPropagation()}>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <button title="Preview" onClick={()=>setSelRow(s)}
                        style={{width:30,height:30,borderRadius:8,border:"1px solid #e2e8f0",background:"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#64748b",transition:"all 0.15s"}}
                        onMouseEnter={e=>{e.currentTarget.style.background=shop.accentBg;e.currentTarget.style.borderColor=shop.accent;e.currentTarget.style.color=shop.accent;}}
                        onMouseLeave={e=>{e.currentTarget.style.background="white";e.currentTarget.style.borderColor="#e2e8f0";e.currentTarget.style.color="#64748b";}}>
                        👁
                      </button>
                      <button title="Edit" onClick={()=>{setEditRow(s);setModal("edit-sale");}}
                        style={{width:30,height:30,borderRadius:8,border:"1px solid #e2e8f0",background:"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#64748b",transition:"all 0.15s"}}
                        onMouseEnter={e=>{e.currentTarget.style.background=shop.accentBg;e.currentTarget.style.borderColor=shop.accent;e.currentTarget.style.color=shop.accent;}}
                        onMouseLeave={e=>{e.currentTarget.style.background="white";e.currentTarget.style.borderColor="#e2e8f0";e.currentTarget.style.color="#64748b";}}>
                        ✏️
                      </button>
                      <div style={{position:"relative"}}>
                        <button title="More actions" onClick={()=>setOpenMenu(openMenu===s.id?null:s.id)}
                          style={{width:30,height:30,borderRadius:8,border:"1px solid #e2e8f0",background:"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#64748b",transition:"all 0.15s",fontWeight:900}}
                          onMouseEnter={e=>{e.currentTarget.style.background="#f8fafc";e.currentTarget.style.borderColor="#94a3b8";}}
                          onMouseLeave={e=>{e.currentTarget.style.background="white";e.currentTarget.style.borderColor="#e2e8f0";}}>
                          ⋯
                        </button>
                        {openMenu===s.id&&(
                          <div style={{position:"absolute",right:0,top:34,zIndex:50,background:"white",borderRadius:14,boxShadow:"0 8px 32px rgba(0,0,0,0.14)",border:"1px solid #f1f5f9",minWidth:200,overflow:"hidden"}}
                            onMouseLeave={()=>setOpenMenu(null)}>
                            <div style={{background:shop.accent,padding:"10px 14px"}}>
                              <p style={{margin:0,fontSize:11,fontWeight:800,color:"white",textTransform:"uppercase",letterSpacing:"0.06em"}}>Actions</p>
                            </div>
                            {[
                              {ic:"🛡",  label:"Send Care Catalog",    action:()=>alert("Sending Care Catalog to "+s.customer)},
                              {ic:"💬",  label:"Send Feedback Request",action:()=>alert("Sending Feedback Request to "+s.customer)},
                              {ic:"⭐",  label:"Record Feedback",      action:()=>alert("Recording feedback for "+s.id)},
                              null,
                              {ic:"🚚",  label:"Mark Dispatched",      action:()=>{setSalesData(prev=>({...prev,[shopId]:(prev[shopId]||[]).map(x=>x.id===s.id?{...x,ful:"DISPATCHED"}:x)}));setOpenMenu(null);}},
                              {ic:"↩️",  label:"Manage Return",        action:()=>{setEditRow(s);setModal("edit-sale");setOpenMenu(null);}},
                              null,
                              {ic:"🧾",  label:"View Invoice",         action:()=>{setInvoiceRow(s);setOpenMenu(null);}},
                              null,
                              {ic:"🗑",  label:"Delete",               action:()=>{if(window.confirm("Delete sale "+s.id+"?"))setSalesData(prev=>({...prev,[shopId]:(prev[shopId]||[]).filter(x=>x.id!==s.id)}));setOpenMenu(null);}, red:true},
                            ].map((item,mi)=>item===null
                              ? <div key={mi} style={{height:1,background:"#f1f5f9",margin:"2px 0"}}/>
                              : <button key={mi} onClick={()=>{item.action();setOpenMenu(null);}}
                                  style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 14px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,color:item.red?"#dc2626":"#374151",textAlign:"left",transition:"background 0.12s"}}
                                  onMouseEnter={e=>e.currentTarget.style.background=item.red?"#fff5f5":shop.accentBg}
                                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                                  <span style={{fontSize:15,width:20,textAlign:"center"}}>{item.ic}</span>
                                  {item.label}
                                </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filtSales.length===0&&<tr><td colSpan={9} style={{textAlign:"center",padding:"60px",color:"#94a3b8",fontSize:14}}>No results found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{padding:"11px 18px",borderTop:"1px solid #f8fafc",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:12,color:"#94a3b8"}}>{filtSales.length} records</span>
          <div style={{display:"flex",gap:4}}>
            {[1,2,3].map(p=><button key={p} style={{width:30,height:30,borderRadius:8,border:p===1?"none":"1px solid #e2e8f0",background:p===1?shop.accent:"white",color:p===1?"white":"#374151",fontSize:13,cursor:"pointer",fontWeight:700}}>{p}</button>)}
          </div>
        </div>
      </div>
    </PanelContainer>
  );
}