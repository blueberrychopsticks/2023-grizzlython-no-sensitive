import AVFAudio
import Combine
import ShazamKit
import SwiftUI

struct MatchResult: Equatable {
  let mediaItem: SHMatchedMediaItem?
}

extension SHMediaItemProperty {
  static let deeplink = SHMediaItemProperty("deeplink")
}

extension SHMediaItem {
  var deeplink: String {
    return self[.deeplink] as? String ?? "we haven't indexed this content yet"
  }
}

let defaultDeeplink = "play a hot cast"

class Matcher: NSObject, SHSessionDelegate {
  var session: SHSession?
  private var catalog: SHCatalog?

  override init() {
    super.init()
    catalog = try! CatalogProvider.catalog()
    session = SHSession(catalog: catalog!)
    session?.delegate = self
    //    try! match()
  }

  func session(_: SHSession, didFind match: SHMatch) {
    DispatchQueue.main.async {
      let match = match.mediaItems.first!

      let timeRanges = match.timeRanges
      let matchOffset = match.matchOffset
      let shazamId = match.shazamID

      // emit these with React Native bridge instead of publishing to SwiftUI
      //      self.deeplink = match.videoURL!.absoluteString
      //      self.currentSubtitle = match.subtitle ?? "no sub found"
    }
  }

  func session(_: SHSession, didNotFindMatchFor _: SHSignature, error: Error?) {
    print(error?.localizedDescription)
  }
}

enum CatalogProvider {
  static func catalog() throws -> SHCustomCatalog? {
    //    let url = Bundle.main.url(
    //      forResource: "ListenOutLoud",
    //      withExtension: "shazamcatalog"
    //    )!

    let url =
      URL(
        fileURLWithPath: "/Users/laptop/Development/Hackathons/02-2023-grizzlython/Hackathon/Data Ingestion Pipeline/ListenOutLoud.shazamcatalog"
      )

    let customCatalog = SHCustomCatalog()
    try! customCatalog.add(from: url)

    return customCatalog
  }
}
