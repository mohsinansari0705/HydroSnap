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

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
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
  
  // Step 3: Credentials
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtpField, setShowOtpField] = useState(false);
  
  // Login
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // UI state
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

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
    if (!email.trim() || !phone.trim() || !password.trim()) {
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
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
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

  // Authentication functions - using old working approach
  const handleGetOTP = async () => {
    if (!validateStep3()) return;

    setLoading(true);
    try {
      console.log('Attempting to sign up user with email:', email);
      
      // Use old working approach: signUp with user metadata
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: fullName,
            phone: phone,
            role: role,
            organization: organization,
            location: location,
            site_id: role === 'field_personnel' ? (siteId || null) : null,
          }
        }
      });
      
      if (error) {
        console.error('Signup error:', error);
        Alert.alert('Error', error.message);
        return;
      }

      console.log('Signup response with metadata:', { user: data.user, session: data.session });

      if (data.user) {
        // Always require email verification - no auto-confirmation
        console.log('User created with metadata, email verification required');
        setShowOtpField(true);
        Alert.alert('Success', 'Please check your email...');
      }
    } catch (error: any) {
      console.error('OTP request error:', error);
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!otpCode || otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      // User already created in handleGetOTP with metadata, just verify the OTP

      // If magic link was sent successfully, verify with the OTP code
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'signup'
      });

      if (verifyError) {
        console.error('OTP verification error:', verifyError);
        Alert.alert('Error', verifyError.message);
        return;
      }

      if (verifyData.user && verifyData.session) {
        console.log('OTP verified successfully for user:', verifyData.user.email);
        console.log('User metadata:', verifyData.user.user_metadata);

        // Create profile using the metadata from auth.user
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: verifyData.user.id,
            full_name: verifyData.user.user_metadata.display_name || fullName,
            email: verifyData.user.email,
            phone: verifyData.user.user_metadata.phone || phone,
            gender,
            role: verifyData.user.user_metadata.role || role,
            organization: verifyData.user.user_metadata.organization || organization,
            location: verifyData.user.user_metadata.location || location,
            site_id: verifyData.user.user_metadata.site_id || (role === 'field_personnel' ? siteId || null : null),
            is_active: true,
            last_login_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          Alert.alert('Error', `Profile creation failed: ${profileError.message}`);
          return;
        }

        console.log('Profile created successfully for user:', verifyData.user.email);
        
        // The user is now authenticated with a complete profile
        Alert.alert('Success', 'Account created successfully!', [
          { text: 'OK', onPress: onAuthSuccess }
        ]);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      Alert.alert('Error', 'Please enter email/phone and password');
      return;
    }

    setLoading(true);
    try {
      let loginEmail = loginIdentifier;

      // If phone number, find email first
      if (isValidPhone(loginIdentifier)) {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('email')
          .eq('phone', loginIdentifier)
          .single();

        if (error || !profileData) {
          Alert.alert('Error', 'No account found with this phone number');
          return;
        }
        loginEmail = profileData.email;
      }

      // Login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      if (data.user) {
        // Update last login
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id);

        console.log('User logged in successfully:', data.user.email);
        onAuthSuccess();
      }
    } catch (error: any) {
      Alert.alert('Error', 'Login failed');
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
                  <Text style={styles.stepTitle}>Step 3: Account Details</Text>
                  
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

                  <TextInput
                    style={[styles.input, createNeumorphicCard({ depressed: true, size: 'small' })]}
                    placeholder="Password *"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholderTextColor={Colors.textSecondary}
                  />

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
                            Register
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