import KPI from "./ui/KPI";
import TH from "./ui/TH";
import TD from "./ui/TD";

export default function ExpensesPanel({ exps, fmt, shop, shopId, totExp }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h2 style={{margin:0,fontSize:22,fontWeight:900,color:"#0f172a"}}>Expenses — {shop.name}</h2>
        <button style={{padding:"10px 22px",borderRadius:12,border:"none",background:shop.accent,color:"white",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>+ Add Expense</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
        <KPI label="Total Expenses" val={fmt(shopId,totExp)}   change="5%"  plus={false} icon="💳" color="#ef4444"/>
        <KPI label="This Month"     val={fmt(shopId,totExp)}   change="3%"  plus={false} icon="📅" color="#f59e0b"/>
        <KPI label="Categories"     val={[...new Set(exps.map(e=>e.cat))].length} change="0" plus={true} icon="🏷️" color={shop.accent}/>
      </div>
      <div style={{background:"white",borderRadius:16,border:"1px solid #f1f5f9",overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#f8fafc"}}>{["Date","Category","Description","Amount","Method",""].map(h=><TH key={h} ch={h}/>)}</tr></thead>
          <tbody>
            {exps.map((e,i)=>(
              <tr key={e.id} style={{borderBottom:"1px solid #f8fafc",background:i%2===0?"white":"#fafafa"}}
                onMouseEnter={ev=>ev.currentTarget.style.background=shop.accent+"0d"}
                onMouseLeave={ev=>ev.currentTarget.style.background=i%2===0?"white":"#fafafa"}>
                <TD ch={e.date} c="#64748b"/>
                <td style={{padding:"13px 16px"}}><span style={{background:"#fff7ed",color:"#c2410c",border:"1px solid #fed7aa",borderRadius:999,padding:"3px 11px",fontSize:12,fontWeight:700}}>{e.cat}</span></td>
                <TD ch={e.desc} c="#374151"/>
                <TD ch={fmt(shopId,e.amount)} fw={900} c="#dc2626"/>
                <TD ch={e.method} c="#64748b"/>
                <td style={{padding:"13px 16px"}}><button style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:20}}>⋯</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
