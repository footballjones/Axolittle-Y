//
//  ViewController.swift
//  Axolittle
//
//  WKWebView wrapper for the React web app
//

import UIKit
import WebKit

class ViewController: UIViewController, WKNavigationDelegate {
    private let bundledContentScheme = "axolittle"
    var webView: WKWebView!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground

        // Pause/resume music when the app moves to background/foreground
        NotificationCenter.default.addObserver(self, selector: #selector(appDidEnterBackground), name: UIApplication.didEnterBackgroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(appWillEnterForeground), name: UIApplication.willEnterForegroundNotification, object: nil)
        
        // Configure WKWebView
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.setURLSchemeHandler(BundleURLSchemeHandler(), forURLScheme: bundledContentScheme)
        
        // Enable data storage for localStorage
        let websiteDataStore = WKWebsiteDataStore.default()
        config.websiteDataStore = websiteDataStore
        
        // Create web view
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        #if DEBUG
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
        #endif
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        webView.isOpaque = false
        webView.backgroundColor = .clear
        
        // Disable zoom
        webView.scrollView.minimumZoomScale = 1.0
        webView.scrollView.maximumZoomScale = 1.0
        webView.scrollView.isScrollEnabled = false
        
        view.addSubview(webView)
        
        // Set up constraints
        webView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        
        // Load the web app
        loadWebApp()
    }
    
    func loadWebApp() {
        guard let htmlURL = URL(string: "\(bundledContentScheme)://app/index.html") else {
            showMissingAssetsMessage(details: "Could not create the bundled content URL.")
            print("Error: Could not create bundled content URL")
            return
        }

        guard Bundle.main.path(forResource: "index", ofType: "html", inDirectory: "dist") != nil else {
            showMissingAssetsMessage(details: "Could not find dist/index.html in the app bundle.")
            print("Error: Could not find dist/index.html in bundle")
            return
        }

        // Load the HTML file
        webView.load(URLRequest(url: htmlURL))
    }

    private func showMissingAssetsMessage(details: String) {
        webView.isHidden = true

        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.numberOfLines = 0
        label.textAlignment = .center
        label.textColor = .label
        label.text = "Missing bundled web assets. \(details) Add index.html and related files to the app target resources."

        view.addSubview(label)

        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            label.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 24),
            label.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -24)
        ])
    }
    
    // Handle navigation errors
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showMissingAssetsMessage(details: "Navigation error: \(error.localizedDescription)")
        print("Navigation error: \(error.localizedDescription)")
    }
    
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        showMissingAssetsMessage(details: "Navigation failed: \(error.localizedDescription)")
        print("Navigation failed: \(error.localizedDescription)")
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        webView.evaluateJavaScript("document.body ? document.body.innerText.slice(0, 500) : 'no body'") { result, error in
            if let error {
                print("JavaScript inspection error: \(error.localizedDescription)")
                return
            }

            if let text = result as? String {
                print("Web content preview: \(text)")
            }
        }
    }
    
    // Prevent external navigation
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.navigationType == .linkActivated {
            if let url = navigationAction.request.url {
                // Allow our custom scheme and file:// — block everything else (http/https external links)
                if url.scheme == bundledContentScheme || url.scheme == "file" || url.host == nil {
                    decisionHandler(.allow)
                } else {
                    print("[ViewController] Blocked external navigation to: \(url)")
                    decisionHandler(.cancel)
                }
            } else {
                decisionHandler(.allow)
            }
        } else {
            decisionHandler(.allow)
        }
    }
    
    // Lock to portrait orientation
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        return .portrait
    }
    
    override var prefersStatusBarHidden: Bool {
        return false
    }
    
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .darkContent
    }

    // ── App lifecycle: pause audio when backgrounded, resume when foregrounded ──

    @objc private func appDidEnterBackground() {
        webView.evaluateJavaScript("document.dispatchEvent(new Event('axo-app-pause'))") { _, _ in }
    }

    @objc private func appWillEnterForeground() {
        webView.evaluateJavaScript("document.dispatchEvent(new Event('axo-app-resume'))") { _, _ in }
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}
