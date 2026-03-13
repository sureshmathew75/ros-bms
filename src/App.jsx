import { useState, useEffect, useRef, useCallback } from "react";
import CommandPalette from "./components/CommandPalette";
import AnalyticsPanel from "./components/AnalyticsPanel";
import DocumentsPanel from "./components/DocumentsPanel";
import ExpensesPanel from "./components/ExpensesPanel";
import InvoicesPanel from "./components/InvoicesPanel";
import LogisticsPanel from "./components/LogisticsPanel";
import ProductsPanel from "./components/ProductsPanel";
import PurchasesPanel from "./components/PurchasesPanel";
import ReportsPanel from "./components/ReportsPanel";
import SalesPanel from "./components/SalesPanel";
import SuppliersPanel from "./components/SuppliersPanel";
import {
  L_SEL,
  L_HAIR,
  L_IND,
  STAGE_CFG,
  STAFF_CFG,
  AVATAR_STYLES,
  STAGE_ACCENT,
  STAGE_THEME
} from "./constants";
import { formatCurrency, formatDate, formatNumber } from "./utils";
/* =========================================================
   CONFIG / CONSTANTS
   ========================================================= */

/* ─────────────────────────────────────────────────────
   SHOP THEMES  — bright, readable, professional
   Sidebar: light-tinted, coloured but NEVER dark enough
   to hide white text. We use a mid-saturation colour
   with crisp white text and bright accent highlights.
───────────────────────────────────────────────────── */
/* =========================================================
   CRM / DATA STRUCTURES
   ========================================================= */
const SHOPS = [
  {
    id:"ros-selections", name:"ROS Selections UK", short:"Selections",
    flag:"🇬🇧", currency:"GBP", symbol:"£", logo:L_SEL,
    tagline:"Buy with Confidence",
    todaySales:0, pendingOrders:0, stockValue:"—", monthRevenue:0,
    // Sidebar: rich emerald — readable white text
    sb:"linear-gradient(160deg,#059669 0%,#10b981 60%,#34d399 100%)",
    cardBg:"linear-gradient(135deg,#059669 0%,#34d399 100%)",
    sbActive:"rgba(255,255,255,0.22)", sbActiveBorder:"#ffffff",
    sbText:"rgba(255,255,255,0.90)", sbMuted:"rgba(255,255,255,0.60)",
    sbHover:"rgba(255,255,255,0.10)",
    // Page accent
    accent:"#059669", accentBg:"#ecfdf5", accentText:"#065f46",
    accentBtn:"#059669", accentBtnHover:"#047857",
    // KPI icon bg tints
    k:["#059669","#0d9488","#0891b2","#ef4444","#8b5cf6","#f59e0b"],
    chartLine:"#059669", chartFill:"#d1fae5",
    pie:["#059669","#10b981","#34d399","#6ee7b7"],
    quickCards:[
      {l:"NEW SALE",      ic:"🛒", g:"linear-gradient(135deg,#10b981 0%,#059669 100%)"},
      {l:"NEW PURCHASE",  ic:"📦", g:"linear-gradient(135deg,#14b8a6 0%,#0d9488 100%)"},
      {l:"ADD CUSTOMER",  ic:"👤", g:"linear-gradient(135deg,#38bdf8 0%,#0284c7 100%)"},
      {l:"ADD PRODUCT",   ic:"➕", g:"linear-gradient(135deg,#84cc16 0%,#65a30d 100%)"},
      {l:"RECORD EXPENSE",ic:"💳", g:"linear-gradient(135deg,#fb923c 0%,#ea580c 100%)"},
      {l:"GEN REPORT",    ic:"📋", g:"linear-gradient(135deg,#94a3b8 0%,#64748b 100%)"},
    ],
  },
  {
    id:"ros-hairlines", name:"ROS Hairlines UK", short:"Hairlines",
    flag:"🇬🇧", currency:"GBP", symbol:"£", logo:L_HAIR,
    tagline:"Reclaim Your Inner Confidence",
    todaySales:0, pendingOrders:0, stockValue:"—", monthRevenue:0,
    // Sidebar: slate gray — matches card colour scheme
    sb:"linear-gradient(160deg,#1e293b 0%,#334155 50%,#475569 100%)",
    cardBg:"linear-gradient(135deg,#334155 0%,#475569 60%,#64748b 100%)",
    sbActive:"rgba(255,255,255,0.20)", sbActiveBorder:"#ffffff",
    sbText:"rgba(255,255,255,0.92)", sbMuted:"rgba(255,255,255,0.60)",
    sbHover:"rgba(255,255,255,0.10)",
    // accent: slate-400 tones for buttons, highlights, borders
    accent:"#64748b", accentBg:"#f1f5f9", accentText:"#1e293b",
    accentBtn:"#475569", accentBtnHover:"#334155",
    k:["#475569","#64748b","#334155","#ef4444","#8b5cf6","#f59e0b"],
    chartLine:"#64748b", chartFill:"#e2e8f0",
    pie:["#334155","#475569","#64748b","#94a3b8"],
    quickCards:[
      {l:"NEW SALE",      ic:"🛒", g:"linear-gradient(135deg,#64748b 0%,#334155 100%)"},
      {l:"NEW PURCHASE",  ic:"📦", g:"linear-gradient(135deg,#475569 0%,#1e293b 100%)"},
      {l:"ADD CUSTOMER",  ic:"👤", g:"linear-gradient(135deg,#94a3b8 0%,#64748b 100%)"},
      {l:"ADD PRODUCT",   ic:"➕", g:"linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)"},
      {l:"RECORD EXPENSE",ic:"💳", g:"linear-gradient(135deg,#f59e0b 0%,#d97706 100%)"},
      {l:"GEN REPORT",    ic:"📋", g:"linear-gradient(135deg,#374151 0%,#111827 100%)"},
    ],
  },
  {
    id:"ros-india", name:"ROS INDIA", short:"India",
    flag:"🇮🇳", currency:"INR", symbol:"₹", logo:L_IND,
    tagline:"Be Confident with Indian Style",
    todaySales:0, pendingOrders:0, stockValue:"—", monthRevenue:0,
    // Sidebar: deep navy (#00143c) → rose (#dc5078) — exact logo colours
    sb:"linear-gradient(160deg,#1a0a2e 0%,#7d1a4a 50%,#e95597 100%)",
    cardBg:"linear-gradient(135deg,#e95597 0%,#c73d80 100%)",
    sbActive:"rgba(255,255,255,0.22)", sbActiveBorder:"#ffffff",
    sbText:"rgba(255,255,255,0.95)", sbMuted:"rgba(255,255,255,0.62)",
    sbHover:"rgba(255,255,255,0.10)",
    // accent = the rose from the logo
    accent:"#e95597", accentBg:"#fef0f7", accentText:"#7d1047",
    accentBtn:"#e95597", accentBtnHover:"#c73d80",
    k:["#e95597","#c73d80","#1a0a2e","#f472b6","#7c3aed","#d97706"],
    chartLine:"#e95597", chartFill:"#fde8f3",
    pie:["#e95597","#1a0a2e","#f472b6","#7d1a4a"],
    quickCards:[
      {l:"NEW SALE",      ic:"🛒", g:"linear-gradient(135deg,#f472b6 0%,#e95597 100%)"},
      {l:"NEW PURCHASE",  ic:"📦", g:"linear-gradient(135deg,#7d1a4a 0%,#1a0a2e 100%)"},
      {l:"ADD CUSTOMER",  ic:"👤", g:"linear-gradient(135deg,#c084fc 0%,#7c3aed 100%)"},
      {l:"ADD PRODUCT",   ic:"➕", g:"linear-gradient(135deg,#f97316 0%,#c2410c 100%)"},
      {l:"RECORD EXPENSE",ic:"💳", g:"linear-gradient(135deg,#fbbf24 0%,#d97706 100%)"},
      {l:"GEN REPORT",    ic:"📋", g:"linear-gradient(135deg,#64748b 0%,#334155 100%)"},
    ],
  },
];

/* ─── seed data ─────────────────────────────────────── */
const CUSTOMERS = [];
const SUPPLIERS=[];
const PRODUCTS=[];
const AGENTS=[];
const SALES_SEED={"ros-selections":[],"ros-hairlines":[],"ros-india":[]};
const PURCH_SEED={"ros-selections":[],"ros-hairlines":[],"ros-india":[]};
const EXP_SEED={"ros-selections":[],"ros-hairlines":[],"ros-india":[]};
const LOG_SEED={"ros-selections":[],"ros-hairlines":[],"ros-india":[]};
const MONTHLY=[];
const PIE_D=[];

/* ─── helpers ───────────────────────────────────────── */
const fmt=(sid,n)=>{
  const s=SHOPS.find(x=>x.id===sid);
  if(!s)return n;
  return s.currency === "INR"
  ? formatCurrency(n)
  : "£" + Number(n).toLocaleString("en-GB");
};

const BSTYLE={
  Paid:       {bg:"#dcfce7",c:"#15803d",b:"#bbf7d0"},
  Pending:    {bg:"#fef9c3",c:"#a16207",b:"#fde047"},
  Partial:    {bg:"#ffedd5",c:"#c2410c",b:"#fed7aa"},
  Shipped:    {bg:"#dbeafe",c:"#1d4ed8",b:"#bfdbfe"},
  Completed:  {bg:"#dcfce7",c:"#15803d",b:"#bbf7d0"},
  New:        {bg:"#f3e8ff",c:"#7e22ce",b:"#e9d5ff"},
  Processing: {bg:"#cffafe",c:"#0e7490",b:"#a5f3fc"},
  "In Transit":{bg:"#dbeafe",c:"#1d4ed8",b:"#bfdbfe"},
  Delivered:  {bg:"#dcfce7",c:"#15803d",b:"#bbf7d0"},
  Dispatched: {bg:"#e0e7ff",c:"#4338ca",b:"#c7d2fe"},
  VIP:        {bg:"#fef9c3",c:"#854d0e",b:"#fde047"},
  Wholesale:  {bg:"#f3e8ff",c:"#7e22ce",b:"#e9d5ff"},
  "New Customer":{bg:"#cffafe",c:"#0e7490",b:"#a5f3fc"},
  Regular:    {bg:"#f1f5f9",c:"#475569",b:"#e2e8f0"},
};
const Badge=({l})=>{
  const b=BSTYLE[l]||{bg:"#f1f5f9",c:"#475569",b:"#e2e8f0"};
  return <span style={{display:"inline-flex",alignItems:"center",padding:"2px 10px",borderRadius:999,fontSize:11,fontWeight:700,background:b.bg,color:b.c,border:"1px solid "+b.b}}>{l}</span>;
};
const Modal=({title,onClose,accent,children})=>(
  <div style={{position:"fixed",inset:0,zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(6px)"}}/>
    <div style={{position:"relative",background:"white",borderRadius:20,boxShadow:"0 32px 64px rgba(0,0,0,0.20)",width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:"1px solid #f1f5f9",background:accent+"12",borderRadius:"20px 20px 0 0"}}>
        <h3 style={{margin:0,fontSize:16,fontWeight:800,color:"#0f172a"}}>{title}</h3>
        <button onClick={onClose} style={{width:32,height:32,borderRadius:"50%",border:"none",background:"#f1f5f9",cursor:"pointer",fontSize:20,color:"#64748b",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>×</button>
      </div>
      <div style={{padding:24}}>{children}</div>
    </div>
  </div>
);

/* ─── Per-shop logo image map — uses the same imports as shop.logo ─── */
const SHOP_LOGO_SRC = {
  "ros-selections": L_SEL,
  "ros-hairlines":  L_HAIR,
  "ros-india":      L_IND,
};

/* size: "card" (large, on coloured bg) | "sidebar" (small, on gradient bg) */
const ShopLogo = ({ shopId, size = "card" }) => {
  const src = SHOP_LOGO_SRC[shopId];
  if (!src) return null;
  const isCard = size === "card";
  return (
    <div style={{
      background: "white",
      borderRadius: isCard ? 10 : 8,
      padding: isCard ? "4px 8px" : "3px 5px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: isCard
        ? "0 2px 8px rgba(0,0,0,0.15)"
        : "0 2px 8px rgba(0,0,0,0.20),inset 0 1px 0 rgba(255,255,255,0.30)",
      flexShrink: 0,
    }}>
      <img
        src={src}
        alt={shopId}
        style={{
          height: isCard ? 40 : 32,
          width: "auto",
          maxWidth: isCard ? 100 : 80,
          objectFit: "contain",
          display: "block",
        }}
      />
    </div>
  );
};

/* ════════════════════════════════════════════════════
   SHOP SELECTOR
════════════════════════════════════════════════════ */
const ShopSelector=({onSelect,user,onLogout,onOpenSettings})=>{
  const [hov,setHov]=useState(null);
  const [cmd,setCmd]=useState(false);
  const [statHov,setStatHov]=useState(null);
  useEffect(()=>{
    const h=e=>{if(e.key==="/"){e.preventDefault();setCmd(true);}if(e.key==="Escape")setCmd(false);};
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[]);

  /* stat panel data */
  const STAT_PANELS={
    customers:{
      icon:"👥",label:"Customers",value:CUSTOMERS.length,color:"#2563eb",bg:"#eff6ff",border:"#bfdbfe",
      rows:CUSTOMERS.map(c=>({
        avatar:c.name.charAt(0),
        name:c.name,
        sub:c.phone,
        badge:c.tag,
        right:c.spend.toLocaleString(),
        rightSub:"total spend",
      })),
    },
    products:{
      icon:"🏷️",label:"Products",value:PRODUCTS.length,color:"#059669",bg:"#ecfdf5",border:"#a7f3d0",
      rows:PRODUCTS.map(p=>({
        avatar:"📦",
        name:p.name,
        sub:p.sku+" · "+p.cat,
        badge:p.stock<=p.min?"Low Stock":null,
        right:"£"+p.sell,
        rightSub:"sell price",
      })),
    },
    suppliers:{
      icon:"🏭",label:"Suppliers",value:SUPPLIERS.length,color:"#7c3aed",bg:"#f5f3ff",border:"#ddd6fe",
      rows:SUPPLIERS.map(s=>({
        avatar:"🏭",
        name:s.name,
        sub:s.contact+" · "+s.phone,
        badge:s.terms,
        right:s.category,
        rightSub:"category",
      })),
    },
    agents:{
      icon:"🚚",label:"Logistics",value:AGENTS.length,color:"#d97706",bg:"#fffbeb",border:"#fde68a",
      rows:AGENTS.map(a=>({
        avatar:"🚚",
        name:a.name,
        sub:a.type+" · "+a.contact,
        badge:a.type,
        right:"Track →",
        rightSub:"",
      })),
    },
  };

  return(
    <div style={{minHeight:"100vh",background:"#f0f4f8",fontFamily:"\'DM Sans\',system-ui,sans-serif"}} onClick={()=>statHov&&setStatHov(null)}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&family=Arimo:wght@400;500;600;700&display=swap" rel="stylesheet"/>

      {/* ── header ── */}
      <header className="mob-selector-header" style={{background:"white",borderBottom:"1px solid #e2e8f0",height:60,display:"flex",alignItems:"center",padding:"0 32px",justifyContent:"space-between",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",position:"sticky",top:0,zIndex:40}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:38,height:38,borderRadius:11,background:"linear-gradient(135deg,#2563eb,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(37,99,235,0.30)"}}>
            <span style={{color:"white",fontWeight:900,fontSize:17}}>R</span>
          </div>
          <div>
            <span style={{fontWeight:900,fontSize:16,color:"#0f172a",letterSpacing:"-0.3px"}}>ROS</span>
            <span className="mob-hide" style={{fontWeight:400,fontSize:14,color:"#94a3b8",marginLeft:8}}>Business Management</span>
          </div>
        </div>
        <div className="mob-selector-right" style={{display:"flex",alignItems:"center",gap:14}}>
          <span className="mob-hide" style={{fontSize:10,fontWeight:600,color:"#94a3b8",letterSpacing:"0.04em"}}>
            Developed by <strong style={{color:"#2563eb"}}>ROS Nexus</strong>
          </span>
          <button className="mob-hide" onClick={()=>setCmd(true)} style={{display:"flex",alignItems:"center",gap:8,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"7px 16px",color:"#64748b",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            🔍 Search… <kbd style={{background:"#e2e8f0",borderRadius:4,padding:"1px 7px",fontSize:11,marginLeft:4}}>/</kbd>
          </button>
          {user?.role==="superadmin"&&(
            <button onClick={onOpenSettings}
              style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",
                background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",border:"none",
                borderRadius:10,cursor:"pointer",color:"white",fontSize:12,fontWeight:700,
                fontFamily:"inherit",boxShadow:"0 2px 8px rgba(37,99,235,0.35)",
                transition:"all 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.88"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              ⚙️ Settings
            </button>
          )}
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 12px 4px 4px",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:999,cursor:"pointer"}}
            onClick={onLogout} title="Logout">
            <div style={{width:28,height:28,borderRadius:"50%",background:user?.avatar||"linear-gradient(135deg,#2563eb,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800,fontSize:11}}>
              {user?.initials||"A"}
            </div>
            <span style={{fontSize:13,fontWeight:600,color:"#374151"}}>{user?.name||"Admin"}</span>
            <span style={{fontSize:10,color:"#94a3b8",marginLeft:2}}>· Logout</span>
          </div>
        </div>
      </header>

      <main className="mob-main-padding" style={{maxWidth:1160,margin:"0 auto",padding:"60px 24px 80px"}}>

        {/* ── hero ── */}
        <div className="mob-hero-section" style={{textAlign:"center",marginBottom:52}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"white",border:"1px solid #e2e8f0",borderRadius:999,padding:"5px 16px",fontSize:12,fontWeight:700,color:"#64748b",marginBottom:20,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",display:"inline-block"}}/>
            3 Active Workspaces
          </div>
          <h1 className="mob-hero-title" style={{fontSize:42,fontWeight:900,color:"#0f172a",letterSpacing:"-1.5px",lineHeight:1.1,margin:"0 0 12px"}}>Select Your Workspace</h1>
          <p className="mob-hero-sub" style={{fontSize:15,color:"#64748b",margin:0}}>Choose a shop to manage sales, purchases, logistics and analytics.</p>
        </div>

        {/* ── 3 shop cards ── */}
        <div className="mob-shop-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:24,marginBottom:48}}>
          {SHOPS.filter(sh=>user?.role==="superadmin"||user?.role==="admin"||(user?.shops||[]).includes(sh.id)).map(shop=>{
            const h=hov===shop.id;
            const isStaff=user?.role==="staff";
            const staffLocked=isStaff&&!(user?.shops||[]).includes(shop.id);
            return(
              <div key={shop.id}
                onClick={()=>!staffLocked&&onSelect(shop.id)}
                onMouseEnter={()=>!staffLocked&&setHov(shop.id)}
                onMouseLeave={()=>setHov(null)}
                style={{borderRadius:22,overflow:"hidden",cursor:staffLocked?"not-allowed":"pointer",
                  transform:h?"translateY(-5px) scale(1.012)":"none",
                  transition:"all 0.22s cubic-bezier(.4,0,.2,1)",
                  boxShadow:h?"0 20px 48px -8px "+shop.accent+"44,0 4px 16px rgba(0,0,0,0.08)":"0 2px 12px rgba(0,0,0,0.08)",
                  background:"white",
                  border:h?"2px solid "+shop.accent+"55":"2px solid transparent",
                  opacity:staffLocked?0.45:1,
                  filter:staffLocked?"grayscale(0.6)":"none",
                }}>

                {/* ── coloured top section ── */}
                <div style={{background:shop.cardBg||shop.sb,padding:"22px 22px 18px",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:-24,right:-24,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,0.10)"}}/>
                  <div style={{position:"absolute",bottom:-16,left:8,width:64,height:64,borderRadius:"50%",background:"rgba(255,255,255,0.07)"}}/>

                  {/* ── WORKSPACE AVATAR ROW ── */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,position:"relative",zIndex:1}}>
                    {/* Left: logo badge + name */}
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      {/* logo badge — unique per shop */}
                      <ShopLogo shopId={shop.id} size="card" />
                    </div>
                    {/* Right: country flag badge */}
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                      <span style={{fontSize:28,filter:"drop-shadow(0 1px 3px rgba(0,0,0,0.20))"}}>{shop.flag}</span>
                      <span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.80)",letterSpacing:"0.06em",textTransform:"uppercase"}}>{shop.currency}</span>
                    </div>
                  </div>

                  {/* shop name — clearly readable on colour */}
                  <div style={{position:"relative",zIndex:1,marginBottom:14}}>
                    <p style={{margin:"0 0 2px",fontSize:17,fontWeight:700,color:"white",letterSpacing:"0.04em",textShadow:"0 1px 3px rgba(0,0,0,0.18)",fontFamily:"'Arimo',Arial,sans-serif",textTransform:"uppercase"}}>{shop.name}</p>
                    <p style={{margin:0,fontSize:11,color:"rgba(255,255,255,0.65)",fontStyle:"italic"}}>{shop.tagline}</p>
                  </div>

                  {/* revenue — hidden for staff on non-India shops */}
                  <div style={{position:"relative",zIndex:1}}>
                    <p style={{margin:"0 0 2px",fontSize:10,color:"rgba(255,255,255,0.65)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>Today\'s Revenue</p>
                    {staffLocked
                      ? <p style={{margin:0,fontSize:22,fontWeight:700,color:"rgba(255,255,255,0.30)",letterSpacing:2,fontFamily:"'Arimo',Arial,sans-serif"}}>● ● ● ●</p>
                      : <p style={{margin:0,fontSize:34,fontWeight:700,color:"white",letterSpacing:"-0.5px",textShadow:"0 1px 4px rgba(0,0,0,0.18)",fontFamily:"'Arimo',Arial,sans-serif"}}>{shop.id==="ros-india"
                          ? formatCurrency(shop.todaySales)
                          : "£"+formatNumber(shop.todaySales)}</p>
                    }
                  </div>
                </div>

                {/* ── white lower section ── */}
                <div style={{padding:"18px 20px 20px"}}>
                  {staffLocked?(
                    <div style={{textAlign:"center",padding:"12px 0 8px"}}>
                      <span style={{fontSize:18}}>🔒</span>
                      <p style={{margin:"6px 0 0",fontSize:11,fontWeight:700,color:"#94a3b8"}}>No Access</p>
                    </div>
                  ):(
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
                      {[{l:"Orders",v:shop.pendingOrders},{l:"Pending",v:shop.pendingOrders},{l:"Stock",v:shop.stockValue}].map((s,i)=>(
                        <div key={i} style={{textAlign:"center",background:shop.accentBg,borderRadius:10,padding:"9px 5px",border:"1px solid "+shop.accent+"18"}}>
                          <p style={{margin:0,fontWeight:900,fontSize:16,color:shop.accentText}}>{s.v}</p>
                          <p style={{margin:"2px 0 0",fontSize:10,color:shop.accent,fontWeight:700}}>{s.l}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <button disabled={staffLocked} style={{
                    width:"100%",padding:"12px 0",borderRadius:12,border:"none",
                    cursor:staffLocked?"not-allowed":"pointer",
                    background:staffLocked?"#f1f5f9":h?shop.sb:shop.accentBg,
                    color:staffLocked?"#cbd5e1":h?"white":shop.accentText,
                    fontWeight:800,fontSize:14,transition:"all 0.2s",fontFamily:"inherit",
                    boxShadow:(!staffLocked&&h)?"0 4px 14px "+shop.accent+"44":"none",
                  }}>
                    {staffLocked?"🔒 Restricted":"Enter Workspace →"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── LIFETIME STATS — admin only ── */}
        {user?.role!=="staff"&&(()=>{
          const ukSales=[...(SALES_SEED["ros-selections"]||[]),...(SALES_SEED["ros-hairlines"]||[])];
          const inSales=SALES_SEED["ros-india"]||[];
          const ukPurch=[...(PURCH_SEED["ros-selections"]||[]),...(PURCH_SEED["ros-hairlines"]||[])];
          const inPurch=PURCH_SEED["ros-india"]||[];
          const sumAmt=arr=>arr.reduce((a,x)=>a+(x.amount||0),0);
          const sumTot=arr=>arr.reduce((a,x)=>a+(x.total||0),0);
          const playBell=()=>{
            try{
              const ctx=new(window.AudioContext||window.webkitAudioContext)();
              const o=ctx.createOscillator();
              const g=ctx.createGain();
              o.connect(g); g.connect(ctx.destination);
              o.type="sine";
              o.frequency.setValueAtTime(880,ctx.currentTime);
              o.frequency.exponentialRampToValueAtTime(660,ctx.currentTime+0.15);
              g.gain.setValueAtTime(0.18,ctx.currentTime);
              g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.35);
              o.start(ctx.currentTime);
              o.stop(ctx.currentTime+0.35);
            }catch(e){}
          };
          const tiles=[
            {
              icon:"👥", label:"Total Customers", sub:"Lifetime · All Shops",
              display:CUSTOMERS.length.toString(), suffix:"",
              grad:"linear-gradient(135deg,#1d4ed8 0%,#3b82f6 50%,#60a5fa 100%)",
              glow:"rgba(59,130,246,0.35)", shine:"rgba(255,255,255,0.15)",
            },
            {
              icon:"🇬🇧", label:"Sales Volume UK", sub:"Selections + Hairlines",
              display:"£"+formatNumber(sumAmt(ukSales)), suffix:"lifetime",
              grad:"linear-gradient(135deg,#0e7490 0%,#06b6d4 50%,#67e8f9 100%)",
              glow:"rgba(6,182,212,0.35)", shine:"rgba(255,255,255,0.15)",
            },
            {
              icon:"🇮🇳", label:"Sales Volume India", sub:"ROS India",
              display:formatCurrency(sumAmt(inSales)), suffix:"lifetime",
              grad:"linear-gradient(135deg,#9d174d 0%,#e95597 50%,#f9a8d4 100%)",
              glow:"rgba(233,85,151,0.35)", shine:"rgba(255,255,255,0.15)",
            },
            {
              icon:"📦", label:"Purchases UK", sub:"Selections + Hairlines",
              display:"£"+formatNumber(sumTot(ukPurch)), suffix:"lifetime",
              grad:"linear-gradient(135deg,#5b21b6 0%,#7c3aed 50%,#a78bfa 100%)",
              glow:"rgba(124,58,237,0.35)", shine:"rgba(255,255,255,0.15)",
            },
            {
              icon:"🛒", label:"Purchases India", sub:"ROS India",
              display:formatCurrency(sumTot(inPurch)), suffix:"lifetime",
              grad:"linear-gradient(135deg,#92400e 0%,#d97706 50%,#fcd34d 100%)",
              glow:"rgba(217,119,6,0.35)", shine:"rgba(255,255,255,0.15)",
            },
          ];
          return(
            <div style={{marginBottom:0}}>
              {/* ── toggle header ── */}
              <div
                onClick={()=>setStatHov(statHov==="open"?"closed":"open")}
                style={{
                  display:"flex",alignItems:"center",justifyContent:"space-between",
                  background:"white",borderRadius:statHov==="open"?"16px 16px 0 0":"16px",
                  padding:"14px 22px",cursor:"pointer",
                  border:"1px solid #e2e8f0",
                  borderBottom:statHov==="open"?"1px solid #f1f5f9":"1px solid #e2e8f0",
                  boxShadow:"0 2px 8px rgba(0,0,0,0.05)",
                  transition:"border-radius 0.3s",
                  userSelect:"none",
                }}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>📊</div>
                  <div>
                    <p style={{margin:0,fontWeight:800,fontSize:14,color:"#0f172a",letterSpacing:"-0.2px"}}>Lifetime Business Overview</p>
                    <p style={{margin:0,fontSize:11,color:"#94a3b8",fontWeight:500}}>All-time totals across every workspace</p>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,fontWeight:700,color:"#64748b",background:"#f1f5f9",borderRadius:999,padding:"3px 10px"}}>
                    {statHov==="open"?"Hide":"Show"} Stats
                  </span>
                  <div style={{
                    width:28,height:28,borderRadius:"50%",background:"#f1f5f9",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:13,transition:"transform 0.3s",
                    transform:statHov==="open"?"rotate(180deg)":"rotate(0deg)",
                  }}>▼</div>
                </div>
              </div>

              {/* ── cards panel ── */}
              <div style={{
                overflow:"hidden",
                maxHeight:statHov==="open"?"260px":"0px",
                transition:"max-height 0.4s cubic-bezier(0.4,0,0.2,1)",
                background:"white",
                borderRadius:"0 0 16px 16px",
                border:statHov==="open"?"1px solid #e2e8f0":"none",
                borderTop:"none",
                boxShadow:statHov==="open"?"0 4px 16px rgba(0,0,0,0.06)":"none",
              }}>
                <div style={{
                  display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:16,
                  padding:"20px 20px 20px",
                }}>
                  {tiles.map((t,i)=>{
                    const isHov=hov==="stat-"+i;
                    return(
                      <div key={i}
                        onMouseEnter={()=>{setHov("stat-"+i);playBell();}}
                        onMouseLeave={()=>setHov(null)}
                        style={{
                          borderRadius:16,padding:"18px 16px 16px",
                          background:t.grad,
                          position:"relative",overflow:"hidden",
                          cursor:"default",
                          transform:isHov?"translateY(-4px) scale(1.03)":"none",
                          transition:"all 0.22s cubic-bezier(0.4,0,0.2,1)",
                          boxShadow:isHov
                            ?"0 16px 36px -4px "+t.glow+", 0 4px 12px rgba(0,0,0,0.10)"
                            :"0 4px 14px "+t.glow+", 0 1px 4px rgba(0,0,0,0.06)",
                        }}>
                        {/* decorative circles */}
                        <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:t.shine,pointerEvents:"none"}}/>
                        <div style={{position:"absolute",bottom:-14,left:-10,width:50,height:50,borderRadius:"50%",background:"rgba(255,255,255,0.08)",pointerEvents:"none"}}/>
                        {/* icon */}
                        <div style={{fontSize:22,marginBottom:10,filter:"drop-shadow(0 1px 3px rgba(0,0,0,0.2))"}}>{t.icon}</div>
                        {/* value */}
                        <p style={{
                          margin:"0 0 4px",fontSize:22,fontWeight:700,color:"white",
                          letterSpacing:"-0.5px",lineHeight:1,
                          fontFamily:"'Arimo',Arial,sans-serif",
                          textShadow:"0 1px 4px rgba(0,0,0,0.18)",
                        }}>{t.display}</p>
                        {/* label */}
                        <p style={{
                          margin:"0 0 2px",fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.95)",
                          fontFamily:"'Arimo',Arial,sans-serif",letterSpacing:"0.01em",
                        }}>{t.label}</p>
                        {/* sub */}
                        <p style={{margin:0,fontSize:10,color:"rgba(255,255,255,0.65)",fontWeight:500}}>{t.sub}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
</main>
<CommandPalette cmd={cmd} setCmd={setCmd} />
</div>
);
};
const ShopDashboard=({shopId,onBack,user,onLogout})=>{
  const [tab,setTab]=useState(user?.role==="staff"?"sales":"dashboard");
  const [hov,setHov]=useState(null);
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(null);
  const [selRow,setSelRow]=useState(null);
  const [editRow,setEditRow]=useState(null);
  const [selCustomer,setSelCustomer]=useState(null);
  const [openMenu,setOpenMenu]=useState(null);
  const [invoiceRow,setInvoiceRow]=useState(null);
  const [printMode,setPrintMode]=useState(false);
  // ── Invoice computed vars ──
  const _invTaxR    = invoiceRow ? ((invoiceRow.taxRate!==undefined?invoiceRow.taxRate:(shopId==="ros-india"?18:20))/100) : 0;
  const _invInc     = invoiceRow ? invoiceRow.taxInclusive!==false : true;
  const _invEntered = invoiceRow ? Number(invoiceRow.amount)||0 : 0;
  const invSubtotal = _invInc ? parseFloat((_invEntered/(1+_invTaxR)).toFixed(2)) : _invEntered;
  const invTaxAmt   = parseFloat((invSubtotal*_invTaxR).toFixed(2));
  const invGrand    = parseFloat((invSubtotal+invTaxAmt).toFixed(2));
  const isMobile=typeof window!=="undefined"&&window.innerWidth<768;
  const [coll,setColl]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [salesData,setSalesData]=useState(SALES_SEED);

  const shop=SHOPS.find(s=>s.id===shopId);
  const sales=salesData[shopId]||[];
  const purch=PURCH_SEED[shopId]||[];
  const exps=EXP_SEED[shopId]||[];
  const logs=LOG_SEED[shopId]||[];
  const lowStk=PRODUCTS.filter(p=>p.stock<=p.min);
  const totRev=sales.filter(s=>s.pay==="Paid").reduce((a,s)=>a+s.amount,0);
  const pendAmt=sales.filter(s=>s.pay==="Pending").reduce((a,s)=>a+s.amount,0);
  const totExp=exps.reduce((a,e)=>a+e.amount,0);

  const NAV=[
    {id:"dashboard",l:"Dashboard",ic:"⊞"},
    {id:"sales",    l:"Sales",    ic:"🛒"},
    {id:"purchases",l:"Purchases",ic:"📦"},
    {id:"logistics",l:"Logistics",ic:"🚚"},
    {id:"customers",l:"Customers",ic:"👥"},
    {id:"suppliers",l:"Suppliers",ic:"🏭"},
    {id:"agents",   l:"Agents",   ic:"🤝"},
    {id:"products", l:"Products", ic:"🏷️"},
    {id:"invoices", l:"Invoices", ic:"🧾"},
    {id:"expenses", l:"Expenses", ic:"💳"},
    {id:"documents",l:"Documents",ic:"📎"},
    {id:"analytics",l:"Analytics",ic:"📊"},
    {id:"reports",  l:"Reports",  ic:"📋"},
  ].filter(n=>(ROLE_NAV[user?.role||"admin"]||ROLE_NAV.admin).includes(n.id)).filter(n=>n.id!=="settings");

  const filtSales=sales.filter(s=>
    s.id.toLowerCase().includes(search.toLowerCase())||
    s.customer.toLowerCase().includes(search.toLowerCase())
  );

  const addSale=form=>{
    const pfx={["ros-selections"]:"SI",["ros-hairlines"]:"SH",["ros-india"]:"IN"}[shopId];
    const nid=form.invoiceNo||`${pfx}-${1060+sales.length}`;
    setSalesData(d=>({...d,[shopId]:[{
      id:nid, ...form,
      amount:      Number(form.amount)||0,
      taxRate:     form.taxRate!==undefined ? form.taxRate : (shopId==="ros-india"?18:20),
      taxInclusive:form.taxInclusive!==false,
      contact: form.contact||"",
      phone:   form.contact||"",
      address: form.address||"",
      qty:     form.qty||"1",
      item:    form.itemCustom||form.item||"",
      ful:     form.status||"PENDING",
      pay:     form.payBy||"SHOP",
      rem:     form.remarks||"",
    },...d[shopId]]}));
    setModal(null);
  };

  const TD=({ch,mono,fw,c})=><td style={{padding:"13px 16px",fontSize:13,color:c||"#374151",fontFamily:mono?"DM Mono,monospace":"inherit",fontWeight:fw||400}}>{ch}</td>;

  const [pdfMode,setPdfMode]=useState(false);
  const [salesPeriod,setSalesPeriodRaw]=useState("month");
  const setSalesPeriod=(p)=>{
    if(user?.role==="staff"&&(p==="year"||p==="lifetime"))return;
    setSalesPeriodRaw(p);
  };
  const [pdfInv,setPdfInv]=useState(null);
  const showPdf=(inv)=>{setPdfInv(inv);setPdfMode(true);};
  const invoicePrintRef=useRef(null);
  const handlePrint=useCallback((inv)=>{
    const el=document.getElementById('invoice-content');
    if(!el){
      // If pdfMode overlay not open yet, open it first then print
      setPdfInv(inv);
      setPdfMode(true);
      setTimeout(()=>{
        const el2=document.getElementById('invoice-content');
        if(!el2)return;
        const invoiceHTML=el2.outerHTML;
        const accentColor=inv._shop_accent||'#059669';
        const printWindow=window.open('','_blank');
        if(!printWindow){alert('Please allow popups for this site.');return;}
        printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Invoice ${inv.id}</title>
<style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  body{font-family:Arial,sans-serif;font-size:13px;padding:20px;background:white;color:#0f172a;margin:0;}
  img{max-height:48px;object-fit:contain;}
  table{width:100%;border-collapse:collapse;}
  th{background:#0f172a!important;color:#fff!important;padding:9px 13px;font-size:11px;font-weight:800;}
  td{padding:10px 13px;border-bottom:1px solid #e2e8f0;}
  div[style*="box-shadow"]{box-shadow:none!important;}
  @page{size:A4;margin:20mm;}
  @media print{body{padding:0;}}
</style></head><body>${invoiceHTML}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(()=>{
          printWindow.print();
          printWindow.onafterprint=()=>printWindow.close();
        },500);
      },400);
      return;
    }
    const invoiceHTML=el.outerHTML;
    const printWindow=window.open('','_blank');
    if(!printWindow){alert('Please allow popups for this site.');return;}
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Invoice ${inv.id}</title>
<style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  body{font-family:Arial,sans-serif;font-size:13px;padding:20px;background:white;color:#0f172a;margin:0;}
  img{max-height:48px;object-fit:contain;}
  table{width:100%;border-collapse:collapse;}
  th{background:#0f172a!important;color:#fff!important;padding:9px 13px;font-size:11px;font-weight:800;}
  td{padding:10px 13px;border-bottom:1px solid #e2e8f0;}
  div[style*="box-shadow"]{box-shadow:none!important;}
  @page{size:A4;margin:20mm;}
  @media print{body{padding:0;}}
</style></head><body>${invoiceHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(()=>{
      printWindow.print();
      printWindow.onafterprint=()=>printWindow.close();
    },500);
  },[shop,shopId]);


return(
    <div style={{display:"flex",minHeight:"100vh",background:"#f0f4f8",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&family=Arimo:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{`
        .sb-nav-btn:hover .sb-label{opacity:1!important;}
        .sb-nav-btn{position:relative;}
        .sb-tooltip{
          position:absolute;left:calc(100% + 10px);top:50%;transform:translateY(-50%);
          background:rgba(15,23,42,0.92);color:white;padding:4px 10px;border-radius:7px;
          font-size:11px;font-weight:700;white-space:nowrap;pointer-events:none;
          opacity:0;transition:opacity 0.15s;z-index:999;
          box-shadow:0 4px 12px rgba(0,0,0,0.25);
        }
        .sb-nav-btn:hover .sb-tooltip{opacity:1;}
        @media(max-width:768px){
          .mob-hide{display:none!important;}
          .mob-topbar{height:54px!important;padding:0 12px!important;}
          .mob-main{padding:10px 10px 80px!important;}
          .mob-quick-grid{grid-template-columns:repeat(3,1fr)!important;gap:8px!important;}
          .mob-quick-card-inner{padding:12px 6px 10px!important;}
          .mob-quick-icon{width:36px!important;height:36px!important;font-size:16px!important;margin-bottom:6px!important;}
          .mob-quick-label{font-size:10px!important;}
          .mob-quick-desc{display:none!important;}
          .mob-kpi-grid{grid-template-columns:repeat(2,1fr)!important;gap:10px!important;}
          .mob-kpi-card{aspect-ratio:unset!important;min-height:130px!important;border-radius:14px!important;}
          .mob-table-wrap{overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;}
          .mob-selector-header{height:auto!important;padding:8px 12px!important;flex-wrap:wrap!important;gap:6px!important;}
          .mob-selector-right{gap:6px!important;}
          .mob-shop-grid{grid-template-columns:1fr!important;gap:14px!important;}
          .mob-shop-card-top{padding:18px 16px 14px!important;}
          .mob-shop-name{font-size:18px!important;}
          .mob-stats-grid{grid-template-columns:repeat(2,1fr)!important;}
          .mob-hero-title{font-size:26px!important;letter-spacing:-0.5px!important;}
          .mob-hero-sub{font-size:13px!important;}
          .mob-hero-section{margin-bottom:24px!important;}
          .mob-main-padding{padding:20px 14px 60px!important;}
        }
      `}</style>

      {/* ══ MOBILE OVERLAY BACKDROP ══ */}
      {isMobile&&mobileOpen&&(
        <div onClick={()=>setMobileOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:39}}/>
      )}

      {/* ══ SIDEBAR ══ */}
      <aside style={{
        width:isMobile?260:(coll?72:240),
        transition:"transform 0.28s cubic-bezier(0.4,0,0.2,1),width 0.28s cubic-bezier(0.4,0,0.2,1)",
        background:shop.sb,
        display:"flex",flexDirection:"column",
        position:isMobile?"fixed":"sticky",
        top:0,left:0,height:"100vh",flexShrink:0,zIndex:40,
        overflow:"hidden",
        boxShadow:"4px 0 24px rgba(0,0,0,0.22)",
        transform:isMobile?(mobileOpen?"translateX(0)":"translateX(-100%)"):"none",
      }}>

        {/* ── brand / logo area ── */}
        <div style={{
          padding:"0 12px",height:64,
          display:"flex",alignItems:"center",
          justifyContent:coll?"center":"space-between",
          borderBottom:"1px solid rgba(255,255,255,0.12)",
          flexShrink:0,
        }}>
          <div style={{display:"flex",alignItems:"center",gap:10,overflow:"hidden"}}>
            {/* logo badge */}
            {/* logo badge — unique per shop */}
            <ShopLogo shopId={shop.id} size="sidebar" />
            {/* name — fades out when collapsed */}
            <div style={{
              overflow:"hidden",
              maxWidth:coll?0:160,
              opacity:coll?0:1,
              transition:"max-width 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.20s",
              whiteSpace:"nowrap",
            }}>
              <p style={{margin:0,fontWeight:800,fontSize:13,color:"white",letterSpacing:"-0.2px",lineHeight:1.2}}>{shop.name}</p>
              <p style={{margin:0,fontSize:9,color:"rgba(255,255,255,0.50)",fontWeight:500,letterSpacing:"0.04em",textTransform:"uppercase"}}>{shop.currency} · {shop.flag}</p>
            </div>
          </div>
          {/* collapse toggle — only when expanded */}
          {!coll&&(
            <button onClick={()=>setColl(true)}
              style={{
                width:26,height:26,borderRadius:8,border:"1px solid rgba(255,255,255,0.20)",
                background:"rgba(255,255,255,0.10)",cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",
                color:"rgba(255,255,255,0.70)",fontSize:12,flexShrink:0,
                transition:"all 0.15s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.22)";e.currentTarget.style.color="white";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.10)";e.currentTarget.style.color="rgba(255,255,255,0.70)";}}>
              ‹‹
            </button>
          )}
          {/* expand button when collapsed */}
          {coll&&(
            <button onClick={()=>setColl(false)}
              style={{
                position:"absolute",bottom:-1,left:0,right:0,height:28,
                border:"none",borderTop:"1px solid rgba(255,255,255,0.12)",
                background:"rgba(255,255,255,0.07)",cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",
                color:"rgba(255,255,255,0.60)",fontSize:11,
                transition:"all 0.15s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.15)";e.currentTarget.style.color="white";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.07)";e.currentTarget.style.color="rgba(255,255,255,0.60)";}}>
              ››
            </button>
          )}
        </div>

        {/* ── nav sections ── */}
        <nav style={{flex:1,padding:"10px 8px 6px",overflowY:"auto",overflowX:"hidden",scrollbarWidth:"none"}}>
          {/* group labels */}
          {[
            {label:"MAIN",    ids:["dashboard","sales","purchases"]},
            {label:"MANAGE",  ids:["logistics","customers","suppliers","agents","products"]},
            {label:"FINANCE", ids:["invoices","expenses"]},
            {label:"INSIGHTS",ids:["documents","analytics","reports"]},
          ].map(group=>{
            const groupItems=NAV.filter(n=>group.ids.includes(n.id));
            if(groupItems.length===0)return null;
            return(
              <div key={group.label} style={{marginBottom:6}}>
                {/* section label — hidden when collapsed */}
                <div style={{
                  overflow:"hidden",
                  maxHeight:coll?0:20,
                  opacity:coll?0:1,
                  transition:"max-height 0.25s, opacity 0.20s",
                  marginBottom:coll?0:4,
                  paddingLeft:10,
                }}>
                  <span style={{fontSize:9,fontWeight:800,color:"rgba(255,255,255,0.58)",letterSpacing:"0.10em",textTransform:"uppercase"}}>
                    {group.label}
                  </span>
                </div>
                {/* nav buttons */}
                {groupItems.map(n=>{
                  const active=tab===n.id;
                  return(
                    <button key={n.id}
                      className="sb-nav-btn"
                      onClick={()=>{setTab(n.id);if(isMobile)setMobileOpen(false);}}
                      style={{
                        display:"flex",alignItems:"center",
                        gap:coll?0:10,
                        width:"100%",
                        height:40,
                        padding:coll?"0":"0 10px",
                        justifyContent:coll?"center":"flex-start",
                        borderRadius:10,
                        border:active?"1px solid rgba(255,255,255,0.30)":"1px solid transparent",
                        cursor:"pointer",
                        marginBottom:2,
                        position:"relative",
                        background:active?"rgba(255,255,255,0.28)":"transparent",
                        boxShadow:active?"0 2px 12px rgba(0,0,0,0.18),inset 0 1px 0 rgba(255,255,255,0.20)":"none",
                        transition:"all 0.15s",
                        fontFamily:"inherit",
                      }}
                      onMouseEnter={e=>{
                        if(!active){
                          e.currentTarget.style.background="rgba(255,255,255,0.15)";
                          e.currentTarget.style.border="1px solid rgba(255,255,255,0.18)";
                        }
                      }}
                      onMouseLeave={e=>{
                        if(!active){
                          e.currentTarget.style.background="transparent";
                          e.currentTarget.style.border="1px solid transparent";
                        }
                      }}>

                      {/* active pill indicator */}
                      {active&&(
                        <div style={{
                          position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",
                          width:4,height:24,borderRadius:"0 4px 4px 0",
                          background:"white",
                          boxShadow:"0 0 10px rgba(255,255,255,0.9)",
                        }}/>
                      )}

                      {/* icon container */}
                      <div style={{
                        width:32,height:32,borderRadius:9,flexShrink:0,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        background:active?"rgba(255,255,255,0.22)":"transparent",
                        transition:"background 0.15s",
                        fontSize:16,
                      }}>
                        {n.ic}
                      </div>

                      {/* label */}
                      <span className="sb-label" style={{
                        fontSize:13,
                        fontWeight:active?800:600,
                        color:"#ffffff",
                        whiteSpace:"nowrap",overflow:"hidden",
                        maxWidth:coll?0:140,
                        opacity:coll?0:active?1:0.85,
                        transition:"max-width 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.18s",
                        letterSpacing:active?"-0.2px":"0",
                        textShadow:active?"0 1px 4px rgba(0,0,0,0.20)":"none",
                      }}>{n.l}</span>

                      {/* tooltip when collapsed */}
                      {coll&&<div className="sb-tooltip">{n.l}</div>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* ── user info + all shops footer ── */}
        <div style={{padding:"8px",borderTop:"1px solid rgba(255,255,255,0.12)",flexShrink:0}}>
          {/* user row */}
          <div style={{
            display:"flex",alignItems:"center",gap:9,
            padding:coll?"8px 0":"8px 10px",
            justifyContent:coll?"center":"flex-start",
            borderRadius:10,
            background:"rgba(255,255,255,0.08)",
            marginBottom:6,
            overflow:"hidden",
          }}>
            <div style={{
              width:30,height:30,borderRadius:9,flexShrink:0,
              background:user?.avatar||"rgba(255,255,255,0.25)",
              display:"flex",alignItems:"center",justifyContent:"center",
              color:"white",fontWeight:800,fontSize:11,
              boxShadow:"0 2px 6px rgba(0,0,0,0.20)",
            }}>{user?.initials||"A"}</div>
            <div style={{
              overflow:"hidden",
              maxWidth:coll?0:140,opacity:coll?0:1,
              transition:"max-width 0.28s cubic-bezier(0.4,0,0.2,1),opacity 0.18s",
              whiteSpace:"nowrap",
            }}>
              <p style={{margin:0,fontSize:12,fontWeight:700,color:"white",lineHeight:1.3}}>{user?.name||"Admin"}</p>
              <p style={{margin:0,fontSize:9,color:"rgba(255,255,255,0.45)",textTransform:"capitalize",fontWeight:500}}>{user?.role==="staff"?"Staff":"Administrator"}</p>
            </div>
          </div>

          {/* all shops button */}
          <button onClick={onBack}
            className="sb-nav-btn"
            style={{
              display:"flex",alignItems:"center",gap:9,
              width:"100%",height:40,
              padding:coll?"0":"0 10px",
              justifyContent:coll?"center":"flex-start",
              borderRadius:10,border:"1px solid rgba(255,255,255,0.18)",
              cursor:"pointer",
              background:"rgba(255,255,255,0.10)",
              color:"white",fontSize:13,fontWeight:700,
              fontFamily:"inherit",
              transition:"all 0.15s",
              overflow:"hidden",
            }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.20)";e.currentTarget.style.borderColor="rgba(255,255,255,0.35)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.10)";e.currentTarget.style.borderColor="rgba(255,255,255,0.18)";}}>
            <span style={{fontSize:16,flexShrink:0}}>🏪</span>
            <span style={{
              maxWidth:coll?0:140,opacity:coll?0:1,
              transition:"max-width 0.28s cubic-bezier(0.4,0,0.2,1),opacity 0.18s",
              whiteSpace:"nowrap",overflow:"hidden",
            }}>All Shops</span>
            <span style={{
              marginLeft:"auto",fontSize:13,opacity:0.60,flexShrink:0,
              maxWidth:coll?0:20,overflow:"hidden",
              transition:"max-width 0.28s",
            }}>↩</span>
            {coll&&<div className="sb-tooltip">All Shops</div>}
          </button>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>

        {/* topbar */}
        <header className="mob-topbar" style={{
          background:"linear-gradient(90deg,"+shop.accent+"18 0%,white 40%)",
          borderBottom:"1px solid "+shop.accent+"22",
          height:64,display:"flex",alignItems:"center",padding:"0 28px",
          justifyContent:"space-between",position:"sticky",top:0,zIndex:30,
          boxShadow:"0 2px 12px "+shop.accent+"14",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <button onClick={()=>isMobile?setMobileOpen(o=>!o):setColl(c=>!c)}
              style={{width:36,height:36,borderRadius:10,border:"1px solid "+shop.accent+"33",background:shop.accentBg,cursor:"pointer",fontSize:15,color:shop.accent,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.background=shop.accent;e.currentTarget.style.color="white";}}
              onMouseLeave={e=>{e.currentTarget.style.background=shop.accentBg;e.currentTarget.style.color=shop.accent;}}>
              ☰
            </button>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:3,height:28,borderRadius:999,background:shop.sb}}/>
              <div>
                <h1 style={{margin:0,fontSize:16,fontWeight:900,color:"#0f172a",letterSpacing:"-0.01em"}}>{NAV.find(n=>n.id===tab)?.l||"Dashboard"}</h1>
                <p style={{margin:0,fontSize:11,color:"#94a3b8",fontWeight:500}}>{shop.name} · {shop.currency}</p>
              </div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {/* ROS Nexus credit - hidden on mobile */}
            <span className="mob-hide" style={{fontSize:10,fontWeight:600,color:shop.accent+"99",letterSpacing:"0.04em",marginRight:4,whiteSpace:"nowrap"}}>
              Developed by <strong style={{fontWeight:800,color:shop.accent}}>ROS Nexus</strong>
            </span>
            {/* Search - hidden on mobile */}
            <div className="mob-hide" style={{display:"flex",alignItems:"center",gap:8,background:"white",border:"1px solid "+shop.accent+"33",borderRadius:12,padding:"8px 14px",transition:"all 0.2s"}}
              onFocus={e=>{e.currentTarget.style.border="1px solid "+shop.accent+"66";e.currentTarget.style.boxShadow="0 0 0 3px "+shop.accent+"15";}}
              onBlur={e=>{e.currentTarget.style.border="1px solid "+shop.accent+"33";e.currentTarget.style.boxShadow="none";}}>
              <span style={{color:shop.accent,fontSize:13}}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
                style={{border:"none",background:"transparent",outline:"none",fontSize:13,color:"#374151",width:140,fontFamily:"inherit"}}/>
            </div>
            {/* Notification bell */}
            <button style={{position:"relative",width:38,height:38,borderRadius:11,border:"1px solid "+shop.accent+"33",background:shop.accentBg,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.background=shop.accent;e.currentTarget.style.borderColor=shop.accent;}}
              onMouseLeave={e=>{e.currentTarget.style.background=shop.accentBg;e.currentTarget.style.borderColor=shop.accent+"33";}}>
              🔔
              <span style={{position:"absolute",top:8,right:8,width:7,height:7,background:"#ef4444",borderRadius:"50%",border:"2px solid white"}}/>
            </button>
            {/* User avatar + logout */}
            <div style={{display:"flex",alignItems:"center",gap:8,background:"white",border:"1px solid "+shop.accent+"33",borderRadius:12,padding:"5px 10px 5px 5px",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}
              onClick={onLogout}
              title="Click to logout"
              onMouseEnter={e=>{e.currentTarget.style.background=shop.accentBg;}}
              onMouseLeave={e=>{e.currentTarget.style.background="white";}}>
              <div style={{width:30,height:30,borderRadius:9,background:user?.avatar||shop.sb,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800,fontSize:12,flexShrink:0}}>
                {user?.initials||"A"}
              </div>
              <div className="mob-hide">
                <p style={{margin:0,fontSize:12,fontWeight:700,color:"#0f172a",lineHeight:1.2}}>{user?.name||"Admin"}</p>
                <p style={{margin:0,fontSize:9,color:shop.accent,fontWeight:600,textTransform:"capitalize"}}>{user?.role==="staff"?"Staff":"Admin"} · Logout</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mob-main" style={{flex:1,padding:24,overflowY:"auto"}}>

          {/* ─── DASHBOARD ─── */}
          {tab==="dashboard"&&(()=>{
            const now=new Date();
            const todayStr=now.toISOString().slice(0,10);
            const curMonth=now.getMonth();
            const curYear=now.getFullYear();
            // UK financial year: Apr 6 – Apr 5
            const fyStart=now.getMonth()<3||(now.getMonth()===3&&now.getDate()<6)
              ? new Date(curYear-1,3,6) : new Date(curYear,3,6);

            const isSameDay=d=>d===todayStr;
            const isSameMonth=d=>{const dt=new Date(d);return dt.getMonth()===curMonth&&dt.getFullYear()===curYear;};
            const isInFY=d=>new Date(d)>=fyStart;

            const todaySales   =sales.filter(s=>isSameDay(s.date)).reduce((a,s)=>a+(s.amount||0),0);
            const monthSales   =sales.filter(s=>isSameMonth(s.date)).reduce((a,s)=>a+(s.amount||0),0);
            const fySales      =sales.filter(s=>isInFY(s.date)).reduce((a,s)=>a+(s.amount||0),0);
            const pendingOrders=sales.filter(s=>s.pay==="Pending"||s.ful==="New"||s.ful==="Processing").length;
            const monthReturns =sales.filter(s=>isSameMonth(s.date)&&(s.ful==="RETURN REQUESTED"||s.ful==="RETURNED"||s.ful==="EXCHANGED")).length;
            const monthRefunds =sales.filter(s=>isSameMonth(s.date)&&(s.ful==="REFUNDED")).reduce((a,s)=>a+(s.refundAmt||0),0);

            const monthCount=sales.filter(s=>isSameMonth(s.date)).length;
            const fyCount=sales.filter(s=>isInFY(s.date)).length;
            const kpis=[
              {
                icon:"🛒", label:"Today's Sales", sub:"Live · "+todayStr,
                value:fmt(shopId,todaySales),
                accent:"#3b82f6", dark:"#1d4ed8",
                grad:"linear-gradient(145deg,#1e3a8a 0%,#1d4ed8 45%,#3b82f6 100%)",
                glow:"rgba(59,130,246,0.45)",
                trend:"up", trendVal:todaySales>0?"+active":"—",
                tagGreen:todaySales>0, tag:todaySales>0?"● Live":"○ No Sales",
                progress:Math.min(100,Math.round((todaySales/(shop.todaySales||1))*100)),
              },
              {
                icon:"📅", label:"Monthly Sales", sub:now.toLocaleString("default",{month:"long",year:"numeric"}),
                value:fmt(shopId,monthSales),
                accent:"#06b6d4", dark:"#0e7490",
                grad:"linear-gradient(145deg,#164e63 0%,#0e7490 45%,#06b6d4 100%)",
                glow:"rgba(6,182,212,0.45)",
                trend:"up", trendVal:monthCount+" orders",
                tagGreen:true, tag:monthCount+" Orders",
                progress:Math.min(100,Math.round((monthSales/(shop.monthRevenue||1))*100)),
              },
              {
                icon:"📈", label:"Financial Year", sub:"Apr "+fyStart.getFullYear()+" – Mar "+(fyStart.getFullYear()+1),
                value:fmt(shopId,fySales),
                accent:"#10b981", dark:"#065f46",
                grad:"linear-gradient(145deg,#064e3b 0%,#065f46 45%,#059669 100%)",
                glow:"rgba(5,150,105,0.45)",
                trend:"up", trendVal:fyCount+" orders",
                tagGreen:true, tag:fyCount+" Orders",
                progress:Math.min(100,Math.round((fySales/((shop.monthRevenue||1)*12))*100)),
              },
              {
                icon:"⏳", label:"Pending Orders", sub:"Awaiting fulfilment",
                value:pendingOrders.toString(),
                accent:"#f59e0b", dark:"#92400e",
                grad:"linear-gradient(145deg,#78350f 0%,#92400e 45%,#d97706 100%)",
                glow:"rgba(217,119,6,0.45)",
                trend:pendingOrders>0?"warn":"ok", trendVal:pendingOrders>0?"Needs action":"All clear",
                tagGreen:pendingOrders===0, tag:pendingOrders>0?"⚠ Action":"✓ Clear",
                progress:Math.min(100,pendingOrders*20),
              },
              {
                icon:"↩️", label:"Returns This Month", sub:"Returned / Exchanged",
                value:monthReturns.toString(),
                accent:"#e95597", dark:"#9d174d",
                grad:"linear-gradient(145deg,#831843 0%,#9d174d 45%,#e95597 100%)",
                glow:"rgba(233,85,151,0.45)",
                trend:monthReturns>0?"warn":"ok", trendVal:monthReturns===0?"None this month":monthReturns+" return"+(monthReturns>1?"s":""),
                tagGreen:monthReturns===0, tag:monthReturns===0?"✓ None":"↩ Returned",
                progress:Math.min(100,monthReturns*25),
              },
              {
                icon:"💸", label:"Refunds This Month", sub:"Total refunded value",
                value:monthRefunds>0?fmt(shopId,monthRefunds):"—",
                accent:"#a78bfa", dark:"#5b21b6",
                grad:"linear-gradient(145deg,#2e1065 0%,#5b21b6 45%,#7c3aed 100%)",
                glow:"rgba(124,58,237,0.45)",
                trend:monthRefunds>0?"warn":"ok", trendVal:monthRefunds===0?"None this month":"Refunded",
                tagGreen:monthRefunds===0, tag:monthRefunds===0?"✓ None":"💸 Issued",
                progress:Math.min(100,monthRefunds>0?60:0),
              },
            ];

            const quickActions=[
              {l:"New Sale",      ic:"🛒", desc:"Record a sale",       g:shop.quickCards[0].g, action:()=>setModal("new-sale")},
              {l:"New Purchase",  ic:"📦", desc:"Log a purchase",      g:shop.quickCards[1].g, action:()=>setModal("new-purchase")},
              {l:"Add Customer",  ic:"👤", desc:"Register customer",   g:shop.quickCards[2].g, action:()=>setTab("customers")},
              {l:"Add Product",   ic:"➕", desc:"List a product",      g:shop.quickCards[3].g, action:()=>setTab("products")},
              {l:"Record Expense",ic:"💳", desc:"Log an expense",      g:shop.quickCards[4].g, action:()=>setTab("expenses")},
              {l:"Gen. Report",   ic:"📋", desc:"View reports",        g:shop.quickCards[5].g, action:()=>setTab("reports")},
            ];

            return(
              <div>
                {/* ── QUICK ACTION CARDS ── */}
                <div className="mob-quick-grid" style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,marginBottom:24}}>
                  {quickActions.map((q,i)=>{
                    const isH=hov==="qa-"+i;
                    return(
                      <div key={i}
                        onClick={q.action}
                        onMouseEnter={()=>setHov("qa-"+i)}
                        onMouseLeave={()=>setHov(null)}
                        style={{
                          borderRadius:16,overflow:"hidden",cursor:"pointer",
                          background:q.g,position:"relative",
                          transform:isH?"translateY(-4px) scale(1.04)":"translateY(0) scale(1)",
                          transition:"all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                          boxShadow:isH
                            ?"0 14px 28px -4px rgba(0,0,0,0.25),0 4px 10px rgba(0,0,0,0.12)"
                            :"0 3px 10px rgba(0,0,0,0.12)",
                        }}>
                        {/* shimmer overlay on hover */}
                        <div style={{
                          position:"absolute",inset:0,
                          background:isH?"linear-gradient(135deg,rgba(255,255,255,0.18) 0%,transparent 60%)":"transparent",
                          transition:"background 0.2s",pointerEvents:"none",zIndex:0,
                        }}/>
                        {/* mesh dots */}
                        <div style={{
                          position:"absolute",inset:0,zIndex:0,pointerEvents:"none",
                          backgroundImage:"radial-gradient(rgba(255,255,255,0.12) 1px,transparent 1px)",
                          backgroundSize:"14px 14px",
                        }}/>
                        <div className="mob-quick-card-inner" style={{position:"relative",zIndex:1,padding:"16px 12px 14px",textAlign:"center"}}>
                          {/* icon circle */}
                          <div className="mob-quick-icon" style={{
                            width:44,height:44,borderRadius:"50%",margin:"0 auto 10px",
                            background:"rgba(255,255,255,0.20)",
                            backdropFilter:"blur(6px)",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:20,
                            boxShadow:"0 2px 8px rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.25)",
                            transform:isH?"scale(1.12)":"scale(1)",
                            transition:"transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                          }}>{q.ic}</div>
                          {/* label */}
                          <p className="mob-quick-label" style={{
                            margin:"0 0 2px",fontSize:11,fontWeight:800,color:"white",
                            letterSpacing:"0.04em",textTransform:"uppercase",
                            fontFamily:"'Arimo',Arial,sans-serif",
                            textShadow:"0 1px 4px rgba(0,0,0,0.20)",
                          }}>{q.l}</p>
                          {/* desc */}
                          <p className="mob-quick-desc" style={{
                            margin:0,fontSize:9,color:"rgba(255,255,255,0.65)",
                            fontWeight:500,
                          }}>{q.desc}</p>
                        </div>
                        {/* bottom accent line */}
                        <div style={{
                          height:3,
                          background:isH?"rgba(255,255,255,0.55)":"rgba(255,255,255,0.20)",
                          transition:"background 0.2s",
                        }}/>
                      </div>
                    );
                  })}
                </div>

                {/* ── 6 KPI CARDS — 9:16 portrait ratio ── */}
                <div className="mob-kpi-grid" style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:14,marginBottom:28}}>
                  {kpis.map((k,i)=>{
                    const isH=hov==="kpi-"+i;
                    return(
                      <div key={i} className="mob-kpi-card"
                        onMouseEnter={()=>setHov("kpi-"+i)}
                        onMouseLeave={()=>setHov(null)}
                        style={{
                          borderRadius:18,overflow:"hidden",
                          background:k.grad,
                          position:"relative",
                          cursor:"default",
                          aspectRatio:"9/16",
                          display:"flex",flexDirection:"column",
                          transform:isH?"translateY(-6px) scale(1.03)":"translateY(0) scale(1)",
                          transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                          boxShadow:isH
                            ?"0 22px 44px -8px "+k.glow+",0 6px 18px rgba(0,0,0,0.14)"
                            :"0 5px 18px "+k.glow+",0 2px 5px rgba(0,0,0,0.07)",
                        }}>

                        {/* mesh grid overlay */}
                        <div style={{
                          position:"absolute",inset:0,zIndex:0,pointerEvents:"none",
                          backgroundImage:"radial-gradient(rgba(255,255,255,0.10) 1px,transparent 1px)",
                          backgroundSize:"16px 16px",
                        }}/>

                        {/* glowing orb bottom-right */}
                        <div style={{
                          position:"absolute",bottom:-50,right:-50,width:130,height:130,
                          borderRadius:"50%",background:"rgba(255,255,255,0.07)",
                          pointerEvents:"none",zIndex:0,filter:"blur(24px)",
                        }}/>

                        {/* glowing orb top-left */}
                        <div style={{
                          position:"absolute",top:-30,left:-30,width:90,height:90,
                          borderRadius:"50%",background:"rgba(255,255,255,0.09)",
                          pointerEvents:"none",zIndex:0,filter:"blur(18px)",
                        }}/>

                        {/* large watermark icon */}
                        <div style={{
                          position:"absolute",bottom:20,right:-8,fontSize:72,lineHeight:1,
                          opacity:isH?0.20:0.08,pointerEvents:"none",zIndex:0,
                          transition:"opacity 0.3s,transform 0.3s",
                          transform:isH?"scale(1.12) rotate(-8deg)":"scale(1) rotate(0deg)",
                        }}>{k.icon}</div>

                        {/* ── TOP SECTION: icon + tag ── */}
                        <div style={{position:"relative",zIndex:1,padding:"16px 14px 0",flex:"0 0 auto"}}>
                          {/* status tag top-right */}
                          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
                            <span style={{
                              fontSize:9,fontWeight:800,padding:"3px 9px",borderRadius:999,
                              background:k.tagGreen?"rgba(255,255,255,0.20)":"rgba(220,38,38,0.35)",
                              color:"white",letterSpacing:"0.06em",textTransform:"uppercase",
                              border:"1px solid rgba(255,255,255,0.18)",
                              backdropFilter:"blur(4px)",
                            }}>{k.tag}</span>
                          </div>

                          {/* icon badge */}
                          <div style={{
                            width:46,height:46,borderRadius:14,marginBottom:16,
                            background:"rgba(255,255,255,0.16)",
                            backdropFilter:"blur(10px)",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:22,
                            boxShadow:"0 4px 12px rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.25)",
                            transform:isH?"scale(1.08)":"scale(1)",
                            transition:"transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                          }}>{k.icon}</div>
                        </div>

                        {/* ── MIDDLE SECTION: value + label + sub ── */}
                        <div style={{position:"relative",zIndex:1,padding:"0 14px",flex:"1 1 auto",display:"flex",flexDirection:"column",justifyContent:"center"}}>
                          {/* value */}
                          <p style={{
                            margin:"0 0 4px",
                            fontSize:k.value.length>7?18:24,
                            fontWeight:800,color:"white",
                            letterSpacing:"-0.5px",lineHeight:1,
                            fontFamily:"'Arimo',Arial,sans-serif",
                            textShadow:"0 2px 10px rgba(0,0,0,0.25)",
                          }}>{k.value}</p>

                          {/* label */}
                          <p style={{
                            margin:"0 0 3px",fontSize:12,fontWeight:700,
                            color:"rgba(255,255,255,0.95)",
                            fontFamily:"'Arimo',Arial,sans-serif",
                            letterSpacing:"0.01em",lineHeight:1.3,
                          }}>{k.label}</p>

                          {/* sub */}
                          <p style={{
                            margin:0,fontSize:9,
                            color:"rgba(255,255,255,0.52)",fontWeight:500,
                            lineHeight:1.4,
                          }}>{k.sub}</p>
                        </div>

                        {/* ── BOTTOM SECTION: divider + trend + progress ── */}
                        <div style={{position:"relative",zIndex:1,flex:"0 0 auto"}}>
                          {/* divider */}
                          <div style={{height:"1px",background:"rgba(255,255,255,0.12)",margin:"0 14px 10px"}}/>

                          {/* trend row */}
                          <div style={{display:"flex",alignItems:"center",gap:5,padding:"0 14px 12px"}}>
                            <span style={{
                              fontSize:10,fontWeight:800,
                              color:k.trend==="up"?"#86efac":k.trend==="ok"?"#86efac":"#fca5a5",
                            }}>
                              {k.trend==="up"?"▲":k.trend==="ok"?"✓":"▼"}
                            </span>
                            <span style={{fontSize:10,color:"rgba(255,255,255,0.65)",fontWeight:600,lineHeight:1.3}}>{k.trendVal}</span>
                          </div>

                          {/* progress bar */}
                          <div style={{height:4,background:"rgba(0,0,0,0.22)"}}>
                            <div style={{
                              height:"100%",
                              width:isH?k.progress+"%":"0%",
                              background:"rgba(255,255,255,0.60)",
                              borderRadius:"0 3px 3px 0",
                              transition:"width 0.65s cubic-bezier(0.4,0,0.2,1) 0.08s",
                              boxShadow:"0 0 10px rgba(255,255,255,0.55)",
                            }}/>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* ── RECENT SALES TABLE ── */}
                <div style={{background:"white",borderRadius:16,border:"1px solid #f1f5f9",boxShadow:"0 2px 10px rgba(0,0,0,0.05)",marginBottom:24,overflow:"hidden"}}>
                  <div style={{padding:"16px 20px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div>
                      <p style={{margin:0,fontWeight:800,fontSize:15,color:"#0f172a"}}>Recent Sales</p>
                      <p style={{margin:0,fontSize:11,color:"#94a3b8",fontWeight:500}}>Latest {Math.min(5,sales.length)} transactions</p>
                    </div>
                    <button onClick={()=>setTab("sales")} style={{fontSize:12,fontWeight:700,color:shop.accent,background:shop.accentBg,border:"1px solid "+shop.accent+"33",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontFamily:"inherit"}}>View All →</button>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead>
                      <tr style={{background:"#f8fafc"}}>
                        {["ID","Customer","Amount","Status","Date"].map(h=>(
                          <th key={h} style={{padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sales.slice(0,5).map((s,i)=>(
                        <tr key={s.id} style={{borderTop:"1px solid #f1f5f9",background:i%2===0?"white":"#fafafa"}}>
                          <td style={{padding:"11px 16px",fontSize:12,fontWeight:700,color:shop.accent}}>{s.id}</td>
                          <td style={{padding:"11px 16px",fontSize:13,color:"#374151",fontWeight:600}}>{s.customer}</td>
                          <td style={{padding:"11px 16px",fontSize:13,fontWeight:800,color:"#0f172a"}}>{fmt(shopId,s.amount)}</td>
                          <td style={{padding:"11px 16px"}}><Badge l={s.pay}/></td>
                          <td style={{padding:"11px 16px",fontSize:12,color:"#94a3b8"}}>{s.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── LOW STOCK ALERT ── */}
                {lowStk.length>0&&(
                  <div style={{background:"#fff7ed",borderRadius:14,border:"1px solid #fed7aa",padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:22}}>⚠️</span>
                    <div>
                      <p style={{margin:0,fontWeight:800,fontSize:13,color:"#c2410c"}}>{lowStk.length} product{lowStk.length>1?"s":""} low on stock</p>
                      <p style={{margin:0,fontSize:11,color:"#ea580c"}}>{lowStk.map(p=>p.name).join(" · ")}</p>
                    </div>
                    <button onClick={()=>setTab("products")} style={{marginLeft:"auto",fontSize:12,fontWeight:700,color:"#c2410c",background:"white",border:"1px solid #fed7aa",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontFamily:"inherit"}}>View Products →</button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ─── SALES ─── */}
          {tab==="sales"&&(
            <SalesPanel
              Badge={Badge}
              customers={CUSTOMERS}
              filtSales={filtSales}
              fmt={fmt}
              formatDate={formatDate}
              openMenu={openMenu}
              search={search}
              sales={sales}
              salesPeriod={salesPeriod}
              setEditRow={setEditRow}
              setInvoiceRow={setInvoiceRow}
              setModal={setModal}
              setOpenMenu={setOpenMenu}
              setSalesData={setSalesData}
              setSearch={setSearch}
              setSelCustomer={setSelCustomer}
              setSelRow={setSelRow}
              setSalesPeriod={setSalesPeriod}
              shop={shop}
              shopId={shopId}
              TD={TD}
              user={user}
              isStaff={user?.role==="staff"}
            />
          )}

          {/* ─── PURCHASES ─── */}
          {tab==="purchases"&&(
            <PurchasesPanel
              Badge={Badge}
              fmt={fmt}
              onExport={()=>setModal("export-purchases")}
              onImport={()=>setModal("import-purchases")}
              onNewPurchase={()=>setModal("new-purchase")}
              purch={purch}
              shop={shop}
              shopId={shopId}
            />
          )}

          {/* ─── CUSTOMERS ─── */}
          {tab==="customers"&&(
            <CustomersPanel Badge={Badge} customers={CUSTOMERS} search={search} shop={shop}/>
          )}

          {/* ─── SUPPLIERS ─── */}
          {tab==="suppliers"&&(
            <SuppliersPanel shop={shop} suppliers={SUPPLIERS}/>
          )}

          {/* ─── PRODUCTS ─── */}
          {tab==="products"&&(
            <ProductsPanel lowStk={lowStk} products={PRODUCTS} shop={shop}/>
          )}

          {/* ─── LOGISTICS ─── */}
          {tab==="logistics"&&(
            <LogisticsPanel logs={logs} onNewShipment={()=>setModal("new-shipment")} shop={shop}/>
          )}

          {/* ─── AGENTS ─── */}
          {tab==="agents"&&(
            <AgentsPanel agents={AGENTS} shop={shop}/>
          )}

          {/* ─── EXPENSES ─── */}
          {tab==="expenses"&&(
            <ExpensesPanel exps={exps} fmt={fmt} shop={shop} shopId={shopId} totExp={totExp}/>
          )}

          {/* ─── DOCUMENTS ─── */}
          {tab==="documents"&&(
            <DocumentsPanel shop={shop}/>
          )}

          {tab==="analytics"&&(
            <AnalyticsPanel
              customers={CUSTOMERS}
              fmt={fmt}
              MONTHLY={MONTHLY}
              sales={sales}
              shop={shop}
              shopId={shopId}
              totRev={totRev}
            />
          )}
          {/* REPORTS */}
          {tab==="reports"&&(
            <ReportsPanel shop={shop} showPdf={showPdf}/>
          )}

          {/* INVOICES placeholder */}
          {tab==="invoices"&&(
            <InvoicesPanel shop={shop}/>
          )}
        </main>
      </div>

      {/* MODALS */}
      {modal==="new-sale"&&(
        <Modal title="✨ New Sale" onClose={()=>setModal(null)} accent={shop.accent}>
          <NewSaleForm
            shopId={shopId} shop={shop}
            onSave={addSale} onClose={()=>setModal(null)}
            lastInvoiceNum={sales.length>0
              ? parseInt((sales[0].id||"0").replace(/[^0-9]/g,""))||1022
              : 1022}
          />
        </Modal>
      )}
      {/* ── IMPORT MODAL — SALES ── */}
      {modal==="import-sales"&&user?.role!=="staff"&&(
        <Modal title="⬇ Import Sales" onClose={()=>setModal(null)} accent={shop.accent}>
          <ImportExportPanel type="import" entity="Sales" shop={shop} shopId={shopId} onClose={()=>setModal(null)}/>
        </Modal>
      )}

      {/* ── EXPORT MODAL — SALES ── */}
      {modal==="export-sales"&&user?.role!=="staff"&&(
        <Modal title="⬆ Export Sales" onClose={()=>setModal(null)} accent={shop.accent}>
          <ImportExportPanel type="export" entity="Sales" shop={shop} shopId={shopId} data={sales} onClose={()=>setModal(null)}/>
        </Modal>
      )}

      {/* ── IMPORT MODAL — PURCHASES ── */}
      {modal==="import-purchases"&&(
        <Modal title="⬇ Import Purchases" onClose={()=>setModal(null)} accent={shop.accent}>
          <ImportExportPanel type="import" entity="Purchases" shop={shop} onClose={()=>setModal(null)}/>
        </Modal>
      )}

      {/* ── EXPORT MODAL — PURCHASES ── */}
      {modal==="export-purchases"&&(
        <Modal title="⬆ Export Purchases" onClose={()=>setModal(null)} accent={shop.accent}>
          <ImportExportPanel type="export" entity="Purchases" shop={shop} data={purch} onClose={()=>setModal(null)}/>
        </Modal>
      )}

      {/* ── CUSTOMER DETAIL MODAL ── */}
      {selCustomer&&(
        <Modal title={"👤 "+selCustomer.name} onClose={()=>setSelCustomer(null)} accent={shop.accent}>
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            {/* header strip */}
            <div style={{background:shop.accentBg,border:"1px solid "+shop.accent+"33",borderRadius:12,padding:"14px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:48,height:48,borderRadius:"50%",background:shop.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                {selCustomer.name.charAt(0)}
              </div>
              <div>
                <p style={{margin:0,fontWeight:900,fontSize:16,color:"#0f172a"}}>{selCustomer.name}</p>
                <p style={{margin:0,fontSize:12,color:shop.accent,fontWeight:600}}>{selCustomer.tag||"Customer"}</p>
              </div>
            </div>

            {/* detail grid */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              {[
                ["📞 Phone",      selCustomer.phone],
                ["💬 WhatsApp",   selCustomer.whatsapp],
                ["📦 Orders",     selCustomer.purchases],
                ["💰 Total Spend",fmt(shopId,selCustomer.spend)],
                ["🗓 Last Purchase",formatDate(selCustomer.last)],
                ["🏷 Tag",        selCustomer.tag||"—"],
              ].map(([k,v])=>(
                <div key={k} style={{background:"#f8fafc",borderRadius:10,padding:"10px 14px"}}>
                  <p style={{margin:0,fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3}}>{k}</p>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1e293b"}}>{v||"—"}</p>
                </div>
              ))}
            </div>

            {/* address */}
            <div style={{background:"#f8fafc",borderRadius:10,padding:"10px 14px",marginBottom:12}}>
              <p style={{margin:0,fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3}}>📍 Address</p>
              <p style={{margin:0,fontSize:13,color:"#1e293b"}}>{selCustomer.address||"—"}</p>
            </div>

            {/* notes */}
            {selCustomer.notes&&(
              <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"10px 14px",marginBottom:12}}>
                <p style={{margin:0,fontSize:10,fontWeight:700,color:"#92400e",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3}}>📝 Notes</p>
                <p style={{margin:0,fontSize:13,color:"#92400e"}}>{selCustomer.notes}</p>
              </div>
            )}

            <button onClick={()=>setSelCustomer(null)}
              style={{width:"100%",padding:"11px 0",borderRadius:11,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",marginTop:4}}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* ── EDIT SALE MODAL ── */}
      {modal==="edit-sale"&&editRow&&(
        <Modal title={"✏️ Edit Sale — "+editRow.id} onClose={()=>{setModal(null);setEditRow(null);}} accent={shop.accent}>
          <EditSaleForm
            shopId={shopId} shop={shop} sale={editRow}
            onSave={(updated)=>{
              setSalesData(prev=>({...prev,[shopId]:(prev[shopId]||[]).map(x=>x.id===updated.id?{...x,...updated}:x)}));
              setModal(null);setEditRow(null);
            }}
            onClose={()=>{setModal(null);setEditRow(null);}}
          />
        </Modal>
      )}

      {/* ── NEW SHIPMENT MODAL ── */}
      {modal==="new-shipment"&&(
        <Modal title="🚚 New Shipment" onClose={()=>setModal(null)} accent={shop.accent}>
          <NewShipmentForm shopId={shopId} shop={shop} purch={purch} onSave={()=>setModal(null)} onClose={()=>setModal(null)}/>
        </Modal>
      )}

      {/* ── NEW PURCHASE MODAL ── */}
      {modal==="new-purchase"&&(
        <Modal title="📦 New Purchase" onClose={()=>setModal(null)} accent={shop.accent}>
          <NewPurchaseForm shopId={shopId} shop={shop} lastPurchNum={purch.length>0?parseInt((purch[0].id||"0").replace(/[^0-9]/g,""))||700:700} onSave={(form)=>{setModal(null);}} onClose={()=>setModal(null)}/>
        </Modal>
      )}

      {/* ══ PRINT STYLE + OVERLAY ══ */}
      {printMode&&invoiceRow&&(()=>{
        const inv=invoiceRow,sym=shop.symbol,total=Number(inv.amount)||0,isIndia=shopId==="ros-india";
        const taxRate=(inv.taxRate!==undefined?inv.taxRate:(isIndia?18:20))/100,inclusive=inv.taxInclusive!==false,subtotal=inclusive?parseFloat((total/(1+taxRate)).toFixed(2)):total,taxAmt=parseFloat((subtotal*taxRate).toFixed(2)),grand=parseFloat((subtotal+taxAmt).toFixed(2)),cgst=parseFloat((taxAmt/2).toFixed(2));
        const rPct=inv.taxRate!==undefined?inv.taxRate:(isIndia?18:20);
        const tRows=rPct===0?[["Amount (no tax)",total]]:isIndia?[["Subtotal (excl. tax)",subtotal],["CGST ("+(rPct/2)+"%)",cgst],["SGST ("+(rPct/2)+"%)",cgst]]:[["Subtotal (excl. tax)",subtotal],["Tax ("+rPct+"%)",taxAmt]];
        const n=Math.round(total);const ons=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];const tns=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
        let wds="";if(n<20)wds=ons[n];else if(n<100)wds=tns[Math.floor(n/10)]+(n%10?" "+ons[n%10]:"");else if(n<1000)wds=ons[Math.floor(n/100)]+" Hundred"+(n%100?" "+tns[Math.floor((n%100)/10)]+(n%10?" "+ons[n%10]:""):"");else if(n<100000)wds=ons[Math.floor(n/1000)]+" Thousand";else wds=String(n);
        return(
          <div id="ros-print-overlay" style={{position:"fixed",inset:0,zIndex:9999,background:"white",overflowY:"auto",padding:"0"}}>
            <style>{`@media print{#ros-print-toolbar{display:none!important;}#ros-print-overlay{position:static!important;}@page{size:A4;margin:12mm;}}`}</style>

            {/* Toolbar — hidden on print */}
            <div id="ros-print-toolbar" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 24px",background:"#0f172a",position:"sticky",top:0,zIndex:2}}>
              <span style={{color:"white",fontWeight:700,fontSize:14}}>📄 Invoice {inv.id} — Print Preview</span>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>showPdf(inv)}
                style={{padding:"8px 20px",borderRadius:8,border:"none",background:shop.accent,color:"white",fontWeight:800,fontSize:13,cursor:"pointer"}}>🖨 Print / Save as PDF</button>
                <button onClick={()=>setPrintMode(false)} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"#334155",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>✕ Close</button>
              </div>
            </div>

            {/* A4 Invoice body */}
            <div id="ros-invoice-printbody" style={{maxWidth:794,margin:"24px auto",padding:"40px 48px",fontFamily:"Arial,sans-serif",fontSize:13,color:"#0f172a",background:"white",boxShadow:"0 4px 32px rgba(0,0,0,0.12)"}}>

              {/* Header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <img src={shop.logo} alt={shop.name} style={{height:44,objectFit:"contain",marginBottom:6,background:"white",borderRadius:6,padding:"2px 6px",border:"1px solid #e2e8f0"}}/>
                  <div style={{fontSize:11,color:"#64748b"}}>{isIndia?"123, Fashion Street, Mumbai - 400001":"12 Oxford Street, London UK"}</div>
                  {isIndia&&<div style={{fontSize:11,color:"#64748b",fontWeight:700}}>GSTIN: 27AABCU9603R1ZX</div>}
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:28,fontWeight:900,color:shop.accent+"44",letterSpacing:2}}>TAX INVOICE</div>
                  <div style={{fontSize:12,marginTop:4}}>Invoice #: <strong style={{fontFamily:"monospace"}}>{inv.id}</strong></div>
                  <div style={{fontSize:12}}>Date: <strong>{formatDate(inv.date)}</strong></div>
                  <span style={{display:"inline-block",marginTop:6,background:"#dcfce7",color:"#15803d",fontWeight:700,fontSize:12,padding:"2px 12px",borderRadius:999}}>Paid</span>
                </div>
              </div>

              <hr style={{border:"none",borderTop:"2px solid #0f172a",margin:"14px 0 18px"}}/>

              {/* Bill To + Payment Info */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:20}}>
                <div>
                  <div style={{fontSize:9,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6}}>Bill To</div>
                  <div style={{fontWeight:800,fontSize:15,marginBottom:3}}>{inv.customer}</div>
                  <div style={{fontSize:12,color:"#64748b",marginBottom:2}}>{inv.address||"—"}</div>
                  <div style={{fontSize:12,color:"#64748b"}}>Phone: <strong>{inv.phone||inv.contact||"—"}</strong></div>
                </div>
                <div>
                  <div style={{fontSize:9,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6}}>Payment Info</div>
                  {(isIndia?[["Bank","ROS India Bank"],["A/C No","50100234567890"],["IFSC","BARB0MUMBAI"],["Method",inv.pay||"—"]]:[["Bank","Barclays UK"],["Sort Code","20-45-67"],["Account No","12345678"],["Method",inv.pay||"—"]]).map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:12,color:"#64748b"}}>{k}:</span>
                      <span style={{fontSize:12,fontWeight:700}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Line Items */}
              <table style={{width:"100%",borderCollapse:"collapse",marginBottom:20}}>
                <thead>
                  <tr style={{background:"#0f172a",color:"white"}}>
                    {["SR.","DESCRIPTION","QTY","RATE","TOTAL"].map((h,i)=>(
                      <th key={h} style={{padding:"9px 12px",textAlign:i>1?"right":"left",fontSize:11,fontWeight:800,letterSpacing:"0.05em"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{borderBottom:"1px solid #e2e8f0"}}>
                    <td style={{padding:"12px",color:"#64748b",fontSize:12}}>1</td>
                    <td style={{padding:"12px",fontWeight:700}}>{inv.item||"Product/Service"}</td>
                    <td style={{padding:"12px",textAlign:"right",fontWeight:700}}>{inv.qty||1}</td>
                    <td style={{padding:"12px",textAlign:"right",fontWeight:700}}>{sym}{subtotal.toLocaleString()}</td>
                    <td style={{padding:"12px",textAlign:"right",fontWeight:800,color:shop.accent}}>{sym}{grand.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              {/* Amount in words + Totals */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
                <div>
                  <div style={{fontSize:9,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>Amount in Words</div>
                  <div style={{fontSize:13,fontStyle:"italic",fontWeight:600,marginBottom:14}}>{wds} Only</div>
                  <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 12px",border:"1px solid #e2e8f0"}}>
                    <div style={{fontSize:9,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>Terms & Conditions</div>
                    <div style={{fontSize:11,color:"#64748b",lineHeight:1.7}}>
                      • Goods once sold will not be taken back.<br/>
                      • All payments are non-refundable unless stated.<br/>
                      • Subject to {isIndia?"Mumbai":"London"} jurisdiction only.
                    </div>
                  </div>
                </div>
                <div>
                  {tRows.map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <span style={{fontSize:13,color:"#64748b"}}>{k}</span>
                      <span style={{fontSize:13,fontWeight:600}}>{v===0?sym+"0.00":sym+Number(v).toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{borderTop:"2px solid #0f172a",paddingTop:10,marginTop:4}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                      <span style={{fontSize:15,fontWeight:900}}>GRAND TOTAL</span>
                      <span style={{fontSize:17,fontWeight:900,color:shop.accent}}>{sym}{(grand||total).toLocaleString()}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:12,color:"#64748b"}}>Amount Paid:</span>
                      <span style={{fontSize:12,fontWeight:700,color:"#15803d"}}>{sym}{(grand||total).toLocaleString()}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:12,color:"#64748b"}}>Balance Due:</span>
                      <span style={{fontSize:12,fontWeight:700,color:"#dc2626"}}>{sym}0</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{borderTop:"1px solid #e2e8f0",paddingTop:14,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                <div style={{fontSize:11,color:"#94a3b8"}}>Thank you for your business with {shop.name}!</div>
                <div style={{textAlign:"right"}}>
                  <div style={{height:36,borderBottom:"1px solid #0f172a",width:140,marginBottom:4}}/>
                  <div style={{fontSize:11,color:"#64748b"}}>Authorised Signature</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ PDF / PRINT OVERLAY ══ */}
      {pdfMode&&pdfInv&&(()=>{
        const inv=pdfInv;
        const isInd=shopId==="ros-india";
        const sym=shop.symbol;
        const tR=((inv.taxRate!==undefined?inv.taxRate:(isInd?18:20))/100);
        const inc=inv.taxInclusive!==false;
        const ent=Number(inv.amount)||0;
        const sub=inc?parseFloat((ent/(1+tR)).toFixed(2)):ent;
        const tax=parseFloat((sub*tR).toFixed(2));
        const grd=parseFloat((sub+tax).toFixed(2));
        const rPct=inv.taxRate!==undefined?inv.taxRate:(isInd?18:20);
        const cgst=parseFloat((tax/2).toFixed(2));
        return(
          <div style={{position:"fixed",inset:0,zIndex:9999,background:"white",overflowY:"auto"}}>
            <style>{`
              @media print {
                body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
              }
            `}</style>
            {/* Toolbar */}
            <div id="pdf-toolbar" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 24px",background:"#0f172a",position:"sticky",top:0,zIndex:2}}>
              <span style={{color:"white",fontWeight:700,fontSize:14}}>📄 Invoice {inv.id}</span>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>handlePrint(inv)}
                  style={{padding:"8px 18px",borderRadius:8,border:"none",background:shop.accent,color:"white",fontWeight:800,fontSize:13,cursor:"pointer"}}>
                  🖨 Print
                </button>
                <button onClick={()=>{
                    const el=invoicePrintRef.current;
                    if(!el){alert('Invoice not ready');return;}
                    const load=(src)=>new Promise((res,rej)=>{
                      if(window.html2pdf){res();return;}
                      const s=document.createElement('script');
                      s.src=src;s.onload=res;s.onerror=rej;
                      document.head.appendChild(s);
                    });
                    load('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js')
                    .then(()=>{
                      window.html2pdf().set({
                        margin:0.4,
                        filename:'Invoice-'+inv.id+'.pdf',
                        image:{type:'jpeg',quality:0.98},
                        html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff'},
                        jsPDF:{unit:'in',format:'a4',orientation:'portrait'}
                      }).from(el).save();
                    }).catch(()=>alert('Could not load PDF library. Check your internet connection.'));
                  }}
                  style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#1e293b",color:"white",fontWeight:800,fontSize:13,cursor:"pointer"}}>
                  ⬇ PDF
                </button>
                <button onClick={()=>{setPdfMode(false);setPdfInv(null);}}
                  style={{padding:"8px 16px",borderRadius:8,border:"none",background:"#334155",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                  ✕ Close
                </button>
              </div>
            </div>
            {/* A4 Invoice */}
            <div id="invoice-content" ref={invoicePrintRef} style={{maxWidth:794,margin:"24px auto",padding:"40px 48px",fontFamily:"Arial,sans-serif",fontSize:13,color:"#0f172a",background:"white",boxShadow:"0 4px 32px rgba(0,0,0,0.12)"}}>
              {/* Header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <img src={shop.logo} alt={shop.name} style={{height:48,objectFit:"contain",marginBottom:6}}/>
                  <div style={{fontSize:11,color:"#64748b"}}>{isInd?"Mumbai, India":"London, United Kingdom"}</div>
                  <div style={{fontSize:11,color:"#64748b"}}>{isInd?"GST: 27AAAAA0000A1Z5":"VAT No: GB123456789"}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:26,fontWeight:900,color:"#0f172a",letterSpacing:"-0.03em"}}>INVOICE</div>
                  <div style={{fontSize:13,fontWeight:700,color:"#64748b"}}>#{inv.id}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>Date: {inv.date||new Date().toLocaleDateString("en-GB")}</div>
                  <div style={{marginTop:6,display:"inline-block",background:inc?"#f0fdf4":"#eff6ff",color:inc?"#15803d":"#1d4ed8",padding:"2px 10px",borderRadius:999,fontSize:10,fontWeight:700,border:"1px solid "+(inc?"#bbf7d0":"#bfdbfe")}}>
                    {inc?"Tax Inclusive":"Tax Exclusive"} · {rPct}%
                  </div>
                </div>
              </div>
              <div style={{borderTop:"2px solid #0f172a",marginBottom:20}}/>
              {/* Bill To + Bank */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
                <div style={{background:"#f8fafc",borderRadius:10,padding:14}}>
                  <div style={{fontSize:10,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6}}>Bill To</div>
                  <div style={{fontWeight:700,fontSize:14}}>{inv.customer||"—"}</div>
                  <div style={{fontSize:12,color:"#64748b",marginTop:4}}>{inv.address||""}</div>
                  <div style={{fontSize:12,color:"#64748b"}}>{inv.phone||inv.contact||""}</div>
                </div>
                <div style={{background:"#f8fafc",borderRadius:10,padding:14}}>
                  <div style={{fontSize:10,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6}}>Payment Details</div>
                  {(isInd?[["Bank","State Bank of India"],["A/C No","98765432101"],["IFSC","SBIN0001234"]]:
                    [["Bank","Barclays Bank UK"],["Account No","12345678"],["Sort Code","20-00-00"]]).map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                      <span style={{color:"#64748b"}}>{k}</span><span style={{fontWeight:700}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Line Items */}
              <table style={{width:"100%",borderCollapse:"collapse",marginBottom:20}}>
                <thead>
                  <tr style={{background:"#0f172a",color:"white"}}>
                    {["SR.","DESCRIPTION","QTY","RATE (excl. tax)","TOTAL"].map((h,hi)=>(
                      <th key={h} style={{padding:"10px 14px",textAlign:hi<2?"left":"right",fontSize:11,fontWeight:800,letterSpacing:"0.06em"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{borderBottom:"1px solid #e2e8f0"}}>
                    <td style={{padding:"12px 14px",fontSize:13,color:"#64748b"}}>1</td>
                    <td style={{padding:"12px 14px",fontWeight:700}}>{inv.item||"Product / Service"}</td>
                    <td style={{padding:"12px 14px",textAlign:"right",fontWeight:700}}>{inv.qty||1}</td>
                    <td style={{padding:"12px 14px",textAlign:"right",fontWeight:700}}>{sym}{sub.toLocaleString()}</td>
                    <td style={{padding:"12px 14px",textAlign:"right",fontWeight:800,color:shop.accent}}>{sym}{grd.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
              {/* Totals */}
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:24}}>
                <div style={{width:300}}>
                  {rPct===0
                    ? <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:13}}><span style={{color:"#64748b"}}>Amount (no tax)</span><span style={{fontWeight:600}}>{sym}{sub.toLocaleString()}</span></div>
                    : isInd
                      ? <>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:13}}><span style={{color:"#64748b"}}>Subtotal (excl. tax)</span><span style={{fontWeight:600}}>{sym}{sub.toLocaleString()}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:13}}><span style={{color:"#64748b"}}>CGST ({rPct/2}%)</span><span style={{fontWeight:600}}>{sym}{cgst.toLocaleString()}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:13}}><span style={{color:"#64748b"}}>SGST ({rPct/2}%)</span><span style={{fontWeight:600}}>{sym}{cgst.toLocaleString()}</span></div>
                        </>
                      : <>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:13}}><span style={{color:"#64748b"}}>Subtotal (excl. tax)</span><span style={{fontWeight:600}}>{sym}{sub.toLocaleString()}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:13}}><span style={{color:"#64748b"}}>Tax ({rPct}%)</span><span style={{fontWeight:600}}>{sym}{tax.toLocaleString()}</span></div>
                        </>
                  }
                  <div style={{borderTop:"2px solid #0f172a",paddingTop:10,marginTop:4}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:16,fontWeight:900}}>GRAND TOTAL</span>
                      <span style={{fontSize:18,fontWeight:900,color:shop.accent}}>{sym}{grd.toLocaleString()}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:11,color:"#64748b"}}>Amount Paid</span>
                      <span style={{fontSize:11,fontWeight:700,color:"#15803d"}}>{sym}{grd.toLocaleString()}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:11,color:"#64748b"}}>Balance Due</span>
                      <span style={{fontSize:11,fontWeight:700,color:"#dc2626"}}>{sym}0</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div style={{borderTop:"1px solid #e2e8f0",paddingTop:14,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                <p style={{margin:0,fontSize:11,color:"#94a3b8"}}>Thank you for your business with {shop.name}!</p>
                <div style={{textAlign:"right"}}>
                  <div style={{height:40,borderBottom:"1px solid #0f172a",width:140,marginBottom:4}}/>
                  <p style={{margin:0,fontSize:11,color:"#64748b"}}>Authorised Signature</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ INVOICE PREVIEW MODAL ══ */}
      {invoiceRow&&(
        <div style={{position:"fixed",inset:0,zIndex:70,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px",overflowY:"auto"}}
          onClick={()=>setInvoiceRow(null)}>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(5px)"}}/>
          <div style={{position:"relative",background:"white",borderRadius:16,boxShadow:"0 32px 80px rgba(0,0,0,0.28)",width:"100%",maxWidth:720,zIndex:71,marginTop:8,marginBottom:8}}
            onClick={e=>e.stopPropagation()}>

            {/* ── TOOLBAR ── */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",borderBottom:"1px solid #f1f5f9",background:"#f8fafc",borderRadius:"16px 16px 0 0"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>📄</span>
                <span style={{fontWeight:800,fontSize:14,color:"#0f172a"}}>Invoice Preview: {invoiceRow.id}</span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <button onClick={()=>handlePrint(invoiceRow)}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:9,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                  🖨 Print
                </button>
                <button onClick={()=>{
                    setPdfInv(invoiceRow);setPdfMode(true);
                    setTimeout(()=>{
                      const el=document.getElementById('invoice-content');
                      if(!el)return;
                      const load=(src)=>new Promise((res,rej)=>{if(window.html2pdf){res();return;}const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);});
                      load('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js')
                      .then(()=>{
                        window.html2pdf().set({
                          margin:[10,10,10,10],
                          filename:'Invoice-'+invoiceRow.id+'.pdf',
                          image:{type:'jpeg',quality:0.98},
                          html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false},
                          jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}
                        }).from(el).save();
                      }).catch(()=>{});
                    },600);
                  }}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:9,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                  ⬇ PDF
                </button>
                <button onClick={()=>{
                    const subject=encodeURIComponent("Invoice "+invoiceRow.id+" from "+shop.name);
                    const body=encodeURIComponent(
                      "Dear "+invoiceRow.customer+",\n\n"+
                      "Please find your invoice details below:\n\n"+
                      "Invoice No: "+invoiceRow.id+"\n"+
                      "Date: "+formatDate(invoiceRow.date)+"\n"+
                      "Amount: "+fmt(shopId,invoiceRow.amount)+"\n\n"+
                      "Status: PAID\n\n"+
                      "Thank you for your business with "+shop.name+"!\n\n"+
                      "Regards,\n"+shop.name
                    );
                    window.open("mailto:?subject="+subject+"&body="+body);
                  }}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:9,border:"none",background:shop.accent,color:"white",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px "+shop.accent+"44"}}>
                  ✉ Send Email
                </button>
                <button onClick={()=>setInvoiceRow(null)}
                  style={{width:30,height:30,borderRadius:"50%",border:"none",background:"#f1f5f9",cursor:"pointer",fontSize:18,color:"#64748b",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              </div>
            </div>

            {/* ── INVOICE BODY ── */}
            <div id="ros-invoice-print" style={{padding:"32px 40px",background:"white",borderRadius:"0 0 16px 16px"}}>

              {/* Header: company logo + TAX INVOICE */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {/* Logo in white rounded box */}
                  <div style={{background:"white",border:"1px solid #e2e8f0",borderRadius:10,padding:"6px 12px",display:"inline-flex",alignItems:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",alignSelf:"flex-start"}}>
                    <img src={shop.logo} alt={shop.name} style={{height:36,width:"auto",maxWidth:180,objectFit:"contain",display:"block"}}/>
                  </div>
                  <h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:900,color:"#0f172a"}}>{shop.name}</h1>
                  <p style={{margin:"0 0 2px",fontSize:12,color:"#64748b"}}>
                    {shopId==="ros-india"?"123, Fashion Street, Mumbai - 400001":"12 Oxford Street, London, UK"}
                  </p>
                  {shopId==="ros-india"&&<p style={{margin:0,fontSize:12,color:"#64748b",fontWeight:700}}>GSTIN: 27AABCU9603R1ZX</p>}
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{margin:0,fontSize:26,fontWeight:900,color:shop.accent+"33",letterSpacing:2,textTransform:"uppercase"}}>TAX INVOICE</p>
                  <p style={{margin:"6px 0 2px",fontSize:12,color:"#64748b"}}>Invoice #: <strong style={{color:"#0f172a",fontFamily:"DM Mono,monospace"}}>{invoiceRow.id}</strong></p>
                  <p style={{margin:"0 0 6px",fontSize:12,color:"#64748b"}}>Date: <strong style={{color:"#0f172a"}}>{formatDate(invoiceRow.date)}</strong></p>
                  <span style={{background:"#dcfce7",color:"#15803d",fontWeight:800,fontSize:12,padding:"3px 12px",borderRadius:999}}>Paid</span>
                </div>
              </div>

              <hr style={{border:"none",borderTop:"2px solid #0f172a",margin:"16px 0 20px"}}/>

              {/* Bill To + Payment Info */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:24}}>
                <div>
                  <p style={{margin:"0 0 8px",fontSize:10,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.07em"}}>Bill To</p>
                  <p style={{margin:"0 0 3px",fontWeight:800,fontSize:15,color:"#0f172a"}}>{invoiceRow.customer}</p>
                  {invoiceRow.address&&<p style={{margin:"0 0 3px",fontSize:12,color:"#64748b"}}>{invoiceRow.address}</p>}
                  <p style={{margin:0,fontSize:12,color:"#64748b"}}>Phone: <strong>{invoiceRow.phone||invoiceRow.contact||"—"}</strong></p>
                </div>
                <div>
                  <p style={{margin:"0 0 8px",fontSize:10,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.07em"}}>Payment Info</p>
                  {[
                    shopId==="ros-india"?["Bank:","ROS India Bank"]:["Bank:","Barclays UK"],
                    shopId==="ros-india"?["A/C No:","50100234567890"]:["Sort Code:","20-45-67"],
                    shopId==="ros-india"?["IFSC:","BARB0MUMBAI"]:["Account No:","12345678"],
                    ["Method:",invoiceRow.pay||"—"],
                  ].map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:12,color:"#64748b"}}>{k}</span>
                      <span style={{fontSize:12,fontWeight:700,color:"#0f172a"}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Line Items table */}
              <table style={{width:"100%",borderCollapse:"collapse",marginBottom:20}}>
                <thead>
                  <tr style={{background:"#0f172a",color:"white"}}>
                    {["SR.","DESCRIPTION","QTY","RATE","TOTAL"].map((h,hi)=>(
                      <th key={h} style={{padding:"10px 14px",textAlign:hi===0||hi===1?"left":"right",fontSize:11,fontWeight:800,letterSpacing:"0.06em"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{borderBottom:"1px solid #e2e8f0"}}>
                    <td style={{padding:"12px 14px",fontSize:13,color:"#64748b"}}>1</td>
                    <td style={{padding:"12px 14px"}}>
                      <p style={{margin:0,fontWeight:700,fontSize:13,color:"#0f172a"}}>{invoiceRow.item||"Product/Service"}</p>
                    </td>
                    <td style={{padding:"12px 14px",textAlign:"right",fontWeight:700}}>{invoiceRow.qty||1}</td>
                    <td style={{padding:"12px 14px",textAlign:"right",fontWeight:700}}>{fmt(shopId,invSubtotal)}</td>
                    <td style={{padding:"12px 14px",textAlign:"right",fontWeight:800,color:shop.accent}}>{fmt(shopId,invGrand)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Amount in words + Totals */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
                <div>
                  <p style={{margin:"0 0 6px",fontSize:10,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.07em"}}>Amount in Words</p>
                  <p style={{margin:"0 0 16px",fontSize:13,fontStyle:"italic",fontWeight:600,color:"#374151"}}>
                    {(()=>{
                      const n=Math.round(invGrand||0);
                      const ones=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
                      const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
                      if(n===0)return "Zero";
                      if(n<20)return ones[n];
                      if(n<100)return tens[Math.floor(n/10)]+(n%10?" "+ones[n%10]:"");
                      if(n<1000)return ones[Math.floor(n/100)]+" Hundred"+(n%100?" "+tens[Math.floor((n%100)/10)]+(n%10?" "+ones[n%10]:""):"");
                      if(n<100000)return ones[Math.floor(n/1000)]+" Thousand"+(n%1000?" "+tens[Math.floor((n%1000)/100)]:"");
                      return n+" Only";
                    })()} Only
                  </p>
                  <div style={{background:"#f8fafc",borderRadius:10,padding:"10px 14px",border:"1px solid #e2e8f0"}}>
                    <p style={{margin:"0 0 4px",fontSize:10,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.07em"}}>Terms & Conditions</p>
                    <ul style={{margin:0,paddingLeft:16,fontSize:11,color:"#64748b",lineHeight:1.7}}>
                      <li>Goods once sold will not be taken back.</li>
                      <li>All payments are non-refundable unless stated.</li>
                      <li>Subject to {shopId==="ros-india"?"Mumbai":"London"} jurisdiction only.</li>
                    </ul>
                  </div>
                </div>
                <div>
                  {invoiceRow&&(()=>{
                    const entered  = Number(invoiceRow.amount)||0;
                    const isIndia  = shopId==="ros-india";
                    const taxRate  = (invoiceRow.taxRate !== undefined ? invoiceRow.taxRate : (isIndia ? 18 : 20)) / 100;
                    const inclusive= invoiceRow.taxInclusive !== false;
                    // subtotal = pre-tax amount; grand = total payable
                    const subtotal = inclusive
                      ? parseFloat((entered / (1 + taxRate)).toFixed(2))
                      : entered;
                    const taxAmt   = parseFloat((subtotal * taxRate).toFixed(2));
                    const grand    = parseFloat((subtotal + taxAmt).toFixed(2));
                    const cgst     = parseFloat((taxAmt / 2).toFixed(2));
                    const sgst     = parseFloat((taxAmt / 2).toFixed(2));
                    // Always show full breakdown
                    const rateDisplay = (invoiceRow.taxRate!==undefined?invoiceRow.taxRate:(isIndia?18:20));
                    const rows = rateDisplay===0
                      ? [["Amount (no tax)", entered]]
                      : isIndia
                        ? [
                            ["Subtotal (excl. tax)", subtotal],
                            ["CGST ("+(rateDisplay/2)+"%)", cgst],
                            ["SGST ("+(rateDisplay/2)+"%)", sgst],
                          ]
                        : [
                            ["Subtotal (excl. tax)", subtotal],
                            ["Tax ("+rateDisplay+"%)", taxAmt],
                          ];
                    return <>
                      {/* Tax mode badge */}
                      <div style={{marginBottom:8}}>
                        <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:999,
                          background: inclusive?"#f0fdf4":"#eff6ff",
                          color:      inclusive?"#15803d":"#1d4ed8",
                          border:     "1px solid "+(inclusive?"#bbf7d0":"#bfdbfe")}}>
                          {inclusive?"Tax Inclusive":"Tax Exclusive"} · {invoiceRow.taxRate!==undefined?invoiceRow.taxRate:(isIndia?18:20)}%
                        </span>
                      </div>
                      {rows.map(([k,v])=>(
                        <div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                          <span style={{fontSize:13,color:"#64748b"}}>{k}</span>
                          <span style={{fontSize:13,fontWeight:600,color:"#374151"}}>{fmt(shopId,v)}</span>
                        </div>
                      ))}
                      <div style={{borderTop:"2px solid #0f172a",paddingTop:10,marginTop:6}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{fontSize:16,fontWeight:900,color:"#0f172a"}}>GRAND TOTAL</span>
                          <span style={{fontSize:18,fontWeight:900,color:shop.accent}}>{fmt(shopId,invGrand)}</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:12,color:"#64748b"}}>Amount Paid:</span>
                          <span style={{fontSize:12,fontWeight:700,color:"#15803d"}}>{fmt(shopId,invGrand)}</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between"}}>
                          <span style={{fontSize:12,color:"#64748b"}}>Balance Due:</span>
                          <span style={{fontSize:12,fontWeight:700,color:"#dc2626"}}>{shop.symbol}0</span>
                        </div>
                      </div>
                    </>;
                  })()}
                </div>
              </div>

              {/* Footer */}
              <div style={{borderTop:"1px solid #e2e8f0",paddingTop:14,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                <p style={{margin:0,fontSize:11,color:"#94a3b8"}}>Thank you for your business with {shop.name}!</p>
                <div style={{textAlign:"right"}}>
                  <div style={{height:40,borderBottom:"1px solid #0f172a",width:140,marginBottom:4}}/>
                  <p style={{margin:0,fontSize:11,color:"#64748b"}}>Authorised Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selRow&&(
        <div style={{position:"fixed",inset:0,zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setSelRow(null)}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(4px)"}}/>
          <div style={{position:"relative",background:"white",borderRadius:20,boxShadow:"0 32px 64px rgba(0,0,0,0.22)",width:"100%",maxWidth:680,maxHeight:"90vh",overflowY:"auto",zIndex:61}}
            onClick={e=>e.stopPropagation()}>

            {/* ── HEADER ── */}
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",padding:"18px 24px 14px",borderBottom:"1px solid #f1f5f9"}}>
              <div>
                <h2 style={{margin:0,fontSize:18,fontWeight:900,color:"#0f172a"}}>Sale Details</h2>
                <div style={{display:"flex",alignItems:"center",gap:10,marginTop:5}}>
                  <span style={{fontSize:12,color:"#64748b",fontFamily:"DM Mono,monospace",fontWeight:600}}>📄 {selRow.id}</span>
                  <span style={{fontSize:12,color:"#94a3b8"}}>·</span>
                  <span style={{fontSize:12,color:"#64748b"}}>📅 {formatDate(selRow.date)}</span>
                </div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <button onClick={()=>{setInvoiceRow(selRow);setSelRow(null);}}
                  style={{padding:"7px 16px",borderRadius:9,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
                  👁 View Invoice
                </button>
                <button onClick={()=>{setEditRow(selRow);setSelRow(null);setModal("edit-sale");}}
                  style={{padding:"7px 16px",borderRadius:9,border:"none",background:shop.accent,color:"white",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,boxShadow:"0 3px 10px "+shop.accent+"44"}}>
                  ✏️ Edit
                </button>
                <button onClick={()=>setSelRow(null)}
                  style={{width:30,height:30,borderRadius:"50%",border:"none",background:"#f1f5f9",cursor:"pointer",fontSize:18,color:"#64748b",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              </div>
            </div>

            <div style={{padding:"18px 24px"}}>

              {/* ── 3-PANEL ROW ── */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>

                {/* CUSTOMER */}
                <div style={{border:"1px solid #e2e8f0",borderRadius:14,padding:"14px 16px"}}>
                  <p style={{margin:"0 0 10px",fontSize:10,fontWeight:800,color:shop.accent,textTransform:"uppercase",letterSpacing:"0.07em",display:"flex",alignItems:"center",gap:5}}>
                    👤 Customer
                  </p>
                  <p style={{margin:"0 0 4px",fontWeight:800,fontSize:14,color:"#0f172a"}}>{selRow.customer}</p>
                  <p style={{margin:"0 0 3px",fontSize:12,color:"#64748b"}}>{selRow.phone||selRow.contact||"—"}</p>
                  {selRow.phoneSavedOn&&<p style={{margin:"0 0 3px",fontSize:11,color:"#94a3b8"}}>Saved On: {selRow.phoneSavedOn}</p>}
                  <p style={{margin:0,fontSize:12,color:"#64748b"}}>{selRow.address||"—"}</p>
                </div>

                {/* PAYMENT */}
                <div style={{border:"1px solid #e2e8f0",borderRadius:14,padding:"14px 16px"}}>
                  <p style={{margin:"0 0 10px",fontSize:10,fontWeight:800,color:shop.accent,textTransform:"uppercase",letterSpacing:"0.07em"}}>💳 Payment</p>
                  <div style={{marginBottom:8}}>
                    <span style={{background:"#dcfce7",color:"#15803d",fontWeight:700,fontSize:12,padding:"3px 10px",borderRadius:999}}>Paid</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:12,color:"#64748b"}}>Method</span>
                    <span style={{fontSize:12,fontWeight:700,color:"#1e293b"}}>{selRow.pay||"—"}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:12,color:"#64748b"}}>Amount</span>
                    <span style={{fontSize:14,fontWeight:900,color:shop.accent}}>
                      {selRow?(()=>{const a=Number(selRow.amount)||0,r=shopId==="ros-india"?0.18:0.20,inc=selRow.taxInclusive!==false;return fmt(shopId,inc?a:parseFloat((a*(1+r)).toFixed(2)));})():"—"}
                    </span>
                  </div>
                </div>

                {/* FULFILLMENT */}
                <div style={{border:"1px solid #e2e8f0",borderRadius:14,padding:"14px 16px"}}>
                  <p style={{margin:"0 0 10px",fontSize:10,fontWeight:800,color:shop.accent,textTransform:"uppercase",letterSpacing:"0.07em"}}>🚚 Fulfillment</p>
                  <div style={{marginBottom:8}}>
                    <Badge l={selRow.ful||selRow.status||"PENDING"}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:12,color:"#64748b"}}>Total</span>
                    <span style={{fontSize:14,fontWeight:900,color:shop.accent}}>
                      {selRow?(()=>{const a=Number(selRow.amount)||0,r=shopId==="ros-india"?0.18:0.20,inc=selRow.taxInclusive!==false;return fmt(shopId,inc?a:parseFloat((a*(1+r)).toFixed(2)));})():"—"}
                    </span>
                  </div>
                  {selRow.sentDate&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:12,color:"#64748b"}}>Dispatch</span>
                    <span style={{fontSize:12,fontWeight:600,color:"#1e293b"}}>{formatDate(selRow.sentDate)}</span>
                  </div>}
                </div>
              </div>

              {/* ── LINE ITEMS ── */}
              <div style={{border:"1px solid #e2e8f0",borderRadius:14,overflow:"hidden",marginBottom:20}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:"#f8fafc",borderBottom:"1px solid #e2e8f0"}}>
                  <span style={{fontWeight:800,fontSize:14,color:"#0f172a"}}>Line Items</span>
                  <span style={{fontSize:12,color:"#94a3b8"}}>1 item(s)</span>
                </div>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr style={{background:"#f8fafc"}}>
                      {["Description","QTY","Rate","Total"].map(h=>(
                        <th key={h} style={{padding:"9px 14px",textAlign:h==="Description"?"left":"right",fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{padding:"12px 14px"}}>
                        <p style={{margin:0,fontWeight:700,fontSize:13,color:"#1e293b"}}>{selRow.item||selRow.customer}</p>
                      </td>
                      <td style={{padding:"12px 14px",textAlign:"right",fontWeight:700,color:"#374151"}}>{selRow.qty||1}</td>
                      {(()=>{
                        const e2=Number(selRow.amount)||0,r2=shopId==="ros-india"?0.18:0.20,inc2=selRow.taxInclusive!==false;
                        const sub2=inc2?parseFloat((e2/(1+r2)).toFixed(2)):e2;
                        const grd2=parseFloat((sub2*(1+r2)).toFixed(2));
                        return <>
                          <td style={{padding:"12px 14px",textAlign:"right",fontWeight:700,color:"#374151"}}>{fmt(shopId,sub2)}</td>
                          <td style={{padding:"12px 14px",textAlign:"right",fontWeight:800,color:shop.accent}}>{fmt(shopId,grd2)}</td>
                        </>;
                      })()}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── NOTES + TOTALS ── */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
                {/* notes */}
                <div style={{border:"1px solid #e2e8f0",borderRadius:14,padding:"14px 16px"}}>
                  <p style={{margin:"0 0 8px",fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>Notes</p>
                  <p style={{margin:0,fontSize:13,color:"#64748b",fontStyle:selRow.rem?"normal":"italic"}}>{selRow.rem||"—"}</p>
                  {selRow.tag&&<div style={{marginTop:10}}><Badge l={selRow.tag}/></div>}
                </div>
                {/* totals */}
                <div style={{border:"1px solid #e2e8f0",borderRadius:14,padding:"14px 16px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:13,color:"#64748b"}}>Subtotal</span>
                    <span style={{fontSize:13,fontWeight:600,color:"#374151"}}>{fmt(shopId,selRow.amount)}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,paddingBottom:12,borderBottom:"1px solid #f1f5f9"}}>
                    <span style={{fontSize:13,color:"#64748b"}}>Balance Due</span>
                    <span style={{fontSize:13,fontWeight:700,color:"#15803d"}}>
                      {shop.symbol}0
                    </span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:15,fontWeight:800,color:"#0f172a"}}>Grand Total</span>
                    <span style={{fontSize:16,fontWeight:900,color:shop.accent}}>{fmt(shopId,selRow.amount)}</span>
                  </div>
                </div>
              </div>

              {/* ── FOOTER ACTIONS ── */}
              <div style={{display:"flex",justifyContent:"flex-end"}}>
                <button onClick={()=>setSelRow(null)}
                  style={{padding:"10px 28px",borderRadius:11,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

/* ── SALE FORM ── */
/* ══════════════════════════════════════════════════════
   IMPORT / EXPORT PANEL
══════════════════════════════════════════════════════ */
const ImportExportPanel=({type,entity,shop,data,onClose,shopId})=>{
  const [dragOver,setDragOver]=useState(false);
  const [fileName,setFileName]=useState(null);
  const [fileFmt,setFileFmt]=useState("CSV");

  // All 22 export columns — all ON by default
  const ALL_COLS=[
    {key:"sale_id",       label:"Sale ID"},
    {key:"date",          label:"Date"},
    {key:"invoice_no",    label:"Invoice No."},
    {key:"shop_invoice",  label:"Shop Inv."},
    {key:"customer",      label:"Customer Name"},
    {key:"addressee",     label:"Addressee"},
    {key:"address",       label:"Address"},
    {key:"contact",       label:"Contact No."},
    {key:"item",          label:"Item"},
    {key:"qty",           label:"Quantity"},
    {key:"price",         label:"Price (excl. tax)"},
    {key:"tax",           label:"Tax"},
    {key:"total",         label:"Total"},
    {key:"payment",       label:"Payment Method"},
    {key:"dispatch_date", label:"Dispatch Date"},
    {key:"return_req",    label:"Return Request"},
    {key:"return_rcvd",   label:"Return Received"},
    {key:"exchange",      label:"Exchange"},
    {key:"refund",        label:"Refund"},
    {key:"tag",           label:"Tag"},
    {key:"remarks",       label:"Remarks"},
    {key:"re",            label:"RE"},
  ];

  const initCols=ALL_COLS.reduce((acc,c)=>({...acc,[c.key]:true}),{});
  const [cols,setCols]=useState(initCols);
  const toggleCol=k=>setCols(c=>({...c,[k]:!c[k]}));
  const allOn=Object.values(cols).every(Boolean);
  const toggleAll=()=>{const v=!allOn;setCols(ALL_COLS.reduce((a,c)=>({...a,[c.key]:v}),{}));};

  // Map a sale record to the 22 column values
  const mapRow=(s)=>{
    const isIndia=(shopId||"")===("ros-india");
    const entered=Number(s.amount)||0;
    const rate=((s.taxRate!==undefined?s.taxRate:(isIndia?18:20))/100);
    const inc=s.taxInclusive!==false;
    const subtotal=inc?parseFloat((entered/(1+rate)).toFixed(2)):entered;
    const taxAmt=parseFloat((subtotal*rate).toFixed(2));
    const grand=parseFloat((subtotal+taxAmt).toFixed(2));
    return{
      sale_id:       s.id||"",
      date:          s.date||"",
      invoice_no:    s.id||"",
      shop_invoice:  s.invoiceNo||s.id||"",
      customer:      s.customer||"",
      addressee:     s.addressee||"",
      address:       s.address||"",
      contact:       s.phone||s.contact||"",
      item:          s.item||"",
      qty:           s.qty||1,
      price:         subtotal,
      tax:           taxAmt,
      total:         grand,
      payment:       s.pay||"",
      dispatch_date: s.sentDate||"",
      return_req:    s.returnRcvd?"Yes":"No",
      return_rcvd:   s.returnRcvd||"",
      exchange:      (s.ful||s.status||"")==="EXCHANGED"?"Yes":"No",
      refund:        s.refundAmt||"",
      tag:           s.tag||"",
      remarks:       s.rem||s.remarks||"",
      re:            s.re||"",
    };
  };

  const handleExport=()=>{
    if(!data||data.length===0){alert("No data to export.");return;}
    const activeCols=ALL_COLS.filter(c=>cols[c.key]);
    const header=activeCols.map(c=>c.label).join(",");
    const rows=data.map(s=>{
      const row=mapRow(s);
      return activeCols.map(c=>{
        const v=row[c.key]??"";;
        const str=String(v).replace(/"/g,'""');
        return `"${str}"`;
      }).join(",");
    });
    const csv=[header,...rows].join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`${shop.short||shop.name}_${entity}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  if(type==="export") return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      {/* info bar */}
      <div style={{background:shop.accentBg,border:"1px solid "+shop.accent+"33",borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:24}}>⬆</span>
        <div>
          <p style={{margin:0,fontWeight:800,fontSize:14,color:shop.accentText}}>Export {entity}</p>
          <p style={{margin:0,fontSize:12,color:shop.accent}}>{data?.length||0} records · {Object.values(cols).filter(Boolean).length} of {ALL_COLS.length} columns selected</p>
        </div>
      </div>

      {/* format */}
      <div>
        <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em"}}>File Format</p>
        <div style={{display:"flex",gap:8}}>
          {["CSV"].map(f=>(
            <button key={f} onClick={()=>setFileFmt(f)}
              style={{padding:"8px 20px",borderRadius:9,border:"1px solid "+(fileFmt===f?shop.accent:"#e2e8f0"),
                background:fileFmt===f?shop.accent:"white",color:fileFmt===f?"white":"#374151",
                fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* column selector */}
      <div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <p style={{margin:0,fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em"}}>Columns to Export</p>
          <button onClick={toggleAll}
            style={{fontSize:11,fontWeight:700,color:shop.accent,background:shop.accentBg,border:"1px solid "+shop.accent+"33",borderRadius:999,padding:"3px 12px",cursor:"pointer",fontFamily:"inherit"}}>
            {allOn?"Deselect All":"Select All"}
          </button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,maxHeight:260,overflowY:"auto",paddingRight:4}}>
          {ALL_COLS.map((c,i)=>(
            <button key={c.key} onClick={()=>toggleCol(c.key)}
              style={{
                display:"flex",alignItems:"center",gap:8,
                padding:"8px 12px",borderRadius:9,
                border:"1px solid "+(cols[c.key]?shop.accent+"55":"#e2e8f0"),
                background:cols[c.key]?shop.accentBg:"#f8fafc",
                color:cols[c.key]?shop.accentText:"#94a3b8",
                fontWeight:cols[c.key]?700:500,fontSize:12,
                cursor:"pointer",fontFamily:"inherit",
                textAlign:"left",transition:"all 0.13s",
              }}>
              <span style={{width:16,height:16,borderRadius:5,border:"1.5px solid "+(cols[c.key]?shop.accent:"#cbd5e1"),background:cols[c.key]?shop.accent:"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:9,color:"white",fontWeight:900,transition:"all 0.13s"}}>
                {cols[c.key]?"✓":""}
              </span>
              <span style={{fontSize:11}}>{i+1}. {c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* actions */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,paddingTop:4}}>
        <button onClick={handleExport}
          style={{padding:"12px 0",borderRadius:11,border:"none",background:shop.accent,
            color:"white",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",
            boxShadow:"0 4px 14px "+shop.accent+"44"}}>
          ⬇ Download CSV
        </button>
        <button onClick={onClose}
          style={{padding:"12px 0",borderRadius:11,border:"1px solid #e2e8f0",
            background:"white",color:"#374151",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
          Cancel
        </button>
      </div>
    </div>
  );

  /* IMPORT */
  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      {/* info */}
      <div style={{background:shop.accentBg,border:"1px solid "+shop.accent+"33",borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:24}}>⬇</span>
        <div>
          <p style={{margin:0,fontWeight:800,fontSize:14,color:shop.accentText}}>Import {entity}</p>
          <p style={{margin:0,fontSize:12,color:shop.accent}}>Upload a CSV file to bulk-import into {shop.name}</p>
        </div>
      </div>

      {/* template download */}
      <div style={{background:"#f8fafc",borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1e293b"}}>📄 Download Template</p>
          <p style={{margin:0,fontSize:11,color:"#94a3b8"}}>All 22 columns pre-labelled — fill and upload</p>
        </div>
        <button onClick={()=>{
            const header=ALL_COLS.map(c=>c.label).join(",");
            const blob=new Blob([header+"\n"],{type:"text/csv"});
            const url=URL.createObjectURL(blob);
            const a=document.createElement("a");
            a.href=url;a.download=`${shop.short||"ROS"}_${entity}_template.csv`;a.click();
            URL.revokeObjectURL(url);
          }}
          style={{padding:"7px 16px",borderRadius:9,border:"1px solid "+shop.accent+"44",
            background:shop.accentBg,color:shop.accentText,fontSize:12,fontWeight:700,
            cursor:"pointer",fontFamily:"inherit"}}>
          ⬇ CSV Template
        </button>
      </div>

      {/* Required columns hint */}
      <div style={{background:"#f8fafc",borderRadius:10,padding:"12px 16px",border:"1px solid #e2e8f0"}}>
        <p style={{margin:"0 0 8px",fontSize:11,fontWeight:800,color:"#475569",textTransform:"uppercase",letterSpacing:"0.06em"}}>Expected Columns (22)</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {ALL_COLS.map((c,i)=>(
            <span key={c.key} style={{fontSize:10,fontWeight:600,color:"#64748b",background:"white",border:"1px solid #e2e8f0",borderRadius:6,padding:"2px 8px"}}>
              {i+1}. {c.label}
            </span>
          ))}
        </div>
      </div>

      {/* drop zone */}
      <div
        onDragOver={e=>{e.preventDefault();setDragOver(true);}}
        onDragLeave={()=>setDragOver(false)}
        onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)setFileName(f.name);}}
        style={{
          border:"2px dashed "+(dragOver?shop.accent:"#cbd5e1"),
          borderRadius:14,padding:"40px 24px",textAlign:"center",
          background:dragOver?shop.accentBg:"#f8fafc",
          transition:"all 0.18s",cursor:"pointer",
        }}
        onClick={()=>document.getElementById("imp-file-"+entity).click()}>
        <input id={"imp-file-"+entity} type="file" accept=".csv,.xlsx"
          style={{display:"none"}}
          onChange={e=>setFileName(e.target.files[0]?.name||null)}/>
        <div style={{fontSize:40,marginBottom:10}}>{fileName?"✅":"📂"}</div>
        <p style={{margin:0,fontWeight:800,fontSize:15,color:fileName?shop.accent:"#374151"}}>
          {fileName||"Drop your CSV file here"}
        </p>
        <p style={{margin:"4px 0 0",fontSize:12,color:"#94a3b8"}}>
          {fileName?"File ready to import":"or click to browse · CSV accepted"}
        </p>
      </div>

      {/* actions */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <button
          onClick={()=>{if(!fileName){alert("Please select a file first.");}else{alert("Import started! "+fileName+" is being processed.");onClose();}}}
          style={{padding:"12px 0",borderRadius:11,border:"none",
            background:fileName?shop.accent:"#e2e8f0",
            color:fileName?"white":"#94a3b8",fontWeight:800,fontSize:14,
            cursor:fileName?"pointer":"not-allowed",fontFamily:"inherit",
            boxShadow:fileName?"0 4px 14px "+shop.accent+"44":"none",
            transition:"all 0.2s"}}>
          ⬆ Import Now
        </button>
        <button onClick={onClose}
          style={{padding:"12px 0",borderRadius:11,border:"1px solid #e2e8f0",
            background:"white",color:"#374151",fontWeight:700,fontSize:14,
            cursor:"pointer",fontFamily:"inherit"}}>
          Cancel
        </button>
      </div>
    </div>
  );
};
/* ══════════════════════════════════════════════════════
   NEW PURCHASE FORM
══════════════════════════════════════════════════════ */
const EditSaleForm=({shopId,shop,sale,onSave,onClose})=>{
  const [form,setForm]=useState({
    id:          sale.id||"",
    date:        sale.date||new Date().toISOString().slice(0,10),
    invoiceNo:   sale.id||"",
    customer:    sale.customer||"",
    contact:     sale.phone||sale.contact||"",
    item:        sale.item||"",
    qty:         sale.qty||"1",
    amount:      sale.amount||"",
    payBy:       sale.pay||"SHOP",
    status:      (sale.ful||sale.status||"PENDING").toUpperCase(),
    sentDate:    sale.sentDate||"",
    returnRcvd:  sale.returnRcvd||"",
    refundAmt:   sale.refundAmt||"",
    tag:         sale.tag||"",
    remarks:     sale.rem||sale.remarks||"",
    taxInclusive: sale.taxInclusive !== false,
    taxRate:      sale.taxRate !== undefined ? sale.taxRate : (shopId==="ros-india" ? 18 : 20),
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const inp={width:"100%",border:"1px solid #e2e8f0",borderRadius:9,padding:"9px 13px",fontSize:13,outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box",color:"#374151",background:"white",transition:"border-color 0.15s"};
  const fo=e=>e.target.style.borderColor=shop.accent;
  const bl=e=>e.target.style.borderColor="#e2e8f0";
  const lbl={fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"};
  const Divider=({title})=>(
    <div style={{display:"flex",alignItems:"center",gap:8,margin:"6px 0 12px"}}>
      <div style={{height:1,flex:1,background:"#f1f5f9"}}/>
      <span style={{fontSize:10,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",whiteSpace:"nowrap"}}>{title}</span>
      <div style={{height:1,flex:1,background:"#f1f5f9"}}/>
    </div>
  );

  const needReturn=["RETURN REQUESTED","RETURNED","EXCHANGED","REFUNDED"].includes(form.status);
  const statusColor={"PENDING":"#a16207","FULFILLED":"#15803d","RETURN REQUESTED":"#c2410c","RETURNED":"#9a3412","EXCHANGED":"#4338ca","REFUNDED":"#6b21a8"};
  const PAY_OPTS=["SHOP","BANK","EXCHANGE","GIFT","PROMOTION"];

  return(
    <div style={{display:"flex",flexDirection:"column",gap:0,maxHeight:"68vh",overflowY:"auto",paddingRight:4}}>

      {/* highlight banner */}
      <div style={{background:shop.accentBg,border:"1px solid "+shop.accent+"33",borderRadius:12,padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:20}}>✏️</span>
        <div>
          <p style={{margin:0,fontWeight:800,fontSize:13,color:shop.accentText}}>Editing Sale {form.invoiceNo}</p>
          <p style={{margin:0,fontSize:11,color:shop.accent}}>All changes will update the sales record immediately on save</p>
        </div>
      </div>

      <Divider title="Basic Info"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div>
          <label style={lbl}>Date</label>
          <input type="date" value={form.date} onChange={e=>set("date",e.target.value)} style={inp} onFocus={fo} onBlur={bl}/>
        </div>
        <div>
          <label style={lbl}>Invoice Number</label>
          <input value={form.invoiceNo} readOnly
            style={{...inp,background:"#f8fafc",fontFamily:"DM Mono,monospace",fontWeight:700,fontSize:12,color:shop.accent,cursor:"default"}}/>
        </div>
      </div>

      <Divider title="Customer"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div>
          <label style={lbl}>Customer Name</label>
          <select value={form.customer} onChange={e=>set("customer",e.target.value)} style={inp}>
            <option value="">Select customer…</option>
            {CUSTOMERS.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Contact Number</label>
          <input value={form.contact} onChange={e=>set("contact",e.target.value)} placeholder="+44 7700 000000" style={inp} onFocus={fo} onBlur={bl}/>
        </div>
      </div>

      <Divider title="Order Details"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div style={{gridColumn:"1/-1"}}>
          <label style={lbl}>Item / Product</label>
          <input value={form.item} onChange={e=>set("item",e.target.value)} placeholder="Item name" style={inp} onFocus={fo} onBlur={bl}/>
        </div>
        <div>
          <label style={lbl}>Quantity</label>
          <input type="number" min="1" value={form.qty} onChange={e=>set("qty",e.target.value)} style={inp} onFocus={fo} onBlur={bl}/>
        </div>
        <div style={{gridColumn:"1/-1"}}>
          {/* GST TOGGLE + RATE */}
          <div style={{background:form.taxInclusive?"#f0fdf4":"#eff6ff",border:"1px solid "+(form.taxInclusive?"#bbf7d0":"#bfdbfe"),borderRadius:10,padding:"12px 14px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div>
                <p style={{margin:0,fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>GST / Tax Calculation</p>
                <p style={{margin:"2px 0 0",fontSize:12,fontWeight:700,color:form.taxInclusive?"#15803d":"#1d4ed8"}}>
                  {form.taxInclusive?"Price includes tax — calculated backwards":"Price excludes tax — added on top"}
                </p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>set("taxInclusive",!form.taxInclusive)}>
                <span style={{fontSize:12,fontWeight:700,color:"#64748b"}}>{form.taxInclusive?"Inclusive":"Exclusive"}</span>
                <div style={{width:44,height:24,borderRadius:999,background:form.taxInclusive?shop.accent:"#cbd5e1",position:"relative",transition:"background 0.2s",boxShadow:"inset 0 1px 3px rgba(0,0,0,0.15)"}}>
                  <div style={{position:"absolute",top:3,left:form.taxInclusive?22:3,width:18,height:18,borderRadius:"50%",background:"white",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
                </div>
              </div>
            </div>
            {/* Tax Rate Buttons */}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,fontWeight:700,color:"#64748b",marginRight:4}}>Tax Rate:</span>
              {[0,5,18,20].map(r=>(
                <button key={r} type="button"
                  onClick={()=>set("taxRate",r)}
                  style={{padding:"4px 12px",borderRadius:999,border:"2px solid "+(form.taxRate===r?shop.accent:"#e2e8f0"),
                    background:form.taxRate===r?shop.accent:"white",
                    color:form.taxRate===r?"white":"#374151",
                    fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>
                  {r}%
                </button>
              ))}
            </div>
          </div>

          {/* Amount input */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <label style={lbl}>
                Amount ({shop.symbol}) — {form.taxInclusive?"incl. tax":"excl. tax"}
              </label>
              <input type="number" value={form.amount} onChange={e=>set("amount",e.target.value)}
                placeholder="0.00" style={inp} onFocus={fo} onBlur={bl}/>
            </div>
            {/* Tax breakdown preview */}
            {form.amount&&Number(form.amount)>0&&(()=>{
              const a=Number(form.amount);
              const rate=(form.taxRate||0)/100;
              const subtotal=form.taxInclusive?parseFloat((a/(1+rate)).toFixed(2)):a;
              const tax=form.taxInclusive?parseFloat((a-subtotal).toFixed(2)):parseFloat((a*rate).toFixed(2));
              const grand=form.taxInclusive?a:parseFloat((a+tax).toFixed(2));
              return(
                <div style={{background:"#f8fafc",borderRadius:10,padding:"10px 12px",border:"1px solid #e2e8f0"}}>
                  <p style={{margin:"0 0 6px",fontSize:10,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em"}}>Tax Breakdown</p>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:11,color:"#64748b"}}>Subtotal</span>
                    <span style={{fontSize:11,fontWeight:700,color:"#374151"}}>{shop.symbol}{subtotal.toLocaleString()}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:11,color:"#64748b"}}>{(form.taxRate||0)===0?"No Tax":("Tax "+form.taxRate+"%")}</span>
                    <span style={{fontSize:11,fontWeight:700,color:"#374151"}}>{shop.symbol}{tax.toLocaleString()}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #e2e8f0",paddingTop:4,marginTop:4}}>
                    <span style={{fontSize:12,fontWeight:800,color:"#0f172a"}}>Grand Total</span>
                    <span style={{fontSize:12,fontWeight:900,color:shop.accent}}>{shop.symbol}{grand.toLocaleString()}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <Divider title="Payment"/>
      <div style={{marginBottom:16}}>
        <label style={lbl}>Payment By</label>
        <select value={PAY_OPTS.includes(form.payBy)?form.payBy:"SHOP"} onChange={e=>set("payBy",e.target.value)} style={inp}>
          {PAY_OPTS.map(o=><option key={o}>{o}</option>)}
        </select>
      </div>

      <Divider title="Delivery"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16,background:"#f8fafc",borderRadius:12,padding:"14px",border:"1px solid #e2e8f0"}}>
        <div>
          <label style={lbl}>Delivery Status</label>
          <select value={form.status} onChange={e=>set("status",e.target.value)}
            style={{...inp,fontWeight:700,color:statusColor[form.status]||"#374151"}}>
            {["PENDING","DISPATCHED","DELIVERED","RETURN REQUESTED","RETURNED","EXCHANGED","REFUNDED"].map(o=>(
              <option key={o} style={{color:statusColor[o]||"#374151"}}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={lbl}>Sent / Dispatch Date</label>
          <input type="date" value={form.sentDate} onChange={e=>set("sentDate",e.target.value)} style={inp} onFocus={fo} onBlur={bl}/>
        </div>
      </div>

      {needReturn&&(
        <>
          <Divider title="Return / Refund"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16,background:"#fff5f5",borderRadius:12,padding:"14px",border:"1px solid #fecaca"}}>
            <div>
              <label style={{...lbl,color:"#dc2626"}}>Return Received Date</label>
              <input type="date" value={form.returnRcvd} onChange={e=>set("returnRcvd",e.target.value)} style={{...inp,border:"1px solid #fecaca"}} onFocus={fo} onBlur={bl}/>
            </div>
            <div>
              <label style={{...lbl,color:"#dc2626"}}>Refunded Amount ({shop.symbol})</label>
              <input type="number" value={form.refundAmt} onChange={e=>set("refundAmt",e.target.value)} placeholder="0.00" style={{...inp,border:"1px solid #fecaca"}} onFocus={fo} onBlur={bl}/>
            </div>
          </div>
        </>
      )}

      <div style={{marginBottom:12}}>
        <label style={lbl}>Sale Type / Tag</label>
        <select value={form.tag} onChange={e=>set("tag",e.target.value)} style={inp}>
          <option value="">Select sale type…</option>
          {["Normal Sale","Bulk Sale","Clearance Sale","Discounted Sale","Exchange Sale","Gift","Wholesale","Return Replacement","Sample Sale"].map(o=><option key={o}>{o}</option>)}
        </select>
      </div>
      <div style={{marginBottom:16}}>
        <label style={lbl}>Remarks</label>
        <textarea value={form.remarks} onChange={e=>set("remarks",e.target.value)} rows={2} placeholder="Any additional notes…" style={{...inp,resize:"vertical"}} onFocus={fo} onBlur={bl}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,position:"sticky",bottom:0,background:"white",paddingBottom:2,paddingTop:6,borderTop:"1px solid #f1f5f9"}}>
        <button onClick={()=>onSave({...form,id:sale.id,ful:form.status,pay:form.payBy,rem:form.remarks,amount:parseFloat(form.amount)||0})}
          style={{padding:"12px 0",borderRadius:11,border:"none",background:shop.accent,color:"white",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px "+shop.accent+"44"}}>
          💾 Save Changes
        </button>
        <button onClick={onClose}
          style={{padding:"12px 0",borderRadius:11,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
          Cancel
        </button>
      </div>
    </div>
  );
};

const NewShipmentForm=({shopId,shop,purch,onSave,onClose})=>{
  const [form,setForm]=useState({
    date:         new Date().toISOString().slice(0,10),
    shipmentId:   "SHP-"+String(Math.floor(Math.random()*9000)+1000),
    purchaseId:   "",
    supplier:     "",
    deliveryAddr: "",
    service:      "",
    serviceCustom:"",
    agent:        "",
    agentCustom:  "",
    trackingNo:   "",
    cost:         "",
    weight:       "",
    status:       "PENDING",
    dispatchDate: "",
    eta:          "",
    receivedDate: "",
    remarks:      "",
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const inp={width:"100%",border:"1px solid #e2e8f0",borderRadius:9,padding:"9px 13px",fontSize:13,outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box",color:"#374151",background:"white",transition:"border-color 0.15s"};
  const fo=e=>e.target.style.borderColor=shop.accent;
  const bl=e=>e.target.style.borderColor="#e2e8f0";
  const lbl={fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"};

  const Divider=({title})=>(
    <div style={{display:"flex",alignItems:"center",gap:8,margin:"6px 0 12px"}}>
      <div style={{height:1,flex:1,background:"#f1f5f9"}}/>
      <span style={{fontSize:10,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",whiteSpace:"nowrap"}}>{title}</span>
      <div style={{height:1,flex:1,background:"#f1f5f9"}}/>
    </div>
  );

  const COURIERS=["DHL","FedEx","Royal Mail","Evri","UPS","DPD","India Post","DTDC","Blue Dart","Other"];
  const AGENTS_LIST=["Other"];
  const STATUS_OPTS=["PENDING","DISPATCHED","IN TRANSIT","OUT FOR DELIVERY","DELIVERED","RETURNED","ON HOLD"];
  const statusColor={"PENDING":"#a16207","DISPATCHED":"#1d4ed8","IN TRANSIT":"#0369a1","OUT FOR DELIVERY":"#7c3aed","DELIVERED":"#15803d","RETURNED":"#c2410c","ON HOLD":"#6b7280"};

  const useCustomService=form.service==="Other";
  const useCustomAgent  =form.agent==="Other";

  /* auto-fill supplier when purchase selected */
  const handlePurchaseSelect=(pid)=>{
    set("purchaseId",pid);
    const p=purch.find(x=>x.id===pid);
    if(p){ set("supplier",p.sup||p.supplier||""); }
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:0,maxHeight:"68vh",overflowY:"auto",paddingRight:4}}>

      {/* SHIPMENT INFO */}
      <Divider title="Shipment Info"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div>
          <label style={lbl}>Shipment Date</label>
          <input type="date" value={form.date} onChange={e=>set("date",e.target.value)} style={inp} onFocus={fo} onBlur={bl}/>
        </div>
        <div>
          <label style={lbl}>Shipment ID</label>
          <input value={form.shipmentId} readOnly
            style={{...inp,background:"#f8fafc",fontFamily:"DM Mono,monospace",fontWeight:700,fontSize:12,color:shop.accent,cursor:"default"}}/>
        </div>
        <div>
          <label style={lbl}>Status</label>
          <select value={form.status} onChange={e=>set("status",e.target.value)}
            style={{...inp,fontWeight:700,color:statusColor[form.status]||"#374151"}}>
            {STATUS_OPTS.map(o=><option key={o} style={{color:statusColor[o]||"#374151"}}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* LINKED PURCHASE */}
      <Divider title="Linked Purchase"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div>
          <label style={lbl}>Link to Purchase ID</label>
          <select value={form.purchaseId} onChange={e=>handlePurchaseSelect(e.target.value)} style={inp}>
            <option value="">Select purchase…</option>
            {purch.map(p=><option key={p.id} value={p.id}>{p.id}{p.sup?" — "+p.sup:p.supplier?" — "+p.supplier:""}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Supplier</label>
          <input value={form.supplier} onChange={e=>set("supplier",e.target.value)}
            placeholder="Auto-filled or enter" style={inp} onFocus={fo} onBlur={bl}/>
        </div>
        <div style={{gridColumn:"1/-1"}}>
          <label style={lbl}>Delivery Address</label>
          <textarea value={form.deliveryAddr} onChange={e=>set("deliveryAddr",e.target.value)}
            rows={2} placeholder="Full delivery / warehouse address"
            style={{...inp,resize:"vertical"}} onFocus={fo} onBlur={bl}/>
        </div>
      </div>

      {/* COURIER */}
      <Divider title="Courier / Agent"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div>
          <label style={lbl}>Courier / Service</label>
          <select value={form.service} onChange={e=>set("service",e.target.value)} style={inp}>
            <option value="">Select courier…</option>
            {COURIERS.map(o=><option key={o}>{o}</option>)}
          </select>
          {useCustomService&&(
            <input value={form.serviceCustom} onChange={e=>set("serviceCustom",e.target.value)}
              placeholder="Enter courier name…" autoFocus
              style={{...inp,marginTop:8,border:"1px solid "+shop.accent}} onFocus={fo} onBlur={bl}/>
          )}
        </div>
        <div>
          <label style={lbl}>Logistic Agent</label>
          <select value={form.agent} onChange={e=>set("agent",e.target.value)} style={inp}>
            <option value="">Select agent…</option>
            {AGENTS_LIST.map(o=><option key={o}>{o}</option>)}
          </select>
          {useCustomAgent&&(
            <input value={form.agentCustom} onChange={e=>set("agentCustom",e.target.value)}
              placeholder="Enter agent name…" autoFocus
              style={{...inp,marginTop:8,border:"1px solid "+shop.accent}} onFocus={fo} onBlur={bl}/>
          )}
        </div>
        <div>
          <label style={lbl}>Tracking Number</label>
          <input value={form.trackingNo} onChange={e=>set("trackingNo",e.target.value)}
            placeholder="AWB / Tracking ref."
            style={{...inp,fontFamily:"DM Mono,monospace"}} onFocus={fo} onBlur={bl}/>
        </div>
        <div>
          <label style={lbl}>Shipping Cost ({shop.symbol})</label>
          <input type="number" value={form.cost} onChange={e=>set("cost",e.target.value)}
            placeholder="0.00" style={inp} onFocus={fo} onBlur={bl}/>
        </div>
      </div>

      {/* DATES */}
      <Divider title="Dates"/>
      <div style={{marginBottom:16}}>
        <label style={lbl}>Actual Received Date</label>
        <input type="date" value={form.receivedDate} onChange={e=>set("receivedDate",e.target.value)}
          style={{...inp,border:"1px solid "+shop.accent+"66",background:shop.accentBg}}
          onFocus={fo} onBlur={bl}/>
      </div>

      {/* REMARKS */}
      <div style={{marginBottom:16}}>
        <label style={lbl}>Remarks</label>
        <textarea value={form.remarks} onChange={e=>set("remarks",e.target.value)}
          rows={2} placeholder="Any notes about this shipment…"
          style={{...inp,resize:"vertical"}} onFocus={fo} onBlur={bl}/>
      </div>

      {/* ACTIONS */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,position:"sticky",bottom:0,background:"white",paddingBottom:2,paddingTop:6,borderTop:"1px solid #f1f5f9"}}>
        <button onClick={()=>onSave(form)}
          style={{padding:"12px 0",borderRadius:11,border:"none",background:shop.accent,color:"white",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px "+shop.accent+"44"}}>
          🚚 Save Shipment
        </button>
        <button onClick={onClose}
          style={{padding:"12px 0",borderRadius:11,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
          Cancel
        </button>
      </div>
    </div>
  );
};


const NewSupplierForm=({shop,onSave,onClose})=>{
  const [sf,setSf]=useState({name:"",place:"",address:"",contactPerson:"",whatsapp:"",tag:"",remarks:""});
  const ss=(k,v)=>setSf(f=>({...f,[k]:v}));
  const inp={width:"100%",border:"1px solid #e2e8f0",borderRadius:9,padding:"9px 13px",fontSize:13,outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box",color:"#374151",background:"white"};
  const lbl={fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"};
  const fo=e=>e.target.style.borderColor=shop.accent;
  const bl=e=>e.target.style.borderColor="#e2e8f0";
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div>
        <label style={lbl}>Supplier Name *</label>
        <input value={sf.name} onChange={e=>ss("name",e.target.value)} placeholder="Company / Supplier name" style={inp} onFocus={fo} onBlur={bl}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div>
          <label style={lbl}>Place / City</label>
          <input value={sf.place} onChange={e=>ss("place",e.target.value)} placeholder="London, Mumbai…" style={inp} onFocus={fo} onBlur={bl}/>
        </div>
        <div>
          <label style={lbl}>Contact Person</label>
          <input value={sf.contactPerson} onChange={e=>ss("contactPerson",e.target.value)} placeholder="Full name" style={inp} onFocus={fo} onBlur={bl}/>
        </div>
      </div>
      <div>
        <label style={lbl}>Address</label>
        <textarea value={sf.address} onChange={e=>ss("address",e.target.value)} rows={2} placeholder="Full address" style={{...inp,resize:"vertical"}} onFocus={fo} onBlur={bl}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div>
          <label style={lbl}>WhatsApp Number</label>
          <input value={sf.whatsapp} onChange={e=>ss("whatsapp",e.target.value)} placeholder="+44 7700 000000" style={inp} onFocus={fo} onBlur={bl}/>
        </div>
        <div>
          <label style={lbl}>Tag</label>
          <select value={sf.tag} onChange={e=>ss("tag",e.target.value)} style={inp}>
            {["","Active","Preferred","Occasional","Inactive"].map(o=><option key={o} value={o}>{o||"None"}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={lbl}>Remarks</label>
        <textarea value={sf.remarks} onChange={e=>ss("remarks",e.target.value)} rows={2} placeholder="Notes about this supplier" style={{...inp,resize:"vertical"}} onFocus={fo} onBlur={bl}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,paddingTop:4}}>
        <button onClick={()=>{if(!sf.name.trim()){alert("Supplier name is required.");return;}onSave({id:Date.now(),name:sf.name,contact:sf.contactPerson,phone:sf.whatsapp,email:"",category:sf.tag||"General",terms:"",place:sf.place,address:sf.address,remarks:sf.remarks});}}
          style={{padding:"12px 0",borderRadius:11,border:"none",background:shop.accent,color:"white",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px "+shop.accent+"44"}}>
          ✅ Add Supplier
        </button>
        <button onClick={onClose} style={{padding:"12px 0",borderRadius:11,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
      </div>
    </div>
  );
};

const NewPurchaseForm=({shopId,shop,onSave,onClose,lastPurchNum})=>{
  const nextNum=(lastPurchNum||700)+1;
  const pfx={["ros-selections"]:"PO",["ros-hairlines"]:"PH",["ros-india"]:"PI"}[shopId]||"PO";
  const autoId=`${pfx}-${String(nextNum).padStart(4,"0")}`;

  const [form,setForm]=useState({
    date:        new Date().toISOString().slice(0,10),
    purchaseId:  autoId,
    idEditing:   false,
    supplier:    "",
    invoiceNo:   "",
    batch:       "",
    item:        "",
    itemCustom:  "",
    qty:         "",
    total:       "",
    gst:         "",
    payBy:       "HDFC SURESH",
    payDate:     new Date().toISOString().slice(0,10),
    logisticBy:  "",
    logisticRef: "",
    receivedDate:"",
    remarks:     "",
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  /* unit cost = total / qty — read-only, auto-calc */
  const unitCost=(()=>{
    const q=parseFloat(form.qty);
    const t=parseFloat(form.total);
    if(q>0&&t>0) return (t/q).toFixed(2);
    return "";
  })();

  const [supplierList,setSupplierList]=useState([...SUPPLIERS]);
  const [showNewSup,setShowNewSup]=useState(false);

  const inp={width:"100%",border:"1px solid #e2e8f0",borderRadius:9,padding:"9px 13px",fontSize:13,outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box",color:"#374151",background:"white",transition:"border-color 0.15s"};
  const inpGray={...inp,background:"#f1f5f9",color:"#64748b",cursor:"not-allowed"};
  const fo=e=>e.target.style.borderColor=shop.accent;
  const bl=e=>e.target.style.borderColor="#e2e8f0";
  const lbl={fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"};

  const Divider=({title})=>(
    <div style={{display:"flex",alignItems:"center",gap:8,margin:"6px 0 12px"}}>
      <div style={{height:1,flex:1,background:"#f1f5f9"}}/>
      <span style={{fontSize:10,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",whiteSpace:"nowrap"}}>{title}</span>
      <div style={{height:1,flex:1,background:"#f1f5f9"}}/>
    </div>
  );

  const useCustomItem=form.item==="__custom__";

  const handleAddSupplier=(newSup)=>{
    setSupplierList(l=>[newSup,...l]);
    set("supplier",newSup.name);
    setShowNewSup(false);
  };

  return(
    <>
    {/* ── NEW SUPPLIER OVERLAY ── */}
    {showNewSup&&(
      <div style={{position:"fixed",inset:0,zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowNewSup(false)}>
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.50)",backdropFilter:"blur(4px)"}}/>
        <div style={{position:"relative",background:"white",borderRadius:20,boxShadow:"0 32px 64px rgba(0,0,0,0.25)",width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto",zIndex:81}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 22px",borderBottom:"1px solid #f1f5f9",background:shop.accent+"12",borderRadius:"20px 20px 0 0"}}>
            <h3 style={{margin:0,fontSize:15,fontWeight:800,color:"#0f172a"}}>➕ New Supplier</h3>
            <button onClick={()=>setShowNewSup(false)} style={{width:30,height:30,borderRadius:"50%",border:"none",background:"#f1f5f9",cursor:"pointer",fontSize:18,color:"#64748b",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
          <div style={{padding:22}}>
            <NewSupplierForm shop={shop} onSave={handleAddSupplier} onClose={()=>setShowNewSup(false)}/>
          </div>
        </div>
      </div>
    )}

    {/* ── MAIN FORM ── */}
    <div style={{display:"flex",flexDirection:"column",gap:0,maxHeight:"68vh",overflowY:"auto",paddingRight:4}}>

      {/* BASIC INFO */}
      <Divider title="Basic Info"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div>
          <label style={lbl}>Date</label>
          <input type="date" value={form.date} onChange={e=>set("date",e.target.value)} style={inp} onFocus={fo} onBlur={bl}/>
        </div>
        <div>
          <label style={lbl}>Purchase ID</label>
          <div style={{display:"flex",gap:6}}>
            <input value={form.purchaseId} readOnly={!form.idEditing} onChange={e=>set("purchaseId",e.target.value)}
              style={{...inp,flex:1,background:form.idEditing?"white":"#f8fafc",fontFamily:"DM Mono,monospace",fontWeight:700,fontSize:12,color:shop.accent,border:"1px solid "+(form.idEditing?shop.accent:"#e2e8f0")}}
              onFocus={fo} onBlur={bl}/>
            <button onClick={()=>set("idEditing",!form.idEditing)}
              style={{flexShrink:0,width:34,height:34,borderRadius:8,cursor:"pointer",border:"1px solid "+(form.idEditing?shop.accent:"#e2e8f0"),background:form.idEditing?shop.accent:"#f8fafc",color:form.idEditing?"white":"#64748b",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
              {form.idEditing?"✓":"✏️"}
            </button>
          </div>
        </div>
        <div>
          <label style={lbl}>Batch / Reference</label>
          <input value={form.batch} onChange={e=>set("batch",e.target.value)} placeholder="Mo 1057" style={inp} onFocus={fo} onBlur={bl}/>
        </div>
        <div>
          <label style={lbl}>Supplier Invoice No.</label>
          <input value={form.invoiceNo} onChange={e=>set("invoiceNo",e.target.value)} placeholder="ELT-7821" style={{...inp,fontFamily:"DM Mono,monospace"}} onFocus={fo} onBlur={bl}/>
        </div>
      </div>

      {/* SUPPLIER */}
      <Divider title="Supplier"/>
      <div style={{marginBottom:16}}>
        <label style={lbl}>Supplier</label>
        <div style={{display:"flex",gap:6}}>
          <select value={form.supplier} onChange={e=>set("supplier",e.target.value)} style={{...inp,flex:1}}>
            <option value="">Select supplier…</option>
            {supplierList.map(s=><option key={s.id} value={s.name}>{s.name}{s.place?" · "+s.place:""}</option>)}
          </select>
          <button onClick={()=>setShowNewSup(true)} title="Add new supplier"
            style={{flexShrink:0,width:34,height:34,borderRadius:8,cursor:"pointer",border:"1px solid "+shop.accent,background:shop.accent,color:"white",fontSize:18,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px "+shop.accent+"44",transition:"all 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.transform="scale(1.08)"}
            onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
            +
          </button>
        </div>
      </div>

      {/* ITEM */}
      <Divider title="Item / Product"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div style={{gridColumn:"1/-1"}}>
          <label style={lbl}>Item</label>
          <select value={form.item} onChange={e=>set("item",e.target.value)} style={inp}>
            <option value="">Select product…</option>
            <option value="__custom__">✏️ Enter manually…</option>
            {PRODUCTS.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
          {useCustomItem&&<input value={form.itemCustom} onChange={e=>set("itemCustom",e.target.value)} placeholder="Type item name" style={{...inp,marginTop:8,border:"1px solid "+shop.accent}} autoFocus onFocus={fo} onBlur={bl}/>}
        </div>
        <div>
          <label style={lbl}>Total Quantity</label>
          <input type="number" min="1" value={form.qty} onChange={e=>set("qty",e.target.value)} placeholder="0" style={inp} onFocus={fo} onBlur={bl}/>
        </div>
        <div>
          <label style={lbl}>Total Amount ({shop.symbol})</label>
          <input type="number" value={form.total} onChange={e=>set("total",e.target.value)} placeholder="0.00" style={inp} onFocus={fo} onBlur={bl}/>
        </div>
        <div>
          <label style={{...lbl,color:"#94a3b8"}}>Unit Cost ({shop.symbol}) <span style={{fontSize:10,fontWeight:500,textTransform:"none",letterSpacing:0}}>— auto</span></label>
          <input readOnly value={unitCost} placeholder="Auto-calculated" style={inpGray}/>
        </div>
        <div>
          <label style={lbl}>GST / VAT ({shop.currency==="INR"?"%":"£"})</label>
          <input type="number" value={form.gst} onChange={e=>set("gst",e.target.value)} placeholder="0" style={inp} onFocus={fo} onBlur={bl}/>
        </div>
      </div>

      {/* PAYMENT */}
      <Divider title="Payment"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div>
          <label style={lbl}>Payment By</label>
          <select value={form.payBy==="OTHER"||!["REMITLY SURESH","REMITLY BINITHA","HDFC SURESH","HDFC BINITHA","ROS INDIA","OTHER"].includes(form.payBy)?"OTHER":form.payBy}
            onChange={e=>set("payBy",e.target.value)} style={{...inp,fontWeight:600}}>
            {["REMITLY SURESH","REMITLY BINITHA","HDFC SURESH","HDFC BINITHA","ROS INDIA","OTHER"].map(o=><option key={o}>{o}</option>)}
          </select>
          {(form.payBy==="OTHER"||!["REMITLY SURESH","REMITLY BINITHA","HDFC SURESH","HDFC BINITHA","ROS INDIA"].includes(form.payBy))&&(
            <input
              value={form.payBy==="OTHER"?"":form.payBy}
              onChange={e=>set("payBy",e.target.value||"OTHER")}
              placeholder="Enter payment method…"
              autoFocus
              style={{...inp,marginTop:8,border:"1px solid "+shop.accent,fontWeight:600}}
              onFocus={fo} onBlur={bl}/>
          )}
        </div>
        <div>
          <label style={lbl}>Payment Date</label>
          <input type="date" value={form.payDate} onChange={e=>set("payDate",e.target.value)} style={inp} onFocus={fo} onBlur={bl}/>
        </div>
      </div>

      {/* LOGISTICS */}
      <Divider title="Logistics"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div>
          <label style={lbl}>Logistic Service By</label>
          <input value={form.logisticBy} onChange={e=>set("logisticBy",e.target.value)} placeholder="DHL, FedEx, India Post…" style={inp} onFocus={fo} onBlur={bl}/>
        </div>
        <div>
          <label style={lbl}>Logistic Ref. Number</label>
          <input value={form.logisticRef} onChange={e=>set("logisticRef",e.target.value)} placeholder="Tracking / AWB number" style={{...inp,fontFamily:"DM Mono,monospace"}} onFocus={fo} onBlur={bl}/>
        </div>
        <div>
          <label style={lbl}>Item Received Date</label>
          <input type="date" value={form.receivedDate} onChange={e=>set("receivedDate",e.target.value)} style={inp} onFocus={fo} onBlur={bl}/>
        </div>
      </div>

      {/* REMARKS */}
      <div style={{marginBottom:16}}>
        <label style={lbl}>Remarks</label>
        <textarea value={form.remarks} onChange={e=>set("remarks",e.target.value)} rows={2} placeholder="Notes about this purchase…" style={{...inp,resize:"vertical"}} onFocus={fo} onBlur={bl}/>
      </div>

      {/* ACTIONS */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,position:"sticky",bottom:0,background:"white",paddingBottom:2,paddingTop:6,borderTop:"1px solid #f1f5f9"}}>
        <button onClick={()=>onSave(form)}
          style={{padding:"12px 0",borderRadius:11,border:"none",background:shop.accent,color:"white",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px "+shop.accent+"44"}}>
          💾 Save Purchase
        </button>
        <button onClick={onClose}
          style={{padding:"12px 0",borderRadius:11,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
          Cancel
        </button>
      </div>
    </div>
    </>
  );
};


const NewCustomerForm=({shop,onSave,onClose})=>{
  const [cf,setCf]=useState({
    name:"",phone:"",email:"",
    phoneSavedOn:"UK 888",
    addressee:"",address:"",tag:"",remarks:"",
  });
  const sc=(k,v)=>setCf(f=>({...f,[k]:v}));

  const inp={
    width:"100%",border:"1px solid #e2e8f0",borderRadius:9,
    padding:"9px 13px",fontSize:13,outline:"none",
    fontFamily:"DM Sans,sans-serif",boxSizing:"border-box",
    color:"#374151",background:"white",
  };
  const lbl={fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"};
  const fo=e=>e.target.style.borderColor=shop.accent;
  const bl=e=>e.target.style.borderColor="#e2e8f0";

  const handleSave=()=>{
    if(!cf.name.trim()){alert("Customer name is required.");return;}
    onSave({
      id:Date.now(),
      name:cf.name,phone:cf.phone,whatsapp:cf.phone,
      address:cf.address,notes:cf.remarks,
      purchases:0,spend:0,last:"—",tag:cf.tag,
      email:cf.email,addressee:cf.addressee,phoneSavedOn:cf.phoneSavedOn,
    });
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* name */}
      <div>
        <label style={lbl}>Customer Name *</label>
        <input value={cf.name} onChange={e=>sc("name",e.target.value)}
          placeholder="Full name" style={inp} onFocus={fo} onBlur={bl}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {/* phone */}
        <div>
          <label style={lbl}>Phone Number</label>
          <input value={cf.phone} onChange={e=>sc("phone",e.target.value)}
            placeholder="+44 7700 000000" style={inp} onFocus={fo} onBlur={bl}/>
        </div>
        {/* email */}
        <div>
          <label style={lbl}>Email</label>
          <input type="email" value={cf.email} onChange={e=>sc("email",e.target.value)}
            placeholder="email@example.com" style={inp} onFocus={fo} onBlur={bl}/>
        </div>
      </div>

      {/* phone saved on */}
      <div>
        <label style={lbl}>Phone Number Saved On</label>
        <select value={cf.phoneSavedOn} onChange={e=>sc("phoneSavedOn",e.target.value)} style={inp}>
          {["UK 888","INDIA 889","INDIA 888"].map(o=><option key={o}>{o}</option>)}
        </select>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {/* addressee */}
        <div>
          <label style={lbl}>Addressee</label>
          <input value={cf.addressee} onChange={e=>sc("addressee",e.target.value)}
            placeholder="Name on delivery label" style={inp} onFocus={fo} onBlur={bl}/>
        </div>
        {/* tag */}
        <div>
          <label style={lbl}>Tag</label>
          <select value={cf.tag} onChange={e=>sc("tag",e.target.value)} style={inp}>
            {["","VIP","Wholesale","New Customer","Regular","Not Good","Regular Return","Banned"].map(o=><option key={o} value={o}>{o||"None"}</option>)}
          </select>
        </div>
      </div>

      {/* address */}
      <div>
        <label style={lbl}>Address</label>
        <textarea value={cf.address} onChange={e=>sc("address",e.target.value)}
          rows={2} placeholder="Full delivery address"
          style={{...inp,resize:"vertical"}} onFocus={fo} onBlur={bl}/>
      </div>

      {/* remarks */}
      <div>
        <label style={lbl}>Remarks</label>
        <textarea value={cf.remarks} onChange={e=>sc("remarks",e.target.value)}
          rows={2} placeholder="Any notes about this customer"
          style={{...inp,resize:"vertical"}} onFocus={fo} onBlur={bl}/>
      </div>

      {/* actions */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,paddingTop:4}}>
        <button onClick={handleSave}
          style={{padding:"12px 0",borderRadius:11,border:"none",
            background:shop.accent,color:"white",fontWeight:800,fontSize:14,
            cursor:"pointer",fontFamily:"inherit",
            boxShadow:"0 4px 14px "+shop.accent+"44"}}>
          ✅ Add Customer
        </button>
        <button onClick={onClose}
          style={{padding:"12px 0",borderRadius:11,border:"1px solid #e2e8f0",
            background:"white",color:"#374151",fontWeight:700,fontSize:14,
            cursor:"pointer",fontFamily:"inherit"}}>
          Cancel
        </button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   NEW SALE FORM
══════════════════════════════════════════════════════ */
const NewSaleForm=({shopId,shop,onSave,onClose,lastInvoiceNum})=>{
  const nextNum=(lastInvoiceNum||1312)+1;
  /* Financial year suffix: Apr-Mar cycle
     e.g. sale in Jan 2026 → FY 2025-26 → suffix "6"
          sale in May 2025 → FY 2025-26 → suffix "6"
          sale in May 2026 → FY 2026-27 → suffix "7"  */
  const _now=new Date();
  const _yr=_now.getMonth()>=3?_now.getFullYear():_now.getFullYear()-1; // FY start year
  const _fySuffix=String(_yr+1).slice(-1); // last digit of end year
  const _seq=String(nextNum).padStart(4,"0");
  const autoInv=`ROS${_seq}${_fySuffix}`;

  const [form,setForm]=useState({
    date:        new Date().toISOString().slice(0,10),
    invoiceNo:   autoInv,
    invEditing:  false,
    customer:    "",
    contact:     "",
    item:        "",
    itemCustom:  "",
    qty:         "1",
    amount:      "",
    taxInclusive: true,
    taxRate:     shopId==="ros-india" ? 18 : 20,
    payBy:       "SHOP",
    status:      "PENDING",
    sentDate:    "",
    returnRcvd:  "",
    refundAmt:   "",
    tag:         "",
    remarks:     "",
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  /* local customer list — starts from shared CUSTOMERS, grows if new ones added */
  const [customerList,setCustomerList]=useState([...CUSTOMERS]);
  const [showNewCust,setShowNewCust]=useState(false);

  const inp={
    width:"100%",border:"1px solid #e2e8f0",borderRadius:9,
    padding:"9px 13px",fontSize:13,outline:"none",
    fontFamily:"DM Sans,sans-serif",boxSizing:"border-box",
    color:"#374151",background:"white",transition:"border-color 0.15s",
  };
  const fo=e=>e.target.style.borderColor=shop.accent;
  const bl=e=>e.target.style.borderColor="#e2e8f0";
  const lbl={fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"};

  const Divider=({title})=>(
    <div style={{display:"flex",alignItems:"center",gap:8,margin:"6px 0 12px"}}>
      <div style={{height:1,flex:1,background:"#f1f5f9"}}/>
      <span style={{fontSize:10,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",whiteSpace:"nowrap"}}>{title}</span>
      <div style={{height:1,flex:1,background:"#f1f5f9"}}/>
    </div>
  );

  const needReturn=["RETURN REQUESTED","RETURNED","EXCHANGED","REFUNDED"].includes(form.status);
  const useCustomItem=form.item==="__custom__";

  const handleAddCustomer=(newCust)=>{
    setCustomerList(l=>[newCust,...l]);
    set("customer",newCust.name);
    set("contact",newCust.phone);
    setShowNewCust(false);
  };

  /* Status colour map */
  const statusColor={
    "PENDING":"#a16207","FULFILLED":"#15803d",
    "RETURN REQUESTED":"#c2410c","RETURNED":"#9a3412",
    "EXCHANGED":"#4338ca","REFUNDED":"#6b21a8",
  };



  return(
    <>
    {/* ── NEW CUSTOMER OVERLAY ── */}
    {showNewCust&&(
      <div style={{position:"fixed",inset:0,zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
        onClick={()=>setShowNewCust(false)}>
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.50)",backdropFilter:"blur(4px)"}}/>
        <div style={{position:"relative",background:"white",borderRadius:20,
          boxShadow:"0 32px 64px rgba(0,0,0,0.25)",width:"100%",maxWidth:500,
          maxHeight:"90vh",overflowY:"auto",zIndex:81}}
          onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:"16px 22px",borderBottom:"1px solid #f1f5f9",
            background:shop.accent+"12",borderRadius:"20px 20px 0 0"}}>
            <h3 style={{margin:0,fontSize:15,fontWeight:800,color:"#0f172a"}}>➕ New Customer</h3>
            <button onClick={()=>setShowNewCust(false)}
              style={{width:30,height:30,borderRadius:"50%",border:"none",
                background:"#f1f5f9",cursor:"pointer",fontSize:18,
                color:"#64748b",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
          <div style={{padding:22}}>
            <NewCustomerForm shop={shop} onSave={handleAddCustomer} onClose={()=>setShowNewCust(false)}/>
          </div>
        </div>
      </div>
    )}

    {/* ── MAIN FORM ── */}
    <div style={{display:"flex",flexDirection:"column",gap:0,maxHeight:"68vh",overflowY:"auto",paddingRight:4}}>

      {/* BASIC INFO */}
      <Divider title="Basic Info"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div>
          <label style={lbl}>Date</label>
          <input type="date" value={form.date} onChange={e=>set("date",e.target.value)}
            style={inp} onFocus={fo} onBlur={bl}/>
        </div>
        <div>
          <label style={lbl}>Invoice Number</label>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <input
              value={form.invoiceNo}
              readOnly={!form.invEditing}
              onChange={e=>set("invoiceNo",e.target.value)}
              style={{...inp,flex:1,
                background:form.invEditing?"white":"#f8fafc",
                fontFamily:"DM Mono,monospace",fontWeight:700,fontSize:12,
                color:shop.accent,
                border:"1px solid "+(form.invEditing?shop.accent:"#e2e8f0"),
              }}
              onFocus={fo} onBlur={bl}/>
            <button
              onClick={()=>set("invEditing",!form.invEditing)}
              title={form.invEditing?"Lock invoice number":"Edit invoice number"}
              style={{flexShrink:0,width:34,height:34,borderRadius:8,cursor:"pointer",
                border:"1px solid "+(form.invEditing?shop.accent:"#e2e8f0"),
                background:form.invEditing?shop.accent:"#f8fafc",
                color:form.invEditing?"white":"#64748b",
                fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",
                transition:"all 0.15s",}}>
              {form.invEditing?"✓":"✏️"}
            </button>
          </div>
          <p style={{margin:"3px 0 0",fontSize:10,color:"#94a3b8"}}>Auto-generated · ✏️ to edit</p>
        </div>
      </div>

      {/* CUSTOMER */}
      <Divider title="Customer"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div>
          <label style={lbl}>Customer Name</label>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <select value={form.customer} onChange={e=>{
                set("customer",e.target.value);
                const c=customerList.find(x=>x.name===e.target.value);
                if(c)set("contact",c.phone||"");
              }} style={{...inp,flex:1}}>
              <option value="">Select customer…</option>
              {customerList.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            {/* + add new customer */}
            <button onClick={()=>setShowNewCust(true)}
              title="Add new customer"
              style={{flexShrink:0,width:34,height:34,borderRadius:8,cursor:"pointer",
                border:"1px solid "+shop.accent,
                background:shop.accent,color:"white",
                fontSize:18,fontWeight:900,
                display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:"0 2px 8px "+shop.accent+"44",
                transition:"all 0.15s",}}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.08)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
              +
            </button>
          </div>
        </div>
        <div>
          <label style={lbl}>Contact Number</label>
          <input value={form.contact} onChange={e=>set("contact",e.target.value)}
            placeholder="+44 7700 000000" style={inp} onFocus={fo} onBlur={bl}/>
        </div>
      </div>

      {/* ORDER DETAILS */}
      <Divider title="Order Details"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div style={{gridColumn:"1/-1"}}>
          <label style={lbl}>Item / Product</label>
          <div style={{display:"flex",gap:8}}>
            <select value={form.item} onChange={e=>set("item",e.target.value)} style={{...inp,flex:1}}>
              <option value="">Select product…</option>
              <option value="__custom__">✏️ Enter manually…</option>
              {PRODUCTS.map(p=><option key={p.id} value={p.name}>{p.name} — {shop.symbol}{p.sell}</option>)}
            </select>
          </div>
          {useCustomItem&&(
            <input value={form.itemCustom} onChange={e=>set("itemCustom",e.target.value)}
              placeholder="Type item name / description"
              style={{...inp,marginTop:8,border:"1px solid "+shop.accent}}
              autoFocus onFocus={fo} onBlur={bl}/>
          )}
        </div>
        <div>
          <label style={lbl}>Quantity</label>
          <input type="number" min="1" value={form.qty} onChange={e=>set("qty",e.target.value)}
            style={inp} onFocus={fo} onBlur={bl}/>
        </div>
        <div style={{gridColumn:"1/-1"}}>
          {/* GST TOGGLE */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
            background:form.taxInclusive?"#f0fdf4":"#eff6ff",
            border:"1px solid "+(form.taxInclusive?"#bbf7d0":"#bfdbfe"),
            borderRadius:10,padding:"10px 14px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div>
                <p style={{margin:0,fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>GST / Tax Calculation</p>
                <p style={{margin:"2px 0 0",fontSize:12,fontWeight:700,color:form.taxInclusive?"#15803d":"#1d4ed8"}}>
                  {form.taxInclusive?"Price includes tax — calculated backwards":"Price excludes tax — added on top"}
                </p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>set("taxInclusive",!form.taxInclusive)}>
                <span style={{fontSize:12,fontWeight:700,color:"#64748b"}}>{form.taxInclusive?"Inclusive":"Exclusive"}</span>
                <div style={{width:44,height:24,borderRadius:999,background:form.taxInclusive?shop.accent:"#cbd5e1",position:"relative",transition:"background 0.2s",boxShadow:"inset 0 1px 3px rgba(0,0,0,0.15)"}}>
                  <div style={{position:"absolute",top:3,left:form.taxInclusive?22:3,width:18,height:18,borderRadius:"50%",background:"white",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
                </div>
              </div>
            </div>
            {/* Tax Rate Buttons */}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,fontWeight:700,color:"#64748b",marginRight:4}}>Tax Rate:</span>
              {[0,5,18,20].map(r=>(
                <button key={r} type="button" onClick={()=>set("taxRate",r)}
                  style={{padding:"4px 12px",borderRadius:999,border:"2px solid "+(form.taxRate===r?shop.accent:"#e2e8f0"),
                    background:form.taxRate===r?shop.accent:"white",color:form.taxRate===r?"white":"#374151",
                    fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>
                  {r}%
                </button>
              ))}
            </div>
          </div>
          {/* Amount + live breakdown */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <label style={lbl}>Amount ({shop.symbol}) — {form.taxInclusive?"incl. tax":"excl. tax"}</label>
              <input type="number" value={form.amount} onChange={e=>set("amount",e.target.value)}
                placeholder="0.00" style={inp} onFocus={fo} onBlur={bl}/>
            </div>
            {form.amount&&Number(form.amount)>0&&(()=>{
              const a=Number(form.amount);
              const rate=(form.taxRate||0)/100;
              const subtotal=form.taxInclusive?parseFloat((a/(1+rate)).toFixed(2)):a;
              const tax=form.taxInclusive?parseFloat((a-subtotal).toFixed(2)):parseFloat((a*rate).toFixed(2));
              const grand=form.taxInclusive?a:parseFloat((a+tax).toFixed(2));
              return(
                <div style={{background:"#f8fafc",borderRadius:10,padding:"10px 12px",border:"1px solid #e2e8f0"}}>
                  <p style={{margin:"0 0 6px",fontSize:10,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em"}}>Tax Breakdown</p>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:11,color:"#64748b"}}>Subtotal</span>
                    <span style={{fontSize:11,fontWeight:700,color:"#374151"}}>{shop.symbol}{subtotal.toLocaleString()}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:11,color:"#64748b"}}>{(form.taxRate||0)===0?"No Tax":("Tax "+form.taxRate+"%")}</span>
                    <span style={{fontSize:11,fontWeight:700,color:"#374151"}}>{shop.symbol}{tax.toLocaleString()}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #e2e8f0",paddingTop:4,marginTop:4}}>
                    <span style={{fontSize:12,fontWeight:800,color:"#0f172a"}}>Grand Total</span>
                    <span style={{fontSize:12,fontWeight:900,color:shop.accent}}>{shop.symbol}{grand.toLocaleString()}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* PAYMENT */}
      <Divider title="Payment"/>
      <div style={{marginBottom:16}}>
        <label style={lbl}>Payment By</label>
        <select value={form.payBy} onChange={e=>set("payBy",e.target.value)} style={inp}>
          {["SHOP","BANK","EXCHANGE","GIFT","PROMOTION"].map(o=><option key={o}>{o}</option>)}
        </select>
      </div>

      {/* DELIVERY */}
      <Divider title="Delivery"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16,background:"#f8fafc",borderRadius:12,padding:"14px",border:"1px solid #e2e8f0"}}>
        <div>
          <label style={lbl}>Delivery Status</label>
          <select value={form.status} onChange={e=>set("status",e.target.value)}
            style={{...inp,color:statusColor[form.status]||"#374151",fontWeight:700}}>
            {["PENDING","DISPATCHED","DELIVERED","RETURN REQUESTED","RETURNED","EXCHANGED","REFUNDED"].map(o=>(
              <option key={o} value={o} style={{color:statusColor[o]||"#374151"}}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={lbl}>Sent / Dispatch Date</label>
          <input type="date" value={form.sentDate} onChange={e=>set("sentDate",e.target.value)}
            style={inp} onFocus={fo} onBlur={bl}/>
        </div>
      </div>

      {/* RETURN / REFUND — conditional */}
      {needReturn&&(
        <>
          <Divider title="Return / Refund"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16,
            background:"#fff5f5",borderRadius:12,padding:"14px 14px",border:"1px solid #fecaca"}}>
            <div>
              <label style={{...lbl,color:"#dc2626"}}>Return Received Date</label>
              <input type="date" value={form.returnRcvd} onChange={e=>set("returnRcvd",e.target.value)}
                style={{...inp,border:"1px solid #fecaca"}} onFocus={fo} onBlur={bl}/>
            </div>
            <div>
              <label style={{...lbl,color:"#dc2626"}}>Refunded Amount ({shop.symbol})</label>
              <input type="number" value={form.refundAmt} onChange={e=>set("refundAmt",e.target.value)}
                placeholder="0.00" style={{...inp,border:"1px solid #fecaca"}} onFocus={fo} onBlur={bl}/>
            </div>
          </div>
        </>
      )}

      {/* TAG + REMARKS */}
      <div style={{marginBottom:12}}>
        <label style={lbl}>Sale Type / Tag</label>
        <select value={form.tag} onChange={e=>set("tag",e.target.value)} style={inp}>
          <option value="">Select sale type…</option>
          {["Normal Sale","Bulk Sale","Clearance Sale","Discounted Sale","Exchange Sale","Gift","Wholesale","Return Replacement","Sample Sale"].map(o=><option key={o}>{o}</option>)}
        </select>
      </div>
      <div style={{marginBottom:16}}>
        <label style={lbl}>Remarks</label>
        <textarea value={form.remarks} onChange={e=>set("remarks",e.target.value)}
          rows={2} placeholder="Any additional notes…"
          style={{...inp,resize:"vertical"}} onFocus={fo} onBlur={bl}/>
      </div>

      {/* ACTIONS — sticky */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,
        position:"sticky",bottom:0,background:"white",paddingBottom:2,paddingTop:6,
        borderTop:"1px solid #f1f5f9"}}>
        <button onClick={()=>onSave(form)}
          style={{padding:"12px 0",borderRadius:11,border:"none",
            background:shop.accent,color:"white",fontWeight:800,fontSize:14,
            cursor:"pointer",fontFamily:"inherit",
            boxShadow:"0 4px 14px "+shop.accent+"44"}}>
          💾 Save Sale
        </button>
        <button onClick={onClose}
          style={{padding:"12px 0",borderRadius:11,border:"1px solid #e2e8f0",
            background:"white",color:"#374151",fontWeight:700,fontSize:14,
            cursor:"pointer",fontFamily:"inherit"}}>
          Cancel
        </button>
      </div>
    </div>
    </>
  );
};

/* =========================================================
   INLINE PANEL COMPONENTS
   ========================================================= */

/* ── CustomersPanel ── */
const CustomersPanel=({customers,search,shop,Badge})=>{
  const [sel,setSel]=useState(null);
  const [hovR,setHovR]=useState(null);
  const filtered=(customers||[]).filter(c=>
    !search||c.name.toLowerCase().includes(search.toLowerCase())||
    c.phone.includes(search)||c.tag.toLowerCase().includes(search.toLowerCase())
  );
  const tagColor={
    "VIP":          {bg:"#fef9c3",color:"#854d0e",border:"#fde68a"},
    "Wholesale":    {bg:"#ede9fe",color:"#5b21b6",border:"#ddd6fe"},
    "Regular":      {bg:"#dcfce7",color:"#166534",border:"#bbf7d0"},
    "New Customer": {bg:"#dbeafe",color:"#1e40af",border:"#bfdbfe"},
  };
  const tc=t=>tagColor[t]||{bg:"#f1f5f9",color:"#475569",border:"#e2e8f0"};

  return(
    <div style={{padding:0}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <h2 style={{margin:"0 0 2px",fontSize:20,fontWeight:800,color:"#0f172a"}}>Customers</h2>
          <p style={{margin:0,fontSize:12,color:"#94a3b8"}}>{filtered.length} contact{filtered.length!==1?"s":""}</p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {["VIP","Wholesale","Regular","New Customer"].map(tag=>{
            const t=tc(tag);
            return(
              <span key={tag} style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:999,
                background:t.bg,color:t.color,border:"1px solid "+t.border}}>
                {tag} · {(customers||[]).filter(c=>c.tag===tag).length}
              </span>
            );
          })}
        </div>
      </div>

      <div style={{background:"white",borderRadius:16,border:"1px solid #f1f5f9",overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.04)"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"#f8fafc",borderBottom:"1px solid #f1f5f9"}}>
              {["Customer","Contact","Address","Purchases","Total Spend","Last Order","Tag"].map(h=>(
                <th key={h} style={{padding:"11px 16px",fontSize:10,fontWeight:800,color:"#64748b",
                  textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"left",whiteSpace:"nowrap"}}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0&&(
              <tr><td colSpan={7} style={{padding:40,textAlign:"center",color:"#94a3b8",fontSize:13}}>No customers found</td></tr>
            )}
            {filtered.map((c,i)=>{
              const isH=hovR===c.id;
              const isSel=sel===c.id;
              const t=tc(c.tag);
              return(
                <tr key={c.id}
                  onClick={()=>setSel(isSel?null:c.id)}
                  onMouseEnter={()=>setHovR(c.id)}
                  onMouseLeave={()=>setHovR(null)}
                  style={{
                    borderBottom:i<filtered.length-1?"1px solid #f8fafc":"none",
                    background:isSel?shop.accentBg:isH?"#fafafa":"white",
                    cursor:"pointer",transition:"background 0.12s",
                  }}>
                  <td style={{padding:"13px 16px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:34,height:34,borderRadius:10,flexShrink:0,
                        background:shop.sb,display:"flex",alignItems:"center",justifyContent:"center",
                        color:"white",fontWeight:800,fontSize:13,
                        boxShadow:"0 2px 6px rgba(0,0,0,0.12)"}}>
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <p style={{margin:0,fontWeight:700,fontSize:13,color:"#0f172a"}}>{c.name}</p>
                        {c.notes&&<p style={{margin:0,fontSize:10,color:"#94a3b8"}}>{c.notes}</p>}
                      </div>
                    </div>
                  </td>
                  <td style={{padding:"13px 16px"}}>
                    <p style={{margin:"0 0 2px",fontSize:12,fontWeight:600,color:"#374151"}}>{c.phone}</p>
                    <p style={{margin:0,fontSize:10,color:"#22c55e",fontWeight:600}}>💬 {c.whatsapp}</p>
                  </td>
                  <td style={{padding:"13px 16px",fontSize:12,color:"#64748b",maxWidth:160}}>
                    <span style={{display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.address}</span>
                  </td>
                  <td style={{padding:"13px 16px",textAlign:"center"}}>
                    <span style={{fontSize:14,fontWeight:800,color:shop.accent}}>{c.purchases}</span>
                  </td>
                  <td style={{padding:"13px 16px"}}>
                    <span style={{fontFamily:"DM Mono,monospace",fontSize:13,fontWeight:700,color:"#0f172a"}}>
                      {c.spend>=10000?("₹"+c.spend.toLocaleString()):("£"+c.spend.toLocaleString())}
                    </span>
                  </td>
                  <td style={{padding:"13px 16px",fontSize:12,color:"#64748b"}}>{c.last}</td>
                  <td style={{padding:"13px 16px"}}>
                    {c.tag&&(
                      <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:999,
                        background:t.bg,color:t.color,border:"1px solid "+t.border,whiteSpace:"nowrap"}}>
                        {c.tag}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sel&&(()=>{
        const c=(customers||[]).find(x=>x.id===sel);
        if(!c)return null;
        const t=tc(c.tag);
        return(
          <div style={{marginTop:16,background:"white",borderRadius:16,border:"1px solid "+shop.accent+"33",
            padding:20,boxShadow:"0 4px 20px "+shop.accent+"15"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:16}}>
              <div style={{width:52,height:52,borderRadius:14,background:shop.sb,
                display:"flex",alignItems:"center",justifyContent:"center",
                color:"white",fontWeight:900,fontSize:20,flexShrink:0,
                boxShadow:"0 4px 12px rgba(0,0,0,0.15)"}}>
                {c.name.charAt(0)}
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <h3 style={{margin:0,fontSize:17,fontWeight:800,color:"#0f172a"}}>{c.name}</h3>
                  {c.tag&&<span style={{fontSize:11,fontWeight:700,padding:"2px 10px",borderRadius:999,
                    background:t.bg,color:t.color,border:"1px solid "+t.border}}>{c.tag}</span>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
                  {[
                    {l:"Phone",      v:c.phone,    ic:"📞"},
                    {l:"WhatsApp",   v:c.whatsapp, ic:"💬"},
                    {l:"Address",    v:c.address,  ic:"📍"},
                    {l:"Notes",      v:c.notes||"—",ic:"📝"},
                    {l:"Purchases",  v:c.purchases, ic:"🛒"},
                    {l:"Total Spend",v:(c.spend>=10000?"₹":"£")+c.spend.toLocaleString(),ic:"💰"},
                    {l:"Last Order", v:c.last,      ic:"📅"},
                  ].map((f,i)=>(
                    <div key={i} style={{background:"#f8fafc",borderRadius:10,padding:"10px 12px",
                      border:"1px solid #f1f5f9"}}>
                      <p style={{margin:"0 0 3px",fontSize:9,fontWeight:800,color:"#94a3b8",
                        textTransform:"uppercase",letterSpacing:"0.06em"}}>{f.ic} {f.l}</p>
                      <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0f172a",
                        wordBreak:"break-word"}}>{String(f.v)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

/* ── AgentsPanel (Logistics Agents) ── */
const AgentsPanel=({agents,shop})=>{
  const [hovR,setHovR]=useState(null);
  const typeColor={
    "Courier":{bg:"#dbeafe",color:"#1e40af",border:"#bfdbfe",ic:"🚀"},
    "Postal": {bg:"#dcfce7",color:"#166534",border:"#bbf7d0",ic:"📦"},
  };
  return(
    <div>
      <div style={{marginBottom:20}}>
        <h2 style={{margin:"0 0 2px",fontSize:20,fontWeight:800,color:"#0f172a"}}>Logistics Agents</h2>
        <p style={{margin:0,fontSize:12,color:"#94a3b8"}}>{(agents||[]).length} shipping partners configured</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16,marginBottom:24}}>
        {(agents||[]).map(a=>{
          const tc=typeColor[a.type]||{bg:"#f1f5f9",color:"#475569",border:"#e2e8f0",ic:"🚚"};
          const isH=hovR===a.id;
          return(
            <div key={a.id}
              onMouseEnter={()=>setHovR(a.id)}
              onMouseLeave={()=>setHovR(null)}
              style={{
                background:"white",borderRadius:16,
                border:isH?"1px solid "+shop.accent+"44":"1px solid #f1f5f9",
                padding:20,
                boxShadow:isH?"0 8px 24px "+shop.accent+"18":"0 2px 8px rgba(0,0,0,0.04)",
                transition:"all 0.18s",transform:isH?"translateY(-2px)":"none",
              }}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <div style={{width:44,height:44,borderRadius:12,background:shop.accentBg,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,
                  border:"1px solid "+shop.accent+"22",flexShrink:0}}>
                  {tc.ic}
                </div>
                <div>
                  <p style={{margin:"0 0 4px",fontWeight:800,fontSize:15,color:"#0f172a"}}>{a.name}</p>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:999,
                    background:tc.bg,color:tc.color,border:"1px solid "+tc.border}}>
                    {a.type}
                  </span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8,background:"#f8fafc",
                  borderRadius:8,padding:"8px 12px",border:"1px solid #f1f5f9"}}>
                  <span>📞</span>
                  <span style={{fontSize:12,fontWeight:600,color:"#374151",fontFamily:"DM Mono,monospace"}}>{a.contact}</span>
                </div>
                <a href={a.url} target="_blank" rel="noopener noreferrer"
                  style={{display:"flex",alignItems:"center",gap:8,background:shop.accentBg,
                    borderRadius:8,padding:"8px 12px",border:"1px solid "+shop.accent+"22",
                    textDecoration:"none",cursor:"pointer",transition:"background 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=shop.accent+"22"}
                  onMouseLeave={e=>e.currentTarget.style.background=shop.accentBg}>
                  <span>🔗</span>
                  <span style={{fontSize:12,fontWeight:600,color:shop.accent}}>Track Shipment →</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{background:"#fffbeb",borderRadius:12,padding:"12px 16px",
        border:"1px solid #fde68a",display:"flex",alignItems:"center",gap:10}}>
        <span>💡</span>
        <p style={{margin:0,fontSize:12,color:"#92400e",fontWeight:500}}>
          Click <strong>Track Shipment</strong> to open the carrier tracking portal in a new tab.
        </p>
      </div>
    </div>
  );
};


/* =========================================================
   SETTINGS PANEL (Suresh / superadmin only)
   ========================================================= */
const SettingsPanel=({users,setUsers,currentUser,onClose})=>{
  const [tab,setTab]=useState("users");
  const [editId,setEditId]=useState(null);
  const [hovR,setHovR]=useState(null);
  // new user form
  const [newName,setNewName]=useState("");
  const [newPin,setNewPin]=useState("");
  const [newRole,setNewRole]=useState("staff");
  const [newShops,setNewShops]=useState([]);
  const [formErr,setFormErr]=useState("");
  const [saved,setSaved]=useState(false);
  // edit PIN form
  const [editPin,setEditPin]=useState("");
  const [editPinErr,setEditPinErr]=useState("");

  const SHOP_LABELS={
    "ros-selections":"ROS Selections UK",
    "ros-hairlines":"ROS Hairlines UK",
    "ros-india":"ROS India",
  };
  const AVATARS=[
    "linear-gradient(135deg,#1d4ed8,#7c3aed)",
    "linear-gradient(135deg,#059669,#0891b2)",
    "linear-gradient(135deg,#64748b,#334155)",
    "linear-gradient(135deg,#dc2626,#f97316)",
    "linear-gradient(135deg,#7c3aed,#ec4899)",
    "linear-gradient(135deg,#0891b2,#059669)",
  ];

  const flash=()=>{setSaved(true);setTimeout(()=>setSaved(false),2000);};

  const savePin=()=>{
    if(!/^[0-9]{4}$/.test(editPin)){setEditPinErr("PIN must be exactly 4 digits");return;}
    setUsers(prev=>prev.map(u=>u.id===editId?{...u,pin:editPin}:u));
    setEditId(null);setEditPin("");setEditPinErr("");flash();
  };

  const deleteUser=id=>{
    if(id===currentUser.id){alert("You cannot delete your own account.");return;}
    setUsers(prev=>prev.filter(u=>u.id!==id));
  };

  const addUser=()=>{
    setFormErr("");
    if(!newName.trim()){setFormErr("Name is required.");return;}
    if(!/^[0-9]{4}$/.test(newPin)){setFormErr("PIN must be exactly 4 digits.");return;}
    if(newShops.length===0&&newRole==="staff"){setFormErr("Assign at least one shop for staff.");return;}
    const id=newName.trim().toLowerCase().replace(/\s+/g,"-")+"-"+Date.now();
    const initials=newName.trim().split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
    const av=AVATARS[users.length%AVATARS.length];
    setUsers(prev=>[...prev,{
      id, name:newName.trim(), initials, role:newRole, pin:newPin,
      avatar:av,
      shops:newRole==="staff"?newShops:SHOP_IDS,
    }]);
    setNewName("");setNewPin("");setNewRole("staff");setNewShops([]);setFormErr("");
    flash();
  };

  const toggleShop=(id,shopId)=>{
    setUsers(prev=>prev.map(u=>{
      if(u.id!==id)return u;
      const has=(u.shops||[]).includes(shopId);
      return {...u,shops:has?(u.shops||[]).filter(s=>s!==shopId):[...(u.shops||[]),shopId]};
    }));
    flash();
  };

  const iBtn=(label,onClick,color,bg)=>({
    label,onClick,color:color||"#374151",bg:bg||"#f8fafc",
  });

  const roleColor={
    superadmin:{bg:"#ede9fe",color:"#5b21b6",border:"#ddd6fe",label:"Super Admin"},
    admin:      {bg:"#dbeafe",color:"#1e40af",border:"#bfdbfe",label:"Admin"},
    staff:      {bg:"#f0fdf4",color:"#166534",border:"#bbf7d0",label:"Staff"},
  };

  // input style helper
  const inp={
    width:"100%",padding:"9px 12px",borderRadius:9,
    border:"1px solid #e2e8f0",fontSize:13,fontFamily:"inherit",
    outline:"none",color:"#0f172a",background:"white",boxSizing:"border-box",
  };

  return(
    <div style={{
      position:"fixed",inset:0,zIndex:200,
      background:"rgba(15,23,42,0.55)",backdropFilter:"blur(4px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      fontFamily:"'DM Sans',system-ui,sans-serif",
    }} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{
        width:"100%",maxWidth:780,maxHeight:"90vh",
        background:"white",borderRadius:20,
        boxShadow:"0 24px 80px rgba(0,0,0,0.22)",
        display:"flex",flexDirection:"column",
        overflow:"hidden",
      }}>
        {/* ── header ── */}
        <div style={{
          background:"linear-gradient(135deg,#0f172a,#1e293b)",
          padding:"18px 24px",
          display:"flex",alignItems:"center",justifyContent:"space-between",
          flexShrink:0,
        }}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:38,height:38,borderRadius:11,
              background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
              ⚙️
            </div>
            <div>
              <h2 style={{margin:0,fontSize:17,fontWeight:800,color:"white"}}>Settings</h2>
              <p style={{margin:0,fontSize:11,color:"rgba(255,255,255,0.45)"}}>Super Admin · {currentUser.name}</p>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {saved&&(
              <span style={{fontSize:12,fontWeight:700,color:"#4ade80",
                background:"rgba(74,222,128,0.15)",padding:"4px 12px",borderRadius:999}}>
                ✓ Saved
              </span>
            )}
            <button onClick={onClose}
              style={{width:32,height:32,borderRadius:9,border:"1px solid rgba(255,255,255,0.20)",
                background:"rgba(255,255,255,0.08)",color:"white",cursor:"pointer",
                fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",
                fontFamily:"inherit"}}>
              ✕
            </button>
          </div>
        </div>

        {/* ── tab bar ── */}
        <div style={{display:"flex",gap:4,padding:"12px 24px 0",borderBottom:"1px solid #f1f5f9",flexShrink:0}}>
          {[
            {id:"users",   label:"👥 Manage Users"},
            {id:"add",     label:"➕ Add User"},
            {id:"shops",   label:"🏪 Shop Access"},
          ].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{
                padding:"8px 16px",borderRadius:"9px 9px 0 0",border:"none",
                cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",
                background:tab===t.id?"white":"transparent",
                color:tab===t.id?"#0f172a":"#64748b",
                borderBottom:tab===t.id?"2px solid #1d4ed8":"2px solid transparent",
                marginBottom:"-1px",transition:"all 0.15s",
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── body ── */}
        <div style={{flex:1,overflowY:"auto",padding:24}}>

          {/* ────────── MANAGE USERS tab ────────── */}
          {tab==="users"&&(
            <div>
              <p style={{margin:"0 0 16px",fontSize:13,color:"#64748b"}}>
                Click a user to change their PIN. Suresh's role cannot be changed.
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {users.map(u=>{
                  const rc=roleColor[u.role]||roleColor.staff;
                  const isEdit=editId===u.id;
                  const isH=hovR===u.id;
                  const isSelf=u.id===currentUser.id;
                  return(
                    <div key={u.id}
                      onMouseEnter={()=>setHovR(u.id)}
                      onMouseLeave={()=>setHovR(null)}
                      style={{
                        border:isEdit?"1px solid #1d4ed8":"1px solid #f1f5f9",
                        borderRadius:14,padding:"14px 16px",
                        background:isEdit?"#f8faff":isH?"#fafafa":"white",
                        transition:"all 0.15s",
                      }}>
                      {/* user row */}
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <div style={{width:42,height:42,borderRadius:12,flexShrink:0,
                          background:u.avatar,display:"flex",alignItems:"center",
                          justifyContent:"center",color:"white",fontWeight:800,fontSize:14,
                          boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}>
                          {u.initials}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                            <span style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>{u.name}</span>
                            {isSelf&&<span style={{fontSize:9,fontWeight:800,color:"#1d4ed8",
                              background:"#dbeafe",padding:"1px 7px",borderRadius:999}}>YOU</span>}
                            <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",
                              borderRadius:999,background:rc.bg,color:rc.color,
                              border:"1px solid "+rc.border}}>
                              {rc.label}
                            </span>
                          </div>
                          <span style={{fontSize:11,color:"#94a3b8"}}>
                            PIN: {'●'.repeat(4)} · Shops: {(u.shops||SHOP_IDS).length===3?"All":
                              (u.shops||[]).map(s=>({
                                "ros-selections":"UK Sel","ros-hairlines":"UK Hair","ros-india":"India"
                              }[s]||s)).join(", ")||"None"}
                          </span>
                        </div>
                        <div style={{display:"flex",gap:8}}>
                          {!isEdit&&(
                            <button onClick={()=>{setEditId(u.id);setEditPin("");setEditPinErr("");}}
                              style={{padding:"6px 14px",borderRadius:8,border:"1px solid #e2e8f0",
                                background:"#f8fafc",fontSize:12,fontWeight:700,color:"#374151",
                                cursor:"pointer",fontFamily:"inherit"}}>
                              🔑 Change PIN
                            </button>
                          )}
                          {!isSelf&&u.role!=="superadmin"&&(
                            <button onClick={()=>deleteUser(u.id)}
                              style={{padding:"6px 12px",borderRadius:8,border:"1px solid #fecaca",
                                background:"#fef2f2",fontSize:12,fontWeight:700,color:"#dc2626",
                                cursor:"pointer",fontFamily:"inherit"}}>
                              🗑
                            </button>
                          )}
                        </div>
                      </div>

                      {/* PIN edit row */}
                      {isEdit&&(
                        <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #f1f5f9",
                          display:"flex",alignItems:"flex-end",gap:10}}>
                          <div style={{flex:1}}>
                            <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4}}>
                              New 4-digit PIN for {u.name}
                            </label>
                            <input
                              type="password" maxLength={4}
                              value={editPin}
                              onChange={e=>{setEditPin(e.target.value.replace(/\D/g,"").slice(0,4));setEditPinErr("");}}
                              placeholder="● ● ● ●"
                              style={{...inp,width:160,letterSpacing:"0.2em",fontSize:18,textAlign:"center"}}
                            />
                            {editPinErr&&<p style={{margin:"4px 0 0",fontSize:11,color:"#dc2626"}}>{editPinErr}</p>}
                          </div>
                          <button onClick={savePin}
                            style={{padding:"9px 18px",borderRadius:9,border:"none",
                              background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",
                              color:"white",fontWeight:700,fontSize:13,cursor:"pointer",
                              fontFamily:"inherit",whiteSpace:"nowrap"}}>
                            ✓ Save PIN
                          </button>
                          <button onClick={()=>{setEditId(null);setEditPin("");setEditPinErr("");}}
                            style={{padding:"9px 14px",borderRadius:9,border:"1px solid #e2e8f0",
                              background:"white",color:"#64748b",fontWeight:600,fontSize:13,
                              cursor:"pointer",fontFamily:"inherit"}}>
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ────────── ADD USER tab ────────── */}
          {tab==="add"&&(
            <div style={{maxWidth:480}}>
              <p style={{margin:"0 0 20px",fontSize:13,color:"#64748b"}}>
                Create a new user account. Staff accounts can be restricted to specific shops.
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:5}}>
                    FULL NAME
                  </label>
                  <input value={newName} onChange={e=>setNewName(e.target.value)}
                    placeholder="e.g. Alex Johnson" style={inp}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:5}}>
                    4-DIGIT PIN
                  </label>
                  <input type="password" maxLength={4}
                    value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,"").slice(0,4))}
                    placeholder="● ● ● ●"
                    style={{...inp,width:160,letterSpacing:"0.2em",fontSize:18,textAlign:"center"}}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:5}}>
                    ROLE
                  </label>
                  <div style={{display:"flex",gap:10}}>
                    {[
                      {v:"admin",  l:"Admin",  desc:"Full access to all features"},
                      {v:"staff",  l:"Staff",  desc:"Sales only, shop-restricted"},
                    ].map(r=>(
                      <div key={r.v} onClick={()=>setNewRole(r.v)}
                        style={{
                          flex:1,padding:"12px 14px",borderRadius:12,cursor:"pointer",
                          border:newRole===r.v?"2px solid #1d4ed8":"2px solid #f1f5f9",
                          background:newRole===r.v?"#eff6ff":"white",
                          transition:"all 0.15s",
                        }}>
                        <p style={{margin:"0 0 2px",fontWeight:700,fontSize:13,
                          color:newRole===r.v?"#1d4ed8":"#374151"}}>{r.l}</p>
                        <p style={{margin:0,fontSize:11,color:"#94a3b8"}}>{r.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {newRole==="staff"&&(
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#374151",display:"block",marginBottom:5}}>
                      SHOP ACCESS (select one or more)
                    </label>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {Object.entries(SHOP_LABELS).map(([sid,sname])=>{
                        const has=newShops.includes(sid);
                        return(
                          <div key={sid} onClick={()=>setNewShops(p=>has?p.filter(x=>x!==sid):[...p,sid])}
                            style={{
                              display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                              borderRadius:10,cursor:"pointer",
                              border:has?"1px solid #1d4ed8":"1px solid #f1f5f9",
                              background:has?"#eff6ff":"#fafafa",
                              transition:"all 0.15s",
                            }}>
                            <div style={{
                              width:18,height:18,borderRadius:5,flexShrink:0,
                              border:has?"2px solid #1d4ed8":"2px solid #e2e8f0",
                              background:has?"#1d4ed8":"white",
                              display:"flex",alignItems:"center",justifyContent:"center",
                            }}>
                              {has&&<span style={{color:"white",fontSize:10,fontWeight:900}}>✓</span>}
                            </div>
                            <span style={{fontSize:13,fontWeight:600,color:has?"#1d4ed8":"#374151"}}>{sname}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {formErr&&(
                  <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,
                    padding:"10px 14px",fontSize:12,color:"#dc2626",fontWeight:600}}>
                    ⚠️ {formErr}
                  </div>
                )}
                <button onClick={addUser}
                  style={{padding:"12px 0",borderRadius:11,border:"none",
                    background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",
                    color:"white",fontWeight:800,fontSize:14,cursor:"pointer",
                    fontFamily:"inherit",boxShadow:"0 4px 16px rgba(37,99,235,0.30)",
                    marginTop:4}}>
                  ➕ Create User
                </button>
              </div>
            </div>
          )}

          {/* ────────── SHOP ACCESS tab ────────── */}
          {tab==="shops"&&(
            <div>
              <p style={{margin:"0 0 16px",fontSize:13,color:"#64748b"}}>
                Toggle shop access for each staff member. Admin accounts always have full access.
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {users.filter(u=>u.role==="staff").length===0&&(
                  <div style={{textAlign:"center",padding:"40px 0",color:"#94a3b8",fontSize:13}}>
                    No staff members yet. Add one in the <strong>Add User</strong> tab.
                  </div>
                )}
                {users.filter(u=>u.role==="staff").map(u=>(
                  <div key={u.id} style={{border:"1px solid #f1f5f9",borderRadius:14,padding:"16px 18px",background:"white"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                      <div style={{width:36,height:36,borderRadius:10,background:u.avatar,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        color:"white",fontWeight:800,fontSize:13,flexShrink:0}}>
                        {u.initials}
                      </div>
                      <div>
                        <p style={{margin:0,fontWeight:700,fontSize:14,color:"#0f172a"}}>{u.name}</p>
                        <p style={{margin:0,fontSize:11,color:"#94a3b8"}}>Staff · Sales tab only per assigned shop</p>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                      {Object.entries(SHOP_LABELS).map(([sid,sname])=>{
                        const has=(u.shops||[]).includes(sid);
                        return(
                          <div key={sid} onClick={()=>toggleShop(u.id,sid)}
                            style={{
                              display:"flex",alignItems:"center",gap:8,padding:"8px 14px",
                              borderRadius:10,cursor:"pointer",
                              border:has?"1px solid #1d4ed8":"1px solid #e2e8f0",
                              background:has?"#eff6ff":"#f8fafc",
                              transition:"all 0.15s",
                            }}>
                            <div style={{
                              width:16,height:16,borderRadius:4,flexShrink:0,
                              border:has?"2px solid #1d4ed8":"2px solid #cbd5e1",
                              background:has?"#1d4ed8":"white",
                              display:"flex",alignItems:"center",justifyContent:"center",
                            }}>
                              {has&&<span style={{color:"white",fontSize:9,fontWeight:900}}>✓</span>}
                            </div>
                            <span style={{fontSize:12,fontWeight:600,color:has?"#1d4ed8":"#64748b"}}>{sname}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* info box */}
              <div style={{marginTop:20,background:"#fffbeb",borderRadius:12,padding:"12px 16px",
                border:"1px solid #fde68a",display:"flex",gap:10}}>
                <span style={{fontSize:16,flexShrink:0}}>💡</span>
                <p style={{margin:0,fontSize:12,color:"#92400e"}}>
                  Staff members can only view <strong>Sales</strong> in their assigned shops.
                  Analytics, reports, customers, and all other tabs are hidden for staff.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

/* =========================================================
   USERS / AUTH
   ========================================================= */
const INITIAL_USERS=[
  {id:"suresh", name:"Suresh", initials:"SU", role:"superadmin", pin:"1111",
   avatar:"linear-gradient(135deg,#1d4ed8,#7c3aed)", shops:["ros-selections","ros-hairlines","ros-india"]},
  {id:"rani",   name:"Rani",   initials:"RA", role:"admin",      pin:"2222",
   avatar:"linear-gradient(135deg,#059669,#0891b2)", shops:["ros-selections","ros-hairlines","ros-india"]},
  {id:"staff",  name:"Staff",  initials:"ST", role:"staff",      pin:"3333",
   avatar:"linear-gradient(135deg,#64748b,#334155)", shops:["ros-india"]},
];
const ROLE_NAV={
  superadmin:["dashboard","sales","purchases","logistics","customers","suppliers","agents","products","invoices","expenses","documents","analytics","reports","settings"],
  admin:["dashboard","sales","purchases","logistics","customers","suppliers","agents","products","invoices","expenses","documents","analytics","reports"],
  staff:["sales"],
};
const SHOP_IDS=["ros-selections","ros-hairlines","ros-india"];

/* ── Login Screen ── */
const LoginScreen=({onLogin,users})=>{
  const [selUser,setSelUser]=useState(null);
  const [pin,setPin]=useState("");
  const [err,setErr]=useState("");
  const [hovU,setHovU]=useState(null);
  const [hovB,setHovB]=useState(false);
  const [showPin,setShowPin]=useState(false);

  const handlePin=(d)=>{
    if(pin.length>=4)return;
    const np=pin+d;
    setPin(np);
    setErr("");
    if(np.length===4){
      setTimeout(()=>{
        if(np===selUser.pin){ onLogin(selUser); }
        else{ setErr("Wrong PIN — try again"); setPin(""); }
      },200);
    }
  };
  const back=()=>{setSelUser(null);setPin("");setErr("");};

  return(
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(145deg,#0f172a 0%,#1e293b 40%,#0f172a 100%)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"'Arimo',Arial,sans-serif",
      position:"relative",overflow:"hidden",
    }}>
      {/* background mesh */}
      <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(rgba(255,255,255,0.03) 1px,transparent 1px)",backgroundSize:"28px 28px",pointerEvents:"none"}}/>
      {/* glowing orbs */}
      <div style={{position:"absolute",top:-120,left:-120,width:400,height:400,borderRadius:"50%",background:"rgba(37,99,235,0.12)",filter:"blur(80px)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-100,right:-100,width:350,height:350,borderRadius:"50%",background:"rgba(124,58,237,0.10)",filter:"blur(80px)",pointerEvents:"none"}}/>

      {/* logo + brand */}
      <div style={{textAlign:"center",marginBottom:40,position:"relative",zIndex:1}}>
        <div style={{width:64,height:64,borderRadius:20,background:"linear-gradient(135deg,#2563eb,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",boxShadow:"0 8px 32px rgba(37,99,235,0.40)"}}>
          <span style={{color:"white",fontWeight:900,fontSize:28}}>R</span>
        </div>
        <h1 style={{margin:"0 0 4px",fontSize:26,fontWeight:800,color:"white",letterSpacing:"-0.5px"}}>ROS Business Suite</h1>
        <p style={{margin:0,fontSize:13,color:"rgba(255,255,255,0.45)",fontWeight:500}}>Select your account to continue</p>
      </div>

      {!selUser?(
        /* ── user selection ── */
        <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:420,padding:"0 24px"}}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {(users||[]).map(u=>{
              const isH=hovU===u.id;
              return(
                <div key={u.id}
                  onClick={()=>setSelUser(u)}
                  onMouseEnter={()=>setHovU(u.id)}
                  onMouseLeave={()=>setHovU(null)}
                  style={{
                    display:"flex",alignItems:"center",gap:14,
                    background:isH?"rgba(255,255,255,0.10)":"rgba(255,255,255,0.05)",
                    border:isH?"1px solid rgba(255,255,255,0.20)":"1px solid rgba(255,255,255,0.08)",
                    borderRadius:16,padding:"14px 18px",cursor:"pointer",
                    transition:"all 0.18s",
                    transform:isH?"translateX(4px)":"none",
                  }}>
                  <div style={{width:46,height:46,borderRadius:14,background:u.avatar,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800,fontSize:15,flexShrink:0,boxShadow:"0 4px 14px rgba(0,0,0,0.25)"}}>
                    {u.initials}
                  </div>
                  <div style={{flex:1}}>
                    <p style={{margin:0,fontWeight:700,fontSize:15,color:"white"}}>{u.name}</p>
                  </div>
                  <span style={{color:"rgba(255,255,255,0.30)",fontSize:18}}>›</span>
                </div>
              );
            })}
          </div>
          <p style={{textAlign:"center",marginTop:32,fontSize:11,color:"rgba(255,255,255,0.22)"}}>Developed by ROS Nexus</p>
        </div>
      ):(
        /* ── PIN entry ── */
        <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:340,padding:"0 24px",textAlign:"center"}}>
          {/* user badge */}
          <div style={{marginBottom:24}}>
            <div style={{width:60,height:60,borderRadius:18,background:selUser.avatar,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800,fontSize:20,margin:"0 auto 10px",boxShadow:"0 8px 24px rgba(0,0,0,0.30)"}}>
              {selUser.initials}
            </div>
            <p style={{margin:"0 0 2px",fontWeight:700,fontSize:17,color:"white"}}>{selUser.name}</p>
            <p style={{margin:0,fontSize:11,color:"rgba(255,255,255,0.40)"}}>Enter your 4-digit PIN</p>
          </div>

          {/* PIN dots */}
          <div style={{display:"flex",justifyContent:"center",gap:14,marginBottom:8}}>
            {[0,1,2,3].map(i=>(
              <div key={i} style={{
                width:14,height:14,borderRadius:"50%",
                background:pin.length>i?"white":"rgba(255,255,255,0.15)",
                border:"2px solid rgba(255,255,255,0.30)",
                transition:"background 0.15s",
                boxShadow:pin.length>i?"0 0 10px rgba(255,255,255,0.5)":"none",
              }}/>
            ))}
          </div>
          {err&&<p style={{margin:"0 0 8px",fontSize:12,color:"#f87171",fontWeight:600}}>{err}</p>}

          {/* numpad */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:20,marginBottom:16}}>
            {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i)=>{
              const isEmpty=d==="";
              const isDel=d==="⌫";
              const isHB=hovB===i;
              return(
                <button key={i}
                  onMouseEnter={()=>setHovB(i)}
                  onMouseLeave={()=>setHovB(false)}
                  onClick={()=>{ if(isEmpty)return; if(isDel){setPin(p=>p.slice(0,-1));setErr("");}else handlePin(String(d)); }}
                  style={{
                    height:52,borderRadius:13,border:"1px solid rgba(255,255,255,0.12)",
                    background:isEmpty?"transparent":isHB?"rgba(255,255,255,0.20)":"rgba(255,255,255,0.08)",
                    color:isEmpty?"transparent":"white",
                    fontSize:isDel?18:20,fontWeight:isDel?500:700,
                    cursor:isEmpty?"default":"pointer",
                    transition:"all 0.15s",
                    fontFamily:"inherit",
                    transform:isHB&&!isEmpty?"scale(0.95)":"scale(1)",
                  }}>
                  {d}
                </button>
              );
            })}
          </div>

          <button onClick={back} style={{background:"none",border:"none",color:"rgba(255,255,255,0.40)",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
            ← Back to accounts
          </button>
        </div>
      )}
    </div>
  );
};

/* =========================================================
   UI COMPONENTS
   ========================================================= */

export default function App(){
  const [user,setUser]=useState(null);
  const [shop,setShop]=useState(null);
  const [users,setUsers]=useState(INITIAL_USERS);
  const [settingsOpen,setSettingsOpen]=useState(false);

  const handleLogin=u=>{
    // always use latest user data from state
    const fresh=users.find(x=>x.id===u.id)||u;
    setUser(fresh);setShop(null);
  };

  if(!user) return <LoginScreen users={users} onLogin={handleLogin}/>;

  // staff: auto-route to their only shop if they only have 1
  const allowedShops=(user.shops||SHOP_IDS);

  if(shop&&allowedShops.includes(shop))
    return <ShopDashboard shopId={shop} onBack={()=>setShop(null)} user={user} onLogout={()=>{setUser(null);setShop(null);}}/>;

  return(
    <>
      <ShopSelector onSelect={setShop} user={user}
        onLogout={()=>{setUser(null);setShop(null);}}
        onOpenSettings={()=>setSettingsOpen(true)}/>
      {settingsOpen&&user?.role==="superadmin"&&(
        <SettingsPanel
          users={users}
          setUsers={setUsers}
          currentUser={user}
          onClose={()=>setSettingsOpen(false)}/>
      )}
    </>
  );
}