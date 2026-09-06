import * as L from 'leaflet';

const CARTO_HOST = 'basemaps.cartocdn.com';
const CARTO_DARK_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png';
const OSM_FALLBACK_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const CARTO_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

let installed = false;

const readCartoKey = (): string => (process.env.CARTO_BASEMAP_KEY || '').trim();

const ensureAttributionControl = (map: L.Map, attribution: string) => {
  const mutableMap = map as L.Map & { attributionControl?: L.Control.Attribution };

  if (!mutableMap.attributionControl) {
    mutableMap.attributionControl = L.control.attribution({
      position: 'bottomright',
      prefix: false,
    }).addTo(map);
  }

  mutableMap.attributionControl.setPrefix(false);
  mutableMap.attributionControl.addAttribution(attribution);
};

/**
 * Compatibility bridge for the current Leaflet consumers.
 *
 * Existing screens still instantiate CARTO directly. This adapter centralizes the
 * provider at bootstrap so we can migrate those screens incrementally without a
 * big-bang map refactor:
 * - CARTO raster basemap when VITE_CARTO_BASEMAP_KEY is available at build time;
 * - OpenStreetMap tiles as a fail-safe when the key is absent or CARTO errors;
 * - mandatory OpenStreetMap/CARTO attribution even on legacy maps that disabled
 *   Leaflet's attributionControl.
 */
export const installLeafletBasemapAdapter = () => {
  if (installed) return;
  installed = true;

  const tileLayerPrototype = L.TileLayer.prototype as unknown as {
    initialize: (url: string, options?: L.TileLayerOptions) => void;
  };
  const originalInitialize = tileLayerPrototype.initialize;

  tileLayerPrototype.initialize = function initializeBasemap(
    this: L.TileLayer,
    requestedUrl: string,
    requestedOptions: L.TileLayerOptions = {},
  ) {
    if (!requestedUrl.includes(CARTO_HOST)) {
      originalInitialize.call(this, requestedUrl, requestedOptions);
      return;
    }

    const cartoKey = readCartoKey();
    const useCarto = cartoKey.length > 0;
    const primaryUrl = useCarto
      ? `${CARTO_DARK_URL}?key=${encodeURIComponent(cartoKey)}`
      : OSM_FALLBACK_URL;
    const attribution = useCarto ? CARTO_ATTRIBUTION : OSM_ATTRIBUTION;

    const options: L.TileLayerOptions = {
      ...requestedOptions,
      attribution,
      maxZoom: requestedOptions.maxZoom ?? 19,
      subdomains: useCarto ? 'abcd' : 'abc',
    };

    originalInitialize.call(this, primaryUrl, options);

    this.once('add', () => {
      const map = (this as L.TileLayer & { _map?: L.Map })._map;
      if (map) ensureAttributionControl(map, attribution);
    });

    if (!useCarto) return;

    let fallbackActivated = false;
    this.on('tileerror', () => {
      if (fallbackActivated) return;
      fallbackActivated = true;

      const layer = this as L.TileLayer & { options: L.TileLayerOptions; _map?: L.Map };
      const map = layer._map;

      if (map) {
        const mutableMap = map as L.Map & { attributionControl?: L.Control.Attribution };
        mutableMap.attributionControl?.removeAttribution(CARTO_ATTRIBUTION);
        ensureAttributionControl(map, OSM_ATTRIBUTION);
      }

      layer.options.attribution = OSM_ATTRIBUTION;
      layer.options.subdomains = 'abc';
      layer.setUrl(OSM_FALLBACK_URL);
    });
  };
};

export const MAP_BASEMAP_PROVIDER = {
  primary: 'carto',
  fallback: 'openstreetmap',
  cartoStyle: 'dark_all',
} as const;
