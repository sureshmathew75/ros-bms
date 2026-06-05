#!/usr/bin/env node
const fs = require('fs');
const APP = require('path').join(__dirname, 'src', 'App.jsx');
const src = fs.readFileSync(APP, 'utf8');

console.log('=== APP.JSX STATE CHECK ===');
console.log('Has dbAddShopItem:', src.includes('dbAddShopItem'));
console.log('Has dbLoadShopItems:', src.includes('dbLoadShopItems'));
console.log('Has AddItemButton component:', src.includes('const AddItemButton='));
console.log('Has onDeleteShopItem prop:', src.includes('onDeleteShopItem={(item)'));
console.log('Has old saveShopItems localStorage:', src.includes('localStorage.setItem("ros_shopItems"'));
console.log('Has old shopItems useState:', src.includes('const [shopItems,setShopItems]=useState(()=>'));
console.log('Has new shopItems useState:', src.includes('const [shopItems,setShopItems]=useState({"ros-selections"'));
console.log('Has NSF capsule div:', src.includes('onDeleteShopItem&&onDeleteShopItem'));
console.log('Has old capsule render:', src.includes('shopItems.length>0&&(<div'));

// Show the onAddShopItem block
const idx = src.indexOf('onAddShopItem={(item)');
if (idx > 0) {
  console.log('\n--- onAddShopItem block ---');
  console.log(src.slice(idx, idx+300));
}

// Show shopItems state
const idx2 = src.indexOf('[shopItems,setShopItems]');
if (idx2 > 0) {
  console.log('\n--- shopItems state ---');
  console.log(src.slice(idx2, idx2+200));
}
