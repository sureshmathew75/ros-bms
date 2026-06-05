// fix_itemtabs.js  —  run from C:\Users\sures\Desktop\ros-bms\
// node fix_itemtabs.js
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'src', 'App.jsx');
let src = fs.readFileSync(FILE, 'utf8');
let changes = 0;

// ── FIX 1: useEffect missing [] causes shopItems to reload on every render ──
const BAD_EFFECT = `useEffect(()=>{dbLoadShopItems().then(data=>{if(data)setShopItems({"ros-selections":data["ros-selections"]||[],"ros-hairlines":data["ros-hairlines"]||[],"ros-india":data["ros-india"]||[]});});});`;
const GOOD_EFFECT = `useEffect(()=>{dbLoadShopItems().then(data=>{if(data)setShopItems({"ros-selections":data["ros-selections"]||[],"ros-hairlines":data["ros-hairlines"]||[],"ros-india":data["ros-india"]||[]});});},[]);`;
if (src.includes(BAD_EFFECT)) {
  src = src.replace(BAD_EFFECT, GOOD_EFFECT);
  console.log('✅ Fix 1: useEffect [] added — shopItems no longer reloads on every render');
  changes++;
} else if (src.includes(GOOD_EFFECT)) {
  console.log('⏭  Fix 1: already fixed');
} else {
  console.log('⚠️  Fix 1: could not find useEffect pattern — check manually');
}

// ── FIX 2: Replace AddItemButton with AddTabInput ──
const OLD_BTN = `const AddItemButton=({onAdd,accent,accentBg})=>{
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
        placeholder="Item name…" style={{padding:"3px 8px",borderRadius:8,border:"1px solid "+accent+"66",fontSize:11,fontFamily:"inherit",outline:"none",width:110}}/>
      <button type="button" onClick={()=>{if(val.trim()){onAdd(val.trim());setVal("");setOpen(false);}}}
        style={{padding:"3px 10px",borderRadius:8,border:"none",background:accent,color:"white",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Save</button>
      <button type="button" onClick={()=>{setOpen(false);setVal("");}}
        style={{padding:"3px 8px",borderRadius:8,border:"1px solid #e2e8f0",background:"white",color:"#64748b",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
    </div>
  );
};`;
const NEW_BTN = `const AddTabInput=({onAdd,accent})=>{
  const [val,setVal]=React.useState("");
  const commit=()=>{const n=val.trim();if(n){onAdd(n);setVal("");}};
  return(
    <div style={{display:"flex",gap:4,alignItems:"center",marginTop:6,width:"100%"}}>
      <input value={val} onChange={e=>setVal(e.target.value)}
        onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();commit();}}}
        placeholder="Type item name, press Enter or ＋"
        style={{flex:1,padding:"6px 10px",borderRadius:8,border:"1px solid "+accent+"66",fontSize:12,fontFamily:"inherit",outline:"none",background:"white"}}/>
      <button type="button" onClick={commit}
        style={{padding:"6px 14px",borderRadius:8,border:"none",background:accent,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>＋</button>
    </div>
  );
};`;
if (src.includes(OLD_BTN)) {
  src = src.replace(OLD_BTN, NEW_BTN);
  console.log('✅ Fix 2: AddItemButton replaced with AddTabInput');
  changes++;
} else if (src.includes('const AddTabInput=')) {
  console.log('⏭  Fix 2: AddTabInput already present');
} else {
  console.log('⚠️  Fix 2: could not find AddItemButton — check manually');
}

// ── FIX 3: Add sales=[] to NewSaleForm props ──
const OLD_PROPS = `const NewSaleForm=({shopId,shop,onSave,onClose,lastInvoiceNum,shopItems=[],onAddShopItem,onDeleteShopItem,customers=[]})=>{`;
const NEW_PROPS = `const NewSaleForm=({shopId,shop,onSave,onClose,lastInvoiceNum,shopItems=[],onAddShopItem,onDeleteShopItem,customers=[],sales=[]})=>{`;
if (src.includes(OLD_PROPS)) {
  src = src.replace(OLD_PROPS, NEW_PROPS);
  console.log('✅ Fix 3: sales=[] prop added to NewSaleForm');
  changes++;
} else if (src.includes(NEW_PROPS)) {
  console.log('⏭  Fix 3: sales prop already present');
} else {
  console.log('⚠️  Fix 3: could not find NewSaleForm signature');
}

// ── FIX 4: Pass sales={sales} at call site ──
const OLD_CALL = `            customers={customers}\n            shopItems={(shopItems||{})[shopId]||[]}`;
const NEW_CALL = `            customers={customers}\n            sales={sales}\n            shopItems={(shopItems||{})[shopId]||[]}`;
if (src.includes(OLD_CALL)) {
  src = src.replace(OLD_CALL, NEW_CALL);
  console.log('✅ Fix 4: sales={sales} passed to NewSaleForm call site');
  changes++;
} else if (src.includes('sales={sales}')) {
  console.log('⏭  Fix 4: sales prop already passed at call site');
} else {
  console.log('⚠️  Fix 4: could not find NewSaleForm call site');
}

// ── FIX 5: Rebuild Items section with tabs ──
const OLD_ITEMS = `            {/* Items */}
            <div style={{background:"#f8fafc",borderRadius:12,padding:"11px 12px",marginBottom:8,border:"1px solid #f1f5f9"}}>
              <p style={{margin:"0 0 8px",fontSize:10,fontWeight:800,color:shop.accent,textTransform:"uppercase",letterSpacing:"0.07em"}}>🛍️ Items</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8,alignItems:"center"}}>
                {shopItems.map((itm,idx)=>{
                  const label=typeof itm==="object"?(itm.name||itm.label||""):String(itm);
                  return(
                    <div key={idx} style={{display:"flex",alignItems:"center",borderRadius:999,border:"1px solid "+shop.accent+"44",background:"white",overflow:"hidden"}}>
                      <button type="button"
                        onClick={()=>{const ei=lines.findIndex(l=>!l.name.trim());if(ei>=0)updateLine(lines[ei].id,"name",label);else setLines(ls=>[...ls,{...blankLine(),name:label}]);}}
                        style={{padding:"3px 9px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",background:"transparent",border:"none",color:shop.accentText}}>+{label}</button>
                      <button type="button" onClick={()=>onDeleteShopItem&&onDeleteShopItem(label)}
                        style={{padding:"2px 6px 2px 0",fontSize:11,cursor:"pointer",background:"transparent",border:"none",color:"#94a3b8",lineHeight:1}}>×</button>
                    </div>
                  );
                })}
                <AddItemButton onAdd={(name)=>onAddShopItem&&onAddShopItem(name)} accent={shop.accent} accentBg={shop.accentBg}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 52px 76px 26px",gap:5,marginBottom:4}}>
                <span style={{...lbl,marginBottom:0}}>Item</span><span style={{...lbl,marginBottom:0}}>Qty</span><span style={{...lbl,marginBottom:0}}>Price</span><span/>
              </div>
              {lines.map((line,idx)=>(<div key={line.id} style={{display:"grid",gridTemplateColumns:"1fr 52px 76px 26px",gap:5,marginBottom:5,alignItems:"center"}}>
                <input value={line.name} onChange={e=>updateLine(line.id,"name",e.target.value)} placeholder={"Item "+(idx+1)} style={{...inp,padding:"7px 8px"}} onFocus={fo} onBlur={bl}/>
                <input type="number" onWheel={e=>e.target.blur()} value={line.qty} onChange={e=>updateLine(line.id,"qty",e.target.value)} style={{...inp,textAlign:"center",padding:"7px 5px"}} onFocus={fo} onBlur={bl}/>
                <input type="number" onWheel={e=>e.target.blur()} value={line.price} onChange={e=>updateLine(line.id,"price",e.target.value)} placeholder="0.00" style={{...inp,textAlign:"right",padding:"7px 8px"}} onFocus={fo} onBlur={bl}/>
                <button type="button" onClick={()=>removeLine(line.id)} style={{width:26,height:32,borderRadius:7,border:"1px solid #fecaca",background:"#fff5f5",color:"#dc2626",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              </div>))}
              <button type="button" onClick={addLine} style={{padding:"5px 12px",borderRadius:7,border:"1px dashed "+shop.accent+"55",background:shop.accentBg,color:shop.accentText,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>＋ Add Item</button>
            </div>`;
const NEW_ITEMS = `            {/* Items */}
            <div style={{background:"#f8fafc",borderRadius:12,padding:"11px 12px",marginBottom:8,border:"1px solid #f1f5f9"}}>
              <p style={{margin:"0 0 8px",fontSize:10,fontWeight:800,color:shop.accent,textTransform:"uppercase",letterSpacing:"0.07em"}}>🛍️ Items</p>
              {(()=>{
                const savedLabels=shopItems.map(i=>typeof i==="object"?(i.name||i.label||""):String(i));
                const savedSet=new Set(savedLabels);
                const seen=new Set();const histNames=[];
                (sales||[]).forEach(s=>{(s.items||[]).forEach(it=>{const n=(it.name||"").trim();if(n&&!savedSet.has(n)&&!seen.has(n)){seen.add(n);histNames.push(n);}});});
                histNames.sort((a,b)=>a.localeCompare(b));
                const fillName=(name)=>{const ei=lines.findIndex(l=>!l.name.trim());if(ei>=0)updateLine(lines[ei].id,"name",name);else setLines(ls=>[...ls,{...blankLine(),name}]);};
                return(<div style={{marginBottom:10}}>
                  {savedLabels.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:5}}>
                    {savedLabels.map((label,idx)=>(
                      <div key={idx} style={{display:"inline-flex",alignItems:"center",borderRadius:999,border:"1px solid "+shop.accent+"55",background:shop.accentBg,overflow:"hidden"}}>
                        <button type="button" onClick={()=>fillName(label)} style={{padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",background:"transparent",border:"none",color:shop.accentText}}>{label}</button>
                        <button type="button" onClick={()=>onDeleteShopItem&&onDeleteShopItem(label)} title="Remove" style={{padding:"0 8px 0 0",fontSize:12,cursor:"pointer",background:"transparent",border:"none",color:"#94a3b8",lineHeight:1}}>×</button>
                      </div>
                    ))}
                  </div>}
                  {histNames.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:5}}>
                    {histNames.map((name,i)=>(
                      <div key={i} style={{display:"inline-flex",alignItems:"center",borderRadius:999,border:"1px solid #cbd5e1",background:"white",overflow:"hidden"}}>
                        <button type="button" onClick={()=>fillName(name)} style={{padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:"transparent",border:"none",color:"#475569"}}>{name}</button>
                        <button type="button" onClick={()=>onAddShopItem&&onAddShopItem(name)} title="Pin tab" style={{padding:"0 8px 0 0",fontSize:11,cursor:"pointer",background:"transparent",border:"none",color:"#94a3b8",lineHeight:1}}>★</button>
                      </div>
                    ))}
                  </div>}
                  <AddTabInput onAdd={(name)=>onAddShopItem&&onAddShopItem(name)} accent={shop.accent}/>
                </div>);
              })()}
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
            </div>`;
if (src.includes(OLD_ITEMS)) {
  src = src.replace(OLD_ITEMS, NEW_ITEMS);
  console.log('✅ Fix 5: Items section rebuilt with tab bar');
  changes++;
} else if (src.includes('AddTabInput')) {
  console.log('⏭  Fix 5: Items section already rebuilt');
} else {
  console.log('⚠️  Fix 5: could not find Items section — check manually');
}

fs.writeFileSync(FILE, src, 'utf8');
console.log(`\nDone — ${changes} change(s) applied to src/App.jsx`);
console.log('Now run: git add -A; git commit -m "fix item tabs"; git push origin main');
