import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../constants/theme';

interface LeafLogoProps {
  size?: number;
  leafColor?: string;
  backgroundColor?: string;
}

/** Logo lá vẽ bằng react-native-svg (đã có sẵn từ mốc 0, không cần thư viện/asset
 * mới) — huy hiệu tròn nền xanh đậm (#14532D) với hình lá xanh sáng ở giữa, dùng ở
 * màn đăng nhập để tạo nhận diện thương hiệu ngay từ lần mở app đầu tiên. */
export function LeafLogo({ size = 96, leafColor = colors.greenMain, backgroundColor = colors.greenDark }: LeafLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={50} fill={backgroundColor} />
      <Path d="M50 82 C25 78 18 55 26 30 C34 8 60 6 78 18 C78 46 70 78 50 82 Z" fill={leafColor} />
      <Path
        d="M50 78 C46 60 44 38 30 22"
        stroke={backgroundColor}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}
