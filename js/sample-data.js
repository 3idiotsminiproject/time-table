/**
 * Realistic University Timetable Sample Dataset
 * Engineering Faculty: CSE, ECE, AI&DS
 */

const SAMPLE_UNIVERSITY_DATA = {
  institution: {
    name: "Apex Institute of Technology & Science",
    term: "Fall Semester 2026-2027",
    departmentDefault: "dept_cse"
  },
  settings: {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    periods: [
      { id: 1, label: "Period 1", startTime: "09:00", endTime: "09:55", isBreak: false },
      { id: 2, label: "Period 2", startTime: "09:55", endTime: "10:50", isBreak: false },
      { id: 3, label: "Period 3", startTime: "11:05", endTime: "12:00", isBreak: false },
      { id: 4, label: "Lunch Break", startTime: "12:00", endTime: "01:00", isBreak: true },
      { id: 5, label: "Period 4", startTime: "01:00", endTime: "01:55", isBreak: false },
      { id: 6, label: "Period 5", startTime: "01:55", endTime: "02:50", isBreak: false },
      { id: 7, label: "Period 6", startTime: "02:55", endTime: "03:50", isBreak: false }
    ],
    maxDailyLecturesPerBatch: 5,
    maxConsecutiveLecturesPerTeacher: 3
  },
  departments: [
    { id: "dept_cse", name: "Computer Science & Engineering", code: "CSE" },
    { id: "dept_ece", name: "Electronics & Communication", code: "ECE" },
    { id: "dept_aiml", name: "Artificial Intelligence & Data Science", code: "AI&DS" }
  ],
  rooms: [
    { id: "room_101", name: "LH-101", building: "Main Block", capacity: 65, type: "lecture" },
    { id: "room_102", name: "LH-102", building: "Main Block", capacity: 65, type: "lecture" },
    { id: "room_201", name: "LH-201", building: "Tech Block", capacity: 60, type: "lecture" },
    { id: "room_202", name: "LH-202", building: "Tech Block", capacity: 60, type: "lecture" },
    { id: "lab_cs1", name: "Turing Computing Lab", building: "CS Wing", capacity: 60, type: "lab" },
    { id: "lab_cs2", name: "Hopper Computing Lab", building: "CS Wing", capacity: 60, type: "lab" },
    { id: "lab_ec1", name: "Embedded Systems Lab", building: "ECE Wing", capacity: 50, type: "lab" },
    { id: "hall_aud", name: "Seminar Auditorium", building: "Central Library", capacity: 120, type: "auditorium" }
  ],
  faculty: [
    { id: "fac_1", name: "Dr. Alan Turing", designation: "Professor & Chair", dept: "dept_cse", email: "turing@apex.edu", maxHours: 18, color: "#2563EB" },
    { id: "fac_2", name: "Prof. Ada Lovelace", designation: "Associate Professor", dept: "dept_cse", email: "lovelace@apex.edu", maxHours: 18, color: "#7C3AED" },
    { id: "fac_3", name: "Dr. John von Neumann", designation: "Professor", dept: "dept_cse", email: "neumann@apex.edu", maxHours: 16, color: "#059669" },
    { id: "fac_4", name: "Dr. Grace Hopper", designation: "Professor", dept: "dept_cse", email: "hopper@apex.edu", maxHours: 18, color: "#DB2777" },
    { id: "fac_5", name: "Prof. Claude Shannon", designation: "Associate Professor", dept: "dept_ece", email: "shannon@apex.edu", maxHours: 18, color: "#D97706" },
    { id: "fac_6", name: "Dr. Nikola Tesla", designation: "Professor", dept: "dept_ece", email: "tesla@apex.edu", maxHours: 16, color: "#4F46E5" },
    { id: "fac_7", name: "Prof. Katherine Johnson", designation: "Professor (Mathematics)", dept: "dept_cse", email: "johnson@apex.edu", maxHours: 20, color: "#0D9488" },
    { id: "fac_8", name: "Dr. Geoffrey Hinton", designation: "Chair (AI Research)", dept: "dept_aiml", email: "hinton@apex.edu", maxHours: 16, color: "#DC2626" }
  ],
  batches: [
    { id: "batch_cs_3a", name: "B.Tech CSE - 3rd Sem (Sec A)", dept: "dept_cse", semester: 3, section: "A", studentCount: 54, defaultRoom: "room_101" },
    { id: "batch_cs_3b", name: "B.Tech CSE - 3rd Sem (Sec B)", dept: "dept_cse", semester: 3, section: "B", studentCount: 52, defaultRoom: "room_102" },
    { id: "batch_cs_5a", name: "B.Tech CSE - 5th Sem (Sec A)", dept: "dept_cse", semester: 5, section: "A", studentCount: 50, defaultRoom: "room_201" },
    { id: "batch_ec_3a", name: "B.Tech ECE - 3rd Sem (Sec A)", dept: "dept_ece", semester: 3, section: "A", studentCount: 42, defaultRoom: "room_202" },
    { id: "batch_ai_3a", name: "B.Tech AI&DS - 3rd Sem (Sec A)", dept: "dept_aiml", semester: 3, section: "A", studentCount: 48, defaultRoom: "hall_aud" }
  ],
  courses: [
    // --- CSE 3rd Sem Courses ---
    { id: "course_ds_3a", batchId: "batch_cs_3a", code: "CS301", title: "Data Structures & Algorithms", facultyId: "fac_1", periodsPerWeek: 3, isLab: false, duration: 1, roomType: "lecture", color: "#3B82F6" },
    { id: "course_oop_3a", batchId: "batch_cs_3a", code: "CS302", title: "Object Oriented Programming (Java)", facultyId: "fac_2", periodsPerWeek: 3, isLab: false, duration: 1, roomType: "lecture", color: "#8B5CF6" },
    { id: "course_ca_3a", batchId: "batch_cs_3a", code: "CS303", title: "Computer Architecture", facultyId: "fac_3", periodsPerWeek: 3, isLab: false, duration: 1, roomType: "lecture", color: "#10B981" },
    { id: "course_math_3a", batchId: "batch_cs_3a", code: "MA301", title: "Discrete Mathematics", facultyId: "fac_7", periodsPerWeek: 4, isLab: false, duration: 1, roomType: "lecture", color: "#14B8A6" },
    { id: "course_dslab_3a", batchId: "batch_cs_3a", code: "CS301L", title: "Data Structures Lab", facultyId: "fac_1", periodsPerWeek: 2, isLab: true, duration: 2, roomType: "lab", preferredRoom: "lab_cs1", color: "#2563EB" },
    { id: "course_ooplab_3a", batchId: "batch_cs_3a", code: "CS302L", title: "Java OOP Lab", facultyId: "fac_2", periodsPerWeek: 2, isLab: true, duration: 2, roomType: "lab", preferredRoom: "lab_cs2", color: "#7C3AED" },

    // --- CSE 3rd Sem (Sec B) ---
    { id: "course_ds_3b", batchId: "batch_cs_3b", code: "CS301", title: "Data Structures & Algorithms", facultyId: "fac_1", periodsPerWeek: 3, isLab: false, duration: 1, roomType: "lecture", color: "#3B82F6" },
    { id: "course_oop_3b", batchId: "batch_cs_3b", code: "CS302", title: "Object Oriented Programming (Java)", facultyId: "fac_2", periodsPerWeek: 3, isLab: false, duration: 1, roomType: "lecture", color: "#8B5CF6" },
    { id: "course_ca_3b", batchId: "batch_cs_3b", code: "CS303", title: "Computer Architecture", facultyId: "fac_3", periodsPerWeek: 3, isLab: false, duration: 1, roomType: "lecture", color: "#10B981" },
    { id: "course_math_3b", batchId: "batch_cs_3b", code: "MA301", title: "Discrete Mathematics", facultyId: "fac_7", periodsPerWeek: 4, isLab: false, duration: 1, roomType: "lecture", color: "#14B8A6" },
    { id: "course_dslab_3b", batchId: "batch_cs_3b", code: "CS301L", title: "Data Structures Lab", facultyId: "fac_1", periodsPerWeek: 2, isLab: true, duration: 2, roomType: "lab", preferredRoom: "lab_cs2", color: "#2563EB" },
    { id: "course_ooplab_3b", batchId: "batch_cs_3b", code: "CS302L", title: "Java OOP Lab", facultyId: "fac_2", periodsPerWeek: 2, isLab: true, duration: 2, roomType: "lab", preferredRoom: "lab_cs1", color: "#7C3AED" },

    // --- CSE 5th Sem Courses ---
    { id: "course_db_5a", batchId: "batch_cs_5a", code: "CS501", title: "Database Management Systems", facultyId: "fac_4", periodsPerWeek: 3, isLab: false, duration: 1, roomType: "lecture", color: "#EC4899" },
    { id: "course_os_5a", batchId: "batch_cs_5a", code: "CS502", title: "Operating Systems", facultyId: "fac_1", periodsPerWeek: 3, isLab: false, duration: 1, roomType: "lecture", color: "#3B82F6" },
    { id: "course_cd_5a", batchId: "batch_cs_5a", code: "CS504", title: "Compiler Design", facultyId: "fac_3", periodsPerWeek: 3, isLab: false, duration: 1, roomType: "lecture", color: "#10B981" },
    { id: "course_cloud_5a", batchId: "batch_cs_5a", code: "CS505", title: "Cloud Computing Architectures", facultyId: "fac_4", periodsPerWeek: 3, isLab: false, duration: 1, roomType: "lecture", color: "#F43F5E" },
    { id: "course_dblab_5a", batchId: "batch_cs_5a", code: "CS501L", title: "RDBMS & SQL Lab", facultyId: "fac_4", periodsPerWeek: 2, isLab: true, duration: 2, roomType: "lab", preferredRoom: "lab_cs1", color: "#BE185D" },
    { id: "course_oslab_5a", batchId: "batch_cs_5a", code: "CS502L", title: "Operating Systems & Kernel Lab", facultyId: "fac_1", periodsPerWeek: 2, isLab: true, duration: 2, roomType: "lab", preferredRoom: "lab_cs2", color: "#1D4ED8" },

    // --- ECE 3rd Sem Courses ---
    { id: "course_dsp_ece", batchId: "batch_ec_3a", code: "EC301", title: "Digital Signal Processing", facultyId: "fac_5", periodsPerWeek: 4, isLab: false, duration: 1, roomType: "lecture", color: "#F59E0B" },
    { id: "course_mp_ece", batchId: "batch_ec_3a", code: "EC302", title: "Microprocessors & Embedded Systems", facultyId: "fac_6", periodsPerWeek: 3, isLab: false, duration: 1, roomType: "lecture", color: "#6366F1" },
    { id: "course_math_ece", batchId: "batch_ec_3a", code: "MA301", title: "Applied Discrete Mathematics", facultyId: "fac_7", periodsPerWeek: 4, isLab: false, duration: 1, roomType: "lecture", color: "#14B8A6" },
    { id: "course_mplab_ece", batchId: "batch_ec_3a", code: "EC302L", title: "Microcontroller & IoT Lab", facultyId: "fac_6", periodsPerWeek: 2, isLab: true, duration: 2, roomType: "lab", preferredRoom: "lab_ec1", color: "#4338CA" },

    // --- AI&DS 3rd Sem Courses ---
    { id: "course_ml_ai", batchId: "batch_ai_3a", code: "AI301", title: "Machine Learning Fundamentals", facultyId: "fac_8", periodsPerWeek: 4, isLab: false, duration: 1, roomType: "lecture", color: "#EF4444" },
    { id: "course_db_ai", batchId: "batch_ai_3a", code: "AI302", title: "Database Systems & Big Data", facultyId: "fac_4", periodsPerWeek: 3, isLab: false, duration: 1, roomType: "lecture", color: "#EC4899" },
    { id: "course_math_ai", batchId: "batch_ai_3a", code: "MA302", title: "Linear Algebra & Probability", facultyId: "fac_7", periodsPerWeek: 4, isLab: false, duration: 1, roomType: "lecture", color: "#14B8A6" },
    { id: "course_mllab_ai", batchId: "batch_ai_3a", code: "AI301L", title: "Python ML & PyTorch Lab", facultyId: "fac_8", periodsPerWeek: 2, isLab: true, duration: 2, roomType: "lab", preferredRoom: "lab_cs1", color: "#B91C1C" }
  ]
};

if (typeof globalThis !== "undefined") {
  globalThis.SAMPLE_UNIVERSITY_DATA = SAMPLE_UNIVERSITY_DATA;
}

