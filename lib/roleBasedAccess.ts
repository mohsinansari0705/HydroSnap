/**
 * Role-based Access Control Utilities for HydroSnap
 * Manages user permissions and feature access based on roles
 */

import { Profile } from '../types/profile';

export type UserRole = 'central_analyst' | 'supervisor' | 'field_personnel' | 'public';

export interface RolePermissions {
  canViewAllSites: boolean;
  canManageUsers: boolean;
  canTakeReadings: boolean;
  canUploadPublicReports: boolean;
  canAccessSupervisorDashboard: boolean;
  canViewDetailedAnalytics: boolean;
  canManageSiteConfiguration: boolean;
  canViewRealTimeAlerts: boolean;
  canExportData: boolean;
  canModifyReadings: boolean;
}

/**
 * Defines permissions for each user role
 */
export const rolePermissions: Record<UserRole, RolePermissions> = {
  central_analyst: {
    canViewAllSites: true,
    canManageUsers: true,
    canTakeReadings: false,
    canUploadPublicReports: false,
    canAccessSupervisorDashboard: true,
    canViewDetailedAnalytics: true,
    canManageSiteConfiguration: true,
    canViewRealTimeAlerts: true,
    canExportData: true,
    canModifyReadings: true,
  },
  supervisor: {
    canViewAllSites: true,
    canManageUsers: false,
    canTakeReadings: false,
    canUploadPublicReports: false,
    canAccessSupervisorDashboard: true,
    canViewDetailedAnalytics: true,
    canManageSiteConfiguration: false,
    canViewRealTimeAlerts: true,
    canExportData: true,
    canModifyReadings: false,
  },
  field_personnel: {
    canViewAllSites: false,
    canManageUsers: false,
    canTakeReadings: true,
    canUploadPublicReports: false,
    canAccessSupervisorDashboard: false,
    canViewDetailedAnalytics: false,
    canManageSiteConfiguration: false,
    canViewRealTimeAlerts: false,
    canExportData: false,
    canModifyReadings: false,
  },
  public: {
    canViewAllSites: false,
    canManageUsers: false,
    canTakeReadings: false,
    canUploadPublicReports: true,
    canAccessSupervisorDashboard: false,
    canViewDetailedAnalytics: false,
    canManageSiteConfiguration: false,
    canViewRealTimeAlerts: false,
    canExportData: false,
    canModifyReadings: false,
  },
};

/**
 * Gets permissions for a given user role
 */
export const getPermissions = (role: UserRole): RolePermissions => {
  return rolePermissions[role];
};

/**
 * Checks if a user has a specific permission
 */
export const hasPermission = (
  profile: Profile | null,
  permission: keyof RolePermissions
): boolean => {
  if (!profile) return false;
  
  const permissions = getPermissions(profile.role);
  return permissions[permission];
};

/**
 * Gets accessible sites for a user based on their role
 */
export const getAccessibleSites = (profile: Profile) => {
  const permissions = getPermissions(profile.role);
  
  if (permissions.canViewAllSites) {
    // Central analysts and supervisors can see all sites
    return 'all';
  } else if (profile.role === 'field_personnel' && profile.site_id) {
    // Field personnel can only see their assigned site
    return [profile.site_id];
  } else {
    // Public users have no specific site access
    return [];
  }
};

/**
 * Determines the appropriate home screen for a user role
 */
export const getHomeScreenForRole = (role: UserRole): 'home' | 'supervisor-dashboard' => {
  const permissions = getPermissions(role);
  
  if (permissions.canAccessSupervisorDashboard) {
    return 'supervisor-dashboard';
  } else {
    return 'home';
  }
};

/**
 * Checks if user can access a specific screen
 */
export const canAccessScreen = (
  profile: Profile | null,
  screen: string
): boolean => {
  if (!profile) return false;
  
  const permissions = getPermissions(profile.role);
  
  switch (screen) {
    case 'supervisor-dashboard':
      return permissions.canAccessSupervisorDashboard;
    case 'new-reading':
      return permissions.canTakeReadings;
    case 'public-upload':
      return permissions.canUploadPublicReports;
    case 'user-management':
      return permissions.canManageUsers;
    case 'site-configuration':
      return permissions.canManageSiteConfiguration;
    case 'analytics':
      return permissions.canViewDetailedAnalytics;
    case 'data-export':
      return permissions.canExportData;
    default:
      return true; // Basic screens accessible to all authenticated users
  }
};

/**
 * Gets user-friendly role name
 */
export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case 'central_analyst':
      return 'Central Analyst';
    case 'supervisor':
      return 'Supervisor';
    case 'field_personnel':
      return 'Field Personnel';
    case 'public':
      return 'Public Contributor';
    default:
      return 'User';
  }
};

/**
 * Gets available navigation options for a user role
 */
export const getNavigationOptions = (role: UserRole) => {
  const permissions = getPermissions(role);
  const options = [
    {
      screen: 'home',
      title: 'Home',
      icon: '🏠',
      available: true,
    },
  ];

  if (permissions.canAccessSupervisorDashboard) {
    options.push({
      screen: 'supervisor-dashboard',
      title: 'Dashboard',
      icon: '📊',
      available: true,
    });
  }

  if (permissions.canTakeReadings) {
    options.push({
      screen: 'new-reading',
      title: 'Take Reading',
      icon: '📸',
      available: true,
    });
  }

  if (permissions.canUploadPublicReports) {
    options.push({
      screen: 'public-upload',
      title: 'Report Issue',
      icon: '📤',
      available: true,
    });
  }

  if (permissions.canViewDetailedAnalytics) {
    options.push({
      screen: 'analytics',
      title: 'Analytics',
      icon: '📈',
      available: true,
    });
  }

  if (permissions.canManageUsers) {
    options.push({
      screen: 'user-management',
      title: 'Manage Users',
      icon: '👥',
      available: true,
    });
  }

  options.push({
    screen: 'settings',
    title: 'Settings',
    icon: '⚙️',
    available: true,
  });

  return options.filter(option => option.available);
};

/**
 * Validates if user can perform an action on a site
 */
export const canAccessSite = (
  profile: Profile,
  siteId: string
): boolean => {
  const accessibleSites = getAccessibleSites(profile);
  
  if (accessibleSites === 'all') {
    return true;
  } else if (Array.isArray(accessibleSites)) {
    return accessibleSites.includes(siteId);
  }
  
  return false;
};