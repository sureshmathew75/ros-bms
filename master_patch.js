#!/usr/bin/env node
/**
 * ROS BMS Master Patch Script
 * Run: node master_patch.js
 * Applies ALL fixes to src/App.jsx and src/db.js
 */
const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, 'src', 'App.jsx');
const DB  = path.join(__dirname, 'src', 'db.js');

if (!fs.existsSync(APP)) { console.error('src/App.jsx not found'); process.exit(1); }
if (!fs.existsSync(DB))  { console.error('src/db.js not found');  process.exit(1); }

let app = fs.readFileSync(APP, 'utf8');
let db  = fs.readFileSync(DB,  'utf8');
const done = [], skipped = [];

function fix(label, src, old, neu) {
  if (src.includes(neu)) { skipped.push(label); return src; }
  if (!src.includes(old)) { console.error('NOT FOUND: ' + label); return src; }
  done.push(label);
  return src.split(old).join(neu);
}

// ── DB.JS FIXES ──────────────────────────────────────────────────────────────

// Add shop_items functions if missing
if (!db.includes('dbLoadShopItems')) {
  db += `
// ── Shop Items (quick-add capsules in New Sale form) ─────────────────────────
export const dbLoadShopItems = async () => {
  if (!sb) return {};
  const { data, error } = await sb.from('shop_items').select('shop_id,name').order('created_at');
  if (error) { console.error('Load shop items error:', error); return {}; }
  const result = { 'ros-selections': [], 'ros-hairlines': [], 'ros-india': [] };
  (data || []).forEach(r => { if (result[r.shop_id]) result[r.shop_id].push(r.name); });
  return result;
};
export const dbAddShopItem = async (shopId, name) => {
  if (!sb) return;
  const { error } = await sb.from('shop_items').insert({ shop_id: shopId, name: name.trim() });
  if (error && !error.message.includes('duplicate')) console.error('Add shop item error:', error);
};
export const dbDeleteShopItem = async (shopId, name) => {
  if (!sb) return;
  const { error } = await sb.from('shop_items').delete().eq('shop_id', shopId).eq('name', name);
  if (error) console.error('Delete shop item error:', error);
};
`;
  done.push('DB: shop_items functions');
} else { skipped.push('DB: shop_items functions'); }

// ── APP.JSX FIXES ─────────────────────────────────────────────────────────────

// 1. Import db functions
app = fix('1. DB imports',  app,
  'dbLoadUsers, dbSaveUser, dbDeleteUser } from "./db";',
  'dbLoadUsers, dbSaveUser, dbDeleteUser, dbLoadShopItems, dbAddShopItem, dbDeleteShopItem } from "./db";');

// 2. Cashflow sidebar
app = fix('2. Cashflow sidebar', app,
  '{label:"FINANCE", ids:["invoices","expenses"]},',
  '{label:"FINANCE", ids:["invoices","expenses","cashflow"]},');

// 3. cfFY states
app = fix('3. cfFY states', app,
  '  const [openMenu,setOpenMenu]=useState(null);\r\n',
  '  const [openMenu,setOpenMenu]=useState(null);\r\n' +
  '  const [cfFY,setCfFY]=useState(()=>{const n=new Date();return n.getMonth()>=3?n.getFullYear():n.getFullYear()-1;});\r\n' +
  '  const [cfOpenBal,setCfOpenBal]=useState(()=>{try{const s=localStorage.getItem("ros_cf_openbal");return s?JSON.parse(s):{};}catch{return{};}});\r\n' +
  '  const [obEdit,setObEdit]=useState(false);\r\n' +
  '  const [obInput,setObInput]=useState("");\r\n');

// 4. ShopItems from Supabase
app = fix('4. ShopItems Supabase', app,
  '  const [shopItems,setShopItems]=useState(()=>{\r\n    try{\r\n      const s=localStorage.getItem("ros_shopItems");\r\n      if(!s) return {"ros-selections":[],"ros-hairlines":[],"ros-india":[]};\r\n      const parsed=JSON.parse(s);\r\n      // Normalize: ensure every entry is a plain string (guard against legacy {name,code} objects)\r\n      const normalize=(arr)=>(arr||[]).map(x=>typeof x==="object"&&x!==null?(x.name||x.label||JSON.stringify(x)):String(x)).filter(Boolean);\r\n      return {\r\n        "ros-selections": normalize(parsed["ros-selections"]),\r\n        "ros-hairlines":  normalize(parsed["ros-hairlines"]),\r\n        "ros-india":      normalize(parsed["ros-india"]),\r\n      };\r\n    }catch{return {"ros-selections":[],"ros-hairlines":[],"ros-india":[]};}\r\n  });\r\n  const saveShopItems=(updated)=>{\r\n    setShopItems(updated);\r\n    try{localStorage.setItem("ros_shopItems",JSON.stringify(updated));}catch{}\r\n  };',
  '  const [shopItems,setShopItems]=useState({"ros-selections":[],"ros-hairlines":[],"ros-india":[]});\r\n' +
  '  useEffect(()=>{dbLoadShopItems().then(data=>{if(data&&Object.keys(data).length>0)setShopItems(data);});},[]);\r\n' +
  '  const saveShopItems=(updated)=>setShopItems(updated);');

// 5. onAddShopItem/onDeleteShopItem handlers
app = fix('5. Shop item handlers', app,
  '            onAddShopItem={(item)=>{\r\n              const current=(shopItems||{})[shopId]||[];\r\n              const updated={...(shopItems||{}),[shopId]:[...new Set([...current,item])]};\r\n              if(saveShopItems) saveShopItems(updated);\r\n            }}',
  '            onAddShopItem={(item)=>{\r\n              const current=(shopItems||{})[shopId]||[];\r\n              if(current.includes(item)) return;\r\n              const updated={...(shopItems||{}),[shopId]:[...current,item]};\r\n              setShopItems(updated); dbAddShopItem(shopId,item);\r\n            }}\r\n            onDeleteShopItem={(item)=>{\r\n              const current=(shopItems||{})[shopId]||[];\r\n              const updated={...(shopItems||{}),[shopId]:current.filter(i=>i!==item)};\r\n              setShopItems(updated); dbDeleteShopItem(shopId,item);\r\n            }}');

// 6. ESF state extras
app = fix('6. ESF state', app,
  '    purAmount:   sale.purAmount||"",\r\n  });\r\n  const set=(k,v)=>setForm(f=>({...f,[k]:v}));\r\n\r\n  const hasLines',
  '    purAmount:   sale.purAmount||"",\r\n    discount:    sale.discount||"",\r\n    otherCharges: sale.otherCharges||"",\r\n    otherChargesLabel: sale.otherChargesLabel||"Other Charges",\r\n    shopInvoiceNo: sale.shopInvoiceNo||sale.shop_invoice_no||"",\r\n    paidBy:      sale.paidBy||"",\r\n  });\r\n  const set=(k,v)=>setForm(f=>({...f,[k]:v}));\r\n\r\n  const hasLines');

// 7. ESF accept isStaff
app = fix('7. ESF isStaff param', app,
  'const EditSaleForm=({shopId,shop,sale,onSave,onClose,customers=[]})=>{',
  'const EditSaleForm=({shopId,shop,sale,onSave,onClose,customers=[],isStaff=false})=>{');

// 8. Pass isStaff to ESF
app = fix('8. isStaff prop', app,
  '          <EditSaleForm\r\n            shopId={shopId} shop={shop} sale={editRow} customers={customers}\r\n            onSave={(updated)',
  '          <EditSaleForm\r\n            shopId={shopId} shop={shop} sale={editRow} customers={customers} isStaff={user?.role==="staff"}\r\n            onSave={(updated)');

// 9. ESF wrapper — replace old (paddingRight:4) with new (margins + isStaff notice)
app = fix('9. ESF wrapper', app,
  '  return(\r\n    <div style={{display:"flex",flexDirection:"column",gap:0,maxHeight:"68vh",overflowY:"auto",paddingRight:4}}>\r\n\r\n      {/* highlight banner */}\r\n      <div style={{background:shop.accentBg,border:"1px solid "+shop.accent+"33",borderRadius:12,padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>\r\n        <span style={{fontSize:20}}>\u270f\ufe0f</span>\r\n        <div>\r\n          <p style={{margin:0,fontWeight:800,fontSize:13,color:shop.accentText}}>Editing Sale {form.invoiceNo}</p>\r\n          <p style={{margin:0,fontSize:11,color:shop.accent}}>All changes will update the sales record immediately on save</p>\r\n        </div>\r\n      </div>\r\n\r\n      <Divider title="Basic Info"/>\r\n      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>\r\n        <div>\r\n          <label style={lbl}>Date</label>\r\n          <input type="date" value={form.date} onChange={e=>set("date",e.target.value)} style={inp} onFocus={fo} onBlur={bl}/>\r\n        </div>\r\n        <div>\r\n          <label style={lbl}>Invoice Number</label>\r\n          <input value={form.invoiceNo} readOnly\r\n            style={{...inp,background:"#f8fafc",fontFamily:"DM Mono,monospace",fontWeight:700,fontSize:12,color:shop.accent,cursor:"default"}}/>\r\n        </div>\r\n      </div>\r\n\r\n      <Divider title="Customer"/>\r\n      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>\r\n        <div>\r\n          <label style={lbl}>Customer Name</label>\r\n          <select value={form.customer} onChange={e=>set("customer",e.target.value)} style={inp}>\r\n            <option value="">Select customer\u2026</option>\r\n            {/* If the sale\'s customer is not in the CRM (e.g. imported), show them as a selectable option */}\r\n            {form.customer && !customers.some(c=>c.name===form.customer) && (\r\n              <option value={form.customer}>{form.customer} (imported)</option>\r\n            )}\r\n            {customers.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}\r\n          </select>\r\n        </div>\r\n        <div>\r\n          <label style={lbl}>Contact Number</label>\r\n          <input value={form.contact} onChange={e=>set("contact",e.target.value)} placeholder="+44 7700 000000" style={inp} onFocus={fo} onBlur={bl}/>\r\n        </div>\r\n        <div style={{gridColumn:"1/-1"}}>\r\n          <label style={lbl}>Phone Number Saved On</label>\r\n          <select value={form.phoneSavedOn} onChange={e=>set("phoneSavedOn",e.target.value)} style={inp}>\r\n            {["UK 888","INDIA 889","INDIA 888"].map(o=><option key={o}>{o}</option>)}\r\n          </select>\r\n        </div>\r\n        <div style={{gridColumn:"1/-1"}}>\r\n          <label style={lbl}>Address</label>\r\n          <textarea value={form.address} onChange={e=>set("address",e.target.value)}\r\n            rows={2} placeholder="Customer address\u2026"\r\n            style={{...inp,resize:"vertical"}} onFocus={fo} onBlur={bl}/>\r\n        </div>\r\n      </div>',
  '  const [editCustOpen,setEditCustOpen]=useState(false);\r\n' +
  '  const [editCustMatches,setEditCustMatches]=useState([]);\r\n' +
  '  const [editAddrOpen,setEditAddrOpen]=useState(false);\r\n' +
  '  const [editAddrMatches,setEditAddrMatches]=useState([]);\r\n' +
  '  return(\r\n' +
  '    <div style={{display:"flex",flexDirection:"column",gap:0,maxHeight:"68vh",overflowY:"auto"}}>\r\n' +
  '      <div style={{padding:"0 20px"}}>\r\n' +
  '      {isStaff&&(\r\n' +
  '        <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"10px 14px",marginBottom:12,marginTop:8,display:"flex",alignItems:"center",gap:8}}>\r\n' +
  '          <span style={{fontSize:16}}>\uD83D\uDD12</span>\r\n' +
  '          <div><p style={{margin:0,fontWeight:700,fontSize:12,color:"#1d4ed8"}}>Staff View \u2014 Read Only</p>\r\n' +
  '            <p style={{margin:0,fontSize:11,color:"#3b82f6"}}>You can only update Delivery Status, Dispatch Date, Tags and Remarks.</p></div>\r\n' +
  '        </div>\r\n' +
  '      )}\r\n' +
  '      <div style={{background:shop.accentBg,border:"1px solid "+shop.accent+"33",borderRadius:12,padding:"10px 14px",marginBottom:16,marginTop:4,display:"flex",alignItems:"center",gap:10}}>\r\n' +
  '        <span style={{fontSize:20}}>\u270f\ufe0f</span>\r\n' +
  '        <div><p style={{margin:0,fontWeight:800,fontSize:13,color:shop.accentText}}>Editing Sale {form.invoiceNo}</p>\r\n' +
  '          <p style={{margin:0,fontSize:11,color:shop.accent}}>All changes will update the sales record immediately on save</p></div>\r\n' +
  '      </div>\r\n' +
  '      <Divider title="Basic Info"/>\r\n' +
  '      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>\r\n' +
  '        <div><label style={lbl}>Date</label><input type="date" value={form.date} readOnly={isStaff} onChange={isStaff?undefined:e=>set("date",e.target.value)} style={{...inp,background:isStaff?"#f8fafc":"white",cursor:isStaff?"default":"auto"}} onFocus={fo} onBlur={bl}/></div>\r\n' +
  '        <div><label style={lbl}>Invoice Number</label><input value={form.invoiceNo} readOnly style={{...inp,background:"#f8fafc",fontFamily:"DM Mono,monospace",fontWeight:700,fontSize:12,color:shop.accent,cursor:"default"}}/></div>\r\n' +
  '      </div>\r\n' +
  '      <Divider title="Customer"/>\r\n' +
  '      <div style={{marginBottom:16}}>\r\n' +
  '        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>\r\n' +
  '          <div style={{position:"relative"}}>\r\n' +
  '            <label style={lbl}>Customer Name</label>\r\n' +
  '            <input value={form.customer}\r\n' +
  '              onChange={e=>{set("customer",e.target.value);const q=e.target.value.trim().toLowerCase();if(q.length>=1){const m=customers.filter(c=>c.name.toLowerCase().includes(q)).slice(0,6);setEditCustMatches(m);setEditCustOpen(m.length>0);}else{setEditCustOpen(false);setEditCustMatches([]);}}}\r\n' +
  '              onBlur={()=>setTimeout(()=>setEditCustOpen(false),180)}\r\n' +
  '              placeholder="Type or search\u2026" style={inp} onFocus={fo} autoComplete="off"/>\r\n' +
  '            {editCustOpen&&editCustMatches.length>0&&(\r\n' +
  '              <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:200,background:"white",border:"1px solid "+shop.accent+"44",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.15)",maxHeight:180,overflowY:"auto",marginTop:3}}>\r\n' +
  '                {editCustMatches.map((c,i)=>(\r\n' +
  '                  <div key={i} onMouseDown={()=>{set("customer",c.name);set("contact",c.phone||"");set("address",c.address||c.addressee||"");setEditCustOpen(false);}}\r\n' +
  '                    style={{padding:"9px 12px",borderBottom:i<editCustMatches.length-1?"1px solid #f1f5f9":"none",display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}\r\n' +
  '                    onMouseEnter={e=>e.currentTarget.style.background=shop.accentBg}\r\n' +
  '                    onMouseLeave={e=>e.currentTarget.style.background="white"}>\r\n' +
  '                    <div style={{width:26,height:26,borderRadius:7,background:shop.accent,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800,fontSize:11,flexShrink:0}}>{c.name.charAt(0)}</div>\r\n' +
  '                    <div><p style={{margin:0,fontSize:12,fontWeight:700,color:"#0f172a"}}>{c.name}</p><p style={{margin:0,fontSize:10,color:"#94a3b8"}}>{c.phone||"\u2014"}</p></div>\r\n' +
  '                  </div>))}\r\n' +
  '              </div>)}\r\n' +
  '          </div>\r\n' +
  '          <div><label style={lbl}>Phone Number</label><input value={form.contact} onChange={e=>set("contact",e.target.value)} placeholder="+44 7700 000000" style={inp} onFocus={fo} onBlur={bl}/></div>\r\n' +
  '          <div><label style={lbl}>Saved On</label><select value={form.phoneSavedOn} onChange={e=>set("phoneSavedOn",e.target.value)} style={inp}>{["UK 888","INDIA 889","INDIA 888"].map(o=><option key={o}>{o}</option>)}</select></div>\r\n' +
  '        </div>\r\n' +
  '        {shopId==="ros-india"&&(\r\n' +
  '          <div style={{marginBottom:12}}>\r\n' +
  '            <label style={lbl}>Paid By</label>\r\n' +
  '            <input value={form.paidBy||""} onChange={e=>set("paidBy",e.target.value)}\r\n' +
  '              placeholder="Who sent the money\u2026" style={inp} onFocus={fo} onBlur={bl}/>\r\n' +
  '          </div>\r\n' +
  '        )}\r\n' +
  '        <div style={{position:"relative"}}>\r\n' +
  '          <label style={lbl}>Address</label>\r\n' +
  '          <input value={form.address||""}\r\n' +
  '            onChange={e=>{set("address",e.target.value);const q=e.target.value.trim().toLowerCase();if(q.length>=1){const m=customers.filter(c=>(c.address||c.addressee||"").toLowerCase().includes(q)).slice(0,6);setEditAddrMatches(m);setEditAddrOpen(m.length>0);}else{setEditAddrOpen(false);setEditAddrMatches([]);}}}\r\n' +
  '            onBlur={()=>setTimeout(()=>setEditAddrOpen(false),180)}\r\n' +
  '            placeholder="Search address\u2026" style={inp} onFocus={fo} autoComplete="off"/>\r\n' +
  '          {editAddrOpen&&editAddrMatches.length>0&&(\r\n' +
  '            <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:200,background:"white",border:"1px solid "+shop.accent+"44",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.15)",maxHeight:160,overflowY:"auto",marginTop:3}}>\r\n' +
  '              {editAddrMatches.map((c,i)=>(\r\n' +
  '                <div key={i} onMouseDown={()=>{set("address",c.address||c.addressee||"");setEditAddrOpen(false);}}\r\n' +
  '                  style={{padding:"8px 12px",borderBottom:i<editAddrMatches.length-1?"1px solid #f1f5f9":"none",cursor:"pointer"}}\r\n' +
  '                  onMouseEnter={e=>e.currentTarget.style.background=shop.accentBg}\r\n' +
  '                  onMouseLeave={e=>e.currentTarget.style.background="white"}>\r\n' +
  '                  <p style={{margin:0,fontSize:12,fontWeight:700,color:"#0f172a"}}>{c.name}</p>\r\n' +
  '                  <p style={{margin:0,fontSize:11,color:"#64748b"}}>{c.address||c.addressee}</p>\r\n' +
  '                </div>))}\r\n' +
  '            </div>)}\r\n' +
  '        </div>\r\n' +
  '      </div>');

// 10. ESF Pricing + Payment + Shop Invoice
app = fix('10. ESF pricing+payment', app,
  '      <Divider title="Payment"/>\r\n      <div style={{marginBottom:16}}>\r\n        <label style={lbl}>Payment By</label>\r\n        <select value={PAY_OPTS.includes(form.payBy)?form.payBy:"SHOP"} onChange={e=>set("payBy",e.target.value)} style={inp}>\r\n          {PAY_OPTS.map(o=><option key={o}>{o}</option>)}\r\n        </select>\r\n      </div>',
  '      {!isStaff&&<>\r\n      <Divider title="Pricing"/>\r\n      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>\r\n        <div><label style={lbl}>Discount ({shop.symbol})</label>\r\n          <input type="number" onWheel={e=>e.target.blur()} value={form.discount||""} onChange={e=>set("discount",e.target.value)} placeholder="0.00" style={inp} onFocus={fo} onBlur={bl}/></div>\r\n        <div><label style={lbl}>Other Charges ({shop.symbol})</label>\r\n          <input type="number" onWheel={e=>e.target.blur()} value={form.otherCharges||""} onChange={e=>set("otherCharges",e.target.value)} placeholder="0.00" style={inp} onFocus={fo} onBlur={bl}/></div>\r\n      </div>\r\n      </>}\r\n      <Divider title="Payment"/>\r\n      <div style={{display:"grid",gridTemplateColumns:form.payBy==="SHOP"?"1fr 1fr":"1fr",gap:12,marginBottom:16}}>\r\n        <div><label style={lbl}>Payment By</label>\r\n          <select value={PAY_OPTS.includes(form.payBy)?form.payBy:"SHOP"} onChange={e=>set("payBy",e.target.value)} style={inp}>\r\n            {PAY_OPTS.map(o=><option key={o}>{o}</option>)}\r\n          </select></div>\r\n        {form.payBy==="SHOP"&&(<div><label style={lbl}>Shop Invoice No.</label>\r\n          <input value={form.shopInvoiceNo||""} onChange={e=>set("shopInvoiceNo",e.target.value)} placeholder="e.g. 4666" style={{...inp,fontFamily:"DM Mono,monospace"}} onFocus={fo} onBlur={bl}/>\r\n        </div>)}\r\n      </div>');

// 11. ESF footer
app = fix('11. ESF footer', app,
  '      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,position:"sticky",bottom:0,background:"white",paddingBottom:2,paddingTop:6,borderTop:"1px solid #f1f5f9"}}>\r\n        <button onClick={()=>onSave({...form,id:form.invoiceNo||sale.id,ful:form.status,pay:form.payBy,shopInvoiceNo:form.shopInvoiceNo||"",rem:form.remarks,amount:parseFloat(form.amount)||0,phoneSavedOn:form.phoneSavedOn,address:form.address||"",saleLines:hasLines?editLines:sale.saleLines,discount:sale.discount,otherCharges:sale.otherCharges,otherChargesLabel:sale.otherChargesLabel,contact:form.contact,phone:form.contact,returnReqDate:form.returnReqDate,returnRcvd:form.returnRcvd,refundAmt:form.refundAmt,refundDate:form.refundDate||"",exchangeDate:form.exchangeDate||"",adjType:form.adjType||"",adjAmt:parseFloat(form.adjAmt)||0,adjDate:form.adjDate||"",adjNote:form.adjNote||"",purInvNo:form.purInvNo||"",purInvDate:form.purInvDate||"",purAmount:parseFloat(form.purAmount)||0})}\r\n          style={{padding:"12px 0",borderRadius:11,border:"none",background:shop.accent,color:"white",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px "+shop.accent+"44"}}>\r\n          \uD83D\uDCBE Save Changes\r\n        </button>\r\n        <button onClick={onClose}\r\n          style={{padding:"12px 0",borderRadius:11,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>\r\n          Cancel\r\n        </button>\r\n      </div>\r\n    </div>\r\n  );\r\n};\r\n\r\nconst NewShipmentForm',
  '      </div>{/* end padding wrapper */}\r\n      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,position:"sticky",bottom:0,background:"white",padding:"6px 20px 2px",borderTop:"1px solid #f1f5f9"}}>\r\n        <button onClick={()=>onSave({...form,id:form.invoiceNo||sale.id,ful:form.status,pay:form.payBy,shopInvoiceNo:form.shopInvoiceNo||"",paidBy:form.paidBy||"",rem:form.remarks,amount:parseFloat(form.amount)||0,phoneSavedOn:form.phoneSavedOn,address:form.address||"",saleLines:hasLines?editLines:sale.saleLines,discount:parseFloat(form.discount)||0,otherCharges:parseFloat(form.otherCharges)||0,otherChargesLabel:form.otherChargesLabel||"Other Charges",contact:form.contact,phone:form.contact,returnReqDate:form.returnReqDate,returnRcvd:form.returnRcvd,refundAmt:form.refundAmt,refundDate:form.refundDate||"",exchangeDate:form.exchangeDate||"",adjType:form.adjType||"",adjAmt:parseFloat(form.adjAmt)||0,adjDate:form.adjDate||"",adjNote:form.adjNote||"",purInvNo:form.purInvNo||"",purInvDate:form.purInvDate||"",purAmount:parseFloat(form.purAmount)||0})}\r\n          style={{padding:"12px 0",borderRadius:11,border:"none",background:shop.accent,color:"white",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px "+shop.accent+"44"}}>\r\n          \uD83D\uDCBE Save Changes\r\n        </button>\r\n        <button onClick={onClose}\r\n          style={{padding:"12px 0",borderRadius:11,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>\r\n          Cancel\r\n        </button>\r\n      </div>\r\n    </div>\r\n  );\r\n};\r\n\r\nconst NewShipmentForm');

// 12. Detail paidBy
app = fix('12. Detail paidBy', app,
  '                  <div style={{marginTop:4,paddingTop:8,borderTop:"1px solid #f1f5f9"}}>\r\n                    <p style={{margin:"0 0 2px",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em"}}>\uD83D\uDCCD Address</p>\r\n                    <p style={{margin:0,fontSize:12,color:selRow.address?"#374151":"#cbd5e1",lineHeight:1.5}}>{selRow.address||"\u2014"}</p>\r\n                  </div>',
  '                  {shopId==="ros-india"&&selRow.paidBy&&(\r\n                    <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #f1f5f9"}}>\r\n                      <p style={{margin:"0 0 2px",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em"}}>&#x1F4B8; Paid By</p>\r\n                      <p style={{margin:0,fontSize:13,fontWeight:700,color:"#374151"}}>{selRow.paidBy}</p>\r\n                    </div>\r\n                  )}\r\n                  <div style={{marginTop:4,paddingTop:8,borderTop:"1px solid #f1f5f9"}}>\r\n                    <p style={{margin:"0 0 2px",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em"}}>\uD83D\uDCCD Address</p>\r\n                    <p style={{margin:0,fontSize:12,color:selRow.address?"#374151":"#cbd5e1",lineHeight:1.5}}>{selRow.address||"\u2014"}</p>\r\n                  </div>');

// 13. NSF shop invoice
app = fix('13. NSF shop invoice', app,
  '              </div>\r\n              <div><label style={lbl}>Dispatch Date</label><input type="date" value={form.sentDate} onChange={e=>set("sentDate",e.target.value)} style={inp} onFocus={fo} onBlur={bl}/></div>',
  '              </div>\r\n              {form.payBy==="SHOP"&&(\r\n                <div style={{marginBottom:7}}><label style={lbl}>Shop Invoice No.</label><input value={form.shopInvoiceNo} onChange={e=>set("shopInvoiceNo",e.target.value)} placeholder="e.g. 4666" style={{...inp,fontFamily:"DM Mono,monospace"}} onFocus={fo} onBlur={bl}/></div>\r\n              )}\r\n              <div><label style={lbl}>Dispatch Date</label><input type="date" value={form.sentDate} onChange={e=>set("sentDate",e.target.value)} style={inp} onFocus={fo} onBlur={bl}/></div>');

// 14. Hide Post-Sale for staff
app = fix('14. Post-Sale hidden', app,
  '      <Divider title="Post-Sale Adjustment"/>\r\n      <div style={{background:"#fffbeb",borderRadius:12,padding:"14px",border:"1px solid #fde68a",marginBottom:16}}>\r\n        <p style={{margin:"0 0 10px",fontSize:11,color:"#92400e",fontWeight:600}}>\uD83D\uDD27 Use this section',
  '      {!isStaff&&<>\r\n      <Divider title="Post-Sale Adjustment"/>\r\n      <div style={{background:"#fffbeb",borderRadius:12,padding:"14px",border:"1px solid #fde68a",marginBottom:16}}>\r\n        <p style={{margin:"0 0 10px",fontSize:11,color:"#92400e",fontWeight:600}}>\uD83D\uDD27 Use this section');

app = fix('14b. Post-Sale close', app,
  '        </div>\r\n      </div>\r\n\r\n      <TagPicker value={form.tag}',
  '        </div>\r\n      </div>\r\n      </>}\r\n\r\n      <TagPicker value={form.tag}');

// 15. Hide Purchase Details for staff
app = fix('15. Purchase Details', app,
  '      {shopId==="ros-india"&&(\r\n        <>\r\n          <div style={{margin:"4px 0 10px",fontWeight:800,fontSize:11,color:"#166534",letterSpacing:"0.07em",textTransform:"uppercase",borderBottom:"1px solid #bbf7d0",paddingBottom:6}}>Purchase Details</div>',
  '      {shopId==="ros-india"&&!isStaff&&(\r\n        <>\r\n          <div style={{margin:"4px 0 10px",fontWeight:800,fontSize:11,color:"#166534",letterSpacing:"0.07em",textTransform:"uppercase",borderBottom:"1px solid #bbf7d0",paddingBottom:6}}>Purchase Details</div>');

// 16. filtSales search
app = fix('16. filtSales search', app,
  '      (s.customer||"").toLowerCase().includes(q)||\r\n      (s.tag||"").toLowerCase().includes(q)||\r\n      (s.rem||"").toLowerCase().includes(q)||\r\n      (s.item||"").toLowerCase().includes(q);',
  '      (s.customer||"").toLowerCase().includes(q)||\r\n      (s.paidBy||"").toLowerCase().includes(q)||\r\n      (s.address||"").toLowerCase().includes(q)||\r\n      (s.tag||"").toLowerCase().includes(q)||\r\n      (s.rem||"").toLowerCase().includes(q)||\r\n      (s.item||"").toLowerCase().includes(q);');

// 17. shopId mask for staff
app = fix('17. shopId mask', app,
  '                shopId={shopId}\r\n                TD={TD}\r\n                user={user}\r\n                isStaff={user?.role==="staff"}',
  '                shopId={user?.role==="staff"?"ros-india-staff":shopId}\r\n                TD={TD}\r\n                user={user}\r\n                isStaff={user?.role==="staff"}');

// 18. AddItemButton component
const ADD_BTN = `const AddItemButton=({onAdd,accent,accentBg})=>{
  const [open,setOpen]=React.useState(false);
  const [val,setVal]=React.useState("");
  if(!open) return(
    <button type="button" onClick={()=>setOpen(true)}
      style={{padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:"1px dashed "+accent+"88",background:accentBg,color:accent}}>
      + Add
    </button>
  );
  return(
    <div style={{display:"flex",gap:4,alignItems:"center"}}>
      <input autoFocus value={val} onChange={e=>setVal(e.target.value)}
        onKeyDown={e=>{if(e.key==="Enter"&&val.trim()){onAdd(val.trim());setVal("");setOpen(false);}if(e.key==="Escape"){setOpen(false);setVal("");}}}
        placeholder="Item name\u2026" style={{padding:"3px 8px",borderRadius:8,border:"1px solid "+accent+"66",fontSize:11,fontFamily:"inherit",outline:"none",width:110}}/>
      <button type="button" onClick={()=>{if(val.trim()){onAdd(val.trim());setVal("");setOpen(false);}}}
        style={{padding:"3px 10px",borderRadius:8,border:"none",background:accent,color:"white",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Save</button>
      <button type="button" onClick={()=>{setOpen(false);setVal("");}}
        style={{padding:"3px 8px",borderRadius:8,border:"1px solid #e2e8f0",background:"white",color:"#64748b",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
    </div>
  );
};\n\n`;

if (!app.includes('const AddItemButton=')) {
  app = app.replace('const NewSaleForm=({', ADD_BTN + 'const NewSaleForm=({');
  done.push('18. AddItemButton');
} else { skipped.push('18. AddItemButton'); }

// 19. NSF accept onDeleteShopItem
app = fix('19. NSF props', app,
  'const NewSaleForm=({shopId,shop,onSave,onClose,lastInvoiceNum,shopItems=[],onAddShopItem,customers=[]})=>{',
  'const NewSaleForm=({shopId,shop,onSave,onClose,lastInvoiceNum,shopItems=[],onAddShopItem,onDeleteShopItem,customers=[]})=>{');

// 20. NSF item capsules UI
app = fix('20. NSF capsules', app,
  '              {shopItems.length>0&&(<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>{shopItems.map((itm,idx)=>{const label=typeof itm==="object"?(itm.name||itm.label||""):String(itm);const value=typeof itm==="object"?(itm.name||itm.label||""):String(itm);return(<button key={idx} type="button" onClick={()=>{const ei=lines.findIndex(l=>!l.name.trim());if(ei>=0)updateLine(lines[ei].id,"name",value);else setLines(ls=>[...ls,{...blankLine(),name:value}]);}} style={{padding:"3px 9px",borderRadius:999,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:"1px solid "+shop.accent+"44",background:"white",color:shop.accentText}}>+{label}</button>);})}</div>)}',
  '              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8,alignItems:"center"}}>\r\n' +
  '                {shopItems.map((itm,idx)=>{\r\n' +
  '                  const label=typeof itm==="object"?(itm.name||itm.label||""):String(itm);\r\n' +
  '                  return(\r\n' +
  '                    <div key={idx} style={{display:"flex",alignItems:"center",borderRadius:999,border:"1px solid "+shop.accent+"44",background:"white",overflow:"hidden"}}>\r\n' +
  '                      <button type="button"\r\n' +
  '                        onClick={()=>{const ei=lines.findIndex(l=>!l.name.trim());if(ei>=0)updateLine(lines[ei].id,"name",label);else setLines(ls=>[...ls,{...blankLine(),name:label}]);}}\r\n' +
  '                        style={{padding:"3px 9px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",background:"transparent",border:"none",color:shop.accentText}}>+{label}</button>\r\n' +
  '                      <button type="button" onClick={()=>onDeleteShopItem&&onDeleteShopItem(label)}\r\n' +
  '                        style={{padding:"2px 6px 2px 0",fontSize:11,cursor:"pointer",background:"transparent",border:"none",color:"#94a3b8",lineHeight:1}}>\xd7</button>\r\n' +
  '                    </div>\r\n' +
  '                  );\r\n' +
  '                })}\r\n' +
  '                <AddItemButton onAdd={(name)=>onAddShopItem&&onAddShopItem(name)} accent={shop.accent} accentBg={shop.accentBg}/>\r\n' +
  '              </div>');

// Write files
fs.writeFileSync(APP, app, 'utf8');
fs.writeFileSync(DB,  db,  'utf8');

console.log('\n=== ROS BMS Master Patch Complete ===');
done.forEach(d => console.log('  APPLIED: ' + d));
skipped.forEach(s => console.log('  SKIPPED: ' + s));
console.log('\nNow run:');
console.log('  git add src/App.jsx src/db.js');
console.log('  git commit -m "feat: all features + item tabs"');
console.log('  git push origin main');
