import Foundation
import WebKit
import UniformTypeIdentifiers

/// Serves files from the bundled `dist/` folder under the custom `axolittle://` scheme.
///
/// Resolution order (stops at first hit):
///   1. <bundle>/dist/<path>          — normal "folder reference" bundle layout
///   2. <bundle>/<path>               — flattened bundle (Xcode copied files without folder)
///   3. <bundle>/dist/<filename>      — top-directory stripped fallback
///   4. <bundle>/<filename>           — filename-only fallback for fully flattened bundles
final class BundleURLSchemeHandler: NSObject, WKURLSchemeHandler {

    func webView(_ webView: WKWebView, start urlSchemeTask: any WKURLSchemeTask) {
        guard let requestURL = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(BundleError.invalidURL)
            return
        }

        let relativePath = normalizedPath(for: requestURL)

        guard let fileURL = resolveFileURL(for: relativePath) else {
            print("[BundleURLSchemeHandler] ❌ Not found: \(relativePath)")
            urlSchemeTask.didFailWithError(BundleError.fileNotFound(relativePath))
            return
        }

        guard let data = try? Data(contentsOf: fileURL) else {
            print("[BundleURLSchemeHandler] ❌ Could not read data at: \(fileURL.path)")
            urlSchemeTask.didFailWithError(BundleError.fileNotFound(relativePath))
            return
        }

        let mime = mimeType(for: fileURL)

        // Use HTTPURLResponse so the Fetch API and image loader receive a proper
        // HTTP status code (200) and headers.  Without this, iOS WebKit can treat
        // the response as opaque/failed.  Access-Control-Allow-Origin is required
        // when any JS code sets crossOrigin on an image or makes a fetch() that
        // triggers CORS mode; without it iOS WebKit (stricter than macOS WebKit)
        // refuses to hand the response body to the canvas / Fetch consumer.
        let headers: [String: String] = [
            "Content-Type":                mime,
            "Access-Control-Allow-Origin": "*",
            "Cache-Control":               "max-age=86400",
        ]

        guard let response = HTTPURLResponse(
            url: requestURL,
            statusCode: 200,
            httpVersion: "HTTP/1.1",
            headerFields: headers
        ) else {
            urlSchemeTask.didFailWithError(BundleError.fileNotFound(relativePath))
            return
        }

        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: any WKURLSchemeTask) {}

    // MARK: - Path resolution

    /// Strips the leading slash and returns "index.html" for bare root requests.
    private func normalizedPath(for url: URL) -> String {
        // url.path decodes percent-encoding automatically (e.g. %20 → space)
        let path = url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        return path.isEmpty ? "index.html" : path
    }

    /// Tries multiple bundle layouts to find the requested file.
    private func resolveFileURL(for relativePath: String) -> URL? {
        guard let base = Bundle.main.resourceURL else { return nil }

        let filename = URL(fileURLWithPath: relativePath).lastPathComponent

        let candidates: [URL] = [
            // 1. Normal layout: dist/ folder reference preserved in bundle
            base.appendingPathComponent("dist").appendingPathComponent(relativePath),
            // 2. Flattened top-level: Xcode copied files without preserving folder
            base.appendingPathComponent(relativePath),
            // 3. dist/ present but top directory stripped from path
            base.appendingPathComponent("dist").appendingPathComponent(filename),
            // 4. Fully flattened: only the filename survives
            base.appendingPathComponent(filename),
        ]

        for url in candidates {
            if FileManager.default.fileExists(atPath: url.path) {
                return url
            }
        }

        return nil
    }

    // MARK: - MIME type

    private func mimeType(for fileURL: URL) -> String {
        let ext = fileURL.pathExtension.lowercased()

        // Explicit map for types that UTType may not resolve correctly on all iOS versions
        switch ext {
        case "html":            return "text/html"
        case "js", "mjs":       return "text/javascript"
        case "css":             return "text/css"
        case "json":            return "application/json"
        case "svg":             return "image/svg+xml"
        case "png":             return "image/png"
        case "jpg", "jpeg":     return "image/jpeg"
        case "gif":             return "image/gif"
        case "webp":            return "image/webp"
        case "mp3":             return "audio/mpeg"
        case "mp4":             return "video/mp4"
        case "wav":             return "audio/wav"
        case "ogg":             return "audio/ogg"
        case "woff":            return "font/woff"
        case "woff2":           return "font/woff2"
        case "ttf":             return "font/ttf"
        case "ico":             return "image/x-icon"
        default:                break
        }

        // Fall back to UTType for anything not in the explicit map
        if let type = UTType(filenameExtension: ext),
           let mime = type.preferredMIMEType {
            return mime
        }

        return "application/octet-stream"
    }
}

// MARK: - Errors

enum BundleError: LocalizedError {
    case invalidURL
    case fileNotFound(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid bundled asset URL."
        case .fileNotFound(let path):
            return "Bundled asset not found: \(path)"
        }
    }
}
