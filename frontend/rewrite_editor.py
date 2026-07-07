import re

file_path = "components/StoryEditorModal.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Imports
content = content.replace('AlignRight, Type as TypeIcon } from "lucide-react";', 'AlignRight, Type as TypeIcon, PenTool, ImagePlus, Pipette } from "lucide-react";')

# 2. Update NodeType and CanvasNode
content = content.replace('type NodeType = "text" | "emoji";', 'type NodeType = "text" | "emoji" | "image";')

node_type_str = """interface CanvasNode {
  id: string;
  type: NodeType;
  content: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  color: string;
  fontFamily?: string;
  textAlign?: TextAlign;
  effect?: TextEffect;
  isDragging: boolean;
  zIndex: number;
"""
new_node_type_str = node_type_str + "  imageUrl?: string;\n"
content = content.replace(node_type_str, new_node_type_str)

# 3. Add window.EyeDropper type extension
content = """
declare global {
  interface Window {
    EyeDropper: any;
  }
}
""" + content

# 4. Add Drawing States and Refs
hooks_str = """  const [activeTab, setActiveTab] = useState<"text" | "filters" | "emoji" | null>(null);"""
new_hooks_str = """  const [activeTab, setActiveTab] = useState<"text" | "filters" | "emoji" | "draw" | null>(null);

  // Doodle Engine
  type BrushType = "pen" | "neon" | "highlighter";
  interface Stroke {
    points: {x: number, y: number}[];
    color: string;
    brush: BrushType;
    width: number;
  }
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [brushType, setBrushType] = useState<BrushType>("pen");
  const [brushColor, setBrushColor] = useState<string>("#ec4899");
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
"""
content = content.replace(hooks_str, new_hooks_str)

# 5. Eyedropper API function
eyedropper_func = """  const handleEyedropper = async () => {
    if (!window.EyeDropper) {
      alert("Your browser does not support the Eyedropper API. Try Chrome or Edge!");
      return;
    }
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      if (activeTab === "draw") {
        setBrushColor(result.sRGBHex);
      } else if (selectedNodeId) {
        updateNode(selectedNodeId, { color: result.sRGBHex });
      }
    } catch (e) {
      // canceled
    }
  };

"""
content = content.replace('  const handleAddEmoji =', eyedropper_func + '  const handleAddEmoji =')

# 6. Custom Image Add
img_add_func = """  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const imgUrl = URL.createObjectURL(e.target.files[0]);
      const nextZ = maxZIndex + 1;
      setMaxZIndex(nextZ);
      const newNode: CanvasNode = {
        id: Math.random().toString(36).substring(2, 9),
        type: "image",
        content: "",
        imageUrl: imgUrl,
        x: 50,
        y: 50,
        scale: 1,
        rotation: 0,
        color: "#FFF",
        isDragging: false,
        zIndex: nextZ
      };
      setNodes([...nodes, newNode]);
      setSelectedNodeId(newNode.id);
    }
  };

"""
content = content.replace('  const updateNode =', img_add_func + '  const updateNode =')


# 7. Add Pointer Handlers for Drawing
ptr_down = """  const handlePointerDown = (e: ReactMouseEvent | ReactTouchEvent, id: string) => {"""
new_ptr_down = """  const handleCanvasPointerDown = (e: ReactMouseEvent | ReactTouchEvent) => {
    if (activeTab !== "draw") return;
    e.stopPropagation();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    if (!drawCanvasRef.current) return;
    const rect = drawCanvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    setCurrentStroke({
      points: [{x, y}],
      color: brushColor,
      brush: brushType,
      width: brushType === "highlighter" ? 20 : 4
    });
  };

""" + ptr_down
content = content.replace(ptr_down, new_ptr_down)


ptr_move = """  const handlePointerMove = (e: ReactMouseEvent | ReactTouchEvent) => {
    const draggingNode = nodes.find(n => n.isDragging);
    if (!draggingNode || !dragStartRef.current || !nodeStartRef.current || !canvasRef.current) return;"""
    
new_ptr_move = """  const handlePointerMove = (e: ReactMouseEvent | ReactTouchEvent) => {
    if (activeTab === "draw" && currentStroke && drawCanvasRef.current) {
      let clientX, clientY;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      const rect = drawCanvasRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      setCurrentStroke({
        ...currentStroke,
        points: [...currentStroke.points, {x, y}]
      });
      return;
    }

    const draggingNode = nodes.find(n => n.isDragging);
    if (!draggingNode || !dragStartRef.current || !nodeStartRef.current || !canvasRef.current) return;"""
content = content.replace(ptr_move, new_ptr_move)

ptr_up = """  const handlePointerUp = () => {
    const draggingNode = nodes.find(n => n.isDragging);"""
new_ptr_up = """  const handlePointerUp = () => {
    if (activeTab === "draw" && currentStroke) {
      setStrokes([...strokes, currentStroke]);
      setCurrentStroke(null);
      return;
    }

    const draggingNode = nodes.find(n => n.isDragging);"""
content = content.replace(ptr_up, new_ptr_up)


# 8. Render draw strokes on canvas side-effect
draw_effect = """  useEffect(() => {
    if (!drawCanvasRef.current) return;
    const ctx = drawCanvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
    
    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
    allStrokes.forEach(stroke => {
      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = stroke.width;
      ctx.strokeStyle = stroke.brush === "highlighter" ? stroke.color + "80" : stroke.color;
      
      if (stroke.brush === "neon") {
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = 15;
      } else {
        ctx.shadowBlur = 0;
      }

      stroke.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    });
  }, [strokes, currentStroke]);

"""
content = content.replace('  const bringToFront', draw_effect + '  const bringToFront')

# 9. Blurred Background injection
blurred_bg = """          {/* Background Image with CSS Filters */}
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt="Story Background" 
              style={{ 
                width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none",
                filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) blur(${filters.blur}px) sepia(${filters.sepia}%)`,
                transition: "filter 0.3s ease"
              }}
            />
          )}"""

new_blurred_bg = """          {/* Smart Blurred Background Layer */}
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt="Blurred Background" 
              style={{ 
                position: "absolute", inset: "-10%", width: "120%", height: "120%", objectFit: "cover", pointerEvents: "none",
                filter: `blur(40px) brightness(0.6)`, zIndex: 0
              }}
            />
          )}
          {/* Main Background Image with CSS Filters */}
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt="Story Background" 
              style={{ 
                position: "absolute", inset: 0,
                width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none", zIndex: 1,
                filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) blur(${filters.blur}px) sepia(${filters.sepia}%)`,
                transition: "filter 0.3s ease"
              }}
            />
          )}"""
content = content.replace(blurred_bg, new_blurred_bg)
content = content.replace('rgba(0,0,0,0.6) 100%)", pointerEvents: "none" }} />', 'rgba(0,0,0,0.6) 100%)", pointerEvents: "none", zIndex: 2 }} />')
content = content.replace('zIndex: 999 }} />}', 'zIndex: 999 }} />}\n          {/* Draw Canvas */}\n          <canvas ref={drawCanvasRef} width={420} height={840} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 3, pointerEvents: activeTab === "draw" ? "auto" : "none" }} onMouseDown={handleCanvasPointerDown} onTouchStart={handleCanvasPointerDown} />')

# 10. Update Render for custom images
render_image = """              ) : (
                <div style={{ fontSize: "64px", lineHeight: 1, filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.5))" }}>
                  {node.content}
                </div>
              )}"""
new_render_image = """              ) : node.type === "image" ? (
                <img src={node.imageUrl} alt="Sticker" style={{ width: 150, height: "auto", display: "block", borderRadius: 12, pointerEvents: "none", filter: "drop-shadow(2px 4px 10px rgba(0,0,0,0.5))" }} />
              ) : (
                <div style={{ fontSize: "64px", lineHeight: 1, filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.5))" }}>
                  {node.content}
                </div>
              )}"""
content = content.replace(render_image, new_render_image)

# 11. Add Eyedropper button to Text Color Picker
text_color_picker = """                {COLORS.map(c => (
                  <div key={c} onClick={() => updateNode(selectedNode.id, { color: c })} style={{ width: 24, height: 24, borderRadius: "50%", background: c, flexShrink: 0, cursor: "pointer", border: selectedNode.color === c ? "2px solid #fff" : "none", transform: selectedNode.color === c ? "scale(1.2)" : "scale(1)" }} />
                ))}"""
new_text_color_picker = """                <button onClick={handleEyedropper} style={{ width: 24, height: 24, borderRadius: "50%", background: "conic-gradient(red, yellow, green, cyan, blue, magenta, red)", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  <Pipette size={12} color="#000" />
                </button>
""" + text_color_picker
content = content.replace(text_color_picker, new_text_color_picker)


# 12. Add Custom upload to Stickers Menu
sticker_menu = """              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }} className="hide-scrollbar">
                {["🔥", "❤️", "✨", "😂", "🎉", "👀", "💯", "🚀", "💀", "👍", "👑"].map(em => ("""
new_sticker_menu = """              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, alignItems: "center" }} className="hide-scrollbar">
                <button onClick={() => fileInputRef.current?.click()} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, color: "#fff" }}>
                  <ImagePlus size={20} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleCustomImageUpload} accept="image/*" style={{ display: "none" }} />
                <div style={{ width: 1, height: 30, background: "rgba(255,255,255,0.2)", margin: "0 4px" }} />
                {["🔥", "❤️", "✨", "😂", "🎉", "👀", "💯", "🚀", "💀", "👍", "👑"].map(em => ("""
content = content.replace(sticker_menu, new_sticker_menu)

# 13. Add Doodle Menu Tab
draw_menu = """          {activeTab === "draw" && (
            <div style={{ background: "rgba(30,30,30,0.8)", backdropFilter: "blur(20px)", borderRadius: "20px", padding: "16px", display: "flex", flexDirection: "column", gap: 16, animation: "slide-up 0.3s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  {["pen", "highlighter", "neon"].map(b => (
                    <button key={b} onClick={() => setBrushType(b as BrushType)} style={{ background: brushType === b ? "#ec4899" : "rgba(255,255,255,0.1)", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 20, fontSize: 12, textTransform: "capitalize", cursor: "pointer" }}>
                      {b}
                    </button>
                  ))}
                </div>
                <button onClick={() => setStrokes([])} style={{ background: "transparent", border: "1px solid #ef4444", color: "#ef4444", padding: "4px 8px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>Clear</button>
              </div>
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }} className="hide-scrollbar">
                <button onClick={handleEyedropper} style={{ width: 24, height: 24, borderRadius: "50%", background: "conic-gradient(red, yellow, green, cyan, blue, magenta, red)", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  <Pipette size={12} color="#000" />
                </button>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setBrushColor(c)} style={{ width: 24, height: 24, borderRadius: "50%", background: c, flexShrink: 0, cursor: "pointer", border: brushColor === c ? "2px solid #fff" : "none", transform: brushColor === c ? "scale(1.2)" : "scale(1)" }} />
                ))}
              </div>
            </div>
          )}"""

content = content.replace('{/* Bottom Dock */}', draw_menu + '\n\n          {/* Bottom Dock */}')

# 14. Add Draw button to Bottom Dock
dock_draw_btn = """            <button onClick={() => { setActiveTab("filters"); setSelectedNodeId(null); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "transparent", border: "none", color: activeTab === "filters" ? "#fff" : "rgba(255,255,255,0.5)", cursor: "pointer" }}>"""

new_dock_draw_btn = """            <button onClick={() => { setActiveTab("draw"); setSelectedNodeId(null); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "transparent", border: "none", color: activeTab === "draw" ? "#fff" : "rgba(255,255,255,0.5)", cursor: "pointer" }}>
              <PenTool size={24} />
              <span style={{ fontSize: 10, fontWeight: "bold" }}>Draw</span>
            </button>
""" + dock_draw_btn
content = content.replace(dock_draw_btn, new_dock_draw_btn)


with open("components/StoryEditorModal.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Rewrite complete.")
