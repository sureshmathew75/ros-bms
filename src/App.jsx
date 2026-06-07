import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { dbLoadSales, dbSaveSale, dbDeleteSale, dbSaveCustomer, dbLoadCustomers, dbDeleteCustomer, dbSavePurchase, dbLoadPurchases, dbDeletePurchase, dbSaveExpense, dbLoadExpenses, dbDeleteExpense, dbSaveLogistic, dbLoadLogistics, dbDeleteLogistic, dbLoadUsers, dbSaveUser, dbDeleteUser, dbLoadShopItems, dbAddShopItem, dbDeleteShopItem, dbSaveDelivery, dbLoadMessages, dbAddMessage, dbMarkMessageSent, dbCancelMessage, dbMessageExists, dbLoadReturns, dbSaveReturn, dbNextReturnId, dbDeleteReturn, dbDeleteMessage, dbDeleteMessages, dbSaveSupplier, dbLoadSuppliers, dbDeleteSupplier,
  dbUploadDoc, dbDeleteDoc, dbSavePurchaseDocs, dbSaveLogisticDocs } from "./db";
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
const fmt=(sid,n,whole=false)=>{
  const s=SHOPS.find(x=>x.id===sid);
  if(!s)return String(n);
  const v=Number(n)||0;
  if(s.currency==="INR") return formatCurrency(v);
  return whole
    ? "£"+Math.round(v).toLocaleString("en-GB")
    : "£"+v.toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});
};

const BSTYLE={
  // ── Delivery statuses ──
  "PENDING":                  {bg:"#fef9c3",c:"#a16207",b:"#fde047"},
  "FULFILLED":                {bg:"#dcfce7",c:"#15803d",b:"#bbf7d0"},
  "GOOD FEEDBACK":            {bg:"#d1fae5",c:"#065f46",b:"#6ee7b7"},
  "RTRN REQSTD":              {bg:"#ffedd5",c:"#c2410c",b:"#fed7aa"},
  "RETRN RCVD":               {bg:"#fee2e2",c:"#991b1b",b:"#fca5a5"},
  "EXCHANGED":                {bg:"#e0e7ff",c:"#4338ca",b:"#c7d2fe"},
  "REFUNDED":                 {bg:"#f3e4ff",c:"#7e22ce",b:"#d8b4fe"},
  // ── India-specific delivery statuses ──
  "ORDER NOT PLACED":         {bg:"#fef9c3",c:"#a16207",b:"#fde047"},
  "WORK IN PROGRESS":         {bg:"#dbeafe",c:"#1d4ed8",b:"#bfdbfe"},
  "PHOTO GIVEN TO CUSTOMER":  {bg:"#e0f2fe",c:"#0369a1",b:"#bae6fd"},
  "AWAITING TRACKING INFO.":  {bg:"#fef3c7",c:"#92400e",b:"#fcd34d"},
  "RETURN REQUESTED":         {bg:"#ffedd5",c:"#c2410c",b:"#fed7aa"},
  "RETURN RECEIVED":          {bg:"#fee2e2",c:"#991b1b",b:"#fca5a5"},
  "GOOD FEEDBACK RECEIVED":   {bg:"#d1fae5",c:"#065f46",b:"#6ee7b7"},
  "NEGATIVE FEEDBACK RECEIVED":{bg:"#ffe4e6",c:"#9f1239",b:"#fda4af"},
  // ── Legacy support ──
  "DISPATCHED":     {bg:"#e0e7ff",c:"#4338ca",b:"#c7d2fe"},
  "DELIVERED":      {bg:"#dcfce7",c:"#15803d",b:"#bbf7d0"},
  // ── Payment ──
  Paid:             {bg:"#dcfce7",c:"#15803d",b:"#bbf7d0"},
  Pending:          {bg:"#fef9c3",c:"#a16207",b:"#fde047"},
  Partial:          {bg:"#ffedd5",c:"#c2410c",b:"#fed7aa"},
  SHOP:             {bg:"#dbeafe",c:"#1d4ed8",b:"#bfdbfe"},
  // ── Customer tags ──
  VIP:              {bg:"#fef9c3",c:"#854d0e",b:"#fde047"},
  Wholesale:        {bg:"#f3e8ff",c:"#7e22ce",b:"#e9d5ff"},
  "New Customer":   {bg:"#cffafe",c:"#0e7490",b:"#a5f3fc"},
  Regular:          {bg:"#f1f5f9",c:"#475569",b:"#e2e8f0"},
  "Budget Friendly": {bg:"#f0fdf4",c:"#15803d",b:"#bbf7d0"},
};

// Row background colour per delivery status
const STATUS_ROW_BG={
  "PENDING":                   "#fffbeb",
  "FULFILLED":                 "#f0fdf4",
  "GOOD FEEDBACK":             "#ecfdf5",
  "RTRN REQSTD":               "#fff7ed",
  "RETRN RCVD":                "#fef2f2",
  "EXCHANGED":                 "#eef2ff",
  "REFUNDED":                  "#faf5ff",
  // India-specific
  "ORDER NOT PLACED":          "#fffbeb",
  "WORK IN PROGRESS":          "#eff6ff",
  "PHOTO GIVEN TO CUSTOMER":   "#f0f9ff",
  "AWAITING TRACKING INFO.":   "#fffbeb",
  "RETURN REQUESTED":          "#fff7ed",
  "RETURN RECEIVED":           "#fef2f2",
  "GOOD FEEDBACK RECEIVED":    "#ecfdf5",
  "NEGATIVE FEEDBACK RECEIVED":"#fff1f2",
};
const Badge=({l})=>{
  const b=BSTYLE[l]||{bg:"#f1f5f9",c:"#475569",b:"#e2e8f0"};
  return <span style={{display:"inline-flex",alignItems:"center",padding:"2px 10px",borderRadius:999,fontSize:11,fontWeight:700,background:b.bg,color:b.c,border:"1px solid "+b.b}}>{l}</span>;
};
const Modal=({title,onClose,accent,children,wide=false})=>{
  const isMob=window.innerWidth<640;
  const h=isMob?"92vh":"88vh";
  return(
  <div style={{position:"fixed",inset:0,zIndex:60,display:"flex",alignItems:isMob?"flex-end":"center",justifyContent:"center",padding:isMob?0:"20px"}}>
    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(6px)"}}/>
    <div style={{position:"relative",background:"white",borderRadius:isMob?"20px 20px 0 0":"20px",boxShadow:"0 32px 64px rgba(0,0,0,0.20)",width:"100%",maxWidth:isMob?"100%":wide?900:580,height:h,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 18px",borderBottom:"1px solid #f1f5f9",background:accent+"12"}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:800,color:"#0f172a"}}>{title}</h3>
        <button onClick={onClose} style={{width:30,height:30,borderRadius:"50%",border:"none",background:"#f1f5f9",cursor:"pointer",fontSize:18,color:"#64748b",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      </div>
      <div style={{flex:1,overflow:"hidden"}}>{children}</div>
    </div>
  </div>
);};


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

/* ── Single source of truth for all shop stat figures ─────────────────────
   Defined BEFORE ShopSelector and ShopDashboard so both can call it.
────────────────────────────────────────────────────────────────────────── */
const STAT_FULFILLED=new Set(["FULFILLED","EXCHANGED","REFUNDED","GOOD FEEDBACK","GOOD FEEDBACK RECEIVED","NEGATIVE FEEDBACK RECEIVED"]);
const STAT_RETURNS  =new Set(["RTRN REQSTD","RETRN RCVD","RETURN REQUESTED","RETURN RECEIVED","EXCHANGED"]);

/* ── getSaleFY: returns FY start year for a sale using invoice suffix as ground truth ── */
const getSaleFY=(sale)=>{
  const id=String(sale.id||"");
  const m=id.match(/^[A-Z]{2,3}(\d{4})(\d)$/);
  if(m){
    const suffix=+m[2];
    const nowY=new Date().getFullYear();
    const decade=Math.floor(nowY/10)*10;
    let endY=decade+suffix;
    if(endY-nowY>5)endY-=10;
    if(nowY-endY>5)endY+=10;
    return endY-1; // FY start year e.g. 2026 for FY26-27
  }
  // Fallback: derive from date
  const dt=parseDate(sale.date);
  if(!dt)return null;
  return dt.getMonth()<3?dt.getFullYear()-1:dt.getFullYear();
};

const calcShopStats=(data=[])=>{
  const now=new Date();
  const y=now.getFullYear(),mo=now.getMonth(),d=now.getDate();
  // Current FY start year: Apr-Dec → this year, Jan-Mar → last year
  const curFYStart=mo<3?y-1:y;

  // Current FY sales only (using invoice suffix as ground truth)
  const curFYData=data.filter(s=>getSaleFY(s)===curFYStart);

  const isToday=s=>{const dt=parseDate(s.date);return dt&&dt.getFullYear()===y&&dt.getMonth()===mo&&dt.getDate()===d;};
  const isMonth=s=>{const dt=parseDate(s.date);return dt&&dt.getFullYear()===y&&dt.getMonth()===mo;};

  const isRefunded=s=>(s.ful||s.status)==="REFUNDED";
  const rev=(arr)=>arr.filter(s=>!isRefunded(s)).reduce((a,s)=>a+(Number(s.amount)||0)-(Number(s.adjAmt)||0),0);

  // Month and today filtered within current FY only
  const monthArr=curFYData.filter(s=>isMonth(s));
  const todayArr=curFYData.filter(s=>isToday(s));

  return {
    todaySales:    rev(todayArr),
    monthRev:      rev(monthArr),
    monthOrders:   monthArr.length,
    monthReturns:  monthArr.filter(s=>STAT_RETURNS.has(s.ful||s.status)).length,
    monthRefunds:  monthArr.filter(s=>isRefunded(s)).reduce((a,s)=>a+(Number(s.refundAmt)||0),0),
    // Pending: ALL time, all FY — unfulfilled is unfulfilled regardless of year
    pendingOrders: data.filter(s=>!STAT_FULFILLED.has(s.ful||s.status)).length,
    totalRev:      rev(data),
    orders:        data.length,
    fySales:       rev(curFYData),
    fyOrders:      curFYData.length,
  };
};

/* ════════════════════════════════════════════════════
   SHOP SELECTOR
════════════════════════════════════════════════════ */
const ShopSelector=({onSelect,user,onLogout,onOpenSettings,salesData={}})=>{
  const [hov,setHov]=useState(null);
  const [cmd,setCmd]=useState(false);
  const [statHov,setStatHov]=useState(null);
  const [isMobile,setIsMobile]=useState(()=>window.innerWidth<768);
  // shopStats computed directly from salesData prop

  const shopStats={};
  SHOPS.forEach(shop=>{shopStats[shop.id]=calcShopStats(salesData[shop.id]||[]);});

  useEffect(()=>{
    const h=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
  },[]);
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
      <header style={{background:"white",borderBottom:"1px solid #e2e8f0",height:isMobile?52:60,display:"flex",alignItems:"center",padding:isMobile?"0 14px":"0 32px",justifyContent:"space-between",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",position:"sticky",top:0,zIndex:40}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:11,background:"linear-gradient(135deg,#2563eb,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(37,99,235,0.30)",flexShrink:0}}>
            <span style={{color:"white",fontWeight:900,fontSize:17}}>R</span>
          </div>
          <div>
            <span style={{fontWeight:900,fontSize:15,color:"#0f172a",letterSpacing:"-0.3px"}}>ROS</span>
            {!isMobile&&<span style={{fontWeight:400,fontSize:14,color:"#94a3b8",marginLeft:8}}>Business Management</span>}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:isMobile?8:14}}>
          {!isMobile&&<span style={{fontSize:10,fontWeight:600,color:"#94a3b8",letterSpacing:"0.04em"}}>
            Developed by <strong style={{color:"#2563eb"}}>ROS Nexus</strong>
          </span>}
          {!isMobile&&<button onClick={()=>setCmd(true)} style={{display:"flex",alignItems:"center",gap:8,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"7px 16px",color:"#64748b",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            🔍 Search… <kbd style={{background:"#e2e8f0",borderRadius:4,padding:"1px 7px",fontSize:11,marginLeft:4}}>/</kbd>
          </button>}
          {user?.role==="superadmin"&&(
            <button onClick={onOpenSettings}
              style={{display:"flex",alignItems:"center",gap:6,padding:isMobile?"7px 10px":"7px 14px",
                background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",border:"none",
                borderRadius:10,cursor:"pointer",color:"white",fontSize:12,fontWeight:700,
                fontFamily:"inherit",boxShadow:"0 2px 8px rgba(37,99,235,0.35)"}}>
              ⚙️{!isMobile&&" Settings"}
            </button>
          )}
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 10px 4px 4px",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:999,cursor:"pointer"}}
            onClick={onLogout} title="Logout">
            <div style={{width:28,height:28,borderRadius:"50%",background:user?.avatar||"linear-gradient(135deg,#2563eb,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800,fontSize:11,flexShrink:0}}>
              {user?.initials||"A"}
            </div>
            {!isMobile&&<span style={{fontSize:13,fontWeight:600,color:"#374151"}}>{user?.name||"Admin"}</span>}
            {!isMobile&&<span style={{fontSize:10,color:"#94a3b8",marginLeft:2}}>· Logout</span>}
            {isMobile&&<span style={{fontSize:11,color:"#94a3b8",fontWeight:600}}>Out</span>}
          </div>
        </div>
      </header>

      <main style={{maxWidth:1160,margin:"0 auto",padding:isMobile?"16px 14px 60px":"60px 24px 80px"}}>

        {/* ── hero ── */}
        <div style={{textAlign:"center",marginBottom:isMobile?24:52}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"white",border:"1px solid #e2e8f0",borderRadius:999,padding:"5px 16px",fontSize:12,fontWeight:700,color:"#64748b",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",display:"inline-block"}}/>
            3 Active Workspaces
          </div>
          <h1 style={{fontSize:isMobile?26:42,fontWeight:900,color:"#0f172a",letterSpacing:isMobile?"-0.5px":"-1.5px",lineHeight:1.1,margin:"0 0 10px"}}>ROS Business Management System</h1>
          <p style={{fontSize:isMobile?13:15,color:"#64748b",margin:0}}>Choose a shop to manage sales, purchases, logistics and analytics.</p>
  
<p></p>
<p style={{fontSize:isMobile?7:9,color:"#64748b",lineHeight:1.1,margin:0}}>Developed by ROS Nexus</p>
        </div>

        {/* ── 3 shop cards ── */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:isMobile?14:24,marginBottom:isMobile?24:48}}>
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

                  {/* revenue split: Today | Month */}
                  <div style={{position:"relative",zIndex:1,display:"flex",alignItems:"stretch",gap:0}}>
                    {/* Today's Revenue */}
                    <div style={{flex:1,paddingRight:12}}>
                      <p style={{margin:"0 0 2px",fontSize:9,color:"rgba(255,255,255,0.65)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>Today's Revenue</p>
                      {staffLocked
                        ? <p style={{margin:0,fontSize:18,fontWeight:700,color:"rgba(255,255,255,0.30)",letterSpacing:2,fontFamily:"'Arimo',Arial,sans-serif"}}>●●●</p>
                        : <p style={{margin:0,fontSize:26,fontWeight:700,color:"white",letterSpacing:"-0.5px",textShadow:"0 1px 4px rgba(0,0,0,0.18)",fontFamily:"'Arimo',Arial,sans-serif"}}>{shop.id==="ros-india"
                            ? formatCurrency(shopStats[shop.id]?.todaySales||0)
                            : "£"+formatNumber(shopStats[shop.id]?.todaySales||0)}</p>
                      }
                    </div>
                    {/* Divider */}
                    <div style={{width:1,background:"rgba(255,255,255,0.25)",margin:"2px 0"}}/>
                    {/* Month Revenue */}
                    <div style={{flex:1,paddingLeft:12}}>
                      <p style={{margin:"0 0 2px",fontSize:9,color:"rgba(255,255,255,0.65)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>Month Revenue</p>
                      {staffLocked
                        ? <p style={{margin:0,fontSize:18,fontWeight:700,color:"rgba(255,255,255,0.30)",letterSpacing:2,fontFamily:"'Arimo',Arial,sans-serif"}}>●●●</p>
                        : <p style={{margin:0,fontSize:26,fontWeight:700,color:"white",letterSpacing:"-0.5px",textShadow:"0 1px 4px rgba(0,0,0,0.18)",fontFamily:"'Arimo',Arial,sans-serif"}}>{shop.id==="ros-india"
                            ? formatCurrency(shopStats[shop.id]?.monthRev||0)
                            : "£"+formatNumber(shopStats[shop.id]?.monthRev||0)}</p>
                      }
                    </div>
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
                      {[
                        {l:"Orders",    v:shopStats[shop.id]?.monthOrders||0,  sub:"this month"},
                        {l:"Pending",   v:shopStats[shop.id]?.pendingOrders||0, sub:"unfulfilled"},
                        {l:"Returns",   v:shopStats[shop.id]?.monthReturns||0,  sub:"this month"},
                      ].map((s,i)=>(
                        <div key={i} style={{textAlign:"center",background:shop.accentBg,borderRadius:10,padding:"9px 5px",border:"1px solid "+shop.accent+"18"}}>
                          <p style={{margin:0,fontWeight:900,fontSize:16,color:shop.accentText}}>{s.v}</p>
                          <p style={{margin:"2px 0 0",fontSize:10,color:shop.accent,fontWeight:700}}>{s.l}</p>
                          <p style={{margin:"1px 0 0",fontSize:9,color:shop.accent+"99",fontWeight:500}}>{s.sub}</p>
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
          const sumAmt=arr=>arr.reduce((a,x)=>a+(x.amount||0),0);
          const sumTot=arr=>arr.reduce((a,x)=>a+(x.total||0),0);
          // Use live data from shopStats
          const ukLiveRev=(shopStats["ros-selections"]?.totalRev||0)+(shopStats["ros-hairlines"]?.totalRev||0);
          const inLiveRev=shopStats["ros-india"]?.totalRev||0;
          const ukPendingOrders=(shopStats["ros-selections"]?.pendingOrders||0)+(shopStats["ros-hairlines"]?.pendingOrders||0);
          const inPendingOrders=shopStats["ros-india"]?.pendingOrders||0;
          const ukSales=[];const inSales=[];
          const ukPurch=[];const inPurch=[];
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
              display:"£"+formatNumber(ukLiveRev), suffix:"lifetime",
              grad:"linear-gradient(135deg,#0e7490 0%,#06b6d4 50%,#67e8f9 100%)",
              glow:"rgba(6,182,212,0.35)", shine:"rgba(255,255,255,0.15)",
            },
            {
              icon:"🇮🇳", label:"Sales Volume India", sub:"ROS India",
              display:formatCurrency(inLiveRev), suffix:"lifetime",
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
/* ── parseLegacyItems ──────────────────────────────────────────
   Splits old combined item strings like "SALWAR(x1), BLOUSE(x1)"
   into separate line rows. Prices are split equally (estimated)
   because individual prices weren't stored in old records.
────────────────────────────────────────────────────────────── */
/* ── parseDate ─────────────────────────────────────────────────
   Robust date parser: handles YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY,
   DD-MM-YY. Returns a local Date or null. Never uses new Date(str)
   directly which misparses non-ISO formats.
────────────────────────────────────────────────────────────── */
const parseDate=str=>{
  if(!str) return null;
  const s=String(str).trim();
  let m;
  m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return new Date(+m[1],+m[2]-1,+m[3]);
  m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(m) return new Date(+m[3],+m[2]-1,+m[1]);
  m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if(m){const y=+m[3];return new Date(y<50?2000+y:1900+y,+m[2]-1,+m[1]);}
  return null;
};

const parseLegacyItems=(itemStr,qty,subtotal)=>{
  if(!itemStr) return [{name:"Product/Service",qty:qty||1,price:subtotal||0,estimated:false}];
  if(itemStr.includes("(x")){
    const parts=itemStr.split(",").map(s=>s.trim()).filter(Boolean);
    const parsed=parts.map(part=>{
      const m=part.match(/^(.+?)\(x(\d+)\)$/);
      return m?{name:m[1].trim(),qty:parseInt(m[2])||1}:{name:part,qty:1};
    });
    const totalQty=parsed.reduce((s,l)=>s+l.qty,0)||1;
    const unitPrice=parseFloat(((subtotal||0)/totalQty).toFixed(2));
    return parsed.map(l=>({...l,price:unitPrice,estimated:true}));
  }
  const q=parseFloat(qty)||1;
  return [{name:itemStr,qty:q,price:parseFloat(((subtotal||0)/q).toFixed(2)),estimated:false}];
};

/* ── normaliseSale: shared helper used by App (bulk load) and ShopDashboard (reload) ── */
const normaliseSale=(s)=>{
  if(!s) return s;
  let rawItem = s.item || "";
  let decodedLines = null;
  let displayItem = rawItem;
  if(rawItem.startsWith("__LINES__:")){
    const nlIdx = rawItem.indexOf("\n");
    const jsonPart = nlIdx >= 0 ? rawItem.slice(10, nlIdx) : rawItem.slice(10);
    displayItem = nlIdx >= 0 ? rawItem.slice(nlIdx + 1) : "";
    try { decodedLines = JSON.parse(jsonPart); } catch { decodedLines = null; }
  }
  const taxRate = s.taxRate !== undefined ? s.taxRate : s.tax_rate !== undefined ? s.tax_rate : 0;
  const rateNum = Number(taxRate) || 0;
  const taxInclusive = rateNum === 0 ? true
                     : s.taxInclusive !== undefined ? s.taxInclusive !== false
                     : s.tax_inclusive !== undefined ? s.tax_inclusive !== false
                     : true;
  let saleLines = decodedLines || s.saleLines || s.sale_lines || null;
  if(typeof saleLines === "string"){try{saleLines=JSON.parse(saleLines);}catch{saleLines=null;}}
  const discount = Number(s.discount !== undefined ? s.discount : s.discount_amt || 0) || 0;
  const otherCharges = Number(s.otherCharges !== undefined ? s.otherCharges : s.other_charges || 0) || 0;
  const otherChargesLabel = s.otherChargesLabel || s.other_charges_label || "Other Charges";
  const adjAmt = Number(s.adjAmt !== undefined ? s.adjAmt : s.adj_amt || 0) || 0;
  const adjType = s.adjType || s.adj_type || "";
  const adjDate = s.adjDate || s.adj_date || "";
  const adjNote = s.adjNote || s.adj_note || "";
  const shopInvoiceNo = s.shopInvoiceNo || s.shop_invoice_no || "";
  const refundDate = s.refundDate || s.refund_date || "";
  const exchangeDate = s.exchangeDate || s.exchange_date || "";
  const purInvNo   = s.purInvNo   || s.pur_inv_no   || "";
  const purInvDate = s.purInvDate || s.pur_inv_date || "";
  const purAmount  = Number(s.purAmount !== undefined ? s.purAmount : s.pur_amount || 0) || 0;
  const trackingNo  = s.trackingNo  || s.tracking_no  || "";
  const deliveryDate = s.deliveryDate || s.delivery_date || "";
  const deliveryTime = s.deliveryTime || s.delivery_time || "";
  return {
    ...s,
    item:             displayItem,
    taxRate:          rateNum,
    taxInclusive:     taxInclusive,
    saleLines:        Array.isArray(saleLines) ? saleLines : null,
    discount,
    otherCharges,
    otherChargesLabel,
    adjAmt,
    adjType,
    adjDate,
    adjNote,
    shopInvoiceNo,
    refundDate,
    exchangeDate,
    purInvNo,
    purInvDate,
    purAmount,
    trackingNo,
    deliveryDate,
    deliveryTime,
  };
};



/* ═══════════════════════════════════════════════════════════
   MESSAGES PANEL — WhatsApp message queue
   ═══════════════════════════════════════════════════════════ */
const MESSAGE_TYPE_LABEL={
  DELIVERY_CONFIRM:  "📦 Delivery Confirmation",
  DAY3_FOLLOWUP:     "😊 Day 3 Follow-Up",
  WINDOW_CLOSED:     "🔒 Return Window Closed",
  RETURN_APPROVED:   "✅ Return Approved",
  RETURN_REMINDER:   "⏰ Return Reminder",
  RETURN_EXPIRED:    "❌ Return Expired",
};
const MESSAGE_TYPE_COLOR={
  DELIVERY_CONFIRM:  {bg:"#f0fdf4",border:"#86efac",text:"#166534"},
  DAY3_FOLLOWUP:     {bg:"#eff6ff",border:"#93c5fd",text:"#1d4ed8"},
  WINDOW_CLOSED:     {bg:"#fff7ed",border:"#fdba74",text:"#c2410c"},
  RETURN_APPROVED:   {bg:"#f0fdf4",border:"#86efac",text:"#166534"},
  RETURN_REMINDER:   {bg:"#fffbeb",border:"#fcd34d",text:"#b45309"},
  RETURN_EXPIRED:    {bg:"#fef2f2",border:"#fca5a5",text:"#dc2626"},
};

const MessagesPanel=({shopId,shop,messages,setMessages,user,sales})=>{
  const [filter,setFilter]=React.useState("READY");
  const [selected,setSelected]=React.useState(new Set());
  const [bulkActioning,setBulkActioning]=React.useState(false);
  const [expandedId,setExpandedId]=React.useState(null);
  const [typeFilter,setTypeFilter]=React.useState("ALL");
  const [search,setSearch]=React.useState("");
  const [confirmDelete,setConfirmDelete]=React.useState(null); // {ids:[], label:""}

  // ── On-load scan: generate missing Day3 and Window-Closed messages ──
  // Only scan sales delivered within last 20 days to avoid mass generation
  React.useEffect(()=>{
    if(!sales||sales.length===0)return;
    const scanMessages=async()=>{
      const today=new Date();today.setHours(0,0,0,0);
      const cutoff=new Date(today);cutoff.setDate(cutoff.getDate()-20); // only last 20 days
      for(const sale of sales){
        if(!sale.deliveryDate)continue;
        const delivered=new Date(sale.deliveryDate);delivered.setHours(0,0,0,0);
        if(delivered<cutoff)continue; // skip old deliveries
        const daysSince=Math.floor((today-delivered)/(1000*60*60*24));
        const phone=sale.phone||sale.contact||"";
        if(daysSince>=3){
          const exists=await dbMessageExists(shopId,sale.id,"DAY3_FOLLOWUP");
          if(!exists) await dbAddMessage({shopId,saleId:sale.id,customer:sale.customer,phone,messageType:"DAY3_FOLLOWUP",
            messageBody:`Hi ${sale.customer}, we hope you are enjoying your purchase.\n\nIf you have any questions, concerns, or require assistance with sizing, exchanges, or returns, please feel free to contact us.`});
        }
        if(daysSince>=14){
          const exists=await dbMessageExists(shopId,sale.id,"WINDOW_CLOSED");
          if(!exists) await dbAddMessage({shopId,saleId:sale.id,customer:sale.customer,phone,messageType:"WINDOW_CLOSED",
            messageBody:`Hi ${sale.customer}, thank you for shopping with us.\n\nThe 14-day return request period for your order has now ended.\n\nIf you have already submitted a return request and received a Return ID, please follow the return instructions provided.\n\nThank you for your support.`});
        }
      }
      const updated=await dbLoadMessages(shopId);
      setMessages(updated);
    };
    scanMessages().catch(console.error);
  },[sales]);

  const openWhatsApp=(phone,body)=>{
    const clean=phone.replace(/\D/g,"");
    const e164=clean.startsWith("0")?"44"+clean.slice(1):clean;
    window.open("https://wa.me/"+e164+"?text="+encodeURIComponent(body),"_blank","noopener,noreferrer");
  };

  const fmtDate=d=>{if(!d)return"—";try{return new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});}catch{return d;}};

  // Filter messages
  const filtered=messages.filter(m=>{
    if(filter!=="ALL"&&m.status!==filter)return false;
    if(typeFilter!=="ALL"&&m.messageType!==typeFilter)return false;
    if(search){
      const q=search.toLowerCase();
      if(!m.customer.toLowerCase().includes(q)&&!m.saleId.toLowerCase().includes(q)&&!m.phone.includes(q))return false;
    }
    return true;
  });

  const readyCount=messages.filter(m=>m.status==="READY").length;
  const allSelected=filtered.length>0&&filtered.every(m=>selected.has(m.id));
  const someSelected=selected.size>0;

  const toggleAll=()=>{
    if(allSelected){setSelected(new Set());}
    else{setSelected(new Set(filtered.map(m=>m.id)));}
  };
  const toggleOne=(id)=>{
    setSelected(prev=>{const s=new Set(prev);s.has(id)?s.delete(id):s.add(id);return s;});
  };

  // Single actions
  const handleSent=async(id)=>{
    await dbMarkMessageSent(id);
    setMessages(prev=>prev.map(m=>m.id===id?{...m,status:"SENT",sentAt:new Date().toISOString()}:m));
    setSelected(prev=>{const s=new Set(prev);s.delete(id);return s;});
  };
  const handleCancel=async(id)=>{
    await dbCancelMessage(id,user?.name||"Staff");
    setMessages(prev=>prev.map(m=>m.id===id?{...m,status:"CANCELLED",cancelledBy:user?.name||"Staff"}:m));
    setSelected(prev=>{const s=new Set(prev);s.delete(id);return s;});
  };

  // Delete handlers
  const handleDelete=async(id)=>{
    setConfirmDelete({ids:[id],label:"this message"});
  };
  const handleBulkDelete=()=>{
    if(selected.size===0)return;
    setConfirmDelete({ids:[...selected],label:`${selected.size} message${selected.size>1?"s":""}`});
  };
  const executeDelete=async()=>{
    const {ids}=confirmDelete;
    setConfirmDelete(null);
    setBulkActioning(true);
    await dbDeleteMessages(ids);
    setMessages(prev=>prev.filter(m=>!ids.includes(m.id)));
    setSelected(new Set());
    setBulkActioning(false);
  };

  // Bulk actions
  const bulkAction=async(action)=>{
    if(selected.size===0)return;
    setBulkActioning(true);
    const ids=[...selected];
    if(action==="sent"){
      await Promise.all(ids.map(id=>dbMarkMessageSent(id)));
      setMessages(prev=>prev.map(m=>selected.has(m.id)?{...m,status:"SENT",sentAt:new Date().toISOString()}:m));
    } else if(action==="cancel"){
      await Promise.all(ids.map(id=>dbCancelMessage(id,user?.name||"Staff")));
      setMessages(prev=>prev.map(m=>selected.has(m.id)?{...m,status:"CANCELLED",cancelledBy:user?.name||"Staff"}:m));
    }
    setSelected(new Set());
    setBulkActioning(false);
  };

  const th={padding:"9px 12px",fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",
    letterSpacing:"0.05em",background:"#f8fafc",borderBottom:"1px solid #e2e8f0",whiteSpace:"nowrap",textAlign:"left"};
  const td={padding:"10px 12px",fontSize:12,color:"#374151",borderBottom:"1px solid #f1f5f9",verticalAlign:"middle"};

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:0}}>
      {/* ── Header ── */}
      <div style={{padding:"16px 20px 12px",borderBottom:"1px solid #f1f5f9",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:12}}>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:800,color:"#0f172a"}}>💬 Messages</h2>
            <p style={{margin:"2px 0 0",fontSize:11,color:"#64748b"}}>WhatsApp queue · select rows to act in bulk</p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            {readyCount>0&&<div style={{background:"#fef9c3",border:"1px solid #fde047",borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,color:"#854d0e"}}>📨 {readyCount} ready</div>}
            {/* Search */}
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
              style={{padding:"6px 12px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:12,fontFamily:"inherit",outline:"none",width:160}}/>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          {["READY","SENT","CANCELLED","ALL"].map(f=>(
            <button key={f} onClick={()=>{setFilter(f);setSelected(new Set());}}
              style={{padding:"4px 12px",borderRadius:999,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                border:"1px solid "+(filter===f?shop.accent:"#e2e8f0"),
                background:filter===f?shop.accent:"white",color:filter===f?"white":"#64748b"}}>
              {f==="READY"?`READY${readyCount>0?" ("+readyCount+")":""}`:f}
            </button>
          ))}
          <div style={{width:1,height:16,background:"#e2e8f0",margin:"0 4px"}}/>
          {/* Type filter */}
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
            style={{padding:"4px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:11,fontFamily:"inherit",
              outline:"none",background:"white",color:"#374151",cursor:"pointer"}}>
            <option value="ALL">All Types</option>
            {Object.entries(MESSAGE_TYPE_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Bulk action bar — appears when rows selected */}
        {someSelected&&(
          <div style={{marginTop:10,padding:"10px 14px",background:"#0f172a",borderRadius:10,
            display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <span style={{fontSize:12,fontWeight:700,color:"white"}}>{selected.size} selected</span>
            <div style={{flex:1}}/>
            {filter!=="CANCELLED"&&(
              <button disabled={bulkActioning} onClick={()=>bulkAction("cancel")}
                style={{padding:"6px 16px",borderRadius:8,border:"1px solid rgba(255,255,255,0.2)",
                  background:"rgba(255,255,255,0.08)",color:"#94a3b8",fontSize:12,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit"}}>
                {bulkActioning?"Working…":"✕ Cancel Selected"}
              </button>
            )}
            {filter==="READY"&&(
              <button disabled={bulkActioning} onClick={()=>bulkAction("sent")}
                style={{padding:"6px 16px",borderRadius:8,border:"none",
                  background:"#16a34a",color:"white",fontSize:12,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit"}}>
                {bulkActioning?"Working…":"✓ Mark Selected as Sent"}
              </button>
            )}
            <button disabled={bulkActioning} onClick={handleBulkDelete}
              style={{padding:"6px 16px",borderRadius:8,border:"1px solid rgba(239,68,68,0.4)",
                background:"rgba(239,68,68,0.12)",color:"#fca5a5",fontSize:12,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit"}}>
              🗑️ Delete Selected
            </button>
            <button onClick={()=>setSelected(new Set())}
              style={{padding:"6px 10px",borderRadius:8,border:"none",background:"transparent",
                color:"#64748b",fontSize:11,cursor:"pointer"}}>Clear</button>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div style={{flex:1,overflowY:"auto"}}>
        {filtered.length===0?(
          <div style={{textAlign:"center",padding:"60px 20px",color:"#94a3b8"}}>
            <div style={{fontSize:36,marginBottom:10}}>{filter==="READY"?"📭":filter==="SENT"?"✅":"🚫"}</div>
            <p style={{margin:0,fontSize:14,fontWeight:600}}>
              {filter==="READY"?"No messages ready":"No "+filter.toLowerCase()+" messages"}
            </p>
          </div>
        ):(
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead style={{position:"sticky",top:0,zIndex:2}}>
              <tr>
                <th style={{...th,width:36,padding:"9px 8px 9px 16px"}}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    style={{width:15,height:15,cursor:"pointer",accentColor:shop.accent}}/>
                </th>
                <th style={th}>Type</th>
                <th style={th}>Customer</th>
                <th style={th}>Sale ID</th>
                <th style={th}>Phone</th>
                <th style={th}>Created</th>
                <th style={th}>Status</th>
                <th style={{...th,textAlign:"right"}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(msg=>{
                const typeStyle=MESSAGE_TYPE_COLOR[msg.messageType]||{bg:"#f8fafc",border:"#e2e8f0",text:"#374151"};
                const isSelected=selected.has(msg.id);
                const isExpanded=expandedId===msg.id;
                return(
                  <React.Fragment key={msg.id}>
                    <tr style={{background:isSelected?"#eff6ff":"white",cursor:"pointer"}}
                      onClick={()=>toggleOne(msg.id)}>
                      <td style={{...td,padding:"10px 8px 10px 16px"}} onClick={e=>e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={()=>toggleOne(msg.id)}
                          style={{width:15,height:15,cursor:"pointer",accentColor:shop.accent}}/>
                      </td>
                      <td style={td} onClick={e=>e.stopPropagation()}>
                        <span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:999,whiteSpace:"nowrap",
                          background:typeStyle.bg,border:"1px solid "+typeStyle.border,color:typeStyle.text}}>
                          {MESSAGE_TYPE_LABEL[msg.messageType]||msg.messageType}
                        </span>
                      </td>
                      <td style={{...td,fontWeight:700,color:"#0f172a"}}>{msg.customer}</td>
                      <td style={{...td,fontFamily:"DM Mono,monospace",color:shop.accent,fontWeight:700}}>{msg.saleId}</td>
                      <td style={{...td,fontFamily:"DM Mono,monospace",color:"#64748b"}}>{msg.phone}</td>
                      <td style={{...td,color:"#64748b",whiteSpace:"nowrap"}}>{fmtDate(msg.createdAt)}</td>
                      <td style={td}>
                        {msg.status==="READY"&&<span style={{fontSize:11,fontWeight:700,color:shop.accent}}>● Ready</span>}
                        {msg.status==="SENT"&&<span style={{fontSize:11,fontWeight:700,color:"#16a34a"}}>✓ Sent {fmtDate(msg.sentAt)}</span>}
                        {msg.status==="CANCELLED"&&<span style={{fontSize:11,fontWeight:600,color:"#94a3b8"}}>✕ Cancelled</span>}
                      </td>
                      <td style={{...td,textAlign:"right"}} onClick={e=>e.stopPropagation()}>
                        <div style={{display:"flex",gap:5,justifyContent:"flex-end",alignItems:"center"}}>
                          <button onClick={()=>setExpandedId(isExpanded?null:msg.id)}
                            style={{padding:"4px 9px",borderRadius:6,border:"1px solid #e2e8f0",background:"white",
                              color:"#64748b",fontSize:11,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>
                            {isExpanded?"▲":"▼"}
                          </button>
                          {msg.status==="READY"&&(<>
                            <button onClick={()=>openWhatsApp(msg.phone,msg.messageBody)}
                              style={{padding:"4px 9px",borderRadius:6,border:"none",background:"#25d366",
                                color:"white",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                              WhatsApp
                            </button>
                            <button onClick={()=>handleSent(msg.id)}
                              style={{padding:"4px 9px",borderRadius:6,border:"1px solid #86efac",background:"#f0fdf4",
                                color:"#166534",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                              ✓ Sent
                            </button>
                            <button onClick={()=>handleCancel(msg.id)}
                              style={{padding:"4px 9px",borderRadius:6,border:"1px solid #e2e8f0",background:"white",
                                color:"#94a3b8",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>
                              ✕
                            </button>
                          </>)}
                          <button onClick={()=>handleDelete(msg.id)}
                            title="Delete this message"
                            style={{padding:"4px 8px",borderRadius:6,border:"1px solid #fecaca",background:"#fff5f5",
                              color:"#dc2626",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded message body row */}
                    {isExpanded&&(
                      <tr style={{background:"#f8fafc"}}>
                        <td colSpan={8} style={{padding:"0 16px 14px 52px",borderBottom:"1px solid #f1f5f9"}}>
                          <div style={{background:"white",border:"1px solid #e2e8f0",borderRadius:10,
                            padding:"12px 14px",fontSize:12,color:"#374151",lineHeight:1.8,
                            whiteSpace:"pre-wrap",fontFamily:"inherit",maxWidth:640}}>
                            {msg.messageBody}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer count ── */}
      {filtered.length>0&&(
        <div style={{padding:"8px 20px",borderTop:"1px solid #f1f5f9",fontSize:11,color:"#94a3b8",flexShrink:0,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>Showing {filtered.length} of {messages.length} messages</span>
          {someSelected&&<span style={{color:shop.accent,fontWeight:700}}>{selected.size} selected</span>}
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {confirmDelete&&(
        <div style={{position:"fixed",inset:0,zIndex:90,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(4px)"}}
            onClick={()=>setConfirmDelete(null)}/>
          <div style={{position:"relative",background:"white",borderRadius:16,boxShadow:"0 24px 64px rgba(0,0,0,0.20)",
            width:"100%",maxWidth:380,padding:28,textAlign:"center"}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:"#fef2f2",border:"2px solid #fca5a5",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 16px"}}>🗑️</div>
            <h3 style={{margin:"0 0 8px",fontSize:17,fontWeight:800,color:"#0f172a"}}>Delete Messages</h3>
            <p style={{margin:"0 0 6px",fontSize:13,color:"#374151"}}>
              You are about to permanently delete <strong>{confirmDelete.label}</strong>.
            </p>
            <p style={{margin:"0 0 24px",fontSize:12,color:"#ef4444",fontWeight:600}}>
              ⚠️ This cannot be undone.
            </p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <button onClick={()=>setConfirmDelete(null)}
                style={{padding:"11px 0",borderRadius:10,border:"1px solid #e2e8f0",background:"white",
                  color:"#374151",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                Cancel
              </button>
              <button onClick={executeDelete}
                style={{padding:"11px 0",borderRadius:10,border:"none",background:"#dc2626",
                  color:"white",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",
                  boxShadow:"0 4px 12px rgba(220,38,38,0.35)"}}>
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
/* ── End MessagesPanel ───────────────────────────────────────────────────── */


/* ═══════════════════════════════════════════════════════════
   RETURN ADDRESS VERSIONS
   ═══════════════════════════════════════════════════════════ */
const RETURN_ADDRESSES={
  v1:`ROS
20 Heol pen y cae
Gorseinon
SA4 4ZB`,
};

const RETURN_APPROVAL_MESSAGE=(returnId,customer,addressVersion="v1")=>{
const addr=RETURN_ADDRESSES[addressVersion]||RETURN_ADDRESSES.v1;
return `Dear ${customer},

Thank you for contacting us. Your return request has been approved and we are happy to assist you further.

*Return ID: ${returnId}*

Please write your Return ID clearly on the outside of the parcel. This is essential to ensure your return is identified and processed promptly upon arrival.

Please return your item to the following address:

${addr}

*Important — Please read before returning:*

• Your item must be returned in the same condition as received — unused, unworn, and in its original packaging.
• Returns must be dispatched within 7 days of receiving these instructions.
• Please include your own return address on the parcel so we can contact you if needed.
• Once we receive your item, we will notify you and proceed with your refund or exchange as requested.

Please note that these conditions do not affect your statutory rights under UK consumer legislation.

You can review our full returns policy here:
https://rosselections.com/policies/refund-policy

If you have any questions or require further assistance, please do not hesitate to contact us.

Thank you for shopping with ROS. We look forward to resolving this for you.`;
};

/* ═══════════════════════════════════════════════════════════
   RETURNS PORTAL — public page at /returns
   ═══════════════════════════════════════════════════════════ */
const ReturnsPortal=()=>{
  const [step,setStep]=React.useState("form"); // form | success | error
  const [loading,setLoading]=React.useState(false);
  const [generatedId,setGeneratedId]=React.useState("");
  const [errorMsg,setErrorMsg]=React.useState("");
  const [form,setForm]=React.useState({
    name:"",phone:"",reason:"",resolution:"exchange",
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const REASONS=[
    "Item damaged or defective",
    "Incorrect item received",
    "Item does not match description",
    "Sizing issue",
    "Changed my mind",
    "Other",
  ];

  const handleSubmit=async()=>{
    // Basic validation
    if(!form.name.trim()||!form.phone.trim()||!form.reason||!form.resolution){
      setErrorMsg("Please fill in all fields.");return;
    }
    setErrorMsg("");setLoading(true);
    try{
      const {createClient}=await import("https://esm.sh/@supabase/supabase-js@2");
      const sb=createClient(
        "https://fssyvdxqtruacauwygjj.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzc3l2ZHhxdHJ1YWNhdXd5Z2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDYwODQsImV4cCI6MjA4ODk4MjA4NH0.O8Mp89s2AXCZyvykzLmpiUeC34Hl4LV3NtLgzffJRY4"
      );

      // 1. Find sale by phone number (most recent fulfilled/delivered sale)
      const cleanPhone=p=>String(p||"").replace(/\D/g,"").slice(-10);
      const phoneClean=cleanPhone(form.phone);

      const {data:saleRows,error:saleErr}=await sb
        .from("sales").select("*")
        .or(`phone.eq.${form.phone.trim()},contact.eq.${form.phone.trim()}`)
        .order("date",{ascending:false});

      // Also try cleaned phone
      let allRows=saleRows||[];
      if(allRows.length===0){
        const {data:rows2}=await sb.from("sales").select("*").order("date",{ascending:false});
        allRows=(rows2||[]).filter(r=>cleanPhone(r.phone||r.contact)===phoneClean);
      } else {
        allRows=allRows.filter(r=>cleanPhone(r.phone||r.contact)===phoneClean);
      }

      if(saleErr||allRows.length===0){
        setErrorMsg("We could not find an order with this WhatsApp number. Please check your number or contact us directly.");
        setLoading(false);return;
      }

      // 2. Name match — find best matching sale
      const normName=s=>s.toLowerCase().replace(/\s+/g," ").trim();
      const firstName=normName(form.name).split(" ")[0];
      let sale=allRows.find(r=>normName(r.customer||"").includes(firstName));
      if(!sale) sale=allRows[0]; // fallback to most recent

      const orderId=sale.id;

      // 3. Validate delivered
      if(!sale.delivery_date){
        setErrorMsg("Your most recent order has not been marked as delivered yet. Please contact us directly if you believe this is an error.");
        setLoading(false);return;
      }

      // 4. Validate within 14-day return window
      const delivered=new Date(sale.delivery_date);delivered.setHours(0,0,0,0);
      const today=new Date();today.setHours(0,0,0,0);
      const daysSince=Math.floor((today-delivered)/(1000*60*60*24));
      if(daysSince>14){
        setErrorMsg(`The 14-day return window for this order closed on ${new Date(delivered.getTime()+14*86400000).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}. Unfortunately we are unable to accept this return request.`);
        setLoading(false);return;
      }

      // 5. Check no existing open return for this order
      const {data:existingRet}=await sb.from("returns")
        .select("id,status").eq("sale_id",orderId)
        .neq("status","RETURN_EXPIRED")
        .limit(1);
      if(existingRet&&existingRet.length>0){
        setErrorMsg(`A return request already exists for this order (${existingRet[0].id}). If you need help, please contact us directly.`);
        setLoading(false);return;
      }

      // 6. Generate Return ID
      const year=new Date().getFullYear();
      const {data:lastRet}=await sb.from("returns")
        .select("id").like("id",`RET-${year}-%`)
        .order("id",{ascending:false}).limit(1);
      const lastNum=lastRet&&lastRet.length>0?parseInt(lastRet[0].id.split("-")[2]||"0",10):0;
      const retId=`RET-${year}-${String(lastNum+1).padStart(4,"0")}`;

      // 7. Calculate return deadline (14 days from today)
      const deadline=new Date();deadline.setDate(deadline.getDate()+14);
      const deadlineStr=deadline.toISOString().split("T")[0];

      // 8. Save return record
      const {error:retErr}=await sb.from("returns").insert({
        id:retId,
        shop_id:sale.shop_id,
        sale_id:orderId,
        customer:sale.customer||form.name,
        phone:form.phone,
        reason:form.reason,
        resolution:form.resolution,
        status:"RETURN_APPROVED",
        return_deadline:deadlineStr,
        return_address_version:"v1",
        staff_notes:"",
      });
      if(retErr){
        setErrorMsg("Something went wrong saving your return. Please try again or contact us.");
        setLoading(false);return;
      }

      // 9. Queue approval message
      const msgBody=RETURN_APPROVAL_MESSAGE(retId,sale.customer||form.name,"v1");
      await sb.from("message_queue").insert({
        shop_id:sale.shop_id,
        sale_id:orderId,
        customer:sale.customer||form.name,
        phone:form.phone,
        message_type:"RETURN_APPROVED",
        message_body:msgBody,
        status:"READY",
      });

      setGeneratedId(retId);
      setStep("success");
    }catch(e){
      console.error(e);
      setErrorMsg("An unexpected error occurred. Please try again or contact us directly.");
    }
    setLoading(false);
  };

  const inputStyle={width:"100%",padding:"11px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",background:"white",transition:"border 0.15s"};
  const labelStyle={display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"};

  if(step==="success") return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"system-ui,sans-serif"}}>
      <div style={{background:"white",borderRadius:20,boxShadow:"0 20px 60px rgba(0,0,0,0.10)",maxWidth:480,width:"100%",padding:40,textAlign:"center"}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:"#dcfce7",border:"3px solid #16a34a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 20px"}}>✅</div>
        <h1 style={{margin:"0 0 8px",fontSize:24,fontWeight:800,color:"#0f172a"}}>Return Approved</h1>
        <p style={{margin:"0 0 20px",fontSize:14,color:"#64748b"}}>Your return request has been submitted successfully.</p>
        <div style={{background:"#f0fdf4",borderRadius:12,padding:"16px 20px",border:"1px solid #86efac",marginBottom:20}}>
          <p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:"#166534",textTransform:"uppercase",letterSpacing:"0.05em"}}>Your Return ID</p>
          <p style={{margin:0,fontSize:28,fontWeight:900,color:"#15803d",fontFamily:"DM Mono,monospace",letterSpacing:1}}>{generatedId}</p>
        </div>
        <p style={{margin:"0 0 24px",fontSize:13,color:"#374151",lineHeight:1.6}}>
          We will send you the full return instructions via WhatsApp shortly.<br/>
          Please <strong>write your Return ID on the outside of the parcel</strong>.
        </p>
        <p style={{margin:0,fontSize:12,color:"#94a3b8"}}>You can close this page.</p>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f8fafc,#f1f5f9)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"system-ui,sans-serif"}}>
      <div style={{background:"white",borderRadius:20,boxShadow:"0 20px 60px rgba(0,0,0,0.08)",maxWidth:480,width:"100%",overflow:"hidden"}}>
        {/* Header */}
        <div style={{background:"linear-gradient(135deg,#166534,#15803d)",padding:"28px 32px 24px"}}>
          <p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.7)",textTransform:"uppercase",letterSpacing:"0.08em"}}>ROS Selections</p>
          <h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:800,color:"white"}}>↩️ Return Request</h1>
          <p style={{margin:0,fontSize:13,color:"rgba(255,255,255,0.8)"}}>14-day return window · Please complete all fields</p>
        </div>

        <div style={{padding:"28px 32px"}}>
          {/* Name */}
          <div style={{marginBottom:16}}>
            <label style={labelStyle}>Full Name</label>
            <input value={form.name} onChange={e=>set("name",e.target.value)}
              placeholder="Your full name"
              style={inputStyle}/>
          </div>

          {/* WhatsApp Number */}
          <div style={{marginBottom:16}}>
            <label style={labelStyle}>WhatsApp Number</label>
            <input value={form.phone} onChange={e=>set("phone",e.target.value)}
              placeholder="e.g. 07700 000000"
              style={inputStyle} type="tel"/>
            <p style={{margin:"4px 0 0",fontSize:11,color:"#94a3b8"}}>We will send your return instructions via WhatsApp</p>
          </div>

          {/* Reason */}
          <div style={{marginBottom:16}}>
            <label style={labelStyle}>Reason for Return</label>
            <select value={form.reason} onChange={e=>set("reason",e.target.value)} style={inputStyle}>
              <option value="">— Select a reason —</option>
              {REASONS.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Resolution */}
          <div style={{marginBottom:24}}>
            <label style={labelStyle}>I Would Like A</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {["exchange","refund"].map(opt=>(
                <button key={opt} type="button" onClick={()=>set("resolution",opt)}
                  style={{padding:"12px 0",borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,
                    border:"2px solid "+(form.resolution===opt?"#166534":"#e2e8f0"),
                    background:form.resolution===opt?"#f0fdf4":"white",
                    color:form.resolution===opt?"#166534":"#64748b"}}>
                  {opt==="exchange"?"🔄 Exchange":"💰 Refund"}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {errorMsg&&(
            <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#dc2626",fontWeight:600}}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={loading}
            style={{width:"100%",padding:"14px 0",borderRadius:12,border:"none",
              background:loading?"#94a3b8":"linear-gradient(135deg,#166534,#15803d)",
              color:"white",fontWeight:800,fontSize:15,cursor:loading?"default":"pointer",
              fontFamily:"inherit",boxShadow:loading?"none":"0 4px 20px rgba(22,101,52,0.30)"}}>
            {loading?"Submitting…":"Submit Return Request →"}
          </button>

          <p style={{margin:"16px 0 0",fontSize:11,color:"#94a3b8",textAlign:"center",lineHeight:1.5}}>
            By submitting this form you confirm the item is unused, unworn and in its original packaging.<br/>
            <a href="https://rosselections.com/policies/refund-policy" target="_blank" rel="noreferrer" style={{color:"#166534"}}>View our full returns policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};
/* ── End ReturnsPortal ───────────────────────────────────────────────────── */

/* ═══════════════════════════════════════════════════════════
   RETURN TRACKING PORTAL — /return-tracking
   Customer submits tracking number + proof of postage
   ═══════════════════════════════════════════════════════════ */
const ReturnTrackingPortal=()=>{
  const [step,setStep]=React.useState("form"); // form | success | error
  const [loading,setLoading]=React.useState(false);
  const [errorMsg,setErrorMsg]=React.useState("");
  const [returnRecord,setReturnRecord]=React.useState(null);
  const [form,setForm]=React.useState({
    returnId:"",phone:"",trackingNo:"",courier:"",proofFile:null,proofName:"",
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const fileRef=React.useRef(null);

  const COURIERS=["Royal Mail","Evri","DPD","Parcelforce","DHL","UPS","Other"];

  const SB_URL="https://fssyvdxqtruacauwygjj.supabase.co";
  const SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzc3l2ZHhxdHJ1YWNhdXd5Z2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDYwODQsImV4cCI6MjA4ODk4MjA4NH0.O8Mp89s2AXCZyvykzLmpiUeC34Hl4LV3NtLgzffJRY4";

  const getSb=async()=>{
    const {createClient}=await import("https://esm.sh/@supabase/supabase-js@2");
    return createClient(SB_URL,SB_KEY);
  };

  // Step 1 — look up return by ID + phone
  const handleLookup=async()=>{
    if(!form.returnId.trim()||!form.phone.trim()){
      setErrorMsg("Please enter your Return ID and WhatsApp number.");return;
    }
    setErrorMsg("");setLoading(true);
    try{
      const sb=await getSb();
      const retId=form.returnId.trim().toUpperCase();
      const {data,error}=await sb.from("returns").select("*").eq("id",retId).maybeSingle();
      if(error||!data){
        setErrorMsg("Return ID not found. Please check and try again.");
        setLoading(false);return;
      }
      // Validate phone
      const clean=p=>String(p||"").replace(/\D/g,"").slice(-10);
      if(clean(data.phone)!==clean(form.phone)){
        setErrorMsg("Phone number does not match this Return ID. Please check and try again.");
        setLoading(false);return;
      }
      if(data.status==="RETURN_EXPIRED"){
        setErrorMsg("This return has expired. Please contact us directly for assistance.");
        setLoading(false);return;
      }
      if(["REFUNDED","EXCHANGED"].includes(data.status)){
        setErrorMsg("This return has already been completed. No further action is needed.");
        setLoading(false);return;
      }
      setReturnRecord(data);
      setStep("upload");
    }catch(e){
      setErrorMsg("An unexpected error occurred. Please try again.");
    }
    setLoading(false);
  };

  // Step 2 — upload proof + save tracking
  const handleSubmit=async()=>{
    if(!form.trackingNo.trim()||!form.courier){
      setErrorMsg("Please enter your tracking number and select a courier.");return;
    }
    setErrorMsg("");setLoading(true);
    try{
      const sb=await getSb();
      let proofUrl="";

      // Upload proof of postage if provided
      if(form.proofFile){
        const ext=form.proofName.split(".").pop()||"jpg";
        const path=`returns/${returnRecord.id}/${Date.now()}.${ext}`;
        const {data:upData,error:upErr}=await sb.storage
          .from("return-proofs")
          .upload(path,form.proofFile,{contentType:form.proofFile.type,upsert:true});
        if(upErr){
          // Storage bucket may not exist — proceed without proof URL
          console.warn("Proof upload failed:",upErr.message);
        } else {
          const {data:urlData}=sb.storage.from("return-proofs").getPublicUrl(path);
          proofUrl=urlData?.publicUrl||"";
        }
      }

      // Update return record
      const{error:saveErr}=await sb.from("returns").update({
        tracking_no:    form.trackingNo.trim().toUpperCase(),
        courier:        form.courier,
        proof_url:      proofUrl,
        status:         "RETURN_IN_TRANSIT",
      }).eq("id",returnRecord.id);

      if(saveErr){
        setErrorMsg("Failed to save your tracking details. Please try again.");
        setLoading(false);return;
      }
      setStep("success");
    }catch(e){
      setErrorMsg("An unexpected error occurred. Please try again.");
    }
    setLoading(false);
  };

  const inputStyle={width:"100%",padding:"11px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",
    fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",background:"white"};
  const labelStyle={display:"block",fontSize:12,fontWeight:700,color:"#374151",
    marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"};
  const fmtDate=d=>{if(!d)return"";try{return new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});}catch{return d;}};

  // ── Success screen ──
  if(step==="success") return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"system-ui,sans-serif"}}>
      <div style={{background:"white",borderRadius:20,boxShadow:"0 20px 60px rgba(0,0,0,0.10)",maxWidth:440,width:"100%",padding:40,textAlign:"center"}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:"#dcfce7",border:"3px solid #16a34a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 20px"}}>✅</div>
        <h1 style={{margin:"0 0 8px",fontSize:22,fontWeight:800,color:"#0f172a"}}>Tracking Submitted</h1>
        <p style={{margin:"0 0 20px",fontSize:14,color:"#64748b"}}>Thank you — your return is now in transit.</p>
        <div style={{background:"#f0fdf4",borderRadius:12,padding:"14px 18px",border:"1px solid #86efac",marginBottom:20,textAlign:"left"}}>
          <p style={{margin:"0 0 6px",fontSize:11,fontWeight:700,color:"#166534",textTransform:"uppercase"}}>Return Summary</p>
          <p style={{margin:"0 0 3px",fontSize:13,color:"#374151"}}><strong>Return ID:</strong> {returnRecord?.id}</p>
          <p style={{margin:"0 0 3px",fontSize:13,color:"#374151"}}><strong>Tracking:</strong> {form.trackingNo.toUpperCase()}</p>
          <p style={{margin:0,fontSize:13,color:"#374151"}}><strong>Courier:</strong> {form.courier}</p>
        </div>
        <p style={{margin:0,fontSize:12,color:"#94a3b8",lineHeight:1.6}}>
          We will notify you via WhatsApp once we receive your item and begin processing your {returnRecord?.resolution}.
        </p>
      </div>
    </div>
  );

  // ── Upload screen (after lookup) ──
  if(step==="upload") return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f8fafc,#f1f5f9)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"system-ui,sans-serif"}}>
      <div style={{background:"white",borderRadius:20,boxShadow:"0 20px 60px rgba(0,0,0,0.08)",maxWidth:480,width:"100%",overflow:"hidden"}}>
        <div style={{background:"linear-gradient(135deg,#166534,#15803d)",padding:"24px 28px 20px"}}>
          <p style={{margin:"0 0 2px",fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.7)",textTransform:"uppercase",letterSpacing:"0.08em"}}>Return Tracking</p>
          <h1 style={{margin:"0 0 2px",fontSize:20,fontWeight:800,color:"white"}}>📦 Submit Tracking Info</h1>
          <p style={{margin:0,fontSize:12,color:"rgba(255,255,255,0.8)"}}>Return ID: {returnRecord?.id} · Deadline: {fmtDate(returnRecord?.return_deadline)}</p>
        </div>
        <div style={{padding:"24px 28px"}}>
          {/* Return info banner */}
          <div style={{background:"#f0fdf4",borderRadius:10,padding:"10px 14px",border:"1px solid #86efac",marginBottom:18}}>
            <p style={{margin:0,fontSize:13,color:"#166534"}}>
              <strong>{returnRecord?.customer}</strong> · {returnRecord?.resolution==="exchange"?"🔄 Exchange":"💰 Refund"} · {returnRecord?.reason}
            </p>
          </div>

          {/* Tracking number */}
          <div style={{marginBottom:14}}>
            <label style={labelStyle}>Tracking Number</label>
            <input value={form.trackingNo} onChange={e=>set("trackingNo",e.target.value.toUpperCase())}
              placeholder="e.g. AB123456789GB"
              style={{...inputStyle,fontFamily:"DM Mono,monospace",fontWeight:700,letterSpacing:1}}/>
          </div>

          {/* Courier */}
          <div style={{marginBottom:14}}>
            <label style={labelStyle}>Courier / Postal Service</label>
            <select value={form.courier} onChange={e=>set("courier",e.target.value)} style={inputStyle}>
              <option value="">— Select courier —</option>
              {COURIERS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Proof of postage upload */}
          <div style={{marginBottom:20}}>
            <label style={labelStyle}>Proof of Postage <span style={{fontWeight:400,textTransform:"none",color:"#94a3b8"}}>(optional but recommended)</span></label>
            <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:"none"}}
              onChange={e=>{
                const f=e.target.files[0];
                if(f){set("proofFile",f);set("proofName",f.name);}
              }}/>
            {form.proofFile?(
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,border:"1.5px solid #86efac",background:"#f0fdf4"}}>
                <span style={{fontSize:20}}>📎</span>
                <span style={{flex:1,fontSize:13,color:"#166534",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{form.proofName}</span>
                <button onClick={()=>{set("proofFile",null);set("proofName","");if(fileRef.current)fileRef.current.value="";}}
                  style={{border:"none",background:"transparent",color:"#94a3b8",cursor:"pointer",fontSize:16,padding:0}}>×</button>
              </div>
            ):(
              <button onClick={()=>fileRef.current&&fileRef.current.click()}
                style={{width:"100%",padding:"14px",borderRadius:10,border:"2px dashed #cbd5e1",background:"#f8fafc",
                  color:"#64748b",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                <span style={{fontSize:20}}>📷</span> Upload Photo or PDF
              </button>
            )}
            <p style={{margin:"6px 0 0",fontSize:11,color:"#94a3b8"}}>Photo of your postage receipt or tracking confirmation</p>
          </div>

          {errorMsg&&(
            <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:"#dc2626",fontWeight:600}}>
              ⚠️ {errorMsg}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            style={{width:"100%",padding:"14px 0",borderRadius:12,border:"none",
              background:loading?"#94a3b8":"linear-gradient(135deg,#166534,#15803d)",
              color:"white",fontWeight:800,fontSize:15,cursor:loading?"default":"pointer",
              fontFamily:"inherit",boxShadow:loading?"none":"0 4px 20px rgba(22,101,52,0.30)"}}>
            {loading?"Submitting…":"Submit Tracking →"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Lookup screen (default) ──
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f8fafc,#f1f5f9)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"system-ui,sans-serif"}}>
      <div style={{background:"white",borderRadius:20,boxShadow:"0 20px 60px rgba(0,0,0,0.08)",maxWidth:440,width:"100%",overflow:"hidden"}}>
        <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",padding:"24px 28px 20px"}}>
          <p style={{margin:"0 0 2px",fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.6)",textTransform:"uppercase",letterSpacing:"0.08em"}}>ROS Returns</p>
          <h1 style={{margin:"0 0 2px",fontSize:20,fontWeight:800,color:"white"}}>📦 Return Tracking</h1>
          <p style={{margin:0,fontSize:12,color:"rgba(255,255,255,0.7)"}}>Submit your tracking number and proof of postage</p>
        </div>
        <div style={{padding:"24px 28px"}}>
          <div style={{marginBottom:14}}>
            <label style={labelStyle}>Return ID</label>
            <input value={form.returnId} onChange={e=>set("returnId",e.target.value.toUpperCase())}
              placeholder="e.g. RET-2026-0001"
              style={{...inputStyle,fontFamily:"DM Mono,monospace",fontWeight:700,letterSpacing:1}}/>
            <p style={{margin:"4px 0 0",fontSize:11,color:"#94a3b8"}}>Found in your return approval message</p>
          </div>
          <div style={{marginBottom:20}}>
            <label style={labelStyle}>WhatsApp Number</label>
            <input value={form.phone} onChange={e=>set("phone",e.target.value)}
              placeholder="e.g. 07700 000000" type="tel"
              style={inputStyle}/>
            <p style={{margin:"4px 0 0",fontSize:11,color:"#94a3b8"}}>Must match the number used to submit your return</p>
          </div>

          {errorMsg&&(
            <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:"#dc2626",fontWeight:600}}>
              ⚠️ {errorMsg}
            </div>
          )}

          <button onClick={handleLookup} disabled={loading}
            style={{width:"100%",padding:"14px 0",borderRadius:12,border:"none",
              background:loading?"#94a3b8":"linear-gradient(135deg,#0f172a,#334155)",
              color:"white",fontWeight:800,fontSize:15,cursor:loading?"default":"pointer",
              fontFamily:"inherit",boxShadow:loading?"none":"0 4px 20px rgba(15,23,42,0.25)"}}>
            {loading?"Looking up…":"Find My Return →"}
          </button>

          <p style={{margin:"16px 0 0",fontSize:11,color:"#94a3b8",textAlign:"center"}}>
            Need help? Contact us directly via WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
};
/* ── End ReturnTrackingPortal ────────────────────────────────────────────── */




/* ═══════════════════════════════════════════════════════════
   RETURNS PANEL — staff view of all returns
   ═══════════════════════════════════════════════════════════ */
const RETURN_STATUS_STYLE={
  RETURN_APPROVED: {bg:"#f0fdf4",border:"#86efac",text:"#166534",label:"Approved"},
  RETURN_IN_TRANSIT:{bg:"#eff6ff",border:"#93c5fd",text:"#1d4ed8",label:"In Transit"},
  RETURN_RECEIVED: {bg:"#f0f9ff",border:"#7dd3fc",text:"#0369a1",label:"Received"},
  RETURN_EXPIRED:  {bg:"#fef2f2",border:"#fca5a5",text:"#dc2626",label:"Expired"},
  REFUNDED:        {bg:"#f5f3ff",border:"#c4b5fd",text:"#6d28d9",label:"Refunded"},
  EXCHANGED:       {bg:"#fdf4ff",border:"#e879f9",text:"#a21caf",label:"Exchanged"},
};

const daysRemaining=(deadlineStr)=>{
  if(!deadlineStr)return null;
  const dl=new Date(deadlineStr);dl.setHours(0,0,0,0);
  const today=new Date();today.setHours(0,0,0,0);
  return Math.ceil((dl-today)/(1000*60*60*24));
};

const DaysChip=({days})=>{
  if(days===null)return null;
  if(days<0)return <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:999,background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5"}}>Expired</span>;
  if(days===0)return <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:999,background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5"}}>Today</span>;
  if(days<=2)return <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:999,background:"#fff7ed",color:"#c2410c",border:"1px solid #fdba74"}}>🔴 {days}d left</span>;
  if(days<=4)return <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:999,background:"#fffbeb",color:"#b45309",border:"1px solid #fcd34d"}}>🟡 {days}d left</span>;
  return <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:999,background:"#f0fdf4",color:"#166534",border:"1px solid #86efac"}}>🟢 {days}d left</span>;
};

const ReturnDetailModal=({ret,shop,onClose,onUpdate,user})=>{
  const [form,setForm]=React.useState({
    status:ret.status,
    trackingNo:ret.trackingNo||"",
    courier:ret.courier||"",
    receivedDate:ret.receivedDate||"",
    refundDate:ret.refundDate||"",
    exchangeDate:ret.exchangeDate||"",
    staffNotes:ret.staffNotes||"",
  });
  const [saving,setSaving]=React.useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const days=daysRemaining(ret.returnDeadline);

  const inp={width:"100%",padding:"9px 12px",borderRadius:9,border:"1.5px solid #e2e8f0",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",background:"white"};
  const lbl={display:"block",fontSize:11,fontWeight:700,color:"#374151",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"};

  const handleSave=async()=>{
    setSaving(true);
    await dbSaveReturn({
      ...ret,
      status:form.status,
      trackingNo:form.trackingNo,
      courier:form.courier,
      receivedDate:form.receivedDate,
      refundDate:form.refundDate,
      exchangeDate:form.exchangeDate,
      staffNotes:form.staffNotes,
    });
    onUpdate({...ret,status:form.status,trackingNo:form.trackingNo,courier:form.courier,
      receivedDate:form.receivedDate,refundDate:form.refundDate,exchangeDate:form.exchangeDate,
      staffNotes:form.staffNotes});
    setSaving(false);
    onClose();
  };

  const fmtDate=d=>{if(!d)return"—";try{return new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});}catch{return d;}};
  const statusStyle=RETURN_STATUS_STYLE[form.status]||{bg:"#f8fafc",border:"#e2e8f0",text:"#374151",label:form.status};

  return(
    <div style={{position:"fixed",inset:0,zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}} onClick={onClose}/>
      <div style={{position:"relative",background:"white",borderRadius:18,boxShadow:"0 24px 64px rgba(0,0,0,0.18)",width:"100%",maxWidth:540,maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"16px 20px",borderBottom:"1px solid #f1f5f9",background:shop.accent+"10",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <p style={{margin:"0 0 2px",fontSize:11,fontWeight:700,color:shop.accent,textTransform:"uppercase",letterSpacing:"0.06em"}}>Return Detail</p>
              <h3 style={{margin:"0 0 2px",fontSize:17,fontWeight:900,color:"#0f172a",fontFamily:"DM Mono,monospace"}}>{ret.id}</h3>
              <p style={{margin:0,fontSize:12,color:"#64748b"}}>{ret.customer} · {ret.phone} · Sale: {ret.saleId}</p>
            </div>
            <button onClick={onClose} style={{width:30,height:30,borderRadius:"50%",border:"none",background:"#f1f5f9",cursor:"pointer",fontSize:18,color:"#64748b",flexShrink:0}}>×</button>
          </div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
          {/* Key info row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
            <div style={{background:"#f8fafc",borderRadius:10,padding:"10px 12px",border:"1px solid #e2e8f0"}}>
              <p style={{margin:"0 0 2px",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase"}}>Resolution</p>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0f172a"}}>{ret.resolution==="exchange"?"🔄 Exchange":"💰 Refund"}</p>
            </div>
            <div style={{background:"#f8fafc",borderRadius:10,padding:"10px 12px",border:"1px solid #e2e8f0"}}>
              <p style={{margin:"0 0 2px",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase"}}>Deadline</p>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0f172a"}}>{fmtDate(ret.returnDeadline)}</p>
            </div>
            <div style={{background:"#f8fafc",borderRadius:10,padding:"10px 12px",border:"1px solid #e2e8f0",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <DaysChip days={days}/>
            </div>
          </div>

          {/* Reason */}
          <div style={{background:"#fffbeb",borderRadius:10,padding:"10px 14px",border:"1px solid #fde68a",marginBottom:16}}>
            <p style={{margin:"0 0 2px",fontSize:10,fontWeight:700,color:"#92400e",textTransform:"uppercase"}}>Reason</p>
            <p style={{margin:0,fontSize:13,color:"#374151"}}>{ret.reason}</p>
          </div>

          {/* Status */}
          <div style={{marginBottom:14}}>
            <label style={lbl}>Status</label>
            <select value={form.status} onChange={e=>set("status",e.target.value)}
              style={{...inp,fontWeight:700,color:statusStyle.text,background:statusStyle.bg,border:"1.5px solid "+statusStyle.border}}>
              {Object.entries(RETURN_STATUS_STYLE).map(([k,v])=>(
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Customer tracking */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <label style={lbl}>Customer Tracking No.</label>
              <input value={form.trackingNo} onChange={e=>set("trackingNo",e.target.value)}
                placeholder="Customer's return tracking" style={inp}/>
            </div>
            <div>
              <label style={lbl}>Courier</label>
              <select value={form.courier} onChange={e=>set("courier",e.target.value)} style={inp}>
                <option value="">— Select —</option>
                {["Royal Mail","Evri","DPD","Parcelforce","DHL","UPS","Other"].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <label style={lbl}>Received Date</label>
              <input type="date" value={form.receivedDate} onChange={e=>set("receivedDate",e.target.value)} style={inp}/>
            </div>
            <div>
              <label style={lbl}>Refund Date</label>
              <input type="date" value={form.refundDate} onChange={e=>set("refundDate",e.target.value)} style={inp}/>
            </div>
            <div>
              <label style={lbl}>Exchange Date</label>
              <input type="date" value={form.exchangeDate} onChange={e=>set("exchangeDate",e.target.value)} style={inp}/>
            </div>
          </div>

          {/* Staff notes */}
          <div style={{marginBottom:8}}>
            <label style={lbl}>Staff Notes</label>
            <textarea value={form.staffNotes} onChange={e=>set("staffNotes",e.target.value)}
              rows={3} placeholder="Internal notes — visible to staff only…"
              style={{...inp,resize:"vertical"}}/>
          </div>

          {/* Return address version */}
          <p style={{margin:"4px 0 0",fontSize:11,color:"#94a3b8"}}>Return address version sent: <strong>{ret.returnAddressVersion||"v1"}</strong> · Created: {fmtDate(ret.createdAt)}</p>
        </div>

        {/* Footer */}
        <div style={{padding:"12px 20px",borderTop:"1px solid #f1f5f9",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,flexShrink:0}}>
          <button onClick={onClose}
            style={{padding:"11px 0",borderRadius:10,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{padding:"11px 0",borderRadius:10,border:"none",background:saving?"#94a3b8":shop.accent,color:"white",fontWeight:800,fontSize:13,cursor:saving?"default":"pointer",fontFamily:"inherit",boxShadow:saving?"none":"0 4px 12px "+shop.accent+"44"}}>
            {saving?"Saving…":"💾 Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ReturnsPanel=({shopId,shop,returns,setReturns,user,messages,setMessages})=>{
  const [filter,setFilter]=React.useState("ALL");
  const [selectedReturn,setSelectedReturn]=React.useState(null);
  const [search,setSearch]=React.useState("");
  const [confirmDelete,setConfirmDelete]=React.useState(null); // {id, customer}

  // ── On-load scan: 7-day reminder + 14-day expiry ──
  React.useEffect(()=>{
    if(!returns||returns.length===0)return;
    const scanReturns=async()=>{
      const today=new Date();today.setHours(0,0,0,0);
      let anyExpired=false;

      for(const ret of returns){
        if(["REFUNDED","EXCHANGED","RETURN_EXPIRED"].includes(ret.status))continue;
        if(!ret.returnDeadline)continue;

        const deadline=new Date(ret.returnDeadline);deadline.setHours(0,0,0,0);
        const created=new Date(ret.createdAt);created.setHours(0,0,0,0);
        const daysFromCreated=Math.floor((today-created)/(1000*60*60*24));
        const daysToDeadline=Math.ceil((deadline-today)/(1000*60*60*24));
        const hasTracking=!!(ret.trackingNo);
        const isReceived=ret.status==="RETURN_RECEIVED";

        // ── 7-day reminder: no tracking uploaded after 7 days ──
        if(daysFromCreated>=7&&!hasTracking&&!isReceived){
          const exists=await dbMessageExists(shopId,ret.saleId,"RETURN_REMINDER");
          if(!exists){
            await dbAddMessage({
              shopId,
              saleId:ret.saleId,
              customer:ret.customer,
              phone:ret.phone,
              messageType:"RETURN_REMINDER",
              messageBody:`Dear ${ret.customer},

This is a reminder regarding your return request ${ret.id}.

We have not yet received your returned item or tracking information. Please ensure your return is dispatched as soon as possible.

If you have already sent the item, please contact us with your tracking number so we can update your case.

Your return deadline is ${new Date(ret.returnDeadline).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}.

Thank you for your cooperation.`,
            });
          }
        }

        // ── 14-day expiry: deadline passed, no tracking, not received ──
        if(daysToDeadline<0&&!hasTracking&&!isReceived){
          // Mark as expired in Supabase
          await dbSaveReturn({...ret,status:"RETURN_EXPIRED",expiredAt:today.toISOString().split("T")[0]});
          anyExpired=true;

          // Queue expiry message if not already sent
          const exists=await dbMessageExists(shopId,ret.saleId,"RETURN_EXPIRED");
          if(!exists){
            await dbAddMessage({
              shopId,
              saleId:ret.saleId,
              customer:ret.customer,
              phone:ret.phone,
              messageType:"RETURN_EXPIRED",
              messageBody:`Dear ${ret.customer},

Unfortunately, your return request ${ret.id} has now expired as we did not receive your returned item within the required timeframe.

If you believe this is an error or have any questions, please contact us directly and we will be happy to assist.

Please note that this does not affect your statutory rights under UK consumer legislation.

Thank you for shopping with ROS.`,
            });
          }
        }
      }

      // If any returns were expired, reload the returns list
      if(anyExpired){
        const updated=await dbLoadReturns(shopId);
        setReturns(updated||[]);
      }

      // Reload messages to surface any newly queued reminders/expiry notices
      const updatedMsgs=await dbLoadMessages(shopId);
      if(setMessages)setMessages(updatedMsgs||[]);
    };
    scanReturns().catch(console.error);
  },[returns.length]);

  const ACTIVE_STATUSES=["RETURN_APPROVED","RETURN_IN_TRANSIT","RETURN_RECEIVED"];
  const filtered=returns.filter(r=>{
    const matchStatus=filter==="ALL"?true:filter==="ACTIVE"?ACTIVE_STATUSES.includes(r.status):r.status===filter;
    const q=search.toLowerCase();
    const matchSearch=!q||r.id.toLowerCase().includes(q)||r.customer.toLowerCase().includes(q)||r.saleId.toLowerCase().includes(q)||r.phone.includes(q);
    return matchStatus&&matchSearch;
  });

  const counts={
    ALL:returns.length,
    ACTIVE:returns.filter(r=>ACTIVE_STATUSES.includes(r.status)).length,
    RETURN_RECEIVED:returns.filter(r=>r.status==="RETURN_RECEIVED").length,
    REFUNDED:returns.filter(r=>r.status==="REFUNDED").length,
    RETURN_EXPIRED:returns.filter(r=>r.status==="RETURN_EXPIRED").length,
  };

  const fmtDate=d=>{if(!d)return"—";try{return new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short"});}catch{return d;}};

  return(
    <div style={{padding:"0 0 40px"}}>
      {/* Header */}
      <div style={{padding:"18px 20px 0",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:14}}>
          <div>
            <h2 style={{margin:0,fontSize:18,fontWeight:800,color:"#0f172a"}}>↩️ Returns</h2>
            <p style={{margin:"2px 0 0",fontSize:12,color:"#64748b"}}>{returns.length} total · {counts.ACTIVE} active</p>
          </div>
          {/* Search */}
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search returns…"
            style={{padding:"8px 14px",borderRadius:10,border:"1px solid #e2e8f0",fontSize:13,fontFamily:"inherit",outline:"none",width:200}}/>
        </div>

        {/* Filter tabs */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[
            {key:"ALL",label:"All"},
            {key:"ACTIVE",label:"Active"},
            {key:"RETURN_RECEIVED",label:"Received"},
            {key:"REFUNDED",label:"Refunded"},
            {key:"RETURN_EXPIRED",label:"Expired"},
          ].map(f=>(
            <button key={f.key} onClick={()=>setFilter(f.key)}
              style={{padding:"5px 14px",borderRadius:999,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                border:"1px solid "+(filter===f.key?shop.accent:"#e2e8f0"),
                background:filter===f.key?shop.accent:"white",
                color:filter===f.key?"white":"#64748b"}}>
              {f.label}{counts[f.key]>0?` (${counts[f.key]})`:""}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{padding:"0 12px"}}>
        {filtered.length===0?(
          <div style={{textAlign:"center",padding:"60px 20px",color:"#94a3b8"}}>
            <div style={{fontSize:40,marginBottom:12}}>↩️</div>
            <p style={{margin:0,fontSize:14,fontWeight:600}}>No returns found</p>
            <p style={{margin:"6px 0 0",fontSize:12}}>Returns submitted via the customer portal will appear here.</p>
          </div>
        ):(
          <div>
            {/* Column headers */}
            <div style={{display:"grid",gridTemplateColumns:"130px 1fr 110px 100px 90px 80px",gap:8,padding:"8px 14px",borderRadius:10,background:"#f8fafc",border:"1px solid #e2e8f0",marginBottom:8}}>
              {["Return ID","Customer","Status","Deadline","Days Left",""].map(h=>(
                <span key={h} style={{fontSize:10,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</span>
              ))}
            </div>

            {filtered.map(ret=>{
              const days=daysRemaining(ret.returnDeadline);
              const statusStyle=RETURN_STATUS_STYLE[ret.status]||{bg:"#f8fafc",border:"#e2e8f0",text:"#374151",label:ret.status};
              const isClosed=["REFUNDED","EXCHANGED","RETURN_EXPIRED"].includes(ret.status);
              return(
                <div key={ret.id}
                  onClick={()=>setSelectedReturn(ret)}
                  style={{display:"grid",gridTemplateColumns:"130px 1fr 110px 100px 90px 80px",gap:8,padding:"11px 14px",
                    borderRadius:12,border:"1px solid #e2e8f0",marginBottom:8,background:"white",
                    cursor:"pointer",transition:"box-shadow 0.15s",
                    boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
                    opacity:isClosed?0.65:1}}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.10)"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)"}>
                  <div>
                    <p style={{margin:0,fontSize:12,fontWeight:800,color:shop.accent,fontFamily:"DM Mono,monospace"}}>{ret.id}</p>
                    <p style={{margin:"1px 0 0",fontSize:10,color:"#94a3b8"}}>{ret.resolution==="exchange"?"🔄":"💰"} {ret.resolution}</p>
                  </div>
                  <div>
                    <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0f172a"}}>{ret.customer}</p>
                    <p style={{margin:"1px 0 0",fontSize:11,color:"#64748b"}}>{ret.saleId}</p>
                  </div>
                  <div style={{display:"flex",alignItems:"center"}}>
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:999,
                      background:statusStyle.bg,border:"1px solid "+statusStyle.border,color:statusStyle.text,whiteSpace:"nowrap"}}>
                      {statusStyle.label}
                    </span>
                  </div>
                  <div style={{display:"flex",alignItems:"center"}}>
                    <span style={{fontSize:12,color:"#374151"}}>{fmtDate(ret.returnDeadline)}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center"}}>
                    {isClosed?<span style={{fontSize:11,color:"#94a3b8"}}>—</span>:<DaysChip days={days}/>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:8}}>
                    <span style={{fontSize:11,color:shop.accent,fontWeight:700}}>View →</span>
                    <button
                      onClick={e=>{e.stopPropagation();setConfirmDelete({id:ret.id,customer:ret.customer});}}
                      title="Delete return"
                      style={{width:26,height:26,borderRadius:7,border:"1px solid #fecaca",background:"#fff5f5",
                        color:"#dc2626",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",
                        justifyContent:"center",flexShrink:0}}>
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedReturn&&(
        <ReturnDetailModal
          ret={selectedReturn}
          shop={shop}
          user={user}
          onClose={()=>setSelectedReturn(null)}
          onUpdate={(updated)=>{
            setReturns(prev=>prev.map(r=>r.id===updated.id?updated:r));
            setSelectedReturn(null);
          }}
        />
      )}

      {/* Delete confirmation modal */}
      {confirmDelete&&(
        <div style={{position:"fixed",inset:0,zIndex:90,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(4px)"}}
            onClick={()=>setConfirmDelete(null)}/>
          <div style={{position:"relative",background:"white",borderRadius:16,
            boxShadow:"0 24px 64px rgba(0,0,0,0.20)",width:"100%",maxWidth:380,padding:28,textAlign:"center"}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:"#fef2f2",border:"2px solid #fca5a5",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 16px"}}>🗑️</div>
            <h3 style={{margin:"0 0 8px",fontSize:17,fontWeight:800,color:"#0f172a"}}>Delete Return</h3>
            <p style={{margin:"0 0 6px",fontSize:13,color:"#374151"}}>
              You are about to permanently delete return <strong>{confirmDelete.id}</strong> for <strong>{confirmDelete.customer}</strong>.
            </p>
            <p style={{margin:"0 0 24px",fontSize:12,color:"#ef4444",fontWeight:600}}>
              ⚠️ This cannot be undone.
            </p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <button onClick={()=>setConfirmDelete(null)}
                style={{padding:"11px 0",borderRadius:10,border:"1px solid #e2e8f0",background:"white",
                  color:"#374151",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                Cancel
              </button>
              <button onClick={async()=>{
                const id=confirmDelete.id;
                setConfirmDelete(null);
                await dbDeleteReturn(id);
                setReturns(prev=>prev.filter(r=>r.id!==id));
              }}
                style={{padding:"11px 0",borderRadius:10,border:"none",background:"#dc2626",
                  color:"white",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",
                  boxShadow:"0 4px 12px rgba(220,38,38,0.35)"}}>
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
/* ── End ReturnsPanel ────────────────────────────────────────────────────── */


/* ═══════════════════════════════════════════════════════════
   DocUploadSection — reusable document upload panel
   props: bucket, recordUuid, docs, onDocsChange, accent
   ═══════════════════════════════════════════════════════════ */
const DocUploadSection=({bucket,recordUuid,docs=[],onDocsChange,accent="#059669",onSave})=>{
  const [uploading,setUploading]=React.useState(false);
  const [dragOver,setDragOver]=React.useState(false);
  const fileRef=React.useRef(null);

  const getIcon=(name="")=>{
    const ext=(name.split(".").pop()||"").toLowerCase();
    if(["pdf"].includes(ext))return"📄";
    if(["jpg","jpeg","png","webp","heic","gif"].includes(ext))return"🖼️";
    if(["xls","xlsx","csv"].includes(ext))return"📊";
    if(["doc","docx"].includes(ext))return"📝";
    return"📎";
  };

  const handleFiles=async(files)=>{
    if(!files||files.length===0)return;
    if(!recordUuid){alert("Save the record first before uploading documents.");return;}
    setUploading(true);
    const newDocs=[...docs];
    for(const file of Array.from(files)){
      const result=await dbUploadDoc(bucket,recordUuid,file);
      if(result.error){alert("Upload failed: "+result.error);continue;}
      newDocs.push({name:file.name,url:result.url,path:result.path,size:file.size,uploadedAt:new Date().toISOString()});
    }
    onDocsChange(newDocs);
    if(onSave)await onSave(newDocs);
    setUploading(false);
  };

  const handleDelete=async(doc,idx)=>{
    if(!window.confirm("Remove "+doc.name+"?"))return;
    await dbDeleteDoc(bucket,doc.path);
    const newDocs=docs.filter((_,i)=>i!==idx);
    onDocsChange(newDocs);
    if(onSave)await onSave(newDocs);
  };

  const fmtSize=b=>{if(!b)return"";if(b<1024)return b+"B";if(b<1048576)return(b/1024).toFixed(1)+"KB";return(b/1048576).toFixed(1)+"MB";};

  return(
    <div style={{marginTop:16}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <span style={{fontSize:12,fontWeight:800,color:"#374151",textTransform:"uppercase",letterSpacing:"0.05em"}}>📎 Documents</span>
        <span style={{fontSize:11,color:"#94a3b8"}}>({docs.length} file{docs.length!==1?"s":""})</span>
      </div>

      {/* File list */}
      {docs.length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
          {docs.map((doc,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#f8fafc",borderRadius:9,border:"1px solid #e2e8f0"}}>
              <span style={{fontSize:18,flexShrink:0}}>{getIcon(doc.name)}</span>
              <div style={{flex:1,minWidth:0}}>
                <a href={doc.url} target="_blank" rel="noreferrer"
                  style={{fontSize:12,fontWeight:700,color:accent,textDecoration:"none",display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
                  title={doc.name}>{doc.name}</a>
                {doc.size&&<span style={{fontSize:10,color:"#94a3b8"}}>{fmtSize(doc.size)}</span>}
              </div>
              <a href={doc.url} download={doc.name} target="_blank" rel="noreferrer"
                style={{fontSize:11,padding:"3px 8px",borderRadius:6,border:"1px solid #e2e8f0",background:"white",color:"#374151",textDecoration:"none",flexShrink:0}}>
                ⬇
              </a>
              <button onClick={()=>handleDelete(doc,i)}
                style={{width:26,height:26,borderRadius:6,border:"1px solid #fecaca",background:"#fff5f5",color:"#dc2626",cursor:"pointer",fontSize:14,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e=>{e.preventDefault();setDragOver(true);}}
        onDragLeave={()=>setDragOver(false)}
        onDrop={e=>{e.preventDefault();setDragOver(false);handleFiles(e.dataTransfer.files);}}
        onClick={()=>fileRef.current&&fileRef.current.click()}
        style={{border:"2px dashed "+(dragOver?accent:"#cbd5e1"),borderRadius:10,padding:"16px",
          textAlign:"center",cursor:"pointer",background:dragOver?accent+"08":"#f8fafc",transition:"all 0.15s"}}>
        <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
        {uploading?(
          <p style={{margin:0,fontSize:13,color:accent,fontWeight:700}}>⏳ Uploading…</p>
        ):(
          <>
            <p style={{margin:"0 0 2px",fontSize:22}}>📁</p>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:"#374151"}}>Drop files here or click to browse</p>
            <p style={{margin:"2px 0 0",fontSize:11,color:"#94a3b8"}}>PDF, images, Word, Excel — max 20MB each</p>
          </>
        )}
      </div>
    </div>
  );
};
/* ── End DocUploadSection ────────────────────────────────────────────────── */

/* ── MarkDeliveredModal ─────────────────────────────────────────────────── */
const MarkDeliveredModal=({sale,shopId,shop,onConfirm,onClose})=>{
  const [date,setDate]=React.useState(new Date().toISOString().slice(0,10));
  const [saving,setSaving]=React.useState(false);
  return(
    <div style={{position:"fixed",inset:0,zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}} onClick={onClose}/>
      <div style={{position:"relative",background:"white",borderRadius:16,boxShadow:"0 24px 48px rgba(0,0,0,0.2)",width:"100%",maxWidth:380,padding:24}}>
        <h3 style={{margin:"0 0 4px",fontSize:16,fontWeight:800,color:"#0f172a"}}>✅ Confirm Delivery</h3>
        <p style={{margin:"0 0 16px",fontSize:12,color:"#64748b"}}>Order <strong>{sale.id}</strong> — {sale.customer}</p>
        {sale.trackingNo&&(
          <div style={{background:"#f0f9ff",borderRadius:8,padding:"8px 12px",marginBottom:14,border:"1px solid #bae6fd"}}>
            <span style={{fontSize:11,color:"#0369a1",fontWeight:600}}>📦 Tracking: </span>
            <a href={"https://www.royalmail.com/track-your-item#/tracking-results/"+sale.trackingNo} target="_blank" rel="noreferrer"
              style={{fontSize:11,color:"#0369a1",fontFamily:"DM Mono,monospace"}}>{sale.trackingNo}</a>
          </div>
        )}
        <div style={{marginBottom:16}}>
          <label style={{display:"block",fontSize:11,fontWeight:700,color:"#374151",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"}}>Delivery Date</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)}
            style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid #7dd3fc",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <button onClick={onClose}
            style={{padding:"11px 0",borderRadius:10,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            Cancel
          </button>
          <button disabled={saving} onClick={async()=>{
            setSaving(true);
            await onConfirm(date);
            setSaving(false);
          }}
            style={{padding:"11px 0",borderRadius:10,border:"none",background:saving?"#94a3b8":"#16a34a",color:"white",fontWeight:800,fontSize:13,cursor:saving?"default":"pointer",fontFamily:"inherit",boxShadow:saving?"none":"0 4px 12px #16a34a44"}}>
            {saving?"Saving…":"✅ Save"}
          </button>
        </div>
      </div>
    </div>
  );
};
/* ── End MarkDeliveredModal ─────────────────────────────────────────────── */


/* ═══════════════════════════════════════════════════════════
   SUPPLIERS TAB PANEL
   ═══════════════════════════════════════════════════════════ */
const SuppliersTabPanel=({shop,shopId,suppliers=[],setSuppData})=>{
  const [showAdd,setShowAdd]=React.useState(false);
  const [editSupp,setEditSupp]=React.useState(null);
  const [search,setSearch]=React.useState("");
  const [saving,setSaving]=React.useState(false);

  const filtered=suppliers.filter(s=>{
    const q=search.toLowerCase();
    return !q||(s.name||"").toLowerCase().includes(q)||(s.place||"").toLowerCase().includes(q)||(s.phone||"").includes(q);
  });

  const handleSave=async(form)=>{
    setSaving(true);
    // Only pass id if editing existing supplier
    const payload={
      ...(form.id?{id:form.id}:{}),
      name: form.name,
      contact: form.contact||form.contactPerson||"",
      phone: form.phone||form.whatsapp||"",
      email: form.email||"",
      category: form.category||form.tag||"General",
      terms: form.terms||"",
      place: form.place||"",
      address: form.address||"",
      remarks: form.remarks||"",
    };
    const result=await dbSaveSupplier(shopId, payload);
    if(result&&result.error){
      alert("Failed to save supplier: "+result.error);
      setSaving(false);
      return;
    }
    const fresh=await dbLoadSuppliers(shopId).catch(()=>null);
    if(fresh) setSuppData(fresh);
    setSaving(false);
    setShowAdd(false);
    setEditSupp(null);
  };

  const handleDelete=async(id)=>{
    if(!window.confirm("Delete this supplier? This cannot be undone."))return;
    await dbDeleteSupplier(id,shopId).catch(e=>console.error("Delete supplier error:",e));
    setSuppData(prev=>prev.filter(s=>s.id!==id));
  };

  const inp={width:"100%",padding:"9px 12px",borderRadius:9,border:"1.5px solid #e2e8f0",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",background:"white"};
  const lbl={display:"block",fontSize:11,fontWeight:700,color:"#374151",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"};

  const SupplierForm=({initial={},onSave,onClose})=>{
    const [f,setF]=React.useState({name:"",place:"",address:"",contact:"",phone:"",email:"",category:"General",terms:"",remarks:"",...initial});
    const s=(k,v)=>setF(p=>({...p,[k]:v}));
    return(
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div><label style={lbl}>Supplier Name *</label><input value={f.name} onChange={e=>s("name",e.target.value)} placeholder="Company / Supplier name" style={inp}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><label style={lbl}>Place / City</label><input value={f.place} onChange={e=>s("place",e.target.value)} placeholder="London, Mumbai…" style={inp}/></div>
          <div><label style={lbl}>Contact Person</label><input value={f.contact} onChange={e=>s("contact",e.target.value)} placeholder="Full name" style={inp}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><label style={lbl}>Phone / WhatsApp</label><input value={f.phone} onChange={e=>s("phone",e.target.value)} placeholder="+44 7700 000000" style={inp}/></div>
          <div><label style={lbl}>Email</label><input value={f.email} onChange={e=>s("email",e.target.value)} placeholder="email@example.com" style={inp}/></div>
        </div>
        <div><label style={lbl}>Address</label><textarea value={f.address} onChange={e=>s("address",e.target.value)} rows={2} placeholder="Full address" style={{...inp,resize:"vertical"}}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><label style={lbl}>Category</label>
            <select value={f.category} onChange={e=>s("category",e.target.value)} style={inp}>
              {["General","Active","Preferred","Occasional","Inactive"].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Payment Terms</label><input value={f.terms} onChange={e=>s("terms",e.target.value)} placeholder="e.g. Net 30" style={inp}/></div>
        </div>
        <div><label style={lbl}>Remarks</label><textarea value={f.remarks} onChange={e=>s("remarks",e.target.value)} rows={2} placeholder="Notes…" style={{...inp,resize:"vertical"}}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,paddingTop:4}}>
          <button disabled={saving} onClick={()=>{if(!f.name.trim()){alert("Supplier name is required.");return;}onSave({...initial,...f});}}
            style={{padding:"11px 0",borderRadius:10,border:"none",background:saving?"#94a3b8":shop.accent,color:"white",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            {saving?"Saving…":"✅ Save Supplier"}
          </button>
          <button onClick={onClose} style={{padding:"11px 0",borderRadius:10,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
        </div>
      </div>
    );
  };

  return(
    <div>
      {/* Header */}
      <div style={{padding:"18px 20px 14px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:800,color:"#0f172a"}}>🏭 Suppliers</h2>
          <p style={{margin:"2px 0 0",fontSize:12,color:"#64748b"}}>{suppliers.length} supplier{suppliers.length!==1?"s":""}</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search suppliers…"
            style={{padding:"7px 14px",borderRadius:9,border:"1px solid #e2e8f0",fontSize:12,fontFamily:"inherit",outline:"none",width:200}}/>
          <button onClick={()=>setShowAdd(true)}
            style={{padding:"8px 18px",borderRadius:10,border:"none",background:shop.accent,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px "+shop.accent+"44",whiteSpace:"nowrap"}}>
            + Add Supplier
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr>
              {["Supplier","Place","Contact","Phone","Category","Remarks","Actions"].map(h=>(
                <th key={h} style={{padding:"10px 16px",fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",background:"#f8fafc",borderBottom:"1px solid #e2e8f0",textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0?(
              <tr><td colSpan={7} style={{padding:"60px 20px",textAlign:"center",color:"#94a3b8"}}>
                <div style={{fontSize:36,marginBottom:10}}>🏭</div>
                <p style={{margin:0,fontSize:14,fontWeight:600}}>{search?"No suppliers match your search":"No suppliers yet"}</p>
                <p style={{margin:"6px 0 0",fontSize:12}}>Click "+ Add Supplier" to add your first one</p>
              </td></tr>
            ):filtered.map((s,i)=>(
              <tr key={s.id} style={{background:i%2===0?"white":"#fafafa",borderBottom:"1px solid #f1f5f9"}}>
                <td style={{padding:"12px 16px",fontWeight:700,color:"#0f172a"}}>{s.name}</td>
                <td style={{padding:"12px 16px",color:"#64748b"}}>{s.place||"—"}</td>
                <td style={{padding:"12px 16px",color:"#374151"}}>{s.contact||"—"}</td>
                <td style={{padding:"12px 16px",color:"#64748b",fontFamily:"DM Mono,monospace",fontSize:12}}>{s.phone||"—"}</td>
                <td style={{padding:"12px 16px"}}>
                  <span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:999,background:shop.accentBg,color:shop.accentText,border:"1px solid "+shop.accent+"33"}}>{s.category||"General"}</span>
                </td>
                <td style={{padding:"12px 16px",color:"#94a3b8",fontSize:12,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.remarks||"—"}</td>
                <td style={{padding:"12px 16px"}}>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>setEditSupp(s)}
                      style={{padding:"5px 12px",borderRadius:7,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontSize:12,fontWeight:600,cursor:"pointer"}}>✏️ Edit</button>
                    <button onClick={()=>handleDelete(s.id)}
                      style={{padding:"5px 10px",borderRadius:7,border:"1px solid #fecaca",background:"#fff5f5",color:"#dc2626",fontSize:12,cursor:"pointer"}}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {(showAdd||editSupp)&&(
        <div style={{position:"fixed",inset:0,zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}} onClick={()=>{setShowAdd(false);setEditSupp(null);}}/>
          <div style={{position:"relative",background:"white",borderRadius:18,boxShadow:"0 24px 64px rgba(0,0,0,0.2)",width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto",zIndex:81}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center",background:shop.accent+"10",borderRadius:"18px 18px 0 0"}}>
              <h3 style={{margin:0,fontSize:15,fontWeight:800,color:"#0f172a"}}>{editSupp?"✏️ Edit Supplier":"➕ New Supplier"}</h3>
              <button onClick={()=>{setShowAdd(false);setEditSupp(null);}} style={{width:28,height:28,borderRadius:"50%",border:"none",background:"#f1f5f9",cursor:"pointer",fontSize:16,color:"#64748b"}}>×</button>
            </div>
            <div style={{padding:20}}>
              <SupplierForm initial={editSupp||{}} onSave={handleSave} onClose={()=>{setShowAdd(false);setEditSupp(null);}}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
/* ── End SuppliersTabPanel ───────────────────────────────────────────────── */

const ShopDashboard=({shopId,onBack,user,onLogout,salesData,setSalesData,customers,setCustomers,shopItems={},saveShopItems,initialTab="sales"})=>{
  const [tab,setTab]=useState(user?.role==="staff"?"sales":(initialTab||"sales"));
  const [hov,setHov]=useState(null);
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(null);
  const [selRow,setSelRow]=useState(null);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [editRow,setEditRow]=useState(null);
  const [selCustomer,setSelCustomer]=useState(null);
  const [openMenu,setOpenMenu]=useState(null);
  const [cfFY,setCfFY]=useState(()=>{const n=new Date();return n.getMonth()>=3?n.getFullYear():n.getFullYear()-1;});
  const [cfOpenBal,setCfOpenBal]=useState(()=>{try{const s=localStorage.getItem("ros_cf_openbal");return s?JSON.parse(s):{};}catch{return{};}});
  const [obEdit,setObEdit]=useState(false);
  const [obInput,setObInput]=useState("");
  const [invoiceRow,setInvoiceRow]=useState(null);
  const [itemView,setItemView]=useState("month");
  const [selectedBar,setSelectedBar]=useState(null);
  const [monthTarget,setMonthTarget]=useState(0);
  const [editingTarget,setEditingTarget]=useState(false);
  const [targetInput,setTargetInput]=useState("");
  const [printMode,setPrintMode]=useState(false);
  // salesData, setSalesData, customers, setCustomers all received as props from App
  const [coll,setColl]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [isMobile,setIsMobile]=useState(()=>window.innerWidth<768);
  const [pdfMode,setPdfMode]=useState(false);
  const [salesPeriod,setSalesPeriodRaw]=useState("month");
  const [pdfInv,setPdfInv]=useState(null);
  const [statusFilter,setStatusFilter]=useState("ALL");
  const invoicePrintRef=useRef(null);
  const [purchData,setPurchData]=useState([]);
  const [suppData,setSuppData]=useState([]);
  const [expData,setExpData]=useState([]);
  const [logData,setLogData]=useState([]);
  const [markDeliveredSale,setMarkDeliveredSale]=useState(null);
  const [editPurchRow,setEditPurchRow]=useState(null);
  const [viewPurchRow,setViewPurchRow]=useState(null);
  const [editLogRow,setEditLogRow]=useState(null);
  const [viewLogRow,setViewLogRow]=useState(null);
  const [messages,setMessages]=useState([]);
  const [messagesLoaded,setMessagesLoaded]=useState(false);
  const [returns,setReturns]=useState([]);
  const [returnsLoaded,setReturnsLoaded]=useState(false);

  // Load messages + returns on tab open; also load returns on dashboard for Actions Today
  React.useEffect(()=>{
    if((tab==="messages"||tab==="dashboard")&&!messagesLoaded){
      dbLoadMessages(shopId).then(data=>{setMessages(data||[]);setMessagesLoaded(true);}).catch(()=>{});
    }
    if((tab==="returns"||tab==="dashboard")&&!returnsLoaded){
      dbLoadReturns(shopId).then(data=>{setReturns(data||[]);setReturnsLoaded(true);}).catch(()=>{});
    }
  },[tab]);

  // Load purchases, expenses, logistics from Supabase on mount
  useEffect(()=>{
    dbLoadPurchases(shopId).then(d=>{if(d)setPurchData(d);}).catch(()=>{});
    dbLoadSuppliers(shopId).then(d=>{if(d)setSuppData(d);}).catch(()=>{});
    dbLoadExpenses(shopId).then(d=>{if(d)setExpData(d);}).catch(()=>{});
    dbLoadLogistics(shopId).then(d=>{if(d)setLogData(d);}).catch(()=>{});
  },[shopId]);

  // Re-fetch this shop's sales on mount — ensures data is fresh after page refresh
  useEffect(()=>{
    dbLoadSales(shopId).then(data=>{
      if(!data) return;
      setSalesData(prev=>({...prev,[shopId]:data.map(normaliseSale)}));
    }).catch(()=>{});
  },[shopId]);

  // Manual reload handler — wired to the 🔄 button in SalesPanel
  const handleReloadSales = useCallback(async ()=>{
    const data = await dbLoadSales(shopId).catch(()=>null);
    if(!data) return;
    setSalesData(prev=>({...prev,[shopId]:data.map(normaliseSale)}));
  },[shopId,setSalesData]);

  useEffect(()=>{
    const h=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
  },[]);

  useEffect(()=>{
    const h=(e)=>{
      if(e.key!=="n"&&e.key!=="N") return;
      const tag=document.activeElement?.tagName?.toLowerCase();
      if(tag==="input"||tag==="textarea"||tag==="select") return;
      if(modal) return;
      if(tab==="sales"){e.preventDefault();setModal("new-sale");}
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[tab,modal]);

  // Data loaded at App level and persisted in localStorage

  // ── Invoice computed vars ──
  // Use taxRate 0 as override — never apply tax if rate is 0
  const _invTaxR    = invoiceRow ? ((invoiceRow.taxRate!==undefined&&invoiceRow.taxRate!==null?invoiceRow.taxRate:0)/100) : 0;
  const _invInc     = _invTaxR===0 ? true : (invoiceRow ? invoiceRow.taxInclusive!==false : true);
  const _invEntered = invoiceRow ? Number(invoiceRow.amount)||0 : 0;
  const _invAdjAmt  = invoiceRow ? Number(invoiceRow.adjAmt)||0 : 0;
  const invSubtotal = _invInc ? parseFloat((_invEntered/(1+_invTaxR)).toFixed(2)) : _invEntered;
  const invTaxAmt   = parseFloat((invSubtotal*_invTaxR).toFixed(2));
  const invGrand    = parseFloat((invSubtotal+invTaxAmt-_invAdjAmt).toFixed(2));

  const shop=SHOPS.find(s=>s.id===shopId);
  const sales=salesData[shopId]||[];
  const purch=purchData||[];
  const exps=expData||[];
  const logs=logData||[];
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
    {id:"invoices", l:"Sales Invoices", ic:"🧾"},
    {id:"expenses", l:"Expenses", ic:"💳"},
    {id:"cashflow", l:"Cash Flow",ic:"🏦"},
    {id:"documents",l:"Documents",ic:"📎"},
    {id:"analytics",l:"Analytics",ic:"📊"},
    {id:"reports",  l:"Reports",  ic:"📋"},
    {id:"messages", l:"Messages", ic:"💬"},
    {id:"returns",  l:"Returns",  ic:"↩️"},
  ].filter(n=>(ROLE_NAV[user?.role||"admin"]||ROLE_NAV.admin).includes(n.id)).filter(n=>n.id!=="settings");

  const filtSales=sales.filter(s=>{
    const q=search.toLowerCase();
    const matchSearch=!q||
      (s.id||"").toLowerCase().includes(q)||
      (s.customer||"").toLowerCase().includes(q)||
      (s.paidBy||"").toLowerCase().includes(q)||
      (s.address||"").toLowerCase().includes(q)||
      (s.tag||"").toLowerCase().includes(q)||
      (s.rem||"").toLowerCase().includes(q)||
      (s.item||"").toLowerCase().includes(q);
    const matchStatus=statusFilter==="ALL"||(s.ful||s.status||"")===statusFilter;
    return matchSearch&&matchStatus;
  });

const addSale = async (form) => {
  const pfx = {["ros-selections"]:"SI",["ros-hairlines"]:"SH",["ros-india"]:"IN"}[shopId];
  const nid = form.invoiceNo || `${pfx}-${Date.now().toString().slice(-6)}`;

  // Encode saleLines into the item field so it survives Supabase round-trip
  // without needing a new column. Format: "__LINES__:{json}\n{displayText}"
  const saleLines = Array.isArray(form.saleLines)&&form.saleLines.length>0 ? form.saleLines : null;
  const displayItem = form.itemCustom || form.item || "";
  const encodedItem = saleLines
    ? `__LINES__:${JSON.stringify(saleLines)}\n${displayItem}`
    : displayItem;

    const newSale = {
    id: nid, ...form,
    amount:       Number(form.amount) || 0,
    taxRate:      form.taxRate !== undefined && form.taxRate !== null ? form.taxRate : 0,
    taxInclusive: form.taxRate===0 ? true : form.taxInclusive !== false,
    contact:  form.contact || "",
    phone:    form.contact || "",
    address:  form.address || "",
    qty:      form.qty || "1",
    item:     encodedItem,
    ful:      form.status || "PENDING",
    pay:      form.payBy || "SHOP",
    rem:      form.remarks || "",
    // Keep saleLines in memory object for immediate display
    saleLines: saleLines,
  };
  // Update UI instantly
  setSalesData(d => ({...d, [shopId]: [newSale, ...d[shopId]]}));
  setModal(null);
  const _usedNum = parseInt((nid||"0").match(/^(?:ROS|IND)(\d{4})\d$/)?.[1]||"0")||0;
  if(_usedNum >= 1313) { try { localStorage.setItem("ros_lastInv_"+shopId, String(_usedNum)); } catch{} }
  dbSaveSale(shopId, newSale).catch(err => console.error("❌ Supabase save failed:", err));
  // Auto-save/update customer record
  if(form.customer){
    const existing=customers.find(c=>c.name===form.customer);
    const custId=existing?.id||("CUST-"+Date.now().toString().slice(-6));
    const updatedCust={
      id: custId,
      name: form.customer,
      phone: form.contact||existing?.phone||"",
      whatsapp: form.contact||existing?.whatsapp||"",
      address: form.address||existing?.address||"",
      tag: existing?.tag||"New Customer",
      notes: existing?.notes||"",
      purchases: (existing?.purchases||0)+1,
      spend: (existing?.spend||0)+(Number(form.amount)||0),
      last: new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}),
    };
    setCustomers(prev=>{
      const idx=prev.findIndex(c=>c.name===form.customer);
      if(idx>=0){const n=[...prev];n[idx]=updatedCust;return n;}
      return [...prev,updatedCust];
    });
    dbSaveCustomer(shopId, updatedCust).then(()=>console.log("Customer saved ✅")).catch(err=>console.error("❌ Customer save failed:",err));
  }
};
  const TD=({ch,mono,fw,c})=><td style={{padding:"13px 16px",fontSize:13,color:c||"#374151",fontFamily:mono?"DM Mono,monospace":"inherit",fontWeight:fw||400}}>{ch}</td>;

  const setSalesPeriod=(p)=>{
    if(user?.role==="staff"&&(p==="year"||p==="lifetime"))return;
    setSalesPeriodRaw(p);
  };
  const showPdf=(inv)=>{setPdfInv(inv);setPdfMode(true);};
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
        /* ── Remove number input spinners globally ── */
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}
        input[type=number]{-moz-appearance:textfield;appearance:textfield;}
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
          .mob-show{display:inline!important;}
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
            {label:"MAIN",      ids:["dashboard","sales","customers","messages","returns","invoices"]},
            {label:"PURCHASES", ids:["purchases","suppliers","logistics","agents"]},
            {label:"EXPENSES",  ids:["expenses"]},
            {label:"FINANCE",   ids:["cashflow"]},
            {label:"INSIGHTS",  ids:["documents","analytics","reports"]},
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

                      {/* badge for messages ready count */}
                      {n.id==="messages"&&messages.filter(m=>m.status==="READY").length>0&&!coll&&(
                        <span style={{marginLeft:"auto",minWidth:18,height:18,borderRadius:999,background:"#ef4444",color:"white",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px",flexShrink:0}}>
                          {messages.filter(m=>m.status==="READY").length}
                        </span>
                      )}

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
            {/* All Shops button — hidden for staff only, icon-only on mobile */}
            {user?.role!=="staff"&&(
              <button onClick={onBack}
                style={{display:"flex",alignItems:"center",gap:7,
                  padding:"7px 14px",borderRadius:10,
                  border:"1px solid "+shop.accent+"44",
                  background:shop.accentBg,
                  color:shop.accentText,fontSize:12,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",
                  transition:"all 0.15s",whiteSpace:"nowrap",
                }}
                title="Back to All Shops"
                onMouseEnter={e=>{e.currentTarget.style.background=shop.accent;e.currentTarget.style.color="white";e.currentTarget.style.borderColor=shop.accent;}}
                onMouseLeave={e=>{e.currentTarget.style.background=shop.accentBg;e.currentTarget.style.color=shop.accentText;e.currentTarget.style.borderColor=shop.accent+"44";}}>
                🏪<span className="mob-hide"> All Shops</span>
              </button>
            )}
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
            const st=calcShopStats(sales);
            const todaySales=st.todaySales, monthSales=st.monthRev, monthCount=st.monthOrders;
            const fySales=st.fySales, fyCount=st.fyOrders;
            const pendingOrders=st.pendingOrders;
            const monthReturns=st.monthReturns;
            const monthRefunds=st.monthRefunds;
            const fyStart=now.getMonth()<3?new Date(now.getFullYear()-1,3,1):new Date(now.getFullYear(),3,1);
            const kpis=[
              {
                icon:"🛒", label:"Today's Sales", sub:"Live · "+todayStr,
                value:fmt(shopId,todaySales,true),
                accent:"#3b82f6", dark:"#1d4ed8",
                grad:"linear-gradient(145deg,#1e3a8a 0%,#1d4ed8 45%,#3b82f6 100%)",
                glow:"rgba(59,130,246,0.45)",
                trend:"up", trendVal:todaySales>0?"+active":"—",
                tagGreen:todaySales>0, tag:todaySales>0?"● Live":"○ No Sales",
                progress:Math.min(100,Math.round((todaySales/(shop.todaySales||1))*100)),
              },
              {
                icon:"📅", label:"Monthly Sales", sub:now.toLocaleString("default",{month:"long",year:"numeric"}),
                value:fmt(shopId,monthSales,true),
                accent:"#06b6d4", dark:"#0e7490",
                grad:"linear-gradient(145deg,#164e63 0%,#0e7490 45%,#06b6d4 100%)",
                glow:"rgba(6,182,212,0.45)",
                trend:"up", trendVal:monthCount+" orders",
                tagGreen:true, tag:monthCount+" Orders",
                progress:Math.min(100,Math.round((monthSales/(shop.monthRevenue||1))*100)),
              },
              {
                icon:"📈", label:"Financial Year", sub:"1 Apr "+fyStart.getFullYear()+" – 31 Mar "+(fyStart.getFullYear()+1),
                value:fmt(shopId,fySales,true),
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
                value:monthRefunds>0?fmt(shopId,monthRefunds,true):"—",
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

            // ── Actions Today calculations ──
            const today2=new Date();today2.setHours(0,0,0,0);
            const messagesReady=messages.filter(m=>m.status==="READY").length;
            const activeReturns=returns.filter(r=>["RETURN_APPROVED","RETURN_IN_TRANSIT"].includes(r.status));
            const returnsNeedReview=activeReturns.length;
            const returnsExpiringSoon=activeReturns.filter(r=>{
              if(!r.returnDeadline)return false;
              const dl=new Date(r.returnDeadline);dl.setHours(0,0,0,0);
              const diff=Math.ceil((dl-today2)/(1000*60*60*24));
              return diff>=0&&diff<=2;
            }).length;
            const refundsPending=returns.filter(r=>r.status==="RETURN_RECEIVED"&&r.resolution==="refund"&&!r.refundDate).length;
            const awaitingDelivery=sales.filter(s=>(s.ful||s.status)==="FULFILLED"&&!s.deliveryDate).length;
            const actionsToday=[
              messagesReady>0&&{icon:"📨",label:"Messages Ready",count:messagesReady,color:"#1d4ed8",bg:"#eff6ff",border:"#93c5fd",tab:"messages"},
              returnsNeedReview>0&&{icon:"↩️",label:"Returns Need Review",count:returnsNeedReview,color:"#c2410c",bg:"#fff7ed",border:"#fdba74",tab:"returns"},
              returnsExpiringSoon>0&&{icon:"⚠️",label:"Returns Expiring Soon",count:returnsExpiringSoon,color:"#b45309",bg:"#fffbeb",border:"#fcd34d",tab:"returns"},
              refundsPending>0&&{icon:"💰",label:"Refunds Pending",count:refundsPending,color:"#6d28d9",bg:"#f5f3ff",border:"#c4b5fd",tab:"returns"},
              awaitingDelivery>0&&{icon:"📦",label:"Awaiting Delivery",count:awaitingDelivery,color:"#0369a1",bg:"#f0f9ff",border:"#7dd3fc",tab:"sales"},
            ].filter(Boolean);

            return(
              <div>
                {/* ── ACTIONS TODAY CARD ── */}
                <div style={{marginBottom:24,borderRadius:18,border:"1px solid #e2e8f0",overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                  <div style={{padding:"14px 18px 12px",background:"linear-gradient(135deg,#0f172a,#1e293b)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:32,height:32,borderRadius:10,background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>⚡</div>
                      <div>
                        <p style={{margin:0,fontSize:13,fontWeight:800,color:"white",letterSpacing:"-0.2px"}}>Actions Today</p>
                        <p style={{margin:0,fontSize:11,color:"rgba(255,255,255,0.5)"}}>Items that need your attention right now</p>
                      </div>
                    </div>
                    {actionsToday.length>0&&(
                      <div style={{background:"#ef4444",color:"white",borderRadius:999,minWidth:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,padding:"0 8px"}}>
                        {actionsToday.length}
                      </div>
                    )}
                  </div>
                  <div style={{background:"white",padding:actionsToday.length===0?"18px":"10px 14px"}}>
                    {actionsToday.length===0?(
                      <div style={{display:"flex",alignItems:"center",gap:12,justifyContent:"center",padding:"8px 0"}}>
                        <span style={{fontSize:24}}>✅</span>
                        <div>
                          <p style={{margin:0,fontSize:13,fontWeight:700,color:"#166534"}}>All clear — nothing needs attention today</p>
                          <p style={{margin:"1px 0 0",fontSize:11,color:"#94a3b8"}}>Check back after new orders or deliveries</p>
                        </div>
                      </div>
                    ):(
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        {actionsToday.map((a,i)=>(
                          <div key={i}
                            onClick={()=>setTab(a.tab)}
                            style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                              padding:"10px 14px",borderRadius:12,cursor:"pointer",
                              background:a.bg,border:"1px solid "+a.border,
                              transition:"transform 0.15s"}}
                            onMouseEnter={e=>e.currentTarget.style.transform="translateX(3px)"}
                            onMouseLeave={e=>e.currentTarget.style.transform="translateX(0)"}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <span style={{fontSize:18}}>{a.icon}</span>
                              <span style={{fontSize:13,fontWeight:700,color:a.color}}>{a.label}</span>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <span style={{fontSize:16,fontWeight:900,color:a.color,fontFamily:"DM Mono,monospace"}}>{a.count}</span>
                              <span style={{fontSize:11,fontWeight:700,color:a.color,opacity:0.7}}>View →</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── QUICK ACTION CARDS ── */}
                <div className="mob-quick-grid" style={{display:"grid",gridTemplateColumns:isMobile?"repeat(3,1fr)":"repeat(6,1fr)",gap:isMobile?8:12,marginBottom:24}}>
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

                {/* ── GRAPHICAL KPI SECTION ── */}
                {(()=>{
                  // Mini sparkline data — last 7 days of sales
                  const last7=Array.from({length:7},(_,i)=>{
                    const d=new Date(); d.setDate(d.getDate()-6+i);
                    const ds=d.toISOString().slice(0,10);
                    return sales.filter(s=>s.date===ds&&(s.ful||s.status)!=="REFUNDED").reduce((a,s)=>a+(Number(s.amount)||0),0);
                  });
                  const spark7Max=Math.max(...last7,1);
                  const SparkLine=({data,color,h=32,w=80})=>{
                    const pts=data.map((v,i)=>`${Math.round(i*(w/(data.length-1))||0)},${Math.round(h-(v/Math.max(...data,1))*h*0.85)}`).join(" ");
                    return(<svg width={w} height={h} style={{display:"block"}}>
                      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.8}/>
                      {data.map((v,i)=>i===data.length-1&&<circle key={i} cx={Math.round(i*(w/(data.length-1))||0)} cy={Math.round(h-(v/Math.max(...data,1))*h*0.85)} r={2.5} fill={color}/>)}
                    </svg>);
                  };
                  // Ring gauge component
                  const Ring=({pct,color,size=52,stroke=5})=>{
                    const r=size/2-stroke;const c=2*Math.PI*r;
                    return(<svg width={size} height={size}>
                      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke}/>
                      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                        strokeDasharray={c} strokeDashoffset={c*(1-Math.min(pct,1))}
                        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}/>
                    </svg>);
                  };
                  const storedTarget=()=>{try{const v=localStorage.getItem("ros_monthTarget_"+shopId);return v?Number(v):shop.monthRevenue||0;}catch{return shop.monthRevenue||0;}};
                  if(monthTarget===0&&storedTarget()>0&&!editingTarget){setMonthTarget(storedTarget());}
                  const saveTarget=()=>{const v=parseFloat(targetInput)||0;setMonthTarget(v);try{localStorage.setItem("ros_monthTarget_"+shopId,String(v));}catch{}setEditingTarget(false);};
                  const fyTarget=(monthTarget||1)*12;
                  const monthPct=Math.min(monthSales/(monthTarget||1),1);
                  const fyPct=Math.min(fySales/(fyTarget||1),1);

                  return(<div style={{marginBottom:24}}>

                    {/* ── ROW 1: Two wide feature cards ── */}
                    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>

                      {/* Today + Weekly sparkline */}
                      <div style={{borderRadius:16,background:"linear-gradient(135deg,#0f172a 0%,#1e3a8a 60%,#3b82f6 100%)",padding:"18px 20px",position:"relative",overflow:"hidden",boxShadow:"0 8px 24px rgba(59,130,246,0.3)"}}>
                        <div style={{position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,0.05)",filter:"blur(20px)"}}/>
                        <div style={{position:"absolute",bottom:-20,left:40,width:80,height:80,borderRadius:"50%",background:"rgba(59,130,246,0.15)",filter:"blur(16px)"}}/>
                        <div style={{position:"relative",zIndex:1}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                            <div>
                              <p style={{margin:"0 0 2px",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.07em"}}>Today's Revenue</p>
                              <p style={{margin:0,fontSize:28,fontWeight:900,color:"white",letterSpacing:"-1px",fontFamily:"DM Mono,monospace"}}>{fmt(shopId,todaySales,true)}</p>
                            </div>
                            <span style={{fontSize:9,fontWeight:800,padding:"4px 10px",borderRadius:999,background:todaySales>0?"rgba(134,239,172,0.2)":"rgba(255,255,255,0.1)",color:todaySales>0?"#86efac":"rgba(255,255,255,0.5)",border:"1px solid "+(todaySales>0?"rgba(134,239,172,0.4)":"rgba(255,255,255,0.15)"),letterSpacing:"0.06em"}}>{todaySales>0?"● LIVE":"○ NO SALES"}</span>
                          </div>
                          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
                            <div>
                              <p style={{margin:"0 0 2px",fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.4)"}}>Last 7 days</p>
                              <SparkLine data={last7} color="#60a5fa" h={36} w={110}/>
                            </div>
                            <div style={{textAlign:"right"}}>
                              <p style={{margin:"0 0 2px",fontSize:9,color:"rgba(255,255,255,0.4)",fontWeight:600}}>This Month</p>
                              <p style={{margin:0,fontSize:16,fontWeight:800,color:"#60a5fa",fontFamily:"DM Mono,monospace"}}>{fmt(shopId,monthSales,true)}</p>
                              <p style={{margin:0,fontSize:9,color:"rgba(255,255,255,0.4)"}}>{monthCount} orders</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Monthly Target — wide card with editable target */}
                      <div style={{borderRadius:16,background:"linear-gradient(135deg,#164e63 0%,#0e7490 55%,#06b6d4 100%)",padding:"18px 20px",position:"relative",overflow:"hidden",boxShadow:"0 8px 24px rgba(6,182,212,0.3)"}}>
                        <div style={{position:"absolute",top:-20,right:-20,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,0.05)",filter:"blur(18px)"}}/>
                        <div style={{position:"relative",zIndex:1}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                            <div>
                              <p style={{margin:"0 0 2px",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.07em"}}>Monthly Target</p>
                              <p style={{margin:"0 0 4px",fontSize:9,color:"rgba(255,255,255,0.4)"}}>
                                {now.toLocaleString("default",{month:"long",year:"numeric"})}
                              </p>
                              <p style={{margin:0,fontSize:26,fontWeight:900,color:"white",letterSpacing:"-0.8px",fontFamily:"DM Mono,monospace"}}>{fmt(shopId,monthSales,true)}</p>
                            </div>
                            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,flexShrink:0}}>
                              <div style={{position:"relative",width:64,height:64,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                <Ring pct={monthPct} color="#67e8f9" size={64} stroke={6}/>
                                <div style={{position:"absolute",textAlign:"center"}}>
                                  <p style={{margin:0,fontSize:11,fontWeight:900,color:"white"}}>{Math.round(monthPct*100)}%</p>
                                </div>
                              </div>
                              {monthTarget>0&&(
                                <p style={{margin:0,fontSize:8,color:"rgba(255,255,255,0.45)",fontFamily:"DM Mono,monospace",textAlign:"center",lineHeight:1.3}}>
                                  {monthSales>=monthTarget
                                    ? "🎯 Target achieved!"
                                    : fmt(shopId,monthTarget-monthSales,true)+" remaining"}
                                </p>
                              )}
                            </div>
                          </div>
                          <div style={{height:4,background:"rgba(0,0,0,0.2)",borderRadius:999,overflow:"hidden",marginTop:4}}>
                            <div style={{height:"100%",width:Math.round(monthPct*100)+"%",background:"linear-gradient(90deg,#67e8f9,#a5f3fc)",borderRadius:999}}/>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
                            <p style={{margin:0,fontSize:9,color:"rgba(255,255,255,0.45)"}}>{monthCount} orders</p>
                            {editingTarget?(
                              <div style={{display:"flex",alignItems:"center",gap:5}}>
                                <span style={{fontSize:9,color:"rgba(255,255,255,0.6)"}}>{shop.symbol}</span>
                                <input
                                  autoFocus
                                  type="number"
                                  value={targetInput}
                                  onChange={e=>setTargetInput(e.target.value)}
                                  onKeyDown={e=>{if(e.key==="Enter")saveTarget();if(e.key==="Escape")setEditingTarget(false);}}
                                  onWheel={e=>e.target.blur()}
                                  style={{width:80,fontSize:11,fontWeight:700,background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.4)",borderRadius:6,color:"white",padding:"2px 6px",outline:"none",fontFamily:"DM Mono,monospace"}}
                                />
                                <button onClick={saveTarget} style={{fontSize:9,fontWeight:700,background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.4)",borderRadius:5,color:"white",padding:"3px 8px",cursor:"pointer",fontFamily:"inherit"}}>✓</button>
                                <button onClick={()=>setEditingTarget(false)} style={{fontSize:9,background:"none",border:"none",color:"rgba(255,255,255,0.5)",cursor:"pointer",padding:"2px 4px"}}>✕</button>
                              </div>
                            ):(
                              <button onClick={()=>{setTargetInput(String(monthTarget||""));setEditingTarget(true);}} style={{fontSize:9,fontWeight:700,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:6,color:"rgba(255,255,255,0.7)",padding:"3px 9px",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                                ✏️ Target: {monthTarget>0?fmt(shopId,monthTarget,true):"Set target"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── ROW 2: Four compact stat cards ── */}
                    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12}}>

                      {/* Financial Year — compact */}
                      <div style={{borderRadius:14,background:"linear-gradient(135deg,#064e3b,#065f46,#059669)",padding:"16px",position:"relative",overflow:"hidden",boxShadow:"0 6px 18px rgba(5,150,105,0.25)"}}>
                        <div style={{position:"absolute",bottom:-15,right:-15,width:70,height:70,borderRadius:"50%",background:"rgba(255,255,255,0.07)",filter:"blur(12px)"}}/>
                        <div style={{position:"relative",zIndex:1}}>
                          <p style={{margin:"0 0 1px",fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.06em"}}>Financial Year</p>
                          <p style={{margin:"0 0 5px",fontSize:9,color:"rgba(255,255,255,0.35)"}}>Apr {fyStart.getFullYear()} – Mar {fyStart.getFullYear()+1}</p>
                          <p style={{margin:"0 0 6px",fontSize:18,fontWeight:900,color:"white",fontFamily:"DM Mono,monospace",letterSpacing:"-0.5px"}}>{fmt(shopId,fySales,true)}</p>
                          <div style={{height:3,background:"rgba(0,0,0,0.2)",borderRadius:999,overflow:"hidden"}}>
                            <div style={{height:"100%",width:Math.round(fyPct*100)+"%",background:"linear-gradient(90deg,#34d399,#6ee7b7)",borderRadius:999}}/>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
                            <p style={{margin:0,fontSize:9,color:"rgba(255,255,255,0.4)"}}>{fyCount} orders</p>
                            <p style={{margin:0,fontSize:9,color:"#34d399",fontWeight:700}}>{Math.round(fyPct*100)}%</p>
                          </div>
                        </div>
                      </div>

                      {/* Pending orders */}
                      <div style={{borderRadius:14,background:"linear-gradient(135deg,#78350f,#92400e,#d97706)",padding:"16px",position:"relative",overflow:"hidden",boxShadow:"0 6px 18px rgba(217,119,6,0.25)"}}>
                        <div style={{position:"absolute",bottom:-15,right:-15,width:70,height:70,borderRadius:"50%",background:"rgba(255,255,255,0.07)",filter:"blur(12px)"}}/>
                        <div style={{position:"relative",zIndex:1}}>
                          <p style={{margin:"0 0 6px",fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.06em"}}>Pending Orders</p>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <p style={{margin:0,fontSize:36,fontWeight:900,color:"white",lineHeight:1,fontFamily:"DM Mono,monospace"}}>{pendingOrders}</p>
                            <div>
                              <p style={{margin:"0 0 2px",fontSize:9,color:pendingOrders>0?"#fde68a":"#86efac",fontWeight:700}}>{pendingOrders>0?"⚠ Needs action":"✓ All clear"}</p>
                              <div style={{display:"flex",gap:2}}>{Array.from({length:Math.min(pendingOrders,8)}).map((_,i)=><div key={i} style={{width:5,height:5,borderRadius:1,background:"rgba(255,255,255,0.5)"}}/>)}</div>
                            </div>
                          </div>
                          <p style={{margin:"6px 0 0",fontSize:9,color:"rgba(255,255,255,0.4)"}}>Awaiting fulfilment</p>
                        </div>
                      </div>

                      {/* Returns */}
                      <div style={{borderRadius:14,background:"linear-gradient(135deg,#831843,#9d174d,#e95597)",padding:"16px",position:"relative",overflow:"hidden",boxShadow:"0 6px 18px rgba(233,85,151,0.25)"}}>
                        <div style={{position:"absolute",bottom:-15,right:-15,width:70,height:70,borderRadius:"50%",background:"rgba(255,255,255,0.07)",filter:"blur(12px)"}}/>
                        <div style={{position:"relative",zIndex:1}}>
                          <p style={{margin:"0 0 6px",fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.06em"}}>Returns This Month</p>
                          <div style={{display:"flex",alignItems:"baseline",gap:6}}>
                            <p style={{margin:0,fontSize:36,fontWeight:900,color:"white",lineHeight:1,fontFamily:"DM Mono,monospace"}}>{monthReturns}</p>
                            <p style={{margin:0,fontSize:11,color:"rgba(255,255,255,0.6)"}}>returned</p>
                          </div>
                          <div style={{marginTop:8,height:3,background:"rgba(0,0,0,0.2)",borderRadius:999}}>
                            <div style={{height:"100%",width:Math.min(monthReturns*20,100)+"%",background:"rgba(255,255,255,0.5)",borderRadius:999}}/>
                          </div>
                          <p style={{margin:"5px 0 0",fontSize:9,color:monthReturns===0?"#86efac":"#fca5a5",fontWeight:700}}>{monthReturns===0?"✓ None this month":"↩ Returned / Exchanged"}</p>
                        </div>
                      </div>

                      {/* Refunds */}
                      <div style={{borderRadius:14,background:"linear-gradient(135deg,#2e1065,#5b21b6,#7c3aed)",padding:"16px",position:"relative",overflow:"hidden",boxShadow:"0 6px 18px rgba(124,58,237,0.25)"}}>
                        <div style={{position:"absolute",bottom:-15,right:-15,width:70,height:70,borderRadius:"50%",background:"rgba(255,255,255,0.07)",filter:"blur(12px)"}}/>
                        <div style={{position:"relative",zIndex:1}}>
                          <p style={{margin:"0 0 6px",fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.06em"}}>Refunds This Month</p>
                          <p style={{margin:"0 0 4px",fontSize:monthRefunds>0?22:28,fontWeight:900,color:"white",fontFamily:"DM Mono,monospace",letterSpacing:"-0.5px"}}>{monthRefunds>0?fmt(shopId,monthRefunds,true):"—"}</p>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6}}>
                            <span style={{fontSize:14}}>{monthRefunds===0?"✅":"💸"}</span>
                            <p style={{margin:0,fontSize:9,color:monthRefunds===0?"#86efac":"#fca5a5",fontWeight:700}}>{monthRefunds===0?"No refunds issued":"Total refunded value"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>);
                })()}

                {/* ── ANALYTICS SECTION ── */}
                {(()=>{
                  const now2=new Date();
                  const curMonth=now2.getMonth();
                  const curYear=now2.getFullYear();
                  const sym=shop.symbol||"£";
                  const fyStartM=now2.getMonth()<3?new Date(curYear-1,3,1):new Date(curYear,3,1);

                  // Last 12 months
                  const last6=Array.from({length:12},(_,i)=>{
                    const d=new Date(curYear,curMonth-11+i,1);
                    return{month:d.getMonth(),year:d.getFullYear(),label:d.toLocaleString("default",{month:"short"})+"'"+String(d.getFullYear()).slice(-2)};
                  });
                  // Match ReportsPanel EXACTLY: same date parse (new Date), same rev logic
                  const isRef2=s=>(s.ful||s.status)==="REFUNDED";
                  const netAmt2=s=>(Number(s.amount)||0)-(Number(s.adjAmt)||0);
                  const rev2=arr=>arr.filter(s=>!isRef2(s)).reduce((a,s)=>a+netAmt2(s),0);
                  const monthRevArr=last6.map((m,idx)=>{
                    if(idx===11)return Math.round(monthSales);
                    const filtered=sales.filter(s=>{const d=new Date(s.date);return d&&!isNaN(d)&&d.getMonth()===m.month&&d.getFullYear()===m.year;});
                    return Math.round(rev2(filtered));
                  });
                  const monthPurArr=last6.map(m=>{
                    const v=purch.filter(p=>{const d=parseDate(p.date||p.createdAt||p.created_at||"");return d&&d.getMonth()===m.month&&d.getFullYear()===m.year;}).reduce((a,p)=>a+(Number(p.amount||p.total||p.amt||0)),0);
                    return Math.round(v);
                  });
                  const maxBar=Math.max(...monthRevArr,...monthPurArr,1);

                  // Item breakdowns — accurate parsing of both saleLines and legacy item strings
                  const cleanItemName=name=>{
                    // Strip trailing (xN) suffix that leaks from legacy encoding
                    const cleaned=(name||"").replace(/\(x\d+\)$/i,"").replace(/\(X\d+\)$/i,"").trim().toUpperCase();
                    return cleaned||"OTHER";
                  };
                  const getItems=(arr)=>{
                    const m={};
                    arr.filter(s=>(s.ful||s.status)!=="REFUNDED").forEach(s=>{
                      if(Array.isArray(s.saleLines)&&s.saleLines.length>0){
                        // Modern sales: use saleLines directly
                        s.saleLines.forEach(l=>{
                          const k=cleanItemName(l.name);
                          m[k]=(m[k]||0)+(Number(l.qty)||1);
                        });
                      } else {
                        // Legacy sales: parse item string like "SALWAR(x1), DRESS(x2)"
                        const itemStr=s.item||"";
                        const qty=Number(s.qty)||1;
                        const parsed=parseLegacyItems(itemStr,qty,Number(s.amount)||0);
                        parsed.forEach(l=>{
                          const k=cleanItemName(l.name);
                          if(k==="PRODUCT/SERVICE"||k==="OTHER"||k==="")return;
                          m[k]=(m[k]||0)+(Number(l.qty)||1);
                        });
                      }
                    });
                    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8);
                  };
                  const topItems=getItems(sales);
                  const topMonthItems=getItems(sales.filter(s=>{const d=new Date(s.date);return d&&!isNaN(d)&&d.getMonth()===curMonth&&d.getFullYear()===curYear;}));
                  const topFyItems=getItems(sales.filter(s=>{const d=new Date(s.date);return d&&!isNaN(d)&&d>=fyStartM;}));
                  const itemColors=["#3b82f6","#06b6d4","#10b981","#f59e0b","#e95597","#a78bfa","#f97316","#64748b"];

                  // Purchase stats — use parseDate and check all possible date fields
                  const getPurDate=p=>parseDate(p.date||p.createdAt||p.created_at||"");
                  const purMonth=purch.filter(p=>{const d=getPurDate(p);return d&&d.getMonth()===curMonth&&d.getFullYear()===curYear;}).reduce((a,p)=>a+(Number(p.amount||p.total||p.amt||0)),0);
                  const purFY=purch.filter(p=>{const d=getPurDate(p);return d&&d>=fyStartM;}).reduce((a,p)=>a+(Number(p.amount||p.total||p.amt||0)),0);
                  const purAll=purch.reduce((a,p)=>a+(Number(p.amount||p.total||p.amt||0)),0);
                  const saleFY=rev2(sales.filter(s=>{const d=new Date(s.date);return d&&!isNaN(d)&&d>=fyStartM;}));
                  const saleAll=rev2(sales);
                  // Use same monthSales as KPI card so profit card stays consistent
                  const thisMonthSales=monthSales;

                  // Donut chart
                  const Donut=({items,colors,size=130})=>{
                    const total=items.reduce((a,b)=>a+b[1],0)||1;
                    let cum=0;
                    const slices=items.map((it,i)=>{
                      const pct=it[1]/total,st=cum;cum+=pct;
                      const ang=a=>({x:Math.cos(2*Math.PI*a-Math.PI/2),y:Math.sin(2*Math.PI*a-Math.PI/2)});
                      const s=ang(st),e=ang(cum),r=size/2-10,cx=size/2,cy=size/2;
                      return{key:it[0],color:colors[i%colors.length],d:`M${cx},${cy} L${cx+r*s.x},${cy+r*s.y} A${r},${r},0,${pct>0.5?1:0},1,${cx+r*e.x},${cy+r*e.y} Z`};
                    });
                    return(<svg width={size} height={size} style={{filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.10))"}}>
                      {slices.map(sl=><path key={sl.key} d={sl.d} fill={sl.color} stroke="white" strokeWidth={2}/>)}
                      <circle cx={size/2} cy={size/2} r={size/2-24} fill="white"/>
                      <text x={size/2} y={size/2-3} textAnchor="middle" fontSize={12} fontWeight={800} fill="#0f172a">{items.length}</text>
                      <text x={size/2} y={size/2+11} textAnchor="middle" fontSize={9} fill="#94a3b8">types</text>
                    </svg>);
                  };

                  const displayItems=itemView==="month"?topMonthItems:itemView==="fy"?topFyItems:topItems;
                  const dispTotal=displayItems.reduce((a,b)=>a+b[1],0)||1;

                  return(<div>

                    {/* ROW 1: Bar chart + Profit cards */}
                    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 1fr",gap:14,marginBottom:14}}>
                      <div style={{background:"white",borderRadius:16,border:"1px solid #f1f5f9",boxShadow:"0 2px 10px rgba(0,0,0,0.05)",padding:"18px 20px"}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                          <div><p style={{margin:0,fontWeight:800,fontSize:14,color:"#0f172a"}}>Sales vs Purchases</p><p style={{margin:0,fontSize:11,color:"#94a3b8"}}>Last 12 months</p></div>
                          <div style={{display:"flex",gap:12}}>
                            {[[shop.accent,"Sales"],["#94a3b8","Purchases"]].map(([c,l])=>(
                              <span key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#64748b",fontWeight:600}}>
                                <span style={{width:10,height:10,borderRadius:3,background:c,display:"inline-block"}}/>{l}
                              </span>
                            ))}
                          </div>
                        </div>
                        {/* 12-month totals strip */}
                        {(()=>{
                          const total12Sales=monthRevArr.reduce((a,v)=>a+v,0);
                          const total12Purch=monthPurArr.reduce((a,v)=>a+v,0);
                          const total12Profit=total12Sales-total12Purch;
                          return(
                            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14,background:"#f8fafc",borderRadius:10,padding:"10px 14px",border:"1px solid #f1f5f9"}}>
                              <div>
                                <p style={{margin:"0 0 1px",fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em"}}>12-Month Sales</p>
                                <p style={{margin:0,fontSize:15,fontWeight:900,color:shop.accent,fontFamily:"DM Mono,monospace",letterSpacing:"-0.3px"}}>{sym}{Math.round(total12Sales).toLocaleString()}</p>
                              </div>
                              <div>
                                <p style={{margin:"0 0 1px",fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em"}}>12-Month Purchases</p>
                                <p style={{margin:0,fontSize:15,fontWeight:900,color:"#64748b",fontFamily:"DM Mono,monospace",letterSpacing:"-0.3px"}}>{sym}{Math.round(total12Purch).toLocaleString()}</p>
                              </div>
                              <div>
                                <p style={{margin:"0 0 1px",fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em"}}>12-Month Profit</p>
                                <p style={{margin:0,fontSize:15,fontWeight:900,color:total12Profit>=0?"#10b981":"#ef4444",fontFamily:"DM Mono,monospace",letterSpacing:"-0.3px"}}>{total12Profit<0?"-":""}{sym}{Math.round(Math.abs(total12Profit)).toLocaleString()}</p>
                              </div>
                            </div>
                          );
                        })()}
                        {/* SVG bar chart — hover to reveal month detail */}
                        {(()=>{
                          const W=580,H=160,pad={l:46,r:8,b:20,t:4};
                          const chartW=W-pad.l-pad.r;
                          const chartH=H-pad.t-pad.b;
                          const n=last6.length;
                          const groupW=chartW/n;
                          const barW=Math.max(4,Math.floor(groupW*0.38));
                          const gap=Math.max(1,Math.floor(groupW*0.06));
                          const hovered=selectedBar;
                          // Round up to a clean number whose quarter-steps are all whole numbers
                          const niceMax=raw=>{
                            if(raw<=0)return 400;
                            // Find magnitude, then pick the smallest clean ceiling divisible by 4
                            const mag=Math.pow(10,Math.floor(Math.log10(raw)));
                            const steps=[1,2,4,5,10,20,40,50,100,200,400,500,1000];
                            for(const s of steps){
                              const candidate=Math.ceil(raw/(s*mag))*(s*mag);
                              if(candidate>=raw&&candidate%4===0)return candidate;
                            }
                            return Math.ceil(raw/4)*4;
                          };
                          const chartMax=niceMax(maxBar);
                          // Tick values at 25/50/75/100% — guaranteed whole numbers
                          const ticks=[0.25,0.5,0.75,1].map(r=>Math.round(chartMax*r));
                          // Format: no decimals ever
                          const fmtScale=n=>{
                            if(shopId==="ros-india"){
                              if(n>=100000)return(n/100000)+"L";
                              if(n>=1000)return(n/1000)+"k";
                            } else {
                              if(n>=1000000)return(n/1000000)+"M";
                              if(n>=1000)return(n/1000)+"k";
                            }
                            return String(n);
                          };
                          return(
                            <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block",overflow:"visible"}}>
                              {/* Y-axis grid lines + scale labels */}
                              {ticks.map((tickVal,ti)=>{
                                const r=tickVal/chartMax;
                                const y=pad.t+chartH*(1-r);
                                return(<g key={ti}>
                                  <line x1={pad.l} x2={W-pad.r} y1={y} y2={y} stroke="#f1f5f9" strokeWidth={1}/>
                                  <text x={pad.l-5} y={y+3.5} textAnchor="end" fontSize={8} fill="#94a3b8" fontWeight={600}>{fmtScale(tickVal)}</text>
                                </g>);
                              })}
                              {/* Y-axis baseline */}
                              <line x1={pad.l} x2={pad.l} y1={pad.t} y2={pad.t+chartH} stroke="#e2e8f0" strokeWidth={1}/>
                              {last6.map((m,i)=>{
                                const cx=pad.l+i*groupW+groupW/2;
                                const sH=Math.max(3,Math.round((monthRevArr[i]/chartMax)*chartH));
                                const pH=Math.max(3,Math.round((monthPurArr[i]/chartMax)*chartH));
                                const sy=pad.t+chartH-sH;
                                const py=pad.t+chartH-pH;
                                const sx=cx-barW-gap/2;
                                const px=cx+gap/2;
                                const isHov=hovered===i;
                                return(
                                  <g key={m.label}
                                    onMouseEnter={()=>setSelectedBar(i)}
                                    onMouseLeave={()=>setSelectedBar(null)}
                                    style={{cursor:"default"}}>
                                    <rect x={cx-groupW/2} y={pad.t} width={groupW} height={chartH} fill="transparent"/>
                                    {isHov&&<rect x={cx-groupW/2+1} y={pad.t} width={groupW-2} height={chartH} fill={shop.accent} fillOpacity={0.07} rx={3}/>}
                                    <rect x={sx} y={sy} width={barW} height={sH} fill={shop.accent} fillOpacity={isHov?1:0.7} rx={2}/>
                                    <rect x={px} y={py} width={barW} height={pH} fill="#94a3b8" fillOpacity={isHov?1:0.6} rx={2}/>
                                    <text x={cx} y={H-4} textAnchor="middle" fontSize={7.5} fill={isHov?shop.accent:"#94a3b8"} fontWeight={isHov?800:600}>{m.label}</text>
                                  </g>
                                );
                              })}

                              {/* Floating tooltip inside SVG */}
                              {hovered!==null&&(()=>{
                                const m=last6[hovered];
                                const s=monthRevArr[hovered];
                                const p=monthPurArr[hovered];
                                const profit=s-p;
                                const cx=pad.l+hovered*groupW+groupW/2;
                                // tooltip width/height
                                const TW=168,TH=72,TR=7;
                                // position: prefer right of bar, flip left if near right edge
                                const tx=cx+groupW/2+4+TW>W ? cx-groupW/2-4-TW : cx+groupW/2+4;
                                const ty=Math.max(pad.t, Math.min(pad.t+chartH-TH, pad.t+chartH/2-TH/2));
                                const profitColor=profit>=0?"#10b981":"#ef4444";
                                return(
                                  <g style={{pointerEvents:"none"}}>
                                    {/* shadow */}
                                    <rect x={tx+2} y={ty+2} width={TW} height={TH} rx={TR} fill="rgba(0,0,0,0.08)"/>
                                    {/* card bg */}
                                    <rect x={tx} y={ty} width={TW} height={TH} rx={TR} fill="white" stroke={shop.accent} strokeWidth={0.8} strokeOpacity={0.4}/>
                                    {/* header strip */}
                                    <rect x={tx} y={ty} width={TW} height={18} rx={TR} fill={shop.accent} fillOpacity={0.12}/>
                                    <rect x={tx} y={ty+11} width={TW} height={7} fill={shop.accent} fillOpacity={0.12}/>
                                    {/* month label */}
                                    <text x={tx+TW/2} y={ty+12} textAnchor="middle" fontSize={9} fontWeight={700} fill={shop.accent} letterSpacing={1}>{m.label.toUpperCase()}</text>
                                    {/* divider */}
                                    <line x1={tx+10} x2={tx+TW-10} y1={ty+20} y2={ty+20} stroke="#f1f5f9" strokeWidth={1}/>
                                    {/* Sales row */}
                                    <text x={tx+10} y={ty+33} fontSize={8} fill="#94a3b8" fontWeight={600}>SALES</text>
                                    <text x={tx+TW-10} y={ty+33} textAnchor="end" fontSize={10} fontWeight={800} fill={shop.accent}>{sym}{s.toLocaleString()}</text>
                                    {/* Purchases row */}
                                    <text x={tx+10} y={ty+47} fontSize={8} fill="#94a3b8" fontWeight={600}>PURCHASES</text>
                                    <text x={tx+TW-10} y={ty+47} textAnchor="end" fontSize={10} fontWeight={800} fill="#64748b">{sym}{p.toLocaleString()}</text>
                                    {/* divider */}
                                    <line x1={tx+10} x2={tx+TW-10} y1={ty+52} y2={ty+52} stroke="#f1f5f9" strokeWidth={1}/>
                                    {/* Profit row */}
                                    <text x={tx+10} y={ty+64} fontSize={8} fill="#94a3b8" fontWeight={600}>PROFIT</text>
                                    <text x={tx+TW-10} y={ty+64} textAnchor="end" fontSize={10} fontWeight={800} fill={profitColor}>{profit<0?"-":""}{sym}{Math.abs(profit).toLocaleString()}</text>
                                  </g>
                                );
                              })()}
                            </svg>
                          );
                        })()}
                      </div>

                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        {[
                          {label:"This Month Profit",val:thisMonthSales-purMonth,sub:"Sales − Purchases",pos:"#10b981",neg:"#ef4444",posBg:"#f0fdf4",negBg:"#fff5f5",posBorder:"#bbf7d0",negBorder:"#fecaca",icon:"📈"},
                          {label:"FY Profit",val:saleFY-purFY,sub:"Apr – Mar",pos:"#3b82f6",neg:"#ef4444",posBg:"#eff6ff",negBg:"#fff5f5",posBorder:"#bfdbfe",negBorder:"#fecaca",icon:"📊"},
                          {label:"All-Time Revenue",val:saleAll,sub:sales.length+" total sales",pos:shop.accent,neg:shop.accent,posBg:shop.accentBg,negBg:shop.accentBg,posBorder:shop.accent+"44",negBorder:shop.accent+"44",icon:"💰"},
                        ].map((row,i)=>{
                          const isPos=row.val>=0;
                          return(<div key={i} style={{background:isPos?row.posBg:row.negBg,borderRadius:13,border:"1px solid "+(isPos?row.posBorder:row.negBorder),padding:"12px 16px",flex:1,position:"relative",overflow:"hidden"}}>
                            <div style={{position:"absolute",right:10,top:10,fontSize:22,opacity:0.12}}>{row.icon}</div>
                            <p style={{margin:"0 0 2px",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em"}}>{row.label}</p>
                            <p style={{margin:"0 0 1px",fontSize:20,fontWeight:900,color:isPos?row.pos:row.neg,letterSpacing:"-0.5px",fontFamily:"DM Mono,monospace"}}>{sym}{Math.round(Math.abs(row.val)).toLocaleString()}{!isPos?" (loss)":""}</p>
                            <p style={{margin:0,fontSize:10,color:"#94a3b8"}}>{row.sub}</p>
                          </div>);
                        })}
                      </div>
                    </div>

                    {/* ROW 2: Item breakdown */}
                    <div style={{background:"white",borderRadius:16,border:"1px solid #f1f5f9",boxShadow:"0 2px 10px rgba(0,0,0,0.05)",padding:"18px 20px",marginBottom:14}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
                        <div>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <p style={{margin:0,fontWeight:800,fontSize:14,color:"#0f172a"}}>Items Sold by Type</p>
                            {dispTotal>0&&<span style={{fontSize:11,fontWeight:700,color:shop.accent,background:shop.accentBg,border:"1px solid "+shop.accent+"33",borderRadius:999,padding:"2px 10px"}}>{dispTotal} units total</span>}
                          </div>
                          <p style={{margin:"2px 0 0",fontSize:11,color:"#94a3b8"}}>Quantity per product category · excludes refunded</p>
                        </div>
                        <div style={{display:"flex",gap:5}}>
                          {[["month","This Month"],["fy","This FY"],["all","All Time"]].map(([v,l])=>(
                            <button key={v} onClick={()=>setItemView(v)} style={{padding:"5px 11px",borderRadius:8,border:"1px solid "+(itemView===v?shop.accent+"66":"#e2e8f0"),background:itemView===v?shop.accentBg:"white",color:itemView===v?shop.accent:"#64748b",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{l}</button>
                          ))}
                        </div>
                      </div>
                      {displayItems.length===0
                        ?<p style={{margin:"20px 0",textAlign:"center",color:"#cbd5e1",fontSize:13}}>No sales data for this period</p>
                        :<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr auto",gap:20,alignItems:"center"}}>
                          <div>
                            {displayItems.map((it,i)=>{
                              const pct=Math.round((it[1]/dispTotal)*100);
                              return(<div key={it[0]} style={{marginBottom:10}}>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                                  <span style={{display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:700,color:"#374151"}}>
                                    <span style={{width:9,height:9,borderRadius:2,background:itemColors[i%itemColors.length],display:"inline-block",flexShrink:0}}/>
                                    {it[0]}
                                  </span>
                                  <span style={{display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{fontSize:13,fontWeight:900,color:"#0f172a",fontFamily:"DM Mono,monospace"}}>{it[1]}</span>
                                    <span style={{fontSize:10,fontWeight:600,color:"#94a3b8",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:6,padding:"1px 6px"}}>{pct}%</span>
                                  </span>
                                </div>
                                <div style={{height:8,background:"#f1f5f9",borderRadius:999,overflow:"hidden"}}>
                                  <div style={{height:"100%",width:pct+"%",background:itemColors[i%itemColors.length],borderRadius:999,transition:"width 0.8s cubic-bezier(0.4,0,0.2,1)"}}/>
                                </div>
                              </div>);
                            })}
                          </div>
                          {!isMobile&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
                            <Donut items={displayItems} colors={itemColors} size={130}/>
                            <div style={{display:"flex",flexWrap:"wrap",gap:4,justifyContent:"center",maxWidth:160}}>
                              {displayItems.slice(0,6).map((it,i)=>(
                                <span key={it[0]} style={{fontSize:9,fontWeight:700,color:itemColors[i%itemColors.length],background:itemColors[i%itemColors.length]+"18",border:"1px solid "+itemColors[i%itemColors.length]+"33",borderRadius:999,padding:"2px 7px"}}>{it[0]}</span>
                              ))}
                            </div>
                          </div>}
                        </div>
                      }
                    </div>

                    {/* ROW 3: Purchase overview */}
                    <div style={{background:"white",borderRadius:16,border:"1px solid #f1f5f9",boxShadow:"0 2px 10px rgba(0,0,0,0.05)",padding:"18px 20px",marginBottom:14}}>
                      <p style={{margin:"0 0 12px",fontWeight:800,fontSize:14,color:"#0f172a"}}>Purchase Overview</p>
                      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
                        {[
                          {label:"This Month",val:purMonth,count:purch.filter(p=>{const d=getPurDate(p);return d&&d.getMonth()===curMonth&&d.getFullYear()===curYear;}).length,col:"#06b6d4",bg:"#ecfeff",border:"#a5f3fc"},
                          {label:"This FY",val:purFY,count:purch.filter(p=>{const d=getPurDate(p);return d&&d>=fyStartM;}).length,col:"#10b981",bg:"#f0fdf4",border:"#bbf7d0"},
                          {label:"All Time",val:purAll,count:purch.length,col:"#a78bfa",bg:"#f5f3ff",border:"#ddd6fe"},
                          {label:"Avg per Purchase",val:purch.length>0?purAll/purch.length:0,count:null,col:"#f59e0b",bg:"#fffbeb",border:"#fde68a"},
                        ].map((p,i)=>(
                          <div key={i} style={{background:p.bg,borderRadius:12,border:"1px solid "+p.border,padding:"12px 14px"}}>
                            <p style={{margin:"0 0 3px",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em"}}>{p.label}</p>
                            <p style={{margin:"0 0 2px",fontSize:17,fontWeight:900,color:p.col,letterSpacing:"-0.3px"}}>{sym}{Math.round(p.val).toLocaleString()}</p>
                            {p.count!==null&&<p style={{margin:0,fontSize:10,color:"#94a3b8"}}>{p.count} purchase{p.count!==1?"s":""}</p>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* LOW STOCK */}
                    {lowStk.length>0&&(
                      <div style={{background:"#fff7ed",borderRadius:14,border:"1px solid #fed7aa",padding:"14px 18px",display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                        <span style={{fontSize:22}}>⚠️</span>
                        <div>
                          <p style={{margin:0,fontWeight:800,fontSize:13,color:"#c2410c"}}>{lowStk.length} product{lowStk.length>1?"s":""} low on stock</p>
                          <p style={{margin:0,fontSize:11,color:"#ea580c"}}>{lowStk.map(p=>p.name).join(" · ")}</p>
                        </div>
                        <button onClick={()=>setTab("products")} style={{marginLeft:"auto",fontSize:12,fontWeight:700,color:"#c2410c",background:"white",border:"1px solid #fed7aa",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontFamily:"inherit"}}>View Products →</button>
                      </div>
                    )}
                  </div>);
                })()}
              </div>
            );
          })()}

          {/* ─── SALES ─── */}
          {tab==="sales"&&(()=>{
            const indiaStatuses=[
              {key:"ALL",                        label:"All",         emoji:"🗂️"},
              {key:"ORDER NOT PLACED",           label:"Not Placed",  emoji:"🕐"},
              {key:"WORK IN PROGRESS",           label:"In Progress", emoji:"🔧"},
              {key:"PHOTO GIVEN TO CUSTOMER",    label:"Photo Sent",  emoji:"📸"},
              {key:"AWAITING TRACKING INFO.",    label:"Awaiting",    emoji:"📦"},
              {key:"FULFILLED",                  label:"Fulfilled",   emoji:"✅"},
              {key:"RETURN REQUESTED",           label:"Rtn Req",     emoji:"↩️"},
              {key:"RETURN RECEIVED",            label:"Rtn Rcvd",    emoji:"📬"},
              {key:"EXCHANGED",                  label:"Exchanged",   emoji:"🔄"},
              {key:"REFUNDED",                   label:"Refunded",    emoji:"💸"},
              {key:"GOOD FEEDBACK RECEIVED",     label:"👍 Positive", emoji:"🌟"},
              {key:"NEGATIVE FEEDBACK RECEIVED", label:"👎 Negative", emoji:"⚠️"},
            ];
            const otherStatuses=[
              {key:"ALL",           label:"All",       emoji:"🗂️"},
              {key:"PENDING",       label:"Pending",   emoji:"⏳"},
              {key:"FULFILLED",     label:"Fulfilled", emoji:"✅"},
              {key:"GOOD FEEDBACK", label:"Good FB",   emoji:"🌟"},
              {key:"RTRN REQSTD",   label:"Rtn Req",   emoji:"↩️"},
              {key:"RETRN RCVD",    label:"Rtn Rcvd",  emoji:"📬"},
              {key:"EXCHANGED",     label:"Exchanged", emoji:"🔄"},
              {key:"REFUNDED",      label:"Refunded",  emoji:"💸"},
            ];
            const statusTabs=shopId==="ros-india"?indiaStatuses:otherStatuses;
            return(
              <SalesPanel
                Badge={Badge}
                customers={customers}
                filtSales={filtSales}
                fmt={fmt}
                formatDate={formatDate}
                parseDate={parseDate}
                openMenu={openMenu}
                onImport={()=>setModal("import-sales")}
                onExport={()=>setModal("export-sales")}
                onReload={handleReloadSales}
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
                shopId={user?.role==="staff"?"ros-india-staff":shopId}
                TD={TD}
                user={user}
                isStaff={user?.role==="staff"}
                statusRowBg={STATUS_ROW_BG}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                statusTabs={statusTabs}
                onSaveTracking={async (saleId, trackingNo) => {
                  // Save tracking number to Supabase and update local state
                  const sale = sales.find(s => s.id === saleId);
                  if (!sale) return;
                  const updated = { ...sale, trackingNo };
                  await dbSaveSale(shopId, updated);
                  setSalesData(prev => ({
                    ...prev,
                    [shopId]: (prev[shopId] || []).map(s => s.id === saleId ? { ...s, trackingNo } : s),
                  }));
                }}
                onMarkDelivered={(sale) => setMarkDeliveredSale(sale)}
              />
            );
          })()}

          {/* ─── PURCHASES ─── */}
          {tab==="purchases"&&(
            <PurchasesPanel
              Badge={Badge}
              fmt={fmt}
              onExport={()=>setModal("export-purchases")}
              onImport={()=>setModal("import-purchases")}
              onNewPurchase={()=>setModal("new-purchase")}
              onViewPurchase={(p)=>setViewPurchRow(p)}
              onEditPurchase={(p)=>setEditPurchRow(p)}
              onDeletePurchase={async(p)=>{
                if(!window.confirm("Delete purchase "+(p.id||p.purchase_ref||"")+"? This cannot be undone."))return;
                const uuid=p.uuid||p.id;
                await dbDeletePurchase(uuid,shopId);
                setPurchData(prev=>prev.filter(x=>(x.uuid||x.id)!==uuid));
              }}
              purch={purch}
              shop={shop}
              shopId={shopId}
            />
          )}

          {/* ─── CUSTOMERS ─── */}
          {tab==="customers"&&(
            <CustomersPanel Badge={Badge} customers={customers} search={search} shop={shop} setCustomers={setCustomers} user={user} dbDeleteCustomer={dbDeleteCustomer} sales={sales}/>
          )}

          {/* ─── SUPPLIERS ─── */}
          {tab==="suppliers"&&(
            <SuppliersTabPanel
              shop={shop}
              shopId={shopId}
              suppliers={suppData}
              setSuppData={setSuppData}
            />
          )}

          {/* ─── PRODUCTS ─── */}
          {tab==="products"&&(
            <ProductsPanel lowStk={lowStk} products={PRODUCTS} shop={shop}/>
          )}

          {/* ─── LOGISTICS ─── */}
          {tab==="logistics"&&(
            <LogisticsPanel
              logs={logs}
              onNewShipment={()=>setModal("new-shipment")}
              shop={shop}
              onViewShipment={(l)=>setViewLogRow(l)}
              onEditShipment={(l)=>setEditLogRow(l)}
              onDeleteShipment={async(l)=>{
                if(!window.confirm("Delete shipment "+(l.id||"")+"? This cannot be undone."))return;
                const uuid=l.uuid||l.id;
                await dbDeleteLogistic(uuid,shopId);
                setLogData(prev=>prev.filter(x=>(x.uuid||x.id)!==uuid));
              }}
            />
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
              customers={customers}
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
            <ReportsPanel shop={shop} showPdf={showPdf} sales={sales} customers={customers} fmt={fmt} shopId={shopId} exps={exps} purch={purch}/>
          )}

          {/* ── MESSAGES TAB ── */}
          {tab==="messages"&&(
            <MessagesPanel
              shopId={shopId}
              shop={shop}
              messages={messages}
              setMessages={setMessages}
              user={user}
              sales={sales}
            />
          )}

          {/* ── RETURNS TAB ── */}
          {tab==="returns"&&(
            <ReturnsPanel
              shopId={shopId}
              shop={shop}
              returns={returns}
              setReturns={setReturns}
              user={user}
              messages={messages}
              setMessages={setMessages}
            />
          )}

          {/* INVOICES placeholder */}
          {tab==="invoices"&&(
            <InvoicesPanel shop={shop}/>
          )}

          {/* ── CASH FLOW ── */}
          {tab==="cashflow"&&(()=>{
            const fmtD=d=>{if(!d)return"";const p=d.split("-");return p.length===3?p[2]+"/"+p[1]+"/"+p[0].slice(2):d;};
            const fyFrom=cfFY+"-04-01";const fyTo=(cfFY+1)+"-03-31";
            const inFY=d=>d&&d>=fyFrom&&d<=fyTo;
            const allDates=[...sales,...exps,...purch].map(r=>r.date||"").filter(Boolean).sort();
            const toFYStart=d=>{const y=parseInt(d.slice(0,4));const m=parseInt(d.slice(5,7));return m>=4?y:y-1;};
            const fyYears=allDates.length?[...new Set(allDates.map(toFYStart))].sort((a,b)=>b-a):[cfFY];
            const obKey=shopId+"_"+cfFY;
            const openBal=Number(cfOpenBal[obKey])||0;
            const saveOB=()=>{const v=parseFloat(obInput)||0;const next={...cfOpenBal,[obKey]:v};setCfOpenBal(next);try{localStorage.setItem("ros_cf_openbal",JSON.stringify(next));}catch{}setObEdit(false);};
            const cfRows=[
              ...sales.filter(s=>inFY(s.date)).map(s=>({date:s.date,ref:s.id||"",type:"Sale",description:(s.customer||"Unknown")+(s.item?" — "+s.item:""),credit:Math.max(0,(Number(s.amount)||0)-(Number(s.adjAmt)||0)),debit:0})),
              ...exps.filter(e=>inFY(e.date)).map(e=>({date:e.date,ref:e.id||e.ref||"",type:"Expense",description:e.supplier||e.description||e.desc||"Expense",credit:0,debit:Math.abs(Number(e.amount)||0)})),
              ...purch.filter(p=>inFY(p.date)).map(p=>({date:p.date,ref:p.id||p.invoiceNo||"",type:"Purchase",description:p.supplier||p.description||"Purchase",credit:0,debit:Math.abs(Number(p.amount)||0)})),
            ].filter(r=>r.date).sort((a,b)=>a.date.localeCompare(b.date));
            let bal=openBal;
            const withBal=cfRows.map(r=>{bal+=r.credit-r.debit;return{...r,balance:bal};});
            const totalCredit=cfRows.reduce((a,r)=>a+r.credit,0);
            const totalDebit=cfRows.reduce((a,r)=>a+r.debit,0);
            const closingBal=openBal+totalCredit-totalDebit;
            const typeColor={Sale:"#15803d",Expense:"#dc2626",Purchase:"#b45309"};
            const typeBg={Sale:"#dcfce7",Expense:"#fee2e2",Purchase:"#fef3c7"};
            const exportXLS=()=>{
              const sym=shop.symbol||"£";
              const rows=[["Cash Flow Ledger","","","","","",""],
                [shop.name+" FY "+cfFY+"/"+String(cfFY+1).slice(2),"","","","","",""],[""],
                ["Date","Reference","Type","Description","Credit ("+sym+")","Debit ("+sym+")","Balance ("+sym+")"],
                ["01/04/"+String(cfFY).slice(2),"OB-"+cfFY,"Opening","Opening Balance",openBal>0?openBal.toFixed(2):"",openBal<0?Math.abs(openBal).toFixed(2):"",openBal.toFixed(2)],
                ...withBal.map(r=>[fmtD(r.date),r.ref,r.type,r.description,r.credit>0?r.credit.toFixed(2):"",r.debit>0?r.debit.toFixed(2):"",r.balance.toFixed(2)]),
                ["31/03/"+String(cfFY+1).slice(2),"CB-"+(cfFY+1),"Closing","Closing Balance","","",closingBal.toFixed(2)],[""],
                ["","","","Total Income",totalCredit.toFixed(2),"",""],["","","","Total Outgoings","",totalDebit.toFixed(2),""],
                ["","","","Net Movement","","",(totalCredit-totalDebit).toFixed(2)]];
              const csv=rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(",")).join("\r\n");
              const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
              const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;
              a.download=shop.name.replace(/\s+/g,"-")+"-CashFlow-FY"+cfFY+"-"+String(cfFY+1).slice(2)+".csv";
              a.click();URL.revokeObjectURL(url);
            };
            return(
              <div style={{padding:"20px 24px"}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:20}}>
                  <div><h2 style={{margin:"0 0 4px",fontSize:20,fontWeight:900,color:"#0f172a"}}>🏦 Cash Flow Ledger</h2>
                    <p style={{margin:0,fontSize:12,color:"#64748b"}}>01/04/{String(cfFY).slice(2)} — 31/03/{String(cfFY+1).slice(2)}  ·  {cfRows.length} transactions</p></div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                    {fyYears.map(y=>(<button key={y} onClick={()=>{setCfFY(y);setObEdit(false);}}
                      style={{padding:"5px 14px",borderRadius:8,border:"1px solid "+(cfFY===y?shop.accent:"#e2e8f0"),background:cfFY===y?shop.accent:"white",color:cfFY===y?"white":"#374151",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                      FY {y}/{String(y+1).slice(2)}</button>))}
                    <button onClick={exportXLS} style={{padding:"6px 16px",borderRadius:8,border:"none",background:"#16a34a",color:"white",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px rgba(22,163,74,0.3)"}}>&#128202; Export Excel</button>
                  </div>
                </div>
                <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:14,padding:"14px 18px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                  <div><p style={{margin:"0 0 2px",fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em"}}>🏦 Opening Balance — 01/04/{String(cfFY).slice(2)}</p>
                    {obEdit?<div style={{display:"flex",gap:8,alignItems:"center",marginTop:4}}>
                        <span style={{fontSize:16,fontWeight:700,color:"#374151"}}>{shop.symbol}</span>
                        <input type="number" value={obInput} onChange={e=>setObInput(e.target.value)}
                          onKeyDown={e=>{if(e.key==="Enter")saveOB();if(e.key==="Escape")setObEdit(false);}} autoFocus
                          style={{width:140,padding:"6px 10px",borderRadius:8,border:"2px solid "+shop.accent,fontSize:15,fontWeight:700,fontFamily:"DM Mono,monospace",outline:"none"}}/>
                        <button onClick={saveOB} style={{padding:"6px 16px",borderRadius:8,border:"none",background:shop.accent,color:"white",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Save</button>
                        <button onClick={()=>setObEdit(false)} style={{padding:"6px 12px",borderRadius:8,border:"1px solid #e2e8f0",background:"white",color:"#64748b",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                      </div>
                    :<div style={{display:"flex",alignItems:"center",gap:12,marginTop:2}}>
                        <span style={{fontSize:22,fontWeight:900,color:openBal>=0?"#15803d":"#dc2626",fontFamily:"DM Mono,monospace"}}>{fmt(shopId,openBal)}</span>
                        <button onClick={()=>{setObInput(String(openBal||""));setObEdit(true);}} style={{padding:"4px 12px",borderRadius:8,border:"1px solid "+shop.accent+"44",background:shop.accentBg,color:shop.accent,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✏️ Edit</button>
                      </div>}
                  </div>
                  <div style={{textAlign:"right"}}><p style={{margin:"0 0 2px",fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em"}}>Closing Balance — 31/03/{String(cfFY+1).slice(2)}</p>
                    <span style={{fontSize:22,fontWeight:900,color:closingBal>=0?"#15803d":"#dc2626",fontFamily:"DM Mono,monospace"}}>{fmt(shopId,closingBal)}</span></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:24}}>
                  {[{l:"Total Income",v:totalCredit,c:"#15803d",bg:"#dcfce7",b:"#bbf7d0",ic:"↑"},{l:"Total Outgoings",v:totalDebit,c:"#dc2626",bg:"#fee2e2",b:"#fecaca",ic:"↓"},
                    {l:"Net Movement",v:totalCredit-totalDebit,c:(totalCredit-totalDebit)>=0?"#15803d":"#dc2626",bg:(totalCredit-totalDebit)>=0?"#dcfce7":"#fee2e2",b:(totalCredit-totalDebit)>=0?"#bbf7d0":"#fecaca",ic:(totalCredit-totalDebit)>=0?"↑":"↓"}]
                    .map((c,i)=>(<div key={i} style={{background:c.bg,border:"1px solid "+c.b,borderRadius:14,padding:"16px 20px"}}>
                      <p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:c.c,textTransform:"uppercase",letterSpacing:"0.06em"}}>{c.ic} {c.l}</p>
                      <p style={{margin:0,fontSize:22,fontWeight:900,color:c.c,fontFamily:"DM Mono,monospace"}}>{fmt(shopId,c.v)}</p></div>))}
                </div>
                <div style={{background:"white",borderRadius:14,border:"1px solid #e2e8f0",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
                  <div style={{display:"grid",gridTemplateColumns:"90px 120px 80px 1fr 110px 110px 120px",background:"#f8fafc",borderBottom:"2px solid #e2e8f0",padding:"10px 16px"}}>
                    {["Date","Reference","Type","Description","Credit ↑","Debit ↓","Balance"].map((h,i)=>(
                      <span key={i} style={{fontSize:10,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:i>=4?"right":"left"}}>{h}</span>))}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"90px 120px 80px 1fr 110px 110px 120px",padding:"10px 16px",borderBottom:"1px solid #e2e8f0",alignItems:"center",background:"#f0fdf4"}}>
                    <span style={{fontSize:11,color:"#374151",fontFamily:"DM Mono,monospace"}}>01/04/{String(cfFY).slice(2)}</span>
                    <span style={{fontSize:11,color:"#64748b",fontFamily:"DM Mono,monospace"}}>OB-{cfFY}</span>
                    <span><span style={{background:"#dcfce7",color:"#15803d",fontSize:10,fontWeight:800,borderRadius:6,padding:"2px 8px"}}>Opening</span></span>
                    <span style={{fontSize:12,fontWeight:700,color:"#15803d"}}>Opening Balance</span>
                    <span style={{fontSize:12,fontWeight:700,color:"#15803d",textAlign:"right",fontFamily:"DM Mono,monospace"}}>{openBal>0?fmt(shopId,openBal):"—"}</span>
                    <span style={{fontSize:12,fontWeight:700,color:"#dc2626",textAlign:"right",fontFamily:"DM Mono,monospace"}}>{openBal<0?fmt(shopId,Math.abs(openBal)):"—"}</span>
                    <span style={{fontSize:12,fontWeight:900,color:openBal>=0?"#15803d":"#dc2626",textAlign:"right",fontFamily:"DM Mono,monospace"}}>{fmt(shopId,openBal)}</span>
                  </div>
                  {cfRows.length===0&&<div style={{padding:"40px",textAlign:"center",color:"#94a3b8",fontSize:13}}>No transactions for FY {cfFY}/{String(cfFY+1).slice(2)}.</div>}
                  {withBal.map((r,i)=>(
                    <div key={i} style={{display:"grid",gridTemplateColumns:"90px 120px 80px 1fr 110px 110px 120px",padding:"10px 16px",borderBottom:i<withBal.length-1?"1px solid #f1f5f9":"none",alignItems:"center",background:i%2===0?"white":"#fafafa"}}>
                      <span style={{fontSize:11,color:"#374151",fontFamily:"DM Mono,monospace"}}>{fmtD(r.date)}</span>
                      <span style={{fontSize:11,color:shop.accent,fontWeight:700,fontFamily:"DM Mono,monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.ref||"—"}</span>
                      <span><span style={{background:typeBg[r.type],color:typeColor[r.type],fontSize:10,fontWeight:800,borderRadius:6,padding:"2px 8px"}}>{r.type}</span></span>
                      <span style={{fontSize:12,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:8}}>{r.description}</span>
                      <span style={{fontSize:12,fontWeight:700,color:"#15803d",textAlign:"right",fontFamily:"DM Mono,monospace"}}>{r.credit>0?fmt(shopId,r.credit):"—"}</span>
                      <span style={{fontSize:12,fontWeight:700,color:"#dc2626",textAlign:"right",fontFamily:"DM Mono,monospace"}}>{r.debit>0?fmt(shopId,r.debit):"—"}</span>
                      <span style={{fontSize:12,fontWeight:900,color:r.balance>=0?"#15803d":"#dc2626",textAlign:"right",fontFamily:"DM Mono,monospace"}}>{fmt(shopId,r.balance)}</span>
                    </div>))}
                  {cfRows.length>0&&(
                    <div style={{display:"grid",gridTemplateColumns:"90px 120px 80px 1fr 110px 110px 120px",padding:"10px 16px",alignItems:"center",background:"#eff6ff",borderTop:"2px solid #bfdbfe"}}>
                      <span style={{fontSize:11,color:"#374151",fontFamily:"DM Mono,monospace"}}>31/03/{String(cfFY+1).slice(2)}</span>
                      <span style={{fontSize:11,color:"#64748b",fontFamily:"DM Mono,monospace"}}>CB-{cfFY+1}</span>
                      <span><span style={{background:"#dbeafe",color:"#1d4ed8",fontSize:10,fontWeight:800,borderRadius:6,padding:"2px 8px"}}>Closing</span></span>
                      <span style={{fontSize:12,fontWeight:700,color:"#1d4ed8"}}>Closing Balance</span>
                      <span style={{textAlign:"right"}}>—</span><span style={{textAlign:"right"}}>—</span>
                      <span style={{fontSize:13,fontWeight:900,color:closingBal>=0?"#15803d":"#dc2626",textAlign:"right",fontFamily:"DM Mono,monospace"}}>{fmt(shopId,closingBal)}</span>
                    </div>)}
                </div>
              </div>
            );
          })()}
        </main>
      </div>

      {/* MODALS */}

      {/* ── Mark Delivered Modal ── */}
      {markDeliveredSale&&(
        <MarkDeliveredModal
          sale={markDeliveredSale}
          shopId={shopId}
          shop={shop}
          onClose={()=>setMarkDeliveredSale(null)}
          onConfirm={async(deliveryDate)=>{
            await dbSaveDelivery(shopId, markDeliveredSale.id, deliveryDate);
            // Update local state immediately
            setSalesData(prev=>{
              const updated=(prev[shopId]||[]).map(s=>
                s.id===markDeliveredSale.id ? {...s,deliveryDate,deliveryTime:""} : s
              );
              return {...prev,[shopId]:updated};
            });
            // Update selRow if it's the same sale
            if(selRow&&selRow.id===markDeliveredSale.id){
              setSelRow(r=>({...r,deliveryDate,deliveryTime:""}));
            }
            // Queue Day 0 delivery confirmation message
            const alreadyQueued=await dbMessageExists(shopId,markDeliveredSale.id,"DELIVERY_CONFIRM");
            if(!alreadyQueued){
              await dbAddMessage({
                shopId,
                saleId: markDeliveredSale.id,
                customer: markDeliveredSale.customer,
                phone: markDeliveredSale.phone||markDeliveredSale.contact||"",
                messageType: "DELIVERY_CONFIRM",
                messageBody: `Hi ${markDeliveredSale.customer}, your order has been delivered.\n\nPlease inspect your item upon arrival. If there are any issues such as damage, defects, incorrect items or sizing concerns, please contact us as soon as possible and we will be happy to assist.`,
              });
            }
            setMarkDeliveredSale(null);
          }}
        />
      )}

      {modal==="new-sale"&&(
        <Modal title="✨ New Sale" onClose={()=>setModal(null)} accent={shop.accent}>
          <NewSaleForm
            shopId={shopId} shop={shop}
            onSave={addSale} onClose={()=>setModal(null)}
           lastInvoiceNum={(() => {
              try {
                const stored = localStorage.getItem("ros_lastInv_"+shopId);
                if (stored) return parseInt(stored)||1312;
              } catch{}
              const now = new Date();
              const fyStart = now.getMonth() >= 3 ? new Date(now.getFullYear(), 3, 1) : new Date(now.getFullYear() - 1, 3, 1);
              const fySales = sales.filter(s => {
                const dt = parseDate(s.date);
                return dt && !isNaN(dt.getTime()) && dt >= fyStart;
              });
              if (fySales.length === 0) return 1312;
              const nums = fySales.map(s => {
                const m = (s.id||"").match(/^(?:ROS|IND)(\d{4})\d$/);
                return m ? parseInt(m[1]) : 0;
              }).filter(n => n >= 1313 && n <= 9999);
            })()}
            customers={customers}
            sales={sales}
            shopItems={(shopItems||{})[shopId]||[]}
            onAddShopItem={(item)=>{
              const current=(shopItems||{})[shopId]||[];
              if(current.includes(item)) return;
              dbAddShopItem(shopId,item).then(()=>{
                dbLoadShopItems().then(data=>{if(data)setShopItems({"ros-selections":data["ros-selections"]||[],"ros-hairlines":data["ros-hairlines"]||[],"ros-india":data["ros-india"]||[]});});
              });
              const updated={...(shopItems||{}),[shopId]:[...current,item]};
              setShopItems(updated);
            }}
            onDeleteShopItem={(item)=>{
              const current=(shopItems||{})[shopId]||[];
              const updated={...(shopItems||{}),[shopId]:current.filter(i=>i!==item)};
              setShopItems(updated); dbDeleteShopItem(shopId,item);
            }}
          />
        </Modal>
      )}
      {/* ── IMPORT MODAL — SALES ── */}
      {modal==="import-sales"&&user?.role!=="staff"&&(
        <Modal title="⬇ Import Sales" onClose={()=>setModal(null)} accent={shop.accent}>
          <ImportExportPanel type="import" entity="Sales" shop={shop} shopId={shopId} onClose={()=>setModal(null)}
            onSave={async (rows)=>{
              // Upsert ALL imported rows — updates existing + inserts new
              if(rows.length===0){setModal(null);return;}

              // Update UI: merge rows — imported takes priority over existing
              setSalesData(prev=>{
                const existingMap=new Map((prev[shopId]||[]).map(s=>[s.id,s]));
                rows.forEach(r=>existingMap.set(r.id,{...existingMap.get(r.id)||{},...r}));
                return {...prev,[shopId]:Array.from(existingMap.values())};
              });
              setModal(null);

              // Save ALL rows to Supabase in batches of 50
              const BATCH=50;
              for(let i=0;i<rows.length;i+=BATCH){
                const batch=rows.slice(i,i+BATCH);
                await Promise.all(batch.map(sale=>dbSaveSale(shopId,sale).catch(e=>console.error("Save failed:",sale.id,e))));
              }
              console.log(`✅ Import complete: ${rows.length} rows sent to Supabase`);
            }}/>
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
            shopId={shopId} shop={shop} sale={editRow} customers={customers} isStaff={user?.role==="staff"}
            onSave={(updated)=>{
              // Update UI instantly so sales list reflects new status immediately
              setSalesData(prev=>({...prev,[shopId]:(prev[shopId]||[]).map(x=>x.id===updated.id?{...x,...updated}:x)}));
              setModal(null);setEditRow(null);
              // Persist to Supabase then reload to confirm sync
              dbSaveSale(shopId,updated).then(()=>{
                dbLoadSales(shopId).then(data=>{
                  if(data) setSalesData(prev=>({...prev,[shopId]:data.map(s=>{
                    if(!s) return s;
                    let rawItem=s.item||"",decodedLines=null,displayItem=rawItem;
                    if(rawItem.startsWith("__LINES__:")){const nl=rawItem.indexOf("\n");const jp=nl>=0?rawItem.slice(10,nl):rawItem.slice(10);displayItem=nl>=0?rawItem.slice(nl+1):"";try{decodedLines=JSON.parse(jp);}catch{decodedLines=null;}}
                    const tr=Number(s.taxRate!==undefined?s.taxRate:s.tax_rate!==undefined?s.tax_rate:0)||0;
                    const ti=tr===0?true:(s.taxInclusive!==undefined?s.taxInclusive!==false:true);
                    let sl=decodedLines||s.saleLines||s.sale_lines||null;
                    if(typeof sl==="string"){try{sl=JSON.parse(sl);}catch{sl=null;}}
                    return {...s,item:displayItem,taxRate:tr,taxInclusive:ti,saleLines:Array.isArray(sl)?sl:null,discount:Number(s.discount||s.discount_amt)||0,otherCharges:Number(s.otherCharges||s.other_charges)||0,adjAmt:Number(s.adjAmt||s.adj_amt)||0,adjType:s.adjType||s.adj_type||"",adjDate:s.adjDate||s.adj_date||"",adjNote:s.adjNote||s.adj_note||"",shopInvoiceNo:s.shopInvoiceNo||s.shop_invoice_no||"",refundDate:s.refundDate||s.refund_date||"",exchangeDate:s.exchangeDate||s.exchange_date||""};
                  })}));
                }).catch(()=>{});
              }).catch(err=>console.error("❌ Edit save failed:",err));
            }}
            onClose={()=>{setModal(null);setEditRow(null);}}
          />
        </Modal>
      )}

      {/* ── NEW SHIPMENT MODAL ── */}
      {/* ── VIEW SHIPMENT MODAL ── */}
      {viewLogRow&&(
        <div style={{position:"fixed",inset:0,zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}} onClick={()=>setViewLogRow(null)}/>
          <div style={{position:"relative",background:"white",borderRadius:18,boxShadow:"0 24px 64px rgba(0,0,0,0.18)",width:"100%",maxWidth:480,zIndex:81,overflow:"hidden"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #f1f5f9",background:shop.accent+"10",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <p style={{margin:0,fontSize:10,fontWeight:700,color:shop.accent,textTransform:"uppercase",letterSpacing:"0.06em"}}>Shipment Detail</p>
                <h3 style={{margin:0,fontSize:16,fontWeight:900,color:"#0f172a",fontFamily:"DM Mono,monospace"}}>{viewLogRow.id}</h3>
              </div>
              <button onClick={()=>setViewLogRow(null)} style={{width:30,height:30,borderRadius:"50%",border:"none",background:"#f1f5f9",cursor:"pointer",fontSize:18,color:"#64748b"}}>×</button>
            </div>
            <div style={{padding:"18px 20px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {[
                {l:"Supplier",v:viewLogRow.supplier||"—"},
                {l:"Courier",v:viewLogRow.service||viewLogRow.serviceCustom||"—"},
                {l:"Logistic Agent",v:viewLogRow.agent||viewLogRow.agentCustom||"—"},
                {l:"Tracking No.",v:viewLogRow.track||viewLogRow.trackingNo||"—"},
                {l:"Shipping Cost",v:viewLogRow.cost?(fmt(shopId,Number(viewLogRow.cost))):"—"},
                {l:"Status",v:viewLogRow.status||"—"},
                {l:"Purchase Ref",v:viewLogRow.order||viewLogRow.purchaseId||"—"},
                {l:"Received Date",v:viewLogRow.receivedDate||viewLogRow.disp||"—"},
                {l:"Delivery Address",v:viewLogRow.deliveryAddr||"—",full:true},
                {l:"Notes",v:viewLogRow.notes||"—",full:true},
              ].map(({l,v,full})=>(
                <div key={l} style={full?{gridColumn:"1/-1"}:{}}>
                  <p style={{margin:"0 0 2px",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em"}}>{l}</p>
                  <p style={{margin:0,fontSize:13,color:"#0f172a",fontWeight:600,wordBreak:"break-word"}}>{v}</p>
                </div>
              ))}
            </div>
            {/* Documents */}
            <div style={{padding:"0 20px 16px"}}>
              <DocUploadSection
                bucket="shipment-docs"
                recordUuid={viewLogRow.uuid}
                docs={viewLogRow.documents||[]}
                accent={shop.accent}
                onDocsChange={(newDocs)=>{
                  setViewLogRow(r=>({...r,documents:newDocs}));
                  setLogData(prev=>prev.map(l=>(l.uuid||l.id)===viewLogRow.uuid?{...l,documents:newDocs}:l));
                }}
                onSave={async(newDocs)=>{
                  if(viewLogRow.uuid) await dbSaveLogisticDocs(viewLogRow.uuid,newDocs);
                }}
              />
            </div>

            <div style={{padding:"12px 20px",borderTop:"1px solid #f1f5f9",display:"flex",gap:10}}>
              <button onClick={()=>{setEditLogRow(viewLogRow);setViewLogRow(null);}}
                style={{flex:1,padding:"10px 0",borderRadius:10,border:"none",background:shop.accent,color:"white",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                ✏️ Edit
              </button>
              <button onClick={()=>setViewLogRow(null)}
                style={{flex:1,padding:"10px 0",borderRadius:10,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT SHIPMENT MODAL ── */}
      {editLogRow&&(
        <Modal title="✏️ Edit Shipment" onClose={()=>setEditLogRow(null)} accent={shop.accent}>
          <NewShipmentForm shopId={shopId} shop={shop} purch={purch}
            initialValues={editLogRow}
            onSave={async(form)=>{
              const uuid=editLogRow.uuid||editLogRow.id;
              const result=await dbSaveLogistic(shopId,{...form,_uuid:uuid});
              if(result&&result.error){alert("Update failed: "+result.error);return;}
              const fresh=await dbLoadLogistics(shopId);
              if(fresh) setLogData(fresh);
              setEditLogRow(null);
            }}
            onClose={()=>setEditLogRow(null)}/>
        </Modal>
      )}

      {modal==="new-shipment"&&(
        <Modal title="🚚 New Shipment" onClose={()=>setModal(null)} accent={shop.accent}>
          <NewShipmentForm shopId={shopId} shop={shop} purch={purch}
            onSave={async(form)=>{
              const result = await dbSaveLogistic(shopId, form);
              if(result && result.error){
                alert("Save failed: " + result.error);
                return;
              }
              const fresh = await dbLoadLogistics(shopId);
              if(fresh) setLogData(fresh);
              setModal(null);
            }}
            onClose={()=>setModal(null)}/>
        </Modal>
      )}

      {/* ── NEW PURCHASE MODAL ── */}
      {modal==="new-purchase"&&(
        <Modal title="📦 New Purchase" onClose={()=>setModal(null)} accent={shop.accent}>
          <NewPurchaseForm shopId={shopId} shop={shop} lastPurchNum={(()=>{
                  // Find highest number from purchase_ref fields (e.g. PI-0701 → 701)
                  const nums=purch.map(p=>{
                    const ref=p.purchase_ref||p.id||"";
                    const m=ref.match(/(\d+)$/);
                    return m?parseInt(m[1],10):0;
                  });
                  return nums.length>0?Math.max(...nums):700;
                })()}
            onSave={async(form)=>{
              const {id, purchaseId, idEditing, ...rest} = form;
              const payload = {...rest, purchase_ref: id || purchaseId || ""};
              const result = await dbSavePurchase(shopId, payload);
              if(result && result.error){
                alert("Save failed: " + result.error + "\n\nPlease check the browser console for details.");
                return;
              }
              const fresh = await dbLoadPurchases(shopId);
              if(fresh) setPurchData(fresh);
              setModal(null);
            }}
            onClose={()=>setModal(null)}/>
        </Modal>
      )}

      {/* ── VIEW PURCHASE MODAL ── */}
      {viewPurchRow&&(
        <div style={{position:"fixed",inset:0,zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}} onClick={()=>setViewPurchRow(null)}/>
          <div style={{position:"relative",background:"white",borderRadius:18,boxShadow:"0 24px 64px rgba(0,0,0,0.18)",width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto",zIndex:81}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"white",zIndex:2}}>
              <div>
                <p style={{margin:0,fontSize:10,fontWeight:700,color:shop.accent,textTransform:"uppercase",letterSpacing:"0.06em"}}>Purchase Detail</p>
                <h3 style={{margin:0,fontSize:16,fontWeight:900,color:"#0f172a",fontFamily:"DM Mono,monospace"}}>{viewPurchRow.id}</h3>
              </div>
              <button onClick={()=>setViewPurchRow(null)} style={{width:30,height:30,borderRadius:"50%",border:"none",background:"#f1f5f9",cursor:"pointer",fontSize:18,color:"#64748b"}}>×</button>
            </div>
            <div style={{padding:"18px 20px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
                {[
                  {l:"Date",v:viewPurchRow.date||"—"},
                  {l:"Supplier",v:viewPurchRow.supplier||"—"},
                  {l:"Invoice No.",v:viewPurchRow.invoiceNo||viewPurchRow.invoice_no||"—"},
                  {l:"Batch / Ref",v:viewPurchRow.batch||"—"},
                  {l:"Item",v:viewPurchRow.item||"—"},
                  {l:"Quantity",v:viewPurchRow.qty||"—"},
                  {l:"Amount",v:fmt(shopId,Number(viewPurchRow.total)||0)},
                  {l:"GST / VAT",v:fmt(shopId,Number(viewPurchRow.gst)||0)},
                  {l:"Net Total",v:fmt(shopId,(Number(viewPurchRow.total)||0)+(Number(viewPurchRow.gst)||0))},
                  {l:"Unit Cost",v:viewPurchRow.qty&&viewPurchRow.total?fmt(shopId,((Number(viewPurchRow.total)||0)+(Number(viewPurchRow.gst)||0))/Number(viewPurchRow.qty)):"—"},
                  {l:"Payment By",v:viewPurchRow.payBy||viewPurchRow.pay_by||"—"},
                  {l:"Payment Date",v:viewPurchRow.payDate||viewPurchRow.pay_date||"—"},
                  {l:"Logistic By",v:viewPurchRow.logisticBy||viewPurchRow.logistic_by||"—"},
                  {l:"Logistic Ref",v:viewPurchRow.logisticRef||viewPurchRow.logistic_ref||"—"},
                  {l:"Received Date",v:viewPurchRow.receivedDate||viewPurchRow.received_date||"—"},
                  {l:"Status",v:viewPurchRow.status||"PENDING"},
                  {l:"Remarks",v:viewPurchRow.remarks||"—",full:true},
                ].map(({l,v,full})=>(
                  <div key={l} style={full?{gridColumn:"1/-1"}:{}}>
                    <p style={{margin:"0 0 2px",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em"}}>{l}</p>
                    <p style={{margin:0,fontSize:13,color:"#0f172a",fontWeight:600}}>{v}</p>
                  </div>
                ))}
              </div>
              {/* Net Total highlight */}
              <div style={{background:shop.accentBg,border:"1px solid "+shop.accent+"44",borderRadius:12,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <span style={{fontSize:13,fontWeight:700,color:shop.accentText}}>Net Total (incl. GST)</span>
                <span style={{fontSize:20,fontWeight:900,color:shop.accent,fontFamily:"DM Mono,monospace"}}>
                  {fmt(shopId,(Number(viewPurchRow.total)||0)+(Number(viewPurchRow.gst)||0))}
                </span>
              </div>

              {/* Documents */}
              <DocUploadSection
                bucket="purchase-docs"
                recordUuid={viewPurchRow.uuid}
                docs={viewPurchRow.documents||[]}
                accent={shop.accent}
                onDocsChange={(newDocs)=>{
                  setViewPurchRow(r=>({...r,documents:newDocs}));
                  setPurchData(prev=>prev.map(p=>(p.uuid||p.id)===viewPurchRow.uuid?{...p,documents:newDocs}:p));
                }}
                onSave={async(newDocs)=>{
                  if(viewPurchRow.uuid) await dbSavePurchaseDocs(viewPurchRow.uuid,newDocs);
                }}
              />
            </div>
            <div style={{padding:"12px 20px",borderTop:"1px solid #f1f5f9",display:"flex",gap:10}}>
              <button onClick={()=>{setEditPurchRow(viewPurchRow);setViewPurchRow(null);}}
                style={{flex:1,padding:"10px 0",borderRadius:10,border:"none",background:shop.accent,color:"white",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                ✏️ Edit
              </button>
              <button onClick={()=>setViewPurchRow(null)}
                style={{flex:1,padding:"10px 0",borderRadius:10,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT PURCHASE MODAL ── */}
      {editPurchRow&&(
        <Modal title="✏️ Edit Purchase" onClose={()=>setEditPurchRow(null)} accent={shop.accent}>
          <NewPurchaseForm
            shopId={shopId}
            shop={shop}
            lastPurchNum={0}
            initialValues={editPurchRow}
            onSave={async(form)=>{
              const uuid=editPurchRow.uuid||editPurchRow.id;
              const {id, purchaseId, idEditing, ...rest} = form;
              const payload = {
                ...rest,
                purchase_ref: editPurchRow.id || id || purchaseId || "",
              };
              // Update existing row by UUID
              const {createClient}=await import("https://esm.sh/@supabase/supabase-js@2").catch(()=>({createClient:null}));
              // Use dbSavePurchase with uuid override
              const result = await dbSavePurchase(shopId, {...payload, _uuid: uuid});
              if(result && result.error){
                alert("Update failed: " + result.error);
                return;
              }
              const fresh = await dbLoadPurchases(shopId);
              if(fresh) setPurchData(fresh);
              setEditPurchRow(null);
            }}
            onClose={()=>setEditPurchRow(null)}/>
        </Modal>
      )}

      {/* ══ PRINT STYLE + OVERLAY ══ */}
      {printMode&&invoiceRow&&(()=>{
        const inv=invoiceRow,sym=shop.symbol,total=Number(inv.amount)||0,isIndia=shopId==="ros-india";
        const invAdjAmt=Number(inv.adjAmt)||0;
        const rPct=inv.taxRate!==undefined&&inv.taxRate!==null?inv.taxRate:0;
        const taxRate=rPct/100;
        const inclusive=taxRate===0?true:inv.taxInclusive!==false;
        const subtotal=inclusive?parseFloat((total/(1+taxRate)).toFixed(2)):total;
        const taxAmt=parseFloat((subtotal*taxRate).toFixed(2));
        const grand=parseFloat((subtotal+taxAmt-invAdjAmt).toFixed(2));
        const cgst=parseFloat((taxAmt/2).toFixed(2));
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
              {(()=>{
                const hasLines=Array.isArray(inv.saleLines)&&inv.saleLines.length>0;
                const pdfDiscountAmt=Number(inv.discount)||0;
                const pdfOtherChargesAmt=Number(inv.otherCharges)||0;
                const pdfLines=hasLines
                  ? inv.saleLines
                  : parseLegacyItems(inv.item,inv.qty,subtotal);
                const pdfHasEstimated=!hasLines&&pdfLines.some(l=>l.estimated);
                return(<>
                  {pdfHasEstimated&&(
                    <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:6,padding:"6px 10px",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:11}}>⚠️</span>
                      <span style={{fontSize:9,color:"#92400e",fontWeight:600}}>Unit prices are estimated equally — sale recorded before individual item pricing. Edit &amp; re-enter to set correct individual prices.</span>
                    </div>
                  )}
                  <table style={{width:"100%",borderCollapse:"collapse",marginBottom:20}}>
                    <thead>
                      <tr style={{background:"#0f172a",color:"white"}}>
                        {["SR.","DESCRIPTION","QTY","UNIT PRICE","TOTAL"].map((h,i)=>(
                          <th key={h} style={{padding:"9px 12px",textAlign:i>1?"right":"left",fontSize:11,fontWeight:800,letterSpacing:"0.05em"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pdfLines.map((line,idx)=>{
                        const q=parseFloat(line.qty)||1;
                        const p=parseFloat(line.price)||0;
                        const lineTotal=parseFloat((q*p).toFixed(2));
                        return(
                          <tr key={idx} style={{borderBottom:"1px solid #e2e8f0",background:idx%2===0?"white":"#fafafa"}}>
                            <td style={{padding:"12px",color:"#64748b",fontSize:12}}>{idx+1}</td>
                            <td style={{padding:"12px",fontWeight:700}}>{line.name||"Item "+(idx+1)}</td>
                            <td style={{padding:"12px",textAlign:"right",fontWeight:700}}>{q}</td>
                            <td style={{padding:"12px",textAlign:"right",fontWeight:700}}>{sym}{p.toLocaleString()}</td>
                            <td style={{padding:"12px",textAlign:"right",fontWeight:800,color:shop.accent}}>{sym}{lineTotal.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                      {pdfDiscountAmt>0&&(
                        <tr style={{borderBottom:"1px solid #f1f5f9"}}>
                          <td colSpan={4} style={{padding:"8px 12px",textAlign:"right",fontSize:12,color:"#dc2626",fontWeight:600}}>Discount</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontSize:12,fontWeight:700,color:"#dc2626"}}>− {sym}{pdfDiscountAmt.toLocaleString()}</td>
                        </tr>
                      )}
                      {pdfOtherChargesAmt>0&&(
                        <tr style={{borderBottom:"1px solid #f1f5f9"}}>
                          <td colSpan={4} style={{padding:"8px 12px",textAlign:"right",fontSize:12,color:"#64748b",fontWeight:600}}>{inv.otherChargesLabel||"Other Charges"}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontSize:12,fontWeight:700,color:"#374151"}}>+ {sym}{pdfOtherChargesAmt.toLocaleString()}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>);
              })()}

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
                  {invAdjAmt>0&&(
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <span style={{fontSize:13,color:"#d97706"}}>{inv.adjType||"Adjustment"}</span>
                      <span style={{fontSize:13,fontWeight:600,color:"#d97706"}}>{sym}-{Number(invAdjAmt).toLocaleString()}</span>
                    </div>
                  )}
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
        const rPct=inv.taxRate!==undefined&&inv.taxRate!==null?inv.taxRate:0;
        const tR=rPct/100;
        const inc=tR===0?true:inv.taxInclusive!==false;
        const ent=Number(inv.amount)||0;
        const pdfAdjAmt=Number(inv.adjAmt)||0;
        const sub=inc?parseFloat((ent/(1+tR)).toFixed(2)):ent;
        const tax=parseFloat((sub*tR).toFixed(2));
        const grd=parseFloat((sub+tax-pdfAdjAmt).toFixed(2));
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
              {(()=>{
                const hasLines=Array.isArray(invoiceRow.saleLines)&&invoiceRow.saleLines.length>0;
                const invDiscountAmt=Number(invoiceRow.discount)||0;
                const invOtherChargesAmt=Number(invoiceRow.otherCharges)||0;
                const invLines=hasLines
                  ? invoiceRow.saleLines
                  : parseLegacyItems(invoiceRow.item,invoiceRow.qty,invSubtotal);
                const invHasEstimated=!hasLines&&invLines.some(l=>l.estimated);
                return(<>
                  {invHasEstimated&&(
                    <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"8px 12px",marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:12}}>⚠️</span>
                      <span style={{fontSize:10,color:"#92400e",fontWeight:600}}>Unit prices are estimated equally — sale recorded before individual item pricing. Edit &amp; re-enter the sale to set correct individual prices.</span>
                    </div>
                  )}
                  <table style={{width:"100%",borderCollapse:"collapse",marginBottom:20}}>
                    <thead>
                      <tr style={{background:"#0f172a",color:"white"}}>
                        {["SR.","DESCRIPTION","QTY","UNIT PRICE","TOTAL"].map((h,hi)=>(
                          <th key={h} style={{padding:"10px 14px",textAlign:hi===0||hi===1?"left":"right",fontSize:11,fontWeight:800,letterSpacing:"0.06em"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invLines.map((line,idx)=>{
                        const q=parseFloat(line.qty)||1;
                        const p=parseFloat(line.price)||0;
                        const lineTotal=parseFloat((q*p).toFixed(2));
                        return(
                          <tr key={idx} style={{borderBottom:"1px solid #e2e8f0",background:idx%2===0?"white":"#fafafa"}}>
                            <td style={{padding:"12px 14px",fontSize:13,color:"#64748b"}}>{idx+1}</td>
                            <td style={{padding:"12px 14px"}}>
                              <p style={{margin:0,fontWeight:700,fontSize:13,color:"#0f172a"}}>{line.name||"Item "+(idx+1)}</p>
                            </td>
                            <td style={{padding:"12px 14px",textAlign:"right",fontWeight:700}}>{q}</td>
                            <td style={{padding:"12px 14px",textAlign:"right",fontWeight:700}}>{fmt(shopId,p)}</td>
                            <td style={{padding:"12px 14px",textAlign:"right",fontWeight:800,color:shop.accent}}>{fmt(shopId,lineTotal)}</td>
                          </tr>
                        );
                      })}
                      {invDiscountAmt>0&&(
                        <tr style={{borderBottom:"1px solid #f1f5f9"}}>
                          <td colSpan={4} style={{padding:"8px 14px",textAlign:"right",fontSize:12,color:"#dc2626",fontWeight:600}}>Discount</td>
                          <td style={{padding:"8px 14px",textAlign:"right",fontSize:12,fontWeight:700,color:"#dc2626"}}>− {fmt(shopId,invDiscountAmt)}</td>
                        </tr>
                      )}
                      {invOtherChargesAmt>0&&(
                        <tr style={{borderBottom:"1px solid #f1f5f9"}}>
                          <td colSpan={4} style={{padding:"8px 14px",textAlign:"right",fontSize:12,color:"#64748b",fontWeight:600}}>{invoiceRow.otherChargesLabel||"Other Charges"}</td>
                          <td style={{padding:"8px 14px",textAlign:"right",fontSize:12,fontWeight:700,color:"#374151"}}>+ {fmt(shopId,invOtherChargesAmt)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>);
              })()}

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
                    const previewAdjAmt = Number(invoiceRow.adjAmt)||0;
                    const isIndia  = shopId==="ros-india";
                    const rateDisplay = (invoiceRow.taxRate!==undefined&&invoiceRow.taxRate!==null ? invoiceRow.taxRate : 0);
                    const taxRate  = rateDisplay / 100;
                    // If taxRate is 0, always treat as inclusive (no tax added)
                    const inclusive= taxRate===0 ? true : invoiceRow.taxInclusive !== false;
                    // subtotal = pre-tax amount; grand = total payable
                    const subtotal = inclusive
                      ? parseFloat((entered / (1 + taxRate)).toFixed(2))
                      : entered;
                    const taxAmt   = parseFloat((subtotal * taxRate).toFixed(2));
                    const grand    = parseFloat((subtotal + taxAmt - previewAdjAmt).toFixed(2));
                    const cgst     = parseFloat((taxAmt / 2).toFixed(2));
                    const sgst     = parseFloat((taxAmt / 2).toFixed(2));
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
                    const adjRows=previewAdjAmt>0?[["Post-Sale Adj. ("+(invoiceRow.adjType||"Adjustment")+")",-previewAdjAmt]]:[];
                    const allRows=[...rows,...adjRows];
                    return <>
                      {/* Tax mode badge */}
                      <div style={{marginBottom:8}}>
                        <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:999,
                          background: rateDisplay===0?"#f8fafc":inclusive?"#f0fdf4":"#eff6ff",
                          color:      rateDisplay===0?"#64748b":inclusive?"#15803d":"#1d4ed8",
                          border:     "1px solid "+(rateDisplay===0?"#e2e8f0":inclusive?"#bbf7d0":"#bfdbfe")}}>
                          {rateDisplay===0?"No Tax":(inclusive?"Tax Inclusive":"Tax Exclusive")+" · "+rateDisplay+"%"}
                        </span>
                      </div>
                      {allRows.map(([k,v])=>(
                        <div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                          <span style={{fontSize:13,color:v<0?"#d97706":"#64748b"}}>{k}</span>
                          <span style={{fontSize:13,fontWeight:600,color:v<0?"#d97706":"#374151"}}>{v<0?"\u2212 "+fmt(shopId,Math.abs(v)):fmt(shopId,v)}</span>
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
          onClick={()=>{setSelRow(null);setConfirmDelete(false);}}>
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
                {user?.role!=="staff"&&(
                  <button onClick={()=>setConfirmDelete(true)}
                    style={{padding:"7px 14px",borderRadius:9,border:"1px solid #fca5a5",
                      background:"#fff5f5",color:"#dc2626",fontWeight:700,fontSize:13,
                      cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
                    🗑 Delete
                  </button>
                )}
                <button onClick={()=>{setSelRow(null);setConfirmDelete(false);}}
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
                  <p style={{margin:"0 0 4px",fontSize:12,color:"#64748b"}}>{selRow.phone||selRow.contact||"—"}</p>
                  <span style={{display:"inline-flex",alignItems:"center",gap:4,
                    background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:999,
                    padding:"2px 10px",fontSize:10,fontWeight:700,color:"#1d4ed8",
                    marginBottom:8,letterSpacing:"0.02em"}}>
                    📱 {selRow.phoneSavedOn||"UK 888"}
                  </span>
                  {shopId==="ros-india"&&selRow.paidBy&&(
                    <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #f1f5f9"}}>
                      <p style={{margin:"0 0 2px",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em"}}>&#x1F4B8; Paid By</p>
                      <p style={{margin:0,fontSize:13,fontWeight:700,color:"#374151"}}>{selRow.paidBy}</p>
                    </div>
                  )}
                  <div style={{marginTop:4,paddingTop:8,borderTop:"1px solid #f1f5f9"}}>
                    <p style={{margin:"0 0 2px",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em"}}>📍 Address</p>
                    <p style={{margin:0,fontSize:12,color:selRow.address?"#374151":"#cbd5e1",lineHeight:1.5}}>{selRow.address||"—"}</p>
                  </div>
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
                      {fmt(shopId,(Number(selRow.amount)||0)-(Number(selRow.adjAmt)||0))}
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
                      {fmt(shopId,(Number(selRow.amount)||0)-(Number(selRow.adjAmt)||0))}
                    </span>
                  </div>
                  {/* Fulfillment Timeline */}
                  {(()=>{
                    const hasDispatch=!!selRow.sentDate;
                    const hasDelivery=!!selRow.deliveryDate;
                    const hasReturnReq=!!selRow.returnReqDate;
                    const hasReturnRcvd=!!selRow.returnRcvd;
                    const hasRefund=!!selRow.refundAmt&&Number(selRow.refundAmt)>0;
                    const isFulfilled=(selRow.ful||selRow.status)==="FULFILLED";
                    const timelineItems=[
                      hasDispatch&&{icon:"🚚",label:"Dispatched",date:formatDate(selRow.sentDate),color:"#15803d",bg:"#f0fdf4",border:"#bbf7d0"},
                      hasDelivery&&{icon:"✅",label:"Delivered",date:formatDate(selRow.deliveryDate)+(selRow.deliveryTime?" · "+selRow.deliveryTime:""),color:"#0369a1",bg:"#f0f9ff",border:"#7dd3fc"},
                      hasReturnReq&&{icon:"↩️",label:"Return Requested",date:formatDate(selRow.returnReqDate),color:"#c2410c",bg:"#fff7ed",border:"#fed7aa"},
                      hasReturnRcvd&&{icon:"📬",label:"Return Received",date:formatDate(selRow.returnRcvd),color:"#991b1b",bg:"#fff5f5",border:"#fecaca"},
                      hasRefund&&{icon:"💸",label:"Refunded",date:fmt(shopId,Number(selRow.refundAmt)),color:"#6b21a8",bg:"#f5f3ff",border:"#ddd6fe"},
                    ].filter(Boolean);
                    return(
                      <div style={{marginTop:10}}>
                        {/* Tracking pill + Mark Delivered button */}
                        {selRow.trackingNo&&(
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                            <a href={"https://www.royalmail.com/track-your-item#/tracking-results/"+selRow.trackingNo.trim()}
                              target="_blank" rel="noreferrer"
                              style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:999,background:"#f0f9ff",border:"1px solid #bae6fd",color:"#0369a1",fontSize:11,fontWeight:700,textDecoration:"none"}}>
                              📦 {selRow.trackingNo}
                              <span style={{fontSize:10,opacity:0.7}}>↗</span>
                            </a>
                            {isFulfilled&&!hasDelivery&&(
                              <button onClick={()=>setMarkDeliveredSale(selRow)}
                                style={{padding:"5px 14px",borderRadius:999,border:"none",background:"#16a34a",color:"white",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px #16a34a33"}}>
                                ✅ Mark Delivered
                              </button>
                            )}
                          </div>
                        )}
                        {!selRow.trackingNo&&isFulfilled&&!hasDelivery&&(
                          <button onClick={()=>setMarkDeliveredSale(selRow)}
                            style={{display:"block",width:"100%",marginBottom:8,padding:"8px 0",borderRadius:10,border:"1.5px dashed #16a34a",background:"#f0fdf4",color:"#16a34a",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                            ✅ Mark Delivered
                          </button>
                        )}
                        {timelineItems.map((item,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:i<timelineItems.length-1?6:0}}>
                            {i<timelineItems.length-1&&(
                              <div style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"center",width:24,flexShrink:0}}>
                                <div style={{width:24,height:24,borderRadius:"50%",background:item.bg,border:"1.5px solid "+item.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>{item.icon}</div>
                                <div style={{width:2,height:10,background:"#e2e8f0",margin:"1px 0"}}/>
                              </div>
                            )}
                            {i===timelineItems.length-1&&(
                              <div style={{width:24,height:24,borderRadius:"50%",background:item.bg,border:"1.5px solid "+item.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0}}>{item.icon}</div>
                            )}
                            <div style={{flex:1,background:item.bg,border:"1px solid "+item.border,borderRadius:8,padding:"5px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <span style={{fontSize:11,fontWeight:700,color:item.color}}>{item.label}</span>
                              <span style={{fontSize:11,fontWeight:600,color:item.color}}>{item.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* ── LINE ITEMS ── */}
              {(()=>{
                const hasLines=Array.isArray(selRow.saleLines)&&selRow.saleLines.length>0;
                const grandTotal=(Number(selRow.amount)||0)-(Number(selRow.adjAmt)||0);
                const discountAmt=Number(selRow.discount)||0;
                const otherChargesAmt=Number(selRow.otherCharges)||0;
                const taxRatePct=selRow.taxRate!=null?selRow.taxRate:0;
                const legacySubtotal=taxRatePct>0&&selRow.taxInclusive!==false
                  ? parseFloat((grandTotal/(1+taxRatePct/100)).toFixed(2))
                  : grandTotal;
                const displayLines=hasLines
                  ? selRow.saleLines
                  : parseLegacyItems(selRow.item,selRow.qty,legacySubtotal);
                const hasEstimated=!hasLines&&displayLines.some(l=>l.estimated);
                return(
                  <div style={{border:"1px solid #e2e8f0",borderRadius:14,overflow:"hidden",marginBottom:20}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:"#f8fafc",borderBottom:"1px solid #e2e8f0"}}>
                      <span style={{fontWeight:800,fontSize:14,color:"#0f172a"}}>Line Items</span>
                      <span style={{fontSize:12,color:"#94a3b8"}}>{displayLines.length} item{displayLines.length!==1?"s":""}</span>
                    </div>
                    {hasEstimated&&(
                      <div style={{padding:"8px 14px",background:"#fffbeb",borderBottom:"1px solid #fde68a",display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:13}}>⚠️</span>
                        <span style={{fontSize:11,color:"#92400e",fontWeight:600}}>Unit prices are estimated equally — this sale was recorded before individual item pricing. Delete &amp; re-enter to set correct prices per item.</span>
                      </div>
                    )}
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead>
                        <tr style={{background:"#f8fafc"}}>
                          {["Description","QTY","Unit Price","Total"].map(h=>(
                            <th key={h} style={{padding:"9px 14px",textAlign:h==="Description"?"left":"right",fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayLines.map((line,idx)=>{
                          const q=parseFloat(line.qty)||1;
                          const p=parseFloat(line.price)||0;
                          const lineTotal=parseFloat((q*p).toFixed(2));
                          return(
                            <tr key={idx} style={{borderTop:"1px solid #f1f5f9",background:idx%2===0?"white":"#fafafa"}}>
                              <td style={{padding:"11px 14px"}}>
                                <p style={{margin:0,fontWeight:700,fontSize:13,color:"#1e293b"}}>{line.name||"Item "+(idx+1)}</p>
                              </td>
                              <td style={{padding:"11px 14px",textAlign:"right",fontWeight:600,color:"#374151"}}>{q}</td>
                              <td style={{padding:"11px 14px",textAlign:"right",fontWeight:600,color:"#374151"}}>{fmt(shopId,p)}</td>
                              <td style={{padding:"11px 14px",textAlign:"right",fontWeight:800,color:shop.accent}}>{fmt(shopId,lineTotal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {/* Totals footer */}
                    <div style={{padding:"12px 16px",borderTop:"1px solid #e2e8f0",background:"#f8fafc"}}>
                      {discountAmt>0&&(
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:12,color:"#dc2626"}}>Discount</span>
                          <span style={{fontSize:12,fontWeight:600,color:"#dc2626"}}>− {fmt(shopId,discountAmt)}</span>
                        </div>
                      )}
                      {otherChargesAmt>0&&(
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:12,color:"#64748b"}}>{selRow.otherChargesLabel||"Other Charges"}</span>
                          <span style={{fontSize:12,fontWeight:600,color:"#374151"}}>+ {fmt(shopId,otherChargesAmt)}</span>
                        </div>
                      )}
                      {taxRatePct>0&&(
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{fontSize:12,color:"#64748b"}}>GST / Tax ({taxRatePct}%)</span>
                          <span style={{fontSize:12,fontWeight:600,color:"#374151"}}>{fmt(shopId,parseFloat((grandTotal*(taxRatePct/100)/(1+taxRatePct/100)).toFixed(2)))}</span>
                        </div>
                      )}
                      {(Number(selRow.adjAmt)||0)>0&&(
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:12,color:"#d97706"}}>{selRow.adjType||"Adjustment"}</span>
                          <span style={{fontSize:12,fontWeight:600,color:"#d97706"}}>\u2212 {fmt(shopId,Number(selRow.adjAmt)||0)}</span>
                        </div>
                      )}
                      <div style={{display:"flex",justifyContent:"space-between",borderTop:"2px solid #0f172a",paddingTop:8}}>
                        <span style={{fontSize:14,fontWeight:900,color:"#0f172a"}}>Grand Total</span>
                        <span style={{fontSize:15,fontWeight:900,color:shop.accent}}>{fmt(shopId,grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── NOTES + TOTALS ── */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
                {/* notes */}
                <div style={{border:"1px solid #e2e8f0",borderRadius:14,padding:"14px 16px"}}>
                  <p style={{margin:"0 0 8px",fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>Notes</p>
                  <p style={{margin:0,fontSize:13,color:"#64748b",fontStyle:selRow.rem?"normal":"italic"}}>{selRow.rem||"—"}</p>
                  {selRow.tag&&<div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:4}}>{parseTags(selRow.tag).map(t=><Badge key={t} l={t}/>)}</div>}
                </div>
                {/* totals */}
                <div style={{border:"1px solid #e2e8f0",borderRadius:14,padding:"14px 16px"}}>
                  {(()=>{
                    const amt=(Number(selRow.amount)||0)-(Number(selRow.adjAmt)||0);
                    const rPct=selRow.taxRate!=null?selRow.taxRate:0;
                    const r=rPct/100;
                    // amount is always the final grand total as entered/saved
                    const sub=r>0?(selRow.taxInclusive!==false?parseFloat((amt/(1+r)).toFixed(2)):amt):amt;
                    const taxAmt=r>0?parseFloat((sub*r).toFixed(2)):0;
                    const grand=r>0?parseFloat((sub+taxAmt).toFixed(2)):amt;
                    const discAmt=Number(selRow.discount)||0;
                    const otherAmt=Number(selRow.otherCharges)||0;
                    return(<>
                      {discAmt>0&&(
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{fontSize:12,color:"#dc2626"}}>Discount</span>
                          <span style={{fontSize:12,fontWeight:600,color:"#dc2626"}}>− {fmt(shopId,discAmt)}</span>
                        </div>
                      )}
                      {otherAmt>0&&(
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{fontSize:12,color:"#64748b"}}>{selRow.otherChargesLabel||"Other Charges"}</span>
                          <span style={{fontSize:12,fontWeight:600,color:"#374151"}}>+ {fmt(shopId,otherAmt)}</span>
                        </div>
                      )}
                      {rPct>0&&(
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{fontSize:12,color:"#64748b"}}>GST / Tax ({rPct}%)</span>
                          <span style={{fontSize:12,fontWeight:600,color:"#374151"}}>{fmt(shopId,taxAmt)}</span>
                        </div>
                      )}
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,paddingBottom:10,borderBottom:"1px solid #f1f5f9"}}>
                        <span style={{fontSize:12,color:"#64748b"}}>Balance Due</span>
                        <span style={{fontSize:12,fontWeight:700,color:"#15803d"}}>{shop.symbol}0</span>
                      </div>
                      {(Number(selRow.adjAmt)||0)>0&&(
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{fontSize:12,color:"#d97706"}}>{selRow.adjType||"Adjustment"}</span>
                          <span style={{fontSize:12,fontWeight:600,color:"#d97706"}}>\u2212 {fmt(shopId,Number(selRow.adjAmt)||0)}</span>
                        </div>
                      )}
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{fontSize:15,fontWeight:800,color:"#0f172a"}}>Grand Total</span>
                        <span style={{fontSize:16,fontWeight:900,color:shop.accent}}>{fmt(shopId,amt)}</span>
                      </div>
                    </>);
                  })()}
                </div>
              </div>

              {/* ── FOOTER ACTIONS ── */}
              {confirmDelete?(
                /* ── CONFIRM DELETE PANEL ── */
                <div style={{
                  background:"#fff5f5",border:"2px solid #fca5a5",borderRadius:14,
                  padding:"18px 20px",display:"flex",flexDirection:"column",gap:14,
                }}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                    <span style={{fontSize:28,flexShrink:0}}>⚠️</span>
                    <div>
                      <p style={{margin:"0 0 4px",fontWeight:900,fontSize:15,color:"#991b1b"}}>
                        Delete Sale {selRow.id}?
                      </p>
                      <p style={{margin:0,fontSize:13,color:"#dc2626"}}>
                        This will permanently remove the sale for <strong>{selRow.customer}</strong> ({fmt(shopId,selRow.amount)}) from the database. This cannot be undone.
                      </p>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                    <button onClick={()=>setConfirmDelete(false)}
                      style={{padding:"10px 24px",borderRadius:10,border:"1px solid #e2e8f0",
                        background:"white",color:"#374151",fontWeight:700,fontSize:14,
                        cursor:"pointer",fontFamily:"inherit"}}>
                      ← Cancel
                    </button>
                    <button onClick={()=>{
                        const id=selRow.id;
                        setSalesData(prev=>({
                          ...prev,
                          [shopId]:(prev[shopId]||[]).filter(x=>x.id!==id)
                        }));
                        dbDeleteSale(id,shopId).catch(()=>{});
                        setSelRow(null);
                        setConfirmDelete(false);
                      }}
                      style={{padding:"10px 24px",borderRadius:10,border:"none",
                        background:"#dc2626",color:"white",fontWeight:800,fontSize:14,
                        cursor:"pointer",fontFamily:"inherit",
                        boxShadow:"0 4px 14px rgba(220,38,38,0.35)"}}>
                      🗑 Yes, Delete Sale
                    </button>
                  </div>
                </div>
              ):(
                <div style={{display:"flex",justifyContent:"flex-end"}}>
                  <button onClick={()=>{setSelRow(null);setConfirmDelete(false);}}
                    style={{padding:"10px 28px",borderRadius:11,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
                    Close
                  </button>
                </div>
              )}
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
const ImportExportPanel=({type,entity,shop,data,onClose,shopId,onSave})=>{
  const [dragOver,setDragOver]=useState(false);
  const [fileName,setFileName]=useState(null);
  const [fileObj,setFileObj]=useState(null);
  const [fileFmt,setFileFmt]=useState("CSV");
  const [importing,setImporting]=useState(false);
  const [importResult,setImportResult]=useState(null); // {ok:n, skip:n, errors:[]}
  const [detectedCols,setDetectedCols]=useState(null); // show what columns were found

  const handleFileSelect=(f)=>{
    if(!f)return;
    setFileName(f.name);
    setFileObj(f);
    setImportResult(null);
    setDetectedCols(null);
    // Peek at headers to show user what was detected
    const reader=new FileReader();
    reader.onload=(e)=>{
      try{
        const firstLines=e.target.result.split('\n').slice(0,2).join('\n');
        const hdrs=firstLines.split('\n')[0].split(',').map(h=>h.replace(/^"|"$/g,"").trim());
        setDetectedCols(hdrs);
      }catch{}
    };
    reader.readAsText(f);
  };

  /* ── Parse CSV text robustly (handles quoted fields with commas/newlines) ── */
  const parseCSV=(text)=>{
    const rows=[];
    let row=[],field="",inQ=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i],nx=text[i+1];
      if(inQ){
        if(ch==='"'&&nx==='"'){field+='"';i++;}
        else if(ch==='"'){inQ=false;}
        else{field+=ch;}
      } else {
        if(ch==='"'){inQ=true;}
        else if(ch===','){row.push(field.trim());field="";}
        else if(ch==='\n'||(ch==='\r'&&nx==='\n')){
          row.push(field.trim());field="";
          if(row.some(c=>c!==""))rows.push(row);
          row=[];
          if(ch==='\r')i++;
        } else {field+=ch;}
      }
    }
    if(field||row.length)row.push(field.trim());
    if(row.some(c=>c!==""))rows.push(row);
    return rows;
  };

  const handleImport=()=>{
    if(!fileObj){alert("Please select a file first.");return;}
    if(!onSave){alert("Import not configured for this section.");return;}
    setImporting(true);

    const isXlsx=fileObj.name.toLowerCase().endsWith(".xlsx")||fileObj.name.toLowerCase().endsWith(".xls");

    const processRows=(rows)=>{
      try{
        if(rows.length<2){alert("File appears to be empty or has no data rows.");setImporting(false);return;}
        const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
        const headers=rows[0].map(h=>norm(h));
        const dataRows=rows.slice(1);
        console.log("Import headers:", headers);
        const col=(...names)=>{
          const needles=names.map(n=>norm(n));
          for(const n of needles){const idx=headers.indexOf(n);if(idx>=0)return idx;}
          for(const n of needles){const idx=headers.findIndex(h=>h.includes(n));if(idx>=0)return idx;}
          return -1;
        };
        const idxId       = col("shopinv","Shop Inv.","invoiceno","Invoice No.","saleid","Sale ID");
        const idxDate     = col("date");
        const idxCust     = col("customername","customer");
        const idxAddressee= col("addressee");
        const idxAddress  = col("address");
        const idxContact  = col("contactno","contact","phone");
        const idxItem     = col("item","description");
        const idxQty      = col("quantity","qty");
        const idxPrice    = col("priceexcltax","price");
        const idxTotal    = col("total","grandtotal","amount");
        const idxPayment  = col("paymentmethod","payment","pay");
        const idxSentDate = col("dispatchdate","sentdate","dispatch");
        const idxReturn   = col("returnreceived","returnrcvd");
        const idxRefund   = col("refund");
        const idxTag      = col("tag");
        const idxRemarks  = col("remarks","notes","rem");
        const idxStatus   = col("status","ful","delivery","fulfil");
        const get=(row,idx)=>idx>=0?String(row[idx]||"").trim():"";
        const cleanNum=s=>parseFloat(String(s||"").replace(/[^0-9.\-]/g,""))||0;
        let ok=0,skip=0;
        const imported=[];
        dataRows.forEach((row,i)=>{
          if(row.every(c=>!c&&c!==0)){return;}
          const customer=get(row,idxCust);
          if(!customer){skip++;return;}
          const id=get(row,idxId)||("IMP-"+Date.now()+"-"+i);
          const amount=cleanNum(get(row,idxTotal))||cleanNum(get(row,idxPrice));
          const statusRaw=get(row,idxStatus);
          const ful=statusRaw||(shopId==="ros-india"?"ORDER NOT PLACED":"PENDING");
          imported.push({
            id, customer,
            date:        get(row,idxDate)||new Date().toISOString().slice(0,10),
            addressee:   get(row,idxAddressee),
            address:     get(row,idxAddress),
            contact:     get(row,idxContact),
            phone:       get(row,idxContact),
            item:        get(row,idxItem),
            qty:         get(row,idxQty)||"1",
            amount,
            pay:         get(row,idxPayment)||"SHOP",
            payBy:       get(row,idxPayment)||"SHOP",
            ful, status: ful,
            rem:         get(row,idxRemarks),
            remarks:     get(row,idxRemarks),
            tag:         get(row,idxTag),
            sentDate:    get(row,idxSentDate),
            refundAmt:   cleanNum(get(row,idxRefund)),
            returnRcvd:  get(row,idxReturn),
            taxRate:     0,
            taxInclusive:true,
            invoiceNo:   id,
          });
          ok++;
        });
        setImportResult({ok,skip,errors:[]});
        if(ok>0){onSave(imported);}
        else{alert("No valid rows found. Make sure the file has a Customer Name column.");}
      }catch(err){alert("Error processing file: "+err.message);console.error(err);}
      setImporting(false);
    };

    if(isXlsx){
      const loadXLSX=()=>new Promise((res,rej)=>{
        if(window.XLSX){res(window.XLSX);return;}
        const s=document.createElement("script");
        s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
        s.onload=()=>res(window.XLSX);
        s.onerror=()=>rej(new Error("Failed to load XLSX library"));
        document.head.appendChild(s);
      });
      const reader=new FileReader();
      reader.onload=(e)=>{
        loadXLSX().then(XLSX=>{
          const wb=XLSX.read(e.target.result,{type:"array"});
          const ws=wb.Sheets[wb.SheetNames[0]];
          const raw=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:""});
          processRows(raw);
        }).catch(err=>{alert("Could not load Excel reader: "+err.message);setImporting(false);});
      };
      reader.readAsArrayBuffer(fileObj);
    } else {
      const reader=new FileReader();
      reader.onload=(e)=>processRows(parseCSV(e.target.result));
      reader.onerror=()=>{alert("Could not read file.");setImporting(false);};
      reader.readAsText(fileObj);
    }
  };

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
    const rate=((s.taxRate!==undefined&&s.taxRate!==null?s.taxRate:0)/100);
    const inc=rate===0?true:s.taxInclusive!==false;
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
        onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)handleFileSelect(f);}}
        style={{
          border:"2px dashed "+(dragOver?shop.accent:"#cbd5e1"),
          borderRadius:14,padding:"40px 24px",textAlign:"center",
          background:dragOver?shop.accentBg:"#f8fafc",
          transition:"all 0.18s",cursor:"pointer",
        }}
        onClick={()=>document.getElementById("imp-file-"+entity).click()}>
        <input id={"imp-file-"+entity} type="file" accept=".csv,.xlsx,.xls"
          style={{display:"none"}}
          onChange={e=>handleFileSelect(e.target.files[0]||null)}/>
        <div style={{fontSize:40,marginBottom:10}}>{importResult?"✅":fileName?"📄":"📂"}</div>
        <p style={{margin:0,fontWeight:800,fontSize:15,color:fileName?shop.accent:"#374151"}}>
          {importResult?`Imported ${importResult.ok} records`:fileName||"Drop your CSV file here"}
        </p>
        <p style={{margin:"4px 0 0",fontSize:12,color:"#94a3b8"}}>
          {importResult&&importResult.skip>0?`${importResult.skip} rows skipped`:fileName?"File ready to import":"or click to browse · CSV or Excel (.xlsx) accepted"}
        </p>
      </div>

      {/* detected columns preview */}
      {detectedCols&&!importResult&&(
        <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"10px 14px"}}>
          <p style={{margin:"0 0 6px",fontSize:11,fontWeight:800,color:"#15803d",textTransform:"uppercase",letterSpacing:"0.05em"}}>✅ Columns detected ({detectedCols.length})</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {detectedCols.map((c,i)=>(
              <span key={i} style={{fontSize:10,fontWeight:600,color:"#15803d",background:"white",border:"1px solid #bbf7d0",borderRadius:6,padding:"2px 8px"}}>{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* import result */}
      {importResult&&(
        <div style={{background:importResult.ok>0?"#f0fdf4":"#fef2f2",border:"1px solid "+(importResult.ok>0?"#bbf7d0":"#fecaca"),borderRadius:10,padding:"12px 14px"}}>
          <p style={{margin:0,fontWeight:800,fontSize:13,color:importResult.ok>0?"#15803d":"#dc2626"}}>
            {importResult.ok>0?`✅ ${importResult.ok} records imported successfully`:"❌ No records imported"}
          </p>
          {importResult.skip>0&&<p style={{margin:"4px 0 0",fontSize:12,color:"#64748b"}}>{importResult.skip} rows skipped (blank/invalid)</p>}
        </div>
      )}

      {/* actions */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <button
          onClick={handleImport}
          disabled={!fileName||importing||!!importResult}
          style={{padding:"12px 0",borderRadius:11,border:"none",
            background:importResult?"#10b981":fileName&&!importing?shop.accent:"#e2e8f0",
            color:fileName&&!importing?"white":"#94a3b8",fontWeight:800,fontSize:14,
            cursor:fileName&&!importing&&!importResult?"pointer":"default",fontFamily:"inherit",
            boxShadow:fileName&&!importing?"0 4px 14px "+shop.accent+"44":"none",
            transition:"all 0.2s"}}>
          {importing?"⏳ Processing…":importResult?"✅ Done":"⬆ Import Now"}
        </button>
        <button onClick={onClose}
          style={{padding:"12px 0",borderRadius:11,border:"1px solid #e2e8f0",
            background:"white",color:"#374151",fontWeight:700,fontSize:14,
            cursor:"pointer",fontFamily:"inherit"}}>
          {importResult?"Close":"Cancel"}
        </button>
      </div>
    </div>
  );
};
/* ══════════════════════════════════════════════════════
   NEW PURCHASE FORM
══════════════════════════════════════════════════════ */
/* ── TagPicker: multi-tag chip selector used in EditSaleForm & NewSaleForm ── */
const SALE_TAG_PRESETS=["Advance Sale","Budget Friendly","Bulk Sale","Discounted Sale","Exchange Sale","Final Payment Sale","Normal Sale"];
const parseTags=str=>str?str.split(",").map(t=>t.trim()).filter(Boolean):[];
const joinTags=arr=>arr.join(", ");
const TagPicker=({value,onChange,accent,accentBg,inp,fo,bl,lbl})=>{
  const tags=parseTags(value);
  const [custom,setCustom]=React.useState("");
  const toggle=(tag)=>{
    const next=tags.includes(tag)?tags.filter(t=>t!==tag):[...tags,tag];
    onChange(joinTags(next));
  };
  const addCustom=()=>{
    const t=custom.trim();
    if(!t)return;
    if(!tags.includes(t)) onChange(joinTags([...tags,t]));
    setCustom("");
  };
  return(
    <div style={{marginBottom:12}}>
      <label style={lbl}>Sale Type / Tags</label>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
        {SALE_TAG_PRESETS.map(tag=>{
          const active=tags.includes(tag);
          return(
            <button key={tag} type="button" onClick={()=>toggle(tag)} style={{
              padding:"4px 12px",borderRadius:999,fontSize:11,fontWeight:700,cursor:"pointer",
              border:active?"2px solid "+accent:"1px solid #e2e8f0",
              background:active?accent:"white",
              color:active?"white":"#475569",
              transition:"all 0.12s",
            }}>{tag}</button>
          );
        })}
      </div>
      {tags.filter(t=>!SALE_TAG_PRESETS.includes(t)).map(t=>(
        <span key={t} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:700,background:accentBg,color:accent,border:"1px solid "+accent+"44",marginRight:4,marginBottom:4}}>
          {t}
          <span onClick={()=>toggle(t)} style={{cursor:"pointer",fontWeight:900,fontSize:13,lineHeight:1,opacity:0.7}}>×</span>
        </span>
      ))}
      <div style={{display:"flex",gap:6,marginTop:4}}>
        <input value={custom} onChange={e=>setCustom(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addCustom();}}}
          placeholder="Add custom tag… (press Enter)" style={{...inp,flex:1,fontSize:12}}
          onFocus={fo} onBlur={bl}/>
        <button type="button" onClick={addCustom} style={{padding:"0 14px",borderRadius:9,border:"none",background:accent,color:"white",fontWeight:700,fontSize:12,cursor:"pointer"}}>+ Add</button>
      </div>
    </div>
  );
};

const EditSaleForm=({shopId,shop,sale,onSave,onClose,customers=[],isStaff=false})=>{
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
    returnReqDate: sale.returnReqDate||"",
    returnRcvd:  sale.returnRcvd||"",
    refundAmt:   sale.refundAmt||"",
    refundDate:  sale.refundDate||"",
    exchangeDate: sale.exchangeDate||"",
    tag:         sale.tag||"",
    remarks:     sale.rem||sale.remarks||"",
    taxInclusive: sale.taxInclusive !== false,
    taxRate:      sale.taxRate !== undefined ? sale.taxRate : 0,
    phoneSavedOn: sale.phoneSavedOn||"UK 888",
    address:     sale.address||"",
    adjType:     sale.adjType||"",
    adjAmt:      sale.adjAmt||"",
    adjDate:     sale.adjDate||"",
    adjNote:     sale.adjNote||"",
    purInvNo:    sale.purInvNo||"",
    purInvDate:  sale.purInvDate||"",
    purAmount:   sale.purAmount||"",
    discount:    sale.discount||"",
    otherCharges: sale.otherCharges||"",
    otherChargesLabel: sale.otherChargesLabel||"Other Charges",
    shopInvoiceNo: sale.shopInvoiceNo||sale.shop_invoice_no||"",
    paidBy:      sale.paidBy||"",
    trackingNo:  sale.trackingNo||"",
    deliveryDate: sale.deliveryDate||"",
    deliveryTime: sale.deliveryTime||"",
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const hasLines=Array.isArray(sale.saleLines)&&sale.saleLines.length>0;

  // Editable saleLines state (for multi-item sales)
  const [editLines,setEditLines]=useState(()=>
    hasLines ? sale.saleLines.map(l=>({...l})) : []
  );
  const setLine=(i,k,v)=>setEditLines(prev=>{
    const next=[...prev];
    next[i]={...next[i],[k]:v};
    // Auto-recalculate grand total from lines
    const total=next.reduce((s,l)=>s+(parseFloat(l.qty||1)*parseFloat(l.price||0)),0);
    setForm(f=>({...f,amount:parseFloat(total.toFixed(2))}));
    return next;
  });
  const addLine=()=>setEditLines(prev=>{
    const next=[...prev,{name:"",qty:1,price:""}];
    return next;
  });
  const removeLine=(i)=>setEditLines(prev=>{
    const next=prev.filter((_,idx)=>idx!==i);
    const total=next.reduce((s,l)=>s+(parseFloat(l.qty||1)*parseFloat(l.price||0)),0);
    setForm(f=>({...f,amount:parseFloat(total.toFixed(2))}));
    return next;
  });

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

  const isReturnRequested=["RETURN REQUESTED","RTRN REQSTD"].includes(form.status);
  const isReturnReceived=["RETURN RECEIVED","RETRN RCVD"].includes(form.status);
  const isExchanged=form.status==="EXCHANGED";
  const isRefunded=form.status==="REFUNDED";
  const statusColor={"PENDING":"#a16207","FULFILLED":"#15803d","RETURN REQUESTED":"#c2410c","RETURNED":"#9a3412","EXCHANGED":"#4338ca","REFUNDED":"#6b21a8","ORDER NOT PLACED":"#a16207","WORK IN PROGRESS":"#1d4ed8","PHOTO GIVEN TO CUSTOMER":"#0369a1","AWAITING TRACKING INFO.":"#92400e","RETURN RECEIVED":"#991b1b","GOOD FEEDBACK RECEIVED":"#065f46","NEGATIVE FEEDBACK RECEIVED":"#9f1239"};
  const PAY_OPTS=["SHOP","BANK","EXCHANGE","GIFT","PROMOTION"];

  const [editCustOpen,setEditCustOpen]=useState(false);
  const [editCustMatches,setEditCustMatches]=useState([]);
  const [editAddrOpen,setEditAddrOpen]=useState(false);
  const [editAddrMatches,setEditAddrMatches]=useState([]);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:0,maxHeight:"68vh",overflowY:"auto",padding:"4px 20px 20px"}}>
      <div style={{padding:"0 20px"}}>
      {isStaff&&(
        <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"10px 14px",marginBottom:12,marginTop:8,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>🔒</span>
          <div><p style={{margin:0,fontWeight:700,fontSize:12,color:"#1d4ed8"}}>Staff View — Read Only</p>
            <p style={{margin:0,fontSize:11,color:"#3b82f6"}}>You can only update Delivery Status, Dispatch Date, Tags and Remarks.</p></div>
        </div>
      )}
      <div style={{background:shop.accentBg,border:"1px solid "+shop.accent+"33",borderRadius:12,padding:"10px 14px",marginBottom:16,marginTop:4,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:20}}>✏️</span>
        <div><p style={{margin:0,fontWeight:800,fontSize:13,color:shop.accentText}}>Editing Sale {form.invoiceNo}</p>
          <p style={{margin:0,fontSize:11,color:shop.accent}}>All changes will update the sales record immediately on save</p></div>
      </div>
      <Divider title="Basic Info"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div><label style={lbl}>Date</label><input type="date" value={form.date} readOnly={isStaff} onChange={isStaff?undefined:e=>set("date",e.target.value)} style={{...inp,background:isStaff?"#f8fafc":"white",cursor:isStaff?"default":"auto"}} onFocus={fo} onBlur={bl}/></div>
        <div><label style={lbl}>Invoice Number</label><input value={form.invoiceNo} readOnly style={{...inp,background:"#f8fafc",fontFamily:"DM Mono,monospace",fontWeight:700,fontSize:12,color:shop.accent,cursor:"default"}}/></div>
      </div>
      <Divider title="Customer"/>
      <div style={{marginBottom:16}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
          <div style={{position:"relative"}}>
            <label style={lbl}>Customer Name</label>
            <input value={form.customer}
              onChange={e=>{set("customer",e.target.value);const q=e.target.value.trim().toLowerCase();if(q.length>=1){const m=customers.filter(c=>c.name.toLowerCase().includes(q)).slice(0,6);setEditCustMatches(m);setEditCustOpen(m.length>0);}else{setEditCustOpen(false);setEditCustMatches([]);}}}
              onBlur={()=>setTimeout(()=>setEditCustOpen(false),180)}
              placeholder="Type or search…" style={inp} onFocus={fo} autoComplete="off"/>
            {editCustOpen&&editCustMatches.length>0&&(
              <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:200,background:"white",border:"1px solid "+shop.accent+"44",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.15)",maxHeight:180,overflowY:"auto",marginTop:3}}>
                {editCustMatches.map((c,i)=>(
                  <div key={i} onMouseDown={()=>{set("customer",c.name);set("contact",c.phone||"");set("address",c.address||c.addressee||"");setEditCustOpen(false);}}
                    style={{padding:"9px 12px",borderBottom:i<editCustMatches.length-1?"1px solid #f1f5f9":"none",display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}
                    onMouseEnter={e=>e.currentTarget.style.background=shop.accentBg}
                    onMouseLeave={e=>e.currentTarget.style.background="white"}>
                    <div style={{width:26,height:26,borderRadius:7,background:shop.accent,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800,fontSize:11,flexShrink:0}}>{c.name.charAt(0)}</div>
                    <div><p style={{margin:0,fontSize:12,fontWeight:700,color:"#0f172a"}}>{c.name}</p><p style={{margin:0,fontSize:10,color:"#94a3b8"}}>{c.phone||"—"}</p></div>
                  </div>))}
              </div>)}
          </div>
          <div><label style={lbl}>Phone Number</label><input value={form.contact} onChange={e=>set("contact",e.target.value)} placeholder="+44 7700 000000" style={inp} onFocus={fo} onBlur={bl}/></div>
          <div><label style={lbl}>Saved On</label><select value={form.phoneSavedOn} onChange={e=>set("phoneSavedOn",e.target.value)} style={inp}>{["UK 888","INDIA 889","INDIA 888"].map(o=><option key={o}>{o}</option>)}</select></div>
        </div>
        {shopId==="ros-india"&&(
          <div style={{marginBottom:12}}>
            <label style={lbl}>Paid By</label>
            <input value={form.paidBy||""} onChange={e=>set("paidBy",e.target.value)}
              placeholder="Who sent the money…" style={inp} onFocus={fo} onBlur={bl}/>
          </div>
        )}
        <div style={{position:"relative"}}>
          <label style={lbl}>Address</label>
          <input value={form.address||""}
            onChange={e=>{set("address",e.target.value);const q=e.target.value.trim().toLowerCase();if(q.length>=1){const m=customers.filter(c=>(c.address||c.addressee||"").toLowerCase().includes(q)).slice(0,6);setEditAddrMatches(m);setEditAddrOpen(m.length>0);}else{setEditAddrOpen(false);setEditAddrMatches([]);}}}
            onBlur={()=>setTimeout(()=>setEditAddrOpen(false),180)}
            placeholder="Search address…" style={inp} onFocus={fo} autoComplete="off"/>
          {editAddrOpen&&editAddrMatches.length>0&&(
            <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:200,background:"white",border:"1px solid "+shop.accent+"44",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.15)",maxHeight:160,overflowY:"auto",marginTop:3}}>
              {editAddrMatches.map((c,i)=>(
                <div key={i} onMouseDown={()=>{set("address",c.address||c.addressee||"");setEditAddrOpen(false);}}
                  style={{padding:"8px 12px",borderBottom:i<editAddrMatches.length-1?"1px solid #f1f5f9":"none",cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.background=shop.accentBg}
                  onMouseLeave={e=>e.currentTarget.style.background="white"}>
                  <p style={{margin:0,fontSize:12,fontWeight:700,color:"#0f172a"}}>{c.name}</p>
                  <p style={{margin:0,fontSize:11,color:"#64748b"}}>{c.address||c.addressee}</p>
                </div>))}
            </div>)}
        </div>
      </div>

      <Divider title="Order Details"/>

      {/* Editable multi-item lines */}
      {hasLines&&(
        <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <p style={{margin:0,fontSize:10,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em"}}>Items</p>
            <button type="button" onClick={addLine}
              style={{fontSize:11,fontWeight:700,color:shop.accent,background:shop.accentBg,border:"1px solid "+shop.accent+"44",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontFamily:"inherit"}}>
              + Add Item
            </button>
          </div>
          {/* Column headers */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 60px 90px 70px 28px",gap:4,marginBottom:4}}>
            {["Item","Qty","Price","Total",""].map((h,i)=>(
              <span key={i} style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.04em",textAlign:i>0?"right":"left",paddingRight:i===3?4:0}}>{h}</span>
            ))}
          </div>
          {editLines.map((l,i)=>{
            const lineTotal=parseFloat(((parseFloat(l.qty)||1)*(parseFloat(l.price)||0)).toFixed(2));
            return(
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 60px 90px 70px 28px",gap:4,marginBottom:6,alignItems:"center"}}>
                <input value={l.name} onChange={e=>setLine(i,"name",e.target.value)}
                  placeholder="Item name"
                  style={{...inp,fontSize:12,padding:"6px 9px"}} onFocus={fo} onBlur={bl}/>
                <input type="number" onWheel={e=>e.target.blur()} min="1" value={l.qty} onChange={e=>setLine(i,"qty",e.target.value)}
                  style={{...inp,fontSize:12,padding:"6px 6px",textAlign:"right"}} onFocus={fo} onBlur={bl}/>
                <input type="number" onWheel={e=>e.target.blur()} min="0" step="0.01" value={l.price} onChange={e=>setLine(i,"price",e.target.value)}
                  placeholder="0.00"
                  style={{...inp,fontSize:12,padding:"6px 6px",textAlign:"right"}} onFocus={fo} onBlur={bl}/>
                <span style={{fontSize:12,fontWeight:700,color:shop.accent,textAlign:"right",paddingRight:4}}>
                  {shop.symbol}{lineTotal.toLocaleString()}
                </span>
                <button type="button" onClick={()=>removeLine(i)}
                  title="Remove item"
                  style={{width:24,height:24,borderRadius:6,border:"1px solid #fecaca",background:"#fff5f5",color:"#dc2626",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,padding:0,fontFamily:"inherit"}}>
                  ×
                </button>
              </div>
            );
          })}
          {editLines.length===0&&(
            <p style={{margin:"4px 0 0",fontSize:11,color:"#94a3b8",fontStyle:"italic"}}>No items — click "+ Add Item" to add one.</p>
          )}
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        {!hasLines&&(
          <div style={{gridColumn:"1/-1"}}>
            <label style={lbl}>Item / Product</label>
            <input value={form.item} onChange={e=>set("item",e.target.value)} placeholder="Item name" style={inp} onFocus={fo} onBlur={bl}/>
          </div>
        )}
        {!hasLines&&(
          <div>
            <label style={lbl}>Quantity</label>
            <input type="number" onWheel={e=>e.target.blur()} min="1" value={form.qty} onChange={e=>set("qty",e.target.value)} style={inp} onFocus={fo} onBlur={bl}/>
          </div>
        )}
        <div style={{gridColumn:"1/-1"}}>
          {/* GST TOGGLE + RATE */}
          <div style={{background:form.taxRate===0?"#f8fafc":(form.taxInclusive?"#f0fdf4":"#eff6ff"),border:"1px solid "+(form.taxRate===0?"#e2e8f0":(form.taxInclusive?"#bbf7d0":"#bfdbfe")),borderRadius:10,padding:"12px 14px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
              <div>
                <p style={{margin:0,fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>GST / Tax</p>
                <p style={{margin:"2px 0 0",fontSize:12,fontWeight:700,color:form.taxRate===0?"#94a3b8":(form.taxInclusive?"#15803d":"#1d4ed8")}}>
                  {form.taxRate===0?"No tax applied":(form.taxInclusive?"Price includes tax — calculated backwards":"Tax added on top")}
                </p>
              </div>
              {form.taxRate>0&&(
                <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>set("taxInclusive",!form.taxInclusive)}>
                  <span style={{fontSize:12,fontWeight:700,color:"#64748b"}}>{form.taxInclusive?"Inclusive":"Exclusive"}</span>
                  <div style={{width:44,height:24,borderRadius:999,background:form.taxInclusive?shop.accent:"#cbd5e1",position:"relative",transition:"background 0.2s",boxShadow:"inset 0 1px 3px rgba(0,0,0,0.15)"}}>
                    <div style={{position:"absolute",top:3,left:form.taxInclusive?22:3,width:18,height:18,borderRadius:"50%",background:"white",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
                  </div>
                </div>
              )}
            </div>
            {/* Tax Rate Buttons */}
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              <span style={{fontSize:11,fontWeight:700,color:"#64748b",marginRight:4}}>Tax Rate:</span>
              {[0,5,10,18,20].map(r=>(
                <button key={r} type="button" onClick={()=>set("taxRate",Number(r))}
                  style={{padding:"4px 12px",borderRadius:999,border:"2px solid "+(Number(form.taxRate)===r?shop.accent:"#e2e8f0"),
                    background:Number(form.taxRate)===r?shop.accent:"white",color:Number(form.taxRate)===r?"white":"#374151",
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
                Grand Total ({shop.symbol}) — {form.taxRate===0?"no tax":form.taxInclusive?"incl. tax":"excl. tax"}
              </label>
              <input type="number" onWheel={e=>e.target.blur()} value={form.amount} onChange={e=>set("amount",e.target.value)}
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

      {!isStaff&&<>
      <Divider title="Pricing"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div><label style={lbl}>Discount ({shop.symbol})</label>
          <input type="number" onWheel={e=>e.target.blur()} value={form.discount||""} onChange={e=>set("discount",e.target.value)} placeholder="0.00" style={inp} onFocus={fo} onBlur={bl}/></div>
        <div><label style={lbl}>Other Charges ({shop.symbol})</label>
          <input type="number" onWheel={e=>e.target.blur()} value={form.otherCharges||""} onChange={e=>set("otherCharges",e.target.value)} placeholder="0.00" style={inp} onFocus={fo} onBlur={bl}/></div>
      </div>
      </>}
      <Divider title="Payment"/>
      <div style={{display:"grid",gridTemplateColumns:form.payBy==="SHOP"?"1fr 1fr":"1fr",gap:12,marginBottom:16}}>
        <div><label style={lbl}>Payment By</label>
          <select value={PAY_OPTS.includes(form.payBy)?form.payBy:"SHOP"} onChange={e=>set("payBy",e.target.value)} style={inp}>
            {PAY_OPTS.map(o=><option key={o}>{o}</option>)}
          </select></div>
        {form.payBy==="SHOP"&&(<div><label style={lbl}>Shop Invoice No.</label>
          <input value={form.shopInvoiceNo||""} onChange={e=>set("shopInvoiceNo",e.target.value)} placeholder="e.g. 4666" style={{...inp,fontFamily:"DM Mono,monospace"}} onFocus={fo} onBlur={bl}/>
        </div>)}
      </div>

      <Divider title="Delivery"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16,background:"#f8fafc",borderRadius:12,padding:"14px",border:"1px solid #e2e8f0"}}>
        <div>
          <label style={lbl}>Delivery Status</label>
          <select value={form.status} onChange={e=>set("status",e.target.value)}
            style={{...inp,fontWeight:700,color:statusColor[form.status]||"#374151"}}>
            {(shopId==="ros-india"
              ? ["ORDER NOT PLACED","WORK IN PROGRESS","PHOTO GIVEN TO CUSTOMER","AWAITING TRACKING INFO.","FULFILLED","RETURN REQUESTED","RETURN RECEIVED","EXCHANGED","REFUNDED","GOOD FEEDBACK RECEIVED","NEGATIVE FEEDBACK RECEIVED"]
              : ["PENDING","FULFILLED","GOOD FEEDBACK","RTRN REQSTD","RETRN RCVD","EXCHANGED","REFUNDED"]
            ).map(o=>(
              <option key={o} style={{color:statusColor[o]||"#374151"}}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={lbl}>Sent / Dispatch Date</label>
          <input type="date" value={form.sentDate} onChange={e=>set("sentDate",e.target.value)} style={inp} onFocus={fo} onBlur={bl}/>
        </div>
      </div>

      {/* ── Tracking & Delivery ── */}
      <Divider title="Tracking & Delivery"/>
      <div style={{background:"#f0f9ff",borderRadius:12,padding:"14px",border:"1px solid #bae6fd",marginBottom:16}}>
        <div style={{marginBottom:10}}>
          <label style={{...lbl,color:"#0369a1"}}>📦 Royal Mail Tracking No.</label>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input value={form.trackingNo} onChange={e=>set("trackingNo",e.target.value.toUpperCase())}
              placeholder="e.g. AB123456789GB"
              style={{...inp,flex:1,border:"1px solid #7dd3fc",fontFamily:"DM Mono,monospace",textTransform:"uppercase"}}
              onFocus={fo} onBlur={bl}/>
            {form.trackingNo&&(
              <a href={"https://www.royalmail.com/track-your-item#/tracking-results/"+form.trackingNo.trim()}
                target="_blank" rel="noreferrer"
                style={{padding:"8px 12px",borderRadius:8,background:"#0369a1",color:"white",fontSize:11,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap",flexShrink:0}}>
                🔍 Track
              </a>
            )}
          </div>
        </div>
        {form.deliveryDate?(
          <div style={{background:"#dcfce7",borderRadius:8,padding:"8px 12px",border:"1px solid #86efac",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,fontWeight:700,color:"#166534"}}>✅ Delivered: {form.deliveryDate}{form.deliveryTime?" at "+form.deliveryTime:""}</span>
            <button type="button" onClick={()=>{set("deliveryDate","");set("deliveryTime","");}}
              style={{fontSize:11,padding:"2px 8px",borderRadius:6,border:"1px solid #86efac",background:"white",color:"#dc2626",cursor:"pointer"}}>
              Clear
            </button>
          </div>
        ):(
          <p style={{margin:0,fontSize:11,color:"#0369a1",fontStyle:"italic"}}>No delivery confirmed yet. Use the Mark Delivered button in the sale detail view.</p>
        )}
      </div>

      {isReturnRequested&&(
        <>
          <Divider title="Return Request"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr",gap:12,marginBottom:16,background:"#fff7ed",borderRadius:12,padding:"14px",border:"1px solid #fed7aa"}}>
            <div>
              <label style={{...lbl,color:"#c2410c"}}>↩️ Return Request Date</label>
              <input type="date" value={form.returnReqDate} onChange={e=>set("returnReqDate",e.target.value)} style={{...inp,border:"1px solid #fed7aa"}} onFocus={fo} onBlur={bl}/>
              <p style={{margin:"6px 0 0",fontSize:11,color:"#92400e"}}>Record when the customer requested this return. Mark as <strong>Return Received</strong> once the item arrives back.</p>
            </div>
          </div>
        </>
      )}

      {isReturnReceived&&(
        <>
          <Divider title="Return Received"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr",gap:12,marginBottom:16,background:"#fff5f5",borderRadius:12,padding:"14px",border:"1px solid #fecaca"}}>
            <div>
              <label style={{...lbl,color:"#dc2626"}}>📬 Return Received Date</label>
              <input type="date" value={form.returnRcvd} onChange={e=>set("returnRcvd",e.target.value)} style={{...inp,border:"1px solid #fecaca"}} onFocus={fo} onBlur={bl}/>
            </div>
          </div>
        </>
      )}

      {isExchanged&&(
        <>
          <Divider title="Exchange"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr",gap:12,marginBottom:16,background:"#eef2ff",borderRadius:12,padding:"14px",border:"1px solid #c7d2fe"}}>
            <div>
              <label style={{...lbl,color:"#4338ca"}}>🔄 Exchange Item Sent Date</label>
              <input type="date" value={form.exchangeDate} onChange={e=>set("exchangeDate",e.target.value)} style={{...inp,border:"1px solid #c7d2fe"}} onFocus={fo} onBlur={bl}/>
            </div>
          </div>
        </>
      )}

      {isRefunded&&(
        <>
          <Divider title="Refund"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16,background:"#f5f3ff",borderRadius:12,padding:"14px",border:"1px solid #ddd6fe"}}>
            <div>
              <label style={{...lbl,color:"#6b21a8"}}>📅 Refund Date</label>
              <input type="date" value={form.refundDate} onChange={e=>set("refundDate",e.target.value)} style={{...inp,border:"1px solid #ddd6fe"}} onFocus={fo} onBlur={bl}/>
            </div>
            <div>
              <label style={{...lbl,color:"#6b21a8"}}>💸 Refunded Amount ({shop.symbol})</label>
              <input type="number" onWheel={e=>e.target.blur()} value={form.refundAmt} onChange={e=>set("refundAmt",e.target.value)} placeholder="0.00" style={{...inp,border:"1px solid #ddd6fe"}} onFocus={fo} onBlur={bl}/>
            </div>
          </div>
        </>
      )}

      {!isStaff&&<>
      <Divider title="Post-Sale Adjustment"/>
      <div style={{background:"#fffbeb",borderRadius:12,padding:"14px",border:"1px solid #fde68a",marginBottom:16}}>
        <p style={{margin:"0 0 10px",fontSize:11,color:"#92400e",fontWeight:600}}>🔧 Use this section to record any discount or partial refund given after the sale (e.g. damaged item, defect).</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div>
            <label style={{...lbl,color:"#92400e"}}>Adjustment Type</label>
            <select value={form.adjType} onChange={e=>set("adjType",e.target.value)} style={{...inp,border:"1px solid #fde68a"}} onFocus={fo} onBlur={bl}>
              <option value="">-- None --</option>
              <option value="Discount">Discount</option>
              <option value="Partial Refund">Partial Refund</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label style={{...lbl,color:"#92400e"}}>Adjustment Date</label>
            <input type="date" value={form.adjDate} onChange={e=>set("adjDate",e.target.value)} style={{...inp,border:"1px solid #fde68a"}} onFocus={fo} onBlur={bl}/>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div>
            <label style={{...lbl,color:"#92400e"}}>💰 Adjustment Amount ({shop.symbol})</label>
            <input type="number" onWheel={e=>e.target.blur()} value={form.adjAmt} onChange={e=>set("adjAmt",e.target.value)} placeholder="0.00" style={{...inp,border:"1px solid #fde68a"}} onFocus={fo} onBlur={bl}/>
          </div>
          <div>
            <label style={{...lbl,color:"#92400e"}}>📝 Reason / Note</label>
            <input type="text" value={form.adjNote} onChange={e=>set("adjNote",e.target.value)} placeholder="e.g. damaged zip, colour mismatch…" style={{...inp,border:"1px solid #fde68a"}} onFocus={fo} onBlur={bl}/>
          </div>
        </div>
      </div>
      </>}

      <TagPicker value={form.tag} onChange={v=>set("tag",v)} accent={shop.accent} accentBg={shop.accentBg} inp={inp} fo={fo} bl={bl} lbl={lbl}/>
      <div style={{marginBottom:16}}>
        <label style={lbl}>Remarks</label>
        <textarea value={form.remarks} onChange={e=>set("remarks",e.target.value)} rows={2} placeholder="Any additional notes…" style={{...inp,resize:"vertical"}} onFocus={fo} onBlur={bl}/>
      </div>

      {shopId==="ros-india"&&!isStaff&&(
        <>
          <div style={{margin:"4px 0 10px",fontWeight:800,fontSize:11,color:"#166534",letterSpacing:"0.07em",textTransform:"uppercase",borderBottom:"1px solid #bbf7d0",paddingBottom:6}}>Purchase Details</div>
          <div style={{marginBottom:16,background:"#f0fdf4",borderRadius:12,padding:"14px",border:"1px solid #bbf7d0"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <label style={{...lbl,color:"#166534"}}>🧾 Pur. Inv. No.</label>
                <input value={form.purInvNo} onChange={e=>set("purInvNo",e.target.value)}
                  placeholder="Supplier invoice no." style={{...inp,border:"1px solid #86efac"}} onFocus={fo} onBlur={bl}/>
              </div>
              <div>
                <label style={{...lbl,color:"#166534"}}>📅 Pur. Inv. Date</label>
                <input type="date" value={form.purInvDate} onChange={e=>set("purInvDate",e.target.value)}
                  style={{...inp,border:"1px solid #86efac"}} onFocus={fo} onBlur={bl}/>
              </div>
            </div>
            <div>
              <label style={{...lbl,color:"#166534"}}>💰 Pur. Amount ({shop.symbol})</label>
              <input type="number" onWheel={e=>e.target.blur()} value={form.purAmount} onChange={e=>set("purAmount",e.target.value)}
                placeholder="0.00" style={{...inp,border:"1px solid #86efac"}} onFocus={fo} onBlur={bl}/>
            </div>
          </div>
        </>
      )}

      </div>{/* end padding wrapper */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,position:"sticky",bottom:0,background:"white",padding:"6px 20px 2px",borderTop:"1px solid #f1f5f9"}}>
        <button onClick={()=>onSave({...form,id:form.invoiceNo||sale.id,ful:form.status,pay:form.payBy,shopInvoiceNo:form.shopInvoiceNo||"",paidBy:form.paidBy||"",rem:form.remarks,amount:parseFloat(form.amount)||0,phoneSavedOn:form.phoneSavedOn,address:form.address||"",saleLines:hasLines?editLines:sale.saleLines,discount:parseFloat(form.discount)||0,otherCharges:parseFloat(form.otherCharges)||0,otherChargesLabel:form.otherChargesLabel||"Other Charges",contact:form.contact,phone:form.contact,returnReqDate:form.returnReqDate,returnRcvd:form.returnRcvd,refundAmt:form.refundAmt,refundDate:form.refundDate||"",exchangeDate:form.exchangeDate||"",adjType:form.adjType||"",adjAmt:parseFloat(form.adjAmt)||0,adjDate:form.adjDate||"",adjNote:form.adjNote||"",purInvNo:form.purInvNo||"",purInvDate:form.purInvDate||"",purAmount:parseFloat(form.purAmount)||0,trackingNo:form.trackingNo||"",deliveryDate:form.deliveryDate||"",deliveryTime:form.deliveryTime||""})}
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

const NewShipmentForm=({shopId,shop,purch,onSave,onClose,initialValues=null})=>{
  const defaultForm={
    date:         new Date().toISOString().slice(0,10),
    shipmentId:   "SHP-"+String(Math.floor(Math.random()*9000)+1000),
  };
  const [form,setForm]=useState(initialValues?{
    date:         initialValues.date||new Date().toISOString().slice(0,10),
    shipmentId:   initialValues.id||("SHP-"+String(Math.floor(Math.random()*9000)+1000)),
    purchaseId:   initialValues.order||initialValues.purchaseId||"",
    supplier:     initialValues.supplier||"",
    deliveryAddr: initialValues.deliveryAddr||"",
    service:      initialValues.service||"",
    serviceCustom:initialValues.serviceCustom||"",
    agent:        initialValues.agent||"",
    agentCustom:  initialValues.agentCustom||"",
    trackingNo:   initialValues.track||initialValues.trackingNo||"",
    cost:         initialValues.cost||"",
    weight:       initialValues.weight||"",
    status:       initialValues.status||"PENDING",
    dispatchDate: initialValues.disp||initialValues.dispatchDate||"",
    eta:          initialValues.eta||"",
    receivedDate: initialValues.receivedDate||"",
    remarks:      initialValues.notes||initialValues.remarks||"",
  }:{
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
    <div style={{display:"flex",flexDirection:"column",gap:0,maxHeight:"68vh",overflowY:"auto",padding:"4px 20px 20px"}}>

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
          <input type="number" onWheel={e=>e.target.blur()} value={form.cost} onChange={e=>set("cost",e.target.value)}
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

const NewPurchaseForm=({shopId,shop,onSave,onClose,lastPurchNum,isStaff=false,initialValues=null})=>{
  const nextNum=(lastPurchNum||700)+1;
  const pfx={["ros-selections"]:"PO",["ros-hairlines"]:"PH",["ros-india"]:"PI"}[shopId]||"PO";
  const autoId=`${pfx}-${String(nextNum).padStart(4,"0")}`;

  const [form,setForm]=useState(initialValues?{...initialValues,id:initialValues.id||autoId,purchaseId:initialValues.id||autoId,idEditing:false}:{
    id:          autoId,
    purchaseId:  autoId,
    idEditing:   false,
    date:        new Date().toISOString().slice(0,10),
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
    status:      "PENDING",
  });
  const [saveErr,setSaveErr]=useState("");
  const [saving,setSaving]=useState(false);
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

  // Load live suppliers from Supabase on mount
  React.useEffect(()=>{
    dbLoadSuppliers(shopId).then(data=>{if(data&&data.length>0)setSupplierList(data);}).catch(()=>{});
  },[]);

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

  const handleAddSupplier=async(newSup)=>{
    // Save to Supabase
    await dbSaveSupplier(shopId, newSup).catch(e=>console.error("Supplier save error:",e));
    setSupplierList(l=>[newSup,...l]);
    set("supplier",newSup.name);
    setShowNewSup(false);
  };

  return(
    <>
    {/* ── NEW SUPPLIER OVERLAY ── */}
    {showNewSup&&(
      <div style={{position:"fixed",inset:0,zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.50)",backdropFilter:"blur(4px)"}} onClick={()=>setShowNewSup(false)}/>
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
    <div style={{display:"flex",flexDirection:"column",gap:0,maxHeight:"68vh",overflowY:"auto",padding:"4px 20px 20px"}}>
      <div style={{padding:"0 20px"}}>
      {isStaff&&(
        <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"10px 14px",marginBottom:12,marginTop:8,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>🔒</span>
          <div><p style={{margin:0,fontWeight:700,fontSize:12,color:"#1d4ed8"}}>Staff View — Read Only</p>
            <p style={{margin:0,fontSize:11,color:"#3b82f6"}}>You can only update Delivery Status, Dispatch Date, Tags and Remarks.</p></div>
        </div>
      )}

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
            <input value={form.purchaseId} readOnly={!form.idEditing} onChange={e=>{set("purchaseId",e.target.value);set("id",e.target.value);}}
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
      {/* Item name — full width */}
      <div style={{marginBottom:12}}>
        <label style={lbl}>Item</label>
        <select value={form.item} onChange={e=>set("item",e.target.value)} style={inp}>
          <option value="">Select product…</option>
          <option value="__custom__">✏️ Enter manually…</option>
          {PRODUCTS.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
        {useCustomItem&&<input value={form.itemCustom} onChange={e=>set("itemCustom",e.target.value)} placeholder="Type item name" style={{...inp,marginTop:8,border:"1px solid "+shop.accent}} autoFocus onFocus={fo} onBlur={bl}/>}
      </div>
      {/* Row 1: Qty · Amount · GST · Total (auto) */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:16}}>
        <div>
          <label style={lbl}>Total Qty</label>
          <input type="number" onWheel={e=>e.target.blur()} min="1" value={form.qty}
            onChange={e=>set("qty",e.target.value)} placeholder="0" style={inp} onFocus={fo} onBlur={bl}/>
        </div>
        <div>
          <label style={lbl}>Amount ({shop.symbol})</label>
          <input type="number" onWheel={e=>e.target.blur()} value={form.total}
            onChange={e=>set("total",e.target.value)} placeholder="0.00" style={inp} onFocus={fo} onBlur={bl}/>
        </div>
        <div>
          <label style={lbl}>GST / VAT</label>
          <input type="number" onWheel={e=>e.target.blur()} value={form.gst}
            onChange={e=>set("gst",e.target.value)} placeholder="0.00" style={inp} onFocus={fo} onBlur={bl}/>
        </div>
        <div>
          <label style={lbl}>Total ({shop.symbol}) <span style={{fontSize:10,fontWeight:500,textTransform:"none",letterSpacing:0,color:"#94a3b8"}}>incl. GST</span></label>
          <input readOnly value={(parseFloat(form.total)||0)+(parseFloat(form.gst)||0)>0?((parseFloat(form.total)||0)+(parseFloat(form.gst)||0)).toFixed(2):""} placeholder="Auto" style={inpGray}/>
        </div>
      </div>
      {/* Row 2: Unit Cost auto */}
      <div style={{marginBottom:16}}>
        <label style={{...lbl,color:"#94a3b8"}}>Unit Cost ({shop.symbol}) <span style={{fontSize:10,fontWeight:500,textTransform:"none",letterSpacing:0}}>— auto calculated</span></label>
        <input readOnly value={unitCost} placeholder="Enter quantity and amount above" style={inpGray}/>
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

      </div>{/* end padding wrapper */}
      {/* ACTIONS */}
      {saveErr&&(
        <div style={{margin:"0 20px 8px",padding:"8px 14px",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:9,fontSize:12,color:"#dc2626",fontWeight:600}}>
          ⚠️ {saveErr}
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,position:"sticky",bottom:0,background:"white",padding:"6px 20px 2px",borderTop:"1px solid #f1f5f9"}}>
        <button disabled={saving} onClick={()=>{
          setSaveErr("");
          if(!form.supplier){setSaveErr("Please select a supplier.");return;}
          if(!(form.item||form.itemCustom)){setSaveErr("Please select or enter an item.");return;}
          if(!form.total){setSaveErr("Please enter the amount.");return;}
          setSaving(true);
          const payload={
            id: form.purchaseId||form.id,
            purchaseId: form.purchaseId,
            date: form.date,
            supplier: form.supplier,
            invoiceNo: form.invoiceNo,
            batch: form.batch,
            item: form.item==="__custom__"?form.itemCustom:form.item,
            itemCustom: form.itemCustom,
            qty: form.qty,
            total: form.total,
            gst: form.gst,
            payBy: form.payBy,
            payDate: form.payDate,
            logisticBy: form.logisticBy,
            logisticRef: form.logisticRef,
            receivedDate: form.receivedDate,
            remarks: form.remarks,
            status: "PENDING",
          };
          onSave(payload);
        }}
          style={{padding:"12px 0",borderRadius:11,border:"none",background:saving?"#94a3b8":shop.accent,color:"white",fontWeight:800,fontSize:14,cursor:saving?"default":"pointer",fontFamily:"inherit",boxShadow:saving?"none":"0 4px 14px "+shop.accent+"44"}}>
          {saving?"Saving…":"💾 Save Purchase"}
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


const NewCustomerForm=({shop,onSave,onClose,customers=[]})=>{
  const [cf,setCf]=useState({
    name:"",phone:"",email:"",
    phoneSavedOn:"UK 888",
    addressee:"",address:"",tag:"",remarks:"",
  });
  const sc=(k,v)=>setCf(f=>({...f,[k]:v}));

  /* ── Autocomplete state ── */
  const [acOpen,setAcOpen]=useState(false);
  const [acMatches,setAcMatches]=useState([]);

  const handleNameChange=(val)=>{
    sc("name",val);
    if(val.trim().length>=1){
      const q=val.trim().toLowerCase();
      const hits=(customers||[]).filter(c=>c.name.toLowerCase().includes(q));
      setAcMatches(hits);
      setAcOpen(hits.length>0);
    } else {
      setAcMatches([]);
      setAcOpen(false);
    }
  };

  const handlePickCustomer=(c)=>{
    setCf(f=>({...f,
      name:c.name,
      phone:c.phone||f.phone,
      email:c.email||f.email,
      address:c.address||f.address,
      addressee:c.addressee||f.addressee,
      tag:c.tag||f.tag,
      remarks:c.notes||f.remarks,
      phoneSavedOn:c.phoneSavedOn||f.phoneSavedOn,
    }));
    setAcOpen(false);
    setAcMatches([]);
  };

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
      {/* name with autocomplete */}
      <div style={{position:"relative"}}>
        <label style={lbl}>Customer Name *</label>
        <input value={cf.name} onChange={e=>handleNameChange(e.target.value)}
          placeholder="Type to search existing customers…" style={inp}
          onFocus={e=>{fo(e);if(cf.name.trim()&&acMatches.length)setAcOpen(true);}}
          onBlur={e=>{bl(e);setTimeout(()=>setAcOpen(false),180);}}
          autoComplete="off"/>
        {/* ── dropdown ── */}
        {acOpen&&acMatches.length>0&&(
          <div style={{
            position:"absolute",top:"100%",left:0,right:0,zIndex:200,
            background:"white",border:"1px solid "+shop.accent+"55",
            borderRadius:"0 0 12px 12px",boxShadow:"0 8px 24px rgba(0,0,0,0.12)",
            maxHeight:220,overflowY:"auto",marginTop:-1,
          }}>
            <div style={{padding:"6px 12px",background:shop.accentBg,borderBottom:"1px solid "+shop.accent+"22"}}>
              <span style={{fontSize:10,fontWeight:800,color:shop.accent,textTransform:"uppercase",letterSpacing:"0.06em"}}>
                {acMatches.length} match{acMatches.length!==1?"es":""} in database — click to autofill
              </span>
            </div>
            {acMatches.map((c,i)=>(
              <div key={c.id||i}
                onMouseDown={()=>handlePickCustomer(c)}
                style={{
                  padding:"10px 14px",cursor:"pointer",
                  borderBottom:i<acMatches.length-1?"1px solid #f1f5f9":"none",
                  transition:"background 0.1s",
                }}
                onMouseEnter={e=>e.currentTarget.style.background=shop.accentBg}
                onMouseLeave={e=>e.currentTarget.style.background="white"}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{
                    width:32,height:32,borderRadius:9,flexShrink:0,
                    background:shop.sb,display:"flex",alignItems:"center",
                    justifyContent:"center",color:"white",fontWeight:800,fontSize:13,
                  }}>{c.name.charAt(0)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{margin:0,fontWeight:700,fontSize:13,color:"#0f172a",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</p>
                    <p style={{margin:0,fontSize:11,color:"#94a3b8"}}>{c.phone||"No phone"}{c.tag?" · "+c.tag:""}</p>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,color:shop.accent,
                    background:shop.accentBg,border:"1px solid "+shop.accent+"33",
                    borderRadius:999,padding:"2px 8px",flexShrink:0}}>Select</span>
                </div>
              </div>
            ))}
            <div style={{padding:"8px 14px",background:"#f8fafc",borderTop:"1px solid #f1f5f9"}}>
              <span style={{fontSize:10,color:"#94a3b8",fontWeight:600}}>↩ Or keep typing to create a new customer</span>
            </div>
          </div>
        )}
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
const AddTabInput=({onAdd,accent})=>{
  const [val,setVal]=React.useState("");
  const commit=()=>{const n=val.trim();if(n){onAdd(n);setVal("");}};
  return(
    <div style={{display:"flex",gap:4,alignItems:"center",marginTop:6,width:"100%"}}>
      <input
        value={val}
        onChange={e=>setVal(e.target.value)}
        onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();commit();}}}
        placeholder="Type item name, press Enter or ＋"
        style={{flex:1,padding:"6px 10px",borderRadius:8,border:"1px solid "+accent+"66",fontSize:12,fontFamily:"inherit",outline:"none",background:"white"}}
      />
      <button type="button" onClick={commit}
        style={{padding:"6px 14px",borderRadius:8,border:"none",background:accent,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
        ＋
      </button>
    </div>
  );
};

const NewSaleForm=({shopId,shop,onSave,onClose,lastInvoiceNum,shopItems=[],onAddShopItem,onDeleteShopItem,customers=[],sales=[]})=>{
  const _now=new Date();
  const _yr=_now.getMonth()>=3?_now.getFullYear():_now.getFullYear()-1;
  const _fySuffix=String(_yr+1).slice(-1);
 const _stored=()=>{try{const v=localStorage.getItem("ros_lastInv_"+shopId);return v?parseInt(v)||1312:1312;}catch{return 1312;}};
  const _nextNum=_stored()+1;
  const _seq=String(_nextNum).padStart(4,"0");
  const _pfx = shopId==="ros-india" ? "IND" : "ROS";
  const autoInv=`${_pfx}${_seq}${_fySuffix}`;

  // ── Multi-item lines state ──
  const blankLine=()=>({id:Date.now()+Math.random(),name:"",qty:"1",price:""});
  const [lines,setLines]=useState([blankLine()]);

  const [form,setForm]=useState({
    date:        new Date().toISOString().slice(0,10),
    invoiceNo:   autoInv,
    invEditing:  false,
    customer:    "",
    contact:     "",
    taxInclusive: false,
    taxRate:     0,
    discount:    "",
    otherCharges:"",
    otherChargesLabel:"Other Charges",
    payBy:       "SHOP",
    shopInvoiceNo: "",
    paidBy:      "",
    trackingNo:  "",
    status:      shopId==="ros-india" ? "ORDER NOT PLACED" : "PENDING",
    sentDate:    "",
    returnReqDate: "",
    returnRcvd:  "",
    refundAmt:   "",
    tag:         "",
    remarks:     "",
    address:     "",
    purInvNo:    "",
    purInvDate:  "",
    purAmount:   "",
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const [customerList,setCustomerList]=useState(customers.length>0?[...customers]:[...CUSTOMERS]);
  const [showNewCust,setShowNewCust]=useState(false);
  const [custAcOpen,setCustAcOpen]=useState(false);
  const [custAcMatches,setCustAcMatches]=useState([]);

  const inp={width:"100%",border:"1px solid #e2e8f0",borderRadius:9,padding:"9px 13px",fontSize:13,outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box",color:"#374151",background:"white",transition:"border-color 0.15s"};
  const fo=e=>e.target.style.borderColor=shop.accent;
  const bl=e=>e.target.style.borderColor="#e2e8f0";
  const lbl={fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"};
  const Divider=({title})=>(<div style={{display:"flex",alignItems:"center",gap:8,margin:"6px 0 12px"}}><div style={{height:1,flex:1,background:"#f1f5f9"}}/><span style={{fontSize:10,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",whiteSpace:"nowrap"}}>{title}</span><div style={{height:1,flex:1,background:"#f1f5f9"}}/></div>);

  const isReturnRequested=["RETURN REQUESTED","RTRN REQSTD"].includes(form.status);
  const isReturnReceived=["RETURN RECEIVED","RETRN RCVD"].includes(form.status);
  const isRefundOnly=["EXCHANGED","REFUNDED"].includes(form.status);
  const statusColor={"PENDING":"#a16207","FULFILLED":"#15803d","RETURN REQUESTED":"#c2410c","RETURNED":"#9a3412","EXCHANGED":"#4338ca","REFUNDED":"#6b21a8","ORDER NOT PLACED":"#a16207","WORK IN PROGRESS":"#1d4ed8","PHOTO GIVEN TO CUSTOMER":"#0369a1","AWAITING TRACKING INFO.":"#92400e","RETURN RECEIVED":"#991b1b","GOOD FEEDBACK RECEIVED":"#065f46","NEGATIVE FEEDBACK RECEIVED":"#9f1239"};

  const handleAddCustomer=(newCust)=>{setCustomerList(l=>[newCust,...l]);set("customer",newCust.name);set("contact",newCust.phone);setShowNewCust(false);};
  const updateLine=(id,key,val)=>setLines(ls=>ls.map(l=>l.id===id?{...l,[key]:val}:l));
  const addLine=()=>setLines(ls=>[...ls,blankLine()]);
  const removeLine=(id)=>setLines(ls=>ls.length>1?ls.filter(l=>l.id!==id):ls);

  const itemsSubtotal=parseFloat(lines.reduce((sum,l)=>{const q=parseFloat(l.qty)||0;const p=parseFloat(l.price)||0;return sum+(q*p);},0).toFixed(2));
  const discountAmt=parseFloat(form.discount)||0;
  const otherChargesAmt=parseFloat(form.otherCharges)||0;
  const preGstTotal=parseFloat((itemsSubtotal-discountAmt+otherChargesAmt).toFixed(2));
  const taxRate=(form.taxRate||0)/100;
  const gstAmt=parseFloat((preGstTotal*taxRate).toFixed(2));
  const grandTotal=parseFloat((preGstTotal+gstAmt).toFixed(2));

  const handleSave=()=>{
    const filledLines=lines.filter(l=>l.name.trim()||(parseFloat(l.price)>0));
    const combinedItem=filledLines.map(l=>`${l.name}(x${l.qty})`).join(", ")||"Sale";
    const combinedQty=filledLines.reduce((s,l)=>s+(parseFloat(l.qty)||0),0)||1;
    onSave({...form,item:combinedItem,qty:String(combinedQty),amount:grandTotal,saleLines:filledLines,discount:discountAmt,otherCharges:otherChargesAmt,otherChargesLabel:form.otherChargesLabel,address:form.address||"",paidBy:form.paidBy||"",purInvNo:form.purInvNo||"",purInvDate:form.purInvDate||"",purAmount:parseFloat(form.purAmount)||0,trackingNo:form.trackingNo||"",deliveryDate:form.deliveryDate||"",deliveryTime:form.deliveryTime||""});
  };

  return(<>
    {showNewCust&&(<div style={{position:"fixed",inset:0,zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowNewCust(false)}><div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.50)",backdropFilter:"blur(4px)"}}/><div style={{position:"relative",background:"white",borderRadius:20,boxShadow:"0 32px 64px rgba(0,0,0,0.25)",width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto",zIndex:81}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 22px",borderBottom:"1px solid #f1f5f9",background:shop.accent+"12",borderRadius:"20px 20px 0 0"}}><h3 style={{margin:0,fontSize:15,fontWeight:800,color:"#0f172a"}}>➕ New Customer</h3><button onClick={()=>setShowNewCust(false)} style={{width:30,height:30,borderRadius:"50%",border:"none",background:"#f1f5f9",cursor:"pointer",fontSize:18,color:"#64748b",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button></div><div style={{padding:22}}><NewCustomerForm shop={shop} onSave={handleAddCustomer} onClose={()=>setShowNewCust(false)} customers={customerList}/></div></div></div>)}

    {/* ── Single column layout ── */}
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px",WebkitOverflowScrolling:"touch"}}>

            {/* Basic Info */}
            <div style={{background:"#f8fafc",borderRadius:12,padding:"11px 12px",marginBottom:8,border:"1px solid #f1f5f9"}}>
              <p style={{margin:"0 0 8px",fontSize:10,fontWeight:800,color:shop.accent,textTransform:"uppercase",letterSpacing:"0.07em"}}>📋 Basic Info</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                <div><label style={lbl}>Date</label><input type="date" value={form.date} onChange={e=>set("date",e.target.value)} style={inp} onFocus={fo} onBlur={bl}/></div>
                <div><label style={lbl}>Invoice No.</label>
                  <div style={{display:"flex",gap:4}}><input value={form.invoiceNo} readOnly={!form.invEditing} onChange={e=>set("invoiceNo",e.target.value)} style={{...inp,flex:1,background:form.invEditing?"white":"#f8fafc",fontFamily:"DM Mono,monospace",fontWeight:700,fontSize:10,color:shop.accent}} onFocus={fo} onBlur={bl}/><button onClick={()=>set("invEditing",!form.invEditing)} style={{width:28,height:28,borderRadius:7,cursor:"pointer",border:"1px solid #e2e8f0",background:"#f8fafc",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>{form.invEditing?"✓":"✏️"}</button></div>
                </div>
              </div>
            </div>

            {/* Customer */}
            <div style={{background:"#f8fafc",borderRadius:12,padding:"11px 12px",marginBottom:8,border:"1px solid #f1f5f9"}}>
              <p style={{margin:"0 0 8px",fontSize:10,fontWeight:800,color:shop.accent,textTransform:"uppercase",letterSpacing:"0.07em"}}>👤 Customer</p>
              <div style={{marginBottom:7,position:"relative"}}>
                <label style={lbl}>Name</label>
                <div style={{display:"flex",gap:5}}>
                  <input value={form.customer} onChange={e=>{set("customer",e.target.value);const q=e.target.value.trim().toLowerCase();if(q.length>=1){const m=customerList.filter(c=>c.name.toLowerCase().includes(q)).slice(0,6);setCustAcMatches(m);setCustAcOpen(m.length>0);}else{setCustAcOpen(false);setCustAcMatches([]);}}} onBlur={()=>setTimeout(()=>setCustAcOpen(false),180)} placeholder="Type name…" style={{...inp,flex:1}} onFocus={fo} autoComplete="off"/>
                  <button type="button" onClick={()=>setShowNewCust(true)} style={{width:32,height:34,borderRadius:8,cursor:"pointer",border:"1px solid "+shop.accent+"55",background:shop.accentBg,color:shop.accent,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                </div>
                {custAcOpen&&custAcMatches.length>0&&(<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:200,background:"white",border:"1px solid "+shop.accent+"44",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.15)",maxHeight:180,overflowY:"auto",marginTop:3}}>
                  {custAcMatches.map((c,i)=>(<div key={i} onMouseDown={()=>{set("customer",c.name);set("contact",c.phone||"");setCustAcOpen(false);}} style={{padding:"9px 12px",borderBottom:i<custAcMatches.length-1?"1px solid #f1f5f9":"none",display:"flex",alignItems:"center",gap:8}} onMouseEnter={e=>e.currentTarget.style.background=shop.accentBg} onMouseLeave={e=>e.currentTarget.style.background="white"}><div style={{width:26,height:26,borderRadius:7,background:shop.sb,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800,fontSize:11,flexShrink:0}}>{c.name.charAt(0)}</div><div><p style={{margin:0,fontSize:12,fontWeight:700,color:"#0f172a"}}>{c.name}</p><p style={{margin:0,fontSize:10,color:"#94a3b8"}}>{c.phone||"—"}</p></div></div>))}
                </div>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:7}}>
                <div><label style={lbl}>Contact</label><input value={form.contact} onChange={e=>set("contact",e.target.value)} placeholder="+44 7700 000000" style={inp} onFocus={fo} onBlur={bl}/></div>
                <div><label style={lbl}>Address</label><input value={form.address||""} onChange={e=>set("address",e.target.value)} placeholder="Address" style={inp} onFocus={fo} onBlur={bl}/></div>
              </div>
            </div>

            {/* Items */}
            <div style={{background:"#f8fafc",borderRadius:12,padding:"11px 12px",marginBottom:8,border:"1px solid #f1f5f9"}}>
              <p style={{margin:"0 0 8px",fontSize:10,fontWeight:800,color:shop.accent,textTransform:"uppercase",letterSpacing:"0.07em"}}>🛍️ Items</p>
              {/* ── Quick-pick tab bar ── */}
              {(()=>{
                const savedLabels=shopItems.map(i=>typeof i==="object"?(i.name||i.label||""):String(i));
                const savedSet=new Set(savedLabels);
                const seen=new Set();
                const histNames=[];
                (sales||[]).forEach(s=>{(s.items||[]).forEach(it=>{const n=(it.name||"").trim();if(n&&!savedSet.has(n)&&!seen.has(n)){seen.add(n);histNames.push(n);}});});
                histNames.sort((a,b)=>a.localeCompare(b));
                const fillName=(name)=>{const ei=lines.findIndex(l=>!l.name.trim());if(ei>=0)updateLine(lines[ei].id,"name",name);else setLines(ls=>[...ls,{...blankLine(),name}]);};
                return(
                  <div style={{marginBottom:10}}>
                    {savedLabels.length>0&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:5}}>
                        {savedLabels.map((label,idx)=>(
                          <div key={idx} style={{display:"inline-flex",alignItems:"center",borderRadius:999,border:"1px solid "+shop.accent+"55",background:shop.accentBg,overflow:"hidden"}}>
                            <button type="button" onClick={()=>fillName(label)} style={{padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",background:"transparent",border:"none",color:shop.accentText}}>{label}</button>
                            <button type="button" onClick={()=>onDeleteShopItem&&onDeleteShopItem(label)} title="Remove" style={{padding:"0 8px 0 0",fontSize:12,cursor:"pointer",background:"transparent",border:"none",color:"#94a3b8",lineHeight:1}}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {histNames.length>0&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:5}}>
                        {histNames.map((name,i)=>(
                          <div key={i} style={{display:"inline-flex",alignItems:"center",borderRadius:999,border:"1px solid #cbd5e1",background:"white",overflow:"hidden"}}>
                            <button type="button" onClick={()=>fillName(name)} style={{padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:"transparent",border:"none",color:"#475569"}}>{name}</button>
                            <button type="button" onClick={()=>onAddShopItem&&onAddShopItem(name)} title="Pin tab" style={{padding:"0 8px 0 0",fontSize:11,cursor:"pointer",background:"transparent",border:"none",color:"#94a3b8",lineHeight:1}}>★</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <AddTabInput onAdd={(name)=>onAddShopItem&&onAddShopItem(name)} accent={shop.accent}/>
                  </div>
                );
              })()}
              {/* ── Item rows ── */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 52px 76px 26px",gap:5,marginBottom:4}}>
                <span style={{...lbl,marginBottom:0}}>Item</span><span style={{...lbl,marginBottom:0}}>Qty</span><span style={{...lbl,marginBottom:0}}>Price</span><span/>
              </div>
              {lines.map((line,idx)=>(
                <div key={line.id} style={{display:"grid",gridTemplateColumns:"1fr 52px 76px 26px",gap:5,marginBottom:5,alignItems:"center"}}>
                  <input value={line.name} onChange={e=>updateLine(line.id,"name",e.target.value)} placeholder={"Item "+(idx+1)} style={{...inp,padding:"7px 8px"}} onFocus={fo} onBlur={bl}/>
                  <input type="number" onWheel={e=>e.target.blur()} value={line.qty} onChange={e=>updateLine(line.id,"qty",e.target.value)} style={{...inp,textAlign:"center",padding:"7px 5px"}} onFocus={fo} onBlur={bl}/>
                  <input type="number" onWheel={e=>e.target.blur()} value={line.price} onChange={e=>updateLine(line.id,"price",e.target.value)} placeholder="0.00" style={{...inp,textAlign:"right",padding:"7px 8px"}} onFocus={fo} onBlur={bl}/>
                  <button type="button" onClick={()=>removeLine(line.id)} style={{width:26,height:32,borderRadius:7,border:"1px solid #fecaca",background:"#fff5f5",color:"#dc2626",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                </div>
              ))}
              <button type="button" onClick={addLine} style={{padding:"5px 12px",borderRadius:7,border:"1px dashed "+shop.accent+"55",background:shop.accentBg,color:shop.accentText,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>＋ Add Item</button>
            </div>

            {/* Pricing */}
            <div style={{background:"#f8fafc",borderRadius:12,padding:"11px 12px",marginBottom:8,border:"1px solid #f1f5f9"}}>
              <p style={{margin:"0 0 8px",fontSize:10,fontWeight:800,color:shop.accent,textTransform:"uppercase",letterSpacing:"0.07em"}}>💰 Pricing</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:8}}>
                <div><label style={lbl}>Discount ({shop.symbol})</label><input type="number" onWheel={e=>e.target.blur()} value={form.discount} onChange={e=>set("discount",e.target.value)} placeholder="0.00" style={inp} onFocus={fo} onBlur={bl}/></div>
                <div><label style={lbl}>Other Charges ({shop.symbol})</label><input type="number" onWheel={e=>e.target.blur()} value={form.otherCharges} onChange={e=>set("otherCharges",e.target.value)} placeholder="0.00" style={inp} onFocus={fo} onBlur={bl}/></div>
              </div>
              <div style={{display:"flex",gap:5}}>{[0,5,10,18,20].map(r=>(<button key={r} type="button" onClick={()=>set("taxRate",r)} style={{flex:1,padding:"5px 0",borderRadius:8,border:"2px solid "+(form.taxRate===r?shop.accent:"#e2e8f0"),background:form.taxRate===r?shop.accent:"white",color:form.taxRate===r?"white":"#374151",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{r}%</button>))}</div>
            </div>

            {/* Payment & Delivery */}
            <div style={{background:"#f8fafc",borderRadius:12,padding:"11px 12px",marginBottom:8,border:"1px solid #f1f5f9"}}>
              <p style={{margin:"0 0 8px",fontSize:10,fontWeight:800,color:shop.accent,textTransform:"uppercase",letterSpacing:"0.07em"}}>🚚 Payment & Delivery</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:7}}>
                <div><label style={lbl}>Payment By</label><select value={form.payBy} onChange={e=>set("payBy",e.target.value)} style={inp}>{["SHOP","BANK","EXCHANGE","GIFT","PROMOTION"].map(o=><option key={o}>{o}</option>)}</select></div>
                <div><label style={lbl}>Status</label><select value={form.status} onChange={e=>set("status",e.target.value)} style={{...inp,fontSize:10,fontWeight:700,color:statusColor[form.status]||"#374151"}}>{(shopId==="ros-india"?["ORDER NOT PLACED","WORK IN PROGRESS","FULFILLED","RETURN REQUESTED","RETURN RECEIVED","EXCHANGED","REFUNDED"]:["PENDING","FULFILLED","GOOD FEEDBACK","RTRN REQSTD","RETRN RCVD","EXCHANGED","REFUNDED"]).map(o=>(<option key={o}>{o}</option>))}</select></div>
              </div>
              {form.payBy==="SHOP"&&(
                <div style={{marginBottom:7}}><label style={lbl}>Shop Invoice No.</label><input value={form.shopInvoiceNo} onChange={e=>set("shopInvoiceNo",e.target.value)} placeholder="e.g. 4666" style={{...inp,fontFamily:"DM Mono,monospace"}} onFocus={fo} onBlur={bl}/></div>
              )}
              <div><label style={lbl}>Dispatch Date</label><input type="date" value={form.sentDate} onChange={e=>set("sentDate",e.target.value)} style={inp} onFocus={fo} onBlur={bl}/></div>
              <div style={{marginTop:7}}><label style={{...lbl,color:"#0369a1"}}>📦 Tracking No.</label><input value={form.trackingNo} onChange={e=>set("trackingNo",e.target.value.toUpperCase())} placeholder="e.g. AB123456789GB" style={{...inp,fontFamily:"DM Mono,monospace",border:"1px solid #7dd3fc"}} onFocus={fo} onBlur={bl}/></div>
            </div>

            {/* Tags & Remarks */}
            <div style={{background:"#f8fafc",borderRadius:12,padding:"11px 12px",marginBottom:8,border:"1px solid #f1f5f9"}}>
              <p style={{margin:"0 0 8px",fontSize:10,fontWeight:800,color:shop.accent,textTransform:"uppercase",letterSpacing:"0.07em"}}>🏷️ Tags & Notes</p>
              <TagPicker value={form.tag} onChange={v=>set("tag",v)} accent={shop.accent} accentBg={shop.accentBg} inp={inp} fo={fo} bl={bl} lbl={lbl}/>
              <div style={{marginTop:7}}><label style={lbl}>Remarks</label><input value={form.remarks} onChange={e=>set("remarks",e.target.value)} placeholder="Notes…" style={inp} onFocus={fo} onBlur={bl}/></div>
            </div>

            {/* Purchase Details — ROS INDIA only */}
            {shopId==="ros-india"&&(<div style={{background:"#f0fdf4",borderRadius:12,padding:"11px 12px",marginBottom:8,border:"1px solid #bbf7d0"}}>
              <p style={{margin:"0 0 8px",fontSize:10,fontWeight:800,color:"#166534",textTransform:"uppercase",letterSpacing:"0.07em"}}>📦 Purchase Details</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:7}}>
                <div><label style={{...lbl,color:"#166534"}}>Pur. Inv. No.</label><input value={form.purInvNo} onChange={e=>set("purInvNo",e.target.value)} placeholder="Invoice no." style={{...inp,border:"1px solid #86efac"}} onFocus={fo} onBlur={bl}/></div>
                <div><label style={{...lbl,color:"#166534"}}>Pur. Date</label><input type="date" value={form.purInvDate} onChange={e=>set("purInvDate",e.target.value)} style={{...inp,border:"1px solid #86efac"}} onFocus={fo} onBlur={bl}/></div>
              </div>
              <div><label style={{...lbl,color:"#166534"}}>Pur. Amount ({shop.symbol})</label><input type="number" onWheel={e=>e.target.blur()} value={form.purAmount} onChange={e=>set("purAmount",e.target.value)} placeholder="0.00" style={{...inp,border:"1px solid #86efac"}} onFocus={fo} onBlur={bl}/></div>
            </div>)}

        <div style={{height:80}}/>{/* spacer for sticky bottom bar */}
      </div>

      {/* ── Sticky bottom bar ── */}
      <div style={{flexShrink:0,borderTop:"1px solid #f1f5f9",background:"white",padding:"10px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{margin:0,fontSize:10,color:"#94a3b8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>Total</p>
            <p style={{margin:0,fontSize:20,fontWeight:900,color:shop.accent,fontFamily:"DM Mono,monospace",letterSpacing:"-0.5px"}}>{shop.symbol}{grandTotal.toLocaleString()}</p>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onClose} style={{padding:"10px 18px",borderRadius:10,border:"1px solid #e2e8f0",background:"white",color:"#64748b",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            <button onClick={handleSave} style={{padding:"10px 24px",borderRadius:10,border:"none",background:shop.accent,color:"white",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px "+shop.accent+"44",display:"flex",alignItems:"center",gap:6}}><span>🛒</span> Save Sale</button>
          </div>
        </div>
      </div>
    </div>
  </>);
};

/* =========================================================
   INLINE PANEL COMPONENTS
   ========================================================= */

/* ── CustomerEditModal — proper component so hooks are always called at top level ── */
const CustomerEditModal=({customer,shop,onSave,onClose})=>{
  const [ef,setEf]=useState({...customer});
  const se=(k,v)=>setEf(f=>({...f,[k]:v}));
  const einp={width:"100%",border:"1px solid #e2e8f0",borderRadius:9,padding:"9px 12px",
    fontSize:13,outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box",
    color:"#374151",background:"white",transition:"border-color 0.15s"};
  const elbl={fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,
    textTransform:"uppercase",letterSpacing:"0.05em"};
  const fo=e=>e.target.style.borderColor=shop.accent;
  const bl=e=>e.target.style.borderColor="#e2e8f0";
  return(
    <div style={{position:"fixed",inset:0,zIndex:70,display:"flex",alignItems:"center",
      justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(5px)"}}/>
      <div style={{position:"relative",background:"white",borderRadius:20,
        boxShadow:"0 32px 64px rgba(0,0,0,0.22)",width:"100%",maxWidth:560,
        maxHeight:"90vh",overflowY:"auto",zIndex:71}}
        onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"16px 24px",borderBottom:"1px solid #f1f5f9",
          background:shop.accent+"10",borderRadius:"20px 20px 0 0"}}>
          <p style={{margin:0,fontWeight:900,fontSize:16,color:"#0f172a"}}>✏️ Edit — {ef.name}</p>
          <button onClick={onClose}
            style={{width:32,height:32,borderRadius:"50%",border:"none",background:"#f1f5f9",
              cursor:"pointer",fontSize:20,color:"#64748b",display:"flex",alignItems:"center",
              justifyContent:"center",lineHeight:1}}>×</button>
        </div>
        <div style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label style={elbl}>Customer Name *</label>
            <input value={ef.name||""} onChange={e=>se("name",e.target.value)}
              style={einp} onFocus={fo} onBlur={bl}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={elbl}>Phone Number</label>
              <input value={ef.phone||""} onChange={e=>se("phone",e.target.value)}
                style={einp} onFocus={fo} onBlur={bl}/>
            </div>
            <div>
              <label style={elbl}>Email</label>
              <input value={ef.email||""} onChange={e=>se("email",e.target.value)}
                style={einp} onFocus={fo} onBlur={bl}/>
            </div>
          </div>
          <div>
            <label style={elbl}>Phone Number Saved On</label>
            <select value={ef.phoneSavedOn||"UK 888"} onChange={e=>se("phoneSavedOn",e.target.value)} style={einp}>
              {["UK 888","INDIA 889","INDIA 888"].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={elbl}>Paid By</label>
              <input value={ef.paidBy||""} onChange={e=>se("paidBy",e.target.value)}
                placeholder="Who sent the money…" style={einp} onFocus={fo} onBlur={bl}/>
            </div>
            <div>
              <label style={elbl}>Addressee</label>
              <input value={ef.addressee||""} onChange={e=>se("addressee",e.target.value)}
                placeholder="Name on delivery label" style={einp} onFocus={fo} onBlur={bl}/>
            </div>
            <div>
              <label style={elbl}>Tag</label>
              <select value={ef.tag||""} onChange={e=>se("tag",e.target.value)} style={einp}>
                {["","VIP","Wholesale","New Customer","Regular","Not Good","Regular Return","Banned"].map(o=>(
                  <option key={o} value={o}>{o||"None"}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label style={elbl}>Address</label>
            <textarea value={ef.address||""} onChange={e=>se("address",e.target.value)}
              rows={2} style={{...einp,resize:"vertical"}} onFocus={fo} onBlur={bl}/>
          </div>
          <div>
            <label style={elbl}>Notes / Remarks</label>
            <textarea value={ef.notes||""} onChange={e=>se("notes",e.target.value)}
              rows={2} style={{...einp,resize:"vertical"}} onFocus={fo} onBlur={bl}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,paddingTop:4}}>
            <button onClick={()=>onSave(ef)}
              style={{padding:"12px 0",borderRadius:11,border:"none",
                background:shop.accent,color:"white",fontWeight:800,fontSize:14,
                cursor:"pointer",fontFamily:"inherit",
                boxShadow:"0 4px 14px "+shop.accent+"44"}}>
              💾 Save Changes
            </button>
            <button onClick={onClose}
              style={{padding:"12px 0",borderRadius:11,border:"1px solid #e2e8f0",
                background:"white",color:"#374151",fontWeight:700,fontSize:14,
                cursor:"pointer",fontFamily:"inherit"}}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── CustomersPanel ── */
const CustomersPanel=({customers,search,shop,Badge,setCustomers,user,dbDeleteCustomer,sales=[]})=>{
  const [viewCust,setViewCust]=useState(null);
  const [editCust,setEditCust]=useState(null);
  const [delCust,setDelCust]=useState(null);   // customer staged for deletion
  const [hovR,setHovR]=useState(null);
  const [tagFilter,setTagFilter]=useState(null); // must be declared before filtered
  const ALL_TAGS=["VIP","Wholesale","New Customer","Regular","Not Good","Regular Return","Banned"];
  const filtered=(customers||[]).filter(c=>{
    const matchSearch=!search||c.name.toLowerCase().includes(search.toLowerCase())||
      (c.phone||"").includes(search)||(c.tag||"").toLowerCase().includes(search.toLowerCase());
    const matchTag=!tagFilter||(c.tag||"")===tagFilter;
    return matchSearch&&matchTag;
  });
  const tagColor={
    "VIP":            {bg:"#fef9c3",color:"#854d0e",border:"#fde047",ic:"⭐"},
    "Wholesale":      {bg:"#ede9fe",color:"#5b21b6",border:"#c4b5fd",ic:"📦"},
    "New Customer":   {bg:"#dbeafe",color:"#1e40af",border:"#93c5fd",ic:"🆕"},
    "Regular":        {bg:"#dcfce7",color:"#166534",border:"#86efac",ic:"✅"},
    "Not Good":       {bg:"#fff7ed",color:"#c2410c",border:"#fdba74",ic:"⚠️"},
    "Regular Return": {bg:"#fef3c7",color:"#92400e",border:"#fcd34d",ic:"🔄"},
    "Banned":         {bg:"#fee2e2",color:"#991b1b",border:"#f87171",ic:"🚫"},
  };
  const tc=t=>tagColor[t]||{bg:"#f1f5f9",color:"#475569",border:"#e2e8f0",ic:"👤"};

  // ── Refund stats per customer from sales data ──
  const refundStats=React.useMemo(()=>{
    const map={};
    (sales||[]).forEach(s=>{
      const phone=(s.phone||s.contact||"").replace(/\D/g,"").slice(-10);
      const status=(s.ful||s.status||"").toUpperCase();
      const isRefund=status==="REFUNDED"||status==="RETRN RCVD"||status==="RETURN RECEIVED";
      if(!phone)return;
      if(!map[phone])map[phone]={count:0,amount:0};
      if(isRefund){
        map[phone].count+=1;
        map[phone].amount+=Number(s.refundAmt)||Number(s.amount)||0;
      }
    });
    return map;
  },[sales]);

  const getRefunds=(c)=>{
    const phone=(c.phone||"").replace(/\D/g,"").slice(-10);
    return refundStats[phone]||{count:0,amount:0};
  };

  const fmtAmt=(v,spend)=>spend>=10000?("₹"+Math.round(v).toLocaleString()):("£"+v.toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2}));

  /* ── shared input style for edit form ── */
  const einp={width:"100%",border:"1px solid #e2e8f0",borderRadius:9,padding:"9px 12px",
    fontSize:13,outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box",
    color:"#374151",background:"white",transition:"border-color 0.15s"};
  const elbl={fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,
    textTransform:"uppercase",letterSpacing:"0.05em"};

  return(
    <div style={{padding:0}}>
      {/* ══ VIEW MODAL ══ */}
      {viewCust&&(
        <div style={{position:"fixed",inset:0,zIndex:70,display:"flex",alignItems:"center",
          justifyContent:"center",padding:16}} onClick={()=>setViewCust(null)}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(5px)"}}/>
          <div style={{position:"relative",background:"white",borderRadius:20,
            boxShadow:"0 32px 64px rgba(0,0,0,0.22)",width:"100%",maxWidth:560,
            maxHeight:"90vh",overflowY:"auto",zIndex:71}}
            onClick={e=>e.stopPropagation()}>
            {/* header */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"18px 24px",borderBottom:"1px solid #f1f5f9",
              background:shop.accent+"10",borderRadius:"20px 20px 0 0"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:13,background:shop.sb,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:"white",fontWeight:900,fontSize:18,boxShadow:"0 4px 12px rgba(0,0,0,0.15)"}}>
                  {viewCust.name.charAt(0)}
                </div>
                <div>
                  <p style={{margin:0,fontWeight:900,fontSize:16,color:"#0f172a"}}>{viewCust.name}</p>
                  {viewCust.tag&&(()=>{const t=tc(viewCust.tag);return(
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:999,
                      background:t.bg,color:t.color,border:"1px solid "+t.border}}>{viewCust.tag}</span>
                  );})()}
                </div>
              </div>
              <button onClick={()=>setViewCust(null)}
                style={{width:32,height:32,borderRadius:"50%",border:"none",background:"#f1f5f9",
                  cursor:"pointer",fontSize:20,color:"#64748b",display:"flex",alignItems:"center",
                  justifyContent:"center",lineHeight:1}}>×</button>
            </div>
            {/* body */}
            <div style={{padding:24}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                {[
                  {l:"Phone",         v:viewCust.phone||"—",         ic:"📞"},
                  {l:"Phone Saved On",v:viewCust.phoneSavedOn||"—",  ic:"📱"},
                  {l:"WhatsApp",      v:viewCust.whatsapp||"—",      ic:"💬"},
                  {l:"Email",         v:viewCust.email||"—",         ic:"📧"},
                  {l:"Purchases",     v:viewCust.purchases||0,        ic:"🛒"},
                  {l:"Gross Spend",   v:fmtAmt(viewCust.spend||0,viewCust.spend||0),ic:"💰"},
                  {l:"Refunds",       v:(()=>{const r=getRefunds(viewCust);return r.count>0?r.count+" refund"+(r.count>1?"s":""):"None";})(), ic:"↩️"},
                  {l:"Refund Amount", v:(()=>{const r=getRefunds(viewCust);return r.count>0?fmtAmt(r.amount,viewCust.spend||0):"—";})(), ic:"💸"},
                  {l:"Net Spend",     v:(()=>{const r=getRefunds(viewCust);return fmtAmt(Math.max(0,(viewCust.spend||0)-r.amount),viewCust.spend||0);})(), ic:"✅"},
                  {l:"Last Order",    v:viewCust.last||"—",           ic:"📅"},
                  {l:"Addressee",     v:viewCust.addressee||"—",      ic:"🏷"},
                ].map((f,i)=>(
                  <div key={i} style={{background:"#f8fafc",borderRadius:10,padding:"10px 14px",
                    border:"1px solid #f1f5f9"}}>
                    <p style={{margin:"0 0 3px",fontSize:9,fontWeight:800,color:"#94a3b8",
                      textTransform:"uppercase",letterSpacing:"0.06em"}}>{f.ic} {f.l}</p>
                    <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0f172a",
                      wordBreak:"break-word"}}>{String(f.v)}</p>
                  </div>
                ))}
              </div>
              {/* address full width */}
              <div style={{background:"#f8fafc",borderRadius:10,padding:"10px 14px",
                border:"1px solid #f1f5f9",marginBottom:12}}>
                <p style={{margin:"0 0 3px",fontSize:9,fontWeight:800,color:"#94a3b8",
                  textTransform:"uppercase",letterSpacing:"0.06em"}}>📍 Address</p>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0f172a"}}>{viewCust.address||"—"}</p>
              </div>
              {viewCust.notes&&(
                <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,
                  padding:"10px 14px",marginBottom:12}}>
                  <p style={{margin:"0 0 3px",fontSize:9,fontWeight:800,color:"#92400e",
                    textTransform:"uppercase",letterSpacing:"0.06em"}}>📝 Notes</p>
                  <p style={{margin:0,fontSize:13,color:"#92400e"}}>{viewCust.notes}</p>
                </div>
              )}
              <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
                <button onClick={()=>{setEditCust(viewCust);setViewCust(null);}}
                  style={{padding:"9px 20px",borderRadius:10,border:"none",
                    background:shop.accent,color:"white",fontWeight:700,fontSize:13,
                    cursor:"pointer",fontFamily:"inherit",boxShadow:"0 3px 10px "+shop.accent+"44"}}>
                  ✏️ Edit
                </button>
                <button onClick={()=>setViewCust(null)}
                  style={{padding:"9px 20px",borderRadius:10,border:"1px solid #e2e8f0",
                    background:"white",color:"#374151",fontWeight:700,fontSize:13,
                    cursor:"pointer",fontFamily:"inherit"}}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ EDIT MODAL ══ */}
            {editCust&&<CustomerEditModal customer={editCust} shop={shop} onSave={(ef)=>{setCustomers(prev=>prev.map(x=>x.id===ef.id?{...x,...ef}:x));setEditCust(null);}} onClose={()=>setEditCust(null)}/>}

      {/* ══ DELETE CONFIRM MODAL ══ */}
      {delCust&&(
        <div style={{position:"fixed",inset:0,zIndex:70,display:"flex",alignItems:"center",
          justifyContent:"center",padding:16}} onClick={()=>setDelCust(null)}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(5px)"}}/>
          <div style={{position:"relative",background:"white",borderRadius:20,
            boxShadow:"0 32px 64px rgba(0,0,0,0.22)",width:"100%",maxWidth:420,zIndex:71}}
            onClick={e=>e.stopPropagation()}>
            <div style={{padding:28,textAlign:"center"}}>
              <div style={{fontSize:48,marginBottom:12}}>⚠️</div>
              <p style={{margin:"0 0 6px",fontWeight:900,fontSize:17,color:"#991b1b"}}>
                Delete Customer?
              </p>
              <p style={{margin:"0 0 20px",fontSize:13,color:"#64748b",lineHeight:1.6}}>
                You are about to permanently delete <strong style={{color:"#0f172a"}}>{delCust.name}</strong> from the customer database.<br/>This action cannot be undone.
              </p>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setDelCust(null)}
                  style={{flex:1,padding:"12px 0",borderRadius:11,border:"1px solid #e2e8f0",
                    background:"white",color:"#374151",fontWeight:700,fontSize:14,
                    cursor:"pointer",fontFamily:"inherit"}}>
                  ← Cancel
                </button>
                <button onClick={()=>{
                    setCustomers(prev=>prev.filter(x=>x.id!==delCust.id));
                    if(dbDeleteCustomer) dbDeleteCustomer(delCust.id);
                    setDelCust(null);
                  }}
                  style={{flex:1,padding:"12px 0",borderRadius:11,border:"none",
                    background:"#dc2626",color:"white",fontWeight:800,fontSize:14,
                    cursor:"pointer",fontFamily:"inherit",
                    boxShadow:"0 4px 14px rgba(220,38,38,0.35)"}}>
                  🗑 Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ TABLE HEADER + TAG FILTERS ══ */}
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div>
            <h2 style={{margin:"0 0 2px",fontSize:20,fontWeight:800,color:"#0f172a"}}>Customers</h2>
            <p style={{margin:0,fontSize:12,color:"#94a3b8"}}>
              {filtered.length} of {(customers||[]).length} customer{(customers||[]).length!==1?"s":""}
              {tagFilter&&<span style={{color:"#64748b"}}> · filtered by <strong>{tagFilter}</strong></span>}
            </p>
          </div>
          {tagFilter&&(
            <button onClick={()=>setTagFilter(null)}
              style={{fontSize:11,fontWeight:700,color:"#64748b",background:"#f1f5f9",
                border:"1px solid #e2e8f0",borderRadius:999,padding:"4px 12px",
                cursor:"pointer",fontFamily:"inherit"}}>
              ✕ Clear filter
            </button>
          )}
        </div>
        {/* Tag filter pills */}
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {ALL_TAGS.map(tag=>{
            const t=tc(tag);
            const count=(customers||[]).filter(c=>c.tag===tag).length;
            const isActive=tagFilter===tag;
            return(
              <button key={tag}
                onClick={()=>setTagFilter(isActive?null:tag)}
                style={{
                  display:"inline-flex",alignItems:"center",gap:5,
                  fontSize:11,fontWeight:700,padding:"5px 12px",borderRadius:999,
                  cursor:"pointer",fontFamily:"inherit",
                  transition:"all 0.15s",
                  background:isActive?t.color:t.bg,
                  color:isActive?"white":t.color,
                  border:"2px solid "+(isActive?t.color:t.border),
                  boxShadow:isActive?"0 2px 8px "+t.color+"55":"none",
                  transform:isActive?"scale(1.04)":"scale(1)",
                }}>
                <span>{t.ic}</span>
                {tag}
                <span style={{
                  background:isActive?"rgba(255,255,255,0.25)":t.color+"22",
                  color:isActive?"white":t.color,
                  borderRadius:999,padding:"1px 7px",fontSize:10,fontWeight:800,
                }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{background:"white",borderRadius:16,border:"1px solid #f1f5f9",overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.04)"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"#f8fafc",borderBottom:"1px solid #f1f5f9"}}>
              {["Customer","Contact","Address","Purchases","Amount","Refunds","Rfnd. Amt","Net Spend","Last Order","Tag","Actions"].map(h=>(
                <th key={h} style={{padding:"11px 16px",fontSize:10,fontWeight:800,color:"#64748b",
                  textTransform:"uppercase",letterSpacing:"0.06em",
                  textAlign:(h==="Purchases"||h==="Amount"||h==="Refunds"||h==="Rfnd. Amt"||h==="Net Spend")?"right":"left",
                  whiteSpace:"nowrap"}}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0&&(
              <tr><td colSpan={11} style={{padding:40,textAlign:"center",color:"#94a3b8",fontSize:13}}>No customers found</td></tr>
            )}
            {filtered.map((c,i)=>{
              const isH=hovR===c.id;
              const t=tc(c.tag);
              return(
                <tr key={c.id}
                  onMouseEnter={()=>setHovR(c.id)}
                  onMouseLeave={()=>setHovR(null)}
                  style={{
                    borderBottom:i<filtered.length-1?"1px solid #f8fafc":"none",
                    background:isH?"#fafafa":"white",
                    transition:"background 0.12s",
                  }}>
                  {/* Name — clickable to view */}
                  <td style={{padding:"13px 16px",cursor:"pointer"}} onClick={()=>setViewCust(c)}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:34,height:34,borderRadius:10,flexShrink:0,
                        background:shop.sb,display:"flex",alignItems:"center",justifyContent:"center",
                        color:"white",fontWeight:800,fontSize:13,
                        boxShadow:"0 2px 6px rgba(0,0,0,0.12)"}}>
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <p style={{margin:0,fontWeight:700,fontSize:13,color:shop.accent,
                          textDecoration:"underline",textDecorationStyle:"dotted",
                          textUnderlineOffset:3}}>{c.name}</p>
                        {c.notes&&<p style={{margin:0,fontSize:10,color:"#94a3b8"}}>{c.notes}</p>}
                      </div>
                    </div>
                  </td>
                  <td style={{padding:"13px 16px"}}>
                    <p style={{margin:"0 0 2px",fontSize:12,fontWeight:600,color:"#374151"}}>{c.phone}</p>
                    <p style={{margin:0,fontSize:10,color:"#22c55e",fontWeight:600}}>💬 {c.whatsapp}</p>
                    {c.phoneSavedOn&&<p style={{margin:"2px 0 0",fontSize:10,fontWeight:700,color:"#6366f1"}}>📱 {c.phoneSavedOn}</p>}
                  </td>
                  <td style={{padding:"13px 16px",fontSize:12,color:"#64748b",maxWidth:160}}>
                    <span style={{display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.address}</span>
                  </td>
                  {/* Purchases */}
                  <td style={{padding:"13px 16px",textAlign:"right"}}>
                    <span style={{fontSize:14,fontWeight:800,color:shop.accent}}>{c.purchases}</span>
                  </td>
                  {/* Amount (gross spend) */}
                  <td style={{padding:"13px 16px",textAlign:"right"}}>
                    <span style={{fontFamily:"DM Mono,monospace",fontSize:13,fontWeight:700,color:"#0f172a"}}>
                      {fmtAmt(c.spend,c.spend)}
                    </span>
                  </td>
                  {/* Refunds count */}
                  {(()=>{const r=getRefunds(c);return(<>
                    <td style={{padding:"13px 16px",textAlign:"right"}}>
                      {r.count>0
                        ?<span style={{fontSize:13,fontWeight:800,color:"#dc2626",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:6,padding:"2px 9px"}}>{r.count}</span>
                        :<span style={{fontSize:12,color:"#cbd5e1"}}>—</span>}
                    </td>
                    {/* Refund Amount */}
                    <td style={{padding:"13px 16px",textAlign:"right"}}>
                      {r.count>0
                        ?<span style={{fontFamily:"DM Mono,monospace",fontSize:13,fontWeight:700,color:"#dc2626"}}>
                            {fmtAmt(r.amount,c.spend)}
                          </span>
                        :<span style={{fontSize:12,color:"#cbd5e1"}}>—</span>}
                    </td>
                    {/* Net Spend */}
                    <td style={{padding:"13px 16px",textAlign:"right"}}>
                      <span style={{fontFamily:"DM Mono,monospace",fontSize:13,fontWeight:800,
                        color:r.count>0?"#166534":"#0f172a"}}>
                        {fmtAmt(Math.max(0,(c.spend||0)-r.amount),c.spend)}
                      </span>
                    </td>
                  </>);})()} 
                  <td style={{padding:"13px 16px",fontSize:12,color:"#64748b"}}>{c.last}</td>
                  <td style={{padding:"13px 16px"}}>
                    {c.tag&&(
                      <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:999,
                        background:t.bg,color:t.color,border:"1px solid "+t.border,whiteSpace:"nowrap"}}>
                        {c.tag}
                      </span>
                    )}
                  </td>
                  {/* Actions */}
                  <td style={{padding:"13px 16px"}}>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <button onClick={()=>setViewCust(c)}
                        title="View full details"
                        style={{padding:"5px 10px",borderRadius:7,border:"1px solid #e2e8f0",
                          background:"white",color:"#374151",fontSize:12,fontWeight:700,
                          cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",
                          transition:"all 0.13s"}}
                        onMouseEnter={e=>{e.currentTarget.style.background=shop.accentBg;e.currentTarget.style.color=shop.accent;e.currentTarget.style.borderColor=shop.accent;}}
                        onMouseLeave={e=>{e.currentTarget.style.background="white";e.currentTarget.style.color="#374151";e.currentTarget.style.borderColor="#e2e8f0";}}>
                        👁 View
                      </button>
                      <button onClick={()=>setEditCust(c)}
                        title="Edit customer"
                        style={{padding:"5px 10px",borderRadius:7,border:"1px solid "+shop.accent,
                          background:shop.accentBg,color:shop.accent,fontSize:12,fontWeight:700,
                          cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",
                          transition:"all 0.13s"}}
                        onMouseEnter={e=>{e.currentTarget.style.background=shop.accent;e.currentTarget.style.color="white";}}
                        onMouseLeave={e=>{e.currentTarget.style.background=shop.accentBg;e.currentTarget.style.color=shop.accent;}}>
                        ✏️ Edit
                      </button>
                      {(user?.role==="superadmin"||user?.role==="admin")&&(
                        <button onClick={()=>setDelCust(c)}
                          title="Delete customer"
                          style={{padding:"5px 10px",borderRadius:7,border:"1px solid #fca5a5",
                            background:"#fff5f5",color:"#dc2626",fontSize:12,fontWeight:700,
                            cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",
                            transition:"all 0.13s"}}
                          onMouseEnter={e=>{e.currentTarget.style.background="#dc2626";e.currentTarget.style.color="white";}}
                          onMouseLeave={e=>{e.currentTarget.style.background="#fff5f5";e.currentTarget.style.color="#dc2626";}}>
                          🗑
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
    dbDeleteUser(id).catch(err=>console.error("Delete user failed:",err));
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
  superadmin:["dashboard","sales","purchases","logistics","customers","suppliers","agents","products","invoices","expenses","cashflow","documents","analytics","reports","messages","returns","settings"],
  admin:["dashboard","sales","purchases","logistics","customers","suppliers","agents","products","invoices","expenses","cashflow","documents","analytics","reports","messages","returns"],
  staff:["sales","messages"],
};
const SHOP_IDS=["ros-selections","ros-hairlines","ros-india"];


/* =========================================================
   UI COMPONENTS
   ========================================================= */

/* ── Login Screen ── */
const LoginScreen=({onLogin,users})=>{
  const [selUser,setSelUser]=useState(null);
  const [pin,setPin]=useState("");
  const [err,setErr]=useState("");
  const [shake,setShake]=useState(false);
  const [success,setSuccess]=useState(false);
  const [hovB,setHovB]=useState(null);

  const handlePin=(d)=>{
    if(pin.length>=4||success)return;
    const np=pin+d;
    setPin(np);
    setErr("");
    if(np.length===4){
      setTimeout(()=>{
        const liveUser=users.find(x=>x.id===selUser.id)||selUser;
        if(np===liveUser.pin){
          setSuccess(true);
          setTimeout(()=>onLogin(liveUser),420);
        } else {
          setShake(true);
          setErr("Incorrect PIN — try again");
          setPin("");
          setTimeout(()=>setShake(false),500);
        }
      },180);
    }
  };
  const handleDel=()=>{setPin(p=>p.slice(0,-1));setErr("");};
  const handleBack=()=>{setSelUser(null);setPin("");setErr("");setSuccess(false);setShake(false);};

  const ROLE_LABELS={"superadmin":"Super Admin","admin":"Administrator","staff":"Staff"};

  return(
    <div style={{
      minHeight:"100vh",width:"100vw",
      background:"#060b14",
      display:"flex",alignItems:"stretch",
      fontFamily:"'DM Sans',system-ui,sans-serif",
      position:"relative",overflow:"hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&family=Syne:wght@700;800&display=swap');
        @keyframes ros-floatOrb{0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-28px) scale(1.04);}}
        @keyframes ros-fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        @keyframes ros-fadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes ros-shake{0%,100%{transform:translateX(0);}20%{transform:translateX(-9px);}40%{transform:translateX(9px);}60%{transform:translateX(-6px);}80%{transform:translateX(6px);}}
        @keyframes ros-pulse{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.5);}50%{box-shadow:0 0 0 8px rgba(16,185,129,0);}}
        .ros-user-card{transition:all 0.22s cubic-bezier(0.34,1.56,0.64,1);cursor:pointer;}
        .ros-user-card:hover{transform:translateY(-3px) scale(1.02)!important;background:rgba(255,255,255,0.08)!important;border-color:rgba(255,255,255,0.18)!important;box-shadow:0 16px 40px rgba(0,0,0,0.5)!important;}
        .ros-pin-btn{transition:background 0.12s,border-color 0.12s,transform 0.1s;cursor:pointer;}
        .ros-pin-btn:hover:not([data-empty]){background:rgba(255,255,255,0.13)!important;border-color:rgba(255,255,255,0.22)!important;}
        .ros-pin-btn:active:not([data-empty]){transform:scale(0.90)!important;}
        @media(max-width:700px){.ros-left-panel{display:none!important;}.ros-right-panel{padding:36px 20px!important;}}
      `}</style>

      {/* LEFT — branding */}
      <div className="ros-left-panel" style={{
        flex:"0 0 44%",
        background:"linear-gradient(155deg,#0d1f3c 0%,#091526 55%,#060b14 100%)",
        display:"flex",flexDirection:"column",justifyContent:"space-between",
        padding:"52px 56px",position:"relative",overflow:"hidden",
      }}>
        <div style={{position:"absolute",top:-90,left:-90,width:420,height:420,borderRadius:"50%",background:"radial-gradient(circle,rgba(37,99,235,0.18) 0%,transparent 68%)",animation:"ros-floatOrb 7s ease-in-out infinite",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:-70,right:-70,width:380,height:380,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,58,237,0.14) 0%,transparent 68%)",animation:"ros-floatOrb 9s ease-in-out infinite reverse",pointerEvents:"none"}}/>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.024) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.024) 1px,transparent 1px)",backgroundSize:"48px 48px",pointerEvents:"none"}}/>

        <div style={{position:"relative",zIndex:1,animation:"ros-fadeUp 0.7s ease both"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:48,height:48,borderRadius:15,background:"linear-gradient(135deg,#2563eb,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 24px rgba(37,99,235,0.50)",flexShrink:0}}>
              <span style={{color:"white",fontWeight:900,fontSize:22,fontFamily:"'Syne',sans-serif"}}>R</span>
            </div>
            <div>
              <p style={{margin:0,fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:"white",letterSpacing:"-0.2px",lineHeight:1.2}}>ROS Nexus</p>
              <p style={{margin:0,fontSize:10,fontWeight:500,letterSpacing:"0.10em",textTransform:"uppercase",color:"rgba(255,255,255,0.32)"}}>Business Suite</p>
            </div>
          </div>
        </div>

        <div style={{position:"relative",zIndex:1,animation:"ros-fadeUp 0.7s 0.15s ease both",opacity:0,animationFillMode:"forwards"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(37,99,235,0.14)",border:"1px solid rgba(37,99,235,0.28)",borderRadius:999,padding:"5px 14px",marginBottom:22}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#60a5fa",display:"inline-block"}}/>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(255,255,255,0.65)"}}>Secure Access Portal</span>
          </div>
          <h1 style={{margin:"0 0 18px",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"clamp(30px,3vw,44px)",color:"white",lineHeight:1.12,letterSpacing:"-1px"}}>
            Run your business<br/>
            <span style={{background:"linear-gradient(90deg,#3b82f6 0%,#8b5cf6 50%,#06b6d4 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>with confidence.</span>
          </h1>
          <p style={{margin:0,fontSize:14,color:"rgba(255,255,255,0.38)",lineHeight:1.75,maxWidth:320,fontWeight:400}}>
            Manage sales, customers, inventory and finances across all your shops — in one unified dashboard.
          </p>
        </div>

        <div style={{position:"relative",zIndex:1,animation:"ros-fadeIn 1s 0.5s ease both",opacity:0,animationFillMode:"forwards"}}>
          <p style={{margin:0,fontSize:11,color:"rgba(255,255,255,0.16)",fontWeight:500}}>© {new Date().getFullYear()} ROS Nexus · All rights reserved</p>
        </div>
      </div>

      {/* RIGHT — login form */}
      <div className="ros-right-panel" style={{
        flex:1,background:"#0a0f1a",
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        padding:"48px 32px",position:"relative",
      }}>
        <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(rgba(255,255,255,0.018) 1px,transparent 1px)",backgroundSize:"24px 24px",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:0,left:0,width:1,height:"100%",background:"linear-gradient(180deg,transparent 0%,rgba(255,255,255,0.06) 30%,rgba(255,255,255,0.06) 70%,transparent 100%)"}}/>

        <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:360}}>
          {!selUser?(
            <div style={{animation:"ros-fadeUp 0.5s ease both"}}>
              <div style={{marginBottom:32}}>
                <h2 style={{margin:"0 0 6px",fontSize:26,fontWeight:800,color:"white",letterSpacing:"-0.5px",fontFamily:"'Syne',sans-serif"}}>Welcome back</h2>
                <p style={{margin:0,fontSize:13,color:"rgba(255,255,255,0.36)",fontWeight:400}}>Choose your account to continue</p>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {(users||[]).map((u,i)=>(
                  <div key={u.id} className="ros-user-card" onClick={()=>setSelUser(u)}
                    style={{display:"flex",alignItems:"center",gap:14,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:"14px 16px",boxShadow:"0 4px 20px rgba(0,0,0,0.28)"}}>
                    <div style={{width:44,height:44,borderRadius:13,background:u.avatar,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800,fontSize:15,flexShrink:0,boxShadow:"0 4px 14px rgba(0,0,0,0.35)"}}>
                      {u.initials}
                    </div>
                    <div style={{flex:1}}>
                      <p style={{margin:"0 0 2px",fontWeight:700,fontSize:14,color:"white"}}>{u.name}</p>
                      <p style={{margin:0,fontSize:11,fontWeight:500,color:"rgba(255,255,255,0.30)",textTransform:"capitalize"}}>{ROLE_LABELS[u.role]||u.role}</p>
                    </div>
                    <div style={{width:28,height:28,borderRadius:9,background:"rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.30)",fontSize:14}}>›</div>
                  </div>
                ))}
              </div>
              <p style={{textAlign:"center",marginTop:36,fontSize:11,color:"rgba(255,255,255,0.14)",fontWeight:500,letterSpacing:"0.06em"}}>DEVELOPED BY ROS NEXUS</p>
            </div>
          ):(
            <div style={{animation:"ros-fadeUp 0.4s ease both",textAlign:"center"}}>
              <button onClick={handleBack}
                style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"7px 14px",cursor:"pointer",color:"rgba(255,255,255,0.42)",fontSize:12,fontWeight:600,fontFamily:"inherit",marginBottom:28,transition:"all 0.15s",outline:"none"}}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.10)";e.currentTarget.style.color="white";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.color="rgba(255,255,255,0.42)";}}>
                ← All accounts
              </button>
              <div style={{marginBottom:22}}>
                <div style={{width:66,height:66,borderRadius:20,background:selUser.avatar,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800,fontSize:24,margin:"0 auto 12px",boxShadow:"0 8px 32px rgba(0,0,0,0.50)",transition:"all 0.3s",animation:success?"ros-pulse 0.6s ease":"none"}}>
                  {success?"✓":selUser.initials}
                </div>
                <p style={{margin:"0 0 6px",fontWeight:700,fontSize:18,color:"white",fontFamily:"'Syne',sans-serif"}}>{selUser.name}</p>
                <span style={{display:"inline-block",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(255,255,255,0.40)",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.10)",borderRadius:999,padding:"3px 12px"}}>
                  {ROLE_LABELS[selUser.role]||selUser.role}
                </span>
              </div>
              <div style={{animation:shake?"ros-shake 0.45s ease":"none",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"center",gap:18,marginBottom:10}}>
                  {[0,1,2,3].map(i=>{
                    const filled=pin.length>i;
                    return(<div key={i} style={{width:13,height:13,borderRadius:"50%",background:success?"#10b981":filled?"white":"transparent",border:"2px solid "+(success?"#10b981":filled?"white":"rgba(255,255,255,0.22)"),transition:"all 0.15s",transform:filled?"scale(1.18)":"scale(1)",boxShadow:success?"0 0 12px rgba(16,185,129,0.60)":filled?"0 0 10px rgba(255,255,255,0.45)":"none"}}/>);
                  })}
                </div>
                <p style={{margin:0,minHeight:20,fontSize:12,fontWeight:600,color:err?"#f87171":success?"#34d399":"rgba(255,255,255,0.28)",transition:"color 0.2s"}}>
                  {err||(success?"Signing in…":"Enter your 4-digit PIN")}
                </p>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:20,opacity:success?0.35:1,transition:"opacity 0.3s"}}>
                {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i)=>{
                  const isEmpty=d==="";const isDel=d==="⌫";
                  return(
                    <button key={i} className="ros-pin-btn" data-empty={isEmpty||undefined}
                      onMouseEnter={()=>!isEmpty&&setHovB(i)} onMouseLeave={()=>setHovB(null)}
                      onClick={()=>{if(isEmpty||success)return;isDel?handleDel():handlePin(String(d));}}
                      style={{height:56,borderRadius:14,border:"1px solid "+(isEmpty?"transparent":"rgba(255,255,255,0.09)"),background:isEmpty?"transparent":"rgba(255,255,255,0.05)",color:isEmpty?"transparent":isDel?"rgba(255,255,255,0.50)":"white",fontSize:isDel?20:22,fontWeight:isDel?400:700,cursor:isEmpty?"default":"pointer",fontFamily:"inherit",outline:"none"}}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function App(){
  // Public routes — render without login
  const path=window.location.pathname;
  if(path==="/returns") return <ReturnsPortal/>;
  if(path==="/return-tracking") return <ReturnTrackingPortal/>;

  // Always start logged-out — login page shown on every fresh load
  const [user,setUser]=useState(null);
  const [shop,setShop]=useState(null);
  const [users,setUsers]=useState(INITIAL_USERS);
  // Load users from Supabase on mount
  useEffect(()=>{
    dbLoadUsers().then(data=>{
      if(data&&data.length>0) setUsers(data);
    }).catch(()=>{});
  },[]);
  const setUsersPersist=(updater)=>{
    setUsers(prev=>{
      const next=typeof updater==="function"?updater(prev):updater;
      // Persist each changed user to Supabase
      next.forEach(u=>dbSaveUser(u).catch(err=>console.error("Save user failed:",err)));
      return next;
    });
  };
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [salesData,setSalesData]=useState({"ros-selections":[],"ros-hairlines":[],"ros-india":[]});
  const [customers,setCustomers]=useState([]);
  const [shopItems,setShopItems]=useState({"ros-selections":[],"ros-hairlines":[],"ros-india":[]});
  useEffect(()=>{dbLoadShopItems().then(data=>{if(data)setShopItems({"ros-selections":data["ros-selections"]||[],"ros-hairlines":data["ros-hairlines"]||[],"ros-india":data["ros-india"]||[]});});},[]);
  const saveShopItems=(updated)=>setShopItems(updated);

  const updateSalesData=setSalesData;

  // Self-heal: clear any corrupted ros_shopItems from localStorage on first mount
  useEffect(()=>{
    try{
      const raw=localStorage.getItem("ros_shopItems");
      if(raw){
        const parsed=JSON.parse(raw);
        const hasObjects=["ros-selections","ros-hairlines","ros-india"].some(k=>
          (parsed[k]||[]).some(x=>typeof x==="object"&&x!==null)
        );
        if(hasObjects){
          console.warn("🔧 Clearing corrupted ros_shopItems from localStorage");
          localStorage.removeItem("ros_shopItems");
          setShopItems({"ros-selections":[],"ros-hairlines":[],"ros-india":[]});
        }
      }
    }catch{}
  },[]);

  // Load from Supabase on mount - Supabase is single source of truth
  useEffect(()=>{
    const shops=["ros-selections","ros-hairlines","ros-india"];
    shops.forEach(sid=>{
      dbLoadSales(sid).then(data=>{
        if(!data) return;
        setSalesData(prev=>({...prev,[sid]:data.map(normaliseSale)}));
      }).catch(()=>{});
    });
    dbLoadCustomers().then(data=>{
      if(data&&data.length>0) setCustomers(data);
    }).catch(()=>{});
  },[]);

  const handleLogin=u=>{
    const fresh=users.find(x=>x.id===u.id)||u;
    setUser(fresh);setShop(null);
  };

  const handleLogout=()=>{
    setUser(null);setShop(null);
  };

  const [initialTab,setInitialTab]=React.useState("sales");
  const handleSetShop=(s,goTab="sales")=>{
    setShop(s);
    setInitialTab(goTab);
    try{localStorage.setItem("ros_shop",s);}catch{}
  };

  if(!user) return <LoginScreen users={users} onLogin={handleLogin}/>;

  const allowedShops=(user.shops&&user.shops.length>0)?user.shops:SHOP_IDS;

  // Auto-route staff directly to their assigned shop
  const activeShop = shop || (user.role==="staff" && allowedShops.length===1 ? allowedShops[0] : null);

  if(activeShop&&allowedShops.includes(activeShop))
    return <ShopDashboard shopId={activeShop} onBack={()=>{if(user.role!=="staff"){setShop(null);setInitialTab("sales");try{localStorage.removeItem("ros_shop");}catch{}}}} user={user} onLogout={handleLogout} salesData={salesData} setSalesData={updateSalesData} customers={customers} setCustomers={setCustomers} shopItems={shopItems} saveShopItems={saveShopItems} initialTab={initialTab}/>;

  return(
    <>
      <ShopSelector onSelect={handleSetShop} user={user} salesData={salesData}
        onLogout={handleLogout}
        onOpenSettings={()=>setSettingsOpen(true)}/>
      {settingsOpen&&user?.role==="superadmin"&&(
        <SettingsPanel
          users={users}
          setUsers={setUsersPersist}
          currentUser={user}
          onClose={()=>setSettingsOpen(false)}/>
      )}
    </>
  );
}