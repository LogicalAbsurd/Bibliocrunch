"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  NullAssignment,
  Point3,
  Relation,
} from "@/lib/bibliocrunch";

type GeometryCanvasProps = {
  points: Point3[];
  assignments: NullAssignment[];
  selectedIndex: number;
  relations: Relation[];
  path: number[];
  nullControl: boolean;
  onSelect: (index: number) => void;
};

type ProjectedPoint = {
  index: number;
  x: number;
  y: number;
  depth: number;
  perspective: number;
};

const palette = {
  old: "#b99761",
  new: "#79a8b6",
  null: "#b083a3",
  parchment: "#eadcc0",
  selected: "#ffd58a",
  relation: "#8bc7cf",
};

export function GeometryCanvas({
  points,
  assignments,
  selectedIndex,
  relations,
  path,
  nullControl,
  onSelect,
}: GeometryCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const projectedRef = useRef<ProjectedPoint[]>([]);
  const dragRef = useRef<{
    x: number;
    y: number;
    pitch: number;
    yaw: number;
    moved: boolean;
  } | null>(null);
  const [pitch, setPitch] = useState(-0.24);
  const [yaw, setYaw] = useState(0.64);
  const [zoom, setZoom] = useState(0.92);
  const [showAxes, setShowAxes] = useState(true);

  const renderIndexes = useMemo(() => {
    const maximum = 11_000;
    const indexes = new Set<number>();
    const step = Math.max(1, Math.ceil(points.length / maximum));
    for (let index = 0; index < points.length; index += step) indexes.add(index);
    indexes.add(selectedIndex);
    path.forEach((index) => indexes.add(index));
    relations.forEach((relation) => {
      indexes.add(relation.sourceIndex);
      indexes.add(relation.targetIndex);
    });
    return Array.from(indexes).filter((index) => points[index]);
  }, [path, points, relations, selectedIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(rect.width, rect.height);
    };

    const rotate = (point: Point3) => {
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);
      const x = point.x * cosYaw + point.z * sinYaw;
      const yawDepth = -point.x * sinYaw + point.z * cosYaw;
      const y = point.y * cosPitch - yawDepth * sinPitch;
      const depth = point.y * sinPitch + yawDepth * cosPitch;
      return { x, y, depth };
    };

    const project = (point: Point3, width: number, height: number) => {
      const rotated = rotate(point);
      const perspective = 3.4 / Math.max(1.4, 3.4 + rotated.depth);
      const scale = Math.min(width, height) * 0.39 * zoom;
      return {
        x: width / 2 + rotated.x * scale * perspective,
        y: height / 2 - rotated.y * scale * perspective,
        depth: rotated.depth,
        perspective,
      };
    };

    const drawLine = (
      start: Point3,
      end: Point3,
      width: number,
      height: number,
      color: string,
      lineWidth: number,
      dash: number[] = [],
    ) => {
      const a = project(start, width, height);
      const b = project(end, width, height);
      context.save();
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.setLineDash(dash);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
      context.restore();
    };

    const drawAxes = (width: number, height: number) => {
      const axes = [
        { end: { x: 1.2, y: 0, z: 0 }, label: "X", color: "rgba(205, 169, 107, .52)" },
        { end: { x: 0, y: 1.2, z: 0 }, label: "Y", color: "rgba(234, 220, 192, .42)" },
        { end: { x: 0, y: 0, z: 1.2 }, label: "Z", color: "rgba(121, 168, 182, .48)" },
      ];
      axes.forEach((axis) => {
        drawLine({ x: 0, y: 0, z: 0 }, axis.end, width, height, axis.color, 1, [4, 5]);
        const endpoint = project(axis.end, width, height);
        context.fillStyle = axis.color;
        context.font = "600 10px ui-monospace, SFMono-Regular, monospace";
        context.fillText(axis.label, endpoint.x + 5, endpoint.y - 5);
      });
    };

    const draw = (width: number, height: number) => {
      context.clearRect(0, 0, width, height);
      const glow = context.createRadialGradient(
        width * 0.52,
        height * 0.43,
        0,
        width * 0.52,
        height * 0.43,
        Math.max(width, height) * 0.68,
      );
      glow.addColorStop(0, "rgba(50, 43, 34, .22)");
      glow.addColorStop(0.52, "rgba(13, 17, 18, .1)");
      glow.addColorStop(1, "rgba(4, 6, 7, .48)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      if (showAxes) drawAxes(width, height);

      if (path.length > 1) {
        context.save();
        context.strokeStyle = "rgba(234, 220, 192, .72)";
        context.lineWidth = 1.4;
        context.beginPath();
        path.forEach((index, order) => {
          const point = points[index];
          if (!point) return;
          const projected = project(point, width, height);
          if (order === 0) context.moveTo(projected.x, projected.y);
          else context.lineTo(projected.x, projected.y);
        });
        context.stroke();
        context.restore();
      }

      for (const relation of relations) {
        const start = points[relation.sourceIndex];
        const end = points[relation.targetIndex];
        if (start && end) {
          drawLine(start, end, width, height, "rgba(139, 199, 207, .54)", 1.1, [3, 4]);
        }
      }

      const projected = renderIndexes
        .map((index) => {
          const position = project(points[index], width, height);
          return { index, ...position };
        })
        .sort((a, b) => b.depth - a.depth);
      projectedRef.current = projected;
      const pathSet = new Set(path);
      const relationSet = new Set(relations.map((relation) => relation.targetIndex));

      for (const node of projected) {
        const assignment = assignments[node.index];
        if (!assignment) continue;
        const isSelected = node.index === selectedIndex;
        const isPath = pathSet.has(node.index);
        const isRelation = relationSet.has(node.index);
        const radius = isSelected ? 5.6 : isPath ? 3.1 : isRelation ? 3.4 : 1.15 * node.perspective;
        const color = isSelected
          ? palette.selected
          : isPath
            ? palette.parchment
            : isRelation
              ? palette.relation
              : nullControl
                ? palette.null
                : assignment.slot.testament === "Old Testament"
                  ? palette.old
                  : palette.new;
        const alpha = isSelected || isPath || isRelation ? 1 : 0.32 + node.perspective * 0.34;

        context.beginPath();
        context.arc(node.x, node.y, radius, 0, Math.PI * 2);
        context.fillStyle = color;
        context.globalAlpha = alpha;
        context.fill();
        if (isSelected) {
          context.strokeStyle = "rgba(255, 225, 172, .46)";
          context.lineWidth = 7;
          context.globalAlpha = 0.36;
          context.stroke();
        }
        context.globalAlpha = 1;
      }

      const selectedNode = projected.find((node) => node.index === selectedIndex);
      const selectedAssignment = assignments[selectedIndex];
      if (selectedNode && selectedAssignment) {
        context.font = "600 11px ui-monospace, SFMono-Regular, monospace";
        const label = selectedAssignment.source.reference;
        const widthOfLabel = context.measureText(label).width;
        const x = Math.min(width - widthOfLabel - 22, selectedNode.x + 12);
        const y = Math.max(23, selectedNode.y - 11);
        context.fillStyle = "rgba(7, 9, 10, .88)";
        context.fillRect(x - 7, y - 14, widthOfLabel + 14, 21);
        context.strokeStyle = "rgba(205, 169, 107, .38)";
        context.strokeRect(x - 7, y - 14, widthOfLabel + 14, 21);
        context.fillStyle = palette.selected;
        context.fillText(label, x, y);
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => observer.disconnect();
  }, [assignments, nullControl, path, pitch, points, relations, renderIndexes, selectedIndex, showAxes, yaw, zoom]);

  const selectNearest = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best: { index: number; distance: number } | null = null;
    for (const node of projectedRef.current) {
      const distance = Math.hypot(node.x - x, node.y - y);
      if (distance <= 11 && (!best || distance < best.distance)) {
        best = { index: node.index, distance };
      }
    }
    if (best) onSelect(best.index);
  };

  const resetView = () => {
    setPitch(-0.24);
    setYaw(0.64);
    setZoom(0.92);
  };

  return (
    <div className="geometry-stage">
      <canvas
        ref={canvasRef}
        className="geometry-canvas"
        tabIndex={0}
        aria-label="Interactive three-dimensional plot of numerically folded Bible verses. Drag to rotate, scroll to zoom, and select points."
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = { x: event.clientX, y: event.clientY, pitch, yaw, moved: false };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag) return;
          const deltaX = event.clientX - drag.x;
          const deltaY = event.clientY - drag.y;
          if (Math.hypot(deltaX, deltaY) > 3) drag.moved = true;
          setYaw(drag.yaw + deltaX * 0.008);
          setPitch(Math.max(-1.45, Math.min(1.45, drag.pitch + deltaY * 0.008)));
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (drag && !drag.moved) selectNearest(event.clientX, event.clientY);
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
        onWheel={(event) => {
          event.preventDefault();
          setZoom((current) => Math.max(0.42, Math.min(2.4, current * Math.exp(-event.deltaY * 0.001))));
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") setYaw((value) => value - 0.08);
          if (event.key === "ArrowRight") setYaw((value) => value + 0.08);
          if (event.key === "ArrowUp") setPitch((value) => Math.max(-1.45, value - 0.08));
          if (event.key === "ArrowDown") setPitch((value) => Math.min(1.45, value + 0.08));
          if (event.key === "+" || event.key === "=") setZoom((value) => Math.min(2.4, value * 1.08));
          if (event.key === "-") setZoom((value) => Math.max(0.42, value / 1.08));
          if (event.key === "0") resetView();
        }}
      />
      <div className="canvas-toolbar" aria-label="Geometry view controls">
        <button type="button" onClick={resetView}>Reset view</button>
        <button type="button" aria-pressed={showAxes} onClick={() => setShowAxes((value) => !value)}>
          {showAxes ? "Hide axes" : "Show axes"}
        </button>
      </div>
      <div className="canvas-legend" aria-hidden="true">
        <span><i className="legend-dot old" /> Old Testament</span>
        <span><i className="legend-dot new" /> New Testament</span>
        {nullControl && <span><i className="legend-dot null" /> Shuffled identity</span>}
      </div>
      <p className="canvas-hint">Drag to rotate · wheel to zoom · click a point to inspect</p>
    </div>
  );
}
