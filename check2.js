#!/usr/bin/env node
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname,'src','App.jsx'),'utf8');

// Check AddItemButton component
const idx = src.indexOf('const AddItemButton=');
console.log('AddItemButton component:');
console.log(src.slice(idx, idx+600));
console.log('\n---');

// Check how it is called in NSF
const idx2 = src.indexOf('AddItemButton onAdd=');
console.log('AddItemButton usage:');
console.log(src.slice(idx2-20, idx2+100));
console.log('\n---');

// Check NSF props signature
const idx3 = src.indexOf('const NewSaleForm=({');
console.log('NSF props:');
console.log(src.slice(idx3, idx3+150));
