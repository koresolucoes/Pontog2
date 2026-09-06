# CARTO basemap provider

## Runtime contract

Ponto G uses CARTO raster basemaps as the primary visual provider and OpenStreetMap tiles as a fail-safe fallback.

Required Vercel build variable for CARTO:

```text
VITE_CARTO_BASEMAP_KEY=<CARTO-issued key>
```

The value is embedded in the browser bundle by Vite because tile requests are made directly from the client. It must therefore be treated as a browser-visible API key and restricted/monitored according to the CARTO basemap terms.

## Behavior

1. If `VITE_CARTO_BASEMAP_KEY` is present, the Map Engine rewrites legacy CARTO requests to the authenticated `rastertiles/dark_all` endpoint.
2. OpenStreetMap + CARTO attribution is always restored, including legacy Leaflet maps that disabled `attributionControl`.
3. If the CARTO key is absent, the app uses OpenStreetMap tiles immediately instead of requesting unauthenticated CARTO tiles.
4. If CARTO tile requests fail, the active tile layer falls back to OpenStreetMap.

## Architecture

`engines/maps/leafletBasemapAdapter.ts` is a compatibility bridge for current screens. New map consumers should depend on the Map Engine public contract rather than hardcoding tile providers. Existing direct Leaflet consumers can be migrated incrementally during the modular-monolith refactor.
