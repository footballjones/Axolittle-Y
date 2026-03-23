// app/build.gradle.kts
// Copy this content into your app-level build.gradle.kts in Android Studio.

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.uomalabs.axolittle"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.uomalabs.axolittle"
        minSdk = 26          // Android 8.0 — covers ~95% of active devices
        targetSdk = 35
        versionCode = 1      // Increment for each Play Store / internal release
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = "11"
    }
}

dependencies {
    // WebViewAssetLoader — serves local assets via https:// scheme
    implementation("androidx.webkit:webkit:1.12.1")

    // Required base dependencies
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
}
