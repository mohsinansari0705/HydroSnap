import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Animated,
  RefreshControl,
} from 'react-native';
import { PieChart, BarChart, LineChart } from 'react-native-gifted-charts';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, createNeumorphicButton, NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/profile';

const { width: screenWidth } = Dimensions.get('window');

interface DashboardScreenProps {
  profile: Profile;
  onBack: () => void;
}

type ChartType = 'pie' | 'line' | 'bar' | 'area' | 'donut' | 'stackedBar';

interface ChartData {
  labels: string[];
  values: number[];
  colors?: string[];
  pieCharts?: {
    title: string;
    labels: string[];
    values: number[];
    colors: string[];
  }[];
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ profile, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<'overview' | 'sites' | 'readings'>('overview');
  const [viewMode, setViewMode] = useState<'dashboard' | 'charts'>('dashboard');
  const [chartModalVisible, setChartModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const dashboardFadeAnim = useRef(new Animated.Value(1)).current;
  const pinAnimations = useRef<{[key: number]: {scale: Animated.Value, opacity: Animated.Value}}>({}).current;
  
  // Profile is used for user context
  console.log('Dashboard loaded for user:', profile.id);
  const [selectedChart, setSelectedChart] = useState<ChartType>('pie');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [focusedPieIndex, setFocusedPieIndex] = useState<{[key: number]: number}>({});
  const [stats, setStats] = useState({
    totalSites: 0,
    totalReadings: 0,
    dangerSites: 0,
    warningSites: 0,
    avgWaterLevel: 0,
  });

  useEffect(() => {
    fetchDashboardData();
    // Initial fade-in animation
    Animated.timing(dashboardFadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (stats.totalSites > 0) {
      generateChartData(selectedChart, selectedDataset);
      

    }
  }, [selectedChart, stats, selectedDataset]);

  const onRefresh = async () => {
    setRefreshing(true);
    
    // Quick fade out
    Animated.timing(dashboardFadeAnim, {
      toValue: 0.4,
      duration: 150,
      useNativeDriver: true,
    }).start();
    
    // Fetch new data
    await fetchDashboardData();
    
    // Quick fade back in
    Animated.timing(dashboardFadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    setRefreshing(false);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch monitoring sites
      const { data: sites, error: sitesError } = await supabase
        .from('monitoring_sites')
        .select('*');

      if (sitesError) throw sitesError;

      // Fetch water level readings
      const { data: readings, error: readingsError } = await supabase
        .from('water_level_readings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (readingsError) throw readingsError;

      // Calculate statistics
      const dangerCount = sites?.filter(site => {
        const latestReading = readings?.find(r => r.site_id === site.id);
        return latestReading && site.danger_level && latestReading.water_level >= site.danger_level;
      }).length || 0;

      const warningCount = sites?.filter(site => {
        const latestReading = readings?.find(r => r.site_id === site.id);
        return latestReading && site.warning_level && site.danger_level &&
               latestReading.water_level >= site.warning_level &&
               latestReading.water_level < site.danger_level;
      }).length || 0;

      const avgLevel = readings && readings.length > 0
        ? readings.reduce((sum, r) => sum + r.water_level, 0) / readings.length
        : 0;

      setStats({
        totalSites: sites?.length || 0,
        totalReadings: readings?.length || 0,
        dangerSites: dangerCount,
        warningSites: warningCount,
        avgWaterLevel: avgLevel,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = async (chartType: ChartType, dataset: 'overview' | 'sites' | 'readings') => {
    setChartLoading(true);
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.9);
    
    try {
      if (dataset === 'sites') {
        // Monitoring Sites data
        const { data: sites, error } = await supabase
          .from('monitoring_sites')
          .select('*')
          .limit(20);

        if (error) throw error;

        if (!sites || sites.length === 0) {
          setChartData({ labels: [], values: [] });
          return;
        }

        switch (chartType) {
          case 'bar':
          case 'line':
          case 'area':
          case 'stackedBar':
            // Keep original order - no sorting
            setChartData({
              labels: sites.map(s => s.name.split(' ')[0]),
              values: sites.map(s => s.danger_level || 0),
              colors: sites.map(s => 
                (s.danger_level || 0) > 1000 ? Colors.criticalRed :
                (s.danger_level || 0) > 500 ? Colors.warningYellow :
                Colors.validationGreen
              ),
            });
            
            // Trigger animation
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
              })
            ]).start();
            break;

          case 'pie':
          case 'donut':
            // Helper function to assign colors ensuring no adjacent segments have the same color
            const assignNonAdjacentColors = (count: number) => {
              const baseColors = [
                Colors.aquaTechBlue,
                Colors.validationGreen,
                Colors.warningYellow,
                Colors.criticalRed,
                Colors.deepSecurityBlue,
                '#8B5CF6',
                '#F97316',
                '#14B8A6',
                '#EC4899',
                '#10B981'
              ];
              
              // Shuffle colors array to get different color arrangements each time
              const shuffledColors = [...baseColors].sort(() => Math.random() - 0.5);
              
              const colors: string[] = [];
              for (let i = 0; i < count; i++) {
                let color = shuffledColors[i % shuffledColors.length];
                let attempts = 0;
                
                // If this color is same as previous, try next colors until we find a different one
                while (i > 0 && color === colors[i - 1] && attempts < shuffledColors.length) {
                  attempts++;
                  color = shuffledColors[(i + attempts) % shuffledColors.length];
                }
                
                colors.push(color);
              }
              return colors;
            };
            
            // Pie Chart 1: Site Types Distribution
            const siteTypes = sites.reduce((acc: any, site) => {
              const type = site.site_type || 'other';
              acc[type] = (acc[type] || 0) + 1;
              return acc;
            }, {});
            
            // Pie Chart 2: Individual River Sites with their danger levels
            const riverSitesData = sites.filter(s => 
              s.name.toLowerCase().includes('river') || 
              s.site_type?.toLowerCase().includes('river')
            );
            const riverLabels = riverSitesData.map(s => s.name.split(' ')[0]);
            const riverValues = riverSitesData.map(s => s.danger_level || 1);
            const riverColors = assignNonAdjacentColors(riverLabels.length);
            
            // Pie Chart 3: Individual Reservoir Sites with their danger levels
            const reservoirSitesData = sites.filter(s => 
              s.name.toLowerCase().includes('reservoir') || 
              s.site_type?.toLowerCase().includes('reservoir') ||
              s.name.toLowerCase().includes('dam')
            );
            const reservoirLabels = reservoirSitesData.map(s => s.name.split(' ')[0]);
            const reservoirValues = reservoirSitesData.map(s => s.danger_level || 1);
            const reservoirColors = assignNonAdjacentColors(reservoirLabels.length);
            
            const siteColors = assignNonAdjacentColors(Object.keys(siteTypes).length);
            
            const pieCharts = [
              {
                title: 'Site Types Distribution',
                labels: Object.keys(siteTypes),
                values: Object.values(siteTypes) as number[],
                colors: siteColors,
              }
            ];
            
            // Add river chart only if there are river sites
            if (riverLabels.length > 0) {
              pieCharts.push({
                title: 'River Sites by Danger Level',
                labels: riverLabels,
                values: riverValues,
                colors: riverColors,
              });
            }
            
            // Add reservoir chart only if there are reservoir sites
            if (reservoirLabels.length > 0) {
              pieCharts.push({
                title: 'Reservoir/Dam Sites by Danger Level',
                labels: reservoirLabels,
                values: reservoirValues,
                colors: reservoirColors,
              });
            }
            
            // Sort pie charts data by value (descending)
            const sortedPieCharts = pieCharts.map(chart => {
              const combined = chart.labels.map((label, idx) => ({
                label,
                value: chart.values[idx],
                color: chart.colors[idx]
              }));
              combined.sort((a, b) => b.value - a.value);
              
              return {
                title: chart.title,
                labels: combined.map(c => c.label),
                values: combined.map(c => c.value),
                colors: combined.map(c => c.color)
              };
            });
            
            setChartData({
              labels: Object.keys(siteTypes),
              values: Object.values(siteTypes),
              colors: Object.keys(siteTypes).map((_, i) => siteColors[i % siteColors.length]),
              pieCharts: sortedPieCharts
            });
            
            // Trigger animation
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
              })
            ]).start();
            break;
        }
      } else if (dataset === 'readings') {
        // Water Level Readings data
        const { data: readings, error } = await supabase
          .from('water_level_readings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(15);

        if (error) throw error;

        if (!readings || readings.length === 0) {
          setChartData({ labels: [], values: [] });
          return;
        }

        switch (chartType) {
          case 'bar':
          case 'line':
          case 'area':
          case 'stackedBar':
            // Keep original order for water level readings
            setChartData({
              labels: readings.map((_r, i) => `R${readings.length - i}`),
              values: readings.map(r => r.water_level),
              colors: readings.map(r => 
                r.water_level > 1000 ? Colors.criticalRed :
                r.water_level > 500 ? Colors.warningYellow :
                Colors.validationGreen
              ),
            });
            
            // Trigger animation
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
              })
            ]).start();
            break;

          case 'pie':
          case 'donut':
            // Pie Chart 1: Reading Methods Distribution
            const methodCounts = readings.reduce((acc: any, reading) => {
              const method = reading.reading_method || 'unknown';
              acc[method] = (acc[method] || 0) + 1;
              return acc;
            }, {});
            
            // Pie Chart 2: Water Level Status Distribution
            const dangerReadings = readings.filter(r => r.water_level > 1000).length;
            const warningReadings = readings.filter(r => r.water_level > 500 && r.water_level <= 1000).length;
            const normalReadings = readings.filter(r => r.water_level <= 500).length;
            
            const readingColors = [
              Colors.aquaTechBlue, 
              Colors.validationGreen, 
              Colors.warningYellow,
              Colors.criticalRed,
              Colors.deepSecurityBlue,
              '#8B5CF6',
              '#F97316'
            ];
            
            // Sort pie chart data
            const methodLabels = Object.keys(methodCounts);
            const methodValues = Object.values(methodCounts) as number[];
            const methodData = methodLabels.map((label, idx) => ({
              label,
              value: methodValues[idx],
              color: readingColors[idx % readingColors.length]
            })).sort((a, b) => b.value - a.value);
            
            setChartData({
              labels: methodData.map(d => d.label),
              values: methodData.map(d => d.value),
              colors: methodData.map(d => d.color),
              pieCharts: [
                {
                  title: 'Reading Methods',
                  labels: methodData.map(d => d.label),
                  values: methodData.map(d => d.value),
                  colors: methodData.map(d => d.color),
                },
                {
                  title: 'Water Level Status',
                  labels: ['Danger', 'Warning', 'Normal'],
                  values: [dangerReadings, warningReadings, normalReadings],
                  colors: [Colors.criticalRed, Colors.warningYellow, Colors.validationGreen],
                }
              ]
            });
            
            // Trigger animation
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
              })
            ]).start();
            break;
        }
      } else {
        // Overview data (default)
        const { data: readings, error } = await supabase
          .from('water_level_readings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        if (!readings || readings.length === 0) {
          setChartData({ labels: [], values: [] });
          return;
        }

        switch (chartType) {
          case 'bar':
          case 'line':
          case 'area':
          case 'stackedBar':
            // Keep original order for overview readings
            setChartData({
              labels: readings.map((_r, i) => `R${readings.length - i}`),
              values: readings.map(r => r.water_level),
              colors: readings.map(r => 
                r.water_level > 1000 ? Colors.criticalRed :
                r.water_level > 500 ? Colors.warningYellow :
                Colors.validationGreen
              ),
            });
            
            // Trigger animation
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
              })
            ]).start();
            break;

          case 'pie':
          case 'donut':
            const statusCounts = {
              normal: 0,
              warning: 0,
              danger: 0,
            };
            
            readings.forEach(r => {
              if (r.water_level > 1000) statusCounts.danger++;
              else if (r.water_level > 500) statusCounts.warning++;
              else statusCounts.normal++;
            });

            // Sort by status priority (danger > warning > normal)
            const statusData = [
              { label: 'Danger', value: statusCounts.danger, color: Colors.criticalRed },
              { label: 'Warning', value: statusCounts.warning, color: Colors.warningYellow },
              { label: 'Normal', value: statusCounts.normal, color: Colors.validationGreen },
            ].sort((a, b) => b.value - a.value);
            
            setChartData({
              labels: statusData.map(d => d.label),
              values: statusData.map(d => d.value),
              colors: statusData.map(d => d.color),
              pieCharts: [{
                title: 'Water Level Status Distribution',
                labels: statusData.map(d => d.label),
                values: statusData.map(d => d.value),
                colors: statusData.map(d => d.color),
              }]
            });
            
            // Trigger animation
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
              })
            ]).start();
            break;
        }
      }
    } catch (error) {
      console.error('Error generating chart data:', error);
    } finally {
      setTimeout(() => setChartLoading(false), 300);
    }
  };

  const handleDatasetChange = async (dataset: 'sites' | 'readings') => {
    setSelectedDataset(dataset);
    setViewMode('charts');
    setSelectedChart('pie');
    setLoading(true);
    try {
      await generateChartData('pie', dataset);
    } catch (error) {
      console.error(`Error loading ${dataset} data:`, error);
      Alert.alert('Error', `Failed to load ${dataset} data`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    setViewMode('dashboard');
    setSelectedDataset('overview');
    setChartData(null);
  };

  const handleBackNavigation = () => {
    // Step-by-step navigation:
    // 1. If in charts view -> go back to dashboard AND reset to overview
    // 2. If on specific dataset (sites/readings) dashboard -> go back to overview
    // 3. If on overview -> go back to home page
    if (viewMode === 'charts') {
      setViewMode('dashboard');
      setSelectedDataset('overview');
      setChartData(null);
    } else if (selectedDataset !== 'overview') {
      // Reset to overview when going back from sites/readings
      setSelectedDataset('overview');
    } else {
      onBack();
    }
  };

  const renderStatCard = (title: string, value: string | number, icon: string, color: string) => (
    <View style={[styles.statCard, createNeumorphicCard({ size: 'small' })]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{title}</Text>
    </View>
  );

  const chartTypes: Array<{ type: ChartType; icon: string; label: string; description: string }> = [
    { type: 'pie', icon: '🥧', label: 'Pie Chart', description: 'Show data as portions of a whole' },
    { type: 'donut', icon: '🍩', label: 'Donut Chart', description: 'Ring-shaped pie chart' },
    { type: 'line', icon: '📈', label: 'Line Chart', description: 'Display trends over time' },
    { type: 'area', icon: '🌊', label: 'Area Chart', description: 'Filled line chart' },
    { type: 'bar', icon: '📊', label: 'Bar Chart', description: 'Compare values side by side' },
    { type: 'stackedBar', icon: '📚', label: 'Stacked Bar', description: 'Layered bar comparison' },
  ];

  const getChartLabel = (type: ChartType) => {
    const chart = chartTypes.find(c => c.type === type);
    return chart ? `${chart.icon} ${chart.label}` : type;
  };

  const renderChartTypeSelector = () => (
    <View style={[styles.chartSelector, createNeumorphicCard({ size: 'medium' })]}>
      <Text style={[styles.sectionTitle, NeumorphicTextStyles.subheading]}>📊 Chart Type</Text>
      <TouchableOpacity
        style={[styles.selectButton, createNeumorphicButton('primary', { size: 'medium', borderRadius: 12 })]}
        onPress={() => setChartModalVisible(true)}
      >
        <Text style={styles.selectButtonText}>{getChartLabel(selectedChart)}</Text>
        <Text style={styles.selectButtonArrow}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  const renderChartSelectionModal = () => (
    <Modal
      visible={chartModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setChartModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, createNeumorphicCard({ size: 'large' })]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, NeumorphicTextStyles.heading]}>Select Chart Type</Text>
            <TouchableOpacity onPress={() => setChartModalVisible(false)} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.chartTypesGrid}>
              {chartTypes.map((chart) => (
                <TouchableOpacity
                  key={chart.type}
                  style={[
                    styles.chartTypeCard,
                    createNeumorphicCard({ size: 'small' }),
                    selectedChart === chart.type && styles.chartTypeCardActive,
                  ]}
                  onPress={() => {
                    setSelectedChart(chart.type);
                    generateChartData(chart.type, selectedDataset);
                    setChartModalVisible(false);
                  }}
                >
                  <Text style={styles.chartTypeIcon}>{chart.icon}</Text>
                  <Text style={[
                    styles.chartTypeLabel,
                    selectedChart === chart.type && styles.chartTypeLabelActive,
                  ]}>
                    {chart.label}
                  </Text>
                  <Text style={styles.chartTypeDescription}>{chart.description}</Text>
                  {selectedChart === chart.type && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>✓ Selected</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderChart = () => {
    if (loading) {
      return (
        <View style={[styles.chartContainer, createNeumorphicCard({ size: 'large' })]}>
          <ActivityIndicator size="large" color={Colors.aquaTechBlue} />
          <Text style={styles.noDataText}>Loading chart...</Text>
        </View>
      );
    }
    
    if (!chartData || chartData.values.length === 0) {
      return (
        <View style={[styles.chartContainer, createNeumorphicCard({ size: 'large' })]}>
          <Text style={styles.noDataText}>No data available for chart</Text>
        </View>
      );
    }
    
    if (chartLoading) {
      return (
        <View style={[styles.chartContainer, createNeumorphicCard({ size: 'large' })]}>
          <ActivityIndicator size="large" color={Colors.aquaTechBlue} />
          <Text style={styles.noDataText}>Preparing chart...</Text>
        </View>
      );
    }

    // Prepare data for gifted-charts
    const barData = chartData.labels.map((label, index) => ({
      value: chartData.values[index],
      label: label.length > 8 ? label.substring(0, 8) + '...' : label,
      frontColor: chartData.colors?.[index] || Colors.aquaTechBlue,
      topLabelComponent: () => (
        <Text style={styles.barTopLabel}>{chartData.values[index].toFixed(0)}</Text>
      ),
    }));

    const lineData = chartData.labels.map((label, index) => ({
      value: chartData.values[index],
      label: label.length > 8 ? label.substring(0, 8) + '...' : label,
      dataPointText: chartData.values[index].toFixed(0),
      dataPointColor: chartData.colors?.[index] || Colors.aquaTechBlue,
    }));

    switch (selectedChart) {
      case 'pie':
      case 'donut':
        const pieChartsToRender = chartData.pieCharts || [
          {
            title: selectedDataset === 'sites' ? 'Site Type Distribution' : selectedDataset === 'readings' ? 'Reading Method Distribution' : 'Status Distribution',
            labels: chartData.labels,
            values: chartData.values,
            colors: chartData.colors || [],
          },
        ];

        return (
          <ScrollView horizontal={false} showsVerticalScrollIndicator={false}>
            {pieChartsToRender.map((pieChartData, chartIndex) => {
              // Initialize animation values for this chart if not exists
              if (!pinAnimations[chartIndex]) {
                pinAnimations[chartIndex] = {
                  scale: new Animated.Value(0),
                  opacity: new Animated.Value(0),
                };
                
                // Animate in the default label after a delay
                setTimeout(() => {
                  if (pinAnimations[chartIndex]) {
                    Animated.parallel([
                      Animated.spring(pinAnimations[chartIndex].scale, {
                        toValue: 1,
                        friction: 8,
                        tension: 100,
                        useNativeDriver: true,
                      }),
                      Animated.timing(pinAnimations[chartIndex].opacity, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                      })
                    ]).start();
                  }
                }, 1800); // Wait for pie chart animation to complete
              }
              
              // Sort pie data by value descending for better visualization
              const combined = pieChartData.labels.map((label, index) => ({
                value: pieChartData.values[index],
                color: pieChartData.colors[index],
                text: label,
                focused: focusedPieIndex[chartIndex] === index,
              }));
              combined.sort((a, b) => b.value - a.value);
              const pieDataForChart = combined;

              const handleLegendPress = (legendIndex: number) => {
                setFocusedPieIndex(prev => ({
                  ...prev,
                  [chartIndex]: prev[chartIndex] === legendIndex ? -1 : legendIndex
                }));
                
                // Animate pin appearance for this specific chart
                const chartAnim = pinAnimations[chartIndex];
                chartAnim.scale.setValue(0);
                chartAnim.opacity.setValue(0);
                Animated.parallel([
                  Animated.spring(chartAnim.scale, {
                    toValue: 1,
                    friction: 8,
                    tension: 100,
                    useNativeDriver: true,
                  }),
                  Animated.timing(chartAnim.opacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                  })
                ]).start();
              };

              const totalValue = pieDataForChart.reduce((sum, item) => sum + item.value, 0);
              
              // Set default focus to highest value (index 0) if nothing is selected
              const currentFocus = focusedPieIndex[chartIndex];
              const shouldShowLabel = currentFocus !== undefined ? currentFocus : 0;

              // Calculate angle for pin positioning
              const getSegmentAngle = (index: number) => {
                let accumulatedValue = 0;
                for (let i = 0; i < index; i++) {
                  accumulatedValue += pieDataForChart[i].value;
                }
                const startAngle = (accumulatedValue / totalValue) * 360;
                const segmentAngle = (pieDataForChart[index].value / totalValue) * 360;
                const midAngle = startAngle + segmentAngle / 2;
                return (midAngle - 90) * (Math.PI / 180); // Convert to radians, -90 to start from top
              };

              // Calculate pin position based on segment with boundary constraints
              const getPinPosition = (index: number) => {
                const angle = getSegmentAngle(index);
                const radius = selectedChart === 'donut' ? 130 : 120;
                const pinDistance = radius + 40; // Distance from center to pin start
                
                const x = Math.cos(angle) * pinDistance;
                const y = Math.sin(angle) * pinDistance;
                
                // Determine label position (left or right side)
                const isRightSide = x > 0;
                const labelDistance = 55; // Distance from pin to label
                
                // Calculate ideal label position
                let idealLabelX = x + (isRightSide ? labelDistance : -labelDistance);
                let idealLabelY = y;
                
                // Apply boundary constraints to keep label inside view
                // For donut chart, account for center offset
                const centerOffset = selectedChart === 'donut' ? 170 : 180;
                const containerHalfWidth = (screenWidth - 100) / 2; // More margin for safety
                const containerHalfHeight = 180; // Increased height allowance
                
                // Clamp label X position with extra padding for label width
                const labelWidth = 65; // Slightly more than half of minWidth (120px)
                const maxX = containerHalfWidth - labelWidth - 10; // Extra 10px padding
                const minX = -containerHalfWidth + labelWidth + 10; // Extra 10px padding on left
                const clampedLabelX = Math.max(minX, Math.min(maxX, idealLabelX));
                
                // Clamp label Y position with extra space at bottom
                const labelHeight = 45; // Increased for bottom labels
                const maxY = containerHalfHeight - labelHeight - 15; // Extra padding at bottom
                const minY = -containerHalfHeight + labelHeight + 5; // Extra padding at top
                const clampedLabelY = Math.max(minY, Math.min(maxY, idealLabelY));
                
                return {
                  pinX: x,
                  pinY: y,
                  labelX: clampedLabelX,
                  labelY: clampedLabelY,
                  isRightSide,
                };
              };

              const pinPosition = shouldShowLabel >= 0 ? getPinPosition(shouldShowLabel) : null;

              return (
                <Animated.View
                  key={chartIndex}
                  style={[
                    styles.chartContainer,
                    createNeumorphicCard({ size: 'large' }),
                    {
                      marginBottom: 16,
                      opacity: fadeAnim,
                      transform: [{ scale: scaleAnim }],
                    },
                  ]}
                >
                  <View style={styles.chartHeader}>
                    <Text style={[styles.chartTitle, NeumorphicTextStyles.subheading]}>
                      {pieChartData.title}
                    </Text>
                    <Text style={styles.chartHelperText}>Tap chart or legend items to highlight</Text>
                  </View>
                  <View style={styles.pieChartContainer}>
                    <View style={styles.pieChartCenter}>
                      <PieChart
                        data={pieDataForChart}
                        radius={selectedChart === 'donut' ? 130 : 120}
                        innerRadius={selectedChart === 'donut' ? 80 : 0}
                        showValuesAsLabels={false}
                        showText={false}
                        focusOnPress
                        isAnimated
                        animationDuration={1600}
                        onPress={(item: any, index: number) => {
                          setFocusedPieIndex(prev => ({
                            ...prev,
                            [chartIndex]: prev[chartIndex] === index ? -1 : index
                          }));
                          
                          // Animate pin appearance for this specific chart
                          const chartAnim = pinAnimations[chartIndex];
                          chartAnim.scale.setValue(0);
                          chartAnim.opacity.setValue(0);
                          Animated.parallel([
                            Animated.spring(chartAnim.scale, {
                              toValue: 1,
                              friction: 8,
                              tension: 100,
                              useNativeDriver: true,
                            }),
                            Animated.timing(chartAnim.opacity, {
                              toValue: 1,
                              duration: 400,
                              useNativeDriver: true,
                            })
                          ]).start();
                        }}
                        centerLabelComponent={() => {
                          if (selectedChart === 'donut' && shouldShowLabel >= 0 && pieDataForChart[shouldShowLabel]) {
                            const item = pieDataForChart[shouldShowLabel];
                            const percentage = ((item.value / totalValue) * 100).toFixed(1);
                            return (
                              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={styles.centerLabelName}>{item.text}</Text>
                                <Text style={styles.centerLabelValue}>{percentage}%</Text>
                                <Text style={styles.centerLabelCount}>{item.value}</Text>
                              </View>
                            );
                          }
                          return null;
                        }}
                      />
                    </View>
                    
                    {/* Label box only (without pin line and dot) */}
                    {shouldShowLabel >= 0 && pieDataForChart[shouldShowLabel] && pinPosition && (
                      <Animated.View 
                        style={[
                          styles.dynamicLabelBox,
                          { 
                            borderColor: pieDataForChart[shouldShowLabel].color,
                            left: pinPosition.labelX + (selectedChart === 'donut' ? 125 : 120),
                            top: pinPosition.labelY + 170,
                            opacity: pinAnimations[chartIndex].opacity,
                            transform: [{ scale: pinAnimations[chartIndex].scale }],
                          }
                        ]}
                      >
                        <Text style={styles.labelName}>{pieDataForChart[shouldShowLabel].text}</Text>
                        <Text style={styles.labelValue}>
                          {pieDataForChart[shouldShowLabel].value} ({((pieDataForChart[shouldShowLabel].value / totalValue) * 100).toFixed(1)}%)
                        </Text>
                      </Animated.View>
                    )}
                  </View>
                  
                  {/* Legend below the chart */}
                  <View style={styles.legendContainer}>
                    {pieDataForChart.map((item, index) => {
                      // Show first item (highest value) as focused by default if nothing is selected
                      const isFocused = focusedPieIndex[chartIndex] === undefined 
                        ? index === 0 
                        : focusedPieIndex[chartIndex] === index;
                      return (
                        <TouchableOpacity 
                          key={index} 
                          style={[
                            styles.legendItem,
                            isFocused && styles.legendItemFocused
                          ]}
                          onPress={() => handleLegendPress(index)}
                          activeOpacity={0.7}
                        >
                          <Animated.View 
                            style={[
                              styles.legendColor, 
                              { 
                                backgroundColor: item.color,
                                transform: [{ scale: isFocused ? 1.2 : 1 }]
                              }
                            ]} 
                          />
                          <Text style={[
                            styles.legendText,
                            isFocused && styles.legendTextFocused
                          ]}>
                            {item.text}: {item.value} (
                            {((item.value / totalValue) * 100).toFixed(1)}
                            %)
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </Animated.View>
              );
            })}
          </ScrollView>
        );
      
      case 'line':
        return (
          <Animated.View 
            style={[
              styles.chartContainer, 
              createNeumorphicCard({ size: 'large' }),
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, NeumorphicTextStyles.subheading]}>
                {selectedDataset === 'sites' ? 'Danger Level Trend' : selectedDataset === 'readings' ? 'Water Level Trend' : 'Data Trend'}
              </Text>
              <Text style={styles.chartHelperText}>Swipe left/right • Long press for details</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={styles.giftedChartWrapper}>
                <LineChart
                  data={lineData}
                  width={Math.max(screenWidth - 80, lineData.length * 50)}
                  height={280}
                  maxValue={Math.max(...chartData.values) * 1.25}
                  spacing={lineData.length > 10 ? 40 : 50}
                  initialSpacing={20}
                  endSpacing={30}
                  color={Colors.aquaTechBlue}
                  thickness={3}
                  curved
                  hideDataPoints={false}
                  dataPointsRadius={6}
                  dataPointsColor={Colors.aquaTechBlue}
                  textShiftY={-18}
                  textShiftX={-5}
                  textFontSize={12}
                  textColor={Colors.deepSecurityBlue}
                  showVerticalLines
                  verticalLinesColor={Colors.border}
                  xAxisColor={Colors.border}
                  yAxisColor={Colors.border}
                  yAxisTextStyle={{ color: Colors.textSecondary, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: Colors.textSecondary, fontSize: 10 }}
                  isAnimated
                  animationDuration={1800}
                  animateOnDataChange
                  onDataChangeAnimationDuration={1200}
                  animationBeginFromIndex={0}
                  pointerConfig={{
                    pointerStripHeight: 200,
                    pointerStripColor: Colors.deepSecurityBlue,
                    pointerStripWidth: 2,
                    pointerColor: Colors.deepSecurityBlue,
                    radius: 6,
                    pointerLabelWidth: 100,
                    pointerLabelHeight: 90,
                    activatePointersOnLongPress: false,
                    autoAdjustPointerLabelPosition: true,
                    pointerLabelComponent: (items: any) => {
                      return (
                        <View style={styles.tooltipContainer}>
                          <Text style={styles.tooltipLabel}>{items[0].label}</Text>
                          <Text style={styles.tooltipValue}>{items[0].value}</Text>
                        </View>
                      );
                    },
                  }}
                />
              </View>
            </ScrollView>
          </Animated.View>
        );
      
      case 'area':
        return (
          <Animated.View 
            style={[
              styles.chartContainer, 
              createNeumorphicCard({ size: 'large' }),
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, NeumorphicTextStyles.subheading]}>
                {selectedDataset === 'sites' ? 'Danger Level Trend' : selectedDataset === 'readings' ? 'Water Level Trend' : 'Data Trend'}
              </Text>
              <Text style={styles.chartHelperText}>Swipe left/right • Long press for details</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={styles.giftedChartWrapper}>
                <LineChart
                  data={lineData}
                  width={Math.max(screenWidth - 80, lineData.length * 50)}
                  height={280}
                  maxValue={Math.max(...chartData.values) * 1.25}
                  spacing={lineData.length > 10 ? 40 : 50}
                  initialSpacing={20}
                  endSpacing={30}
                  color={Colors.aquaTechBlue}
                  thickness={3}
                  startFillColor={Colors.aquaTechBlue}
                  endFillColor={Colors.softLightGrey}
                  startOpacity={0.6}
                  endOpacity={0.3}
                  areaChart={true}
                  curved
                  hideDataPoints={false}
                  dataPointsRadius={6}
                  dataPointsColor={Colors.aquaTechBlue}
                  textShiftY={-18}
                  textShiftX={-5}
                  textFontSize={12}
                  textColor={Colors.deepSecurityBlue}
                  showVerticalLines
                  verticalLinesColor={Colors.border}
                  xAxisColor={Colors.border}
                  yAxisColor={Colors.border}
                  yAxisTextStyle={{ color: Colors.textSecondary, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: Colors.textSecondary, fontSize: 10 }}
                  isAnimated
                  animationDuration={1800}
                  animateOnDataChange
                  onDataChangeAnimationDuration={1200}
                  animationBeginFromIndex={0}
                  pointerConfig={{
                    pointerStripHeight: 200,
                    pointerStripColor: Colors.deepSecurityBlue,
                    pointerStripWidth: 2,
                    pointerColor: Colors.deepSecurityBlue,
                    radius: 6,
                    pointerLabelWidth: 100,
                    pointerLabelHeight: 90,
                    activatePointersOnLongPress: false,
                    autoAdjustPointerLabelPosition: true,
                    pointerLabelComponent: (items: any) => {
                      return (
                        <View style={styles.tooltipContainer}>
                          <Text style={styles.tooltipLabel}>{items[0].label}</Text>
                          <Text style={styles.tooltipValue}>{items[0].value}</Text>
                        </View>
                      );
                    },
                  }}
                />
              </View>
            </ScrollView>
          </Animated.View>
        );
      
      case 'bar':
      case 'stackedBar':
        return (
          <View style={[styles.chartContainer, createNeumorphicCard({ size: 'large' })]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, NeumorphicTextStyles.subheading]}>
                {selectedDataset === 'sites' ? 'Danger Level Distribution' : selectedDataset === 'readings' ? 'Water Level Distribution' : 'Data Distribution'}
              </Text>
              <Text style={styles.chartHelperText}>Swipe to view all bars</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={styles.giftedChartWrapper}>
                <BarChart
                  data={barData}
                  width={Math.max(screenWidth - 80, barData.length * 50)}
                  height={220}
                  barWidth={barData.length > 10 ? 30 : 40}
                  spacing={barData.length > 10 ? 20 : 30}
                  initialSpacing={20}
                  yAxisThickness={1}
                  xAxisThickness={1}
                  yAxisColor={Colors.border}
                  xAxisColor={Colors.border}
                  yAxisTextStyle={{ color: Colors.textSecondary, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: Colors.textSecondary, fontSize: 10, width: 60 }}
                  noOfSections={5}
                  showVerticalLines
                  verticalLinesColor={Colors.border}
                  isAnimated
                  animationDuration={600}
                  animateOnDataChange
                  onDataChangeAnimationDuration={400}
                  cappedBars={selectedChart === 'stackedBar'}
                  capThickness={selectedChart === 'stackedBar' ? 4 : 0}
                />
              </View>
            </ScrollView>
          </View>
        );
      
      default:
        return null;
    }
  };

  const renderDatasetButtons = () => (
    <View style={[styles.exportSection, createNeumorphicCard({ size: 'medium' })]}>
      <Text style={[styles.sectionTitle, NeumorphicTextStyles.subheading]}>📊 View Dataset Charts</Text>
      <Text style={styles.exportDescription}>
        Click to view detailed charts for specific datasets
      </Text>
      
      <View style={styles.exportButtons}>
        <TouchableOpacity
          style={[
            styles.exportButton,
            createNeumorphicButton('primary', { size: 'large', borderRadius: 12 }),
            selectedDataset === 'sites' && styles.datasetButtonActive,
          ]}
          onPress={() => handleDatasetChange('sites')}
          disabled={loading}
        >
          {loading && selectedDataset === 'sites' ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Text style={styles.exportButtonIcon}>🗺️</Text>
              <Text style={styles.exportButtonText}>Monitoring Sites</Text>
              <Text style={styles.exportButtonSubtext}>
                {selectedDataset === 'sites' ? 'Currently Viewing' : 'View charts & analysis'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.exportButton,
            createNeumorphicButton('secondary', { size: 'large', borderRadius: 12 }),
            selectedDataset === 'readings' && styles.datasetButtonActive,
          ]}
          onPress={() => handleDatasetChange('readings')}
          disabled={loading}
        >
          {loading && selectedDataset === 'readings' ? (
            <ActivityIndicator color={Colors.aquaTechBlue} size="small" />
          ) : (
            <>
              <Text style={styles.exportButtonIcon}>📊</Text>
              <Text style={styles.exportButtonText}>Water Level Readings</Text>
              <Text style={styles.exportButtonSubtext}>
                {selectedDataset === 'readings' ? 'Currently Viewing' : 'View charts & analysis'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, createNeumorphicCard({ size: 'medium' })]}>
        <TouchableOpacity onPress={handleBackNavigation} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, NeumorphicTextStyles.heading]}>
            {selectedDataset === 'sites' 
              ? 'Monitoring Sites' 
              : selectedDataset === 'readings' 
              ? 'Water Level Readings' 
              : 'Analytics Dashboard'}
          </Text>
          <Text style={[styles.headerSubtitle, NeumorphicTextStyles.caption]}>
            Data Insights & Export
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.aquaTechBlue]}
            tintColor={Colors.aquaTechBlue}
          />
        }
      >
        <Animated.View style={{ opacity: dashboardFadeAnim }}>
        {viewMode === 'dashboard' ? (
          <>
            {/* Dataset Selection Buttons */}
            {renderDatasetButtons()}

            {/* Statistics Cards */}
            <View style={styles.statsGrid}>
          {renderStatCard('Total Sites', stats.totalSites, '🏗️', Colors.aquaTechBlue)}
          {renderStatCard('Total Readings', stats.totalReadings, '📊', Colors.deepSecurityBlue)}
          {renderStatCard('Danger Alerts', stats.dangerSites, '🚨', Colors.criticalRed)}
          {renderStatCard('Warnings', stats.warningSites, '⚠️', Colors.warningYellow)}
        </View>
          </>
        ) : (
          <>
            {/* Chart Type Selector */}
            {renderChartTypeSelector()}

            {/* Chart Selection Modal */}
            {renderChartSelectionModal()}

            {/* Chart Display */}
            {renderChart()}
          </>
        )}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backIcon: {
    fontSize: 24,
    color: Colors.deepSecurityBlue,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: (screenWidth - 48) / 2,
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  avgCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  avgLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  avgValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.aquaTechBlue,
  },
  chartSelector: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
    marginBottom: 12,
  },
  chartButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chartButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  chartButtonActive: {
    backgroundColor: Colors.aquaTechBlue,
    borderColor: Colors.aquaTechBlue,
  },
  chartButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  chartButtonTextActive: {
    color: Colors.white,
  },
  chartContainer: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
    minHeight: 300,
  },
  chartHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
    marginBottom: 4,
    textAlign: 'center',
  },
  chartHelperText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noDataText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 60,
  },
  lineChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 220,
    paddingTop: 20,
  },
  lineChartColumn: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  linePointWrapper: {
    height: 180,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  linePoint: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    position: 'relative',
  },
  linePointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.aquaTechBlue,
    borderWidth: 2,
    borderColor: Colors.white,
    position: 'absolute',
    top: -4,
  },
  lineConnector: {
    width: 30,
    height: 2,
    backgroundColor: Colors.aquaTechBlue,
    position: 'absolute',
    left: 8,
    top: -2,
  },
  chartValue: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  barChartScrollView: {
    maxHeight: 220,
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
    paddingHorizontal: 10,
  },
  graphScrollView: {
    maxHeight: 240,
  },
  graphChart: {
    paddingHorizontal: 10,
  },
  graphWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 220,
    paddingVertical: 20,
  },
  graphColumn: {
    alignItems: 'center',
    width: 60,
    marginHorizontal: 5,
  },
  graphPointWrapper: {
    height: 180,
    width: '100%',
    position: 'relative',
    marginBottom: 8,
  },
  graphPoint: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.white,
    zIndex: 2,
  },
  graphLine: {
    position: 'absolute',
    width: 60,
    left: 5,
    top: 5,
    opacity: 0.6,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  barWrapper: {
    height: 170,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  bar: {
    width: '80%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 4,
  },
  barValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.white,
  },
  chartLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  pieChart: {
    alignItems: 'center',
  },
  pieCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
    backgroundColor: Colors.border,
    marginBottom: 20,
  },
  pieSlice: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  pieSegment: {
    flex: 1,
  },
  pieLegend: {
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
    transition: 'all 0.3s ease',
  },
  legendItemFocused: {
    backgroundColor: Colors.softLightGrey,
    shadowColor: Colors.deepSecurityBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  legendTextFocused: {
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
  },
  pieChartContainer: {
    position: 'relative',
    width: '100%',
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    overflow: 'hidden',
  },
  pieChartCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dynamicPinContainer: {
    position: 'absolute',
    width: 10,
    height: 10,
    zIndex: 10,
  },
  dynamicPinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.white,
    position: 'absolute',
    left: -5,
    top: -5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  dynamicPinLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: Colors.deepSecurityBlue,
    opacity: 0.6,
    left: 0,
    top: 0,
  },
  dynamicLabelBox: {
    position: 'absolute',
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderRadius: 10,
    padding: 12,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: Colors.deepSecurityBlue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  labelName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
    marginBottom: 4,
    textAlign: 'center',
  },
  labelValue: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  exportSection: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  exportDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  exportButtons: {
    gap: 12,
  },
  exportButton: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  exportButtonSubtext: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.9,
  },
  datasetButtonActive: {
    borderWidth: 3,
    borderColor: Colors.validationGreen,
  },
  chartsViewHeader: {
    padding: 20,
    marginTop: 0,
    marginBottom: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  backToChartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 12,
  },
  backToChartText: {
    fontSize: 16,
    color: Colors.deepSecurityBlue,
    marginLeft: 8,
    fontWeight: '600',
  },
  chartsViewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
    textAlign: 'center',
  },
  giftedChartWrapper: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  centerLabelText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  centerLabelName: {
    fontSize: 13,
    color: Colors.deepSecurityBlue,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  centerLabelValue: {
    fontSize: 24,
    color: Colors.aquaTechBlue,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  centerLabelCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  legendContainer: {
    marginTop: 10,
    width: '100%',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  barTopLabel: {
    fontSize: 10,
    color: Colors.deepSecurityBlue,
    fontWeight: 'bold',
  },
  tooltipContainer: {
    backgroundColor: Colors.deepSecurityBlue,
    padding: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  tooltipLabel: {
    fontSize: 10,
    color: Colors.white,
    marginBottom: 4,
  },
  tooltipValue: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: 'bold',
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    flex: 1,
  },
  selectButtonArrow: {
    fontSize: 16,
    color: Colors.white,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: Colors.softLightGrey,
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 20,
    color: Colors.deepSecurityBlue,
    fontWeight: 'bold',
  },
  modalScroll: {
    maxHeight: 500,
  },
  chartTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chartTypeCard: {
    width: '48%',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 140,
    position: 'relative',
  },
  chartTypeCardActive: {
    borderWidth: 3,
    borderColor: Colors.aquaTechBlue,
    backgroundColor: Colors.white,
  },
  chartTypeIcon: {
    fontSize: 40,
    marginBottom: 8,
  },

  chartTypeLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
    textAlign: 'center',
    marginBottom: 6,
  },
  chartTypeLabelActive: {
    color: Colors.aquaTechBlue,
  },
  chartTypeDescription: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.validationGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedBadgeText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: 'bold',
  },
});

export default DashboardScreen;
