import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, BackHandler } from 'react-native';
import SafeScreen from '../components/SafeScreen';
import { WebView } from 'react-native-webview';
import { Colors } from '../lib/colors';
import { useNavigation } from '../lib/NavigationContext';

const { width, height } = Dimensions.get('window');

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; width: 100%; overflow: hidden; position: fixed; }
    #map { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #e0e0e0; }
    .leaflet-control-attribution { display: none !important; }
    .leaflet-bottom { display: none !important; }
    .legend { position: absolute; top: 12px; left: 12px; background: rgba(255,255,255,0.95); padding: 10px 12px; border-radius: 8px; font-family: sans-serif; font-size: 13px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); z-index: 1000; }
    .legend span { display: inline-block; width: 12px; height: 12px; margin-right: 8px; border-radius: 2px; }
    .controls { position: fixed; top: 12px; right: 12px; display: flex; flex-direction: column; gap: 8px; z-index: 1000; }
    .controlBtn { width: 44px; height: 44px; border-radius: 10px; background: rgba(255,255,255,0.95); border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.2); font-size: 20px; font-weight: bold; display: flex; align-items: center; justify-content: center; cursor: pointer; user-select: none; touch-action: manipulation; }
    .controlBtn:active { transform: scale(0.95); background: rgba(255,255,255,1); }
    .leaflet-tile-container { image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="legend">
    <div><span style="background:#1E90FF"></span>Rivers</div>
    <div><span style="background:#4682B4"></span>Lakes</div>
    <div><span style="background:#FF8C00"></span>Dams</div>
  </div>
  <div class="controls">
    <button id="zoomIn" class="controlBtn">+</button>
    <button id="zoomOut" class="controlBtn">−</button>
    <button id="recenter" class="controlBtn">⌖</button>
  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', {
      center: [20.5937, 78.9629],
      zoom: 5,
      minZoom: 5,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
      maxBounds: [[6, 68], [36, 98]],
      maxBoundsViscosity: 1.0,
      zoomSnap: 1,
      zoomDelta: 1,
      dragging: true,
      tap: true,
      touchZoom: true,
      scrollWheelZoom: true,
      doubleClickZoom: true
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
      maxZoom: 19,
      tileSize: 256,
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 4,
      bounds: [[6, 68], [36, 98]],
      noWrap: true,
      detectRetina: true,
      crossOrigin: true
    }).addTo(map);

    setTimeout(() => {
      map.invalidateSize(true);
      map.setView([20.5937, 78.9629], 5);
    }, 100);

    async function loadOverlays() {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        const [rData, lData, dData] = await Promise.all([
          fetch('https://raw.githubusercontent.com/datameet/india-geojson/master/india_rivers.geojson').then(r => r.json()),
          fetch('https://raw.githubusercontent.com/datameet/india-geojson/master/india_lakes.geojson').then(r => r.json()),
          fetch('https://raw.githubusercontent.com/datameet/india-geojson/master/india_dams.geojson').then(r => r.json())
        ]);

        L.geoJSON(rData, {
          style: { color: '#1E90FF', weight: 2, opacity: 0.7, smoothFactor: 1 }
        }).addTo(map);

        L.geoJSON(lData, {
          style: { color: '#4682B4', weight: 1, fillColor: '#1E90FF', fillOpacity: 0.25 }
        }).addTo(map);

        L.geoJSON(dData, {
          pointToLayer: (f, ll) => L.circleMarker(ll, {
            radius: 4,
            fillColor: '#FF8C00',
            color: '#D97706',
            weight: 1,
            fillOpacity: 0.85
          })
        }).addTo(map);
      } catch (err) {
        console.error('Overlay error:', err);
      }
    }

    map.whenReady(() => {
      map.invalidateSize();
      setTimeout(() => {
        map.invalidateSize();
        loadOverlays();
      }, 300);
    });

    document.getElementById('zoomIn').onclick = () => map.zoomIn();
    document.getElementById('zoomOut').onclick = () => map.zoomOut();
    document.getElementById('recenter').onclick = () => map.setView([20.5937, 78.9629], 5);
  </script>
</body>
</html>
`;

export default function MapViewScreen() {
  const { navigateBack } = useNavigation();

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigateBack();
      return true;
    });
    return () => backHandler.remove();
  }, [navigateBack]);

  return (
    <SafeScreen backgroundColor={Colors.deepSecurityBlue} statusBarStyle="light">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Map View</Text>
            <Text style={styles.headerSubtitle}>India Water Resources</Text>
          </View>
        </View>

        {/* Map */}
        <View style={styles.mapWrapper}>
          <View style={styles.mapBox}>
            <WebView
              originWhitelist={['*']}
              source={{ html }}
              style={styles.webview}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowFileAccess={true}
              allowUniversalAccessFromFileURLs={true}
            />
          </View>
        </View>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.deepSecurityBlue },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: Colors.deepSecurityBlue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.deepSecurityBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backIcon: { fontSize: 20, color: Colors.white },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.deepSecurityBlue },
  headerSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  mapWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapBox: {
    width: width - 32,
    height: height - 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    shadowColor: Colors.deepSecurityBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  webview: { width: '100%', height: '100%', backgroundColor: 'transparent' },
});
