import { supabase } from '../lib/supabase';
import { MonitoringSitesService } from './monitoringSitesService';

/**
 * Debug utilities for troubleshooting Supabase connection and data fetching
 */
export class DebugUtils {
  
  /**
   * Check Supabase configuration
   */
  static checkConfig() {
    console.log('=== SUPABASE CONFIG DEBUG ===');
    console.log('Supabase client initialized:', !!supabase);
    console.log('Supabase instance type:', typeof supabase);
    console.log('==============================');
  }

  /**
   * Test database connection and table access
   */
  static async testDatabaseAccess() {
    console.log('\n=== DATABASE ACCESS TEST ===');
    
    try {
      // Test 1: Basic connection
      console.log('1. Testing basic connection...');
      const connectionTest = await MonitoringSitesService.testConnection();
      console.log('   Connection test result:', connectionTest ? '✅ PASS' : '❌ FAIL');

      // Test 2: Raw query
      console.log('2. Testing raw table query...');
      const { data: rawData, error: rawError } = await supabase
        .from('monitoring_sites')
        .select('id, name')
        .limit(5);
      
      if (rawError) {
        console.log('   ❌ Raw query failed:', rawError);
      } else {
        console.log('   ✅ Raw query success. Sample data:', rawData);
      }

      // Test 3: Count query
      console.log('3. Testing count query...');
      const { count, error: countError } = await supabase
        .from('monitoring_sites')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.log('   ❌ Count query failed:', countError);
      } else {
        console.log('   ✅ Count query success. Total sites:', count);
      }

      // Test 4: Auth status
      console.log('4. Testing auth status...');
      const { data: authData, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.log('   ❌ Auth check failed:', authError);
      } else {
        console.log('   ✅ Auth check success. User:', authData.session?.user?.email || 'No user');
      }

    } catch (error) {
      console.log('💥 Database access test failed:', error);
    }
    
    console.log('============================\n');
  }

  /**
   * Test the monitoring sites service
   */
  static async testMonitoringSitesService() {
    console.log('\n=== MONITORING SITES SERVICE TEST ===');
    
    try {
      console.log('Testing getAllSites method...');
      const sites = await MonitoringSitesService.getAllSites();
      console.log('✅ getAllSites success. Sites found:', sites.length);
      
      if (sites.length > 0) {
        console.log('📋 First 3 sites:', sites.slice(0, 3).map(site => ({
          id: site.id,
          name: site.name,
          location: site.location,
          status: site.status
        })));
      }

      console.log('Testing getTodaysReadingsCount method...');
      const readingsCount = await MonitoringSitesService.getTodaysReadingsCount();
      console.log('✅ getTodaysReadingsCount success. Count:', readingsCount);

    } catch (error) {
      console.log('❌ Monitoring sites service test failed:', error);
    }
    
    console.log('====================================\n');
  }

  /**
   * Run all debug tests
   */
  static async runAllTests() {
    console.log('🔍 STARTING COMPREHENSIVE DEBUG TESTS...\n');
    
    this.checkConfig();
    await this.testDatabaseAccess();
    await this.testMonitoringSitesService();
    
    console.log('🏁 DEBUG TESTS COMPLETED\n');
  }
}