import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { colors, fontSize, spacing } from '../constants/theme';
import { strings } from '../constants/strings';
import { PrimaryButton } from './PrimaryButton';

interface CameraPermissionGateProps {
  children: React.ReactNode;
}

/** Bọc quanh mọi màn cần CameraView — chỉ render children khi đã có quyền camera,
 * còn lại tự hiện màn xin quyền / hướng dẫn mở Settings khi bị từ chối hẳn. */
export function CameraPermissionGate({ children }: CameraPermissionGateProps) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.greenMain} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{strings.camera.permissionTitle}</Text>
        <Text style={styles.message}>{strings.camera.permissionMessage}</Text>
        <PrimaryButton
          label={permission.canAskAgain ? strings.camera.grantPermission : strings.camera.openSettings}
          onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
          style={styles.button}
        />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    paddingHorizontal: spacing.xl,
  },
});
