import { StyleSheet, View } from 'react-native';
import { StatusColorKey, statusColorHex } from '../constants/theme';

interface ColorDotProps {
  color: StatusColorKey;
  size?: number;
}

export function ColorDot({ color, size = 10 }: ColorDotProps) {
  return (
    <View
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: statusColorHex[color] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {},
});
