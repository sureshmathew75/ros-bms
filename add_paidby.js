#!/usr/bin/env node
// Adds Paid By field to New Sale form (ROS India only)
const fs = require('fs');
const FILE = require('path').join(__dirname, 'src', 'App.jsx');
let src = fs.readFileSync(FILE, 'utf8');

const OLD = `                <div><label style={lbl}>Contact</label><input value={form.contact} onChange={e=>set("contact",e.target.value)} placeholder="+44 7700 000000" style={inp} onFocus={fo} onBlur={bl}/></div>\r
                <div><label style={lbl}>Address</label><input value={form.address||""} onChange={e=>set("address",e.target.value)} placeholder="Address" style={inp} onFocus={fo} onBlur={bl}/></div>\r
              </div>\r
            </div>\r
\r
            {/* Items */}`;

const NEW = `                <div><label style={lbl}>Contact</label><input value={form.contact} onChange={e=>set("contact",e.target.value)} placeholder="+44 7700 000000" style={inp} onFocus={fo} onBlur={bl}/></div>\r
                <div><label style={lbl}>Address</label><input value={form.address||""} onChange={e=>set("address",e.target.value)} placeholder="Address" style={inp} onFocus={fo} onBlur={bl}/></div>\r
              </div>\r
              {shopId==="ros-india"&&(\r
                <div style={{marginTop:7}}>\r
                  <label style={lbl}>Paid By</label>\r
                  <input value={form.paidBy||""} onChange={e=>set("paidBy",e.target.value)}\r
                    placeholder="Who sent the money\u2026" style={inp} onFocus={fo} onBlur={bl}/>\r
                </div>\r
              )}\r
            </div>\r
\r
            {/* Items */}`;

if (src.includes('Who sent the money')) {
  console.log('SKIP: Paid By field already present');
} else if (!src.includes(OLD)) {
  console.log('NOT FOUND: anchor missing - contact your developer');
  process.exit(1);
} else {
  src = src.replace(OLD, NEW);
  fs.writeFileSync(FILE, src, 'utf8');
  console.log('DONE: Paid By field added to New Sale form');
}
