import Badge from "./ui/Badge";
import TD from "./ui/TD";
import TH from "./ui/TH";

export default function LogisticsPanel({ logs, onNewShipment, shop }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h2 style={{margin:0,fontSize:22,fontWeight:900,color:"#0f172a"}}>Logistics & Shipments</h2>
        <button onClick={onNewShipment} style={{padding:"10px 22px",borderRadius:12,border:"none",background:shop.accent,color:"white",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 3px 10px "+shop.accent+"44"}}>+ New Shipment</button>
      </div>
      <div style={{background:"white",borderRadius:16,border:"1px solid #f1f5f9",overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#f8fafc"}}>{["Shipment ID","Order","Agent","Tracking","Status","Dispatched","ETA"].map(h=><TH key={h} ch={h}/>)}</tr></thead>
          <tbody>
            {logs.map((l)=>(
              <tr key={l.id} style={{borderBottom:"1px solid #f8fafc"}}
                onMouseEnter={e=>e.currentTarget.style.background=shop.accent+"0d"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <TD ch={l.id} mono c={shop.accent} fw={700}/>
                <TD ch={l.order} c="#64748b"/>
                <TD ch={l.agent} fw={700} c="#1e293b"/>
                <TD ch={l.track} mono c="#64748b"/>
                <td style={{padding:"13px 16px"}}><Badge>{l.status}</Badge></td>
                <TD ch={l.disp} c="#64748b"/>
                <TD ch={l.eta} c="#64748b"/>
              </tr>
            ))}
            {logs.length===0&&<tr><td colSpan={7} style={{textAlign:"center",padding:"60px",color:"#94a3b8",fontSize:14}}>No shipments yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
