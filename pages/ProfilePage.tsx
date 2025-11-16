import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../lib/AuthContext';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';

interface ProfilePageProps {
  onBack: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onBack }) => {
  const { profile } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={[styles.card, createNeumorphicCard({ size: 'large', borderRadius: 16 })]}>
        <Text style={[NeumorphicTextStyles.heading, styles.name]}>{profile?.full_name || 'User'}</Text>
        <Text style={styles.email}>{profile?.email || 'No email'}</Text>
        <Text style={styles.role}>{profile?.role || 'Role not specified'}</Text>
        <Text style={styles.org}>{profile?.organization || ''}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, createNeumorphicCard({ size: 'medium', borderRadius: 12 })]} onPress={() => {}}>
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.softLightGrey },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.deepSecurityBlue },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.softLightGrey, borderRadius: 22 },
  backIcon: { fontSize: 20, color: Colors.deepSecurityBlue, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '700', color: Colors.white },
  card: { margin: 20, padding: 20, borderRadius: 16 },
  name: { fontSize: 22, color: Colors.deepSecurityBlue, marginBottom: 8 },
  email: { fontSize: 14, color: Colors.textSecondary, marginBottom: 6 },
  role: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  org: { fontSize: 13, color: Colors.textSecondary, marginTop: 6 },
  actions: { paddingHorizontal: 20, marginTop: 10 },
  button: { paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.aquaTechBlue },
  buttonText: { color: Colors.white, fontWeight: '700' },
});

export default ProfilePage;
