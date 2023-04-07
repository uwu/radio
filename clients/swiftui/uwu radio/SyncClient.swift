//
//  SyncClient.swift
//  uwu radio
//
//  Created by Cain Atkinson on 07/04/2023.
//

import Foundation
import SignalRClient

public struct Song {
    public var name: String
    public var artist: String
    public var dlUrl: String?
    public var sourceUrl: String?
    public var artUrl: String?
    public var album: String?
    public var submitter: String
}

public struct Submitter {
    public var name: String
    public var pfpUrl: String
    public var quotes : [String]
}

public class SyncClient : ObservableObject {
    @Published var currentSong: Song?
    private var nextSong: Song?
    
    @Published var submitters: [String] = []
    
    private var connection: HubConnection
    
    public init() {
        connection = HubConnectionBuilder(url: URL(string: "https://radio.k6.tf").unsafelyUnwrapped)
            .withLogging(minLogLevel: .error)
            .build()
        
        connection.on(method: "MessageReceived", callback: handleMessage)
    }
    
    private func handleMessage(_ user: String, _ message: String) {
        print("Hello there this is unfinished :D")
    }
}
