import Svg, { Path } from 'react-native-svg';
import { colors } from '../constants/theme';

interface LeafLogoProps {
  size?: number;
  color?: string;
}

/** Hình chiếc lá đúng bộ nhận diện (khớp icon.png/adaptive-icon.png/splash-logo.png)
 * — viền lá + gân vẽ bằng stroke (không tô đặc), viewBox cố định "-40 -40 80 80" nên
 * to/nhỏ theo prop `size` mà không méo tỉ lệ nét vẽ. Dùng lại ở mọi nơi cần vẽ logo
 * (màn đăng nhập, đăng ký...) thay vì tự vẽ SVG riêng từng chỗ. */
export function LeafLogo({ size = 96, color = colors.greenMain }: LeafLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="-40 -40 80 80">
      <Path
        d="M 26 -26 C 26 16 6 30 -14 26 C -32 22 -30 -4 -12 -14 C 2 -22 16 -22 26 -26 z"
        fill="none"
        stroke={color}
        strokeWidth={7}
        strokeLinejoin="round"
      />
      <Path d="M 18 -18 L -16 18" stroke={color} strokeWidth={5.5} strokeLinecap="round" />
    </Svg>
  );
}
