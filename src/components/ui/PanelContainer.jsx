export default function PanelContainer({ children, gap = 20 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {children}
    </div>
  );
}