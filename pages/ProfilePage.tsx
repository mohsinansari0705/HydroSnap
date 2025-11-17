import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, BackHandler } from 'react-native';
import { useAuth } from '../lib/AuthContext';
import { useNavigation } from '../lib/NavigationContext';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';

interface ProfilePageProps {
  onBack: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onBack }) => {
  const { profile } = useAuth();
  const { setCurrentScreen } = useNavigation();
  const [editPressed, setEditPressed] = useState(false);
  const [backPressed, setBackPressed] = useState(false);

  const handleEditProfile = () => {
    setCurrentScreen('edit-profile');
  };

  useEffect(() => {
    const backAction = () => {
      onBack();
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [onBack]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={Colors.deepSecurityBlue} barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backButton, backPressed && styles.editButtonPressed]}
          onPressIn={() => setBackPressed(true)}
          onPressOut={() => setBackPressed(false)}
          accessibilityLabel="Go back"
        >
          <Text style={styles.editIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity
          onPress={handleEditProfile}
          style={[styles.backButton, editPressed && styles.editButtonPressed]}
          onPressIn={() => setEditPressed(true)}
          onPressOut={() => setEditPressed(false)}
          accessibilityLabel="Edit profile"
        >
          <Text style={styles.editIcon}>✎</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, createNeumorphicCard({ size: 'large', borderRadius: 16 })]}>
        <Text style={[NeumorphicTextStyles.heading, styles.name]}>{profile?.full_name || 'User'}</Text>
        <Text style={styles.email}>{profile?.email || 'No email'}</Text>
        <Text style={styles.role}>{profile?.role || 'Role not specified'}</Text>
        <Text style={styles.org}>{profile?.organization || ''}</Text>
      </View>

      {/* Edit button moved to header for easier access */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.softLightGrey },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginTop: StatusBar.currentHeight || 24,
    paddingTop: 20, 
    paddingHorizontal: 20, 
    paddingBottom: 20, 
    backgroundColor: Colors.deepSecurityBlue, 
    shadowColor: Colors.deepSecurityBlue + '40',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8
  },
  backButton: { width: 54, height: 54, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.softLightGrey, borderRadius: 27, elevation: 4 },
  backIcon: { fontSize: 24, color: Colors.deepSecurityBlue, fontWeight: '700' },
  editButtonPressed: { opacity: 0.95, transform: [{ scale: 0.995 }], backgroundColor: Colors.softLightGrey },
  editIcon: { fontSize: 18, color: Colors.textPrimary, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '600', color: Colors.white, flex: 1, textAlign: 'center' },
  card: { margin: 20, padding: 24, borderRadius: 16 },
  name: { fontSize: 18, fontWeight: '700', color: Colors.deepSecurityBlue, marginBottom: 10 },
  email: { fontSize: 15, color: Colors.textSecondary, marginBottom: 8, fontWeight: '500' },
  role: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6 },
  org: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, fontWeight: '500' },
  actions: { paddingHorizontal: 20, marginTop: 24, gap: 12 },
  button: { paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.softLightGrey, minHeight: 56 },
  buttonPressed: { opacity: 0.95, transform: [{ scale: 0.997 }], backgroundColor: Colors.softLightGrey },
  buttonText: { color: Colors.textPrimary, fontWeight: '700', fontSize: 16 },
});

export default ProfilePage;
