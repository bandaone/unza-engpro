#include <iostream>
#include <string>

class Employee {
private:
    std::string name;
    int idNumber;
    std::string department;
    std::string position;

public:
    // No-arg constructor
    Employee()
        : name(""), idNumber(0), department(""), position("") {}

    // Constructor: name, id, department, position
    Employee(const std::string& name, int idNumber,
             const std::string& department, const std::string& position)
        : name(name), idNumber(idNumber), department(department), position(position) {}

    // Constructor: name, id (department and position empty)
    Employee(const std::string& name, int idNumber)
        : name(name), idNumber(idNumber), department(""), position("") {}

    // Mutators (setters)
    void setName(const std::string& n) { name = n; }
    void setIdNumber(int id) { idNumber = id; }
    void setDepartment(const std::string& dept) { department = dept; }
    void setPosition(const std::string& pos) { position = pos; }

    // Accessors (getters)
    std::string getName() const { return name; }
    int getIdNumber() const { return idNumber; }
    std::string getDepartment() const { return department; }
    std::string getPosition() const { return position; }
};

int main() {
    // Create and populate employees
    Employee e1("Susan Meyers", 47899, "Accounting", "Vice President");
    Employee e2("Mark Jones", 39119, "IT", "Programmer");
    Employee e3("Joy Rogers", 81774, "Manufacturing", "Engineer");

    // Display
    auto printEmployee = [](const Employee& e) {
        std::cout << "Name: " << e.getName() << "\n"
                  << "ID Number: " << e.getIdNumber() << "\n"
                  << "Department: " << e.getDepartment() << "\n"
                  << "Position: " << e.getPosition() << "\n\n";
    };

    printEmployee(e1);
    printEmployee(e2);
    printEmployee(e3);

    return 0;
}