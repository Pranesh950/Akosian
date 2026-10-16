// Akosian
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { theme } from "../src/theme";
import { useGoBack } from "../src/hooks/useGoBack";
import { searchFoodByBarcode, getFoodDatabaseAttribution } from "../src/services/foodDatabase";

type ScanStatus = "idle" | "searching" | "not_found";

const BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e", "code128", "itf14"] as const;

export default function BarcodeScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const handleBack = useGoBack();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [useLegacy, setUseLegacy] = useState(false);
  const [launching, setLaunching] = useState(false);
  const busyRef = useRef(false);

  const modernAvailable =
    CameraView.isModernBarcodeScannerAvailable === true && !useLegacy;

  const handleBarcode = useCallback(
    async ({ data, type }: { data: string; type?: string }) => {
      if (busyRef.current || !data) return;
      busyRef.current = true;
      setStatus("searching");
      setLastCode(data.trim());
      // Dismiss the native modal on iOS so the lookup UI is visible.
      if (Platform.OS === "ios" && modernAvailable) {
        try {
          await CameraView.dismissScanner();
        } catch {
          // Non-fatal — lookup continues underneath.
        }
      }
      try {
        const food = await searchFoodByBarcode(data);
        if (food) {
          // Reuse the existing serving-size + logging screen for the match.
          // source=barcode marks a packaged product so the detail screen can
          // default to 1 package unit (e.g. 1 bottle) instead of a gram guess.
          router.replace(
            `/food-detail?fdcId=${encodeURIComponent(food.fdcId)}&foodName=${encodeURIComponent(food.description)}&source=barcode`
          );
          return;
        }
        setStatus("not_found");
      } catch (e) {
        console.warn("[Barcode] Lookup failed:", e, type);
        setStatus("not_found");
      } finally {
        busyRef.current = false;
      }
    },
    [router, modernAvailable]
  );

  // Subscribe to the native system scanner (ML Kit on Android,
  // DataScannerViewController on iOS 16+). It handles autofocus,
  // auto-zoom, low-light and guidance — far more reliable for
  // close-up EAN/UPC than the legacy frame detector.
  useEffect(() => {
    if (!modernAvailable || !permission?.granted) return;
    const sub = CameraView.onModernBarcodeScanned((event) => {
      void handleBarcode({ data: event.data, type: event.type });
    });
    return () => sub.remove();
  }, [modernAvailable, permission?.granted, handleBarcode]);

  const launchModernScanner = useCallback(async () => {
    if (launching || busyRef.current) return;
    setLaunching(true);
    try {
      await CameraView.launchScanner({
        barcodeTypes: [...BARCODE_TYPES],
        // iOS-only options; ignored on Android.
        isGuidanceEnabled: true,
        isHighlightingEnabled: true,
        isPinchToZoomEnabled: true,
      });
    } catch (e) {
      // User cancelled or device doesn't support it — fall back to
      // the embedded CameraView instead of stranding the user.
      console.warn("[Barcode] Modern scanner failed, using fallback:", e);
      setUseLegacy(true);
    } finally {
      setLaunching(false);
    }
  }, [launching]);

  // Auto-open the native scanner as soon as permissions are ready.
  const autoLaunchedRef = useRef(false);
  useEffect(() => {
    if (
      modernAvailable &&
      permission?.granted &&
      status === "idle" &&
      !autoLaunchedRef.current
    ) {
      autoLaunchedRef.current = true;
      void launchModernScanner();
    }
  }, [modernAvailable, permission?.granted, status, launchModernScanner]);

  const resetScanner = useCallback(() => {
    setStatus("idle");
    if (modernAvailable) {
      void launchModernScanner();
    }
  }, [modernAvailable, launchModernScanner]);

  const cycleZoom = useCallback(() => {
    // 0 → 0.25 → 0.5 → 0 helps tiny barcodes fill the frame
    // without forcing the user to hold the phone awkwardly close.
    setZoom((z) => (z >= 0.5 ? 0 : Number((z + 0.25).toFixed(2))));
  }, []);

  // Camera permission still loading.
  if (!permission) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  // Camera permission not granted.
  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <View style={styles.permissionIcon}>
          <MaterialCommunityIcons name="barcode-scan" size={34} color={theme.colors.primary} />
        </View>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionText}>
          Scan food product barcodes to log them instantly. We only use the
          camera while this screen is open.
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={() => requestPermission()}
          activeOpacity={0.85}
        >
          <Text style={styles.permissionBtnText}>Allow camera access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.permissionBack} onPress={handleBack}>
          <Text style={styles.permissionBackText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Modern native scanner path: lightweight screen that delegates the
  // viewfinder to the OS. Covers searching / not-found states.
  if (modernAvailable) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <View style={styles.topBarAbsolute}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="close" size={24} color={theme.colors.ink} />
          </TouchableOpacity>
        </View>
        {status === "searching" ? (
          <>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.permissionTitle, { marginTop: 16 }]}>Looking up product…</Text>
            <Text style={styles.permissionText}>{lastCode ?? ""}</Text>
          </>
        ) : status === "not_found" ? (
          <>
            <View style={styles.permissionIcon}>
              <MaterialCommunityIcons name="food-off" size={34} color={theme.colors.warning} />
            </View>
            <Text style={styles.permissionTitle}>Barcode not in database</Text>
            <Text style={styles.permissionText}>
              Scanned code: {lastCode ?? "—"}{"\n\n"}
              The offline database covers ~313,000 barcodes, mostly US and
              European packaged products. Regional or newer items often
              aren't in it yet — search manually or log with the AI assistant.
            </Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={resetScanner} activeOpacity={0.85}>
              <Text style={styles.permissionBtnText}>Scan again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.permissionBtn, styles.ghostBtn]}
              onPress={() => router.replace("/food-chat?mode=search")}
              activeOpacity={0.8}
            >
              <Text style={styles.ghostBtnText}>Search manually</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.permissionBack} onPress={() => setUseLegacy(true)}>
              <Text style={styles.permissionBackText}>Use manual camera instead</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.permissionIcon}>
              <MaterialCommunityIcons name="barcode-scan" size={34} color={theme.colors.primary} />
            </View>
            <Text style={styles.permissionTitle}>Ready to scan</Text>
            <Text style={styles.permissionText}>
              The system scanner handles focus and zoom automatically. Hold
              the barcode 10–20 cm away until it locks on.
            </Text>
            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={() => void launchModernScanner()}
              activeOpacity={0.85}
              disabled={launching}
            >
              {launching ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.permissionBtnText}>Open scanner</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.permissionBack} onPress={() => setUseLegacy(true)}>
              <Text style={styles.permissionBackText}>Use manual camera instead</Text>
            </TouchableOpacity>
          </>
        )}
        <Text style={[styles.attribution, { color: theme.colors.muted, marginTop: 24 }]}>
          {getFoodDatabaseAttribution()}
        </Text>
      </View>
    );
  }

  // Legacy fallback: embedded CameraView for devices without the
  // system scanner. Torch + zoom controls fix the two most common
  // close-up failures (dark / too-small barcode hunting focus).
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        autofocus="off"
        enableTorch={torchOn}
        zoom={zoom}
        barcodeScannerSettings={{
          barcodeTypes: [...BARCODE_TYPES],
        }}
        onBarcodeScanned={status === "idle" ? handleBarcode : undefined}
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeBtnDark} onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Scan a barcode</Text>
          <View style={styles.topActions}>
            <TouchableOpacity
              style={[styles.iconBtn, torchOn && styles.iconBtnActive]}
              onPress={() => setTorchOn((v) => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Toggle torch"
            >
              <MaterialCommunityIcons
                name={torchOn ? "flashlight" : "flashlight-off"}
                size={22}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={cycleZoom}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Cycle zoom"
            >
              <MaterialCommunityIcons name="magnify-plus-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.midArea}>
          <View style={styles.frame}>
            <View style={[styles.frameCorner, styles.cornerTL]} />
            <View style={[styles.frameCorner, styles.cornerTR]} />
            <View style={[styles.frameCorner, styles.cornerBL]} />
            <View style={[styles.frameCorner, styles.cornerBR]} />
          </View>

          {zoom > 0 && (
            <View style={styles.zoomPill}>
              <Text style={styles.zoomPillText}>{Math.round(zoom * 100)}% zoom — tap + to change</Text>
            </View>
          )}

          {status === "searching" && (
            <View style={styles.statusCard}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.statusText}>Looking up product…</Text>
            </View>
          )}

          {status === "not_found" && (
            <View style={styles.statusCard}>
              <MaterialCommunityIcons name="food-off" size={26} color={theme.colors.warning} />
              <Text style={styles.statusTitle}>Barcode not in database</Text>
              <Text style={styles.statusCode}>Scanned code: {lastCode ?? "—"}</Text>
              <Text style={styles.statusText}>
                The offline database covers ~313,000 barcodes, mostly US and
                European packaged products. Regional or newer items often
                aren't in it yet — search manually or log with the AI assistant.
              </Text>
              <View style={styles.statusActions}>
                <TouchableOpacity style={styles.statusBtn} onPress={resetScanner} activeOpacity={0.8}>
                  <Text style={styles.statusBtnText}>Try again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusBtn, styles.statusBtnGhost]}
                  onPress={() => router.replace("/food-chat?mode=search")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.statusBtnGhostText}>Search manually</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.bottomHint}>
          <Text style={styles.bottomHintText}>
            Hold 10–20 cm away, steady. Use light + zoom for small codes.
          </Text>
          <Text style={styles.attribution}>{getFoodDatabaseAttribution()}</Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xxl,
    backgroundColor: theme.colors.bg,
  },
  topBarAbsolute: {
    position: "absolute",
    top: 12,
    left: 16,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnDark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  topActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  topTitle: {
    ...theme.typography.titleSm,
    color: "#FFFFFF",
  },
  midArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
  },
  frame: {
    width: 260,
    height: 150,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  frameCorner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderColor: theme.colors.lime,
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 18,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 18,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 18,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 18,
  },
  zoomPill: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  zoomPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
  },
  statusCard: {
    width: 300,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    ...theme.shadows.elevated,
  },
  statusTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
    marginTop: theme.spacing.xs,
  },
  statusCode: {
    ...theme.typography.legal,
    color: theme.colors.body,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    marginTop: 4,
  },
  statusText: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
  },
  statusActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  statusBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
  },
  statusBtnText: {
    ...theme.typography.labelMd,
    color: "#FFFFFF",
  },
  statusBtnGhost: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusBtnGhostText: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
  bottomHint: {
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: Math.max(24, 16),
  },
  bottomHintText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    textAlign: "center",
  },
  attribution: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    marginTop: 6,
    textAlign: "center",
  },
  permissionIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
  permissionTitle: {
    ...theme.typography.titleLg,
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  permissionText: {
    ...theme.typography.bodyMd,
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: theme.spacing.xl,
  },
  permissionBtn: {
    width: "100%",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  permissionBtnText: {
    ...theme.typography.labelMd,
    color: "#FFFFFF",
  },
  ghostBtn: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ghostBtnText: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
  permissionBack: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  permissionBackText: {
    ...theme.typography.bodyMd,
    color: theme.colors.muted,
  },
});
