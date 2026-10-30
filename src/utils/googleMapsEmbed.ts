export interface CropConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Default optimal crop configuration for Google Maps Embed API.
 * Accurately clips:
 * - top: 67px (Google search/header card)
 * - right: 58px (Compass, motion tracking, Street View zoom controls)
 * - bottom: 50px (Google logo, terms, keyboard shortcuts bar)
 * - left: 0px
 */
export const DEFAULT_CROP: CropConfig = {
  top: 67,
  right: 58,
  bottom: 50,
  left: 0
};

export interface ParsedEmbedConfig {
  mode: 'streetview' | 'place' | 'view' | 'directions' | 'search';
  params: Record<string, string>;
  title?: string;
  height?: number;
  width?: number;
  aspectRatio: string;
  isVertical: boolean;
  crop: CropConfig;
  locked: boolean;
  showHeader: boolean;
  externalUrl: string;
}

/**
 * Default public Google Maps Embed API Key (configured with HTTP Referrer origin restrictions).
 * Can be overridden locally via VITE_GOOGLE_MAPS_API_KEY in .env.
 */
export const DEFAULT_GOOGLE_MAPS_API_KEY = 'AIzaSyAxtpqu4XJLBFeVRUIJm-C07wMLHJxMMts';

export function getGoogleMapsApiKey(): string {
  return (
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ||
    DEFAULT_GOOGLE_MAPS_API_KEY
  );
}

/**
 * Checks if a markdown image or link token should be rendered as a Google Maps Embed
 */
export function isGoogleMapsEmbedToken(rawAlt?: string, rawSrc?: string): boolean {
  const altLower = (rawAlt || '').trim().toLowerCase();
  const srcLower = (rawSrc || '').trim().toLowerCase();

  // Keyword at start of alt: map, streetview, sv, gmap, view, place, search, directions, route, vertical, portrait
  const hasMapKeywordInAlt = /^(?:map|streetview|sv|street-view|gmap|googlemap|google-map|embed:(?:map|streetview|sv|gmap)|place|view|search|directions|route|vertical|portrait)(?:[|:]|$)/i.test(altLower);

  // Source is a Google Maps URL
  const isGoogleMapsUrl =
    srcLower.includes('google.com/maps') ||
    srcLower.includes('maps.google.com') ||
    srcLower.includes('goo.gl/maps') ||
    srcLower.includes('maps.app.goo.gl');

  // Explicit scheme like streetview:... or map:...
  const hasMapScheme = /^(?:streetview|sv|map|gmap|place|search|directions|route):/i.test(srcLower);

  return hasMapKeywordInAlt || isGoogleMapsUrl || hasMapScheme;
}

/**
 * Parses markdown options and input URL/coordinates into Embed API parameters
 */
export function parseGoogleMapsEmbedConfig(rawAlt?: string, rawSrc?: string): ParsedEmbedConfig {
  const altParts = (rawAlt || '').split(/[|:]/).map((s) => s.trim()).filter(Boolean);
  let explicitMode: 'streetview' | 'place' | 'view' | 'directions' | 'search' | null = null;
  let customTitle: string | undefined;
  let customHeight: number | undefined;
  let customWidth: number | undefined;
  let customRatio = '16 / 9';
  let isVertical = false;
  let isLocked = false;
  let showHeader = false;
  const crop: CropConfig = { ...DEFAULT_CROP };
  const extraParams: Record<string, string> = {};

  for (const part of altParts) {
    const lower = part.toLowerCase();
    if (lower === 'streetview' || lower === 'sv' || lower === 'street-view' || lower === 'pano') {
      explicitMode = 'streetview';
    } else if (lower === 'place' || lower === 'landmark') {
      explicitMode = 'place';
    } else if (lower === 'view' || lower === 'map' || lower === 'gmap' || lower === 'googlemap') {
      explicitMode = explicitMode || 'view';
    } else if (lower === 'directions' || lower === 'route') {
      explicitMode = 'directions';
    } else if (lower === 'search') {
      explicitMode = 'search';
    } else if (
      lower === 'header' ||
      lower === 'show-header' ||
      lower === 'bar' ||
      lower === 'toolbar' ||
      lower === 'with-header'
    ) {
      showHeader = true;
    } else if (lower === 'no-header' || lower === 'no-bar' || lower === 'hide-header') {
      showHeader = false;
    } else if (
      lower === 'lock' ||
      lower === 'locked' ||
      lower === 'static' ||
      lower === 'freeze' ||
      lower === 'frozen' ||
      lower === 'readonly' ||
      lower === 'no-drag' ||
      lower === 'no-pan' ||
      lower === 'lock=true' ||
      lower === 'interactive=false'
    ) {
      isLocked = true;
    } else if (
      lower === 'no-crop' ||
      lower === 'uncropped' ||
      lower === 'crop=none' ||
      lower === 'crop=0' ||
      lower === 'raw'
    ) {
      crop.top = 0;
      crop.right = 0;
      crop.bottom = 0;
      crop.left = 0;
    } else if (lower === 'clean' || lower === 'crop') {
      crop.top = DEFAULT_CROP.top;
      crop.right = DEFAULT_CROP.right;
      crop.bottom = DEFAULT_CROP.bottom;
      crop.left = DEFAULT_CROP.left;
    } else if (/^crop=(.+)$/i.test(part)) {
      const val = part.slice(5).trim();
      const valLower = val.toLowerCase();
      if (valLower === 'none' || valLower === '0' || valLower === 'false' || valLower === 'off') {
        crop.top = 0;
        crop.right = 0;
        crop.bottom = 0;
        crop.left = 0;
      } else if (val.includes(',')) {
        const nums = val.split(',').map((s) => Number(s.trim().replace(/px/i, '')) || 0);
        if (nums.length === 4) {
          crop.top = Math.max(0, nums[0]);
          crop.right = Math.max(0, nums[1]);
          crop.bottom = Math.max(0, nums[2]);
          crop.left = Math.max(0, nums[3]);
        } else if (nums.length === 2) {
          crop.top = Math.max(0, nums[0]);
          crop.bottom = Math.max(0, nums[0]);
          crop.right = Math.max(0, nums[1]);
          crop.left = Math.max(0, nums[1]);
        }
      } else {
        const num = Number(val.replace(/px/i, '')) || 0;
        crop.right = Math.max(0, num);
      }
    } else if (/^crop-(?:r|right)=(\d+)(?:px)?$/i.test(part)) {
      const m = part.match(/^crop-(?:r|right)=(\d+)(?:px)?$/i);
      if (m) crop.right = Number(m[1]);
    } else if (/^crop-(?:b|bottom)=(\d+)(?:px)?$/i.test(part)) {
      const m = part.match(/^crop-(?:b|bottom)=(\d+)(?:px)?$/i);
      if (m) crop.bottom = Number(m[1]);
    } else if (/^crop-(?:t|top)=(\d+)(?:px)?$/i.test(part)) {
      const m = part.match(/^crop-(?:t|top)=(\d+)(?:px)?$/i);
      if (m) crop.top = Number(m[1]);
    } else if (/^crop-(?:l|left)=(\d+)(?:px)?$/i.test(part)) {
      const m = part.match(/^crop-(?:l|left)=(\d+)(?:px)?$/i);
      if (m) crop.left = Number(m[1]);
    } else if (
      lower === 'vertical' ||
      lower === 'portrait' ||
      lower === '9:16' ||
      lower === '9/16' ||
      lower === 'v' ||
      lower === 'vertical-16:9' ||
      lower === 'vertical:16:9' ||
      lower === '16:9-v' ||
      lower === 'vertical=true'
    ) {
      isVertical = true;
      customRatio = '9 / 16';
    } else if (/^(?:w|width)=(\d+)(?:px)?$/i.test(part)) {
      const match = part.match(/^(?:w|width)=(\d+)(?:px)?$/i);
      if (match) customWidth = Math.max(160, Math.min(800, Number(match[1])));
    } else if (/^(?:h|height)=(\d+)(?:px)?$/i.test(part)) {
      const match = part.match(/^(?:h|height)=(\d+)(?:px)?$/i);
      if (match) customHeight = Math.max(160, Math.min(600, Number(match[1])));
    } else if (/^(\d+)px$/i.test(part)) {
      customHeight = Math.max(160, Math.min(600, Number(part.replace(/px/i, ''))));
    } else if (
      /^(?:ratio|aspect)=?(\d+(?:\.\d+)?)[/:](\d+(?:\.\d+)?)$/i.test(part) ||
      /^(\d+(?:\.\d+)?)[/:](\d+(?:\.\d+)?)$/.test(part)
    ) {
      const match =
        part.match(/^(?:ratio|aspect)=?(\d+(?:\.\d+)?)[/:](\d+(?:\.\d+)?)$/i) ||
        part.match(/^(\d+(?:\.\d+)?)[/:](\d+(?:\.\d+)?)$/);
      if (match && Number(match[2]) > 0) {
        customRatio = `${match[1]} / ${match[2]}`;
        if (Number(match[1]) < Number(match[2])) {
          isVertical = true;
        }
      }
    } else if (/^(?:ratio|aspect)=(?:vertical|portrait|v|9:16|9\/16)$/i.test(part)) {
      isVertical = true;
      customRatio = '9 / 16';
    } else if (/^(?:heading|head)=(\d+(?:\.\d+)?)$/i.test(part)) {
      extraParams.heading = part.split('=')[1];
    } else if (/^pitch=(-?\d+(?:\.\d+)?)$/i.test(part)) {
      extraParams.pitch = part.split('=')[1];
    } else if (/^fov=(\d+(?:\.\d+)?)$/i.test(part)) {
      extraParams.fov = part.split('=')[1];
    } else if (/^(?:z|zoom)=(\d+(?:\.\d+)?)$/i.test(part)) {
      extraParams.zoom = part.split('=')[1];
    } else if (/^title=(.+)$/i.test(part)) {
      customTitle = part.slice(6).trim();
    } else if (/^(?:travelmode|travel_mode|transit_mode)=(.*)$/i.test(part)) {
      extraParams.mode = part.split('=')[1].trim();
    } else if (/^mode=(transit|driving|walking|bicycling|flying)$/i.test(part)) {
      extraParams.mode = part.split('=')[1].trim();
    } else if (/^(?:origin|from)=(.*)$/i.test(part)) {
      extraParams.origin = part.split('=')[1].trim();
    } else if (/^(?:destination|dest|to)=(.*)$/i.test(part)) {
      extraParams.destination = part.split('=')[1].trim();
    } else if (/^waypoints=(.*)$/i.test(part)) {
      extraParams.waypoints = part.split('=')[1].trim();
    } else if (/^avoid=(.*)$/i.test(part)) {
      extraParams.avoid = part.split('=')[1].trim();
    } else if (/^maptype=(roadmap|satellite)$/i.test(part)) {
      extraParams.maptype = part.split('=')[1].trim();
    } else if (/^q=(.*)$/i.test(part)) {
      extraParams.q = part.split('=')[1].trim();
    } else if (
      !part.includes('=') &&
      ![
        'streetview',
        'sv',
        'street-view',
        'pano',
        'map',
        'view',
        'place',
        'landmark',
        'directions',
        'route',
        'search',
        'gmap',
        'embed',
        'clean',
        'crop',
        'no-crop',
        'uncropped',
        'lock',
        'locked',
        'static',
        'freeze',
        'frozen',
        'readonly',
        'no-drag',
        'no-pan',
        'header',
        'show-header',
        'bar',
        'toolbar',
        'with-header',
        'no-header',
        'no-bar',
        'hide-header',
        'vertical',
        'portrait',
        'v',
        '9:16',
        '9/16',
        'vertical-16:9',
        'vertical:16:9',
        '16:9-v',
        'vertical=true'
      ].includes(lower)
    ) {
      customTitle = part;
    }
  }

  let src = (rawSrc || '').trim();
  // Strip schemes like streetview: or map: or directions: or search:
  src = src.replace(/^(?:streetview|sv|map|gmap|place|directions|search|route):/i, '').trim();

  let mode: 'streetview' | 'place' | 'view' | 'directions' | 'search' = explicitMode || 'streetview';
  const params: Record<string, string> = { ...extraParams };
  let externalUrl = '';

  // Case 1: Standard or StreetView Google Maps URL
  if (
    src.includes('google.com/maps') ||
    src.includes('maps.google.com') ||
    src.includes('goo.gl/maps') ||
    src.includes('maps.app.goo.gl')
  ) {
    externalUrl = src;

    // Check for directions in URL: e.g. /maps/dir/Origin/Destination
    const dirMatch = src.match(/\/maps\/dir\/([^/?#]+)\/([^/?#]+)/);
    if (dirMatch) {
      mode = 'directions';
      try {
        params.origin = decodeURIComponent(dirMatch[1].replace(/\+/g, ' '));
        params.destination = decodeURIComponent(dirMatch[2].replace(/\+/g, ' '));
      } catch {
        params.origin = dirMatch[1];
        params.destination = dirMatch[2];
      }
    }

    // Check for coordinates in URL like @51.1283,71.4305 or @51.1283,71.4305,3a,75y,120h,90t
    const atMatch = src.match(/@(-?\d+\.\d+),(-?\d+\.\d+)(?:,([^/?#]+))?/);
    const isStreetViewUrl =
      src.includes('3a') ||
      src.includes('layer=c') ||
      src.includes('cbll=') ||
      src.includes('!1e1');

    if (atMatch && !dirMatch) {
      const lat = atMatch[1];
      const lng = atMatch[2];
      const tail = atMatch[3] || '';

      if (isStreetViewUrl || explicitMode === 'streetview') {
        mode = 'streetview';
        params.location = `${lat},${lng}`;

        // Parse tail params like 3a,75y,120.5h,90t
        const fovMatch = tail.match(/(\d+(?:\.\d+)?)y/);
        const headingMatch = tail.match(/(\d+(?:\.\d+)?)h/);
        const tiltMatch = tail.match(/(\d+(?:\.\d+)?)t/);

        if (fovMatch && !params.fov) params.fov = fovMatch[1];
        if (headingMatch && !params.heading) params.heading = headingMatch[1];
        if (tiltMatch && !params.pitch) {
          const tilt = Number(tiltMatch[1]);
          // 90t in GMaps URL is horizontal (eye level), which is 0 in Embed API.
          params.pitch = String(Math.round(90 - tilt));
        }
      } else {
        mode = explicitMode || 'view';
        params.center = `${lat},${lng}`;
        const zoomMatch = tail.match(/(\d+(?:\.\d+)?)z/);
        if (zoomMatch && !params.zoom) params.zoom = zoomMatch[1];
      }
    }

    // Check for place name in URL
    const placeMatch = src.match(/\/place\/([^/@?#]+)/);
    if (placeMatch && (!atMatch || explicitMode === 'place') && !dirMatch) {
      mode = 'place';
      try {
        params.q = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      } catch {
        params.q = placeMatch[1];
      }
    }

    // Check for search query
    const searchMatch = src.match(/\/search\/([^/@?#]+)/);
    if (searchMatch && !dirMatch) {
      mode = 'search';
      try {
        params.q = decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
      } catch {
        params.q = searchMatch[1];
      }
    }

    // Check query params in URL
    const urlObj = (() => {
      try {
        return new URL(src);
      } catch {
        return null;
      }
    })();

    if (urlObj) {
      if (urlObj.searchParams.get('origin')) {
        mode = 'directions';
        params.origin = urlObj.searchParams.get('origin')!;
      }
      if (urlObj.searchParams.get('destination')) {
        mode = 'directions';
        params.destination = urlObj.searchParams.get('destination')!;
      }
      if (urlObj.searchParams.get('q')) {
        params.q = urlObj.searchParams.get('q')!;
      }
      if (urlObj.searchParams.get('cbll')) {
        mode = 'streetview';
        params.location = urlObj.searchParams.get('cbll')!;
      }
      if (urlObj.searchParams.get('heading') && !params.heading) {
        params.heading = urlObj.searchParams.get('heading')!;
      }
    }
  } else {
    // Check if raw coordinates: "51.1283, 71.4305" or "51.1283,71.4305"
    const coordMatch = src.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
    if (coordMatch) {
      const lat = coordMatch[1];
      const lng = coordMatch[2];
      const coords = `${lat},${lng}`;

      if (mode === 'streetview') {
        params.location = coords;
      } else if (mode === 'view') {
        params.center = coords;
        if (!params.zoom) params.zoom = '15';
      } else {
        params.q = coords;
      }
    } else if (
      src.includes('=') &&
      (src.includes('origin=') ||
        src.includes('destination=') ||
        src.startsWith('location=') ||
        src.startsWith('q=') ||
        src.startsWith('center='))
    ) {
      // Key-value param string
      const searchParams = new URLSearchParams(src);
      searchParams.forEach((val, key) => {
        params[key] = val;
      });
      if (params.origin && params.destination) {
        mode = 'directions';
      } else if (params.location) {
        mode = 'streetview';
      } else if (params.center) {
        mode = 'view';
      } else if (params.q) {
        mode = explicitMode || 'place';
      }
    } else {
      // Check for route string like "Origin -> Destination" or "Origin to Destination"
      const routeMatch = src.match(/^(.+?)\s*(?:->|-->|\s+to\s+|至|到)\s*(.+)$/i);
      if (explicitMode === 'directions' || (routeMatch && (src.includes('->') || src.includes('-->')))) {
        mode = 'directions';
        if (routeMatch) {
          if (!params.origin) params.origin = routeMatch[1].trim();
          if (!params.destination) params.destination = routeMatch[2].trim();
        } else if (!params.origin) {
          params.origin = src;
        }
      } else if (explicitMode === 'search') {
        mode = 'search';
        params.q = src;
      } else if (explicitMode === 'view') {
        mode = 'view';
        params.center = src;
        if (!params.zoom) params.zoom = '15';
      } else {
        // Freeform place name: e.g. "Baiterek, Astana"
        mode = explicitMode || 'place';
        params.q = src;
      }
    }
  }

  // Construct externalUrl if not already set
  if (!externalUrl) {
    if (mode === 'streetview') {
      externalUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${params.location || ''}${
        params.heading ? `&heading=${params.heading}` : ''
      }${params.pitch ? `&pitch=${params.pitch}` : ''}`;
    } else if (mode === 'view') {
      externalUrl = `https://www.google.com/maps/@${params.center || ''},${params.zoom || '15'}z`;
    } else if (mode === 'directions') {
      externalUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        params.origin || ''
      )}&destination=${encodeURIComponent(params.destination || '')}${
        params.mode ? `&travelmode=${encodeURIComponent(params.mode)}` : ''
      }`;
    } else {
      // place or search
      externalUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        params.q || ''
      )}`;
    }
  }

  // Ensure minimum required params per mode
  if (mode === 'streetview' && !params.location && !params.pano) {
    if (params.q) {
      mode = 'place';
    }
  }

  return {
    mode,
    params,
    title: customTitle,
    height: customHeight,
    width: customWidth,
    aspectRatio: customRatio,
    isVertical,
    crop,
    locked: isLocked,
    showHeader,
    externalUrl
  };
}

/**
 * Builds Google Maps Embed API iframe source URL
 */
export function buildEmbedUrl(config: ParsedEmbedConfig, apiKey: string): string {
  if (!apiKey) return '';

  const { mode, params } = config;
  const baseUrl = `https://www.google.com/maps/embed/v1/${mode}`;
  const query = new URLSearchParams();

  query.set('key', apiKey);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      query.set(key, value);
    }
  }

  return `${baseUrl}?${query.toString()}`;
}
