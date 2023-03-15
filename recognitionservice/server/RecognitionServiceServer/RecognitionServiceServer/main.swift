import Foundation
import Kitura
import KituraWebSocket
import ShazamKit

let router = Router()
WebSocket.register(service: AudioAnalysisService(), onPath: "/analyze-audio")

class Client: NSObject {
  let connection: WebSocketConnection
  let session: SHSession

  init(connection: WebSocketConnection, catalog: SHCatalog) {
    self.connection = connection
    session = SHSession(catalog: catalog)
    super.init()
    session.delegate = self
  }

  func send(message: String) {
    connection.send(message: message)
  }
}

extension Client: SHSessionDelegate {
  func session(_: SHSession, didFind match: SHMatch) {
    let match = match.mediaItems.first!
    let timeRanges = match.timeRanges
    let deeplink = match.videoURL?.absoluteString ?? "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    let currentSubtitle = match.subtitle ?? "no sub found"

    let positiveMatch: [String: String] = [
      "deeplink": deeplink,
      "subtitle": currentSubtitle,
      "matchOffset": timeRanges.description,
    ]

    guard let response = try? JSONEncoder().encode(positiveMatch).base64EncodedString()
    else {
      return
    }

    send(message: response)
  }

  func session(_: SHSession, didNotFindMatchFor signature: SHSignature, error: Error?) {
    print(
      error?
        .localizedDescription ?? "Error finding match for signature: \(signature)"
    )
  }

  func session(_: SHSession, didFailWithError error: Error) {
    print("Session failed with error: \(error)")
  }
}

class AudioAnalysisService: NSObject, WebSocketService {
//  private var session: SHSession
  private var catalog: SHCatalog?
  private var clients: [String: Client] = [:]

  override init() {
    catalog = try! CatalogProvider.catalog()
    super.init()
  }

  func connected(connection: WebSocketConnection) {
    print("connected")
    let client = Client(connection: connection, catalog: catalog!)
    clients[connection.id] = client
    print("Client connected")
  }

  func disconnected(
    connection connection: WebSocketConnection,
    reason _: WebSocketCloseReasonCode
  ) {
    if let client = clients[connection.id] {
//      client.clearStuff()
      clients.removeValue(forKey: connection.id)
    }
    print("Client disconnected")
  }

  func received(message: Data, from connection: WebSocketConnection) {
    if let client = clients[connection.id] {
      let formatFromClient = AVAudioFormat(
        standardFormatWithSampleRate: 48000.0,
        channels: 1
      )!

      let buffer: AVAudioPCMBuffer = message.makePCMBuffer(format: formatFromClient)!

      client.session.matchStreamingBuffer(buffer, at: nil)
    } else {
      print("Client not found")
    }
  }

  func received(message _: String, from _: WebSocketConnection) {
//    print("Received \(message) from \(client.id)")

    print("2")
//    client.send(message: "2 * 2 = 4")
  }

  func received(message: Data, from _: WebSocketConnection, final _: Bool) {
    print(message)
    // Handle fragmented messages from the client here
  }

  func received(message: String, from _: WebSocketConnection, final _: Bool) {
    print(message)

    // Handle fragmented text messages from the client here
  }
}

let port = Int(ProcessInfo.processInfo.environment["PORT"] ?? "8080") ?? 8080
Kitura.addHTTPServer(onPort: port, with: router)
Kitura.run()
