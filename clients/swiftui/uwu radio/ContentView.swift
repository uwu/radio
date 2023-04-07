//
//  ContentView.swift
//  uwu radio
//
//  Created by Cain Atkinson on 07/04/2023.
//

import SwiftUI

func SmallText(_ txt: String) -> Text {
    Text(txt).foregroundColor(Color.white)
}

func BigText(_ txt: String) -> Text {
    Text(txt)
        .foregroundColor(Color.white)
        .font(Font.custom("IBM Plex Mono", fixedSize: 20.0))
}

struct ContentView: View {
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack {
                Spacer()
                
                ZStack {
                    Rectangle()
                        .border(Color.white)
                        .foregroundColor(Color.black)
                        .aspectRatio(1, contentMode: ContentMode.fit)
                    
                    BigText("album art\nshould go here")
                }
                
                BigText("Liquated")
                BigText("by Camellia")
                SmallText("submitted by kasimir")
                
                Spacer()
            }
                .font(Font.custom("IBM Plex Mono",
                                fixedSize: 16.0)
                )
                .padding(EdgeInsets(
                    top: 40.0,
                    leading: 40.0,
                    bottom: 40.0,
                    trailing: 40.0))
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
