import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { ensureProfileAndCharacter } from '@/services/profileService';

export default function SignupScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const signup = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });

    if (!error && data.user) {
      await ensureProfileAndCharacter(data.user.id, username.trim() || email.split('@')[0]);
    }

    setLoading(false);

    if (error) {
      Alert.alert('Signup failed', error.message);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 18 }}>
        <View>
          <AppText variant="caption" style={{ color: colors.primary }}>
            New character
          </AppText>
          <AppText variant="title">Start at Level 1.</AppText>
          <AppText muted>Your workouts become EXP, stats, and mission progress.</AppText>
        </View>
        <Card>
          <TextField placeholder="Username" value={username} onChangeText={setUsername} />
          <TextField autoCapitalize="none" keyboardType="email-address" placeholder="Email" value={email} onChangeText={setEmail} />
          <TextField placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
          <PrimaryButton
            label={loading ? 'Creating...' : 'Create account'}
            onPress={signup}
            disabled={loading || !email || password.length < 6}
          />
          <Link href="/login" style={{ color: colors.primary, textAlign: 'center', fontWeight: '700' }}>
            Back to login
          </Link>
        </Card>
      </View>
    </Screen>
  );
}
