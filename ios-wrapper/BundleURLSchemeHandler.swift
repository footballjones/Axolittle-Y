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

        // Reflect the request's Origin header so null origins (opaque custom-scheme
        // origins on iOS WebKit) are allowed. Access-Control-Allow-Origin: * explicitly
        // excludes null, which breaks fetch() and crossOrigin image loads from the page.
        let allowOrigin = urlSchemeTask.request.value(forHTTPHeaderField: "Origin") ?? "*"

        // Handle CORS preflight
        if urlSchemeTask.request.httpMethod == "OPTIONS" {
            let preflightHeaders: [String: String] = [
                "Access-Control-Allow-Origin":  allowOrigin,
                "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age":       "86400",
            ]
            if let response = HTTPURLResponse(url: requestURL, statusCode: 204, httpVersion: "HTTP/1.1", headerFields: preflightHeaders) {
                urlSchemeTask.didReceive(response)
                urlSchemeTask.didFinish()
            }
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
        let totalBytes = data.count

        // Shared CORS + cache headers used in every response
        let corsHeaders: [String: String] = [
            "Access-Control-Allow-Origin":  allowOrigin,
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Cross-Origin-Resource-Policy": "cross-origin",
            "Accept-Ranges":                "bytes",
            "Cache-Control":                "max-age=86400",
        ]

        // Handle Range requests so audio streams correctly (browsers probe with
        // Range: bytes=0-1 before streaming; without a 206 response audio stalls).
        if let rangeHeader = urlSchemeTask.request.value(forHTTPHeaderField: "Range") {
            let (rangeData, start, end) = slice(data: data, range: rangeHeader)
            var headers = corsHeaders
            headers["Content-Type"]   = mime
            headers["Content-Length"] = "\(rangeData.count)"
            headers["Content-Range"]  = "bytes \(start)-\(end)/\(totalBytes)"
            if let response = HTTPURLResponse(url: requestURL, statusCode: 206, httpVersion: "HTTP/1.1", headerFields: headers) {
                urlSchemeTask.didReceive(response)
                urlSchemeTask.didReceive(rangeData)
                urlSchemeTask.didFinish()
            }
            return
        }

        var headers = corsHeaders
        headers["Content-Type"]   = mime
        headers["Content-Length"] = "\(totalBytes)"

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

    // MARK: - Range parsing

    /// Parses a "bytes=X-Y" or "bytes=X-" Range header and returns the slice plus the byte positions.
    private func slice(data: Data, range rangeHeader: String) -> (Data, Int, Int) {
        let total = data.count
        guard rangeHeader.hasPrefix("bytes=") else { return (data, 0, total - 1) }
        let spec  = rangeHeader.dropFirst(6)
        let parts = spec.split(separator: "-", maxSplits: 1, omittingEmptySubsequences: false)
        let start = Int(parts[0]) ?? 0
        let end   = parts.count > 1 && !parts[1].isEmpty ? min(Int(parts[1]) ?? (total - 1), total - 1) : (total - 1)
        return (data.subdata(in: start ..< (end + 1)), start, end)
    }

    // MARK: - Path resolution

    /// Strips the leading slash and returns "index.html" for bare root requests.
    private func normalizedPath(for url: URL) -> String {
        let path = url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        return path.isEmpty ? "index.html" : path
    }

    /// Tries multiple bundle layouts to find the requested file.
    private func resolveFileURL(for relativePath: String) -> URL? {
        guard let base = Bundle.main.resourceURL else { return nil }

        let filename = URL(fileURLWithPath: relativePath).lastPathComponent

        let candidates: [URL] = [
            base.appendingPathComponent("dist").appendingPathComponent(relativePath),
            base.appendingPathComponent(relativePath),
            base.appendingPathComponent("dist").appendingPathComponent(filename),
            base.appendingPathComponent(filename),
        ]

        return candidates.first { FileManager.default.fileExists(atPath: $0.path) }
    }

    // MARK: - MIME type

    private func mimeType(for fileURL: URL) -> String {
        let ext = fileURL.pathExtension.lowercased()
        switch ext {
        case "html":            return "text/html"
        case "js", "mjs":      return "text/javascript"
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
        case "atlas":           return "text/plain"
        default:                break
        }
        if let type = UTType(filenameExtension: ext), let mime = type.preferredMIMEType {
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
        case .invalidURL:               return "Invalid bundled asset URL."
        case .fileNotFound(let path):   return "Bundled asset not found: \(path)"
        }
    }
}
