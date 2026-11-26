import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import worldAtlas from 'world-atlas/countries-110m.json';
import { Crosshair, Globe, HeartHandshake, Minus, Plus, RotateCcw } from 'lucide-react';
import { getScenarioBlocs } from '../data/scenarios';
import { EXCLUDED_TERRITORY_IDS, resolveAtlasNationId } from '../data/worldCatalog';
import {
  areAllied,
  areAtWar,
  getMilitaryRating,
  getRelation,
  getRelationLabel,
} from '../engine/helpers';
import { GameState, MapMode } from '../types/game';
import { FlagBanner } from './FlagBanner';

interface WorldMapProps {
  gameState: GameState;
  selectedNationId: string | null;
  mapMode: MapMode;
  onMapModeChange: (mode: MapMode) => void;
  onSelectNation: (nationId: string) => void;
}

interface MapTransform {
  x: number; // world-space horizontal pan offset (wraps modulo WORLD_W)
  y: number; // world-space vertical pan offset (clamped to poles)
  k: number; // zoom scale factor
}

interface ActiveGesture {
  startClientX: number;
  startClientY: number;
  panOriginX: number;
  panOriginY: number;
  panStartTx: number;
  panStartTy: number;
  moved: boolean;
  isPinch: boolean;
  tapNationId: string | null;
  pinchStartDist: number;
  pinchStartMidX: number;
  pinchStartMidY: number;
  pinchStartTx: number;
  pinchStartTy: number;
  pinchStartK: number;
}

const WORLD_W = 1200;
const VIEW_WIDTH = 1200;
const VIEW_HEIGHT = 640;
const MIN_ZOOM = 1.0;
const MAX_ZOOM = 7.0;
const TAP_THRESHOLD_PX = 8;
const TILE_OFFSETS = [-WORLD_W, 0, WORLD_W];
const INITIAL_TRANSFORM: MapTransform = { x: 0, y: 12, k: 1.08 };

function relationToFill(score: number): string {
  if (score >= 60) return '#059669';
  if (score >= 30) return '#10B981';
  if (score >= 10) return '#1E6B5C';
  if (score >= -15) return '#334155';
  if (score >= -45) return '#9A3412';
  if (score >= -75) return '#B91C1C';
  return '#881337';
}

function wrapHorizontalWorld(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return ((((x + WORLD_W / 2) % WORLD_W) + WORLD_W) % WORLD_W) - WORLD_W / 2;
}

export const WorldMap: React.FC<WorldMapProps> = ({
  gameState,
  selectedNationId,
  mapMode,
  onMapModeChange,
  onSelectNation,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgSurfaceRef = useRef<HTMLDivElement | null>(null);

  const [transform, setTransform] = useState<MapTransform>(INITIAL_TRANSFORM);
  const transformRef = useRef<MapTransform>(INITIAL_TRANSFORM);

  const [isDragging, setIsDragging] = useState(false);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<ActiveGesture | null>(null);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mercator projection scaled so [-180°, +180°] spans exactly WORLD_W pixels for seamless 360° tiling
  const { features, graticulePath, projection, mapBounds } = useMemo(() => {
    const topo = worldAtlas as unknown as Topology<{ countries: GeometryCollection }>;
    const fc = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry>;

    const proj = geoMercator()
      .scale(WORLD_W / (2 * Math.PI))
      .translate([WORLD_W / 2, VIEW_HEIGHT * 0.59]);

    const pathGen = geoPath(proj);

    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    const paths = fc.features
      .map((f: Feature<Geometry>) => {
        const rawName = String((f.properties as { name?: string } | null)?.name ?? '');
        const nationId = resolveAtlasNationId(f.id, rawName);
        if (EXCLUDED_TERRITORY_IDS.has(nationId)) return null;
        const d = pathGen(f) ?? '';
        if (!d) return null;
        const b = pathGen.bounds(f);
        if (Number.isFinite(b[0][1])) minY = Math.min(minY, b[0][1]);
        if (Number.isFinite(b[1][1])) maxY = Math.max(maxY, b[1][1]);
        return {
          nationId,
          rawName,
          d,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const safeMinY = Number.isFinite(minY) ? Math.max(-135, minY) : -60;
    const safeMaxY = Number.isFinite(maxY) ? Math.min(640, maxY) : 605;

    const grat = pathGen(geoGraticule10()) ?? '';
    return {
      features: paths,
      graticulePath: grat,
      projection: proj,
      mapBounds: { minY: safeMinY, maxY: safeMaxY },
    };
  }, []);

  // Measure exact SVG-unit-to-CSS-pixel ratio matching preserveAspectRatio="xMidYMid slice"
  const getSvgMetrics = useCallback(() => {
    const rect = svgSurfaceRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return {
        rect: null,
        svgPixelsPerUnit: 1,
        visibleSvgW: VIEW_WIDTH,
        visibleSvgH: VIEW_HEIGHT,
      };
    }
    const svgPixelsPerUnit = Math.max(rect.width / VIEW_WIDTH, rect.height / VIEW_HEIGHT);
    return {
      rect,
      svgPixelsPerUnit,
      visibleSvgW: rect.width / svgPixelsPerUnit,
      visibleSvgH: rect.height / svgPixelsPerUnit,
    };
  }, []);

  // Seamless 360° horizontal wrap + strict North/South pole clamp
  const normalizeTransform = useCallback(
    (x: number, y: number, k: number): MapTransform => {
      const clampedK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, k));
      const { visibleSvgH } = getSvgMetrics();
      const visibleWorldH = visibleSvgH / clampedK;

      const padY = 28;
      const topLimit = mapBounds.minY - padY;
      const bottomLimit = mapBounds.maxY + padY;
      const worldSpanY = bottomLimit - topLimit;

      let clampedY: number;
      if (visibleWorldH >= worldSpanY) {
        // Entire north-south span fits on screen: center cleanly between poles
        clampedY = VIEW_HEIGHT / 2 - (topLimit + bottomLimit) / 2;
      } else {
        const maxY = VIEW_HEIGHT / 2 - visibleWorldH / 2 - topLimit;
        const minY = VIEW_HEIGHT / 2 + visibleWorldH / 2 - bottomLimit;
        clampedY = Math.max(minY, Math.min(maxY, y));
      }

      return {
        k: clampedK,
        x: wrapHorizontalWorld(x),
        y: clampedY,
      };
    },
    [getSvgMetrics, mapBounds.minY, mapBounds.maxY]
  );

  const commitTransform = useCallback(
    (next: MapTransform) => {
      const normalized = normalizeTransform(next.x, next.y, next.k);
      transformRef.current = normalized;
      setTransform(normalized);
    },
    [normalizeTransform]
  );

  // Re-clamp on viewport resize / orientation change
  useEffect(() => {
    const onResize = () => {
      const cur = transformRef.current;
      commitTransform(cur);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [commitTransform]);

  const zoomAtPoint = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      const cur = transformRef.current;
      const nextK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cur.k * factor));
      if (nextK === cur.k) return;

      const { rect, svgPixelsPerUnit } = getSvgMetrics();
      if (rect && typeof clientX === 'number' && typeof clientY === 'number') {
        const relSvgX = (clientX - (rect.left + rect.width / 2)) / svgPixelsPerUnit;
        const relSvgY = (clientY - (rect.top + rect.height / 2)) / svgPixelsPerUnit;
        const nextX = cur.x + relSvgX * (1 / nextK - 1 / cur.k);
        const nextY = cur.y + relSvgY * (1 / nextK - 1 / cur.k);
        commitTransform({ x: nextX, y: nextY, k: nextK });
      } else {
        commitTransform({ x: cur.x, y: cur.y, k: nextK });
      }
    },
    [getSvgMetrics, commitTransform]
  );

  const resetView = useCallback(() => {
    commitTransform(INITIAL_TRANSFORM);
  }, [commitTransform]);

  const focusNation = useCallback(
    (nationId: string) => {
      const nation = gameState.nations[nationId];
      if (!nation) return;
      const coords = projection(nation.capitalCoords);
      if (!coords) return;
      const targetK = 2.4;
      commitTransform({
        x: VIEW_WIDTH / 2 - coords[0],
        y: VIEW_HEIGHT / 2 - coords[1],
        k: targetK,
      });
    },
    [gameState.nations, projection, commitTransform]
  );

  // Non-passive wheel zoom on SVG surface only
  useEffect(() => {
    const el = svgSurfaceRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.18 : 0.85;
      zoomAtPoint(factor, e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAtPoint]);

  const startPinchFromPointers = useCallback(() => {
    const pts = Array.from(activePointersRef.current.values());
    if (pts.length < 2) return;
    const [p1, p2] = pts;
    const dist = Math.max(1, Math.hypot(p1.x - p2.x, p1.y - p2.y));
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const cur = transformRef.current;

    gestureRef.current = {
      startClientX: midX,
      startClientY: midY,
      panOriginX: midX,
      panOriginY: midY,
      panStartTx: cur.x,
      panStartTy: cur.y,
      moved: true,
      isPinch: true,
      tapNationId: null,
      pinchStartDist: dist,
      pinchStartMidX: midX,
      pinchStartMidY: midY,
      pinchStartTx: cur.x,
      pinchStartTy: cur.y,
      pinchStartK: cur.k,
    };
    setIsDragging(true);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 1) {
      const targetEl = (e.target as Element | null)?.closest('[data-nation-id]');
      const tapNationId = targetEl?.getAttribute('data-nation-id') ?? null;
      const cur = transformRef.current;

      gestureRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        panOriginX: e.clientX,
        panOriginY: e.clientY,
        panStartTx: cur.x,
        panStartTy: cur.y,
        moved: false,
        isPinch: false,
        tapNationId,
        pinchStartDist: 1,
        pinchStartMidX: e.clientX,
        pinchStartMidY: e.clientY,
        pinchStartTx: cur.x,
        pinchStartTy: cur.y,
        pinchStartK: cur.k,
      };
    } else if (activePointersRef.current.size === 2) {
      startPinchFromPointers();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Update desktop hover card position
    if (e.pointerType === 'mouse') {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setPointerPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    }

    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const gesture = gestureRef.current;
    if (!gesture) return;

    const { rect, svgPixelsPerUnit } = getSvgMetrics();

    // 2-finger pinch-zoom + pan
    if (activePointersRef.current.size >= 2) {
      if (!gesture.isPinch) {
        startPinchFromPointers();
        return;
      }
      const pts = Array.from(activePointersRef.current.values());
      const [p1, p2] = pts;
      const nextDist = Math.max(1, Math.hypot(p1.x - p2.x, p1.y - p2.y));
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      const scaleRatio = nextDist / Math.max(1, gesture.pinchStartDist);
      const nextK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, gesture.pinchStartK * scaleRatio));

      if (rect) {
        const centerClientX = rect.left + rect.width / 2;
        const centerClientY = rect.top + rect.height / 2;
        const relStartSvgX = (gesture.pinchStartMidX - centerClientX) / svgPixelsPerUnit;
        const relStartSvgY = (gesture.pinchStartMidY - centerClientY) / svgPixelsPerUnit;
        const relNowSvgX = (midX - centerClientX) / svgPixelsPerUnit;
        const relNowSvgY = (midY - centerClientY) / svgPixelsPerUnit;

        const nextX =
          gesture.pinchStartTx + relNowSvgX / nextK - relStartSvgX / gesture.pinchStartK;
        const nextY =
          gesture.pinchStartTy + relNowSvgY / nextK - relStartSvgY / gesture.pinchStartK;
        commitTransform({ x: nextX, y: nextY, k: nextK });
      } else {
        commitTransform({ x: gesture.pinchStartTx, y: gesture.pinchStartTy, k: nextK });
      }
      return;
    }

    // Single-pointer drag vs tap (< 8px threshold)
    if (activePointersRef.current.size === 1) {
      const totalDx = e.clientX - gesture.startClientX;
      const totalDy = e.clientY - gesture.startClientY;

      if (!gesture.moved) {
        if (Math.hypot(totalDx, totalDy) < TAP_THRESHOLD_PX) {
          return;
        }
        // Crossed 8px threshold: transition cleanly into drag without any visual jump
        gesture.moved = true;
        gesture.panOriginX = e.clientX;
        gesture.panOriginY = e.clientY;
        gesture.panStartTx = transformRef.current.x;
        gesture.panStartTy = transformRef.current.y;
        setIsDragging(true);
        setHoveredId(null);
        try {
          svgSurfaceRef.current?.setPointerCapture(e.pointerId);
        } catch {
          // Ignore if capture is unsupported
        }
        return;
      }

      // 1:1 finger tracking: divide pointer delta by (svgPixelsPerUnit * currentZoom)
      const currentK = transformRef.current.k;
      const denom = Math.max(0.0001, svgPixelsPerUnit * currentK);
      const dx = e.clientX - gesture.panOriginX;
      const dy = e.clientY - gesture.panOriginY;

      commitTransform({
        x: gesture.panStartTx + dx / denom,
        y: gesture.panStartTy + dy / denom,
        k: currentK,
      });
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>, isCancel: boolean) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.delete(e.pointerId);

    try {
      if (svgSurfaceRef.current?.hasPointerCapture(e.pointerId)) {
        svgSurfaceRef.current.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore capture release errors
    }

    const gesture = gestureRef.current;

    // Transition smoothly from 2-finger pinch down to 1-finger pan without triggering a tap
    if (activePointersRef.current.size === 1) {
      const remaining = Array.from(activePointersRef.current.values())[0];
      const cur = transformRef.current;
      gestureRef.current = {
        startClientX: remaining.x,
        startClientY: remaining.y,
        panOriginX: remaining.x,
        panOriginY: remaining.y,
        panStartTx: cur.x,
        panStartTy: cur.y,
        moved: true,
        isPinch: false,
        tapNationId: null,
        pinchStartDist: 1,
        pinchStartMidX: remaining.x,
        pinchStartMidY: remaining.y,
        pinchStartTx: cur.x,
        pinchStartTy: cur.y,
        pinchStartK: cur.k,
      };
      return;
    }

    // All pointers lifted
    if (activePointersRef.current.size === 0) {
      const shouldSelectTap =
        !isCancel &&
        gesture !== null &&
        !gesture.moved &&
        !gesture.isPinch &&
        gesture.tapNationId !== null &&
        Boolean(gameState.nations[gesture.tapNationId]);

      const tappedId = shouldSelectTap ? gesture!.tapNationId : null;

      gestureRef.current = null;
      setIsDragging(false);

      if (tappedId) {
        onSelectNation(tappedId);
      }
    }
  };

  const warringSet = useMemo(() => {
    const set = new Set<string>();
    for (const w of gameState.wars) {
      set.add(w.attackerId);
      set.add(w.defenderId);
    }
    return set;
  }, [gameState.wars]);

  const playerWarsWithSet = useMemo(() => {
    const set = new Set<string>();
    for (const w of gameState.wars) {
      if (w.attackerId === gameState.playerId) set.add(w.defenderId);
      if (w.defenderId === gameState.playerId) set.add(w.attackerId);
    }
    return set;
  }, [gameState.wars, gameState.playerId]);

  const getNationFill = (nationId: string): string => {
    const province = gameState.nations[nationId];
    if (!province) return '#1B283C';

    const ownerId = province.ownerId;
    if (ownerId === gameState.playerId) {
      return province.id === gameState.playerId ? '#0891B2' : '#0E7490';
    }

    if (mapMode === 'relations') {
      if (areAtWar(gameState, gameState.playerId, ownerId)) return '#BE123C';
      const rel = getRelation(gameState, gameState.playerId, ownerId);
      return relationToFill(rel);
    }

    if (playerWarsWithSet.has(ownerId)) return '#BE123C';
    if (areAllied(gameState, gameState.playerId, ownerId)) return '#047857';
    if (warringSet.has(ownerId)) return '#881337';
    if (province.strictNeutral && ownerId === province.id) return '#2C4259';
    return '#263850';
  };

  const getNationStroke = (nationId: string): { stroke: string; width: number; pulsing: boolean } => {
    const province = gameState.nations[nationId];
    const scaleDiv = Math.sqrt(transform.k);
    if (!province) return { stroke: '#475569', width: 0.65 / scaleDiv, pulsing: false };

    const ownerId = province.ownerId;
    const isSelected = selectedNationId === nationId || selectedNationId === ownerId;
    const isHovered = hoveredId === nationId;

    if (isSelected) return { stroke: '#F59E0B', width: 1.65 / scaleDiv, pulsing: false };
    if (isHovered) return { stroke: '#F1F5F9', width: 1.25 / scaleDiv, pulsing: false };
    if (playerWarsWithSet.has(ownerId)) {
      return { stroke: '#FB7185', width: 1.35 / scaleDiv, pulsing: true };
    }
    if (ownerId === gameState.playerId) {
      return { stroke: '#67E8F9', width: 1.05 / scaleDiv, pulsing: false };
    }
    if (warringSet.has(ownerId)) {
      return { stroke: '#F59E0B', width: 1.0 / scaleDiv, pulsing: true };
    }
    return { stroke: '#526784', width: 0.72 / scaleDiv, pulsing: false };
  };

  // Shortest-path 360° curved conflict arrows
  const warArcs = useMemo(() => {
    return gameState.wars
      .map((war) => {
        const atk = gameState.nations[war.attackerId];
        const def = gameState.nations[war.defenderId];
        if (!atk || !def) return null;
        const p1 = projection(atk.capitalCoords);
        const p2Raw = projection(def.capitalCoords);
        if (!p1 || !p2Raw) return null;

        let targetX = p2Raw[0];
        if (targetX - p1[0] > WORLD_W / 2) targetX -= WORLD_W;
        if (targetX - p1[0] < -WORLD_W / 2) targetX += WORLD_W;
        const p2: [number, number] = [targetX, p2Raw[1]];

        const mx = (p1[0] + p2[0]) / 2;
        const my = (p1[1] + p2[1]) / 2;
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const dist = Math.hypot(dx, dy);
        const curveOffset = Math.min(85, Math.max(18, dist * 0.22));
        const cx = mx - (dy / Math.max(1, dist)) * curveOffset * 0.4;
        const cy = my - Math.abs(curveOffset);

        const involvesPlayer =
          war.attackerId === gameState.playerId || war.defenderId === gameState.playerId;

        return {
          war,
          d: `M ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`,
          p1,
          p2,
          involvesPlayer,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [gameState.wars, gameState.nations, gameState.playerId, projection]);

  const playerCapitalCoords = useMemo(() => {
    const player = gameState.nations[gameState.playerId];
    return player ? projection(player.capitalCoords) : null;
  }, [gameState.nations, gameState.playerId, projection]);

  const hoveredNation = hoveredId ? gameState.nations[hoveredId] : null;
  const hoveredOwner = hoveredNation ? gameState.nations[hoveredNation.ownerId] : null;

  // World-space transform: pan (x, y) is scaled by k around viewport center for exact 1:1 tracking
  const svgTransform = `translate(${VIEW_WIDTH / 2}, ${VIEW_HEIGHT / 2}) scale(${transform.k}) translate(${-VIEW_WIDTH / 2 + transform.x}, ${-VIEW_HEIGHT / 2 + transform.y})`;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-[#070D17]">
      {/* Isolated touch-none + select-none gesture surface ONLY on the interactive SVG container */}
      <div
        ref={svgSurfaceRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => handlePointerEnd(e, false)}
        onPointerCancel={(e) => handlePointerEnd(e, true)}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') {
            setHoveredId(null);
          }
        }}
        className={`w-full h-full touch-none select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,116,144,0.12)_0%,rgba(7,13,23,0.92)_74%)]"
        />

        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full block"
        >
          <defs>
            <marker
              id="war-arrow-player"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="5.5"
              markerHeight="5.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#FB7185" />
            </marker>
            <marker
              id="war-arrow-ai"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#F59E0B" />
            </marker>
            <pattern
              id="annexed-hatch"
              width="6"
              height="6"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
            </pattern>
          </defs>

          {/* 3 seamlessly tiled horizontal copies (-WORLD_W, 0, +WORLD_W) for continuous 360° navigation */}
          <g transform={svgTransform}>
            {TILE_OFFSETS.map((offsetX) => (
              <g key={offsetX} transform={`translate(${offsetX}, 0)`}>
                {/* Graticule grid */}
                <path
                  d={graticulePath}
                  fill="none"
                  stroke="#182A44"
                  strokeWidth={0.5 / Math.sqrt(transform.k)}
                  strokeOpacity={0.72}
                />

                {/* All Playable Countries */}
                {features.map((feat, idx) => {
                  const nation = gameState.nations[feat.nationId];
                  const isOccupied = Boolean(nation && nation.ownerId !== nation.id);
                  const fill = getNationFill(feat.nationId);
                  const { stroke, width, pulsing } = getNationStroke(feat.nationId);

                  return (
                    <g key={`${offsetX}_${feat.nationId}_${idx}`}>
                      <path
                        data-nation-id={feat.nationId}
                        d={feat.d}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={width}
                        strokeLinejoin="round"
                        className={`cursor-pointer transition-opacity duration-150 hover:brightness-125 ${
                          pulsing ? 'animate-war-border' : ''
                        }`}
                        onPointerEnter={(e) => {
                          if (e.pointerType === 'mouse' && !isDragging) {
                            setHoveredId(feat.nationId);
                          }
                        }}
                        onPointerLeave={(e) => {
                          if (e.pointerType === 'mouse' && hoveredId === feat.nationId) {
                            setHoveredId(null);
                          }
                        }}
                      />
                      {isOccupied && (
                        <path d={feat.d} fill="url(#annexed-hatch)" className="pointer-events-none" />
                      )}
                    </g>
                  );
                })}

                {/* Capital anchor for Player Nation */}
                {playerCapitalCoords && (
                  <g className="pointer-events-none">
                    <circle
                      cx={playerCapitalCoords[0]}
                      cy={playerCapitalCoords[1]}
                      r={6.4 / Math.sqrt(transform.k)}
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth={1.0 / Math.sqrt(transform.k)}
                      opacity={0.85}
                    />
                    <circle
                      cx={playerCapitalCoords[0]}
                      cy={playerCapitalCoords[1]}
                      r={3.2 / Math.sqrt(transform.k)}
                      fill="#F59E0B"
                    />
                  </g>
                )}

                {/* Animated Conflict Arrows */}
                {warArcs.map((arc) => {
                  const strokeW = (arc.involvesPlayer ? 2.1 : 1.45) / Math.sqrt(transform.k);
                  const color = arc.involvesPlayer ? '#FB7185' : '#F59E0B';
                  return (
                    <g key={`${offsetX}_${arc.war.id}`} className="pointer-events-none">
                      <path
                        d={arc.d}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeW * 2.2}
                        strokeOpacity={0.2}
                      />
                      <path
                        d={arc.d}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeW}
                        strokeDasharray="6 4"
                        className="animate-war-dash"
                        markerEnd={
                          arc.involvesPlayer ? 'url(#war-arrow-player)' : 'url(#war-arrow-ai)'
                        }
                      />
                      <circle
                        cx={arc.p1[0]}
                        cy={arc.p1[1]}
                        r={2.5 / Math.sqrt(transform.k)}
                        fill={color}
                      />
                      <circle
                        cx={arc.p2[0]}
                        cy={arc.p2[1]}
                        r={2.5 / Math.sqrt(transform.k)}
                        fill={color}
                      />
                    </g>
                  );
                })}
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* Top-Left Compact View Mode Switch (Politica / Relazioni) + Desktop Legend */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 pointer-events-auto">
        <div className="inline-flex items-center p-1 rounded-lg bg-[#0F172A]/92 backdrop-blur-md border border-slate-700/75 shadow-lg">
          <button
            type="button"
            onClick={() => onMapModeChange('political')}
            className={`min-h-[36px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mapMode === 'political'
                ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>Politica</span>
          </button>
          <button
            type="button"
            onClick={() => onMapModeChange('relations')}
            className={`min-h-[36px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mapMode === 'relations'
                ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5 shrink-0" />
            <span>Relazioni</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#0F172A]/85 backdrop-blur-md border border-slate-800/80 text-[11px] text-slate-300">
          {mapMode === 'political' ? (
            <>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#0891B2]" />
                Tuo Stato
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#047857]" />
                Alleati
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#BE123C]" />
                In Guerra
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#263850] border border-slate-500" />
                Neutrali
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#059669]" />
                Amichevoli
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#334155]" />
                Neutrali
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#9A3412]" />
                Tese
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#BE123C]" />
                Ostili / Guerra
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right-Side Compact Zoom Controls (+ / - / Centra / Reset) */}
      <div
        className={`absolute bottom-4 right-3 z-10 flex flex-col gap-1 bg-[#0F172A]/92 backdrop-blur-md border border-slate-700/75 rounded-lg p-1 shadow-lg transition-all duration-200 ${
          selectedNationId ? 'md:right-[432px]' : 'md:right-4'
        }`}
      >
        <button
          type="button"
          onClick={() => zoomAtPoint(1.32)}
          title="Ingrandisci"
          aria-label="Ingrandisci mappa"
          className="w-10 h-10 flex items-center justify-center rounded-md text-slate-200 hover:bg-slate-800 active:bg-slate-700 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => zoomAtPoint(0.76)}
          title="Riduci"
          aria-label="Riduci mappa"
          className="w-10 h-10 flex items-center justify-center rounded-md text-slate-200 hover:bg-slate-800 active:bg-slate-700 transition-colors cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div aria-hidden="true" className="h-px bg-slate-800 mx-1" />
        <button
          type="button"
          onClick={() => focusNation(gameState.playerId)}
          title="Centra sulla tua nazione"
          aria-label="Centra sulla tua nazione"
          className="w-10 h-10 flex items-center justify-center rounded-md text-cyan-300 hover:bg-slate-800 active:bg-slate-700 transition-colors cursor-pointer"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={resetView}
          title="Ripristina vista globale 360°"
          aria-label="Ripristina vista globale"
          className="w-10 h-10 flex items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 active:bg-slate-700 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Cursor-following hover intelligence card (Desktop mouse only) */}
      {hoveredNation && hoveredOwner && !isDragging && (
        <div
          style={{
            left: Math.min(
              pointerPos.x + 16,
              (containerRef.current?.clientWidth ?? 1000) - 260
            ),
            top: Math.max(12, pointerPos.y - 12),
          }}
          className="pointer-events-none hidden md:block absolute z-20 w-60 rounded-lg bg-[#0B1220]/95 backdrop-blur-md border border-slate-700/80 px-3 py-2.5 shadow-2xl"
        >
          <div className="flex items-center gap-2">
            <FlagBanner flag={hoveredNation.flag} name={hoveredNation.name} size="sm" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-100 leading-tight whitespace-normal">
                {hoveredNation.name}
              </div>
              <div className="text-[11px] text-slate-400 whitespace-normal">
                {hoveredNation.ownerId !== hoveredNation.id
                  ? `Territorio di ${hoveredOwner.name}`
                  : hoveredNation.strictNeutral
                    ? 'Stato Neutrale'
                    : getScenarioBlocs(gameState.scenarioId)[hoveredNation.bloc].shortName}
              </div>
            </div>
          </div>

          {hoveredNation.ownerId === hoveredNation.id && (
            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
              <span>
                Forza{' '}
                <strong className="font-mono-num text-cyan-300">
                  {getMilitaryRating(hoveredNation)}
                </strong>
              </span>
              {hoveredNation.id === gameState.playerId ? (
                <span className="text-amber-300 font-medium">Tuo Comando</span>
              ) : areAtWar(gameState, gameState.playerId, hoveredNation.id) ? (
                <span className="text-rose-400 font-semibold">In Guerra</span>
              ) : (
                <span className="font-mono-num">
                  {getRelationLabel(getRelation(gameState, gameState.playerId, hoveredNation.id))} (
                  {getRelation(gameState, gameState.playerId, hoveredNation.id) >= 0 ? '+' : ''}
                  {getRelation(gameState, gameState.playerId, hoveredNation.id)})
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
