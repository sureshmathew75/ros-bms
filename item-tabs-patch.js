// ============================================================
// PATCH: Item Name Quick-Pick Tabs in New Sale popup
// Append this block to your existing patch.js
// Run: node patch.js   (after your existing patches run)
// ============================================================

const fs = require('fs');
const path = require('path');

const APP_PATH = path.join(__dirname, 'src', 'App.jsx');

let src = fs.readFileSync(APP_PATH, 'utf8');

// ─────────────────────────────────────────────────────────────
// PATCH A: Add ItemNameTabs component before the App function
// (insert just before "function App(" or "const App =")
// ─────────────────────────────────────────────────────────────

const ITEM_TABS_COMPONENT = `
// ── ItemNameTabs ─────────────────────────────────────────────
// Quick-pick item name tabs for New Sale popup.
// Sources: localStorage saved list + names from past sales.
function ItemNameTabs({ sales = [], currentShop, onSelectName }) {
  const storageKey = \`ros_item_tabs_\${currentShop || 'default'}\`;

  const [savedNames, setSavedNames] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch { return []; }
  });

  const [managing, setManaging] = React.useState(false);
  const [newName, setNewName] = React.useState('');

  // Derive unique names from past sales for this shop
  const historyNames = React.useMemo(() => {
    const names = new Set();
    (sales || []).forEach(sale => {
      (sale.items || []).forEach(item => {
        const n = (item.name || '').trim();
        if (n) names.add(n);
      });
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [sales]);

  // Merge: saved list first, then history names not already saved
  const allTabs = React.useMemo(() => {
    const saved = savedNames.map(n => ({ name: n, source: 'saved' }));
    const hist = historyNames
      .filter(n => !savedNames.includes(n))
      .map(n => ({ name: n, source: 'history' }));
    return [...saved, ...hist];
  }, [savedNames, historyNames]);

  const persistSaved = (names) => {
    setSavedNames(names);
    localStorage.setItem(storageKey, JSON.stringify(names));
  };

  const addSavedName = () => {
    const n = newName.trim();
    if (n && !savedNames.includes(n)) {
      persistSaved([...savedNames, n]);
    }
    setNewName('');
  };

  const removeSavedName = (name) => {
    persistSaved(savedNames.filter(n => n !== name));
  };

  const pinFromHistory = (name) => {
    if (!savedNames.includes(name)) {
      persistSaved([...savedNames, name]);
    }
  };

  if (allTabs.length === 0 && !managing) {
    return (
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#888' }}>No item tabs yet.</span>
        <button
          type="button"
          onClick={() => setManaging(true)}
          style={manageButtonStyle}
        >✏️ Add Tabs</button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 10 }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6,
        alignItems: 'center', marginBottom: managing ? 8 : 0
      }}>
        {allTabs.map(({ name, source }) => (
          <button
            key={name}
            type="button"
            title={source === 'history' ? 'From past sales — click ★ to pin' : 'Saved tab'}
            onClick={() => onSelectName(name)}
            style={{
              ...tabButtonStyle,
              background: source === 'saved' ? '#e8f5e9' : '#f5f5f5',
              borderColor: source === 'saved' ? '#43a047' : '#ccc',
              color: source === 'saved' ? '#2e7d32' : '#444',
            }}
          >
            {name}
            {source === 'history' && (
              <span
                title="Pin to saved list"
                onClick={(e) => { e.stopPropagation(); pinFromHistory(name); }}
                style={{ marginLeft: 4, cursor: 'pointer', color: '#aaa', fontSize: 11 }}
              >★</span>
            )}
            {source === 'saved' && (
              <span
                title="Remove tab"
                onClick={(e) => { e.stopPropagation(); removeSavedName(name); }}
                style={{ marginLeft: 4, cursor: 'pointer', color: '#c62828', fontSize: 11 }}
              >✕</span>
            )}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setManaging(m => !m)}
          style={manageButtonStyle}
          title="Manage saved tabs"
        >{managing ? '✕ Close' : '✏️ Manage'}</button>
      </div>

      {/* Manage panel */}
      {managing && (
        <div style={{
          background: '#f9f9f9', border: '1px solid #e0e0e0',
          borderRadius: 6, padding: '8px 10px',
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: 12, color: '#555' }}>Add tab:</span>
          <input
            type="text"
            placeholder="Item name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSavedName()}
            style={{
              fontSize: 13, padding: '3px 8px',
              border: '1px solid #ccc', borderRadius: 4,
              width: 160, outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={addSavedName}
            style={{
              fontSize: 12, padding: '3px 10px',
              background: '#43a047', color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer'
            }}
          >+ Add</button>
          <span style={{ fontSize: 11, color: '#888' }}>
            Green = saved · Grey = from past sales (click ★ to pin)
          </span>
        </div>
      )}
    </div>
  );
}

const tabButtonStyle = {
  fontSize: 12,
  padding: '4px 10px',
  border: '1px solid #ccc',
  borderRadius: 20,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
  transition: 'opacity 0.15s',
};

const manageButtonStyle = {
  fontSize: 11,
  padding: '3px 8px',
  background: 'transparent',
  border: '1px dashed #aaa',
  borderRadius: 20,
  cursor: 'pointer',
  color: '#666',
};
// ── End ItemNameTabs ──────────────────────────────────────────
`;

// Only add the component if not already patched
if (!src.includes('function ItemNameTabs(')) {
  // Insert before "function App(" or "const App ="
  const appFnMatch = src.match(/\n(function App\s*\(|const App\s*=)/);
  if (!appFnMatch) {
    console.error('❌ Could not find App function — patch A skipped.');
  } else {
    const insertAt = src.indexOf(appFnMatch[0]);
    src = src.slice(0, insertAt) + '\n' + ITEM_TABS_COMPONENT + src.slice(insertAt);
    console.log('✅ Patch A: ItemNameTabs component inserted.');
  }
} else {
  console.log('⏭️  Patch A: ItemNameTabs already present, skipping.');
}

// ─────────────────────────────────────────────────────────────
// PATCH B: Wire <ItemNameTabs> into the New Sale items section
//
// Strategy: find the ITEMS section label in the New Sale JSX
// and insert the tabs bar + item name setter logic above the rows.
//
// We look for the unique marker:  {/* ITEMS section */}
// OR the section header element that contains "ITEMS".
//
// IMPORTANT: You must add a ref/callback so clicking a tab fills
// the correct item row's name field.
//
// We patch the "items" state setter to expose a helper, and
// insert the <ItemNameTabs> just above the item rows render.
// ─────────────────────────────────────────────────────────────

// We need to inject a focusedItemIndex tracker and the tab
// component render. We look for the JSX block that renders
// the ITEMS section header — a reliable unique string.

// Marker 1: The section heading JSX — adjust if yours differs
const ITEMS_SECTION_MARKER = `<span>ITEMS</span>`;

// What we insert right AFTER the ITEMS heading block,
// before the item rows map/render.
// We wrap it so it only renders inside the New Sale modal.
// The onSelectName callback sets the name on the last/focused item row.

const TABS_JSX_INSERT = `
              {/* ── Item Name Quick-Pick Tabs (auto-patched) ── */}
              <ItemNameTabs
                sales={sales}
                currentShop={currentShop}
                onSelectName={(name) => {
                  setNewSale(prev => {
                    const items = [...(prev.items || [{ name: '', qty: 1, price: '' }])];
                    // Fill the last empty item name, or the focused one
                    const targetIdx =
                      typeof window.__rosItemTabFocusIdx === 'number'
                        ? window.__rosItemTabFocusIdx
                        : items.length - 1;
                    items[targetIdx] = { ...items[targetIdx], name };
                    return { ...prev, items };
                  });
                }}
              />
              {/* ── End Item Name Quick-Pick Tabs ── */}`;

if (!src.includes('Item Name Quick-Pick Tabs (auto-patched)')) {
  if (!src.includes(ITEMS_SECTION_MARKER)) {
    console.warn('⚠️  Patch B: Could not find ITEMS section marker in JSX.');
    console.warn('   Please manually insert <ItemNameTabs> above your item rows.');
    console.warn('   See item-tabs-patch.js for the JSX block to insert.');
  } else {
    // Find the marker and insert after its enclosing line
    const markerIdx = src.indexOf(ITEMS_SECTION_MARKER);
    // Walk forward to end of that JSX block's line
    const lineEnd = src.indexOf('\n', markerIdx);
    // Insert after the items section heading div — find the closing tag of that header row
    // We look for the next </div> after the marker
    const closingDiv = src.indexOf('</div>', markerIdx);
    if (closingDiv === -1) {
      console.warn('⚠️  Patch B: Could not find closing </div> after ITEMS marker. Manual insertion needed.');
    } else {
      const insertAt = closingDiv + '</div>'.length;
      src = src.slice(0, insertAt) + '\n' + TABS_JSX_INSERT + src.slice(insertAt);
      console.log('✅ Patch B: <ItemNameTabs> inserted into New Sale ITEMS section.');
    }
  }
} else {
  console.log('⏭️  Patch B: ItemNameTabs JSX already present, skipping.');
}

// ─────────────────────────────────────────────────────────────
// PATCH C: Track which item row input is focused
// so clicking a tab fills the RIGHT row's name field.
//
// We look for the item name <input> in the New Sale form and
// add onFocus to set window.__rosItemTabFocusIdx = idx
// ─────────────────────────────────────────────────────────────

// Marker: the item name input. Adjust the value= prop name if yours differs.
// We look for a pattern like: value={item.name}  inside a map over items.
const ITEM_NAME_INPUT_MARKER = `value={item.name}`;
const FOCUS_ATTR = `onFocus={() => { window.__rosItemTabFocusIdx = idx; }}`;

if (!src.includes('__rosItemTabFocusIdx')) {
  // Find value={item.name} — there may be multiple; we patch the first (New Sale form)
  const idx = src.indexOf(ITEM_NAME_INPUT_MARKER);
  if (idx === -1) {
    console.warn('⚠️  Patch C: Could not find item name input (value={item.name}). Manual focus tracking needed.');
  } else {
    // Insert onFocus after the value prop — find end of that attribute
    const insertAt = idx + ITEM_NAME_INPUT_MARKER.length;
    src = src.slice(0, insertAt) + '\n                    ' + FOCUS_ATTR + src.slice(insertAt);
    console.log('✅ Patch C: onFocus index tracker added to item name input.');
  }
} else {
  console.log('⏭️  Patch C: Focus tracker already present, skipping.');
}

// ─────────────────────────────────────────────────────────────
// Write patched file
// ─────────────────────────────────────────────────────────────
fs.writeFileSync(APP_PATH, src, 'utf8');
console.log('\n🎉 Item tabs patch complete. Run: git add -A && git push origin main\n');
