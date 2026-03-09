//
//  AppDelegate.swift
//  Axolittle
//

import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Create window
        window = UIWindow(frame: UIScreen.main.bounds)
        
        // Create view controller
        let viewController = ViewController()
        
        // Set root view controller
        window?.rootViewController = viewController
        window?.makeKeyAndVisible()
        
        return true
    }
}
