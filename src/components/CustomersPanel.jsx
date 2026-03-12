export default function CustomersPanel({ Badge, customers, search, shop }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:900,color:"#0f172a"}}>Customer Database</h2>
          <p style={{margin:"3px 0 0",fontSize:12,color:"#94a3b8"}}>Shared across all shops · {customers.length} customers</p>
        </div>
        <button style={{padding:"10px 22px",borderRadius:12,border:"none",background:shop.accent,color:"white",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>+ Add Customer</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(295px,1fr))",gap:16}}>
        {customers.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||c.phone.includes(search)).map(c=>(
          <div key={c.id} style={{background:"white",border:"2px solid #f1f5f9",borderRadius:16,padding:20,boxShadow:"0 1px 6px rgba(0,0,0,0.05)",cursor:"pointer",transition:"all 0.18s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=shop.accent+"55";e.currentTarget.style.boxShadow="0 8px 24px "+shop.accent+"1a";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#f1f5f9";e.currentTarget.style.boxShadow="0 1px 6px rgba(0,0,0,0.05)";}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <div style={{width:44,height:44,borderRadius:13,background:shop.sb,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:900,fontSize:17,flexShrink:0}}>{c.name.charAt(0)}</div>
              <div><p style={{margin:0,fontWeight:800,fontSize:14,color:"#0f172a"}}>{c.name}</p>{c.tag&&<Badge l={c.tag}/>}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:5,fontSize:13,color:"#64748b",marginBottom:12}}>
              <span>📞 {c.phone}</span><span>💬 {c.whatsapp}</span>
              <span style={{fontSize:12}}>📍 {c.address}</span>
              {c.notes&&<span style={{fontSize:11,color:"#94a3b8"}}>📝 {c.notes}</span>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,paddingTop:12,borderTop:"1px solid #f8fafc"}}>
              {[{l:"Orders",v:c.purchases},{l:"Spend",v:c.spend.toLocaleString()},{l:"Last Buy",v:c.last.split(" ").slice(0,2).join(" ")}].map(s=>(
                <div key={s.l} style={{textAlign:"center",background:shop.accentBg,borderRadius:9,padding:"8px 4px",border:"1px solid "+shop.accent+"18"}}>
                  <p style={{margin:0,fontWeight:900,fontSize:14,color:shop.accentText}}>{s.v}</p>
                  <p style={{margin:0,fontSize:10,color:shop.accent,fontWeight:700}}>{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
