// Akosian
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  Stop,
  LinearGradient as SvgLinearGradient,
  Rect as SvgRect,
} from "react-native-svg";
import { theme } from "../theme";

export function GradientWash({ color = theme.colors.info, height = 280 }: { color?: string; height?: number }) {
  return (
    <View style={[styles.wash, { height }]} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id="gradientWash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.14} />
            <Stop offset="100%" stopColor={theme.colors.bg} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        <SvgRect x="0" y="0" width="100%" height="100%" fill="url(#gradientWash)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});
