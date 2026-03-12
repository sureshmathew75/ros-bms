import KPI from "./ui/KPI";
import PanelContainer from "./ui/PanelContainer";
import SectionHeader from "./ui/SectionHeader";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AnalyticsPanel({ customers, fmt, MONTHLY, sales, shop, shopId, totRev }) {
  return (
    <PanelContainer gap={22}>
      <SectionHeader>Analytics — {shop.name}</SectionHeader>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
        <KPI label="Conversion Rate"  val="68%"  change="3%"  plus={true} icon="🎯" color={shop.k[0]}/>
        <KPI label="Avg Order Value"   val={fmt(shopId,Math.round(totRev/(sales.length||1)))} change="5%" plus={true} icon="💰" color={shop.k[1]}/>
        <KPI label="Repeat Customers" val="42%"  change="2%"  plus={true} icon="🔄" color={shop.k[2]}/>
        <KPI label="Revenue Growth"   val="+14%" change="MoM" plus={true} icon="📈" color={shop.k[4]}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:20}}>
        <div style={{background:"white",borderRadius:16,padding:"22px 24px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9"}}>
          <h3 style={{margin:"0 0 18px",fontSize:15,fontWeight:800,color:"#0f172a"}}>Monthly Revenue 2024</h3>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={MONTHLY}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="m" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{borderRadius:12,border:"1px solid #f1f5f9",fontSize:13}}/>
              <Bar dataKey="v" fill={shop.chartLine} radius={[7,7,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:"white",borderRadius:16,padding:"22px 24px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9"}}>
          <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800,color:"#0f172a"}}>Top Customers</h3>
          {customers.slice(0,5).map((c,i)=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:13}}>
              <span style={{fontSize:11,color:"#94a3b8",width:14,fontWeight:700}}>{i+1}</span>
              <div style={{width:28,height:28,borderRadius:"50%",background:shop.accentBg,display:"flex",alignItems:"center",justifyContent:"center",color:shop.accentText,fontWeight:900,fontSize:11,flexShrink:0}}>{c.name.charAt(0)}</div>
              <div style={{flex:1}}>
                <p style={{margin:0,fontSize:12,fontWeight:700,color:"#374151"}}>{c.name}</p>
                <div style={{height:4,background:"#f1f5f9",borderRadius:999,marginTop:4}}>
                  <div style={{height:4,background:shop.accent,borderRadius:999,width:Math.min(100,(c.purchases/12)*100)+"%"}}/>
                </div>
              </div>
              <span style={{fontSize:11,fontWeight:800,color:shop.accent}}>{c.purchases}</span>
            </div>
          ))}
        </div>
      </div>
    </PanelContainer>
  );
}
