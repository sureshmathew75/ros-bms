export default function DocumentsPanel({ shop }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:900,color:"#0f172a"}}>Documents & Invoices</h2>
      <div style={{background:"white",borderRadius:16,border:"2px dashed "+shop.accent+"55",padding:52,textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:14}}>📁</div>
        <h3 style={{margin:"0 0 8px",fontSize:17,fontWeight:800,color:"#374151"}}>Upload Invoices & Receipts</h3>
        <p style={{color:"#94a3b8",fontSize:13,margin:"0 0 22px"}}>Drag & drop PDFs or images, or browse</p>
        <button style={{padding:"11px 28px",borderRadius:12,border:"none",background:shop.accent,color:"white",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>Browse Files</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:10}}>
        {[{n:"Invoice_SI-1023.pdf",s:"248 KB",d:"12 May 2024",t:"Invoice"},{n:"PO_Elite_May.pdf",s:"182 KB",d:"10 May 2024",t:"Purchase Order"},{n:"Shipping_DHL.pdf",s:"95 KB",d:"12 May 2024",t:"Shipping"}].map(doc=>(
          <div key={doc.n} style={{background:"white",borderRadius:12,border:"1px solid #f1f5f9",padding:"13px 16px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
            <div style={{width:40,height:40,borderRadius:10,background:"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:"#dc2626"}}>PDF</div>
            <div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:700,color:"#1e293b"}}>{doc.n}</p><p style={{margin:0,fontSize:11,color:"#94a3b8"}}>{doc.s} · {doc.d} · <span style={{color:shop.accent}}>{doc.t}</span></p></div>
            <button style={{background:"none",border:"none",cursor:"pointer",fontSize:17,color:shop.accent}}>⬇</button>
          </div>
        ))}
      </div>
    </div>
  );
}
