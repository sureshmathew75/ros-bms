import KPI from "./ui/KPI";
import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell
} from "recharts";

export default function DashboardPanel({
  Badge,
  fmt,
  lowStk,
  MONTHLY,
  pendAmt,
  PIE_D,
  sales,
  shop,
  shopId,
  totRev
}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:22}}>
      <div style={{background:shop.sb,borderRadius:18,padding:"24px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:-30,top:-30,width:180,height:180,borderRadius:"50%",background:"rgba(255,255,255,0.07)"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <p style={{margin:"0 0 4px",fontSize:13,color:"rgba(255,255,255,0.70)",fontWeight:500}}>Welcome back, Admin</p>
          <h2 style={{margin:"0 0 6px",fontSize:24,fontWeight:900,color:"white",letterSpacing:"-0.5px"}}>Business Command Center</h2>
          <p style={{margin:0,fontSize:12,color:"rgba(255,255,255,0.60)"}}>{shop.tagline} · Live data</p>
        </div>
        <div style={{background:"white",borderRadius:12,padding:"8px 16px",display:"inline-flex",alignItems:"center",boxShadow:"0 4px 16px rgba(0,0,0,0.15)",position:"relative",zIndex:1}}>
          <img src={shop.logo} alt="" style={{height:40,width:"auto",maxWidth:200,objectFit:"contain",display:"block"}}/>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:18}}>
        {shop.quickCards.map((qc,i)=>(
          <button key={i}
            style={{background:qc.g,borderRadius:14,padding:"16px 10px",border:"none",cursor:"pointer",
              display:"flex",flexDirection:"column",alignItems:"center",gap:7,
              boxShadow:"0 3px 12px rgba(0,0,0,0.13)",fontFamily:"inherit",transition:"all 0.16s"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 22px rgba(0,0,0,0.18)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 3px 12px rgba(0,0,0,0.13)";}}>
            <span style={{fontSize:20}}>{qc.ic}</span>
            <span style={{fontSize:9.5,fontWeight:800,color:"white",letterSpacing:"0.06em",textAlign:"center",lineHeight:1.35}}>{qc.l}</span>
          </button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:14}}>
        {[
          {label:"Today's Sales",  val:fmt(shopId,shop.todaySales),  change:"12%",plus:true, icon:"🛒",color:shop.k[0],sub:sales.length+" orders"},
          {label:"Monthly Revenue", val:fmt(shopId,shop.monthRevenue),change:"8%", plus:true, icon:"📈",color:shop.k[1],sub:"Progress 68%"},
          {label:"Pending Orders",  val:shop.pendingOrders,           change:"2",  plus:false,icon:"⏳",color:shop.k[2],sub:""},
          {label:"Low Stock",       val:lowStk.length+" items",       change:"3",  plus:false,icon:"⚠️",color:"#ef4444",sub:""},
          {label:"Receivables",     val:fmt(shopId,totRev),           change:"5%", plus:true, icon:"💰",color:shop.k[4],sub:""},
          {label:"Payables",        val:fmt(shopId,pendAmt),          change:"3%", plus:false,icon:"💳",color:shop.k[5],sub:""},
        ].map((k,i)=><KPI key={i} {...k}/>)}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:20}}>
        <div style={{background:"white",borderRadius:16,padding:"22px 24px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
            <h3 style={{margin:0,fontSize:15,fontWeight:800,color:"#0f172a"}}>Sales Performance</h3>
            <div style={{display:"flex",gap:5}}>
              {["7D","30D","3M"].map((p,i)=>(
                <button key={p} style={{padding:"4px 11px",borderRadius:8,border:"1px solid #e2e8f0",background:i===1?shop.accent:"white",color:i===1?"white":"#64748b",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{p}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={MONTHLY}>
              <defs>
                <linearGradient id={"ag"+shopId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={shop.chartLine} stopOpacity={0.30}/>
                  <stop offset="100%" stopColor={shop.chartLine} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="m" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{borderRadius:12,border:"1px solid #f1f5f9",fontSize:13,boxShadow:"0 4px 14px rgba(0,0,0,0.10)"}}/>
              <Area type="monotone" dataKey="v" stroke={shop.chartLine} strokeWidth={2.5} fill={"url(#ag"+shopId+")"} dot={{fill:shop.chartLine,r:3.5}} activeDot={{r:6,strokeWidth:0}}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{background:"white",borderRadius:16,padding:"22px 24px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9"}}>
          <h3 style={{margin:"0 0 4px",fontSize:15,fontWeight:800,color:"#0f172a"}}>Revenue Breakdown</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={PIE_D} cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={3} dataKey="value">
                {PIE_D.map((_,i)=><Cell key={i} fill={shop.pie[i%shop.pie.length]}/>)}
              </Pie>
              <Tooltip contentStyle={{borderRadius:10,fontSize:12}}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
            {PIE_D.map((d,i)=>(
              <div key={d.name} style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:shop.pie[i%shop.pie.length],display:"inline-block"}}/>
                <span style={{fontSize:11,color:"#64748b"}}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <div style={{background:"white",borderRadius:16,padding:"22px 24px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9"}}>
          <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800,color:"#0f172a"}}>Recent Orders</h3>
          {sales.slice(0,4).map(s=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:"#f8fafc",borderRadius:10,marginBottom:8}}>
              <div>
                <p style={{margin:0,fontSize:12,fontWeight:700,color:shop.accent,fontFamily:"DM Mono,monospace"}}>{s.id}</p>
                <p style={{margin:0,fontSize:12,color:"#64748b"}}>{s.customer}</p>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{margin:0,fontSize:14,fontWeight:900,color:"#0f172a"}}>{fmt(shopId,s.amount)}</p>
                <Badge l={s.pay}/>
              </div>
            </div>
          ))}
        </div>
        <div style={{background:"white",borderRadius:16,padding:"22px 24px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9"}}>
          <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800,color:"#0f172a"}}>⚠️ Low Stock Alerts</h3>
          {lowStk.length===0
            ?<div style={{textAlign:"center",padding:"28px 0",color:"#94a3b8"}}><p style={{fontSize:36,margin:"0 0 8px"}}>✅</p><p style={{margin:0,fontSize:13}}>All products well stocked</p></div>
            :lowStk.map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:"#fff5f5",border:"1px solid #fecaca",borderRadius:10,marginBottom:8}}>
                <div>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1e293b"}}>{p.name}</p>
                  <p style={{margin:0,fontSize:11,color:"#94a3b8"}}>{p.sku}</p>
                </div>
                <span style={{background:"#fee2e2",color:"#dc2626",border:"1px solid #fecaca",borderRadius:999,padding:"3px 12px",fontSize:12,fontWeight:700}}>{p.stock} left</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
