import { useEffect, useRef } from 'react';
import { findCountry } from '../../data/countries';
import type { RoadPathData } from '../../data/roadsMeta';
import type { CountryData } from '../../types/geo';
import type { L2SubdivisionDetail, LODLevel, MunicipalityDetail } from '../../types/lod';
import {
  toL2Detail,
  type ActiveL3ParentInfo,
  type CountryPathData,
  type L2SubdivisionPathData,
  type L3SubdivisionPathData,
  type RoadBundle
} from '../types';

export interface UseKeyboardNavParams {
  deterministicCountries: CountryPathData[];
  getTransform: () => { k: number; x: number; y: number };
  setTransformXY: (x: number, y: number) => void;
  getViewport: () => { w: number; h: number };
  getMousePos: () => { x: number; y: number };
  getLodLevel: () => LODLevel;
  getSelectedRoad: () => RoadPathData | null;
  setSelectedRoadRef: (road: RoadPathData | null) => void;
  getSelectedMunicipality: () => MunicipalityDetail | null;
  setSelectedMunicipalityRef: (muni: MunicipalityDetail | null) => void;
  getSelectedL2Subdivision: () => { iso2: string; id: number | string } | null;
  setSelectedL2SubdivisionRef: (sub: { iso2: string; id: number | string } | null) => void;
  getSelectedCountry: () => CountryData | null;
  setSelectedCountryRef: (country: CountryData | null) => void;
  getActiveL3Parent: () => ActiveL3ParentInfo | null;
  setActiveL3Parent: (parent: ActiveL3ParentInfo | null) => void;
  getRoadBundles: () => Map<string, RoadBundle>;
  getL2PathsForCountry: (iso2: string) => L2SubdivisionPathData[];
  getL3SubdivisionsForParent: (
    iso2: string,
    name?: string,
    code?: string,
    id?: string | number
  ) => L3SubdivisionPathData[];
  loadL3PackForSubdivision: (iso2: string, code?: string, name?: string, id?: string | number) => void;
  onSelectCountry: (country: CountryData | null, options?: { focus?: boolean }) => void;
  onSelectSubdivision?: (sub: L2SubdivisionDetail | null, options?: { focus?: boolean }) => void;
  onSelectMunicipality?: (muni: MunicipalityDetail | null, options?: { focus?: boolean }) => void;
  onSelectRoad?: (road: RoadPathData | null, options?: { focus?: boolean }) => void;
  wrapX: (rawX: number, k: number) => number;
  clampY: (rawY: number, k: number, vh: number) => number;
  animateTo: (targetK: number, targetX: number, targetY: number, duration?: number, onComplete?: () => void) => void;
  syncAllViewports: (k: number, x: number, y: number, vw: number, vh: number, currentLOD: LODLevel) => void;
  renderCanvas: () => void;
  requestRender: () => void;
  updateHoverAtPoint: (clientX: number, clientY: number) => void;
}

/**
 * Arrow key navigation:
 * - Unclicked state: continuous smooth physics pan loop (Shift for 2x speed)
 * - Clicked state: circular iteration through Roads, L3 Municipalities, L2 Subdivisions, or L1 Countries
 */
export function useKeyboardNav(params: UseKeyboardNavParams): void {
  const pressedArrowKeys = useRef<Set<string>>(new Set());
  const isShiftPressedRef = useRef(false);
  const panVelocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const panRafIdRef = useRef<number | null>(null);
  const lastPanTimeRef = useRef<number>(0);

  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  });

  useEffect(() => {
    const startSmoothPan = () => {
      if (panRafIdRef.current !== null) return;
      lastPanTimeRef.current = performance.now();

      const loop = (now: number) => {
        const p = paramsRef.current;
        const dt = Math.min((now - lastPanTimeRef.current) / 1000, 0.05);
        lastPanTimeRef.current = now;

        const keys = pressedArrowKeys.current;
        let targetVx = 0;
        let targetVy = 0;
        const speed = isShiftPressedRef.current ? 1700 : 800;

        if (keys.has('ArrowUp')) targetVy += speed;
        if (keys.has('ArrowDown')) targetVy -= speed;
        if (keys.has('ArrowLeft')) targetVx += speed;
        if (keys.has('ArrowRight')) targetVx -= speed;

        // Normalize diagonal speed
        if (targetVx !== 0 && targetVy !== 0) {
          targetVx *= 0.7071;
          targetVy *= 0.7071;
        }

        const isHolding = targetVx !== 0 || targetVy !== 0;
        const accelRate = isHolding ? 14 : 9;
        const blend = Math.min(1, accelRate * dt);

        const v = panVelocityRef.current;
        v.vx += (targetVx - v.vx) * blend;
        v.vy += (targetVy - v.vy) * blend;

        const { k: currentK, x: curX, y: curY } = p.getTransform();
        const { w: vw, h: vh } = p.getViewport();

        const newX = p.wrapX(curX + v.vx * dt, currentK);
        const newY = p.clampY(curY + v.vy * dt, currentK, vh);

        p.setTransformXY(newX, newY);

        p.renderCanvas();
        const mp = p.getMousePos();
        p.updateHoverAtPoint(mp.x, mp.y);
        p.syncAllViewports(currentK, newX, newY, vw, vh, p.getLodLevel());

        if (!isHolding && Math.abs(v.vx) < 1.5 && Math.abs(v.vy) < 1.5) {
          v.vx = 0;
          v.vy = 0;
          panRafIdRef.current = null;
          p.updateHoverAtPoint(mp.x, mp.y);
          return;
        }

        panRafIdRef.current = requestAnimationFrame(loop);
      };

      panRafIdRef.current = requestAnimationFrame(loop);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in form controls or a modal is open
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable ||
        document.querySelector('.modal-overlay')
      ) {
        return;
      }

      const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
      if (!isArrowKey) return;

      e.preventDefault();
      isShiftPressedRef.current = e.shiftKey;

      const isForward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
      const dir = isForward ? 1 : -1;

      const p = paramsRef.current;
      const selRoad = p.getSelectedRoad();
      const selMuni = p.getSelectedMunicipality();
      const selL2 = p.getSelectedL2Subdivision();
      const selCountry = p.getSelectedCountry();

      const isClicked = !!selRoad || !!selMuni || !!selL2 || !!selCountry;

      if (isClicked && panRafIdRef.current) {
        cancelAnimationFrame(panRafIdRef.current);
        panRafIdRef.current = null;
        panVelocityRef.current = { vx: 0, vy: 0 };
        pressedArrowKeys.current.clear();
      }

      // 1. Road Selected: Iterate through highways/routes
      if (selRoad) {
        const roadList: RoadPathData[] = [];
        const seenNames = new Set<string>();
        for (const bundle of p.getRoadBundles().values()) {
          for (const r of bundle.roads) {
            if (!seenNames.has(r.name)) {
              seenNames.add(r.name);
              roadList.push(r);
            }
          }
        }

        if (roadList.length > 0) {
          roadList.sort((a, b) => {
            if (a.class !== b.class) {
              return a.class === 'Interstate' ? -1 : 1;
            }
            const numA = parseInt(a.number, 10);
            const numB = parseInt(b.number, 10);
            if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
              return numA - numB;
            }
            return a.name.localeCompare(b.name);
          });

          const currentIdx = roadList.findIndex((r) => r.name === selRoad.name);
          const nextIdx = currentIdx === -1 ? 0 : (currentIdx + dir + roadList.length) % roadList.length;
          const nextRoad = roadList[nextIdx];

          if (p.onSelectRoad) p.onSelectRoad(nextRoad, { focus: false });
          p.setSelectedRoadRef(nextRoad);

          const cx = (nextRoad.bbox[0] + nextRoad.bbox[2]) / 2;
          const cy = (nextRoad.bbox[1] + nextRoad.bbox[3]) / 2;
          const targetK = p.getTransform().k;
          const { w: vw, h: vh } = p.getViewport();
          const targetX = p.wrapX(vw / 2 - cx * targetK, targetK);
          const targetY = p.clampY(vh / 2 - cy * targetK, targetK, vh);

          p.animateTo(targetK, targetX, targetY, 250, () => {
            const mp = p.getMousePos();
            p.syncAllViewports(targetK, targetX, targetY, vw, vh, p.getLodLevel());
            p.updateHoverAtPoint(mp.x, mp.y);
          });
          p.requestRender();
        }
        return;
      }

      // 2. L3 Region Selected: Iterate through siblings in the same L2 parent
      if (selMuni) {
        const activeParent = p.getActiveL3Parent();
        const iso2 = selMuni.iso2 || activeParent?.iso2 || '';
        const parentName = selMuni.parentName || selMuni.pref || activeParent?.name;
        const parentCode = selMuni.parentCode || activeParent?.code;
        const parentId = activeParent?.id;

        const siblings = p.getL3SubdivisionsForParent(iso2, parentName, parentCode, parentId);

        if (siblings.length > 0) {
          const sortedChildren = [...siblings].sort(
            (a, b) => (a.code || a.id).localeCompare(b.code || b.id) || a.name.localeCompare(b.name)
          );

          const currentIdx = sortedChildren.findIndex(
            (c) => c.id === selMuni.code || c.code === selMuni.code || c.name === selMuni.city
          );
          const nextIdx = currentIdx === -1 ? 0 : (currentIdx + dir + sortedChildren.length) % sortedChildren.length;
          const nextChild = sortedChildren[nextIdx];

          const cMeta = findCountry(nextChild.iso2);
          const newMuni: MunicipalityDetail = {
            code: nextChild.id || nextChild.code,
            pref: nextChild.parentName,
            city: nextChild.name,
            nameZh: nextChild.nameZh || `${nextChild.parentName} ${nextChild.name}`,
            iso2: nextChild.iso2,
            countryName: cMeta?.name || '',
            countryNameZh: cMeta?.nameZh || '',
            countryFlag: cMeta?.flag || '🌐',
            typeEn: nextChild.typeEn || 'District',
            parentName: nextChild.parentName,
            parentCode: nextChild.parentCode
          };

          if (p.onSelectMunicipality) p.onSelectMunicipality(newMuni, { focus: false });
          p.setSelectedMunicipalityRef(newMuni);

          const cx = (nextChild.bbox[0] + nextChild.bbox[2]) / 2;
          const cy = (nextChild.bbox[1] + nextChild.bbox[3]) / 2;
          const targetK = p.getTransform().k;
          const { w: vw, h: vh } = p.getViewport();
          const targetX = p.wrapX(vw / 2 - cx * targetK, targetK);
          const targetY = p.clampY(vh / 2 - cy * targetK, targetK, vh);

          p.animateTo(targetK, targetX, targetY, 200, () => {
            const mp = p.getMousePos();
            p.syncAllViewports(targetK, targetX, targetY, vw, vh, p.getLodLevel());
            p.updateHoverAtPoint(mp.x, mp.y);
          });
          p.requestRender();
        }
        return;
      }

      // 3. L2 Subdivision Selected: Iterate through subdivisions in current country
      if (selL2) {
        const list = p.getL2PathsForCountry(selL2.iso2);

        if (list.length > 0) {
          const sortedL2 = [...list].sort(
            (a, b) => (a.code || a.name).localeCompare(b.code || b.name) || String(a.id).localeCompare(String(b.id))
          );

          const currentIdx = sortedL2.findIndex((s) => String(s.id) === String(selL2.id));
          const nextIdx = currentIdx === -1 ? 0 : (currentIdx + dir + sortedL2.length) % sortedL2.length;
          const nextSub = sortedL2[nextIdx];

          p.setSelectedL2SubdivisionRef({ iso2: nextSub.iso2, id: nextSub.id });

          const nextSubDetail = toL2Detail(nextSub);
          if (p.onSelectSubdivision) p.onSelectSubdivision(nextSubDetail, { focus: false });
          p.onSelectCountry(null);

          if (p.getLodLevel() === 'L3') {
            p.loadL3PackForSubdivision(nextSub.iso2, nextSub.code, nextSub.name, nextSub.id);
            p.setActiveL3Parent({
              iso2: nextSub.iso2,
              id: nextSub.id,
              name: nextSub.name,
              code: nextSub.code,
              bbox: nextSub.bbox,
              path2D: nextSub.path2D
            });
          }

          const [cx, cy] = nextSub.centroid;
          const targetK = p.getTransform().k;
          const { w: vw, h: vh } = p.getViewport();
          const targetX = p.wrapX(vw / 2 - cx * targetK, targetK);
          const targetY = p.clampY(vh / 2 - cy * targetK, targetK, vh);

          p.animateTo(targetK, targetX, targetY, 250, () => {
            const mp = p.getMousePos();
            p.syncAllViewports(targetK, targetX, targetY, vw, vh, p.getLodLevel());
            p.updateHoverAtPoint(mp.x, mp.y);
          });
          p.requestRender();
        }
        return;
      }

      // 4. L1 Country Selected: Iterate through countries
      if (selCountry) {
        const countries = p.deterministicCountries;
        if (countries.length > 0) {
          const currentIdx = countries.findIndex(
            (c) => c.countryMeta?.id === selCountry.id || c.countryMeta?.iso2 === selCountry.iso2
          );
          const nextIdx = currentIdx === -1 ? 0 : (currentIdx + dir + countries.length) % countries.length;
          const nextCountry = countries[nextIdx];

          if (nextCountry.countryMeta) {
            p.onSelectCountry(nextCountry.countryMeta, { focus: false });
            p.setSelectedCountryRef(nextCountry.countryMeta);
            p.setSelectedL2SubdivisionRef(null);
            if (p.onSelectSubdivision) p.onSelectSubdivision(null);
            if (p.onSelectMunicipality) p.onSelectMunicipality(null);
            p.setSelectedMunicipalityRef(null);

            const [cx, cy] = nextCountry.centroid;
            const currentK = p.getTransform().k;
            const targetK = currentK > 2.8 ? 2.2 : currentK;
            const { w: vw, h: vh } = p.getViewport();
            const targetX = p.wrapX(vw / 2 - cx * targetK, targetK);
            const targetY = p.clampY(vh / 2 - cy * targetK, targetK, vh);

            p.animateTo(targetK, targetX, targetY, 300, () => {
              const mp = p.getMousePos();
              p.syncAllViewports(targetK, targetX, targetY, vw, vh, p.getLodLevel());
              p.updateHoverAtPoint(mp.x, mp.y);
            });
            p.requestRender();
          }
        }
        return;
      }

      // 5. Unclicked State: Continuous smooth physics pan loop
      pressedArrowKeys.current.add(e.key);
      startSmoothPan();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedArrowKeys.current.delete(e.key);
      isShiftPressedRef.current = e.shiftKey;
    };

    const handleBlur = () => {
      pressedArrowKeys.current.clear();
      if (panRafIdRef.current !== null) {
        cancelAnimationFrame(panRafIdRef.current);
        panRafIdRef.current = null;
        panVelocityRef.current = { vx: 0, vy: 0 };
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (panRafIdRef.current !== null) {
        cancelAnimationFrame(panRafIdRef.current);
        panRafIdRef.current = null;
      }
    };
  }, []);
}
