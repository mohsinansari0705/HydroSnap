import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, BackHandler, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SafeScreen from '../components/SafeScreen';
import { WebView } from 'react-native-webview';
import { Colors } from '../lib/colors';
import { useNavigation } from '../lib/NavigationContext';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { -webkit-tap-highlight-color: transparent; }
    html, body { 
      margin: 0; 
      padding: 0; 
      width: 100%; 
      height: 100%; 
      overflow: hidden;
      position: fixed;
      -webkit-user-select: none;
      user-select: none;
    }
    #map { 
      position: absolute;
      top: 0; 
      left: 0; 
      width: 100%; 
      height: 100%; 
      background: #aad3df;
    }
    .leaflet-container { 
      background: #aad3df;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .leaflet-tile-container img { 
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
    .leaflet-control-attribution,
    .leaflet-control-zoom { display: none !important; }
    
    .legend { 
      position: absolute; 
      top: 16px; 
      left: 16px; 
      background: white; 
      padding: 12px 14px; 
      border-radius: 12px; 
      font-size: 13px; 
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      pointer-events: auto;
    }
    .legend-title {
      font-weight: 600;
      margin-bottom: 8px;
      color: #1e3a8a;
    }
    .legend-item { 
      margin: 6px 0; 
      display: flex; 
      align-items: center; 
    }
    .legend-color { 
      width: 16px; 
      height: 16px; 
      margin-right: 8px; 
      border-radius: 3px; 
      flex-shrink: 0;
    }
    
    .controls { 
      position: absolute; 
      top: 16px; 
      right: 16px; 
      display: flex; 
      flex-direction: column; 
      gap: 10px; 
      z-index: 1000;
      pointer-events: auto;
    }
    .control-btn { 
      width: 48px; 
      height: 48px; 
      border-radius: 12px; 
      background: white; 
      border: none; 
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      font-size: 22px; 
      font-weight: 600; 
      cursor: pointer; 
      display: flex; 
      align-items: center; 
      justify-content: center;
      transition: all 0.15s ease;
      color: #1e3a8a;
    }
    .control-btn:active { 
      transform: scale(0.92); 
      box-shadow: 0 1px 6px rgba(0,0,0,0.2);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  
  <div class="legend">
    <div class="legend-title">Map Layers</div>
    <div class="legend-item">
      <div class="legend-color" style="background:#1E90FF"></div>
      <div>Rivers</div>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background:#4682B4"></div>
      <div>Lakes</div>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background:#FF8C00"></div>
      <div>Dams</div>
    </div>
  </div>
  
  <div class="controls">
    <button class="control-btn" id="zoomIn">+</button>
    <button class="control-btn" id="zoomOut">−</button>
    <button class="control-btn" id="recenter">⌖</button>
    <button class="control-btn" id="locate">📍</button>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    let map;
    
    function initMap() {
      map = L.map('map', {
        center: [20.5937, 78.9629],
        zoom: 5,
        minZoom: 5,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: false,
        maxBounds: [[6, 68], [36, 98]],
        maxBoundsViscosity: 1.0,
        zoomSnap: 0.5,
        zoomDelta: 1,
        wheelPxPerZoomLevel: 60,
        dragging: true,
        tap: true,
        touchZoom: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: false
      });

      // High-quality tile layer with Indian perspective
      L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 19,
        minZoom: 4,
        tileSize: 256,
        zoomOffset: 0,
        attribution: '',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        bounds: [[6, 68], [36, 98]],
        keepBuffer: 8,
        updateWhenZooming: false,
        updateWhenIdle: true,
        detectRetina: false
      }).addTo(map);

      // Fix map size after initialization
      setTimeout(() => {
        map.invalidateSize(true);
        map.setView([20.5937, 78.9629], 5);
      }, 100);

      loadOverlays();
    }

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
        
        // Create blur pane for disputed territories
        const blurPane = map.createPane('blurPane');
        blurPane.style.filter = 'blur(12px)';
        blurPane.style.zIndex = '650';
        
        // Kashmir and Ladakh region - full blur coverage
        const kashmirLadakhBounds = [[32, 73.5], [37.5, 80.5]];
        
        L.rectangle(kashmirLadakhBounds, {
          color: 'transparent',
          fillColor: '#d0d0d0',
          fillOpacity: 1,
          weight: 0,
          interactive: false,
          pane: 'blurPane'
        }).addTo(map);
      } catch (err) {
        console.error('Overlay error:', err);
      }
    }

    // Controls
    document.getElementById('zoomIn').onclick = () => map.zoomIn();
    document.getElementById('zoomOut').onclick = () => map.zoomOut();
    document.getElementById('recenter').onclick = () => map.setView([20.5937, 78.9629], 5);
    document.getElementById('locate').onclick = () => {
      // Request permission from React Native side first
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage('REQUEST_LOCATION');
      } else {
        alert('Location feature not available');
      }
    };

    // Initialize on load
    if (document.readyState === 'complete') {
      initMap();
    } else {
      window.addEventListener('load', initMap);
    }
  </script>
</body>
</html>
`;

export default function MapLibreMapScreen() {
  const { navigateBack } = useNavigation();
  const webViewRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();
  
  // Calculate dynamic map height based on navigation type
  // If bottom inset is small (< 20), device likely uses button navigation
  // If bottom inset is larger, device uses gesture navigation
  const hasButtonNavigation = insets.bottom < 20;
  const headerHeight = 92; // Approximate header + margins
  const baseMapHeight = hasButtonNavigation 
    ? height - headerHeight - 140  // Less space for button navigation
    : height - headerHeight - 80;  // More space for gesture navigation

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      navigateBack();
      return true; // consume back press
    });
    return () => sub.remove();
  }, [navigateBack]);

  const handleMessage = async (event: any) => {
    const data = event.nativeEvent.data;
    if (data === 'REQUEST_LOCATION') {
      try {
        // Check if location services are enabled
        const isEnabled = await Location.hasServicesEnabledAsync();
        if (!isEnabled) {
          Alert.alert(
            'Location Services Disabled',
            'Please turn on location services in your device settings to use this feature.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Check permission status
        const { status } = await Location.getForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Location permission is required to use this feature. Please grant location access in your device settings.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Get current location using expo-location with lower accuracy to avoid device settings error
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const { latitude, longitude } = location.coords;

        // Send location to WebView to update map
        webViewRef.current?.injectJavaScript(`
          (function() {
            if (typeof map !== 'undefined') {
              map.setView([${latitude}, ${longitude}], 14);
              
              // Remove any existing user markers
              map.eachLayer(function(layer) {
                if (layer.options && layer.options.className === 'user-location-marker') {
                  map.removeLayer(layer);
                }
              });
              
              // Add new marker
              L.marker([${latitude}, ${longitude}], {
                icon: L.divIcon({
                  className: 'user-location-marker',
                  html: '<div style="width:24px;height:24px;background:#1E90FF;border:4px solid white;border-radius:50%;box-shadow:0 2px 12px rgba(0,0,0,0.4);"></div>',
                  iconSize: [24, 24]
                })
              }).addTo(map).bindPopup('<b>You are here</b><br>Lat: ${latitude.toFixed(6)}<br>Lng: ${longitude.toFixed(6)}').openPopup();
            }
          })();
          true;
        `);
      } catch (error: any) {
        console.error('Location error:', error);
        
        // Handle specific error cases
        const errorMessage = error?.message || '';
        
        if (errorMessage.includes('unsatisfied device settings') || errorMessage.includes('settings')) {
          Alert.alert(
            'Location Settings Issue',
            'Please ensure high accuracy location mode is enabled in your device settings.',
            [{ text: 'OK' }]
          );
        } else if (errorMessage.includes('disabled') || errorMessage.includes('turned off')) {
          Alert.alert(
            'Location Disabled',
            'Location services are turned off. Please enable them in your device settings.',
            [{ text: 'OK' }]
          );
        } else if (errorMessage.includes('timeout')) {
          Alert.alert(
            'Location Timeout',
            'Unable to get your location. Please try again.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Location Error',
            'Unable to get your location. Please check that location services are enabled.',
            [{ text: 'OK' }]
          );
        }
      }
    }
  };

  return (
    <SafeScreen statusBarStyle="light">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Map View</Text>
            <Text style={styles.headerSubtitle}>Rivers • Lakes • Dams</Text>
          </View>
        </View>

        <View style={styles.mapWrapper}>
          <View style={[styles.mapBox, { height: baseMapHeight }]}>
            <WebView
              ref={webViewRef}
              originWhitelist={["*"]}
              source={{ html }}
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled
              scrollEnabled={false}
              overScrollMode="never"
              bounces={false}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              onMessage={handleMessage}
              geolocationEnabled={true}
              allowsInlineMediaPlayback={true}
            />
          </View>
        </View>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.softLightGrey },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: Colors.white,
    shadowColor: Colors.deepSecurityBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
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

  mapWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  mapBox: {
    width: width - 32,
    // height is set dynamically based on navigation type
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
