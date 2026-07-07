"use client";

import React, { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react";
import { X, Check, Type, Trash2, SlidersHorizontal, Image as ImageIcon, Sparkles, Smile, AlignLeft, AlignCenter, AlignRight, Type as TypeIcon } from "lucide-react";
import html2canvas from "html2canvas";

interface StoryEditorModalProps {
  file: File;
  onClose: () => void;
  onSave: (newFile: File) => void;
}

type NodeType = "text" | "emoji";
type TextEffect = "none" | "shadow" | "neon" | "outline" | "highlight";
type TextAlign = "left" | "center" | "right";

interface CanvasNode {
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
}

const FONTS = [
  { name: "Inter", value: "Inter, sans-serif" },
  { name: "Playfair Display", value: "'Playfair Display', serif" },
  { name: "Pacifico", value: "'Pacifico', cursive" },
  { name: "Montserrat", value: "'Montserrat', sans-serif" },
  { name: "Oswald", value: "'Oswald', sans-serif" },
  { name: "Dancing Script", value: "'Dancing Script', cursive" },
  { name: "Bebas Neue", value: "'Bebas Neue', sans-serif" },
  { name: "Caveat", value: "'Caveat', cursive" },
  { name: "Righteous", value: "'Righteous', cursive" },
];

const COLORS = [
  "#FFFFFF", "#000000", "#FF3B30", "#FF9500", "#FFCC00", 
  "#4CD964", "#5AC8FA", "#007AFF", "#5856D6", "#FF2D55"
];

const PRESET_FILTERS = [
  { name: "Normal", filter: { brightness: 100, contrast: 100, saturation: 100, blur: 0, sepia: 0 } },
  { name: "Clarendon", filter: { brightness: 120, contrast: 120, saturation: 135, blur: 0, sepia: 0 } },
  { name: "Gingham", filter: { brightness: 105, contrast: 90, saturation: 100, blur: 0, sepia: 30 } },
  { name: "Moon", filter: { brightness: 110, contrast: 110, saturation: 0, blur: 0, sepia: 0 } },
  { name: "Warm", filter: { brightness: 100, contrast: 100, saturation: 120, blur: 0, sepia: 50 } },
];

export default function StoryEditorModal({ file, onClose, onSave }: StoryEditorModalProps) {
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"text" | "filters" | "emoji" | null>(null);
  const [maxZIndex, setMaxZIndex] = useState(1);

  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    sepia: 0,
  });

  // Snap guidelines
  const [snapLines, setSnapLines] = useState<{ v: boolean, h: boolean }>({ v: false, h: false });

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);
  const nodeStartRef = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Caveat:wght@400;700&family=Dancing+Script:wght@400;700&family=Inter:wght@400;700;900&family=Montserrat:wght@400;700;900&family=Oswald:wght@400;700&family=Pacifico&family=Playfair+Display:wght@400;700;900&family=Righteous&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const bringToFront = (id: string) => {
    const nextZ = maxZIndex + 1;
    setMaxZIndex(nextZ);
    updateNode(id, { zIndex: nextZ });
  };

  const handleAddText = () => {
    const nextZ = maxZIndex + 1;
    setMaxZIndex(nextZ);
    const newNode: CanvasNode = {
      id: Math.random().toString(36).substring(2, 9),
      type: "text",
      content: "Type something...",
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
      color: "#FFFFFF",
      fontFamily: FONTS[0].value,
      textAlign: "center",
      effect: "none",
      isDragging: false,
      zIndex: nextZ
    };
    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
    setActiveTab("text");
  };

  const handleAddEmoji = (emoji: string) => {
    const nextZ = maxZIndex + 1;
    setMaxZIndex(nextZ);
    const newNode: CanvasNode = {
      id: Math.random().toString(36).substring(2, 9),
      type: "emoji",
      content: emoji,
      x: 50,
      y: 50,
      scale: 2, // emojis start a bit larger
      rotation: 0,
      color: "#FFFFFF",
      isDragging: false,
      zIndex: nextZ
    };
    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
    setActiveTab("emoji");
  };

  const updateNode = (id: string, updates: Partial<CanvasNode>) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const deleteSelectedNode = () => {
    if (selectedNodeId) {
      setNodes(nodes.filter(n => n.id !== selectedNodeId));
      setSelectedNodeId(null);
    }
  };

  // Drag Logic
  const handlePointerDown = (e: ReactMouseEvent | ReactTouchEvent, id: string) => {
    e.stopPropagation();
    setSelectedNodeId(id);
    bringToFront(id);
    updateNode(id, { isDragging: true });
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    dragStartRef.current = { x: clientX, y: clientY };
    const node = nodes.find(n => n.id === id);
    if (node) {
      nodeStartRef.current = { x: node.x, y: node.y };
      if (node.type === "text") setActiveTab("text");
      if (node.type === "emoji") setActiveTab("emoji");
    }
  };

  const handlePointerMove = (e: ReactMouseEvent | ReactTouchEvent) => {
    const draggingNode = nodes.find(n => n.isDragging);
    if (!draggingNode || !dragStartRef.current || !nodeStartRef.current || !canvasRef.current) return;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const dxPercent = (dx / canvasRect.width) * 100;
    const dyPercent = (dy / canvasRect.height) * 100;
    
    let newX = nodeStartRef.current.x + dxPercent;
    let newY = nodeStartRef.current.y + dyPercent;
    
    // Snap to center
    let snapV = false;
    let snapH = false;
    if (Math.abs(newX - 50) < 2) { newX = 50; snapV = true; }
    if (Math.abs(newY - 50) < 2) { newY = 50; snapH = true; }
    
    setSnapLines({ v: snapV, h: snapH });

    updateNode(draggingNode.id, { x: newX, y: newY });
  };

  const handlePointerUp = () => {
    const draggingNode = nodes.find(n => n.isDragging);
    if (draggingNode) {
      updateNode(draggingNode.id, { isDragging: false });
    }
    setSnapLines({ v: false, h: false });
  };

  const handleSave = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    setSelectedNodeId(null);
    setActiveTab(null);
    setSnapLines({ v: false, h: false });
    
    await new Promise(res => setTimeout(res, 150));
    
    try {
      const canvas = await html2canvas(canvasRef.current, {
        useCORS: true,
        scale: 3, // Premium high res
        backgroundColor: null,
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + "_story.jpg", { type: 'image/jpeg' });
          onSave(newFile);
        } else {
          alert("Failed to export canvas.");
          setIsExporting(false);
        }
      }, 'image/jpeg', 0.98);
    } catch (err) {
      console.error(err);
      alert("Failed to render story canvas.");
      setIsExporting(false);
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const getTextEffectStyles = (effect?: TextEffect, color: string = "#FFFFFF"): React.CSSProperties => {
    if (effect === "shadow") return { textShadow: "2px 4px 10px rgba(0,0,0,0.8)" };
    if (effect === "neon") return { textShadow: `0 0 5px ${color}, 0 0 20px ${color}, 0 0 40px ${color}`, color: "#FFF" };
    if (effect === "outline") return { 
      WebkitTextStroke: `1.5px ${color}`, 
      color: "transparent", 
      textShadow: "none" 
    };
    if (effect === "highlight") return { 
      backgroundColor: color, 
      color: color === "#FFFFFF" ? "#000" : "#FFF", 
      padding: "4px 8px", 
      borderRadius: "8px", 
      boxDecorationBreak: "clone" as const,
      WebkitBoxDecorationBreak: "clone" as const
    };
    return { textShadow: "1px 1px 3px rgba(0,0,0,0.6)" }; // none has slight shadow for readability
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "#000", zIndex: 9999, display: "flex", flexDirection: "column",
      animation: "fade-in 0.2s ease"
    }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "20px 24px", zIndex: 10 }}>
        <button onClick={onClose} disabled={isExporting} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#FFF", width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)", cursor: "pointer" }}>
          <X size={20} />
        </button>
        <button onClick={handleSave} disabled={isExporting} style={{ background: "linear-gradient(to right, #ec4899, #f97316)", border: "none", color: "#FFF", padding: "0 24px", height: 40, borderRadius: 20, fontWeight: "bold", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", boxShadow: "0 4px 15px rgba(236,72,153,0.3)" }}>
          {isExporting ? "Processing..." : <><Check size={18} /> Finish</>}
        </button>
      </div>

      <div 
        style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", paddingBottom: activeTab ? 200 : 80 }}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedNodeId(null);
            setActiveTab(null);
          }
        }}
      >
        {/* Story Canvas */}
        <div 
          ref={canvasRef}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "420px",
            height: "100%",
            maxHeight: "840px",
            aspectRatio: "9/16",
            background: "#111",
            borderRadius: "24px",
            overflow: "hidden",
            boxShadow: "0 0 50px rgba(0, 0, 0, 0.8)",
            touchAction: "none"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedNodeId(null);
              setActiveTab(null);
            }
          }}
        >
          {/* Background Image with CSS Filters */}
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
          )}
          
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 15%, rgba(0,0,0,0) 80%, rgba(0,0,0,0.6) 100%)", pointerEvents: "none" }} />

          {/* Snap Guidelines */}
          {snapLines.v && !isExporting && <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "#ec4899", zIndex: 999 }} />}
          {snapLines.h && !isExporting && <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "#3b82f6", zIndex: 999 }} />}

          {/* Nodes Layer */}
          {nodes.map(node => (
            <div
              key={node.id}
              style={{
                position: "absolute",
                left: `${node.x}%`,
                top: `${node.y}%`,
                transform: `translate(-50%, -50%) scale(${node.scale}) rotate(${node.rotation}deg)`,
                cursor: node.isDragging ? "grabbing" : "grab",
                padding: "8px 12px",
                zIndex: node.zIndex,
                border: selectedNodeId === node.id && !isExporting ? "1px solid rgba(255,255,255,0.4)" : "1px solid transparent",
                borderRadius: "12px",
              }}
              onMouseDown={(e) => handlePointerDown(e, node.id)}
              onTouchStart={(e) => handlePointerDown(e, node.id)}
            >
              {node.type === "text" ? (
                <textarea
                  value={node.content}
                  onChange={(e) => updateNode(node.id, { content: e.target.value })}
                  onFocus={() => { setSelectedNodeId(node.id); setActiveTab("text"); }}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: node.effect === "highlight" ? undefined : node.color,
                    fontFamily: node.fontFamily,
                    fontSize: "32px",
                    textAlign: node.textAlign,
                    resize: "none",
                    overflow: "hidden",
                    whiteSpace: "pre-wrap",
                    lineHeight: "1.1",
                    width: "100%",
                    minWidth: "60px",
                    display: "block",
                    ...getTextEffectStyles(node.effect, node.color)
                  }}
                  ref={(el) => {
                    if (el) {
                      el.style.height = "auto";
                      el.style.height = el.scrollHeight + "px";
                      el.style.width = Math.min(el.scrollWidth + 10, 340) + "px";
                    }
                  }}
                  rows={1}
                />
              ) : (
                <div style={{ fontSize: "64px", lineHeight: 1, filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.5))" }}>
                  {node.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Bottom Navigation (Visible when no tool is deeply active, or acts as base) */}
      {!isExporting && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)",
          padding: "20px 24px 40px 24px",
          display: "flex", flexDirection: "column", gap: "20px"
        }}>

          {/* Expanded Tools Context Menus */}
          {activeTab === "text" && selectedNode && selectedNode.type === "text" && (
            <div style={{ background: "rgba(30,30,30,0.8)", backdropFilter: "blur(20px)", borderRadius: "20px", padding: "16px", display: "flex", flexDirection: "column", gap: 16, animation: "slide-up 0.3s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => updateNode(selectedNode.id, { textAlign: "left" })} style={{ background: selectedNode.textAlign === "left" ? "#fff" : "transparent", color: selectedNode.textAlign === "left" ? "#000" : "#fff", border: "none", padding: 8, borderRadius: 8, cursor: "pointer" }}><AlignLeft size={16} /></button>
                  <button onClick={() => updateNode(selectedNode.id, { textAlign: "center" })} style={{ background: selectedNode.textAlign === "center" ? "#fff" : "transparent", color: selectedNode.textAlign === "center" ? "#000" : "#fff", border: "none", padding: 8, borderRadius: 8, cursor: "pointer" }}><AlignCenter size={16} /></button>
                  <button onClick={() => updateNode(selectedNode.id, { textAlign: "right" })} style={{ background: selectedNode.textAlign === "right" ? "#fff" : "transparent", color: selectedNode.textAlign === "right" ? "#000" : "#fff", border: "none", padding: 8, borderRadius: 8, cursor: "pointer" }}><AlignRight size={16} /></button>
                </div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", maxWidth: "200px" }} className="hide-scrollbar">
                  {["none", "highlight", "neon", "outline", "shadow"].map(eff => (
                    <button key={eff} onClick={() => updateNode(selectedNode.id, { effect: eff as TextEffect })} style={{ background: selectedNode.effect === eff ? "#ec4899" : "rgba(255,255,255,0.1)", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 20, fontSize: 12, textTransform: "capitalize", cursor: "pointer", flexShrink: 0 }}>
                      {eff}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }} className="hide-scrollbar">
                {FONTS.map(f => (
                  <div key={f.value} onClick={() => updateNode(selectedNode.id, { fontFamily: f.value })} style={{ fontFamily: f.value, fontSize: 16, color: selectedNode.fontFamily === f.value ? "#ec4899" : "#fff", padding: "4px 8px", cursor: "pointer", whiteSpace: "nowrap" }}>
                    {f.name}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }} className="hide-scrollbar">
                {COLORS.map(c => (
                  <div key={c} onClick={() => updateNode(selectedNode.id, { color: c })} style={{ width: 24, height: 24, borderRadius: "50%", background: c, flexShrink: 0, cursor: "pointer", border: selectedNode.color === c ? "2px solid #fff" : "none", transform: selectedNode.color === c ? "scale(1.2)" : "scale(1)" }} />
                ))}
              </div>
            </div>
          )}

          {activeTab === "emoji" && selectedNode && selectedNode.type === "emoji" && (
            <div style={{ background: "rgba(30,30,30,0.8)", backdropFilter: "blur(20px)", borderRadius: "20px", padding: "16px", display: "flex", flexDirection: "column", gap: 16, animation: "slide-up 0.3s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: "#ccc", width: 40 }}>Size</span>
                <input type="range" min="0.5" max="5" step="0.1" value={selectedNode.scale} onChange={(e) => updateNode(selectedNode.id, { scale: parseFloat(e.target.value) })} style={{ flex: 1 }} />
              </div>
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }} className="hide-scrollbar">
                {["🔥", "❤️", "✨", "😂", "🎉", "👀", "💯", "🚀", "💀", "👍", "👑"].map(em => (
                  <div key={em} onClick={() => updateNode(selectedNode.id, { content: em })} style={{ fontSize: 28, cursor: "pointer", padding: 4, transform: selectedNode.content === em ? "scale(1.2)" : "none", transition: "transform 0.2s" }}>
                    {em}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "filters" && (
            <div style={{ background: "rgba(30,30,30,0.8)", backdropFilter: "blur(20px)", borderRadius: "20px", padding: "16px", display: "flex", flexDirection: "column", gap: 16, animation: "slide-up 0.3s ease" }}>
              <div style={{ display: "flex", gap: 12, overflowX: "auto" }} className="hide-scrollbar">
                {PRESET_FILTERS.map(pf => (
                  <div key={pf.name} onClick={() => setFilters(pf.filter)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
                    <div style={{ width: 60, height: 60, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.2)" }}>
                      <img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", filter: `brightness(${pf.filter.brightness}%) contrast(${pf.filter.contrast}%) saturate(${pf.filter.saturation}%) blur(${pf.filter.blur}px) sepia(${pf.filter.sepia}%)` }} />
                    </div>
                    <span style={{ fontSize: 10, color: "#fff" }}>{pf.name}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: "#ccc", width: 60 }}>Blur</span>
                <input type="range" min="0" max="20" value={filters.blur} onChange={(e) => setFilters({...filters, blur: parseInt(e.target.value)})} style={{ flex: 1 }} />
              </div>
            </div>
          )}

          {/* Bottom Dock */}
          <div style={{ display: "flex", justifyContent: "center", gap: "24px" }}>
            <button onClick={() => { setActiveTab("filters"); setSelectedNodeId(null); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "transparent", border: "none", color: activeTab === "filters" ? "#fff" : "rgba(255,255,255,0.5)", cursor: "pointer" }}>
              <SlidersHorizontal size={24} />
              <span style={{ fontSize: 10, fontWeight: "bold" }}>Filters</span>
            </button>
            <button onClick={handleAddText} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", marginTop: -10 }}>
                <TypeIcon size={22} />
              </div>
              <span style={{ fontSize: 10, fontWeight: "bold", color: "#fff" }}>Text</span>
            </button>
            <button onClick={() => handleAddEmoji("🔥")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "transparent", border: "none", color: activeTab === "emoji" ? "#fff" : "rgba(255,255,255,0.5)", cursor: "pointer" }}>
              <Smile size={24} />
              <span style={{ fontSize: 10, fontWeight: "bold" }}>Stickers</span>
            </button>
            
            {selectedNode && (
              <button onClick={deleteSelectedNode} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", marginLeft: "auto" }}>
                <Trash2 size={24} />
                <span style={{ fontSize: 10, fontWeight: "bold" }}>Delete</span>
              </button>
            )}
          </div>
          
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
