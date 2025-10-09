import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/profile';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { Colors } from '../lib/colors';
import { useAuth } from '../lib/AuthContext';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const { refreshProfile, setIsRegistering } = useAuth(); // changed to include refreshProfile

  // Main state
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Signup steps: 1=Basic Info, 2=Site ID, 3=Credentials & OTP
  const [signupStep, setSignupStep] = useState(1);
  
  // Step 1: Basic Info
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [role, setRole] = useState<Profile['role']>('public');
  const [organization, setOrganization] = useState('');
  const [location, setLocation] = useState('');
  
  // Step 2: Site ID
  const [siteId, setSiteId] = useState('');
  
  // Step 3: Credentials & Password
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtpField, setShowOtpField] = useState(false);
  
  // Password (collected before OTP now)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Login
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // UI state
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [registrationInProgress, setRegistrationInProgress] = useState(false);

  const roles = [
    { value: 'central_analyst', label: 'Central Analyst', description: 'CWC headquarters staff' },
    { value: 'supervisor', label: 'Supervisor', description: 'Regional supervisors' },
    { value: 'field_personnel', label: 'Field Personnel', description: 'On-ground staff' },
    { value: 'public', label: 'Public User', description: 'General public' },
  ] as const;

  const genders = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ];

  const isValidEmail = (text: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  const isValidPhone = (text: string) => /^[\+]?[1-9][\d]{0,15}$/.test(text.replace(/[\s\-\(\)]/g, ''));
  
  // Normalize phone number for consistent matching
  const normalizePhoneNumber = (phone: string) => {
    return phone.replace(/[\s\-\(\)\+]/g, '');
  };
  
  // Step validations
  const validateStep1 = () => {
    if (!fullName.trim() || !organization.trim() || !location.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (role === 'field_personnel' && !siteId.trim()) {
      Alert.alert('Error', 'Site ID is required for field personnel');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!email.trim() || !phone.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email');
      return false;
    }
    if (!isValidPhone(phone)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return false;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    if (newPassword.length < 12) {
      Alert.alert('Error', 'Password must be at least 12 characters long');
      return false;
    }
    return true;
  };

  // Navigation functions
  const handleNextStep = () => {
    if (signupStep === 1 && validateStep1()) {
      setSignupStep(2);
    } else if (signupStep === 2 && validateStep2()) {
      setSignupStep(3);
    }
  };

  const handlePrevStep = () => {
    if (signupStep > 1) setSignupStep(signupStep - 1);
  };

  const handleGetOTP = async () => {
    if (!validateStep3()) return;
    setLoading(true);
    try {
      setRegistrationInProgress(true);
      setShowOtpField(false);
      setOtpCode('');
      
      // IMPORTANT: Set registering flag BEFORE OTP request
      setIsRegistering(true);
      
      console.log('Requesting Email OTP (create user if new):', email);

      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: {
            display_name: fullName,
            phone,
            role,
            organization,
            location,
            site_id: role === 'field_personnel' ? (siteId || null) : null,
            needs_profile: true
          }
        }
      });

      if (error) {
        console.error('OTP send error:', error);
        Alert.alert('Error', error.message);
        setRegistrationInProgress(false);
        setIsRegistering(false); // Reset flag on error
        return;
      }

      console.log('OTP sent response:', data);
      setShowOtpField(true);
      Alert.alert('OTP Sent', 'Check your email for the 6-digit code.');
    } catch (e: any) {
      console.error('OTP initiation error:', e);
      Alert.alert('Error', 'Failed to send OTP.');
      setRegistrationInProgress(false);
      setIsRegistering(false); // Reset flag on error
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registrationInProgress) {
      Alert.alert('Error', 'Start signup first.');
      return;
    }
    if (!otpCode || otpCode.length !== 6) {
      Alert.alert('Error', 'Enter the 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      console.log('Verifying email OTP for:', email);
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email'
      });

      if (verifyError) {
        console.error('OTP verify error:', verifyError);
        const m = verifyError.message.toLowerCase();
        if (m.includes('expired')) Alert.alert('OTP Expired', 'Request a new code.');
        else if (m.includes('invalid')) Alert.alert('Invalid Code', 'Check the code and retry.');
        else Alert.alert('Error', verifyError.message);
        setLoading(false);
        return;
      }

      if (!verifyData.session || !verifyData.user) {
        console.warn('Verified but no session/user returned:', verifyData);
        Alert.alert('Error', 'Unexpected state. Try logging in after a minute.');
        setLoading(false);
        return;
      }

      const user = verifyData.user;
      console.log('OTP verified, user id:', user.id);

      // Wait a moment for auth state to stabilize
      await new Promise(resolve => setTimeout(resolve, 300));

      // Create profile with explicit data
      const profileData = {
        id: user.id,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        gender,
        role,
        organization: organization.trim(),
        location: location.trim(),
        site_id: role === 'field_personnel' ? (siteId?.trim() || null) : null,
        is_active: true,
        last_login_at: new Date().toISOString(),
      };

      console.log('Creating profile with data:', profileData);
      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profileData);

      if (profileError) {
        console.error('Profile create error:', profileError);
        
        // Check if profile already exists
        if (profileError.code === '23505') {
          console.log('Profile already exists, fetching it...');
        } else {
          Alert.alert('Error', `Profile creation failed: ${profileError.message}`);
          setLoading(false);
          setIsRegistering(false);
          return;
        }
      } else {
        console.log('Profile created successfully');
      }

      // Set password
      console.log('Setting password...');
      const { error: pwdError } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      
      if (pwdError) {
        console.error('Password set error:', pwdError);
        Alert.alert('Warning', 'Account created but password setup failed. Please use password recovery.');
      } else {
        console.log('Password set successfully.');
      }

      // Wait for database to commit
      console.log('Waiting for database commit...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Now fetch the profile manually
      console.log('Fetching profile manually...');
      try {
        await refreshProfile();
        console.log('Profile fetched successfully');
      } catch (refreshError) {
        console.error('Profile refresh failed:', refreshError);
      }

      // Clear registration flag
      setIsRegistering(false);

      // Success - navigate to app
      console.log('Registration complete, navigating to app');
      setLoading(false);
      Alert.alert('Success', 'Account created and verified!', [
        { text: 'OK', onPress: () => onAuthSuccess() }
      ]);
      
    } catch (e: any) {
      console.error('Registration flow error:', e);
      Alert.alert('Error', 'Could not complete registration. Please try logging in.');
      setIsRegistering(false);
      setLoading(false);
    } finally {
      setRegistrationInProgress(false);
    }
  };

  const handleLogin = async () => {
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      Alert.alert('Error', 'Please enter email/phone and password');
      return;
    }
  
    setLoading(true);
    try {
      let loginEmail = loginIdentifier.trim();
    
      // If phone number, find email first
      if (isValidPhone(loginIdentifier)) {
        console.log('Phone number detected, looking up email for:', loginIdentifier);
        
        // Normalize the input phone number
        const normalizedInput = normalizePhoneNumber(loginIdentifier);
        console.log('Normalized input phone:', normalizedInput);
        
        // Try exact match first
        let { data: profileData, error } = await supabase
          .from('profiles')
          .select('email, phone')
          .eq('phone', loginIdentifier.trim())
          .maybeSingle();
      
        console.log('Exact match result:', { profileData, error });
      
        // If exact match doesn't work, try fetching all and matching
        if (!profileData || error) {
          console.log('Exact match failed, trying flexible matching...');
          
          const { data: allProfiles, error: fetchError } = await supabase
            .from('profiles')
            .select('email, phone');
        
          console.log('Fetched profiles count:', allProfiles?.length, 'Error:', fetchError);
        
          if (fetchError) {
            console.error('Failed to fetch profiles:', fetchError);
            Alert.alert(
              'Database Error', 
              'Unable to access profiles. This might be an RLS (Row Level Security) policy issue. Please contact support or try logging in with your email address.'
            );
            setLoading(false);
            return;
          }
        
          if (!allProfiles || allProfiles.length === 0) {
            Alert.alert('Error', 'No accounts found in the system. Please sign up first.');
            setLoading(false);
            return;
          }
        
          // Find matching phone number by normalizing both input and stored phone numbers
          profileData = allProfiles.find(profile => {
            if (!profile.phone) return false;
            const normalizedStored = normalizePhoneNumber(profile.phone);
            console.log('Comparing:', normalizedInput, 'with', normalizedStored);
            
            // Try multiple matching strategies
            return normalizedStored === normalizedInput || 
                   normalizedStored.endsWith(normalizedInput) || 
                   normalizedInput.endsWith(normalizedStored) ||
                   normalizedInput.includes(normalizedStored) ||
                   normalizedStored.includes(normalizedInput);
          }) || null;
        }
      
        if (!profileData || !profileData.email) {
          Alert.alert('Error', 'No account found with this phone number. Please check the number or use your email address.');
          setLoading(false);
          return;
        }
      
        loginEmail = profileData.email;
        console.log('Found email for phone:', loginEmail);
      }
    
      // Validate email format before login attempt
      if (!isValidEmail(loginEmail)) {
        Alert.alert('Error', 'Invalid email format');
        setLoading(false);
        return;
      }
    
      console.log('Attempting login with email:', loginEmail);
    
      // Login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
    
      if (error) {
        console.error('Login error:', error);
        Alert.alert('Error', error.message);
        setLoading(false);
        return;
      }
    
      if (data.user) {
        console.log('User logged in successfully:', data.user.email);
        
        // Update last login
        try {
          await supabase
            .from('profiles')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', data.user.id);
        } catch (updateError) {
          console.error('Failed to update last login:', updateError);
          // Don't block login for this
        }
      
        onAuthSuccess();
      }
    } catch (error: any) {
      console.error('Login process error:', error);
      Alert.alert('Error', 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/icons/HydroSnap_logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[NeumorphicTextStyles.heading, styles.appTitle]}>HydroSnap</Text>
        </View>

        <View style={[styles.card, createNeumorphicCard()]}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, isLogin && styles.activeTab, createNeumorphicCard({ size: 'small' })]}
              onPress={() => {
                setIsLogin(true);
                setSignupStep(1);
              }}
            >
              <Text style={[styles.tabText, isLogin && styles.activeTabText]}>
                Login
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, !isLogin && styles.activeTab, createNeumorphicCard({ size: 'small' })]}
              onPress={() => {
                setIsLogin(false);
                setSignupStep(1);
              }}
            >
              <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Form */}
          {isLogin ? (
            <View style={styles.formContainer}>
              <Text style={styles.title}>Welcome Back</Text>
              
              <TextInput
                style={[styles.input, createNeumorphicCard({ depressed: true, size: 'small' })]}
                placeholder="Email or Phone Number"
                value={loginIdentifier}
                onChangeText={setLoginIdentifier}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor={Colors.textSecondary}
              />

              <TextInput
                style={[styles.input, createNeumorphicCard({ depressed: true, size: 'small' })]}
                placeholder="Password"
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry
                placeholderTextColor={Colors.textSecondary}
              />

              <TouchableOpacity
                style={[styles.button, createNeumorphicCard()]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.deepSecurityBlue} />
                ) : (
                  <Text style={[NeumorphicTextStyles.buttonPrimary, { color: Colors.deepSecurityBlue }]}>
                    Login
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* Signup Steps */
            <View style={styles.stepContainer}>
              {signupStep === 1 && (
                <>
                  <Text style={styles.stepTitle}>Step 1: Basic Information</Text>
                  
                  <TextInput
                    style={[styles.input, createNeumorphicCard({ depressed: true, size: 'small' })]}
                    placeholder="Full Name *"
                    value={fullName}
                    onChangeText={setFullName}
                    placeholderTextColor={Colors.textSecondary}
                  />

                  <TouchableOpacity
                    style={[styles.dropdown, createNeumorphicCard({ depressed: true, size: 'small' })]}
                    onPress={() => setShowGenderDropdown(!showGenderDropdown)}
                  >
                    <Text style={styles.dropdownText}>
                      {genders.find(g => g.value === gender)?.label || 'Select Gender *'}
                    </Text>
                  </TouchableOpacity>

                  {showGenderDropdown && (
                    <View style={[styles.dropdownList, createNeumorphicCard()]}>
                      {genders.map((g) => (
                        <TouchableOpacity
                          key={g.value}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setGender(g.value as any);
                            setShowGenderDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{g.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.dropdown, createNeumorphicCard({ depressed: true, size: 'small' })]}
                    onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                  >
                    <Text style={styles.dropdownText}>
                      {roles.find(r => r.value === role)?.label || 'Select Role *'}
                    </Text>
                  </TouchableOpacity>

                  {showRoleDropdown && (
                    <View style={[styles.dropdownList, createNeumorphicCard()]}>
                      {roles.map((r) => (
                        <TouchableOpacity
                          key={r.value}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setRole(r.value);
                            setShowRoleDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{r.label}</Text>
                          <Text style={styles.roleDescription}>{r.description}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TextInput
                    style={[styles.input, createNeumorphicCard({ depressed: true, size: 'small' })]}
                    placeholder="Organization *"
                    value={organization}
                    onChangeText={setOrganization}
                    placeholderTextColor={Colors.textSecondary}
                  />

                  <TextInput
                    style={[styles.input, createNeumorphicCard({ depressed: true, size: 'small' })]}
                    placeholder="Location *"
                    value={location}
                    onChangeText={setLocation}
                    placeholderTextColor={Colors.textSecondary}
                  />

                  <TouchableOpacity
                    style={[styles.button, createNeumorphicCard()]}
                    onPress={handleNextStep}
                  >
                    <Text style={[NeumorphicTextStyles.buttonPrimary, { color: Colors.deepSecurityBlue }]}>
                      Next
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {signupStep === 2 && (
                <>
                  <Text style={styles.stepTitle}>Step 2: Site Information</Text>
                  
                  <TextInput
                    style={[styles.input, createNeumorphicCard({ depressed: true, size: 'small' })]}
                    placeholder={role === 'field_personnel' ? 'Site ID *' : 'Site ID (Optional)'}
                    value={siteId}
                    onChangeText={setSiteId}
                    placeholderTextColor={Colors.textSecondary}
                  />

                  <Text style={styles.infoText}>
                    {role === 'field_personnel' 
                      ? 'Site ID is required for field personnel'
                      : 'You can skip this step or update it later'
                    }
                  </Text>

                  <View style={styles.stepButtons}>
                    <TouchableOpacity
                      style={[styles.button, styles.backButton, createNeumorphicCard({ size: 'small' })]}
                      onPress={handlePrevStep}
                    >
                      <Text style={[NeumorphicTextStyles.buttonSecondary, { color: Colors.textSecondary }]}>
                        Back
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.button, createNeumorphicCard()]}
                      onPress={handleNextStep}
                    >
                      <Text style={[NeumorphicTextStyles.buttonPrimary, { color: Colors.deepSecurityBlue }]}>
                        Next
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {role !== 'field_personnel' && (
                    <TouchableOpacity
                      style={styles.skipButton}
                      onPress={() => {
                        setSiteId('');
                        setSignupStep(3);
                      }}
                    >
                      <Text style={styles.skipText}>Skip this step</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {signupStep === 3 && (
                <>
                  <Text style={styles.stepTitle}>Step 3: Credentials & Verification</Text>

                  <TextInput
                    style={[styles.input, createNeumorphicCard({ depressed: true, size: 'small' })]}
                    placeholder="Email *"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={Colors.textSecondary}
                  />

                  <TextInput
                    style={[styles.input, createNeumorphicCard({ depressed: true, size: 'small' })]}
                    placeholder="Phone Number *"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholderTextColor={Colors.textSecondary}
                  />

                  {!showOtpField && (
                    <>
                      <TextInput
                        style={[styles.input, createNeumorphicCard({ depressed: true, size: 'small' })]}
                        placeholder="Password *"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        placeholderTextColor={Colors.textSecondary}
                      />
                      <TextInput
                        style={[styles.input, createNeumorphicCard({ depressed: true, size: 'small' })]}
                        placeholder="Confirm Password *"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        placeholderTextColor={Colors.textSecondary}
                      />
                    </>
                  )}

                  {!showOtpField ? (
                    <TouchableOpacity
                      style={[styles.button, createNeumorphicCard()]}
                      onPress={handleGetOTP}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color={Colors.deepSecurityBlue} />
                      ) : (
                        <Text style={[NeumorphicTextStyles.buttonPrimary, { color: Colors.deepSecurityBlue }]}>
                          Get OTP
                        </Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TextInput
                        style={[styles.input, createNeumorphicCard({ depressed: true, size: 'small' })]}
                        placeholder="Enter 6-digit OTP *"
                        value={otpCode}
                        onChangeText={setOtpCode}
                        keyboardType="numeric"
                        maxLength={6}
                        placeholderTextColor={Colors.textSecondary}
                      />

                      <TouchableOpacity
                        style={[styles.button, createNeumorphicCard()]}
                        onPress={handleRegister}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator color={Colors.deepSecurityBlue} />
                        ) : (
                          <Text style={[NeumorphicTextStyles.buttonPrimary, { color: Colors.deepSecurityBlue }]}>
                            Verify OTP
                          </Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity
                    style={[styles.button, styles.backButton, createNeumorphicCard({ size: 'small' })]}
                    onPress={handlePrevStep}
                  >
                    <Text style={[NeumorphicTextStyles.buttonSecondary, { color: Colors.textSecondary }]}>
                      Back
                    </Text>
                  </TouchableOpacity>
                </>
              )}

            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  appTitle: {
    fontSize: 32,
    color: Colors.deepSecurityBlue,
    fontWeight: 'bold',
  },
  card: {
    padding: 30,
    borderRadius: 20,
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  activeTab: {
    backgroundColor: Colors.aquaTechBlue + '20',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.deepSecurityBlue,
  },
  formContainer: {
    gap: 20,
  },
  stepContainer: {
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  input: {
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  dropdown: {
    height: 50,
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  dropdownList: {
    marginTop: -10,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemText: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  roleDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  button: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  backButton: {
    flex: 0.4,
    backgroundColor: Colors.lightShadow,
  },
  skipButton: {
    alignItems: 'center',
    marginTop: 10,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});