import React from "react";

/* ── AddressEntryModal: structured address entry with a paste-and-parse
   shortcut for WhatsApp addresses. Parsing is a best-effort shortcut,
   never trusted blindly — every field stays editable.

   Originally lived inline in App.jsx (used by the Sales add/edit forms).
   Pulled out into its own file, unchanged, so DispatchPanel can reuse the
   exact same modal for editing a sale's address from the Despatch Log —
   no logic changed, just moved so both places can import one component
   instead of maintaining two copies. ─────────────────────────────────── */

const INDIA_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

/* Best-effort parser for addresses pasted from WhatsApp. Indian addresses
   vary hugely in format, so this deliberately stays conservative — it
   only pulls out the parts it can be reasonably confident about (a
   6-digit PIN code, a recognised state name, a likely name line) and
   leaves everything else as an editable address block, rather than
   trying to over-segment into fields it'll frequently get wrong. */
const parseIndianAddress = (raw) => {
  let lines = (raw||"").split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if (lines.length <= 1) lines = (raw||"").split(",").map(l=>l.trim()).filter(Boolean);

  let pin = "";
  let state = "";
  const bodyLines = [];

  lines.forEach(line => {
    let remaining = line;
    const pinMatch = remaining.match(/\b\d{6}\b/);
    if (pinMatch && !pin) { pin = pinMatch[0]; remaining = remaining.replace(pinMatch[0], "").trim(); }
    const stateMatch = INDIA_STATES.find(st => remaining.toLowerCase().includes(st.toLowerCase()));
    if (stateMatch && !state) { state = stateMatch; remaining = remaining.replace(new RegExp(stateMatch,"i"), "").trim(); }
    remaining = remaining.replace(/^[-,\s]+|[-,\s]+$/g, "");
    if (remaining) bodyLines.push(remaining);
  });

  // First remaining line is likely the name if it's short and has no
  // address-ish keywords or digits — otherwise leave name blank rather
  // than risk mislabeling a real address line.
  let name = "";
  if (bodyLines.length > 1) {
    const first = bodyLines[0];
    const looksLikeAddress = /\d|road|street|st\.|nagar|post|po|dist|near|opp|house|building|floor|apartment|flat/i.test(first);
    if (!looksLikeAddress && first.split(" ").length <= 4) {
      name = bodyLines.shift();
    }
  }

  return { name, address: bodyLines.join(", "), state, pin };
};

const AddressEntryModal = ({ initialValue, onClose, onSave }) => {
  const parsedInitial = React.useMemo(() => parseIndianAddress(initialValue||""), []); // eslint-disable-line
  const [pasteBox, setPasteBox] = React.useState("");
  const [name, setName] = React.useState(parsedInitial.name);
  const [address, setAddress] = React.useState(parsedInitial.address || initialValue || "");
  const [state, setState] = React.useState(parsedInitial.state);
  const [pin, setPin] = React.useState(parsedInitial.pin);

  const inp = { width:"100%", padding:"9px 12px", borderRadius:9, border:"1.5px solid #e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" };
  const lbl = { display:"block", fontSize:11, fontWeight:700, color:"#374151", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" };

  const runParse = () => {
    if (!pasteBox.trim()) return;
    const parsed = parseIndianAddress(pasteBox);
    if (parsed.name) setName(parsed.name);
    if (parsed.address) setAddress(parsed.address);
    if (parsed.state) setState(parsed.state);
    if (parsed.pin) setPin(parsed.pin);
  };

  const formatted = [name, address, [state,pin].filter(Boolean).join(" - ")].filter(Boolean).join("\n");

  return (
    <div style={{ position:"fixed", inset:0, zIndex:320, background:"rgba(15,23,42,0.55)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"white", borderRadius:16, padding:"22px 24px", maxWidth:440, width:"92%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <div style={{ fontSize:15, fontWeight:800, color:"#0f172a" }}>📍 Enter Address</div>
          <button onClick={onClose} style={{ border:"none", background:"transparent", fontSize:18, cursor:"pointer", color:"#94a3b8" }}>✕</button>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={lbl}>Paste from WhatsApp (optional)</label>
          <textarea value={pasteBox} onChange={e=>setPasteBox(e.target.value)} rows={4}
            placeholder="Paste the full address the customer sent you…"
            style={{...inp,resize:"vertical",fontFamily:"inherit"}}/>
          <button onClick={runParse}
            style={{ marginTop:6, width:"100%", padding:"9px 0", borderRadius:9, border:"1px solid #e2e8f0", background:"#f8fafc", color:"#374151", fontWeight:700, fontSize:12.5, cursor:"pointer", fontFamily:"inherit" }}>
            ✨ Fill fields from paste
          </button>
          <p style={{ margin:"6px 0 0", fontSize:10.5, color:"#94a3b8" }}>This is a best-effort shortcut — please check the fields below before saving.</p>
        </div>

        <div style={{ borderTop:"1px solid #f1f5f9", paddingTop:14, marginBottom:14 }}>
          <div style={{ marginBottom:10 }}>
            <label style={lbl}>Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Recipient name" style={inp}/>
          </div>
          <div style={{ marginBottom:10 }}>
            <label style={lbl}>Address</label>
            <textarea value={address} onChange={e=>setAddress(e.target.value)} rows={3} placeholder="House, street, area, city, district" style={{...inp,resize:"vertical",fontFamily:"inherit"}}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={lbl}>State</label>
              <select value={state} onChange={e=>setState(e.target.value)} style={inp}>
                <option value="">Select state</option>
                {INDIA_STATES.map(st=><option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div><label style={lbl}>PIN Code</label>
              <input value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="6-digit PIN" style={inp}/>
            </div>
          </div>
        </div>

        <div style={{ marginBottom:18 }}>
          <label style={lbl}>Preview</label>
          <div style={{ padding:"10px 12px", borderRadius:9, background:"#f8fafc", border:"1px solid #e2e8f0", fontSize:12.5, color:"#374151", whiteSpace:"pre-line", lineHeight:1.5, minHeight:20 }}>
            {formatted || <span style={{color:"#94a3b8"}}>Nothing entered yet</span>}
          </div>
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px 0", borderRadius:10, border:"1px solid #e2e8f0", background:"white", color:"#374151", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            Cancel
          </button>
          <button onClick={()=>onSave(formatted)} disabled={!formatted}
            style={{ flex:1, padding:"11px 0", borderRadius:10, border:"none", background:"#f59e0b", color:"white", fontWeight:700, fontSize:13, cursor:formatted?"pointer":"default", fontFamily:"inherit", opacity:formatted?1:0.6 }}>
            Save Address
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressEntryModal;
