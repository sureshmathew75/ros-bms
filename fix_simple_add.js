#!/usr/bin/env node
// Nuclear option: replace entire items capsule area with simplest possible implementation
const fs = require('fs');
const APP = require('path').join(__dirname,'src','App.jsx');
let src = fs.readFileSync(APP,'utf8');

// Find and replace the entire capsule div with a simple version
// that uses an input field always visible + a plain button

const SIMPLE_CAPSULES = `              <div style={{marginBottom:8}}>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6,alignItems:"center"}}>
                  {shopItems.map((itm,idx)=>{
                    const label=typeof itm==="object"?(itm.name||itm.label||""):String(itm);
                    return(
                      <span key={idx} style={{display:"inline-flex",alignItems:"center",borderRadius:999,border:"1px solid "+shop.accent+"44",background:"white",overflow:"hidden"}}>
                        <button type="button"
                          onClick={()=>{const ei=lines.findIndex(l=>!l.name.trim());if(ei>=0)updateLine(lines[ei].id,"name",label);else setLines(ls=>[...ls,{...blankLine(),name:label}]);}}
                          style={{padding:"3px 9px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",background:"transparent",border:"none",color:shop.accentText}}>+{label}</button>
                        <button type="button" onClick={()=>onDeleteShopItem&&onDeleteShopItem(label)}
                          style={{padding:"2px 6px 2px 0",fontSize:12,cursor:"pointer",background:"transparent",border:"none",color:"#94a3b8",lineHeight:1}}>×</button>
                      </span>
                    );
                  })}
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input id="nsf_newitem" placeholder="Add item name…"
                    style={{padding:"4px 8px",borderRadius:8,border:"1px solid "+shop.accent+"66",fontSize:11,fontFamily:"inherit",outline:"none",width:130}}
                    onKeyDown={e=>{if(e.key==="Enter"){const v=e.target.value.trim();if(v){onAddShopItem&&onAddShopItem(v);e.target.value="";}}}}
                  />
                  <button type="button"
                    onClick={()=>{const el=document.getElementById("nsf_newitem");if(el&&el.value.trim()){onAddShopItem&&onAddShopItem(el.value.trim());el.value="";}}}
                    style={{padding:"4px 12px",borderRadius:8,border:"none",background:shop.accent,color:"white",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                    + Save
                  </button>
                </div>
              </div>`;

// Find the existing capsule area - try multiple patterns
const patterns = [
  /<div style=\{\{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8[\s\S]*?<\/div>\s*<\/div>/,
  /\{shopItems\.map\(\(itm,idx\)=>\{[\s\S]*?AddItemButton[\s\S]*?\}\)\}/,
];

let replaced = false;
for (const pat of patterns) {
  if (pat.test(src)) {
    src = src.replace(pat, SIMPLE_CAPSULES);
    replaced = true;
    console.log('REPLACED: capsule area with simple implementation');
    break;
  }
}

if (!replaced) {
  // Find by known text and replace surrounding block
  const marker = src.indexOf('AddItemButton onAdd=') > 0 
    ? 'AddItemButton onAdd=' 
    : 'onDeleteShopItem&&onDeleteShopItem';
  const idx = src.indexOf(marker);
  if (idx > 0) {
    // Find the containing div start and end
    const divStart = src.lastIndexOf('<div style={{display:"flex",flexWrap:"wrap"', idx);
    const divEnd = src.indexOf('</div>', src.indexOf('</div>', idx)+1) + 6;
    if (divStart > 0 && divEnd > 0) {
      src = src.slice(0, divStart) + SIMPLE_CAPSULES + src.slice(divEnd);
      replaced = true;
      console.log('REPLACED: via div boundary detection');
    }
  }
}

if (replaced) {
  // Also remove AddItemButton component if present
  src = src.replace(/const AddItemButton=\(\{[^}]+\}\)=>\{[\s\S]*?\};\n\n/, '');
  fs.writeFileSync(APP, src, 'utf8');
  console.log('Saved. Run:');
  console.log('  git add src/App.jsx');
  console.log('  git commit -m "fix: simple item add - direct DOM input"');
  console.log('  git push origin main');
} else {
  console.log('Could not find capsule area to replace');
}
