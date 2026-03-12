import PanelContainer from "./ui/PanelContainer";
import SectionHeader from "./ui/SectionHeader";

export default function InvoicesPanel({ shop }) {
  return (
    <PanelContainer>
      <SectionHeader>Invoices</SectionHeader>
      <div style={{background:"white",borderRadius:16,padding:60,textAlign:"center",border:"1px solid #f1f5f9"}}>
        <div style={{fontSize:48,marginBottom:14}}>🧾</div>
        <h3 style={{margin:"0 0 8px",fontSize:18,fontWeight:800,color:"#374151"}}>Invoice Management</h3>
        <p style={{color:"#94a3b8",fontSize:14,margin:"0 0 22px"}}>Generate, send and track invoices for {shop.name}</p>
        <button style={{padding:"11px 28px",borderRadius:12,border:"none",background:shop.accent,color:"white",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>+ Create Invoice</button>
      </div>
    </PanelContainer>
  );
}
