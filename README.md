# UniSchedule — Academic Timetable Management System ⚡

> A complete, production-ready **College & University Timetable Scheduling System** built from scratch using **HTML5, CSS3, Vanilla JavaScript, Node.js, and SQLite** — with zero third-party dependencies.

---

## 🖥️ Live Preview

> Open `index.html` directly in any browser for instant **offline mode**, or run `node server.js` for the full **hybrid SQLite backend** experience.

---

## ✨ Features

| Feature | Details |
|---|---|
| ⚡ **Auto-Generate Timetable** | Backtracking CSP (Constraint Satisfaction Problem) solver with MRV heuristics produces conflict-free schedules in milliseconds |
| 🎓 **Batch / Class View** | Weekly grid for each student section with drag-and-drop slot editing |
| 👨‍🏫 **Faculty Schedule View** | Individual instructor timetable with weekly load tracking |
| 🏛️ **Room & Lab Allocation** | Visualize and audit occupancy for every classroom and computing lab |
| 📊 **Master Overview Grid** | Bird's-eye view of all batches across the full institution |
| ✅ **Real-Time Conflict Audit** | Live detection of professor clashes, room double-bookings, and batch overlaps |
| 🗄️ **SQLite Relational DB** | Persistent backend with foreign-key integrity via native `node:sqlite` |
| 🔄 **Hybrid Sync** | Instant localStorage caching + automatic SQLite server sync |
| 📤 **Export Options** | Print/PDF timetable, CSV export, JSON state backup, SQL dump |
| ⚙️ **Settings** | Configure institution name, term, working days, and period timings |

---

## 🗂️ Project Structure

```
timetable-management-system/
│
├── index.html              ← Main application shell (HTML5 layout + modals)
├── server.js               ← Node.js HTTP server + SQLite REST API backend
├── package.json            ← Project metadata (no npm install needed!)
├── .gitignore              ← Excludes DB files, node_modules, OS files
├── LICENSE                 ← MIT License
├── README.md               ← This file
│
├── css/
│   └── styles.css          ← Complete CSS3 design system (1000+ lines)
│                             Variables, grid, cards, modals, print styles
│
└── js/
    ├── sample-data.js      ← Realistic university dataset seed
    │                         (5 batches, 26 courses, 8 faculty, 8 rooms)
    ├── data-store.js       ← Hybrid data layer: localStorage ↔ SQLite REST sync
    ├── solver.js           ← CSP constraint solver + conflict auditor
    ├── ui.js               ← All view renderers (timetable grids, management tables)
    └── app.js              ← Application bootstrap, event handlers, modal controllers
```

---

## 🚀 Getting Started

### Option A — Standalone (No Server Required)
Just open `index.html` in your browser. The app works fully in **offline mode** using `localStorage`.

```
Double-click index.html  →  Runs in any modern browser
```

### Option B — Full Hybrid Mode (Node.js + SQLite Backend)

**Requirements:** Node.js **v22.5+** (uses built-in `node:sqlite` — available since Node 22.5)

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/timetable-management-system.git
cd timetable-management-system

# 2. Start the server (no npm install needed)
node server.js

# 3. Open in browser
# → http://localhost:3000
```

The SQLite database (`timetable.db`) is auto-created and seeded on first run.

---

## 🏛️ System Architecture

```
 ┌─────────────────────────────────────────────────────────────┐
 │                  FRONTEND (Client Layer)                    │
 │   HTML5 + CSS3 Grid + Vanilla JS (ES6 Classes)             │
 │   • CSP Solver   • Drag & Drop   • Offline LocalStorage    │
 └─────────────────────────┬───────────────────────────────────┘
                           │  Fetch API  (JSON / REST)
 ┌─────────────────────────▼───────────────────────────────────┐
 │               BACKEND (Node.js HTTP Server)                 │
 │   server.js  — Native node:http  — Zero dependencies       │
 │   REST Endpoints:                                           │
 │     GET  /api/status       — Health check + DB diagnostics  │
 │     GET  /api/data         — Fetch full relational dataset  │
 │     POST /api/sync         — Write full state to SQLite     │
 │     POST /api/timetable    — Save timetable allocations     │
 │     POST /api/reset        — Restore to sample dataset      │
 │     GET  /api/export-sql   — Download SQL dump file         │
 └─────────────────────────┬───────────────────────────────────┘
                           │  node:sqlite  (native C++ binding)
 ┌─────────────────────────▼───────────────────────────────────┐
 │            DATABASE (SQLite 3 — timetable.db)               │
 │   WAL mode + Foreign Keys enforced                          │
 │   7 Relational Tables (see schema below)                    │
 └─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Relational Database Schema

```sql
-- Academic Departments
CREATE TABLE departments (id TEXT PRIMARY KEY, name TEXT, code TEXT UNIQUE);

-- Rooms, Lecture Halls & Labs
CREATE TABLE rooms (id TEXT PRIMARY KEY, name TEXT, building TEXT,
                    capacity INTEGER, type TEXT);  -- lecture|lab|auditorium

-- Faculty / Instructors
CREATE TABLE faculty (id TEXT PRIMARY KEY, name TEXT, designation TEXT,
                      dept TEXT REFERENCES departments(id),
                      email TEXT, max_hours INTEGER, color TEXT);

-- Student Batches / Sections
CREATE TABLE batches (id TEXT PRIMARY KEY, name TEXT,
                      dept TEXT REFERENCES departments(id),
                      semester INTEGER, section TEXT,
                      student_count INTEGER,
                      default_room TEXT REFERENCES rooms(id));

-- Courses / Subjects
CREATE TABLE courses (id TEXT PRIMARY KEY,
                      batch_id TEXT REFERENCES batches(id) ON DELETE CASCADE,
                      code TEXT, title TEXT,
                      faculty_id TEXT REFERENCES faculty(id),
                      periods_per_week INTEGER,
                      is_lab INTEGER,  -- 0|1
                      duration INTEGER, room_type TEXT,
                      preferred_room TEXT REFERENCES rooms(id), color TEXT);

-- Timetable Schedule Allocations
CREATE TABLE timetable_entries (id TEXT PRIMARY KEY,
                                 batch_id TEXT REFERENCES batches(id),
                                 course_id TEXT REFERENCES courses(id),
                                 faculty_id TEXT REFERENCES faculty(id),
                                 room_id TEXT REFERENCES rooms(id),
                                 day TEXT, period_id INTEGER,
                                 is_lab INTEGER, duration INTEGER);

-- Institution Settings (key-value store)
CREATE TABLE meta_settings (key TEXT PRIMARY KEY, value TEXT);
```

---

## 🤖 CSP Solver Algorithm

The auto-generator uses a **Constraint Satisfaction Problem (CSP)** approach with:

1. **MRV Ordering** — Most Restricted Variables first (labs, high-load faculty)
2. **Backtracking Search** — Recursive depth-first placement with up to 30 restarts
3. **Hard Constraints Enforced:**
   - ✅ No instructor teaches two classes at once
   - ✅ No room double-booked
   - ✅ No batch attends two classes simultaneously
   - ✅ Labs require lab rooms with sufficient capacity
   - ✅ Multi-period blocks never cross break periods
4. **Soft Constraints Optimized:**
   - Courses distributed across days (no two of the same subject per day)
   - Preferred rooms honoured where possible

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Structure** | HTML5 Semantic Markup |
| **Styling** | CSS3 — Custom Properties, Grid, Flexbox, Animations |
| **Interactivity** | Vanilla JavaScript (ES6+ — Classes, async/await, Fetch API) |
| **Backend Server** | Node.js `node:http` (built-in, zero deps) |
| **Database** | SQLite 3 via Node.js built-in `node:sqlite` |
| **Persistence** | Dual: `localStorage` (offline) + SQLite WAL (online) |
| **Algorithm** | Heuristic Backtracking CSP with MRV ordering |

---

## 📸 Screenshots

> _Coming soon — run the app locally and take a screenshot of each view!_

**Views available:**
- 📅 Batch weekly timetable grid with color-coded course cards
- 👨‍🏫 Faculty individual schedule with workload bar
- 🏛️ Room allocation matrix with occupancy statistics
- 📊 Master grid showing all batches at once
- 📁 Academic data management (CRUD for courses, faculty, rooms, batches)
- 🗄️ SQLite database diagnostics modal

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  Built with ⚡ using HTML · CSS · JavaScript · Node.js · SQLite
</div>
