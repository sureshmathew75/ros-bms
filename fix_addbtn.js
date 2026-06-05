#!/usr/bin/env node
const fs = require('fs');
const APP = require('path').join(__dirname,'src','App.jsx');
let src = fs.readFileSync(APP,'utf8');

// Remove AddItemButton component and replace capsule area with inline add
// Simple approach: add item name input always visible at bottom of capsules

const OLD_COMPONENT = src.match(/const AddItemButton=\(\{onAdd,accent,accentBg\}\)=>\{[\s\S]*?\};\n\n/);
if (OLD_COMPONENT) {
  src = src.replace(OLD_COMPONENT[0], '');
  console.log('Removed AddItemButton component');
}

// Replace AddItemButton usage with inline state in NSF
// Find the capsules div and replace
const OLD_CAPS = /<AddItemButton onAdd=\{.*?\} accent=\{shop\.accent\} accentBg=\{shop\.accentBg\}\/>/;
const NEW_CAPS = `{(()=>{
                  const [addOpen,setAddOpen]=React.useState(false);
                  const [addVal,setAddVal]=React.useState("");
                  return addOpen?(
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      <input autoFocus value={addVal} onChange={e=>setAddVal(e.target.value)}
                        onKeyDown={e=>{if(e.key==="Enter"&&addVal.trim()){onAddShopItem&&onAddShopItem(addVal.trim());setAddVal("");setAddOpen(false);}if(e.key==="Escape"){setAddOpen(false);setAddVal("");}}}
                        placeholder="Item name…" style={{padding:"3px 8px",borderRadius:8,border:"1px solid "+shop.accent+"66",fontSize:11,fontFamily:"inherit",outline:"none",width:110}}/>
                      <button type="button" onMouseDown={e=>{e.preventDefault();e.stopPropagation();if(addVal.trim()){onAddShopItem&&onAddShopItem(addVal.trim());setAddVal("");setAddOpen(false);}}}
                        style={{padding:"3px 10px",borderRadius:8,border:"none",background:shop.accent,color:"white",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Save</button>
                      <button type="button" onMouseDown={e=>{e.preventDefault();setAddOpen(false);setAddVal("");}}
                        style={{padding:"3px 8px",borderRadius:8,border:"1px solid #e2e8f0",background:"white",color:"#64748b",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
                    </div>
                  ):(
                    <button type="button" onMouseDown={e=>{e.preventDefault();e.stopPropagation();setAddOpen(true);}}
                      style={{padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:"1px dashed "+shop.accent+"88",background:shop.accentBg,color:shop.accent}}>
                      + Add
                    </button>
                  );
                })()}`;

if (OLD_CAPS.test(src)) {
  src = src.replace(OLD_CAPS, NEW_CAPS);
  console.log('Replaced AddItemButton with inline component using onMouseDown');
  fs.writeFileSync(APP, src, 'utf8');
  console.log('Done. Run: git add src/App.jsx && git commit -m "fix: item add button uses onMouseDown" && git push origin main');
} else {
  console.log('Pattern not found');
  const idx = src.indexOf('AddItemButton');
  console.log('AddItemButton context:', src.slice(idx-20, idx+100));
}
