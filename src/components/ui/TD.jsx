export default function TD({ ch, c, fw, mono }) {
  return (
    <td style={{ padding: "13px 16px", fontSize: 13, color: c || "#374151", fontWeight: fw || 400, fontFamily: mono ? "DM Mono, monospace" : "inherit" }}>
      {ch}
    </td>
  );
}