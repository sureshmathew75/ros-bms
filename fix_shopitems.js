#!/usr/bin/env node
// Fix: reload shop items whenever active shop changes
const fs = require('fs');
const FILE = require('path').join(__dirname, 'src', 'App.jsx');
let src = fs.readFileSync(FILE, 'utf8');

let changed = false;

// Try various forms of the useEffect
const variants = [
  '  useEffect(()=>{dbLoadShopItems().then(data=>{if(data&&Object.keys(data).length>0)setShopItems(data);});},[]);',
  '  useEffect(()=>{dbLoadShopItems().then(data=>{if(data&&Object.keys(data).length>0)setShopItems(data);});},[]);\r',
];

const NEW = '  useEffect(()=>{dbLoadShopItems().then(data=>{if(data)setShopItems({"ros-selections":data["ros-selections"]||[],"ros-hairlines":data["ros-hairlines"]||[],"ros-india":data["ros-india"]||[]});});});';

if (src.includes(NEW)) {
  console.log('SKIP: already fixed');
  process.exit(0);
}

for (const OLD of variants) {
  if (src.includes(OLD)) {
    src = src.replace(OLD, NEW);
    changed = true;
    break;
  }
}

if (!changed) {
  // Use regex
  src = src.replace(
    /useEffect\(\(\)=>\{dbLoadShopItems\(\)\.then\(data=>\{if\(data[^}]+\}setShopItems\(data\);\}\);?\},\[\]\)/,
    'useEffect(()=>{dbLoadShopItems().then(data=>{if(data)setShopItems({"ros-selections":data["ros-selections"]||[],"ros-hairlines":data["ros-hairlines"]||[],"ros-india":data["ros-india"]||[]});});})'
  );
  changed = true;
  console.log('Fixed via regex');
}

if (changed) {
  fs.writeFileSync(FILE, src, 'utf8');
  console.log('DONE: shop items now reload on every render cycle');
  console.log('\nRun:');
  console.log('  git add src/App.jsx');
  console.log('  git commit -m "fix: shop items reload correctly"');
  console.log('  git push origin main');
}
