#!/usr/bin/env node
/**
 * Hides Pur. Amount column from staff in SalesPanel.jsx
 * Works on any version of the file
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'src', 'SalesPanel.jsx');

let src = fs.readFileSync(FILE, 'utf8');
let changed = 0;

// Fix 1: Header array — any variant
const h1 = src.match(/\.\.\.\(shopId===["']ros-india["']\s*\?\s*\["Pur\. Amount"\]\s*:\s*\[\]\)/);
if (h1 && !h1[0].includes('isStaff')) {
  src = src.replace(h1[0], '...(shopId==="ros-india"&&!isStaff ? ["Pur. Amount"] : [])');
  console.log('FIXED: header');
  changed++;
} else {
  console.log('SKIP/OK: header');
}

// Fix 2: Cell — any variant  
const c1 = src.match(/\{shopId===["']ros-india["']&&\((\s*\n\s*<td)/);
if (c1 && !src.includes('shopId==="ros-india"&&!isStaff&&(')) {
  src = src.replace('{shopId==="ros-india"&&(', '{shopId==="ros-india"&&!isStaff&&(');
  console.log('FIXED: cell');
  changed++;
} else {
  console.log('SKIP/OK: cell');
}

// Fix 3: colSpan — any variant
const span = /colSpan=\{shopId===["']ros-india["']\s*\?\s*10\s*:\s*9\}/g;
if (span.test(src) && !src.includes('!isStaff ? 10')) {
  src = src.replace(/colSpan=\{shopId===["']ros-india["']\s*\?\s*10\s*:\s*9\}/g, 
    'colSpan={shopId==="ros-india"&&!isStaff ? 10 : 9}');
  console.log('FIXED: colSpan');
  changed++;
} else {
  console.log('SKIP/OK: colSpan');
}

fs.writeFileSync(FILE, src, 'utf8');
console.log('\nDone. Changes:', changed);
console.log('isStaff count:', (src.match(/!isStaff/g)||[]).length);
