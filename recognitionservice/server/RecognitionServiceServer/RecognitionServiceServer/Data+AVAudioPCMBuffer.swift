//
// Created by laptop on 3/2/23.
//

import AVFAudio
import Foundation

extension Data {
  init(buffer: AVAudioPCMBuffer, time _: AVAudioTime) {
    let audioBuffer = buffer.audioBufferList.pointee.mBuffers
    self.init(bytes: audioBuffer.mData!, count: Int(audioBuffer.mDataByteSize))
  }

  func makePCMBuffer(format: AVAudioFormat) -> AVAudioPCMBuffer? {
    let streamDesc = format.streamDescription.pointee
//    print("streamDesc.mBytesPerFrame: \(streamDesc.mBytesPerFrame)")
    let frameCapacity = UInt32(count) / streamDesc.mBytesPerFrame
//    print("frameCapacity: \(frameCapacity)")
    guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCapacity)
    else { return nil }

    buffer.frameLength = buffer.frameCapacity
    let audioBuffer = buffer.audioBufferList.pointee.mBuffers
//    print("audioBuffer.mDataByteSize: \(audioBuffer.mDataByteSize)")

    withUnsafeBytes { bufferPointer in
      guard let addr = bufferPointer.baseAddress else { return }
      audioBuffer.mData?.copyMemory(from: addr, byteCount: Int(audioBuffer.mDataByteSize))
    }

    return buffer
  }
}
