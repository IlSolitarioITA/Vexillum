import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import worldAtlas from 'world-atlas/countries-110m.json';
import { Crosshair, Globe, HeartHandshake, Minus, Plus, RotateCcw } from 'lucide-react';
import { BLOC_META } from '../data/nations';
import { EXCLUDED_TERRITORY_IDS, resolveAtlasNationId } from '../data/worldCatalog';
import { areAllied, areAtWar, getMilitaryRating, getRelation, getRelationLabel } from '../engine/helpers';
import { GameState, MapMode } from '../types/game';
import { FlagBanner } from './FlagBanner';

interface WorldMapProps {
  gameState: GameState;
  selectedNationId: string | null;
  mapMode: MapMode;
  onMapModeChange: (mode: MapMode) => void;
  onSelectNation: (nationId: string) => void;
}

const WORLD_W = 1200;
const VIEW_WIDTH = 1200;
const VIEW_HEIGHT = 640;
const MIN_ZOOM = 1.0;
const MAX_ZOOM = 7.0;
const TILE_OFFSETS = [-WORLD_W, 0, WORLD_W];

function relationToFill(score: number): string {
  if (score >= 60) return '#059669';
  if (score >= 30) return '#10B981';
  if (score >= 10) return '#1E6B5C';
  if (score >= -15) return '#334155';
  if (score >= -45) return '#9A3412';
  if (score >= -75) return '#B91C1C';
  return '#881337';
}

function wrapHorizontal(x: number, k: number): number {
  const period = WORLD_W * k;
  if (period <= 0 || !Number.isFinite(x)) return 0;
  return ((((x + period / 2) % period) + period) % period) - period / 2;
}

export const WorldMap: React.FC<WorldMapProps> = ({
  gameState,
  selectedNationId,
  mapMode,
  onMapModeChange,
  onSelectNation,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 12, k: 1.12 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(
    null
  );
  const pinchDistRef = useRef<number | null>(null);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mercator projection scaled so [-180°, +180°] spans exactly WORLD_W pixels for seamless 360° tiling
  const { features, graticulePath, projection } = useMemo(() => {
    const topo = worldAtlas as unknown as Topology<{ countries: GeometryCollection }>;
    const fc = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry>;

    const proj = geoMercator()
      .scale(WORLD_W / (2 * Math.PI))
      .translate([WORLD_W / 2, VIEW_HEIGHT * 0.59]);

    const pathGen = geoPath(proj);

    const paths = fc.features
      .map((f: Feature<Geometry>) => {
        const rawName = String((f.properties as { name?: string } | null)?.name ?? '');
        const nationId = resolveAtlasNationId(f.id, rawName);
        if (EXCLUDED_TERRITORY_IDS.has(nationId)) return null;
        return {
          nationId,
          rawName,
          d: pathGen(f) ?? '',
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && x.d.length > 0);

    const grat = pathGen(geoGraticule10()) ?? '';
    return { features: paths, graticulePath: grat, projection: proj };
  }, []);

  // Seamless 360° horizontal wrap + comfortable vertical pole clamp
  const normalizeTransform = useCallback((x: number, y: number, k: number) => {
    const clampedK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, k));
    const maxPanY = Math.max(120, (VIEW_HEIGHT * (clampedK - 0.55)) / 2);
    return {
      k: clampedK,
      x: wrapHorizontal(x, clampedK),
      y: Math.max(-maxPanY, Math.min(maxPanY, y)),
    };
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      setTransform((prev) => {
        const nextK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.k * factor));
        const ratio = nextK / prev.k;
        return normalizeTransform(prev.x * ratio, prev.y * ratio, nextK);
      });
    },
    [normalizeTransform]
  );

  const resetView = useCallback(() => {
    setTransform({ x: 0, y: 12, k: 1.12 });
  }, []);

  const focusNation = useCallback(
    (nationId: string) => {
      const nation = gameState.nations[nationId];
      if (!nation) return;
      const coords = projection(nation.capitalCoords);
      if (!coords) return;
      const targetK = 2.4;
      const dx = (VIEW_WIDTH / 2 - coords[0]) * targetK;
      const dy = (VIEW_HEIGHT / 2 - coords[1]) * targetK;
      setTransform(normalizeTransform(dx, dy, targetK));
    },
    [gameState.nations, projection, normalizeTransform]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.18 : 0.85;
      zoomBy(factor);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      tx: transform.x,
      ty: transform.y,
      moved: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setPointerPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    const drag = dragStartRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      drag.moved = true;
    }
    const scaleFactor = rect ? VIEW_WIDTH / Math.max(1, rect.width) : 1;
    const nextX = drag.tx + dx * scaleFactor;
    const nextY = drag.ty + dy * scaleFactor;
    setTransform((prev) => normalizeTransform(nextX, nextY, prev.k));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    const currentDrag = dragStartRef.current;
    setTimeout(() => {
      if (dragStartRef.current === currentDrag) {
        dragStartRef.current = null;
      }
    }, 0);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      dragStartRef.current = {
        x: t.clientX,
        y: t.clientY,
        tx: transform.x,
        ty: transform.y,
        moved: false,
      };
      pinchDistRef.current = null;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistRef.current = Math.hypot(dx, dy);
      dragStartRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const drag = dragStartRef.current;
    if (e.touches.length === 1 && drag) {
      const t = e.touches[0];
      const dx = t.clientX - drag.x;
      const dy = t.clientY - drag.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        drag.moved = true;
      }
      const rect = containerRef.current?.getBoundingClientRect();
      const scaleFactor = rect ? VIEW_WIDTH / Math.max(1, rect.width) : 1;
      const nextX = drag.tx + dx * scaleFactor;
      const nextY = drag.ty + dy * scaleFactor;
      setTransform((prev) => normalizeTransform(nextX, nextY, prev.k));
    } else if (e.touches.length === 2 && pinchDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const nextDist = Math.hypot(dx, dy);
      const ratio = nextDist / Math.max(1, pinchDistRef.current);
      pinchDistRef.current = nextDist;
      zoomBy(ratio);
    }
  };

  const handleTouchEnd = () => {
    pinchDistRef.current = null;
    const currentDrag = dragStartRef.current;
    setTimeout(() => {
      if (dragStartRef.current === currentDrag) {
        dragStartRef.current = null;
      }
    }, 0);
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
    // Crisp high-contrast hairline border for dark neutral countries
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

        // Choose shortest horizontal wrap across 360° globe
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

  const svgTransform = `translate(${VIEW_WIDTH / 2 + transform.x}, ${VIEW_HEIGHT / 2 + transform.y}) scale(${transform.k}) translate(${-VIEW_WIDTH / 2}, ${-VIEW_HEIGHT / 2})`;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp();
        setHoveredId(null);
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full h-full overflow-hidden select-none bg-[#070D17] ${
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

        {/* 3 seamlessly tiled horizontal copies for continuous 360° navigation */}
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

              {/* All 175 Playable Countries */}
              {features.map((feat, idx) => {
                const nation = gameState.nations[feat.nationId];
                const isOccupied = Boolean(nation && nation.ownerId !== nation.id);
                const fill = getNationFill(feat.nationId);
                const { stroke, width, pulsing } = getNationStroke(feat.nationId);

                return (
                  <g key={`${offsetX}_${feat.nationId}_${idx}`}>
                    <path
                      d={feat.d}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={width}
                      strokeLinejoin="round"
                      className={`cursor-pointer transition-opacity duration-150 hover:brightness-125 ${
                        pulsing ? 'animate-war-border' : ''
                      }`}
                      onMouseEnter={() => setHoveredId(feat.nationId)}
                      onMouseLeave={() => {
                        if (hoveredId === feat.nationId) setHoveredId(null);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (dragStartRef.current?.moved) return;
                        if (nation) {
                          onSelectNation(feat.nationId);
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

      {/* Top-Left Map Mode Switch & Legend */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 pointer-events-auto">
        <div className="inline-flex items-center p-1 rounded-lg bg-[#0F172A]/92 backdrop-blur-md border border-slate-700/70 shadow-lg">
          <button
            type="button"
            onClick={() => onMapModeChange('political')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mapMode === 'political'
                ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Politica</span>
          </button>
          <button
            type="button"
            onClick={() => onMapModeChange('relations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mapMode === 'relations'
                ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Relazioni</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#0F172A]/85 backdrop-blur-md border border-slate-800/80 text-[11px] text-slate-300">
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

      {/* Bottom-Left Zoom Controls (positioned above NewsFeedBar) */}
      <div className="absolute bottom-20 sm:bottom-16 left-3 z-10 flex flex-col gap-1 bg-[#0F172A]/92 backdrop-blur-md border border-slate-700/70 rounded-lg p-1 shadow-lg">
        <button
          type="button"
          onClick={() => zoomBy(1.32)}
          title="Ingrandisci"
          aria-label="Ingrandisci mappa"
          className="w-9 h-9 flex items-center justify-center rounded-md text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(0.76)}
          title="Riduci"
          aria-label="Riduci mappa"
          className="w-9 h-9 flex items-center justify-center rounded-md text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => focusNation(gameState.playerId)}
          title="Centra sulla tua nazione"
          aria-label="Centra sulla tua nazione"
          className="w-9 h-9 flex items-center justify-center rounded-md text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={resetView}
          title="Ripristina vista globale 360°"
          aria-label="Ripristina vista globale"
          className="w-9 h-9 flex items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Cursor-following hover intelligence card (Desktop) */}
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
                  ? `Annessa da ${hoveredOwner.name}`
                  : hoveredNation.strictNeutral
                    ? 'Stato Neutrale · Non Allineato'
                    : BLOC_META[hoveredNation.bloc].shortName}
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
