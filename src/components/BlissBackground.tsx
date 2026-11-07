import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Ellipse } from 'react-native-svg';

/**
 * Windows XP "Bliss" 壁紙をイメージした背景コンポーネント
 * 抜けるような青空・やわらかい白い雲・鮮やかな緑の丘陵を描画し、
 * その上に白く透ける清潔なTODOカードを浮かべるための背景レイヤー。
 */
export const BlissBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <View style={styles.container}>
      {/* 青空グラデーション（天頂の深いセルリアンブルーから地平線の明るいスカイブルーへ） */}
      <LinearGradient
        colors={['#1E57C8', '#3B82F6', '#7CC2FF', '#C2E7FF']}
        locations={[0, 0.38, 0.68, 0.85]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 白い雲と緑の丘（SVGベクター風景） */}
      <View style={styles.sceneryWrapper} pointerEvents="none">
        <Svg
          viewBox="0 0 400 800"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        >
          {/* 遠くのふんわりした白い雲 */}
          <Ellipse cx="90" cy="150" rx="75" ry="22" fill="rgba(255,255,255,0.42)" />
          <Ellipse cx="130" cy="142" rx="55" ry="26" fill="rgba(255,255,255,0.52)" />
          <Ellipse cx="310" cy="210" rx="85" ry="24" fill="rgba(255,255,255,0.38)" />
          <Ellipse cx="275" cy="200" rx="50" ry="20" fill="rgba(255,255,255,0.48)" />
          <Ellipse cx="200" cy="430" rx="130" ry="28" fill="rgba(255,255,255,0.55)" />

          {/* 奥のなだらかな緑の丘（陽光が当たる明るいライムグリーン） */}
          <Path
            d="M0,540 C120,485 260,515 400,555 L400,800 L0,800 Z"
            fill="#7CC623"
          />

          {/* 中景の鮮やかな草原の稜線 */}
          <Path
            d="M0,585 C150,550 280,530 400,575 L400,800 L0,800 Z"
            fill="#56A818"
          />

          {/* 手前の深みのある緑の丘 */}
          <Path
            d="M0,645 C140,615 290,635 400,615 L400,800 L0,800 Z"
            fill="#3B8712"
          />
        </Svg>
      </View>

      {/* コンテンツレイヤー */}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#245EDC',
  },
  sceneryWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
  },
});
