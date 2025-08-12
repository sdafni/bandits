import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function Index() {
  const [user, setUser] = useState<any | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignIn, setIsSignIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      router.replace('/(tabs)/bandits');
    }
  }, [user, router]);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleEmailSignup = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError(null);
    setLoading(true);
    const { error, data } = await supabase.auth.signUp({ 
      email: email.trim(), 
      password,
      options: {
        emailRedirectTo: Platform.OS === 'web' 
          ? `${window.location.origin}/auth/callback`
          : 'bandits://auth/callback'
      }
    });
    if (error) {
      setError(error.message);
    } else if (data.user && !data.session) {
      // Email confirmation required
      setEmailSent(true);
    }
    setLoading(false);
  };

  const handleResendEmail = async () => {
    setLoading(true);
    setResendSuccess(false);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: {
        emailRedirectTo: Platform.OS === 'web' 
          ? `${window.location.origin}/auth/callback`
          : 'bandits://auth/callback'
      }
    });
    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setResendSuccess(true);
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: Platform.OS === 'web' 
            ? `${window.location.origin}/auth/callback`
            : 'bandits://auth/callback'
        }
      });
      
      if (error) {
        setError(error.message);
      }
      // Note: The OAuth flow will redirect to the callback page automatically
    } catch (error) {
      setError('Failed to sign in with Google');
      console.error('Google sign-in error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (user === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff0000" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('@/assets/images/banditour-logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {emailSent ? (
          // Email confirmation screen
          <View style={styles.formContainer}>
            <Text style={styles.confirmationTitle}>Check your email</Text>
            <Text style={styles.confirmationText}>
              We've sent a confirmation link to {email}
            </Text>
            <Text style={styles.confirmationSubtext}>
              Click the link in your email to complete your registration
            </Text>
            
            {/* Resend Email Button */}
            <TouchableOpacity 
              style={styles.resendButton}
              onPress={handleResendEmail}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ff0000" />
              ) : (
                <Text style={styles.resendButtonText}>Resend email</Text>
              )}
            </TouchableOpacity>

            {/* Error Message */}
            {error && <Text style={styles.errorText}>{error}</Text>}
            
            {/* Success Message */}
            {resendSuccess && <Text style={styles.successText}>Email sent successfully!</Text>}

            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                setEmailSent(false);
                setEmail('');
                setPassword('');
                setError(null);
                setResendSuccess(false);
              }}
            >
              <Text style={styles.backButtonText}>Back to sign up</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tab, isSignIn && styles.activeTab]}
                onPress={() => setIsSignIn(true)}
              >
                <Text style={[styles.tabText, isSignIn && styles.activeTabText]}>
                  Sign in
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, !isSignIn && styles.activeTab]}
                onPress={() => setIsSignIn(false)}
              >
                <Text style={[styles.tabText, !isSignIn && styles.activeTabText]}>
                  Sign up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Enter Email</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#777777"
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.textInput, styles.passwordInput]}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#777777"
                  />
                  <TouchableOpacity 
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text style={styles.eyeIconText}>👁</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity 
                style={styles.signInButton}
                onPress={isSignIn ? handleEmailLogin : handleEmailSignup}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.signInButtonText}>
                    {isSignIn ? 'Sign in' : 'Sign up'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Sign In Button */}
              <TouchableOpacity 
                style={styles.googleButton}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              {/* Error Message */}
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          </>
        )}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 79,
    height: 79,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    padding: 4,
    marginBottom: 40,
    alignSelf: 'center',
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 21,
    minWidth: 80,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#ff0000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 4,
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff0000',
  },
  activeTabText: {
    color: '#ffffff',
  },
  formContainer: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#777777',
    marginBottom: 8,
    fontWeight: '300',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#adadad',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIconText: {
    fontSize: 16,
  },

  signInButton: {
    backgroundColor: '#ff0000',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },

  errorText: {
    color: '#ff0000',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  successText: {
    color: '#28a745',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    fontWeight: 'bold',
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333333',
  },
  confirmationText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
    color: '#555555',
  },
  confirmationSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#777777',
  },
  backButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#adadad',
  },
  backButtonText: {
    color: '#ff0000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendButton: {
    backgroundColor: '#ffffff',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ff0000',
  },
  resendButtonText: {
    color: '#ff0000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#adadad',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#777777',
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#adadad',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  googleButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
  },
});