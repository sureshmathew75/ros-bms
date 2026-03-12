import React, { useState, useEffect } from "react";

export default function ShopSelector({ onSelect }) {

  const [hov,setHov] = useState(null)
  const [cmd,setCmd] = useState(false)
  const [statHov,setStatHov] = useState(null)

  useEffect(()=>{
    const h = (e)=>{
      if(e.key === "/"){
        e.preventDefault()
        setCmd(true)
      }
      if(e.key === "Escape"){
        setCmd(false)
      }
    }

    window.addEventListener("keydown",h)
    return ()=>window.removeEventListener("keydown",h)

  },[])

  const tiles = [
    {
      label: "ROS BMS",
      sub: "Main Business System",
      color: "#7d1a4a",
      bg: "#fef0f7",
      border: "#f9c1e0"
    },
    {
      label: "Customers",
      sub: "Manage customers",
      color: "#2563eb",
      bg: "#eff6ff",
      border: "#bfdbfe"
    },
    {
      label: "Sales",
      sub: "Sales dashboard",
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0"
    }
  ]

  return (

    <main style={{padding:40}}>

      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",
        gap:20
      }}>

        {tiles.map((t,i)=>(
          <div
            key={t.label || i}
            onClick={()=>onSelect(i)}
            onMouseEnter={()=>setHov(i)}
            onMouseLeave={()=>setHov(null)}
            style={{
              cursor:"pointer",
              padding:20,
              borderRadius:16,
              background:t.bg,
              border:`1px solid ${t.border}`,
              transform: hov===i ? "translateY(-4px)" : "none",
              transition:"all .15s"
            }}
          >

            <h3 style={{
              margin:0,
              fontSize:18,
              color:t.color
            }}>
              {t.label}
            </h3>

            <p style={{
              marginTop:6,
              fontSize:13,
              color:"#64748b"
            }}>
              {t.sub}
            </p>

          </div>
        ))}

      </div>

    </main>

  )
}