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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert('Login failed', error.message);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 18 }}>
        <View>
          <AppText variant="caption" style={{ color: colors.primary }}>
            LevelUp Fitness
          </AppText>
          <AppText variant="title">Train. Earn EXP. Level up.</AppText>
          <AppText muted>Record real workouts and grow a physical RPG character.</AppText>
        </View>
        <Card>
          <TextField autoCapitalize="none" keyboardType="email-address" placeholder="Email" value={email} onChangeText={setEmail} />
          <TextField placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
          <PrimaryButton label={loading ? 'Signing in...' : 'Login'} onPress={login} disabled={loading || !email || !password} />
          <Link href="/signup" style={{ color: colors.primary, textAlign: 'center', fontWeight: '700' }}>
            Create an account
          </Link>
        </Card>
      </View>
    </Screen>
  );
}
