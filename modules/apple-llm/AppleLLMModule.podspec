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
  # app.json / expo-build-properties), not the FoundationModels availability.
  # FoundationModels is only used behind `#available(iOS 26.0, *)` guards and
  # weak-linked below, so older iOS versions just report isAvailable() == false.
  s.platforms      = { ios: '15.1' }
  s.weak_frameworks = 'FoundationModels'
  s.source_files   = 'src/**/*.swift'
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'
end
