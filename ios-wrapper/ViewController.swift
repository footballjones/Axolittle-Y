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
        // Deep-ocean base so no white flash shows through the transparent WebView
        view.backgroundColor = UIColor(red: 0.016, green: 0.078, blue: 0.157, alpha: 1)

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
        
        // Keep the screen on while the game is running — the axolotl is always
        // animating and there are no idle states that should let the display sleep.
        UIApplication.shared.isIdleTimerDisabled = true

        // ── WebGL context-loss protection ─────────────────────────────────────
        // iOS can evict WebGL contexts under memory pressure or after a long
        // background period. Without handling this the spine canvas goes blank
        // permanently. Strategy:
        //   • Intercept every canvas.getContext('webgl*') call to attach listeners.
        //   • contextlost  → preventDefault() (request a restore attempt) + 5 s
        //                     watchdog that reloads the page if not restored.
        //                     Game state lives in localStorage, so no progress lost.
        //   • contextrestored → cancel watchdog + notify the app via custom event.
        //   • axo-app-resume  → if any context is still lost, reload immediately.
        let webglGuard = WKUserScript(
            source: """
            (function () {
                var origGetContext = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function (type, attrs) {
                    var ctx = origGetContext.call(this, type, attrs);
                    if (ctx && (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') && !this._axoWglListeners) {
                        this._axoWglListeners = true;
                        this._axoGl = ctx;
                        var canvas = this;
                        var watchdog = null;
                        canvas.addEventListener('webglcontextlost', function (e) {
                            e.preventDefault();
                            watchdog = setTimeout(function () { window.location.reload(); }, 5000);
                        }, false);
                        canvas.addEventListener('webglcontextrestored', function () {
                            if (watchdog) { clearTimeout(watchdog); watchdog = null; }
                            document.dispatchEvent(new Event('axo-webgl-restored'));
                        }, false);
                    }
                    return ctx;
                };
                document.addEventListener('axo-app-resume', function () {
                    var lost = Array.prototype.some.call(document.querySelectorAll('canvas'), function (c) {
                        return c._axoGl && c._axoGl.isContextLost();
                    });
                    if (lost) { window.location.reload(); }
                }, false);
            })();
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        config.userContentController.addUserScript(webglGuard)

        // Patch AudioContext before the page runs so every instance the game
        // creates is tracked. On the first user gesture all suspended contexts
        // are resumed, bypassing iOS WebKit's autoplay block. After resuming,
        // axo-app-resume is dispatched so the game's audio manager retries
        // any music that was blocked on startup.
        let audioUnlock = WKUserScript(
            source: """
            (function () {
                var pending = [];
                var unlocked = false;
                var NativeAC = window.AudioContext || window.webkitAudioContext;
                if (NativeAC) {
                    var Patched = function (opts) {
                        var ctx = new NativeAC(opts);
                        pending.push(ctx);
                        return ctx;
                    };
                    Patched.prototype = NativeAC.prototype;
                    window.AudioContext = window.webkitAudioContext = Patched;
                }
                function unlock() {
                    if (unlocked) return;
                    unlocked = true;
                    pending.forEach(function (ctx) {
                        if (ctx.state === 'suspended') ctx.resume().catch(function(){});
                    });
                    if (window.Howler) {
                        if (window.Howler.ctx && window.Howler.ctx.state === 'suspended') {
                            window.Howler.ctx.resume().catch(function(){});
                        }
                        if (typeof window.Howler._autoResume === 'function') {
                            window.Howler._autoResume();
                        }
                    }
                    document.querySelectorAll('audio,video').forEach(function (el) {
                        el.play && el.play().catch(function(){});
                    });
                    setTimeout(function () {
                        document.dispatchEvent(new Event('axo-app-resume'));
                    }, 150);
                }
                ['touchstart','touchend','click'].forEach(function (t) {
                    document.addEventListener(t, unlock, { capture: true, passive: true });
                });
            })();
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        config.userContentController.addUserScript(audioUnlock)

        // Load the web app
        loadWebApp()
    }
    
    func loadWebApp() {
        guard let distURL = Bundle.main.url(forResource: "dist", withExtension: nil),
              let indexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "dist"),
              var html = try? String(contentsOf: indexURL, encoding: .utf8) else {
            showMissingAssetsMessage(details: "Could not find dist/index.html in the app bundle.")
            return
        }

        // Strip type="module" so the script loads as a classic script.
        // Module scripts enforce CORS on file:// which fails (null origin).
        // The Vite bundle is self-contained — no external imports — so it
        // runs correctly as a classic script.
        html = html.replacingOccurrences(of: " type=\"module\"", with: "")

        // loadFileURL + allowingReadAccessTo makes all dist/ resources
        // same-origin, so WebGL textures and audio load without CORS issues.
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("axolittle-index.html")
        guard (try? html.write(to: tempURL, atomically: true, encoding: .utf8)) != nil else {
            showMissingAssetsMessage(details: "Could not write patched index.html.")
            return
        }
        webView.loadFileURL(tempURL, allowingReadAccessTo: distURL)
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
    
    // Prevent external navigation — but open mailto: and https:// links in the
    // appropriate system app (Mail / Safari) rather than blocking them silently.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.navigationType == .linkActivated {
            if let url = navigationAction.request.url {
                if url.scheme == bundledContentScheme || url.scheme == "file" || url.host == nil {
                    // Internal navigation — allow inside WebView
                    decisionHandler(.allow)
                } else if url.scheme == "https" || url.scheme == "http" || url.scheme == "mailto" {
                    // External link (privacy policy, support email, etc.) — hand off to system
                    decisionHandler(.cancel)
                    UIApplication.shared.open(url)
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
        // Game background is dark blue — use light (white) status bar icons.
        return .lightContent
    }

    // Notify the game under system memory pressure so it can shed non-critical
    // caches before iOS forces a more drastic response (e.g. context eviction).
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        webView.evaluateJavaScript(
            "document.dispatchEvent(new Event('axo-memory-warning'))"
        ) { _, _ in }
    }

    // ── App lifecycle: pause audio when backgrounded, resume when foregrounded ──

    @objc private func appDidEnterBackground() {
        webView.evaluateJavaScript("document.dispatchEvent(new Event('axo-app-pause'))") { _, _ in }
    }

    @objc private func appWillEnterForeground() {
        webView.evaluateJavaScript("document.dispatchEvent(new Event('axo-app-resume'))") { _, _ in }
    }

    deinit {
        UIApplication.shared.isIdleTimerDisabled = false
        NotificationCenter.default.removeObserver(self)
    }
}
