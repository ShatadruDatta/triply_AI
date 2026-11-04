//
//  AddEditStudentView.swift
//  tanay-app
//
//  Created by Tanay Bhattacharjee on 15/01/25.
//
import SwiftUI


struct AddEditStudentView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name: String = ""
    @State private var grade: String = ""
    @State private var age: String = "" // Use String for TextField input
    @Binding var student: Student?
    var onSave: (String, String, Int) -> Void

    var body: some View {
        NavigationStack {
            Form {
                TextField("Name", text: $name)
                TextField("Grade", text: $grade)
                TextField("Age", text: $age)
                    .keyboardType(.numberPad)
            }
            .background(.red)
            .navigationTitle(student == nil ? "Add Student" : "Edit Student")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        if let ageInt = Int(age) {
                            onSave(name, grade, ageInt)
                            dismiss()
                        }
                    }
                    .disabled(name.isEmpty || grade.isEmpty || age.isEmpty || Int(age) == nil)
                }
            }
            .onAppear {
                if let student = student {
                    name = student.name
                    grade = student.grade
                    age = String(student.age)
                }
            }
        }
    }
}


