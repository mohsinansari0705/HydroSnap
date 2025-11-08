import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

interface Reading {
  id: number;
  site_id: number;
  timestamp: string;
  water_level: number;
}

const ReadingDisplay: React.FC = () => {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReadings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('water_level_readings')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) {
      // Handle error (could show a message)
      setReadings([]);
    } else {
      setReadings(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReadings();
  }, []);

  return (
    <View style={styles.container}>
      <Button title="Refresh" onPress={fetchReadings} disabled={loading} />
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={readings}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text>Site ID: {item.site_id}</Text>
              <Text>Timestamp: {item.timestamp}</Text>
              <Text>Water Level: {item.water_level}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  item: {
    padding: 12,
    marginVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
});

export default ReadingDisplay;
