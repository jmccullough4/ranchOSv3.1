// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "RanchOS",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "RanchOS",
            targets: ["RanchOS"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/mapbox/mapbox-maps-ios.git", from: "11.0.0")
    ],
    targets: [
        .target(
            name: "RanchOS",
            dependencies: [
                .product(name: "MapboxMaps", package: "mapbox-maps-ios")
            ],
            path: "RanchOS"
        )
    ]
)
