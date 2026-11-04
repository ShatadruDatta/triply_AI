//
//  Student.swift
//  tanay-app
//
//  Created by Tanay Bhattacharjee on 15/01/25.
//

import SwiftUI

// MARK: - Data Model
struct Student: Identifiable {
    let id: UUID
    var name: String
    var grade: String
    var age: Int
}
