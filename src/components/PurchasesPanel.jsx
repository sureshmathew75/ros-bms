import TH from "./ui/TH";
import TD from "./ui/TD";

export default function PurchasesPanel({
  Badge,
  fmt,
  onExport,
  onImport,
  onNewPurchase,
  purch,
  shop,
  shopId
}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <h2 style={{margin:0,fontSize:22,fontWeight:900,color:"#0f172a"}}>Purchase Management</h2>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={onImport}
            style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:10,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
            <span>⬇</span> Import
          </button>
          <button onClick={onExport}
            style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:10,border:"1px solid "+shop.accent+"66",background:shop.accentBg,color:shop.accentText,fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
            <span>⬆</span> Export
          </button>
          <button onClick={onNewPurchase} style={{padding:"9px 20px",borderRadius:10,border:"none",background:shop.accent,color:"white",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 3px 10px "+shop.accent+"44"}}>+ New Purchase</button>
        </div>
      </div>
      <div style={{background:"white",borderRadius:16,border:"1px solid #f1f5f9",overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#f8fafc"}}>{["Date","Batch","Supplier","Invoice","GST","Total","Status","Remarks"].map(h=><TH key={h} ch={h}/>)}</tr></thead>
          <tbody>
            {purch.map((p,i)=>(
              <tr key={p.id} style={{borderBottom:"1px solid #f8fafc",background:i%2===0?"white":"#fafafa"}}
                onMouseEnter={e=>e.currentTarget.style.background=shop.accent+"0d"}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"white":"#fafafa"}>
                <TD ch={p.date} c="#64748b"/>
                <TD ch={p.batch} mono c={shop.accent} fw={700}/>
                <TD ch={p.sup} fw={700} c="#1e293b"/>
                <TD ch={p.inv} mono c="#64748b"/>
                <td style={{padding:"13px 16px"}}>{p.gst>0?<Badge l="GST"/>:<span style={{color:"#e2e8f0"}}>—</span>}</td>
                <TD ch={fmt(shopId,p.total)} fw={900} c="#0f172a"/>
                <td style={{padding:"13px 16px"}}><Badge l={p.pay}/></td>
                <TD ch={p.rem||"—"} c="#94a3b8"/>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
