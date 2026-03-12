import TH from "./ui/TH";
import TD from "./ui/TD";

export default function ProductsPanel({ lowStk, products, shop }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><h2 style={{margin:0,fontSize:22,fontWeight:900,color:"#0f172a"}}>Product Catalogue</h2><p style={{margin:"3px 0 0",fontSize:12,color:"#94a3b8"}}>Shared across all shops</p></div>
        <button style={{padding:"10px 22px",borderRadius:12,border:"none",background:shop.accent,color:"white",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>+ Add Product</button>
      </div>
      {lowStk.length>0&&<div style={{background:"#fff5f5",border:"1px solid #fecaca",borderRadius:12,padding:"13px 18px",display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:20}}>⚠️</span>
        <div><p style={{margin:0,fontWeight:800,color:"#991b1b",fontSize:14}}>{lowStk.length} Low Stock Alert{lowStk.length>1?"s":""}</p><p style={{margin:0,fontSize:12,color:"#dc2626"}}>{lowStk.map(p=>p.name).join(", ")}</p></div>
      </div>}
      <div style={{background:"white",borderRadius:16,border:"1px solid #f1f5f9",overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#f8fafc"}}>{["Product","SKU","Category","Cost","Sell Price","Stock","Status",""].map(h=><TH key={h} ch={h}/>)}</tr></thead>
          <tbody>
            {products.map((p,i)=>{
              const isLow=p.stock<=p.min;
              return(
                <tr key={p.id} style={{borderBottom:"1px solid #f8fafc",background:isLow?"#fff8f8":i%2===0?"white":"#fafafa"}}
                  onMouseEnter={e=>e.currentTarget.style.background=shop.accent+"0d"}
                  onMouseLeave={e=>e.currentTarget.style.background=isLow?"#fff8f8":i%2===0?"white":"#fafafa"}>
                  <TD ch={p.name} fw={700} c="#1e293b"/>
                  <TD ch={p.sku} mono c="#64748b"/>
                  <td style={{padding:"13px 16px"}}><span style={{background:"#f1f5f9",color:"#64748b",borderRadius:999,padding:"3px 11px",fontSize:12,fontWeight:600}}>{p.cat}</span></td>
                  <TD ch={"£"+p.cost} c="#64748b"/>
                  <TD ch={"£"+p.sell} fw={900} c="#15803d"/>
                  <td style={{padding:"13px 16px"}}><span style={{fontWeight:900,fontSize:15,color:isLow?"#dc2626":"#0f172a"}}>{p.stock}</span>{isLow&&<span style={{marginLeft:5}}>⚠️</span>}</td>
                  <td style={{padding:"13px 16px"}}><span style={{background:isLow?"#fee2e2":"#dcfce7",color:isLow?"#dc2626":"#15803d",border:"1px solid "+(isLow?"#fecaca":"#bbf7d0"),borderRadius:999,padding:"3px 11px",fontSize:12,fontWeight:700}}>{isLow?"Low Stock":"In Stock"}</span></td>
                  <td style={{padding:"13px 16px"}}><button style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:20}}>⋯</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
