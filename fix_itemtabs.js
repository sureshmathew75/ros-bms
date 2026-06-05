#!/usr/bin/env node
// Fix item tabs: update onAddShopItem to use Supabase + show capsules immediately
const fs = require('fs');
const APP = require('path').join(__dirname, 'src', 'App.jsx');
let src = fs.readFileSync(APP, 'utf8');
let changed = 0;

// Fix 1: Replace old localStorage onAddShopItem with Supabase version
const patterns = [
  // Pattern A - old localStorage version
  [
    `            onAddShopItem={(item)=>{\r\n              const current=(shopItems||{})[shopId]||[];\r\n              const updated={...(shopItems||{}),[shopId]:[...new Set([...current,item])]};\r\n              if(saveShopItems) saveShopItems(updated);\r\n            }}`,
    `            onAddShopItem={(item)=>{\r\n              const current=(shopItems||{})[shopId]||[];\r\n              if(current.includes(item)) return;\r\n              const updated={...(shopItems||{}),[shopId]:[...current,item]};\r\n              setShopItems(updated);\r\n              dbAddShopItem(shopId,item);\r\n            }}\r\n            onDeleteShopItem={(item)=>{\r\n              const current=(shopItems||{})[shopId]||[];\r\n              const updated={...(shopItems||{}),[shopId]:current.filter(i=>i!==item)};\r\n              setShopItems(updated);\r\n              dbDeleteShopItem(shopId,item);\r\n            }}`
  ],
  // Pattern B - LF version
  [
    `            onAddShopItem={(item)=>{\n              const current=(shopItems||{})[shopId]||[];\n              const updated={...(shopItems||{}),[shopId]:[...new Set([...current,item])]};\n              if(saveShopItems) saveShopItems(updated);\n            }}`,
    `            onAddShopItem={(item)=>{\n              const current=(shopItems||{})[shopId]||[];\n              if(current.includes(item)) return;\n              const updated={...(shopItems||{}),[shopId]:[...current,item]};\n              setShopItems(updated);\n              dbAddShopItem(shopId,item);\n            }}\n            onDeleteShopItem={(item)=>{\n              const current=(shopItems||{})[shopId]||[];\n              const updated={...(shopItems||{}),[shopId]:current.filter(i=>i!==item)};\n              setShopItems(updated);\n              dbDeleteShopItem(shopId,item);\n            }}`
  ]
];

for (const [old, neu] of patterns) {
  if (!src.includes(neu) && src.includes(old)) {
    src = src.replace(old, neu);
    changed++;
    console.log('FIXED: onAddShopItem -> Supabase');
    break;
  }
}

// Fix 2: Replace localStorage shopItems state with Supabase version
const statePatterns = [
  [/const \[shopItems,setShopItems\]=useState\(\(\)=>\{[\s\S]*?saveShopItems=\(updated\)=>\{\s*setShopItems\(updated\);\s*try\{localStorage\.setItem[^}]+\}catch\{\}\s*\};/,
   `const [shopItems,setShopItems]=useState({"ros-selections":[],"ros-hairlines":[],"ros-india":[]});
  useEffect(()=>{dbLoadShopItems().then(data=>{if(data)setShopItems({"ros-selections":data["ros-selections"]||[],"ros-hairlines":data["ros-hairlines"]||[],"ros-india":data["ros-india"]||[]});});});
  const saveShopItems=(updated)=>setShopItems(updated);`]
];

for (const [pattern, replacement] of statePatterns) {
  if (pattern.test(src)) {
    const match = src.match(pattern);
    if (match && !src.includes('dbLoadShopItems')) {
      src = src.replace(pattern, replacement);
      changed++;
      console.log('FIXED: shopItems state -> Supabase');
    }
  }
}

if (changed === 0) {
  console.log('Nothing to fix - checking current state...');
  console.log('Has dbAddShopItem:', src.includes('dbAddShopItem'));
  console.log('Has onDeleteShopItem:', src.includes('onDeleteShopItem={(item)'));
  console.log('Has saveShopItems localStorage:', src.includes('localStorage.setItem("ros_shopItems"'));
} else {
  fs.writeFileSync(APP, src, 'utf8');
  console.log('\nDone. Now run:');
  console.log('  git add src/App.jsx');
  console.log('  git commit -m "fix: item tabs save to Supabase"');
  console.log('  git push origin main');
}
