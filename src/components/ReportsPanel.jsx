import PanelContainer from "./ui/PanelContainer";
import SectionHeader from "./ui/SectionHeader";

export default function ReportsPanel({ shop, showPdf }) {
  return (
    <PanelContainer>
      <SectionHeader>Reports — {shop.name}</SectionHeader>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(255px,1fr))",gap:14}}>
        {[{t:"Sales Report",d:"Sales summary with customer breakdown",ic:"📊"},{t:"Purchase Report",d:"Supplier purchases & payment status",ic:"📦"},{t:"P&L Statement",d:"Revenue, expenses and profit/loss",ic:"💹"},{t:"Stock Report",d:"Inventory levels and valuation",ic:"🏷️"},{t:"Customer Report",d:"Customer activity and lifetime value",ic:"👥"},{t:"Expense Report",d:"Expense breakdown by category",ic:"💳"}].map(r=>(
          <div key={r.t} style={{background:"white",borderRadius:16,padding:22,border:"1px solid #f1f5f9",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",cursor:"pointer",transition:"all 0.18s"}}
            onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 8px 24px "+shop.accent+"1a";e.currentTarget.style.borderColor=shop.accent+"44";}}
            onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 6px rgba(0,0,0,0.06)";e.currentTarget.style.borderColor="#f1f5f9";}}>
            <div style={{width:48,height:48,borderRadius:14,background:shop.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:12}}>{r.ic}</div>
            <h3 style={{margin:"0 0 5px",fontSize:15,fontWeight:800,color:"#0f172a"}}>{r.t}</h3>
            <p style={{margin:"0 0 14px",fontSize:12,color:"#94a3b8"}}>{r.d}</p>
            <div style={{display:"flex",gap:8}}>
              <button style={{padding:"6px 14px",borderRadius:9,border:"1px solid "+shop.accent+"33",background:shop.accentBg,color:shop.accentText,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>Preview</button>
              <button onClick={()=>showPdf(r)} style={{padding:"6px 14px",borderRadius:9,border:"1px solid #e2e8f0",background:"#f8fafc",color:"#374151",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>⬇ PDF</button>
            </div>
          </div>
        ))}
      </div>
    </PanelContainer>
  );
}