import { useState } from "react";
import Badge from "./ui/Badge";
import TD from "./ui/TD";
import TH from "./ui/TH";

export default function LogisticsPanel({ logs, onNewShipment, shop, onViewShipment, onEditShipment, onDeleteShipment }) {
  const [hovR, setHovR] = useState(null);
  const accent = shop?.accent || "#059669";

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h2 style={{margin:0,fontSize:22,fontWeight:900,color:"#0f172a"}}>Logistics & Shipments</h2>
        <button onClick={onNewShipment} style={{padding:"10px 22px",borderRadius:12,border:"none",background:accent,color:"white",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 3px 10px "+accent+"44"}}>+ New Shipment</button>
      </div>
      <div style={{background:"white",borderRadius:16,border:"1px solid #f1f5f9",overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
            <thead>
              <tr style={{background:"#f8fafc"}}>
                {["Shipment ID","Supplier","Courier","Tracking","Status","Received","Actions"].map(h=>(
                  <th key={h} style={{padding:"11px 16px",textAlign:"left",fontSize:11,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid #f1f5f9",whiteSpace:"nowrap"}}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l)=>{
                const isH = hovR === l.id;
                // Support both old field names and new saved field names
                const courier = l.serviceCustom || l.service || l.agent || "—";
                const tracking = l.trackingNo || l.track || "—";
                const supplier = l.supplier || "—";
                const received = l.receivedDate || l.disp || "—";
                const status = l.status || "PENDING";

                return(
                  <tr key={l.id}
                    onMouseEnter={()=>setHovR(l.id)}
                    onMouseLeave={()=>setHovR(null)}
                    style={{borderBottom:"1px solid #f8fafc",background:isH?accent+"0d":"transparent",transition:"background 0.12s"}}>
                    {/* Shipment ID */}
                    <td style={{padding:"13px 16px",fontFamily:"DM Mono,monospace",fontWeight:700,fontSize:12,color:accent,whiteSpace:"nowrap"}}>
                      {l.id}
                      {l.purchaseId&&<div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>PO: {l.purchaseId}</div>}
                    </td>
                    {/* Supplier */}
                    <td style={{padding:"13px 16px",fontSize:13,fontWeight:600,color:"#1e293b"}}>{supplier}</td>
                    {/* Courier */}
                    <td style={{padding:"13px 16px",fontSize:13,color:"#64748b"}}>{courier}</td>
                    {/* Tracking */}
                    <td style={{padding:"13px 16px",fontFamily:"DM Mono,monospace",fontSize:12,color:"#64748b"}}>{tracking}</td>
                    {/* Status */}
                    <td style={{padding:"13px 16px"}}><Badge>{status}</Badge></td>
                    {/* Received */}
                    <td style={{padding:"13px 16px",fontSize:12,color:"#64748b",whiteSpace:"nowrap"}}>{received}</td>
                    {/* Actions */}
                    <td style={{padding:"13px 16px"}}>
                      <div style={{display:"flex",gap:5,alignItems:"center"}}>
                        <button
                          onClick={()=>onViewShipment&&onViewShipment(l)}
                          title="View details"
                          style={{padding:"5px 10px",borderRadius:7,border:"1px solid #e2e8f0",background:"white",color:"#374151",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all 0.13s"}}
                          onMouseEnter={e=>{e.currentTarget.style.background=accent+"15";e.currentTarget.style.color=accent;e.currentTarget.style.borderColor=accent;}}
                          onMouseLeave={e=>{e.currentTarget.style.background="white";e.currentTarget.style.color="#374151";e.currentTarget.style.borderColor="#e2e8f0";}}>
                          👁 View
                        </button>
                        <button
                          onClick={()=>onEditShipment&&onEditShipment(l)}
                          title="Edit shipment"
                          style={{padding:"5px 10px",borderRadius:7,border:"1px solid "+accent,background:accent+"12",color:accent,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all 0.13s"}}
                          onMouseEnter={e=>{e.currentTarget.style.background=accent;e.currentTarget.style.color="white";}}
                          onMouseLeave={e=>{e.currentTarget.style.background=accent+"12";e.currentTarget.style.color=accent;}}>
                          ✏️ Edit
                        </button>
                        <button
                          onClick={()=>onDeleteShipment&&onDeleteShipment(l)}
                          title="Delete shipment"
                          style={{padding:"5px 10px",borderRadius:7,border:"1px solid #fca5a5",background:"#fff5f5",color:"#dc2626",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all 0.13s"}}
                          onMouseEnter={e=>{e.currentTarget.style.background="#dc2626";e.currentTarget.style.color="white";}}
                          onMouseLeave={e=>{e.currentTarget.style.background="#fff5f5";e.currentTarget.style.color="#dc2626";}}>
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {logs.length===0&&(
                <tr>
                  <td colSpan={7} style={{textAlign:"center",padding:"60px",color:"#94a3b8",fontSize:14}}>
                    <div style={{fontSize:36,marginBottom:10}}>🚚</div>
                    No shipments yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}