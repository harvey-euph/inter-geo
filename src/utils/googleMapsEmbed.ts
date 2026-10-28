export interface ParsedEmbedConfig {
  mode: 'streetview' | 'place' | 'view' | 'directions' | 'search';
  params: Record<string, string>;
  title?: string;
  height?: number;
  aspectRatio: string;
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

  // Keyword at start of alt: map, streetview, sv, gmap, view, place
  const hasMapKeywordInAlt = /^(?:map|streetview|sv|street-view|gmap|googlemap|google-map|embed:(?:map|streetview|sv|gmap)|place|view)(?:[|:]|$)/i.test(altLower);

  // Source is a Google Maps URL
  const isGoogleMapsUrl =
    srcLower.includes('google.com/maps') ||
    srcLower.includes('maps.google.com') ||
    srcLower.includes('goo.gl/maps') ||
    srcLower.includes('maps.app.goo.gl');

  // Explicit scheme like streetview:... or map:...
  const hasMapScheme = /^(?:streetview|sv|map|gmap|place):/i.test(srcLower);

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
  let customRatio = '16 / 9';
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
      }
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
    } else if (!part.includes('=') && !['streetview', 'sv', 'map', 'view', 'place', 'gmap', 'embed'].includes(lower)) {
      customTitle = part;
    }
  }

  let src = (rawSrc || '').trim();
  // Strip schemes like streetview: or map:
  src = src.replace(/^(?:streetview|sv|map|gmap|place):/i, '').trim();

  let mode: 'streetview' | 'place' | 'view' | 'directions' | 'search' = explicitMode || 'streetview';
  const params: Record<string, string> = { ...extraParams };
  let externalUrl: string;

  // Case 1: Standard or StreetView Google Maps URL
  if (
    src.includes('google.com/maps') ||
    src.includes('maps.google.com') ||
    src.includes('goo.gl/maps') ||
    src.includes('maps.app.goo.gl')
  ) {
    externalUrl = src;

    // Check for coordinates in URL like @51.1283,71.4305 or @51.1283,71.4305,3a,75y,120h,90t
    const atMatch = src.match(/@(-?\d+\.\d+),(-?\d+\.\d+)(?:,([^/?#]+))?/);
    const isStreetViewUrl =
      src.includes('3a') ||
      src.includes('layer=c') ||
      src.includes('cbll=') ||
      src.includes('!1e1');

    if (atMatch) {
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
    if (placeMatch && (!atMatch || explicitMode === 'place')) {
      mode = 'place';
      try {
        params.q = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      } catch {
        params.q = placeMatch[1];
      }
    }

    // Check for search query
    const searchMatch = src.match(/\/search\/([^/@?#]+)/);
    if (searchMatch) {
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
        externalUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coords}${
          params.heading ? `&heading=${params.heading}` : ''
        }${params.pitch ? `&pitch=${params.pitch}` : ''}`;
      } else if (mode === 'view') {
        params.center = coords;
        if (!params.zoom) params.zoom = '15';
        externalUrl = `https://www.google.com/maps/@${coords},${params.zoom || '15'}z`;
      } else {
        // Default place
        params.q = coords;
        externalUrl = `https://www.google.com/maps/search/?api=1&query=${coords}`;
      }
    } else if (
      src.includes('=') &&
      (src.startsWith('location=') || src.startsWith('q=') || src.startsWith('center='))
    ) {
      // Key-value param string
      const searchParams = new URLSearchParams(src);
      searchParams.forEach((val, key) => {
        params[key] = val;
      });
      if (params.location) mode = 'streetview';
      else if (params.center) mode = 'view';
      else if (params.q) mode = explicitMode || 'place';

      externalUrl = params.location
        ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${params.location}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            params.q || params.center || ''
          )}`;
    } else {
      // Freeform place name: e.g. "Baiterek, Astana"
      mode = 'place';
      params.q = src;
      externalUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(src)}`;
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
    aspectRatio: customRatio,
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
