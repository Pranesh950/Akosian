require 'json'

Pod::Spec.new do |s|
  s.name           = 'AppleLLMModule'
  s.version        = '1.0.0'
  s.summary        = 'Expo module bridging Apple Foundation Models'
  s.homepage       = 'https://github.com/example/apple-llm'
  s.license        = 'MIT'
  s.author         = 'Health App'
  s.source         = { git: '' }
  s.static_framework = true
  # Must match the app's minimum deployment target (ios.deploymentTarget in
  # app.json / expo-build-properties), not the FoundationModels availability:
  # CocoaPods refuses to install this pod at all if it asks for a higher iOS
  # version than the Podfile platform.
  s.platforms      = { ios: '15.1' }
  # The FoundationModels calls are guarded by `#if canImport(FoundationModels)`
  # and `guard #available(iOS 26.0, *)`, so an iOS 15.1 build against the iOS 26
  # SDK keeps the feature and older iOS versions just report isAvailable() ==
  # false. Weak-link the framework when the active SDK ships it, so the app
  # still launches on iOS < 26. SDKs without FoundationModels compile the
  # guarded code out entirely, so no linker flag is added there (a dangling
  # -weak_framework reference would fail the link).
  sdk_path = `xcrun --sdk iphoneos --show-sdk-path 2>/dev/null`.strip
  foundation_models_sdk = File.join(sdk_path, 'System/Library/Frameworks/FoundationModels.framework')
  s.weak_frameworks = 'FoundationModels' if File.directory?(foundation_models_sdk)
  s.source_files   = 'src/**/*.swift'
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'
end
