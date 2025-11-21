import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, FlatList, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Colors } from '../lib/colors';
import { createNeumorphicCard } from '../lib/neumorphicStyles';
import { Profile, WaterLevelReading } from '../types/profile';
import { useAuth } from '../lib/AuthContext';

interface ProfileScreenProps {
  profile: Profile;
  onEditProfile: () => void;
  onBack: () => void;
}

export default function ProfileScreen({ profile: initialProfile, onEditProfile, onBack }: ProfileScreenProps) {
  const { refreshProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(initialProfile || null);
  const [loading, setLoading] = useState(false);
  const [readings, setReadings] = useState<WaterLevelReading[]>([]);
  

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  // Fetch recent readings for this user
  const fetchRecentReadings = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('water_level_readings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Failed to fetch recent readings:', error);
        setReadings([]);
      } else {
        setReadings(data as WaterLevelReading[]);
      }
    } catch (e) {
      console.error('Unexpected error fetching readings:', e);
      setReadings([]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (!profile?.id) return;

    // initial fetch
    fetchRecentReadings(profile.id);

    // subscribe to profile updates
    const profileSub = supabase
      .channel('public:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}` }, (_payload) => {
        // payload received - refresh local profile from server
        refreshProfile().catch(console.error);
      })
      .subscribe();

    // subscribe to readings for this user
    const readingsSub = supabase
      .channel('public:water_level_readings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'water_level_readings', filter: `user_id=eq.${profile.id}` }, (_payload) => {
        // when new reading inserted/updated/deleted, refresh the list
        fetchRecentReadings(profile.id);
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(profileSub); } catch (e) {}
      try { supabase.removeChannel(readingsSub); } catch (e) {}
    };
  }, [profile?.id]);

  const initials = profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).slice(0,2).join('') : 'U';

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={Colors.deepSecurityBlue} barStyle="light-content" translucent={false} />
      <View style={styles.topSpacer} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={onEditProfile} style={styles.editButton}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileCardContainer}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.nameText}>{profile?.full_name || 'Unknown User'}</Text>
          <Text style={styles.emailText}>{profile?.email || ''}</Text>
          <Text style={styles.metaText}>{profile?.role || ''} • {profile?.organization || ''}</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Readings</Text>
          <TouchableOpacity onPress={() => { if (profile?.id) { fetchRecentReadings(profile.id); refreshProfile().catch(console.error); } }}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.deepSecurityBlue} />
      ) : (
        <FlatList
          data={readings}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.readingCard, createNeumorphicCard()]}> 
              <View style={styles.readingRow}>
                <View style={styles.readingLeft}>
                  <Text style={styles.readingSite}>{item.site_name || 'Site'}</Text>
                  <Text style={styles.readingMeta}>{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</Text>
                </View>
                <View style={styles.readingRight}>
                  <Text style={styles.readingValue}>{item.water_level ?? ''}</Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No recent readings</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey
  },
  topSpacer: {
    height: StatusBar.currentHeight || 24,
    backgroundColor: Colors.deepSecurityBlue,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: Colors.deepSecurityBlue,
    shadowColor: Colors.deepSecurityBlue + '40',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    ...createNeumorphicCard({ size: 'small', borderRadius: 22 }),
    padding: 10,
    backgroundColor: Colors.softLightGrey,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: { color: Colors.deepSecurityBlue, fontSize: 16, fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.white, flex: 1, textAlign: 'center' },
  editButton: {
    ...createNeumorphicCard({ size: 'small', borderRadius: 22 }),
    padding: 10,
    backgroundColor: Colors.softLightGrey,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editText: { color: Colors.deepSecurityBlue, fontWeight: '600', fontSize: 14 },
  profileCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.deepSecurityBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitials: { color: Colors.white, fontSize: 22, fontWeight: '700' },
  profileInfo: { flex: 1 },
  nameText: { fontSize: 20, fontWeight: '700' },
  emailText: { color: Colors.textSecondary, marginTop: 4 },
  metaText: { color: Colors.textSecondary, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  refreshText: { color: Colors.deepSecurityBlue, fontWeight: '600' },
  emptyContainer: { padding: 20, alignItems: 'center', marginHorizontal: 16 },
  emptyText: { color: Colors.textSecondary },
  readingCard: {
    padding: 12,
    marginVertical: 6,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  editInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.cardBackground,
  },
  smallButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  smallButtonText: { color: Colors.white, fontWeight: '700' },
  readingRow: { flexDirection: 'row', alignItems: 'center' },
  readingLeft: { flex: 1 },
  readingRight: { alignItems: 'flex-end' },
  readingSite: { fontWeight: '700' },
  readingMeta: { color: Colors.textSecondary, marginTop: 4 },
  readingValue: { fontSize: 16, fontWeight: '800', color: Colors.deepSecurityBlue }
});
