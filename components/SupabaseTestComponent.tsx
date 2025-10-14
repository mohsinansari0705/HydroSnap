import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { Colors } from '../lib/colors';

const SupabaseTestComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runTests = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      // Test 1: Basic connection
      addResult('🔄 Testing basic connection...');
      const { data: connectionData, error: connectionError } = await supabase
        .from('monitoring_sites')
        .select('count', { count: 'exact', head: true });
      
      if (connectionError) {
        addResult(`❌ Connection failed: ${connectionError.message}`);
        addResult(`Error code: ${connectionError.code}`);
        addResult(`Error details: ${JSON.stringify(connectionError.details)}`);
      } else {
        addResult(`✅ Connection successful! Total sites: ${connectionData}`);
      }

      // Test 2: Fetch first 3 sites
      addResult('🔄 Fetching sample sites...');
      const { data: siteData, error: siteError } = await supabase
        .from('monitoring_sites')
        .select('id, name, location, is_active')
        .limit(3);
      
      if (siteError) {
        addResult(`❌ Site fetch failed: ${siteError.message}`);
      } else {
        addResult(`✅ Fetched ${siteData?.length || 0} sites`);
        siteData?.forEach((site, index) => {
          addResult(`   Site ${index + 1}: ${site.name} (${site.location}) - Active: ${site.is_active}`);
        });
      }

      // Test 3: Check authentication
      addResult('🔄 Checking authentication...');
      const { data: authData, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        addResult(`❌ Auth check failed: ${authError.message}`);
      } else {
        addResult(`✅ Auth status: ${authData.session ? 'Logged in' : 'Anonymous'}`);
        if (authData.session) {
          addResult(`   User: ${authData.session.user?.email}`);
        }
      }

    } catch (error) {
      addResult(`💥 Test failed: ${error}`);
    }
    
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={runTests}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Running Tests...' : 'Test Supabase Connection'}
        </Text>
      </TouchableOpacity>
      
      <ScrollView style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.softLightGrey,
  },
  button: {
    backgroundColor: Colors.deepSecurityBlue,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: Colors.textSecondary,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 8,
  },
  resultText: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});

export default SupabaseTestComponent;