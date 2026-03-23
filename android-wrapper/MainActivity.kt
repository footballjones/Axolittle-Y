package com.uomalabs.axolittle

import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewAssetLoader.AssetsPathHandler

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Serve bundled dist/ files via a trusted https:// scheme.
        // Files must be placed at:  src/main/assets/dist/
        // Loaded URL:  https://appassets.androidplatform.net/assets/dist/index.html
        //
        // Why https instead of file://:
        //   - localStorage requires a non-file scheme to persist correctly
        //   - WebViewAssetLoader intercepts the request and serves from assets/
        //   - All relative paths (./assets/..., music/, sounds/) resolve correctly
        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/assets/", AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true                    // Required for localStorage (game state)
                mediaPlaybackRequiresUserGesture = false    // Allow audio autoplay
                allowFileAccess = false                     // Not needed — using asset loader
                allowContentAccess = false
                setSupportZoom(false)
                builtInZoomControls = false
                displayZoomControls = false
            }

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest
                ): WebResourceResponse? {
                    // Let the asset loader serve anything under appassets.androidplatform.net
                    return assetLoader.shouldInterceptRequest(request.url)
                }
            }

            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            isHapticFeedbackEnabled = false

            // Enable remote debugging in debug builds via chrome://inspect
            if (BuildConfig.DEBUG) {
                WebView.setWebContentsDebuggingEnabled(true)
            }
        }

        setContentView(webView)

        // Consume back presses — the game handles its own navigation internally
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // Intentionally empty: prevent the OS from exiting the app
                // The game's own UI handles going back between screens
            }
        })

        webView.loadUrl("https://appassets.androidplatform.net/assets/dist/index.html")
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
