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
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { PieChart, BarChart, LineChart } from 'react-native-gifted-charts';
import { Colors } from '../lib/colors';
import SafeScreen from '../components/SafeScreen';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { Profile } from '../types/profile';
import { MonitoringSitesService } from '../services/monitoringSitesService';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import ViewShot from 'react-native-view-shot';

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
  const chartViewRef = useRef<ViewShot>(null);
  const pieChartRefs = useRef<{[key: number]: View | null}>({}).current;
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, chartName: '' });
  
  // Profile is used for user context
  console.log('Dashboard loaded for user:', profile.id);
  const [selectedChart, setSelectedChart] = useState<ChartType>('pie');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [focusedPieIndex, setFocusedPieIndex] = useState<{[key: number]: number}>({});
  
  // Time period filter states
  const [timePeriod, setTimePeriod] = useState<'1week' | '1month' | 'custom'>('1month');
  const [timePeriodModalVisible, setTimePeriodModalVisible] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [availableDateRange, setAvailableDateRange] = useState<{ min: Date | null; max: Date | null }>({ min: null, max: null });
  const [currentPieChartPage, setCurrentPieChartPage] = useState(0); // For navigating between pie charts
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
  }, [selectedChart, stats, selectedDataset, timePeriod, customStartDate, customEndDate]);

  // Reset pie chart page when dataset changes
  useEffect(() => {
    setCurrentPieChartPage(0);
  }, [selectedDataset]);

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
      // Fetch monitoring sites using service
      const sites = await MonitoringSitesService.getAllSites();

      // Fetch water level readings using service
      const readings = await MonitoringSitesService.getAllReadings(100);

      // Calculate statistics
      const dangerCount = sites?.filter(site => {
        const latestReading = readings?.find(r => r.site_id === site.id);
        return latestReading && site.danger_level && latestReading.predicted_water_level >= site.danger_level;
      }).length || 0;

      const warningCount = sites?.filter(site => {
        const latestReading = readings?.find(r => r.site_id === site.id);
        return latestReading && site.warning_level && site.danger_level &&
               latestReading.predicted_water_level >= site.warning_level &&
               latestReading.predicted_water_level < site.danger_level;
      }).length || 0;

      const avgLevel = readings && readings.length > 0
        ? readings.reduce((sum, r) => sum + (r.predicted_water_level || 0), 0) / readings.length
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

  const getDateRange = (): { startDate: Date; endDate: Date } => {
    const now = new Date();
    const endDate = new Date();
    let startDate = new Date();

    switch (timePeriod) {
      case '1week':
        startDate.setDate(now.getDate() - 7);
        break;
      case '1month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          return { startDate: customStartDate, endDate: customEndDate };
        }
        // Fallback to 1 month if custom dates not set
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    return { startDate, endDate };
  };

  const filterDataByDateRange = (data: any[], dateField: string = 'submission_timestamp') => {
    const { startDate, endDate } = getDateRange();
    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const generateChartData = async (chartType: ChartType, dataset: 'overview' | 'sites' | 'readings') => {
    setChartLoading(true);
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.9);
    
    try {
      if (dataset === 'sites') {
        // Monitoring Sites data using service
        const allSites = await MonitoringSitesService.getAllSites();
        
        // Note: Sites don't have timestamps in the same way readings do
        // If you need time-based filtering for sites, you'll need to add a date field to sites
        // For now, we'll use all sites but you can limit the data shown
        const sites = allSites.slice(0, 20);

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
        // Water Level Readings data using service
        const allReadings = await MonitoringSitesService.getAllReadings(100);
        
        // Filter by date range
        const filteredReadings = filterDataByDateRange(allReadings || []);
        const readings = filteredReadings.slice(0, 15);
        
        // Debug: Log filtering results
        console.log(`Time Period: ${timePeriod}`);
        console.log(`All Readings: ${allReadings?.length || 0}`);
        console.log(`Filtered Readings: ${filteredReadings.length}`);
        console.log(`Date Range:`, getDateRange());
        
        // Update available date range for custom picker
        if (allReadings && allReadings.length > 0) {
          const dates = allReadings.map(r => new Date(r.submission_timestamp));
          setAvailableDateRange({
            min: new Date(Math.min(...dates.map(d => d.getTime()))),
            max: new Date(Math.max(...dates.map(d => d.getTime())))
          });
        }

        if (!readings || readings.length === 0) {
          setChartData({ labels: [], values: [] });
          console.log('No readings found after filtering');
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
              values: readings.map(r => r.predicted_water_level || 0),
              colors: readings.map(r => 
                (r.predicted_water_level || 0) > 1000 ? Colors.criticalRed :
                (r.predicted_water_level || 0) > 500 ? Colors.warningYellow :
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
            const dangerReadings = readings.filter(r => (r.predicted_water_level || 0) > 1000).length;
            const warningReadings = readings.filter(r => (r.predicted_water_level || 0) > 500 && (r.predicted_water_level || 0) <= 1000).length;
            const normalReadings = readings.filter(r => (r.predicted_water_level || 0) <= 500).length;
            
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
            
            // Sort water level status data by value
            const statusData = [
              { label: 'Danger', value: dangerReadings, color: Colors.criticalRed },
              { label: 'Warning', value: warningReadings, color: Colors.warningYellow },
              { label: 'Normal', value: normalReadings, color: Colors.validationGreen },
            ].sort((a, b) => b.value - a.value);
            
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
                  labels: statusData.map(d => d.label),
                  values: statusData.map(d => d.value),
                  colors: statusData.map(d => d.color),
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
        // Overview data (default) using service
        const readings = await MonitoringSitesService.getAllReadings(10);

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
              values: readings.map(r => r.predicted_water_level || 0),
              colors: readings.map(r => 
                (r.predicted_water_level || 0) > 1000 ? Colors.criticalRed :
                (r.predicted_water_level || 0) > 500 ? Colors.warningYellow :
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
              const level = r.predicted_water_level || 0;
              if (level > 1000) statusCounts.danger++;
              else if (level > 500) statusCounts.warning++;
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

  // const handleBackToDashboard = () => {
  //   setViewMode('dashboard');
  //   setSelectedDataset('overview');
  //   setChartData(null);
  // };

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

  const getStatIcon = (title: string) => {
    switch (title) {
      case 'Total Sites':
        return 'location-on';
      case 'Total Readings':
        return 'analytics';
      case 'Danger Alerts':
        return 'warning';
      case 'Warnings':
        return 'error-outline';
      default:
        return 'info';
    }
  };

  const renderStatCard = (title: string, value: string | number, _iconName: string, color: string) => (
    <View style={[styles.statCard, createNeumorphicCard({ size: 'small' })]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={getStatIcon(title)} size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{title}</Text>
    </View>
  );

  const chartTypes: Array<{ type: ChartType; icon: string; label: string; description: string }> = [
    { type: 'pie', icon: 'pie-chart', label: 'Pie Chart', description: 'Show data as portions of a whole' },
    { type: 'donut', icon: 'donut-large', label: 'Donut Chart', description: 'Ring-shaped pie chart' },
    { type: 'line', icon: 'show-chart', label: 'Line Chart', description: 'Display trends over time' },
    { type: 'area', icon: 'area-chart', label: 'Area Chart', description: 'Filled line chart' },
    { type: 'bar', icon: 'bar-chart', label: 'Bar Chart', description: 'Compare values side by side' },
    { type: 'stackedBar', icon: 'stacked-bar-chart', label: 'Stacked Bar', description: 'Layered bar comparison' },
  ];

  const getTimePeriodLabel = () => {
    const { startDate, endDate } = getDateRange();
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    
    switch (timePeriod) {
      case '1week':
        return `📅 Last 1 Week (${formatDate(startDate)} - ${formatDate(endDate)})`;
      case '1month':
        return `📅 Last 1 Month (${formatDate(startDate)} - ${formatDate(endDate)})`;
      case 'custom':
        if (customStartDate && customEndDate) {
          return `📅 ${formatDate(customStartDate)} - ${formatDate(customEndDate)}`;
        }
        return '📅 Custom Range';
    }
  };

  const renderChartControls = () => (
    <View style={[styles.chartControlsBar, createNeumorphicCard({ size: 'small' })]}>
      {/* Chart Type Selector */}
      <TouchableOpacity
        style={styles.controlButton}
        onPress={() => setChartModalVisible(true)}
      >
        <View style={styles.controlButtonContent}>
          <MaterialIcons name="bar-chart" size={20} color={Colors.aquaTechBlue} />
          <View style={styles.controlButtonTextContainer}>
            <Text style={styles.controlButtonLabel}>Chart</Text>
            <Text style={styles.controlButtonValue} numberOfLines={1}>{selectedChart.charAt(0).toUpperCase() + selectedChart.slice(1)}</Text>
          </View>
          <MaterialIcons name="arrow-drop-down" size={20} color={Colors.textSecondary} />
        </View>
      </TouchableOpacity>

      <View style={styles.controlDivider} />

      {/* Time Period Selector */}
      <TouchableOpacity
        style={styles.controlButton}
        onPress={() => setTimePeriodModalVisible(true)}
      >
        <View style={styles.controlButtonContent}>
          <MaterialIcons name="access-time" size={20} color={Colors.aquaTechBlue} />
          <View style={styles.controlButtonTextContainer}>
            <Text style={styles.controlButtonLabel}>Period</Text>
            <Text style={styles.controlButtonValue} numberOfLines={1}>
              {timePeriod === '1week' ? '1 Week' : timePeriod === '1month' ? '1 Month' : 'Custom'}
            </Text>
          </View>
          <MaterialIcons name="arrow-drop-down" size={20} color={Colors.textSecondary} />
        </View>
      </TouchableOpacity>

      <View style={styles.controlDivider} />

      {/* Export Button */}
      <TouchableOpacity
        style={styles.controlButtonExport}
        onPress={exportChartToPDF}
        disabled={isExporting || !chartData || chartData.values.length === 0}
      >
        {isExporting ? (
          <ActivityIndicator size="small" color={Colors.aquaTechBlue} />
        ) : (
          <MaterialIcons name="file-download" size={24} color={Colors.aquaTechBlue} />
        )}
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
                  <MaterialIcons 
                    name={chart.icon as any} 
                    size={40} 
                    color={selectedChart === chart.type ? Colors.aquaTechBlue : Colors.deepSecurityBlue}
                    style={styles.chartTypeIconSvg}
                  />
                  <Text style={[
                    styles.chartTypeLabel,
                    selectedChart === chart.type && styles.chartTypeLabelActive,
                  ]}>
                    {chart.label}
                  </Text>
                  <Text style={styles.chartTypeDescription}>{chart.description}</Text>
                  {selectedChart === chart.type && (
                    <View style={styles.selectedBadge}>
                      <MaterialIcons name="check-circle" size={16} color={Colors.white} />
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

  const renderTimePeriodModal = () => (
    <Modal
      visible={timePeriodModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setTimePeriodModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.timePeriodModalContent, createNeumorphicCard({ size: 'medium' })]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Time Period</Text>
            <TouchableOpacity onPress={() => setTimePeriodModalVisible(false)} style={styles.modalCloseButton}>
              <MaterialIcons name="close" size={24} color={Colors.deepSecurityBlue} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.timePeriodOptionsNew}>
            <TouchableOpacity
              style={[
                styles.periodOptionButton,
                timePeriod === '1week' && styles.periodOptionButtonActive,
              ]}
              onPress={() => {
                setTimePeriod('1week');
                setTimePeriodModalVisible(false);
              }}
            >
              <MaterialIcons 
                name="date-range" 
                size={24} 
                color={timePeriod === '1week' ? Colors.white : Colors.deepSecurityBlue} 
              />
              <View style={styles.periodOptionTextContainer}>
                <Text style={[styles.periodOptionTitle, timePeriod === '1week' && styles.periodOptionTitleActive]}>
                  Last 1 Week
                </Text>
                <Text style={[styles.periodOptionSubtitle, timePeriod === '1week' && styles.periodOptionSubtitleActive]}>
                  Past 7 days
                </Text>
              </View>
              {timePeriod === '1week' && (
                <MaterialIcons name="check-circle" size={20} color={Colors.white} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.periodOptionButton,
                timePeriod === '1month' && styles.periodOptionButtonActive,
              ]}
              onPress={() => {
                setTimePeriod('1month');
                setTimePeriodModalVisible(false);
              }}
            >
              <MaterialIcons 
                name="calendar-today" 
                size={24} 
                color={timePeriod === '1month' ? Colors.white : Colors.deepSecurityBlue} 
              />
              <View style={styles.periodOptionTextContainer}>
                <Text style={[styles.periodOptionTitle, timePeriod === '1month' && styles.periodOptionTitleActive]}>
                  Last 1 Month
                </Text>
                <Text style={[styles.periodOptionSubtitle, timePeriod === '1month' && styles.periodOptionSubtitleActive]}>
                  Past 30 days
                </Text>
              </View>
              {timePeriod === '1month' && (
                <MaterialIcons name="check-circle" size={20} color={Colors.white} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.periodOptionButton,
                timePeriod === 'custom' && styles.periodOptionButtonActive,
              ]}
              onPress={() => {
                setTimePeriod('custom');
              }}
            >
              <MaterialIcons 
                name="event" 
                size={24} 
                color={timePeriod === 'custom' ? Colors.white : Colors.deepSecurityBlue} 
              />
              <View style={styles.periodOptionTextContainer}>
                <Text style={[styles.periodOptionTitle, timePeriod === 'custom' && styles.periodOptionTitleActive]}>
                  Custom Range
                </Text>
                <Text style={[styles.periodOptionSubtitle, timePeriod === 'custom' && styles.periodOptionSubtitleActive]}>
                  Select dates
                </Text>
              </View>
              {timePeriod === 'custom' && (
                <MaterialIcons name="check-circle" size={20} color={Colors.white} />
              )}
            </TouchableOpacity>

            {timePeriod === 'custom' && (
              <View style={styles.customDateSection}>
                <View style={styles.customDateHeader}>
                  <MaterialIcons name="event-note" size={20} color={Colors.deepSecurityBlue} />
                  <Text style={styles.customDateHeaderText}>Choose Dates</Text>
                </View>

                {availableDateRange.min && availableDateRange.max && (
                  <View style={styles.dateInfoBanner}>
                    <MaterialIcons name="info-outline" size={16} color="#6366F1" />
                    <Text style={styles.dateInfoText}>
                      Data available from {availableDateRange.min.toLocaleDateString()} to {availableDateRange.max.toLocaleDateString()}
                    </Text>
                  </View>
                )}

                <View style={styles.dateSelectorsRow}>
                  <View style={styles.dateSelector}>
                    <Text style={styles.dateSelectorLabel}>Start Date</Text>
                    <TouchableOpacity
                      style={styles.dateSelectorButton}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <MaterialIcons name="event" size={20} color={Colors.aquaTechBlue} />
                      <Text style={styles.dateSelectorText}>
                        {customStartDate ? customStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <MaterialIcons name="arrow-forward" size={24} color={Colors.textSecondary} style={{ marginTop: 28 }} />

                  <View style={styles.dateSelector}>
                    <Text style={styles.dateSelectorLabel}>End Date</Text>
                    <TouchableOpacity
                      style={styles.dateSelectorButton}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <MaterialIcons name="event" size={20} color={Colors.aquaTechBlue} />
                      <Text style={styles.dateSelectorText}>
                        {customEndDate ? customEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {customStartDate && customEndDate && (
                  <TouchableOpacity
                    style={styles.applyCustomButton}
                    onPress={() => {
                      if (customStartDate > customEndDate) {
                        Alert.alert('Invalid Range', 'Start date must be before end date');
                        return;
                      }
                      if (availableDateRange.min && customStartDate < availableDateRange.min) {
                        const minDateStr = availableDateRange.min.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        Alert.alert('Invalid Date', `Start date must be on or after ${minDateStr}`);
                        return;
                      }
                      if (availableDateRange.max && customEndDate > availableDateRange.max) {
                        const maxDateStr = availableDateRange.max.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        Alert.alert('Invalid Date', `End date must be on or before ${maxDateStr}`);
                        return;
                      }
                      setTimePeriodModalVisible(false);
                    }}
                  >
                    <MaterialIcons name="check" size={20} color={Colors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.applyCustomButtonText}>Apply Custom Range</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* DateTimePicker for Start Date */}
          {showStartDatePicker && (
            <DateTimePicker
              value={customStartDate || availableDateRange.min || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              {...(availableDateRange.min && { minimumDate: availableDateRange.min })}
              maximumDate={customEndDate || availableDateRange.max || new Date()}
              onChange={(event, selectedDate) => {
                setShowStartDatePicker(false);
                if (event.type === 'set' && selectedDate) {
                  // Ensure selected date is within available range
                  if (availableDateRange.min && selectedDate < availableDateRange.min) {
                    Alert.alert('Invalid Date', 'Selected date is before the earliest available data');
                    return;
                  }
                  if (availableDateRange.max && selectedDate > availableDateRange.max) {
                    Alert.alert('Invalid Date', 'Selected date is after the latest available data');
                    return;
                  }
                  setCustomStartDate(selectedDate);
                }
              }}
            />
          )}

          {/* DateTimePicker for End Date */}
          {showEndDatePicker && (
            <DateTimePicker
              value={customEndDate || availableDateRange.max || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              {...((customStartDate || availableDateRange.min) && { minimumDate: (customStartDate || availableDateRange.min) as Date })}
              maximumDate={availableDateRange.max || new Date()}
              onChange={(event, selectedDate) => {
                setShowEndDatePicker(false);
                if (event.type === 'set' && selectedDate) {
                  // Ensure selected date is within available range
                  if (customStartDate && selectedDate < customStartDate) {
                    Alert.alert('Invalid Date', 'End date must be after start date');
                    return;
                  }
                  if (availableDateRange.max && selectedDate > availableDateRange.max) {
                    Alert.alert('Invalid Date', 'Selected date is after the latest available data');
                    return;
                  }
                  setCustomEndDate(selectedDate);
                }
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  // Helper function to generate chart data synchronously for PDF export
  const exportChartToPDF = async () => {
    try {
      setIsExporting(true);
      
      console.log('[PDF Export] Starting PDF generation with chart screenshots');

      // Calculate actual date range
      const getActualDateRange = () => {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;

        if (timePeriod === '1week') {
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return {
            start: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            end: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          };
        } else if (timePeriod === '1month') {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return {
            start: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            end: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          };
        } else if (timePeriod === 'custom' && customStartDate && customEndDate) {
          return {
            start: customStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            end: customEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          };
        }
        return {
          start: 'N/A',
          end: 'N/A'
        };
      };

      const dateRange = getActualDateRange();

      // Store current chart and pie chart page
      const originalChartType = selectedChart;
      const originalPieChartPage = currentPieChartPage;

      // Base chart types (excluding area and donut as requested)
      const baseChartTypes: ChartType[] = ['pie', 'line', 'bar', 'stackedBar'];
      const chartImagesArray: Array<{ type: ChartType; label: string; image: string; data: any }> = [];
      
      // Calculate total charts to capture
      // For 'pie', we'll capture each page separately
      let totalChartsToCapture = baseChartTypes.length - 1; // Start with non-pie charts
      
      // Generate data to check how many pie charts exist
      await generateChartData('pie', selectedDataset);
      await new Promise(resolve => setTimeout(resolve, 500));
      const pieChartCount = chartData?.pieCharts?.length || 1;
      totalChartsToCapture += pieChartCount; // Add pie chart pages
      
      // Set total for progress modal
      setExportProgress({ current: 0, total: totalChartsToCapture, chartName: '' });

      let capturedCount = 0;

      // Capture each chart type
      for (let i = 0; i < baseChartTypes.length; i++) {
        const chartType = baseChartTypes[i];
        
        // Special handling for pie charts - capture each page separately
        if (chartType === 'pie') {
          // Switch to pie chart and generate data
          setSelectedChart('pie');
          await generateChartData('pie', selectedDataset);
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const pieChartsData = chartData?.pieCharts || [];
          
          // Capture each pie chart page
          for (let pieIndex = 0; pieIndex < pieChartsData.length; pieIndex++) {
            const pieChartInfo = pieChartsData[pieIndex];
            const pieLabel = pieChartInfo.title || `Pie Chart ${pieIndex + 1}`;
            
            try {
              capturedCount++;
              console.log(`[PDF Export] Processing pie chart ${pieIndex + 1}/${pieChartsData.length}: ${pieLabel}`);
              
              // Update progress
              setExportProgress({ 
                current: capturedCount, 
                total: totalChartsToCapture, 
                chartName: pieLabel 
              });
              
              // Switch to this pie chart page
              setCurrentPieChartPage(pieIndex);
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              // Capture screenshot
              if (chartViewRef.current && chartViewRef.current.capture) {
                console.log(`[PDF Export] Capturing ${pieLabel} screenshot...`);
                const imageUri = await chartViewRef.current.capture();
                
                // Read as base64
                const base64Image = await FileSystem.readAsStringAsync(imageUri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                
                console.log(`[PDF Export] ${pieLabel} captured - Size: ${(base64Image.length / 1024).toFixed(2)} KB`);
                
                // Sort pie chart data by value (same as displayed in chart)
                const combined = pieChartInfo.labels.map((label: string, idx: number) => ({
                  label,
                  value: pieChartInfo.values[idx],
                  color: pieChartInfo.colors[idx]
                }));
                combined.sort((a, b) => b.value - a.value);
                
                // Store with specific pie chart data (sorted to match visual chart)
                chartImagesArray.push({
                  type: 'pie',
                  label: pieLabel,
                  image: base64Image,
                  data: {
                    labels: combined.map(c => c.label),
                    values: combined.map(c => c.value),
                    colors: combined.map(c => c.color)
                  }
                });
              } else {
                console.error(`[PDF Export] chartViewRef not available for ${pieLabel}`);
              }
            } catch (error) {
              console.error(`[PDF Export] Error capturing ${pieLabel}:`, error);
            }
          }
        } else {
          // Handle other chart types normally
          const chartInfo = chartTypes.find(c => c.type === chartType);
          const chartLabel = chartInfo?.label || chartType;
          
          try {
            capturedCount++;
            console.log(`[PDF Export] Processing chart ${capturedCount}/${totalChartsToCapture}: ${chartLabel}`);
            
            // Update progress
            setExportProgress({ 
              current: capturedCount, 
              total: totalChartsToCapture, 
              chartName: chartLabel 
            });
            
            // Switch to this chart type - update state AND generate data
            setSelectedChart(chartType);
            await generateChartData(chartType, selectedDataset);
            
            // Wait for chart to render completely
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Capture screenshot with optimized quality for PDF
            if (chartViewRef.current && chartViewRef.current.capture) {
              console.log(`[PDF Export] Capturing ${chartLabel} screenshot...`);
              const imageUri = await chartViewRef.current.capture();
              
              // Read as base64 with compression
              const base64Image = await FileSystem.readAsStringAsync(imageUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              
              console.log(`[PDF Export] ${chartLabel} captured - Size: ${(base64Image.length / 1024).toFixed(2)} KB`);
              
              // Get chart data from current state (already loaded by generateChartData)
              const data = chartData ? {
                labels: chartData.labels || [],
                values: chartData.values || [],
                colors: chartData.colors || []
              } : { labels: [], values: [], colors: [] };
              
              chartImagesArray.push({
                type: chartType,
                label: chartLabel,
                image: base64Image,
                data: data
              });
            } else {
              console.error(`[PDF Export] chartViewRef not available for ${chartLabel}`);
            }
          } catch (error) {
            console.error(`[PDF Export] Error capturing ${chartLabel}:`, error);
          }
        }
      }
      
      console.log(`[PDF Export] Captured ${chartImagesArray.length} charts successfully`);
      
      // Update progress for PDF creation
      setExportProgress({ 
        current: totalChartsToCapture, 
        total: totalChartsToCapture, 
        chartName: 'Creating PDF document...' 
      });
      
      // Wait a bit for state update
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Restore original chart and pie chart page
      setSelectedChart(originalChartType);
      setCurrentPieChartPage(originalPieChartPage);
      await generateChartData(originalChartType, selectedDataset);

      // Generate HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                background-color: #ffffff;
                line-height: 1.5;
                color: #333;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
                background: #667eea;
                color: white;
                padding: 30px 20px;
                border-radius: 10px;
              }
              .header h1 {
                margin: 0;
                font-size: 36px;
                font-weight: bold;
                letter-spacing: 1px;
              }
              .header p {
                margin: 10px 0 0 0;
                font-size: 14px;
                opacity: 0.95;
              }
              .section {
                background: white;
                padding: 15px;
                margin-bottom: 15px;
                border-radius: 8px;
                page-break-inside: avoid;
                border: 1px solid #ddd;
              }
              .section-title {
                font-size: 22px;
                font-weight: bold;
                color: #667eea;
                margin-bottom: 18px;
                border-bottom: 3px solid #667eea;
                padding-bottom: 10px;
              }
              .chart-image-container {
                text-align: center;
                margin: 15px 0;
                padding: 10px;
                background: #f5f5f5;
                border-radius: 8px;
              }
              .chart-image {
                width: 100%;
                max-width: 800px;
                height: auto;
              }
              .chart-image-pie {
                width: 100%;
                max-width: 800px;
                height: auto;
                max-height: 900px;
              }
              .chart-title-section {
                text-align: center;
                margin-bottom: 20px;
              }
              .chart-title-section h2 {
                color: #667eea;
                margin: 0 0 8px 0;
                font-size: 28px;
                font-weight: bold;
              }
              .chart-subtitle {
                color: #666;
                font-size: 14px;
                font-style: italic;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 12px;
                padding: 12px 15px;
                background: #f8f9fa;
                border-radius: 6px;
                border-left: 4px solid #667eea;
              }
              .info-label {
                font-weight: bold;
                color: #555;
                font-size: 15px;
              }
              .info-value {
                color: #333;
                font-size: 15px;
                font-weight: 500;
              }
              .legend-section {
                margin-top: 20px;
                page-break-inside: avoid;
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                border: 2px solid #e0e0e0;
              }
              .legend-section h3 {
                color: #667eea;
                margin-bottom: 15px;
                font-size: 20px;
                font-weight: bold;
              }
              .legend-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
              }
              .legend-item {
                display: flex;
                align-items: center;
                padding: 12px;
                background: white;
                border-radius: 8px;
                border: 2px solid #e0e0e0;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
              }
              .legend-color-box {
                width: 24px;
                height: 24px;
                border-radius: 6px;
                margin-right: 12px;
                flex-shrink: 0;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              }
              .legend-info {
                flex: 1;
              }
              .legend-label {
                font-weight: bold;
                color: #333;
                font-size: 14px;
                margin-bottom: 4px;
              }
              .legend-value {
                color: #666;
                font-size: 13px;
              }
              .data-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.08);
                border-radius: 8px;
                overflow: hidden;
              }
              .data-table th {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 14px 12px;
                text-align: left;
                font-weight: bold;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .data-table td {
                padding: 12px;
                border-bottom: 1px solid #e0e0e0;
                font-size: 13px;
              }
              .data-table tr:nth-child(even) {
                background: #f8f9fa;
              }
              .data-table tr:hover {
                background: #e3f2fd;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                padding: 20px;
                color: #666;
                font-size: 12px;
                border-top: 2px solid #e0e0e0;
                page-break-inside: avoid;
              }
              .date-range-highlight {
                background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
                text-align: center;
                font-weight: bold;
                color: #1565c0;
                border: 3px solid #2196f3;
                font-size: 16px;
                box-shadow: 0 4px 8px rgba(33, 150, 243, 0.2);
              }
              .page-break {
                page-break-before: always;
                margin-top: 0;
              }
              .chart-page {
                display: flex;
                flex-direction: column;
                padding: 15px;
              }
              .stats-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
                margin-top: 15px;
              }
              .stat-box {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                box-shadow: 0 4px 10px rgba(102, 126, 234, 0.3);
              }
              .stat-box.danger {
                background: linear-gradient(135deg, #f44336 0%, #e53935 100%);
              }
              .stat-box.warning {
                background: linear-gradient(135deg, #ff9800 0%, #fb8c00 100%);
              }
              .stat-value {
                font-size: 32px;
                font-weight: bold;
                margin-bottom: 8px;
              }
              .stat-label {
                font-size: 14px;
                opacity: 0.95;
              }
              @media print {
                body {
                  padding: 20px;
                }
                .section {
                  page-break-inside: avoid;
                  margin-bottom: 15px;
                }
                .page-break {
                  page-break-before: always;
                }
                .chart-image {
                  max-height: 700px;
                }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>📊 HydroSnap Dashboard Report</h1>
              <p>Comprehensive Water Level Monitoring Analysis</p>
              <p>Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            <div class="section">
              <div class="section-title">📈 Report Information</div>
              <div class="info-row">
                <span class="info-label">Dataset:</span>
                <span class="info-value">${selectedDataset === 'sites' ? 'Monitoring Sites' : selectedDataset === 'readings' ? 'Water Level Readings' : 'Overview'}</span>
              </div>
              <div class="date-range-highlight">
                📅 Data Period: ${dateRange.start} to ${dateRange.end}
              </div>
              <div class="info-row">
                <span class="info-label">Total Charts:</span>
                <span class="info-value">${chartImagesArray.length} visualization types</span>
              </div>
              <div class="info-row">
                <span class="info-label">Chart Types Included:</span>
                <span class="info-value">Pie Charts (multiple categories), Line, Bar, Stacked Bar</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">📊 Key Statistics Summary</div>
              <div class="stats-grid">
                <div class="stat-box">
                  <div class="stat-value">${stats.totalSites}</div>
                  <div class="stat-label">Total Sites Monitored</div>
                </div>
                <div class="stat-box">
                  <div class="stat-value">${stats.totalReadings}</div>
                  <div class="stat-label">Total Readings</div>
                </div>
                <div class="stat-box danger">
                  <div class="stat-value">${stats.dangerSites}</div>
                  <div class="stat-label">⚠️ Danger Sites</div>
                </div>
                <div class="stat-box warning">
                  <div class="stat-value">${stats.warningSites}</div>
                  <div class="stat-label">⚡ Warning Sites</div>
                </div>
              </div>
              <div class="info-row" style="margin-top: 15px;">
                <span class="info-label">Average Water Level:</span>
                <span class="info-value">${stats.avgWaterLevel.toFixed(2)} meters</span>
              </div>
            </div>

            ${chartImagesArray.map((chartInfo, index) => `
              <div class="${index > 0 ? 'page-break' : ''}">
                <div class="section chart-page">
                  <div class="chart-title-section">
                    <h2>${chartInfo.label}</h2>
                    <p class="chart-subtitle">Chart ${index + 1} of ${chartImagesArray.length} • ${selectedDataset === 'sites' ? 'Site Analysis' : 'Reading Analysis'}</p>
                  </div>
                  
                  ${chartInfo.image ? `
                  <div class="chart-image-container">
                    <img src="data:image/png;base64,${chartInfo.image}" class="${chartInfo.type === 'pie' ? 'chart-image-pie' : 'chart-image'}" alt="${chartInfo.label}" />
                  </div>
                  ` : ''}
                  
                  ${chartInfo.data && chartInfo.data.labels && chartInfo.data.values ? `
                  <h3 style="color: #667eea; margin: 20px 0 15px 0; font-size: 20px; font-weight: bold;">📊 Data Values</h3>
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Category</th>
                        <th>Value</th>
                        <th>Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${chartInfo.data.labels.map((label: string, idx: number) => {
                        const value = chartInfo.data.values[idx];
                        const total = chartInfo.data.values.reduce((a: number, b: number) => a + b, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                        const color = chartInfo.data.colors?.[idx] || '#667eea';
                        return `
                        <tr style="border-left: 6px solid ${color};">
                          <td style="font-weight: bold;">${idx + 1}</td>
                          <td style="font-weight: 600;">${label}</td>
                          <td style="font-weight: bold;">${value}</td>
                          <td><strong>${percentage}%</strong></td>
                        </tr>
                        `;
                      }).join('')}
                      <tr style="background: #667eea; color: white; font-weight: bold;">
                        <td colspan="2">TOTAL</td>
                        <td>${chartInfo.data.values.reduce((a: number, b: number) => a + b, 0)}</td>
                        <td>100%</td>
                      </tr>
                    </tbody>
                  </table>
                  ` : ''}
                </div>
              </div>
            `).join('')}

            <div class="page-break">
              <div class="footer">
                <p style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">🌊 HydroSnap - Water Level Monitoring System</p>
                <p>This comprehensive report was automatically generated by HydroSnap Dashboard</p>
                <p>Report includes ${chartImagesArray.length} optimized chart visualizations with detailed data tables</p>
                <p style="margin-top: 10px; font-style: italic;">For more information, visit our website or contact support</p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Validate we have chart images before creating PDF
      if (chartImagesArray.length === 0) {
        throw new Error('No charts were captured. Please try again.');
      }

      const htmlSizeKB = htmlContent.length / 1024;
      console.log(`[PDF Export] Creating PDF with ${chartImagesArray.length} charts`);
      console.log(`[PDF Export] Total HTML size: ${htmlSizeKB.toFixed(2)} KB`);

      // Check if HTML is too large (warn if over 5MB)
      if (htmlSizeKB > 5120) {
        console.warn(`[PDF Export] HTML size is large (${htmlSizeKB.toFixed(2)} KB), PDF generation may fail`);
      }

      // Create PDF with error handling and extended timeout
      console.log(`[PDF Export] Starting PDF creation...`);
      const { uri } = await Promise.race([
        Print.printToFileAsync({ 
          html: htmlContent,
          base64: false
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('PDF generation timeout')), 120000)
        )
      ]);
      
      console.log(`[PDF Export] PDF created at: ${uri}`);
      
      // Share or save the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save or Share Chart Report',
          UTI: 'com.adobe.pdf'
        });
        Alert.alert('Success', 'PDF generated successfully!');
      } else {
        Alert.alert('Success', `PDF saved at: ${uri}`);
      }
    } catch (error: any) {
      console.log('[PDF Export] Failed - User will see error dialog');
      const errorMessage = error?.message || 'Unknown error occurred';
      
      if (errorMessage.includes('PDF data') || errorMessage.includes('writing the PDF')) {
        Alert.alert(
          'PDF Too Large', 
          'The PDF file size exceeds limits. The report has been optimized, but you can try:\n\n• Using a shorter time period\n• Exporting fewer data points\n• Reducing the dataset size',
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('timeout')) {
        Alert.alert(
          'Taking Too Long',
          'PDF generation is taking too long. Please try again or contact support if the issue persists.',
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('No charts')) {
        Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
      } else {
        Alert.alert(
          'Export Failed', 
          'Unable to generate PDF. Please try again or contact support if the issue persists.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsExporting(false);
    }
  };

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

        // Only show the selected chart based on currentPieChartPage
        const selectedPieChart = pieChartsToRender[currentPieChartPage] || pieChartsToRender[0];
        const chartIndex = currentPieChartPage;

        return (
          <ScrollView horizontal={false} showsVerticalScrollIndicator={false}>
            {[selectedPieChart].map((pieChartData) => {
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
                // const centerOffset = selectedChart === 'donut' ? 170 : 180;
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
                  ref={(ref: any) => { pieChartRefs[chartIndex] = ref; }}
                  style={[
                    styles.chartContainer,
                    isExporting ? { backgroundColor: '#FFFFFF', ...createNeumorphicCard({ size: 'large' }) } : {},
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
                        onPress={(_item: any, index: number) => {
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
              isExporting ? { backgroundColor: '#FFFFFF', ...createNeumorphicCard({ size: 'large' }) } : {},
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
              <Text style={styles.chartDataInfo}>
                {lineData.length} data points • {getTimePeriodLabel()}
              </Text>
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
              isExporting ? { backgroundColor: '#FFFFFF', ...createNeumorphicCard({ size: 'large' }) } : {},
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
              <Text style={styles.chartDataInfo}>
                {lineData.length} data points • {getTimePeriodLabel()}
              </Text>
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
          <View style={[styles.chartContainer, isExporting ? { backgroundColor: '#FFFFFF', ...createNeumorphicCard({ size: 'large' }) } : {}]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, NeumorphicTextStyles.subheading]}>
                {selectedDataset === 'sites' ? 'Danger Level Distribution' : selectedDataset === 'readings' ? 'Water Level Distribution' : 'Data Distribution'}
              </Text>
              <Text style={styles.chartDataInfo}>
                {barData.length} data points • {getTimePeriodLabel()}
              </Text>
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

  const renderExportProgressModal = () => (
    <Modal
      visible={isExporting}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.exportProgressOverlay}>
        <View style={[styles.exportProgressContent, createNeumorphicCard({ size: 'medium' })]}>
          <MaterialIcons name="picture-as-pdf" size={56} color={Colors.aquaTechBlue} />
          
          <Text style={styles.exportProgressTitle}>Generating PDF</Text>
          <Text style={styles.exportProgressSubtitle}>
            {exportProgress.chartName || 'Preparing charts...'}
          </Text>
          
          {exportProgress.total > 0 && (
            <>
              <View style={styles.exportProgressBarContainer}>
                <View 
                  style={[
                    styles.exportProgressBarFill,
                    { width: `${(exportProgress.current / exportProgress.total) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.exportProgressText}>
                {exportProgress.current} of {exportProgress.total} charts
              </Text>
            </>
          )}
          
          <ActivityIndicator 
            size="large" 
            color={Colors.aquaTechBlue} 
            style={{ marginTop: 16 }} 
          />
        </View>
      </View>
    </Modal>
  );

  const renderChartNavigation = () => {
    if (!chartData || !chartData.pieCharts) return null;

    const navItems = selectedDataset === 'sites' 
      ? [
          { id: 0, label: 'Types', icon: 'dashboard', color: '#667eea', desc: 'Site Types' },
          { id: 1, label: 'Rivers', icon: 'water', color: '#3b82f6', desc: 'River Sites' },
          { id: 2, label: 'Dams', icon: 'layers', color: '#06b6d4', desc: 'Reservoir/Dams' },
        ]
      : [
          { id: 0, label: 'Methods', icon: 'edit-note', color: '#8b5cf6', desc: 'Reading Methods' },
          { id: 1, label: 'Status', icon: 'warning', color: '#f59e0b', desc: 'Water Status' },
        ];

    // Filter only available charts based on pieCharts data
    const availableNavItems = navItems.filter(item => item.id < chartData.pieCharts!.length);

    if (availableNavItems.length <= 1) return null; // Don't show nav if only 1 chart

    return (
      <View style={styles.chartNavigationWrapper}>
        <View style={styles.chartNavigation}>
          {availableNavItems.map((item) => {
            const isActive = currentPieChartPage === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.chartNavItem,
                  isActive && styles.chartNavItemActive,
                ]}
                onPress={() => {
                  setCurrentPieChartPage(item.id);
                  // Scroll to the chart section if needed
                  if (pieChartRefs[item.id]) {
                    pieChartRefs[item.id]?.measureLayout(
                      pieChartRefs[0] as any,
                      (_x: number, y: number) => {
                        console.log(`Scroll to chart ${item.id} at position ${y}`);
                      },
                      () => console.log('Layout measurement failed')
                    );
                  }
                }}
              >
                <MaterialIcons
                  name={item.icon as any}
                  size={22}
                  color={isActive ? '#FFFFFF' : item.color}
                />
                <Text
                  style={[
                    styles.chartNavLabel,
                    isActive && styles.chartNavLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderDatasetButtons = () => (
    <View style={styles.datasetSection}>
      <View style={styles.datasetHeader}>
        <MaterialIcons name="insights" size={24} color={Colors.deepSecurityBlue} />
        <Text style={styles.datasetHeaderText}>Select Dataset</Text>
      </View>
      <Text style={styles.datasetDescription}>
        Choose a dataset to view detailed charts and analytics
      </Text>
      
      <View style={styles.datasetButtonsContainer}>
        <TouchableOpacity
          style={[
            styles.datasetButtonNew,
            createNeumorphicCard({ size: 'small' }),
            selectedDataset === 'sites' && styles.datasetButtonActive,
          ]}
          onPress={() => handleDatasetChange('sites')}
          disabled={loading}
        >
          {loading && selectedDataset === 'sites' ? (
            <ActivityIndicator color={Colors.aquaTechBlue} size="small" />
          ) : (
            <>
              <View style={[styles.datasetIconBox, selectedDataset === 'sites' && styles.datasetIconBoxActive]}>
                <MaterialIcons 
                  name="place" 
                  size={32} 
                  color={selectedDataset === 'sites' ? Colors.white : Colors.aquaTechBlue} 
                />
              </View>
              <Text style={[styles.datasetButtonTitle, selectedDataset === 'sites' && styles.datasetButtonTitleActive]}>
                Monitoring Sites
              </Text>
              <Text style={styles.datasetButtonDesc}>
                Site locations & status
              </Text>
              {selectedDataset === 'sites' && (
                <View style={styles.activeIndicator}>
                  <MaterialIcons name="check-circle" size={16} color={Colors.validationGreen} />
                  <Text style={styles.activeIndicatorText}>Active</Text>
                </View>
              )}
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.datasetButtonNew,
            createNeumorphicCard({ size: 'small' }),
            selectedDataset === 'readings' && styles.datasetButtonActive,
          ]}
          onPress={() => handleDatasetChange('readings')}
          disabled={loading}
        >
          {loading && selectedDataset === 'readings' ? (
            <ActivityIndicator color={Colors.aquaTechBlue} size="small" />
          ) : (
            <>
              <View style={[styles.datasetIconBox, selectedDataset === 'readings' && styles.datasetIconBoxActive]}>
                <MaterialIcons 
                  name="water-drop" 
                  size={32} 
                  color={selectedDataset === 'readings' ? Colors.white : Colors.aquaTechBlue} 
                />
              </View>
              <Text style={[styles.datasetButtonTitle, selectedDataset === 'readings' && styles.datasetButtonTitleActive]}>
                Water Readings
              </Text>
              <Text style={styles.datasetButtonDesc}>
                Level measurements
              </Text>
              {selectedDataset === 'readings' && (
                <View style={styles.activeIndicator}>
                  <MaterialIcons name="check-circle" size={16} color={Colors.validationGreen} />
                  <Text style={styles.activeIndicatorText}>Active</Text>
                </View>
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeScreen>
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
          {renderStatCard('Total Sites', stats.totalSites, 'location-on', '#6366F1')}
          {renderStatCard('Total Readings', stats.totalReadings, 'analytics', '#8B5CF6')}
          {renderStatCard('Danger Alerts', stats.dangerSites, 'warning', '#EF4444')}
          {renderStatCard('Warnings', stats.warningSites, 'error-outline', '#F59E0B')}
        </View>
          </>
        ) : (
          <>
            {/* Chart Controls Bar */}
            {renderChartControls()}

            {/* Chart Selection Modal */}
            {renderChartSelectionModal()}
            
            {/* Time Period Selection Modal */}
            {renderTimePeriodModal()}

            {/* PDF Export Progress Modal */}
            {renderExportProgressModal()}

            {/* Blur overlay during PDF export */}
            {isExporting && (
              <View style={styles.blurOverlay} />
            )}

            {/* Chart Navigation (only for pie/donut charts on sites/readings datasets) */}
            {(selectedChart === 'pie' || selectedChart === 'donut') && 
             (selectedDataset === 'sites' || selectedDataset === 'readings') && 
             renderChartNavigation()}

            {/* Chart Display */}
            <ViewShot 
              ref={chartViewRef} 
              options={{ format: 'png', quality: 1.0 }}
              style={{ backgroundColor: isExporting ? '#FFFFFF' : 'transparent' }}
            >
              {renderChart()}
            </ViewShot>


          </>
        )}
        </Animated.View>
      </ScrollView>
      </View>
    </SafeScreen>
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
    paddingTop: 16,
    margin: 16,
    marginTop: 8,
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
    padding: 20,
    marginBottom: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
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
  chartControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  controlButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  controlButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlButtonTextContainer: {
    flex: 1,
    marginLeft: 8,
    marginRight: 4,
  },
  controlButtonLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  controlButtonValue: {
    fontSize: 13,
    color: Colors.deepSecurityBlue,
    fontWeight: '600',
  },
  controlButtonExport: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
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
    backgroundColor: 'transparent',
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
  chartDataInfo: {
    fontSize: 10,
    color: Colors.aquaTechBlue,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
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
    minHeight: 400,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  pieChartCenter: {
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
  datasetSection: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
  },
  datasetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  datasetHeaderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
    marginLeft: 8,
  },
  datasetDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  datasetButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  datasetButtonNew: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  datasetIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  datasetIconBoxActive: {
    backgroundColor: Colors.aquaTechBlue,
  },
  datasetButtonTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
    textAlign: 'center',
    marginBottom: 4,
  },
  datasetButtonTitleActive: {
    color: Colors.aquaTechBlue,
  },
  datasetButtonDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
  },
  activeIndicatorText: {
    fontSize: 11,
    color: Colors.validationGreen,
    fontWeight: '600',
    marginLeft: 4,
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
  datasetButton: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  exportButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 56,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  exportButtonIconSvg: {
    marginRight: 10,
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
  chartTypeIconSvg: {
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
    flexDirection: 'row',
    alignItems: 'center',
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
  timePeriodModalContent: {
    width: screenWidth - 32,
    maxHeight: '80%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
  },
  timePeriodOptionsNew: {
    gap: 12,
  },
  periodOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.softLightGrey,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  periodOptionButtonActive: {
    backgroundColor: Colors.aquaTechBlue,
    borderColor: Colors.aquaTechBlue,
  },
  periodOptionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  periodOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
    marginBottom: 2,
  },
  periodOptionTitleActive: {
    color: Colors.white,
  },
  periodOptionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  periodOptionSubtitleActive: {
    color: Colors.white,
    opacity: 0.9,
  },
  customDateSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  customDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customDateHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
    marginLeft: 8,
  },
  dateInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  dateInfoText: {
    fontSize: 12,
    color: '#6366F1',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  dateSelectorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateSelector: {
    flex: 1,
  },
  dateSelectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.deepSecurityBlue,
    marginBottom: 8,
  },
  dateSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateSelectorText: {
    fontSize: 14,
    color: Colors.deepSecurityBlue,
    marginLeft: 8,
    fontWeight: '500',
  },
  applyCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: Colors.aquaTechBlue,
    borderRadius: 10,
    marginTop: 8,
  },
  applyCustomButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.white,
  },
  timePeriodOptions: {
    paddingVertical: 8,
  },
  timePeriodOption: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 120,
    position: 'relative',
  },
  timePeriodOptionActive: {
    borderWidth: 3,
    borderColor: Colors.aquaTechBlue,
    backgroundColor: Colors.white,
  },
  timePeriodIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  timePeriodIconSvg: {
    marginBottom: 8,
  },
  timePeriodLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
    textAlign: 'center',
    marginBottom: 6,
  },
  timePeriodLabelActive: {
    color: Colors.aquaTechBlue,
  },
  timePeriodDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  customDateContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: Colors.softLightGrey,
    borderRadius: 12,
  },
  customDateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
    marginBottom: 12,
    textAlign: 'center',
  },
  dateRangeInfo: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  dateRangeInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  datePickerItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.deepSecurityBlue,
    marginBottom: 8,
    textAlign: 'center',
  },
  dateButton: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  dateButtonText: {
    fontSize: 13,
    color: Colors.deepSecurityBlue,
    fontWeight: '500',
  },
  applyButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.aquaTechBlue,
    marginTop: 8,
  },
  applyButtonText: {
    fontSize: 15,
    color: Colors.white,
    fontWeight: 'bold',
  },

  // Export Progress Modal Styles
  exportProgressOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportProgressContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: screenWidth - 80,
    maxWidth: 400,
  },
  exportProgressTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
    marginTop: 16,
    marginBottom: 8,
  },
  exportProgressSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  exportProgressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  exportProgressBarFill: {
    height: '100%',
    backgroundColor: Colors.aquaTechBlue,
    borderRadius: 4,
  },
  exportProgressText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  chartNavigationWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  chartNavigationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
    marginBottom: 4,
    textAlign: 'center',
  },
  chartNavigationSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  chartNavigation: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    gap: 10,
  },
  chartNavItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    gap: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chartNavItemActive: {
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  chartNavLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    letterSpacing: 0.3,
  },
  chartNavLabelActive: {
    color: '#FFFFFF',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurOverlayText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.deepSecurityBlue,
  },

});

export default DashboardScreen;
