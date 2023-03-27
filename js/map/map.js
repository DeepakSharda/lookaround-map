import { vectorBlueLineLayer, rasterBlueLineLayer } from "./layers/cachedBlueLines.js";
import { appleRoad, appleRoadDark, appleSatellite } from "./layers/appleMaps.js";
import { googleRoad, googleStreetView } from "./layers/googleMaps.js";
import { openStreetMap, cartoDbPositron, cartoDbDarkMatter } from "./layers/openStreetMap.js";
import { lookaroundCoverage } from "./layers/lookaroundCoverage.js";
import { Constants } from "./Constants.js";
import { FilterControl } from "./FilterControl.js";
import { SettingsControl } from "./SettingsControl.js";
import { wrapLon } from "../util/geo.js";

import { useGeographic } from "ol/proj.js";
import LayerGroup from 'ol/layer/Group.js';
import Map from "ol/Map.js";
import View from 'ol/View.js';
import { Attribution, defaults as controlDefaults } from 'ol/control.js';
import Style from 'ol/style/Style.js';
import Icon from 'ol/style/Icon.js';
import Feature from 'ol/Feature.js';
import VectorSource from 'ol/source/Vector.js';
import VectorLayer from 'ol/layer/Vector.js';

import LayerSwitcher from '../external/ol-layerswitcher/ol-layerswitcher.js';
import ContextMenu from 'ol-contextmenu';

export function createMap(config) {
  useGeographic();

  const browserIsInDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (browserIsInDarkMode) {
    appleRoad.setVisible(false);
    appleRoadDark.setVisible(true);
  }

  const baseLayers = new LayerGroup({
    title: "Base layer",
    layers: [appleRoad, appleRoadDark, appleSatellite, googleRoad, 
      openStreetMap, cartoDbPositron, cartoDbDarkMatter]
  });

  const cachedBlueLines = new LayerGroup({
    visible: true,
    title: `
    Apple Look Around cached blue lines<br>
    <span class="layer-explanation">(<a class='layer-link' href='https://gist.github.com/sk-zk/53dfc36fa70dae7f4848ce812002fd16' target='_blank'>what is this?</a>)</span>
    `,
    combine: "true",
    layers: [rasterBlueLineLayer, vectorBlueLineLayer],
  })

  updateActiveCachedBlueLineLayer(false);

  const overlays = new LayerGroup({
    title: "Overlays",
    layers: [lookaroundCoverage, cachedBlueLines, googleStreetView]
  });

  const map = new Map({
    layers: [baseLayers, overlays],
    target: "map",
    view: new View({
      center: [config.center.longitude, config.center.latitude],
      zoom: config.center.zoom,
      minZoom: Constants.MIN_ZOOM,
      maxZoom: Constants.MAX_ZOOM,
      constrainResolution: true,
      enableRotation: false,
    }),
    controls: controlDefaults({
      zoom: true,
      attribution: false,
      rotate: false,
    }),
  });

  const layerSwitcher = new LayerSwitcher({
    reverse: false,
    groupSelectStyle: 'group'
  });
  map.addControl(layerSwitcher);

  const attributionControl = new Attribution({
    collapsible: false,
    collapsed: false,
  });
  map.addControl(attributionControl);

  createContextMenu(map);
  createFilterControl(map);
  createSettingsControl(map);
  createPanoMarkerLayer(map);

  return map;
}

function createSettingsControl(map) {
  const settingsControl = new SettingsControl();
  map.addControl(settingsControl);
  settingsControl.addEventListener("addrSourceChanged", (_) => {
    map.dispatchEvent("addrSourceChanged");
  })
}

function createFilterControl(map) {
  const filterControl = new FilterControl();
  vectorBlueLineLayer.setFilterSettings(filterControl.getFilterSettings());
  lookaroundCoverage.setFilterSettings(filterControl.getFilterSettings());
  filterControl.on("changed", (e) => {
    updateActiveCachedBlueLineLayer(!e.filterSettings.isDefault());
    vectorBlueLineLayer.setFilterSettings(e.filterSettings);
    vectorBlueLineLayer.getLayers().forEach(l => l.changed());
    lookaroundCoverage.setFilterSettings(e.filterSettings);
    lookaroundCoverage.getLayers().forEach(l => l.getSource().refresh());

  });
  map.addControl(filterControl);
}

function updateActiveCachedBlueLineLayer(anyFiltersEnabled) {
  if (anyFiltersEnabled) {
    rasterBlueLineLayer.setVisible(false);
    vectorBlueLineLayer.setMinZoom(Constants.MIN_ZOOM-1);
  } else {
    rasterBlueLineLayer.setVisible(true);
    vectorBlueLineLayer.setMinZoom(rasterBlueLineLayer.getMaxZoom());
  }
}

function createContextMenu(map) {
  const contextMenu = new ContextMenu({
    width: 250,
    defaultItems: false,
    items: [
      {
        text: "Copy coordinates to clipboard",
        icon: "/static/icons/copy.png",
        callback: (e) => {
          e.coordinate[0] = wrapLon(e.coordinate[0]);
          navigator.clipboard.writeText(`${e.coordinate[1]}, ${e.coordinate[0]}`);
        },
      },
      {
        text: "Center map here",
        icon: "image:()",
        callback: (e) => {
          map.getView().animate({
            duration: 300,
            center: e.coordinate,
          });
        },
      },
      "-",
      {
        text: "Open in Apple Maps",
        icon: "image:()",
        callback: (e) => {
          const view = map.getView();
          const center = view.getCenter();
          const zoom = view.getZoom();
          window.open(
            `http://maps.apple.com/?ll=${center[1]},${center[0]}&z=${zoom}`,
            "_blank"
          );
        },
      },
      {
        text: "Open in Google Maps",
        icon: "image:()",
        callback: (e) => {
          const view = map.getView();
          const center = view.getCenter();
          const zoom = view.getZoom();
          window.open(
            `https://www.google.com/maps/@${center[1]},${center[0]},${zoom}z/data=!5m1!1e5`,
            "_blank"
          );
        },
      },
      {
        text: "Open in OpenStreetMap",
        icon: "image:()",
        callback: (e) => {
          const view = map.getView();
          const center = view.getCenter();
          const zoom = view.getZoom();
          window.open(
            `https://www.openstreetmap.org/#map=${zoom}/${center[1]}/${center[0]}`,
            "_blank"
          );
        },
      },
    ],
  });
  map.addControl(contextMenu);
  map.getViewport().addEventListener("contextmenu", (e) => {
    const clickCoordinates = map.getEventCoordinate(e);
    clickCoordinates[0] = wrapLon(clickCoordinates[0]);
    // looks like this library doesn't support updating menu item text at runtime either
    contextMenu.element.childNodes[0].childNodes[0].innerHTML = 
      `${clickCoordinates[1].toFixed(5)}, ${clickCoordinates[0].toFixed(5)}`;
  });
}

function createPanoMarkerLayer(map) {
  const markerStyle = new Style({
    image: new Icon({
      anchor: [0.5, 1],
      anchorXUnits: 'fraction',
      anchorYUnits: 'fraction',
      src: '/static/marker-icon.png',
    }),
  });

  const markerFeature = new Feature({
    geometry: null,
  });

  markerFeature.setStyle(markerStyle);

  const mapMarkerSource = new VectorSource({
    features: [markerFeature],
  });

  const mapMarkerLayer = new VectorLayer({
    source: mapMarkerSource,
  });
  mapMarkerLayer.set('name', 'panoMarker');

  map.addLayer(mapMarkerLayer);
}

