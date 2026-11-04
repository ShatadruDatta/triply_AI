import SwiftUI




// MARK: - Main List View
public struct ContentView: View {
    @StateObject private var viewModel = StudentViewModel()
    @State private var isShowingAddEditView = false
    @State private var selectedStudent: Student?

    public  var body: some View {
        NavigationStack {
            List {
                ForEach(viewModel.students) { student in
                    Button(action: {
                        selectedStudent = student
                        isShowingAddEditView = true
                    }) {
                        VStack(alignment: .leading) {
                            Text(student.name)
                                .font(.headline)
                            Text("Grade: \(student.grade) | Age: \(student.age)")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .onDelete(perform: viewModel.deleteStudent)
            }
            .navigationTitle("Students")
           
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        isShowingAddEditView = true
                    }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $isShowingAddEditView) {
                AddEditStudentView(
                    student: $selectedStudent,
                    onSave: { name, grade, age in
                        if let selectedStudent = selectedStudent {
                            viewModel.editStudent(
                                id: selectedStudent.id,
                                newName: name,
                                newGrade: grade,
                                newAge: age
                            )
                        } else {
                            viewModel.addStudent(name: name, grade: grade, age: age)
                        }
                        self.selectedStudent = nil
                    }
                )
            }
        }
    }
    
}

// MARK: - Add/Edit Student View
