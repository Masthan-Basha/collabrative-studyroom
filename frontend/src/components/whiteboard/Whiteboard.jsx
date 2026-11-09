import { useEffect, useRef, useState, useCallback } from "react";
import { fabric } from "fabric";
import {
  MousePointer, Pen, Eraser, Minus, Square, Circle,
  Type, Undo2, Redo2, Trash2, RotateCcw, Download
} from "lucide-react";

const COLORS = [
  "#ffffff", "#f87171", "#fb923c", "#facc15", "#4ade80",
  "#34d399", "#38bdf8", "#818cf8", "#e879f9", "#f472b6",
  "#000000", "#6b7280",
];

const TOOLS = [
  { id: "select",  Icon: MousePointer, label: "Select" },
  { id: "pen",     Icon: Pen,          label: "Pen" },
  { id: "eraser",  Icon: Eraser,       label: "Eraser" },
  { id: "line",    Icon: Minus,        label: "Line" },
  { id: "rect",    Icon: Square,       label: "Rectangle" },
  { id: "circle",  Icon: Circle,       label: "Circle" },
  { id: "text",    Icon: Type,         label: "Text" },
];

export default function Whiteboard({ roomId, socket }) {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const isDrawingShape = useRef(false);
  const shapeOrigin = useRef({ x: 0, y: 0 });
  const activeShape = useRef(null);

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(4);
  const [history, setHistory] = useState([]);

  // ── Init Fabric ──────────────────────────────────────────
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const parent = el.parentElement;

    const canvas = new fabric.Canvas(el, {
      width: parent?.clientWidth || 900,
      height: parent?.clientHeight || 560,
      backgroundColor: "#1e1e2e",
      selection: false,
    });
    fabricRef.current = canvas;

    const handleResize = () => {
      const p = canvasRef.current?.parentElement;
      if (!p) return;
      canvas.setWidth(p.clientWidth);
      canvas.setHeight(p.clientHeight);
      canvas.renderAll();
    };
    window.addEventListener("resize", handleResize);

    // Socket events
    if (socket) {
      socket.on("whiteboard:delta", (delta) => {
        fabric.util.enlivenObjects([delta], ([obj]) => {
          if (!obj) return;
          canvas.add(obj);
          canvas.renderAll();
        });
      });
      socket.on("whiteboard:clear", () => {
        canvas.clear();
        canvas.backgroundColor = "#1e1e2e";
        canvas.renderAll();
      });
      socket.on("whiteboard:state", (objects) => {
        canvas.clear();
        canvas.backgroundColor = "#1e1e2e";
        if (!objects?.length) return;
        fabric.util.enlivenObjects(objects, (objs) => {
          objs.forEach((o) => canvas.add(o));
          canvas.renderAll();
        });
      });
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.dispose();
    };
  }, [socket]);

  // ── Tool / color / size changes ──────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.off("mouse:down");
    canvas.off("mouse:move");
    canvas.off("mouse:up");
    canvas.off("path:created");
    canvas.getObjects().forEach((o) => o.set({ selectable: false, evented: false }));

    if (tool === "select") {
      canvas.selection = true;
      canvas.getObjects().forEach((o) => o.set({ selectable: true, evented: true }));
      canvas.renderAll();
      return;
    }

    if (tool === "pen") {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = brushSize;
      canvas.on("path:created", (e) => emitDelta(e.path));
      return;
    }

    if (tool === "eraser") {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = "#1e1e2e";
      canvas.freeDrawingBrush.width = brushSize * 5;
      return;
    }

    if (tool === "text") {
      canvas.on("mouse:down", (opt) => {
        const pointer = canvas.getPointer(opt.e);
        const text = new fabric.IText("Type here...", {
          left: pointer.x,
          top: pointer.y,
          fill: color,
          fontSize: Math.max(16, brushSize * 4),
          fontFamily: "monospace",
          selectable: true,
          evented: true,
          editable: true,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        canvas.renderAll();
        text.on("editing:exited", () => emitDelta(text));
      });
      return;
    }

    // Shape tools
    canvas.on("mouse:down", (opt) => {
      isDrawingShape.current = true;
      const p = canvas.getPointer(opt.e);
      shapeOrigin.current = p;

      if (tool === "line") {
        activeShape.current = new fabric.Line([p.x, p.y, p.x, p.y], {
          stroke: color, strokeWidth: brushSize,
          selectable: false, evented: false,
        });
      } else if (tool === "rect") {
        activeShape.current = new fabric.Rect({
          left: p.x, top: p.y, width: 1, height: 1,
          fill: "transparent", stroke: color, strokeWidth: brushSize,
          selectable: false, evented: false,
        });
      } else if (tool === "circle") {
        activeShape.current = new fabric.Ellipse({
          left: p.x, top: p.y, rx: 1, ry: 1,
          fill: "transparent", stroke: color, strokeWidth: brushSize,
          selectable: false, evented: false,
        });
      }
      if (activeShape.current) canvas.add(activeShape.current);
    });

    canvas.on("mouse:move", (opt) => {
      if (!isDrawingShape.current || !activeShape.current) return;
      const p = canvas.getPointer(opt.e);
      const o = shapeOrigin.current;

      if (tool === "line") {
        activeShape.current.set({ x2: p.x, y2: p.y });
      } else if (tool === "rect") {
        activeShape.current.set({
          left: Math.min(p.x, o.x), top: Math.min(p.y, o.y),
          width: Math.abs(p.x - o.x), height: Math.abs(p.y - o.y),
        });
      } else if (tool === "circle") {
        activeShape.current.set({
          left: Math.min(p.x, o.x), top: Math.min(p.y, o.y),
          rx: Math.abs(p.x - o.x) / 2, ry: Math.abs(p.y - o.y) / 2,
        });
      }
      canvas.renderAll();
    });

    canvas.on("mouse:up", () => {
      if (!isDrawingShape.current || !activeShape.current) return;
      isDrawingShape.current = false;
      emitDelta(activeShape.current);
      activeShape.current = null;
    });
  }, [tool, color, brushSize]);

  const emitDelta = useCallback((obj) => {
    if (!socket || !obj) return;
    socket.emit("whiteboard:delta", { roomId, delta: obj.toObject() });
  }, [socket, roomId]);

  const deleteSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    active.forEach((o) => canvas.remove(o));
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  const clearAll = () => {
    const canvas = fabricRef.current;
    canvas.clear();
    canvas.backgroundColor = "#1e1e2e";
    canvas.renderAll();
    socket?.emit("whiteboard:clear", { roomId });
  };

  const undo = () => {
    const canvas = fabricRef.current;
    const objs = canvas.getObjects();
    if (!objs.length) return;
    setHistory((h) => [...h, objs[objs.length - 1]]);
    canvas.remove(objs[objs.length - 1]);
    canvas.renderAll();
  };

  const redo = () => {
    const canvas = fabricRef.current;
    if (!history.length) return;
    const obj = history[history.length - 1];
    canvas.add(obj);
    setHistory((h) => h.slice(0, -1));
    canvas.renderAll();
  };

  const downloadCanvas = () => {
    const url = fabricRef.current.toDataURL({ format: "png", multiplier: 2 });
    const a = document.createElement("a");
    a.href = url;
    a.download = `whiteboard-${roomId}.png`;
    a.click();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#13131f" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
        background: "#1a1a2e", borderBottom: "1px solid #2d2d4e", flexWrap: "wrap",
      }}>
        {/* Tool buttons */}
        <div style={{ display: "flex", gap: 4 }}>
          {TOOLS.map((t) => {
            const Icon = t.Icon;
            return (
              <button key={t.id} title={t.label} onClick={() => setTool(t.id)}
                style={{
                  width: 34, height: 34, borderRadius: 8, border: "none", cursor: "pointer",
                  background: tool === t.id ? "#7c6af7" : "#1e1e30",
                  color: tool === t.id ? "#fff" : "#9090b0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                }}>
                <Icon style={{ width: 16, height: 16 }} />
              </button>
            );
          })}
        </div>

        <div style={{ width: 1, height: 28, background: "#2a2a44", margin: "0 4px" }} />

        {/* Color swatches */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 210 }}>
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)}
              style={{
                width: 20, height: 20, borderRadius: "50%",
                border: color === c ? "2px solid #fff" : "2px solid transparent",
                background: c, cursor: "pointer", padding: 0,
              }} />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
            title="Custom color"
            style={{ width: 20, height: 20, borderRadius: "50%", border: "1px solid #4b5563", cursor: "pointer", padding: 0 }} />
        </div>

        <div style={{ width: 1, height: 28, background: "#2a2a44", margin: "0 4px" }} />

        {/* Brush size */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#6b6b8a", fontSize: 11, fontWeight: 600 }}>Size</span>
          <input type="range" min={1} max={20} value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            style={{ width: 70, accentColor: "#7c6af7" }} />
          <span style={{ color: "#e2e8f0", fontSize: 11, minWidth: 16, fontFamily: "monospace" }}>{brushSize}</span>
        </div>

        <div style={{ width: 1, height: 28, background: "#2a2a44", margin: "0 4px" }} />

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={undo} title="Undo" style={actionBtnStyle}>
            <Undo2 style={{ width: 13, height: 13 }} /> Undo
          </button>
          <button onClick={redo} title="Redo" style={actionBtnStyle}>
            <Redo2 style={{ width: 13, height: 13 }} /> Redo
          </button>
          <button onClick={deleteSelected} title="Delete selected" style={actionBtnStyle}>
            <Trash2 style={{ width: 13, height: 13 }} /> Delete
          </button>
          <button onClick={clearAll} title="Clear board" style={actionBtnStyle}>
            <RotateCcw style={{ width: 13, height: 13 }} /> Clear
          </button>
          <button onClick={downloadCanvas} title="Export image" style={{ ...actionBtnStyle, background: "#7c6af7", color: "#fff", border: "none" }}>
            <Download style={{ width: 13, height: 13 }} /> Export
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <canvas ref={canvasRef} />
      </div>

      {/* Status bar */}
      <div style={{
        padding: "4px 12px", background: "#1a1a2e", borderTop: "1px solid #2d2d4e",
        display: "flex", gap: 16, fontSize: 11, color: "#6b7280",
      }}>
        <span>Tool: <b style={{ color: "#a5b4fc" }}>{TOOLS.find((t) => t.id === tool)?.label}</b></span>
        <span>Color: <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: color, border: "1px solid #fff", verticalAlign: "middle" }} /></span>
        <span>Size: <b style={{ color: "#a5b4fc" }}>{brushSize}</b></span>
        <span style={{ marginLeft: "auto" }}>Select tool → click object → Delete btn to remove</span>
      </div>
    </div>
  );
}

const actionBtnStyle = {
  display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px",
  borderRadius: 8, border: "1px solid #2a2a44", cursor: "pointer",
  background: "#1e1e30", color: "#9090b0", fontSize: 11, fontWeight: 500,
  fontFamily: "inherit",
};