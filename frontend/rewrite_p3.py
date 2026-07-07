import re

file_path = "components/StoryEditorModal.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Filters State
filters_state = """  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    sepia: 0,
  });"""
new_filters_state = """  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    sepia: 0,
    hue: 0,
    vignette: 0,
  });
  const [filterTab, setFilterTab] = useState<"presets" | "adjust">("presets");"""
content = content.replace(filters_state, new_filters_state)

# 2. Add New Preset Filters
presets = """const PRESET_FILTERS = [
  { name: "Normal", filter: { brightness: 100, contrast: 100, saturation: 100, blur: 0, sepia: 0 } },
  { name: "Clarendon", filter: { brightness: 120, contrast: 120, saturation: 135, blur: 0, sepia: 0 } },
  { name: "Gingham", filter: { brightness: 105, contrast: 90, saturation: 100, blur: 0, sepia: 30 } },
  { name: "Moon", filter: { brightness: 110, contrast: 110, saturation: 0, blur: 0, sepia: 0 } },
  { name: "Warm", filter: { brightness: 100, contrast: 100, saturation: 120, blur: 0, sepia: 50 } },
];"""

new_presets = """const PRESET_FILTERS = [
  { name: "Normal", filter: { brightness: 100, contrast: 100, saturation: 100, blur: 0, sepia: 0, hue: 0, vignette: 0 } },
  { name: "Clarendon", filter: { brightness: 120, contrast: 120, saturation: 135, blur: 0, sepia: 0, hue: 0, vignette: 0 } },
  { name: "Gingham", filter: { brightness: 105, contrast: 90, saturation: 100, blur: 0, sepia: 30, hue: 0, vignette: 0 } },
  { name: "Moon", filter: { brightness: 110, contrast: 110, saturation: 0, blur: 0, sepia: 0, hue: 0, vignette: 0 } },
  { name: "Lark", filter: { brightness: 108, contrast: 90, saturation: 110, blur: 0, sepia: 0, hue: 5, vignette: 0 } },
  { name: "Reyes", filter: { brightness: 110, contrast: 85, saturation: 75, blur: 0, sepia: 22, hue: -5, vignette: 0 } },
  { name: "Juno", filter: { brightness: 115, contrast: 115, saturation: 140, blur: 0, sepia: 15, hue: 0, vignette: 0 } },
  { name: "Slumber", filter: { brightness: 105, contrast: 105, saturation: 66, blur: 0, sepia: 35, hue: 0, vignette: 0 } },
  { name: "Crema", filter: { brightness: 100, contrast: 90, saturation: 90, blur: 0, sepia: 10, hue: -2, vignette: 0 } },
  { name: "Ludwig", filter: { brightness: 105, contrast: 105, saturation: 120, blur: 0, sepia: 10, hue: 0, vignette: 0 } },
  { name: "Aden", filter: { brightness: 115, contrast: 90, saturation: 85, blur: 0, sepia: 15, hue: -10, vignette: 0 } },
  { name: "Perpetua", filter: { brightness: 105, contrast: 110, saturation: 110, blur: 0, sepia: 0, hue: 0, vignette: 0 } },
  { name: "Cinematic", filter: { brightness: 90, contrast: 120, saturation: 80, blur: 0, sepia: 0, hue: 10, vignette: 40 } },
  { name: "Cyberpunk", filter: { brightness: 110, contrast: 130, saturation: 150, blur: 0, sepia: 0, hue: -30, vignette: 50 } },
  { name: "B&W High", filter: { brightness: 110, contrast: 140, saturation: 0, blur: 0, sepia: 0, hue: 0, vignette: 30 } },
];"""
content = content.replace(presets, new_presets)

# 3. Add Brush Width state
brush_state = """  const [brushColor, setBrushColor] = useState<string>("#ec4899");"""
new_brush_state = """  const [brushColor, setBrushColor] = useState<string>("#ec4899");
  const [brushWidth, setBrushWidth] = useState<number>(4);"""
content = content.replace(brush_state, new_brush_state)

# 4. Modify handleCanvasPointerDown to use brushWidth
handle_canvas_pd = """      brush: brushType,
      width: brushType === "highlighter" ? 20 : 4
    });"""
new_handle_canvas_pd = """      brush: brushType,
      width: brushType === "highlighter" ? brushWidth * 3 : brushWidth
    });"""
content = content.replace(handle_canvas_pd, new_handle_canvas_pd)


# 5. Fix Image Renderer to respect scale and rotation
render_img = """              ) : node.type === "image" ? (
                <img src={node.imageUrl} alt="Sticker" style={{ width: 150, height: "auto", display: "block", borderRadius: 12, pointerEvents: "none", filter: "drop-shadow(2px 4px 10px rgba(0,0,0,0.5))" }} />
              ) : ("""
new_render_img = """              ) : node.type === "image" ? (
                <img src={node.imageUrl} alt="Sticker" style={{ width: 150, height: "auto", display: "block", borderRadius: 12, pointerEvents: "none", filter: "drop-shadow(2px 4px 10px rgba(0,0,0,0.5))" }} />
              ) : ("""
# Actually, the scale and rotation is handled by the parent wrapper div:
# transform: `translate(-50%, -50%) scale(${node.scale}) rotate(${node.rotation}deg)`
# So image stickers DO have scale/rotation mathematically, we just need to expose the UI!

# 6. Unify Emoji Menu and Image Transform Menu
emoji_menu = """          {activeTab === "emoji" && selectedNode && selectedNode.type === "emoji" && ("""
new_emoji_menu = """          {activeTab === "emoji" && selectedNode && (selectedNode.type === "emoji" || selectedNode.type === "image") && ("""
content = content.replace(emoji_menu, new_emoji_menu)

emoji_menu_contents = """              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, alignItems: "center" }} className="hide-scrollbar">
                <button onClick={() => fileInputRef.current?.click()} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, color: "#fff" }}>"""

new_emoji_menu_contents = """              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: "#ccc", width: 40 }}>Rotate</span>
                <input type="range" min="-180" max="180" step="1" value={selectedNode.rotation || 0} onChange={(e) => updateNode(selectedNode.id, { rotation: parseInt(e.target.value) })} style={{ flex: 1 }} />
              </div>
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, alignItems: "center" }} className="hide-scrollbar">
                <button onClick={() => fileInputRef.current?.click()} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, color: "#fff" }}>"""
content = content.replace(emoji_menu_contents, new_emoji_menu_contents)

# 7. Replace Filters Tab completely
filters_tab_regex = r"\{activeTab === \"filters\" && \((.*?)\)\}"
new_filters_tab = """{activeTab === "filters" && (
            <div style={{ background: "rgba(30,30,30,0.8)", backdropFilter: "blur(20px)", borderRadius: "20px", padding: "16px", display: "flex", flexDirection: "column", gap: 16, animation: "slide-up 0.3s ease" }}>
              
              {/* Sub Tab Switcher */}
              <div style={{ display: "flex", justifyContent: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 12 }}>
                <button onClick={() => setFilterTab("presets")} style={{ background: filterTab === "presets" ? "#ec4899" : "transparent", color: "#fff", border: "none", padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: "bold", cursor: "pointer" }}>Presets</button>
                <button onClick={() => setFilterTab("adjust")} style={{ background: filterTab === "adjust" ? "#ec4899" : "transparent", color: "#fff", border: "none", padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: "bold", cursor: "pointer" }}>Adjust</button>
              </div>

              {filterTab === "presets" ? (
                <div style={{ display: "flex", gap: 12, overflowX: "auto" }} className="hide-scrollbar">
                  {PRESET_FILTERS.map(pf => (
                    <div key={pf.name} onClick={() => setFilters(pf.filter as any)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
                      <div style={{ width: 60, height: 60, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.2)" }}>
                        <img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", filter: `brightness(${pf.filter.brightness}%) contrast(${pf.filter.contrast}%) saturate(${pf.filter.saturation}%) blur(${pf.filter.blur}px) sepia(${pf.filter.sepia}%) hue-rotate(${pf.filter.hue}deg)` }} />
                      </div>
                      <span style={{ fontSize: 10, color: "#fff" }}>{pf.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 150, overflowY: "auto", paddingRight: 8 }} className="hide-scrollbar">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, color: "#ccc", width: 60 }}>Bright</span>
                    <input type="range" min="0" max="200" value={filters.brightness} onChange={(e) => setFilters({...filters, brightness: parseInt(e.target.value)})} style={{ flex: 1 }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, color: "#ccc", width: 60 }}>Contrast</span>
                    <input type="range" min="0" max="200" value={filters.contrast} onChange={(e) => setFilters({...filters, contrast: parseInt(e.target.value)})} style={{ flex: 1 }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, color: "#ccc", width: 60 }}>Saturate</span>
                    <input type="range" min="0" max="200" value={filters.saturation} onChange={(e) => setFilters({...filters, saturation: parseInt(e.target.value)})} style={{ flex: 1 }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, color: "#ccc", width: 60 }}>Warmth</span>
                    <input type="range" min="0" max="100" value={filters.sepia} onChange={(e) => setFilters({...filters, sepia: parseInt(e.target.value)})} style={{ flex: 1 }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, color: "#ccc", width: 60 }}>Hue</span>
                    <input type="range" min="-180" max="180" value={filters.hue} onChange={(e) => setFilters({...filters, hue: parseInt(e.target.value)})} style={{ flex: 1 }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, color: "#ccc", width: 60 }}>Blur</span>
                    <input type="range" min="0" max="20" value={filters.blur} onChange={(e) => setFilters({...filters, blur: parseInt(e.target.value)})} style={{ flex: 1 }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, color: "#ccc", width: 60 }}>Vignette</span>
                    <input type="range" min="0" max="100" value={filters.vignette} onChange={(e) => setFilters({...filters, vignette: parseInt(e.target.value)})} style={{ flex: 1 }} />
                  </div>
                </div>
              )}
            </div>
          )}"""

content = re.sub(r'\{activeTab === "filters" && \((.*?)\n          \)\}', new_filters_tab, content, flags=re.DOTALL)

# 8. Apply Hue-Rotate and Vignette to the actual background images
img_filter_str = """filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) blur(${filters.blur}px) sepia(${filters.sepia}%)`"""
new_img_filter_str = """filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) blur(${filters.blur}px) sepia(${filters.sepia}%) hue-rotate(${filters.hue}deg)`"""
content = content.replace(img_filter_str, new_img_filter_str)

# Add vignette overlay
vignette_target = """<div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 15%, rgba(0,0,0,0) 80%, rgba(0,0,0,0.6) 100%)", pointerEvents: "none", zIndex: 2 }} />"""
new_vignette = vignette_target + """\n          {filters.vignette > 0 && <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2, background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${filters.vignette / 100}) 100%)` }} />}"""
content = content.replace(vignette_target, new_vignette)


# 9. Draw Brush Width Input
draw_menu_head = """          {activeTab === "draw" && (
            <div style={{ background: "rgba(30,30,30,0.8)", backdropFilter: "blur(20px)", borderRadius: "20px", padding: "16px", display: "flex", flexDirection: "column", gap: 16, animation: "slide-up 0.3s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8 }}>"""
new_draw_menu_head = """          {activeTab === "draw" && (
            <div style={{ background: "rgba(30,30,30,0.8)", backdropFilter: "blur(20px)", borderRadius: "20px", padding: "16px", display: "flex", flexDirection: "column", gap: 16, animation: "slide-up 0.3s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#ccc" }}>Size</span>
                  <input type="range" min="1" max="20" step="1" value={brushWidth} onChange={(e) => setBrushWidth(parseInt(e.target.value))} style={{ width: 60 }} />
                </div>
                <button onClick={() => setStrokes([])} style={{ background: "transparent", border: "1px solid #ef4444", color: "#ef4444", padding: "4px 8px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>Clear</button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>"""
content = content.replace(draw_menu_head, new_draw_menu_head)

# Fix double clear button since I replaced the layout slightly
content = content.replace('                <button onClick={() => setStrokes([])} style={{ background: "transparent", border: "1px solid #ef4444", color: "#ef4444", padding: "4px 8px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>Clear</button>\\n              </div>\\n              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }} className="hide-scrollbar">', '              </div>\\n              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }} className="hide-scrollbar">')

with open("components/StoryEditorModal.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Rewrite Phase 3 complete.")
