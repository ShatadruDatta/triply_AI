//
//  StudentViewModel.swift
//  tanay-app
//
//  Created by Tanay Bhattacharjee on 15/01/25.
//
import SwiftUI


// MARK: - ViewModel
class StudentViewModel: ObservableObject {
    @Published var students: [Student] = []
    
    func addStudent(name: String, grade: String, age: Int) {
        let newStudent = Student(id: UUID(), name: name, grade: grade, age: age)
        students.append(newStudent)
    }
    
    func editStudent(id: UUID, newName: String, newGrade: String, newAge: Int) {
        if let index = students.firstIndex(where: { $0.id == id }) {
            students[index].name = newName
            students[index].grade = newGrade
            students[index].age = newAge
        }
    }
    
    func deleteStudent(at offsets: IndexSet) {
        students.remove(atOffsets: offsets)
    }
}
