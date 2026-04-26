//
//  AppDelegate.swift
//  Axolittle Beta
//
//  UIKit app delegate — window/scene lifecycle is owned by the SwiftUI App
//  struct (Axolittle_BetaApp), so this class handles only app-level events.
//

import UIKit
import AVFoundation

class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Allow audio to play through the speaker and alongside other apps.
        // .ambient respects the device silent switch, which is correct for a game
        // that the user may want to mute without leaving the app.
        try? AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default, options: .mixWithOthers)
        try? AVAudioSession.sharedInstance().setActive(true)
        return true
    }
}
