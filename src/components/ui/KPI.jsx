import React from "react";

export default function KPI({label,value,icon,color}){

  const card={
    background:"#ffffff",
    borderRadius:18,
    padding:"22px",
    display:"flex",
    justifyContent:"space-between",
    alignItems:"center",
    boxShadow:"0 10px 28px rgba(0,0,0,0.06)",
    border:"1px solid #eef2f7"
  };

  const iconBox={
    width:46,
    height:46,
    borderRadius:14,
    display:"flex",
    alignItems:"center",
    justifyContent:"center",
    background:color+"22",
    color:color,
    fontSize:20
  };

  return(
    <div style={card}>
      <div>
        <div style={{fontSize:12,color:"#7a869a"}}>{label}</div>
        <div style={{fontSize:24,fontWeight:700}}>{value}</div>
      </div>

      <div style={iconBox}>{icon}</div>
    </div>
  );
}