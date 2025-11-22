import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
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

type ChartType = 'pie' | 'graph' | 'bar';

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
  const [selectedDataset, setSelectedDataset] = useState<'overview' | 'sites' | 'readings'>('overview');
  const [viewMode, setViewMode] = useState<'dashboard' | 'charts'>('dashboard');
  
  // Profile is used for user context
  console.log('Dashboard loaded for user:', profile.id);
  const [selectedChart, setSelectedChart] = useState<ChartType>('pie');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [stats, setStats] = useState({
    totalSites: 0,
    totalReadings: 0,
    dangerSites: 0,
    warningSites: 0,
    avgWaterLevel: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (stats.totalSites > 0) {
      generateChartData(selectedChart, selectedDataset);
    }
  }, [selectedChart, stats, selectedDataset]);

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
          case 'graph':
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
            break;

          case 'pie':
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
            const riverColors = riverSitesData.map((_s, i) => {
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
              return baseColors[i % baseColors.length];
            });
            
            // Pie Chart 3: Individual Reservoir Sites with their danger levels
            const reservoirSitesData = sites.filter(s => 
              s.name.toLowerCase().includes('reservoir') || 
              s.site_type?.toLowerCase().includes('reservoir') ||
              s.name.toLowerCase().includes('dam')
            );
            const reservoirLabels = reservoirSitesData.map(s => s.name.split(' ')[0]);
            const reservoirValues = reservoirSitesData.map(s => s.danger_level || 1);
            const reservoirColors = reservoirSitesData.map((_s, i) => {
              const baseColors = [
                Colors.deepSecurityBlue,
                Colors.aquaTechBlue,
                Colors.criticalRed,
                Colors.warningYellow,
                Colors.validationGreen,
                '#8B5CF6',
                '#F97316',
                '#14B8A6',
                '#EC4899',
                '#10B981'
              ];
              return baseColors[i % baseColors.length];
            });
            
            const siteColors = [
              Colors.aquaTechBlue, 
              Colors.validationGreen, 
              Colors.warningYellow, 
              Colors.criticalRed,
              Colors.deepSecurityBlue,
              '#8B5CF6',
              '#F97316',
              '#14B8A6'
            ];
            
            const pieCharts = [
              {
                title: 'Site Types Distribution',
                labels: Object.keys(siteTypes),
                values: Object.values(siteTypes) as number[],
                colors: Object.keys(siteTypes).map((_, i) => siteColors[i % siteColors.length]),
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
            
            setChartData({
              labels: Object.keys(siteTypes),
              values: Object.values(siteTypes),
              colors: Object.keys(siteTypes).map((_, i) => siteColors[i % siteColors.length]),
              pieCharts: pieCharts
            });
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
          case 'graph':
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
            break;

          case 'pie':
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
            
            setChartData({
              labels: Object.keys(methodCounts),
              values: Object.values(methodCounts),
              colors: Object.keys(methodCounts).map((_, i) => readingColors[i % readingColors.length]),
              pieCharts: [
                {
                  title: 'Reading Methods',
                  labels: Object.keys(methodCounts),
                  values: Object.values(methodCounts),
                  colors: Object.keys(methodCounts).map((_, i) => readingColors[i % readingColors.length]),
                },
                {
                  title: 'Water Level Status',
                  labels: ['Normal', 'Warning', 'Danger'],
                  values: [normalReadings, warningReadings, dangerReadings],
                  colors: [Colors.validationGreen, Colors.warningYellow, Colors.criticalRed],
                }
              ]
            });
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
          case 'graph':
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
            break;

          case 'pie':
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

            setChartData({
              labels: ['Normal', 'Warning', 'Danger'],
              values: [statusCounts.normal, statusCounts.warning, statusCounts.danger],
              colors: [Colors.validationGreen, Colors.warningYellow, Colors.criticalRed],
            });
            break;
        }
      }
    } catch (error) {
      console.error('Error generating chart data:', error);
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

  const renderStatCard = (title: string, value: string | number, icon: string, color: string) => (
    <View style={[styles.statCard, createNeumorphicCard({ size: 'small' })]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{title}</Text>
    </View>
  );

  const renderChartTypeSelector = () => (
    <View style={[styles.chartSelector, createNeumorphicCard({ size: 'medium' })]}>
      <Text style={[styles.sectionTitle, NeumorphicTextStyles.subheading]}>
        📊 Chart Type
      </Text>
      <View style={styles.chartButtons}>
        {(['pie', 'graph', 'bar'] as ChartType[]).map(type => (
          <TouchableOpacity
            key={type}
            style={[
              styles.chartButton,
              selectedChart === type && styles.chartButtonActive,
            ]}
            onPress={() => {
              setSelectedChart(type);
              generateChartData(type, selectedDataset);
            }}
          >
            <Text style={[
              styles.chartButtonText,
              selectedChart === type && styles.chartButtonTextActive,
            ]}>
              {type === 'pie' ? '🥧 Pie' : type === 'graph' ? '📈 Graph' : '📊 Bar'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
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
              const pieDataForChart = pieChartData.labels.map((label, index) => ({
                value: pieChartData.values[index],
                color: pieChartData.colors[index],
                text: label,
                focused: false,
              }));

              return (
                <View
                  key={chartIndex}
                  style={[
                    styles.chartContainer,
                    createNeumorphicCard({ size: 'large' }),
                    { marginBottom: 16 },
                  ]}
                >
                  <Text style={[styles.chartTitle, NeumorphicTextStyles.subheading]}>
                    {pieChartData.title}
                  </Text>
                  <View style={styles.giftedChartWrapper}>
                    <PieChart
                      data={pieDataForChart}
                      radius={100}
                      innerRadius={40}
                      centerLabelComponent={() => (
                        <View>
                          <Text style={styles.centerLabelText}>Total</Text>
                          <Text style={styles.centerLabelValue}>
                            {pieChartData.values.reduce((sum, val) => sum + val, 0)}
                          </Text>
                        </View>
                      )}
                      showValuesAsLabels
                      showText
                      textColor={Colors.white}
                      textSize={12}
                      focusOnPress
                    />
                    <View style={styles.legendContainer}>
                      {pieDataForChart.map((item, index) => (
                        <View key={index} style={styles.legendItem}>
                          <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                          <Text style={styles.legendText}>
                            {item.text}: {item.value} (
                            {((item.value / pieChartData.values.reduce((s, v) => s + v, 0)) * 100).toFixed(1)}
                            %)
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        );
      
      case 'graph':
        return (
          <View style={[styles.chartContainer, createNeumorphicCard({ size: 'large' })]}>
            <Text style={[styles.chartTitle, NeumorphicTextStyles.subheading]}>
              {selectedDataset === 'sites' ? 'Danger Level Trend' : selectedDataset === 'readings' ? 'Water Level Trend' : 'Data Trend'}
            </Text>
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
                  startOpacity={0.4}
                  endOpacity={0.1}
                  areaChart
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
          </View>
        );
      
      case 'bar':
        return (
          <View style={[styles.chartContainer, createNeumorphicCard({ size: 'large' })]}>
            <Text style={[styles.chartTitle, NeumorphicTextStyles.subheading]}>
              {selectedDataset === 'sites' ? 'Danger Level Distribution' : selectedDataset === 'readings' ? 'Water Level Distribution' : 'Data Distribution'}
            </Text>
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
                  animationDuration={800}
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
      <Text style={[styles.sectionTitle, NeumorphicTextStyles.subheading]}>
        📊 View Dataset Charts
      </Text>
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
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, NeumorphicTextStyles.heading]}>
            Analytics Dashboard
          </Text>
          <Text style={[styles.headerSubtitle, NeumorphicTextStyles.caption]}>
            Data Insights & Export
          </Text>
        </View>
        <TouchableOpacity onPress={fetchDashboardData} style={styles.refreshButton}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {viewMode === 'dashboard' ? (
          <>
            {/* Statistics Cards */}
            <View style={styles.statsGrid}>
          {renderStatCard('Total Sites', stats.totalSites, '🏗️', Colors.aquaTechBlue)}
          {renderStatCard('Total Readings', stats.totalReadings, '📊', Colors.deepSecurityBlue)}
          {renderStatCard('Danger Alerts', stats.dangerSites, '🚨', Colors.criticalRed)}
          {renderStatCard('Warnings', stats.warningSites, '⚠️', Colors.warningYellow)}
        </View>

            {/* Average Water Level Card */}
            <View style={[styles.avgCard, createNeumorphicCard({ size: 'medium' })]}>
              <Text style={styles.avgLabel}>Average Water Level</Text>
              <Text style={styles.avgValue}>{stats.avgWaterLevel.toFixed(2)} m</Text>
            </View>

            {/* Dataset Selection Buttons */}
            {renderDatasetButtons()}
          </>
        ) : (
          <>
            {/* Charts View */}
            <View style={[styles.chartsViewHeader, createNeumorphicCard({ size: 'medium' })]}>
              <TouchableOpacity onPress={handleBackToDashboard} style={styles.backToChartButton}>
                <Text style={styles.backIcon}>←</Text>
                <Text style={styles.backToChartText}>Back to Dashboard</Text>
              </TouchableOpacity>
              <Text style={[styles.chartsViewTitle, NeumorphicTextStyles.heading]}>
                {selectedDataset === 'sites' ? '🗺️ Monitoring Sites' : '📊 Water Level Readings'}
              </Text>
            </View>

            {/* Chart Type Selector */}
            {renderChartTypeSelector()}

            {/* Chart Display */}
            {renderChart()}
          </>
        )}
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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
    marginBottom: 20,
    textAlign: 'center',
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
  centerLabelValue: {
    fontSize: 18,
    color: Colors.deepSecurityBlue,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  legendContainer: {
    marginTop: 20,
    width: '100%',
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
});

export default DashboardScreen;
