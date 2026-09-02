import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { colors } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';

export default function Index() {
  const { profile, loading } = useAuth();

  // Đang kiểm tra phiên đăng nhập cũ (AsyncStorage persistence) — chưa biết
  // điều hướng đi đâu nên chưa được <Redirect>.
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.greenMain} />
      </View>
    );
  }

  if (!profile) return <Redirect href="/(auth)/login" />;
  return <Redirect href={profile.role === 'grower' ? '/(grower)' : '/(retailer)'} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
