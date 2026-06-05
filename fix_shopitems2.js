#!/usr/bin/env node
// Fix: after adding item, reload all items from Supabase to force UI update
const fs = require('fs');
const FILE = require('path').join(__dirname, 'src', 'App.jsx');
let src = fs.readFileSync(FILE, 'utf8');

const OLD = `            onAddShopItem={(item)=>{
              const current=(shopItems||{})[shopId]||[];
              if(current.includes(item)) return;
              const updated={...(shopItems||{}),[shopId]:[...current,item]};
              setShopItems(updated); dbAddShopItem(shopId,item);
            }}`;

const NEW = `            onAddShopItem={(item)=>{
              const current=(shopItems||{})[shopId]||[];
              if(current.includes(item)) return;
              dbAddShopItem(shopId,item).then(()=>{
                dbLoadShopItems().then(data=>{if(data)setShopItems({"ros-selections":data["ros-selections"]||[],"ros-hairlines":data["ros-hairlines"]||[],"ros-india":data["ros-india"]||[]});});
              });
              const updated={...(shopItems||{}),[shopId]:[...current,item]};
              setShopItems(updated);
            }}`;

if (src.includes('dbAddShopItem(shopId,item).then')) {
  console.log('SKIP: already fixed');
} else if (src.includes(OLD)) {
  src = src.replace(OLD, NEW);
  fs.writeFileSync(FILE, src, 'utf8');
  console.log('DONE');
} else {
  // Try CRLF
  const OLD2 = OLD.replace(/\n/g, '\r\n');
  const NEW2 = NEW.replace(/\n/g, '\r\n');
  if (src.includes(OLD2)) {
    src = src.replace(OLD2, NEW2);
    fs.writeFileSync(FILE, src, 'utf8');
    console.log('DONE (CRLF)');
  } else {
    console.log('NOT FOUND - using regex');
    src = src.replace(
      /setShopItems\(updated\); dbAddShopItem\(shopId,item\);/,
      'dbAddShopItem(shopId,item).then(()=>{dbLoadShopItems().then(data=>{if(data)setShopItems({"ros-selections":data["ros-selections"]||[],"ros-hairlines":data["ros-hairlines"]||[],"ros-india":data["ros-india"]||[]});});});\n              setShopItems(updated);'
    );
    fs.writeFileSync(FILE, src, 'utf8');
    console.log('DONE (regex)');
  }
}

console.log('\nRun:');
console.log('  git add src/App.jsx');
console.log('  git commit -m "fix: item tabs show immediately after save"');
console.log('  git push origin main');
