#!/usr/bin/env node
const fs = require('fs');
const APP = require('path').join(__dirname, 'src', 'App.jsx');
let src = fs.readFileSync(APP, 'utf8');

// Root cause: useEffect without [] runs after every render
// When onAddShopItem fires: setShopItems(updated) -> re-render -> useEffect runs
// -> dbLoadShopItems() fetches from Supabase (item may not be saved yet) 
// -> setShopItems(stale data) -> capsule disappears

// Fix: add [] to useEffect so it only runs once on mount
// The immediate state update handles UI, Supabase handles persistence

let changed = 0;

// Fix useEffect - add [] dependency
[
  ['useEffect(()=>{dbLoadShopItems().then(data=>{if(data)setShopItems({"ros-selections":data["ros-selections"]||[],"ros-hairlines":data["ros-hairlines"]||[],"ros-india":data["ros-india"]||[]});});});',
   'useEffect(()=>{dbLoadShopItems().then(data=>{if(data)setShopItems({"ros-selections":data["ros-selections"]||[],"ros-hairlines":data["ros-hairlines"]||[],"ros-india":data["ros-india"]||[]});});},[]); '],
  ['useEffect(()=>{dbLoadShopItems().then(data=>{if(data&&Object.keys(data).length>0)setShopItems(data);});});',
   'useEffect(()=>{dbLoadShopItems().then(data=>{if(data&&Object.keys(data).length>0)setShopItems(data);});},[]);'],
].forEach(([old, neu]) => {
  if (src.includes(old) && !src.includes(neu)) {
    src = src.replace(old, neu);
    changed++;
    console.log('FIXED: useEffect now has [] dependency array');
  }
});

// Also fix onAddShopItem to NOT reload from Supabase after save (causes overwrite)
const OLD_HANDLER = `              dbAddShopItem(shopId,item).then(()=>{
                dbLoadShopItems().then(data=>{if(data)setShopItems({"ros-selections":data["ros-selections"]||[],"ros-hairlines":data["ros-hairlines"]||[],"ros-india":data["ros-india"]||[]});});
              });
              const updated={...(shopItems||{}),[shopId]:[...current,item]};
              setShopItems(updated);`;

const NEW_HANDLER = `              const updated={...(shopItems||{}),[shopId]:[...current,item]};
              setShopItems(updated);
              dbAddShopItem(shopId,item);`;

if (src.includes(OLD_HANDLER)) {
  src = src.replace(OLD_HANDLER, NEW_HANDLER);
  changed++;
  console.log('FIXED: onAddShopItem simplified - no reload after save');
}

if (changed > 0) {
  fs.writeFileSync(APP, src, 'utf8');
  console.log('\nDone. Run:');
  console.log('  git add src/App.jsx');
  console.log('  git commit -m "fix: item tabs appear immediately"');
  console.log('  git push origin main');
} else {
  console.log('Nothing changed - showing current useEffect:');
  const idx = src.indexOf('dbLoadShopItems');
  console.log(src.slice(idx-10, idx+150));
}
