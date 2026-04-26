//
//  ContentView.swift
//  Axolittle Beta
//
//  Bridges the SwiftUI scene into the UIKit ViewController that hosts the
//  WKWebView.  ignoresSafeArea() on the call site lets the web view
//  extend edge-to-edge under the status bar and home indicator.
//

import SwiftUI

struct ContentView: View {
    // Match the game's deep-ocean background so there is no white flash
    // between launch screen and first WebView paint.
    private static let oceanBlue = Color(red: 0.016, green: 0.078, blue: 0.157)

    var body: some View {
        _ViewControllerBridge()
            .ignoresSafeArea()
            .background(Self.oceanBlue)
    }
}

private struct _ViewControllerBridge: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> ViewController {
        ViewController()
    }

    func updateUIViewController(_ uiViewController: ViewController, context: Context) {}
}
