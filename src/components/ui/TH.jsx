export default function TH({ ch }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "10px 16px",
        fontSize: 11,
        fontWeight: 700,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        borderBottom: "1px solid #f1f5f9",
        whiteSpace: "nowrap",
      }}
    >
      {ch}
    </th>
  );
}