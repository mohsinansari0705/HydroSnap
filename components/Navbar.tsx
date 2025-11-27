import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, TouchableOpacity, StyleSheet, Text, Modal, Pressable, ScrollView, Animated } from 'react-native';
import { Colors } from '../lib/colors';
import { Alert } from '../types/alerts';
import { useNavigation } from '../lib/NavigationContext';

interface NavbarProps {
  onQRScanPress?: () => void;
  onNotificationPress?: () => void;
  onSettingsPress?: () => void;
  userName?: string;
}

const Navbar: React.FC<NavbarProps> = ({
  onQRScanPress,
  onNotificationPress,
  onSettingsPress,
}) => {
  const { t } = useTranslation();
  console.log('Navbar: onSettingsPress is', typeof onSettingsPress);
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { navigateToSite, navigateToSettings, navigateToProfile, navigateToDashboard } = useNavigation();

  // Sample notifications for testing
  const sampleNotifications: Alert[] = [
    {
      id: '1',
      siteId: 'SITE001',
      siteName: 'River Valley Station',
      waterLevel: 5.8,
      threshold: 5.5,
      severity: 'warning',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      location: {
        latitude: 19.0760,
        longitude: 72.8777
      },
      weatherConditions: 'Heavy rainfall, cloudy'
    },
    {
      id: '2',
      siteId: 'SITE002',
      siteName: 'Coastal Monitoring Point',
      waterLevel: 7.2,
      threshold: 6.5,
      severity: 'danger',
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      location: {
        latitude: 19.0177,
        longitude: 72.8562
      },
      weatherConditions: 'Storm conditions, high tide'
    },
    {
      id: '3',
      siteId: 'SITE003',
      siteName: 'Lake View Station',
      waterLevel: 9.1,
      threshold: 8.0,
      severity: 'critical',
      timestamp: new Date(), // Current time
      location: {
        latitude: 19.1136,
        longitude: 72.8697
      },
      weatherConditions: 'Extreme rainfall, flooding risk'
    }
  ];

  // Local alert state with `read` flag to support marking as read
  type AlertWithRead = Alert & { read?: boolean };
  const [alerts, setAlerts] = useState<AlertWithRead[]>(
    sampleNotifications.map((a) => ({ ...a, read: false }))
  );

  // Animation values for modal card
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('showNotifications changed to:', showNotifications);
    if (showNotifications) {
      // open animation
      console.log('Starting notification open animation');
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
      ]).start(() => {
        console.log('Notification open animation completed');
      });
    } else {
      // close animation
      console.log('Starting notification close animation');
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.96, duration: 120, useNativeDriver: true }),
      ]).start(() => {
        console.log('Notification close animation completed');
      });
    }
  }, [showNotifications, opacityAnim, scaleAnim]);

  const handleMenuPress = () => {
    setShowMenu(!showMenu);
  };

  // QR Code Icon SVG
  const QRIcon = () => (
    <View style={styles.iconContainer}>
      <View style={styles.qrContainer}>
        <View style={styles.qrFrame}>
          <View style={styles.qrTopLeft} />
          <View style={styles.qrTopRight} />
          <View style={styles.qrBottomLeft} />
          <View style={styles.qrBottomRight} />
          <View style={styles.qrCenter} />
        </View>
      </View>
    </View>
  );

  // Notification Bell Icon SVG
  const NotificationIcon = () => (
    <View style={styles.iconContainer}>
      <View style={styles.bellContainer}>
        <View style={styles.bellTop} />
        <View style={styles.bellBody} />
        <View style={styles.bellBottom} />
      </View>
    </View>
  );

  // Three Dots Menu Icon
  const MenuIcon = () => (
    <View style={styles.iconContainer}>
      <View style={styles.dotsContainer}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
    </View>
  );

  // Dashboard Icon SVG - Grid Layout
  const DashboardIcon = () => (
    <View style={styles.dashboardIconContainer}>
      <View style={styles.dashboardGrid}>
        <View style={styles.dashboardSquare} />
        <View style={styles.dashboardSquare} />
        <View style={styles.dashboardSquare} />
        <View style={styles.dashboardSquare} />
      </View>
    </View>
  );


  return (
    <View style={styles.navbar}>
      {/* Left Section - App Name with Logo */}
      <View style={styles.leftSection}>
        <View style={styles.brandContainer}>
          <View style={styles.appInfo}>
            <Text style={styles.appName}>{t('common.appName')}</Text>
            <Text style={styles.appSubtitle}>{t('common.tagline', { defaultValue: 'Smart Water Level Monitoring' })}</Text>
          </View>
        </View>
      </View>
      
      {/* Right Section - Icons */}
      <View style={styles.rightSection}>
        <TouchableOpacity onPress={onQRScanPress} style={styles.iconButton}>
          <QRIcon />
        </TouchableOpacity>
        
        <View style={styles.notificationContainer}>
          <TouchableOpacity 
            onPress={() => {
              console.log('Notification bell pressed, current state:', showNotifications);
              setShowNotifications(!showNotifications);
              if (onNotificationPress) onNotificationPress?.();
            }} 
            style={styles.iconButton}
            accessibilityLabel="Open notifications"
          >
            <NotificationIcon />
            {sampleNotifications.length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {sampleNotifications.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Modal-based notifications for reliable layering and better UX */}
          <Modal
            visible={showNotifications}
            transparent
            animationType="fade"
            onRequestClose={() => setShowNotifications(false)}
          >
            <Pressable style={styles.modalBackdrop} onPress={() => {
              console.log('Backdrop pressed, hiding notifications');
              setShowNotifications(false);
            }}>
              <View style={styles.modalContentWrapper} pointerEvents="box-none">
                <Animated.View style={[styles.modalCard, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]} pointerEvents="auto"> 
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t('home.floodAlertStatus')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => {
                          // mark all read
                          setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
                        }}
                        style={[styles.markAllButton]}
                      >
                        <Text style={styles.markAllText}>{t('notifications.markAllRead')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setShowNotifications(false);
                          if (onNotificationPress) onNotificationPress();
                        }}
                        style={styles.closeButton}
                        accessibilityLabel="Close notifications"
                      >
                        <Text style={styles.closeButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {/* Reuse NotificationPanel's content but render inline here for tighter UX control */}
                  <ScrollView style={styles.notificationListScroll} contentContainerStyle={styles.notificationListContainer} scrollEnabled={true} nestedScrollEnabled={true}>
                    {alerts.length === 0 ? (
                      <Text style={styles.noAlertsText}>{t('notifications.noActiveAlerts')}</Text>
                    ) : (
                      alerts.map((alert) => (
                        <TouchableOpacity
                          key={alert.id}
                          style={[styles.alertItem, { borderLeftColor: alert.severity === 'critical' ? Colors.criticalRed : alert.severity === 'danger' ? Colors.dangerOrange : Colors.warningYellow, opacity: alert.read ? 0.6 : 1 }]}
                          onPress={() => {
                            // mark as read and navigate to site details
                            setAlerts((prev) => prev.map((a) => a.id === alert.id ? { ...a, read: true } : a));
                            setShowNotifications(false);
                            // navigate to site
                            try {
                              navigateToSite(alert.siteId);
                            } catch (err) {
                              console.warn('navigateToSite not available:', err);
                            }
                          }}
                        >
                          <View style={styles.alertHeader}>
                            <Text style={styles.siteName}>{alert.siteName}</Text>
                            <Text style={[styles.severity, { color: alert.severity === 'critical' ? Colors.criticalRed : alert.severity === 'danger' ? Colors.dangerOrange : Colors.warningYellow }]}>
                              {alert.severity.toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.waterLevel}>{t('notificationsPanel.waterLevel')}: {alert.waterLevel}m ({t('notificationsPanel.threshold')}: {alert.threshold}m)</Text>
                          <Text style={styles.weather}>{alert.weatherConditions}</Text>
                          <Text style={styles.timestamp}>{new Date(alert.timestamp).toLocaleString()}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </Animated.View>
              </View>
            </Pressable>
          </Modal>
        </View>
        
        <View style={styles.menuContainer}>
          <TouchableOpacity onPress={handleMenuPress} style={styles.iconButton} accessibilityLabel="Open menu">
            <MenuIcon />
          </TouchableOpacity>

          {/* Use a Modal for reliable layering and to allow tapping outside to close */}
          <Modal
            visible={showMenu}
            transparent
            animationType="fade"
            onRequestClose={() => setShowMenu(false)}
          >
            <Pressable style={styles.menuModalBackdrop} onPress={() => setShowMenu(false)}>
              <View style={styles.menuModalWrapper} pointerEvents="box-none">
                <View style={styles.dropdownModalContent}>
                      {(
                    [
                      { key: 'profile', label: `👤 ${t('profile.title')}`, disabled: false, action: navigateToProfile, icon: null },
                      { key: 'dashboard', label: t('common.dashboard', { defaultValue: 'Dashboard' }), disabled: false, action: navigateToDashboard, icon: <DashboardIcon /> },
                      { key: 'settings', label: `⚙️ ${t('settings.settings')}`, disabled: false, action: onSettingsPress || navigateToSettings, icon: null },
                    ] as Array<any>
                  ).map((item) => (
                    item.disabled ? (
                      <View key={item.key} style={[styles.menuItem, styles.disabledMenuItem]}>
                        <Text style={[styles.menuItemText, styles.disabledMenuText]}>{item.label}</Text>
                        {item.note && <Text style={styles.comingSoonText}>{item.note}</Text>}
                      </View>
                    ) : (
                      <TouchableOpacity
                        key={item.key}
                        style={styles.menuItem}
                        onPress={() => {
                          console.log(`${item.label} pressed`);
                          setShowMenu(false);
                          try {
                            item.action();
                          } catch (err) {
                            console.warn('menu action failed', err);
                          }
                        }}
                      >
                        {item.icon && <View style={styles.menuItemIcon}>{item.icon}</View>}
                        <Text style={styles.menuItemText}>{item.label}</Text>
                      </TouchableOpacity>
                    )
                  ))}
                </View>
              </View>
            </Pressable>
          </Modal>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    // Adjust these values to separate from mobile header
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: Colors.deepSecurityBlue,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 0,
    overflow: 'visible', // allow absolute children (notification panel) to overflow
  },
  leftSection: {
    flex: 1,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 2,
  },
  appSubtitle: {
    fontSize: 14,
    color: Colors.white + 'CC',
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // QR Code Icon Styles
  qrContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrFrame: {
    width: 18,
    height: 18,
    position: 'relative',
  },
  qrTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 6,
    height: 6,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: Colors.white,
  },
  qrTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 6,
    height: 6,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: Colors.white,
  },
  qrBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 6,
    height: 6,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: Colors.white,
  },
  qrBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 6,
    height: 6,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: Colors.white,
  },
  qrCenter: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 6,
    height: 6,
    backgroundColor: Colors.white,
    borderRadius: 1,
  },
  // Notification Bell Icon Styles
  bellContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellTop: {
    width: 4,
    height: 4,
    backgroundColor: Colors.white,
    borderRadius: 2,
    marginBottom: 1,
  },
  bellBody: {
    width: 14,
    height: 12,
    backgroundColor: Colors.white,
    borderRadius: 6,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  bellBottom: {
    width: 8,
    height: 2,
    backgroundColor: Colors.white,
    borderRadius: 1,
    marginTop: 1,
  },
  // Three Dots Menu Icon Styles
  dotsContainer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 16,
  },
  dot: {
    width: 4,
    height: 4,
    backgroundColor: Colors.white,
    borderRadius: 2,
    marginVertical: 1,
  },
  // Menu Dropdown Styles
  menuContainer: {
    position: 'relative',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemIcon: {
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  // Dashboard Icon Styles
  dashboardIconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardGrid: {
    width: 16,
    height: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dashboardSquare: {
    width: 6,
    height: 6,
    backgroundColor: Colors.aquaTechBlue,
    borderRadius: 2,
    margin: 1,
  },
  notificationContainer: {
    position: 'relative',
    zIndex: 2000,
    elevation: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.criticalRed,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.deepSecurityBlue,
  },
  notificationBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  /* Modal / Notifications styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 80,
    zIndex: 2000,
    elevation: 20,
  },
  modalContentWrapper: {
    width: '100%',
    alignItems: 'center',
    flex: 1,
  },
  modalCard: {
    width: 340,
    maxHeight: '70%',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 2001,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.softLightGrey,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: Colors.softLightGrey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  notificationListContainer: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  notificationListScroll: {
    maxHeight: 420,
  },
  markAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.softLightGrey,
  },
  markAllText: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  alertItem: {
    padding: 12,
    borderLeftWidth: 4,
    backgroundColor: Colors.white,
    marginVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  siteName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  severity: {
    fontSize: 12,
    fontWeight: '700',
  },
  waterLevel: {
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  weather: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  timestamp: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  noAlertsText: {
    padding: 16,
    textAlign: 'center',
    color: Colors.textSecondary,
  },
  disabledMenuItem: {
    opacity: 0.6,
  },
  disabledMenuText: {
    color: Colors.textSecondary,
  },
  comingSoonText: {
    fontSize: 12,
    color: Colors.aquaTechBlue,
    fontWeight: '600',
    marginTop: 2,
  },
  /* Modal menu styles */
  menuModalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuModalWrapper: {
    width: '100%',
    alignItems: 'flex-end',
    paddingTop: 52, // match navbar paddingTop + some offset
    paddingRight: 20,
    pointerEvents: 'box-none',
  },
  dropdownModalContent: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 24,
    zIndex: 3000,
  },
});

export default Navbar;