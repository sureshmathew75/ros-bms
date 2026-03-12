export default function TD({ ch, mono, fw, c }) {
  return (
    <td
      style={{
        padding: "13px 16px",
        fontSize: 13,
        color: c || "#374151",
        fontFamily: mono ? "DM Mono,monospace" : "inherit",
        fontWeight: fw || 400,
      }}
    >
      {ch}
    </td>
  );
}