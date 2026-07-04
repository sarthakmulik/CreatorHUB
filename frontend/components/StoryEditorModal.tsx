"use client";

import React, { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react";
import { X, Check, Type, Trash2 } from "lucide-react";
import html2canvas from "html2canvas";

interface StoryEditorModalProps {
  file: File;
  onClose: () => void;
  onSave: (newFile: File) => void;
}

interface TextNode {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  textAlign: "left" | "center" | "right";
  isDragging: boolean;
  fontWeight: string;
}

const FONTS = [
  { name: "Inter", value: "Inter, sans-serif" },
  { name: "Playfair Display", value: "'Playfair Display', serif" },
  { name: "Pacifico", value: "'Pacifico', cursive" },
  { name: "Montserrat", value: "'Montserrat', sans-serif" },
];

const COLORS = ["#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"];

export default function StoryEditorModal({ file, onClose, onSave }: StoryEditorModalProps) {
  const [nodes, setNodes] = useState<TextNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  // Dragging state
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);
  const nodeStartRef = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    // Dynamically inject Google Fonts for the canvas
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&family=Pacifico&family=Playfair+Display:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleAddText = () => {
    const newNode: TextNode = {
      id: Math.random().toString(36).substr(2, 9),
      text: "Type here...",
      x: 50, // percentage
      y: 50, // percentage
      fontSize: 24,
      color: "#FFFFFF",
      fontFamily: FONTS[0].value,
      textAlign: "center",
      isDragging: false,
      fontWeight: "bold"
    };
    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const updateNode = (id: string, updates: Partial<TextNode>) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const deleteSelectedNode = () => {
    if (selectedNodeId) {
      setNodes(nodes.filter(n => n.id !== selectedNodeId));
      setSelectedNodeId(null);
    }
  };

  // --- Drag Logic ---
  const handlePointerDown = (e: ReactMouseEvent | ReactTouchEvent, id: string) => {
    e.stopPropagation();
    setSelectedNodeId(id);
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
    
    // Convert pixel delta to percentage
    const dxPercent = (dx / canvasRect.width) * 100;
    const dyPercent = (dy / canvasRect.height) * 100;
    
    let newX = nodeStartRef.current.x + dxPercent;
    let newY = nodeStartRef.current.y + dyPercent;
    
    // Clamp to boundaries
    newX = Math.max(0, Math.min(100, newX));
    newY = Math.max(0, Math.min(100, newY));
    
    updateNode(draggingNode.id, { x: newX, y: newY });
  };

  const handlePointerUp = () => {
    const draggingNode = nodes.find(n => n.isDragging);
    if (draggingNode) {
      updateNode(draggingNode.id, { isDragging: false });
    }
  };
  // ------------------

  const handleSave = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    setSelectedNodeId(null); // Deselect to hide borders during export
    
    // Small timeout to allow React to re-render without borders
    await new Promise(res => setTimeout(res, 100));
    
    try {
      const canvas = await html2canvas(canvasRef.current, {
        useCORS: true,
        scale: 2, // High resolution
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
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error(err);
      alert("Failed to render story canvas.");
      setIsExporting(false);
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
      zIndex: 200, display: "flex", flexDirection: "column",
      animation: "fade-in 0.2s ease"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 24px", background: "rgba(0,0,0,0.5)" }}>
        <button onClick={onClose} className="btn-secondary" disabled={isExporting} style={{ background: "rgba(255,255,255,0.1)", border: "none" }}>
          <X size={18} /> Cancel
        </button>
        <button onClick={handleAddText} className="btn-secondary" disabled={isExporting} style={{ background: "rgba(255,255,255,0.1)", border: "none" }}>
          <Type size={18} /> Add Text
        </button>
        <button onClick={handleSave} className="btn-primary" disabled={isExporting}>
          {isExporting ? "Rendering..." : <><Check size={18} /> Save Story</>}
        </button>
      </div>

      <div 
        style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: "24px", overflow: "hidden" }}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedNodeId(null);
        }}
      >
        {/* Story Canvas Container */}
        <div 
          ref={canvasRef}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "400px",
            aspectRatio: "9/16",
            background: "#000",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            touchAction: "none" // Prevent scrolling while dragging
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedNodeId(null);
          }}
        >
          {/* Background Image */}
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt="Story Background" 
              style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
            />
          )}
          
          {/* Dark gradient overlay for text readability */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 80%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />

          {/* Text Nodes */}
          {nodes.map(node => (
            <div
              key={node.id}
              style={{
                position: "absolute",
                left: `${node.x}%`,
                top: `${node.y}%`,
                transform: "translate(-50%, -50%)",
                cursor: node.isDragging ? "grabbing" : "grab",
                border: selectedNodeId === node.id && !isExporting ? "2px dashed rgba(255,255,255,0.7)" : "2px dashed transparent",
                padding: "8px 12px",
                borderRadius: "8px",
                background: selectedNodeId === node.id && !isExporting ? "rgba(0,0,0,0.2)" : "transparent",
              }}
              onMouseDown={(e) => handlePointerDown(e, node.id)}
              onTouchStart={(e) => handlePointerDown(e, node.id)}
            >
              <textarea
                value={node.text}
                onChange={(e) => updateNode(node.id, { text: e.target.value })}
                onFocus={() => setSelectedNodeId(node.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: node.color,
                  fontFamily: node.fontFamily,
                  fontSize: `${node.fontSize}px`,
                  fontWeight: node.fontWeight,
                  textAlign: node.textAlign,
                  resize: "none",
                  overflow: "hidden",
                  textShadow: "1px 1px 4px rgba(0,0,0,0.8)",
                  minWidth: "50px",
                  whiteSpace: "pre-wrap",
                  lineHeight: "1.2",
                  width: "100%",
                  height: "100%",
                }}
                // Auto-resize textarea height based on content
                ref={(el) => {
                  if (el) {
                    el.style.height = "auto";
                    el.style.height = el.scrollHeight + "px";
                    el.style.width = Math.min(el.scrollWidth + 20, 300) + "px";
                  }
                }}
                rows={1}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar for Selected Node */}
      {selectedNode && !isExporting && (
        <div style={{
          position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "rgba(20, 20, 20, 0.95)", border: "1px solid rgba(255,255,255,0.1)",
          padding: "16px", borderRadius: "16px", display: "flex", gap: "24px",
          backdropFilter: "blur(10px)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          alignItems: "center"
        }}>
          {/* Font Size */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Size</label>
            <input 
              type="range" 
              min="12" max="72" 
              value={selectedNode.fontSize} 
              onChange={(e) => updateNode(selectedNode.id, { fontSize: parseInt(e.target.value) })} 
            />
          </div>

          {/* Font Family */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Font</label>
            <select 
              value={selectedNode.fontFamily}
              onChange={(e) => updateNode(selectedNode.id, { fontFamily: e.target.value })}
              style={{ background: "#000", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "4px 8px", fontSize: 12 }}
            >
              {FONTS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
            </select>
          </div>
          
          {/* Color */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Color</label>
            <div style={{ display: "flex", gap: 6 }}>
              {COLORS.map(c => (
                <div 
                  key={c}
                  onClick={() => updateNode(selectedNode.id, { color: c })}
                  style={{
                    width: 20, height: 20, borderRadius: "50%", background: c,
                    cursor: "pointer",
                    border: selectedNode.color === c ? "2px solid #fff" : "1px solid rgba(255,255,255,0.2)",
                    boxShadow: selectedNode.color === c ? "0 0 0 1px #000" : "none"
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Delete */}
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.1)", paddingLeft: 16 }}>
            <button onClick={deleteSelectedNode} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, borderRadius: 8 }} onMouseEnter={e => e.currentTarget.style.background="rgba(239, 68, 68, 0.1)"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
