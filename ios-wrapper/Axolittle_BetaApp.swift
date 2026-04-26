//
//  Axolittle_BetaApp.swift
//  Axolittle Beta
//
//  SwiftUI app entry point.  @UIApplicationDelegateAdaptor connects the
//  UIKit AppDelegate for any app-level callbacks without letting it own
//  window creation (SwiftUI owns the window through WindowGroup).
//

import SwiftUI

@main
struct Axolittle_BetaApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
                .ignoresSafeArea()
        }
    }
}
