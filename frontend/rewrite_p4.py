import re

file_path = "components/StoryEditorModal.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update CanvasNode type
node_type = """  textAlign?: "left" | "center" | "right";
  effect?: TextEffect;
};"""
new_node_type = """  textAlign?: "left" | "center" | "right";
  effect?: TextEffect;
  blendMode?: string;
};"""
content = content.replace(node_type, new_node_type)

# 2. Add magic eraser state and function
# We can inject this after `const fileInputRef = useRef<HTMLInputElement>(null);`
hooks_str = """  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);"""
new_hooks_str = """  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isErasingBg, setIsErasingBg] = useState(false);

  const removeBackground = async () => {
    if (!selectedNode || selectedNode.type !== "image" || !selectedNode.imageUrl) return;
    setIsErasingBg(true);
    try {
      // Fetch the object URL to a blob
      const res = await fetch(selectedNode.imageUrl);
      const blob = await res.blob();
      
      const formData = new FormData();
      formData.append("file", blob, "sticker.png");
      
      const response = await fetch("http://localhost:8002/api/editor/remove-bg", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) throw new Error("Failed to remove background");
      
      const newBlob = await response.blob();
      const newUrl = URL.createObjectURL(newBlob);
      
      updateNode(selectedNode.id, { imageUrl: newUrl });
    } catch (error) {
      console.error(error);
      alert("Magic Eraser failed.");
    } finally {
      setIsErasingBg(false);
    }
  };"""
content = content.replace(hooks_str, new_hooks_str)

# 3. Apply mixBlendMode to nodes
# The wrapper div is: 
# <div key={node.id} onPointerDown={(e) => handleNodePointerDown(e, node.id)} style={{ position: "absolute", left: node.x, top: node.y, transform: `translate(-50%, -50%) scale(${node.scale}) rotate(${node.rotation || 0}deg)`, cursor: "grab", zIndex: selectedNodeId === node.id ? 100 : 10 }}>
wrapper_str = """transform: `translate(-50%, -50%) scale(${node.scale}) rotate(${node.rotation || 0}deg)`, cursor: "grab", zIndex: selectedNodeId === node.id ? 100 : 10 }}>"""
new_wrapper_str = """transform: `translate(-50%, -50%) scale(${node.scale}) rotate(${node.rotation || 0}deg)`, mixBlendMode: (node.blendMode as any) || "normal", cursor: "grab", zIndex: selectedNodeId === node.id ? 100 : 10 }}>"""
content = content.replace(wrapper_str, new_wrapper_str)

# 4. Add UI to the Emoji/Image Menu
emoji_menu_head = """          {activeTab === "emoji" && selectedNode && (selectedNode.type === "emoji" || selectedNode.type === "image") && (
            <div style={{ background: "rgba(30,30,30,0.8)", backdropFilter: "blur(20px)", borderRadius: "20px", padding: "16px", display: "flex", flexDirection: "column", gap: 16, animation: "slide-up 0.3s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: "#ccc", width: 40 }}>Size</span>"""

new_emoji_menu_head = """          {activeTab === "emoji" && selectedNode && (selectedNode.type === "emoji" || selectedNode.type === "image") && (
            <div style={{ background: "rgba(30,30,30,0.8)", backdropFilter: "blur(20px)", borderRadius: "20px", padding: "16px", display: "flex", flexDirection: "column", gap: 12, animation: "slide-up 0.3s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8 }}>
                 <span style={{ fontSize: 12, fontWeight: "bold", color: "#fff" }}>Transform</span>
                 {selectedNode.type === "image" && (
                   <button onClick={removeBackground} disabled={isErasingBg} style={{ background: "linear-gradient(to right, #8b5cf6, #ec4899)", border: "none", color: "#fff", padding: "6px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", opacity: isErasingBg ? 0.5 : 1 }}>
                     {isErasingBg ? "Erasing..." : "✨ Magic Eraser"}
                   </button>
                 )}
              </div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto" }} className="hide-scrollbar">
                  {["normal", "multiply", "screen", "overlay", "color-dodge", "difference"].map(mode => (
                    <button key={mode} onClick={() => updateNode(selectedNode.id, { blendMode: mode })} style={{ background: (selectedNode.blendMode || "normal") === mode ? "#ec4899" : "rgba(255,255,255,0.1)", color: "#fff", border: "none", padding: "4px 10px", borderRadius: 20, fontSize: 10, textTransform: "capitalize", cursor: "pointer", flexShrink: 0 }}>
                      {mode}
                    </button>
                  ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: "#ccc", width: 40 }}>Size</span>"""
                
content = content.replace(emoji_menu_head, new_emoji_menu_head)


with open("components/StoryEditorModal.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Rewrite Phase 4 complete.")
