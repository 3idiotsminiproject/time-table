/**
 * DataStore - Hybrid Architecture
 * Combines LocalStorage/Client-Side Caching with SQLite Relational Backend & REST Sync
 */

class DataStore {
  constructor() {
    this.STORAGE_KEY = "UniSchedule_State_v1";
    this.data = null;
    this.isOnline = false;
    this.diagnostics = null;
    this.statusListeners = [];
    this.syncTimeout = null;

    // Load cached state first for instant UI response
    this.load();

    // Initiate hybrid backend connection probe
    this.probeServer();
  }

  // --- Hybrid Server Connectivity ---
  async probeServer() {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (res.ok) {
        const payload = await res.json();
        this.isOnline = true;
        this.diagnostics = payload.diagnostics;
        this.notifyStatusListeners();

        // Pull fresh authoritative state from SQLite
        await this.pullFromServer();
        return true;
      }
    } catch {
      // Backend not running; graceful offline degradation
      this.isOnline = false;
      this.notifyStatusListeners();
      return false;
    }
  }

  onStatusChange(callback) {
    this.statusListeners.push(callback);
    callback({ isOnline: this.isOnline, diagnostics: this.diagnostics });
  }

  notifyStatusListeners() {
    this.statusListeners.forEach(cb => {
      try { cb({ isOnline: this.isOnline, diagnostics: this.diagnostics }); } catch (e) { console.error(e); }
    });
  }

  async pullFromServer() {
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      if (res.ok) {
        const serverData = await res.json();
        if (serverData && serverData.batches && serverData.courses) {
          this.data = serverData;
          this.saveLocal();
          return true;
        }
      }
    } catch (err) {
      console.warn("Could not pull from server:", err);
    }
    return false;
  }

  async pushToServer() {
    if (!this.isOnline) return false;
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.data)
      });
      if (res.ok) {
        // Refresh diagnostics
        const statusRes = await fetch("/api/status");
        if (statusRes.ok) {
          const st = await statusRes.json();
          this.diagnostics = st.diagnostics;
          this.notifyStatusListeners();
        }
        return true;
      }
    } catch (err) {
      console.warn("Failed pushing changes to SQLite server:", err);
    }
    return false;
  }

  debouncedSync() {
    if (!this.isOnline) return;
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.syncTimeout = setTimeout(() => {
      this.pushToServer();
    }, 400);
  }

  // --- Local Persistence ---
  load() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.data = JSON.parse(stored);
      } else {
        this.resetToSampleData(false);
      }
    } catch (e) {
      console.error("Failed to load state from localStorage:", e);
      this.resetToSampleData(false);
    }
  }

  saveLocal() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
    }
  }

  save() {
    this.saveLocal();
    this.debouncedSync();
  }

  resetToSampleData(syncWithServer = true) {
    this.data = JSON.parse(JSON.stringify(SAMPLE_UNIVERSITY_DATA));
    this.data.timetable = [];
    this.saveLocal();

    if (syncWithServer && this.isOnline) {
      fetch("/api/reset", { method: "POST" })
        .then(() => this.probeServer())
        .catch(e => console.error("Error resetting server DB:", e));
    }
  }

  // --- Getters ---
  getInstitution() { return this.data.institution || {}; }
  setInstitution(inst) { this.data.institution = { ...this.data.institution, ...inst }; this.save(); }

  getSettings() { return this.data.settings; }
  saveSettings(settings) { this.data.settings = settings; this.save(); }

  getDepartments() { return this.data.departments || []; }
  getBatches() { return this.data.batches || []; }
  getFaculty() { return this.data.faculty || []; }
  getCourses() { return this.data.courses || []; }
  getRooms() { return this.data.rooms || []; }
  getTimetable() { return this.data.timetable || []; }

  // --- Entity Lookups ---
  getBatchById(id) { return this.getBatches().find(b => b.id === id); }
  getFacultyById(id) { return this.getFaculty().find(f => f.id === id); }
  getRoomById(id) { return this.getRooms().find(r => r.id === id); }
  getCourseById(id) { return this.getCourses().find(c => c.id === id); }
  getDepartmentById(id) { return this.getDepartments().find(d => d.id === id); }

  // --- Timetable CRUD ---
  saveTimetable(entries) {
    this.data.timetable = entries;
    this.saveLocal();

    if (this.isOnline) {
      fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entries)
      }).catch(err => console.warn("Failed syncing timetable to server:", err));
    }
  }

  addTimetableEntry(entry) {
    if (!this.data.timetable) this.data.timetable = [];
    if (!entry.id) {
      entry.id = "tt_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    }
    this.data.timetable.push(entry);
    this.save();
    return entry;
  }

  updateTimetableEntry(id, updatedFields) {
    const idx = this.data.timetable.findIndex(e => e.id === id);
    if (idx !== -1) {
      this.data.timetable[idx] = { ...this.data.timetable[idx], ...updatedFields };
      this.save();
      return this.data.timetable[idx];
    }
    return null;
  }

  deleteTimetableEntry(id) {
    this.data.timetable = (this.data.timetable || []).filter(e => e.id !== id);
    this.save();
  }

  clearTimetable() {
    this.data.timetable = [];
    this.saveTimetable([]);
  }

  // --- Faculty CRUD ---
  addFaculty(facultyMember) {
    if (!facultyMember.id) facultyMember.id = "fac_" + Date.now();
    this.data.faculty.push(facultyMember);
    this.save();
    return facultyMember;
  }

  updateFaculty(id, fields) {
    const idx = this.data.faculty.findIndex(f => f.id === id);
    if (idx !== -1) {
      this.data.faculty[idx] = { ...this.data.faculty[idx], ...fields };
      this.save();
    }
  }

  deleteFaculty(id) {
    this.data.faculty = this.data.faculty.filter(f => f.id !== id);
    this.data.courses.forEach(c => {
      if (c.facultyId === id) c.facultyId = null;
    });
    this.data.timetable = this.data.timetable.filter(t => t.facultyId !== id);
    this.save();
  }

  // --- Course CRUD ---
  addCourse(course) {
    if (!course.id) course.id = "course_" + Date.now();
    this.data.courses.push(course);
    this.save();
    return course;
  }

  updateCourse(id, fields) {
    const idx = this.data.courses.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.data.courses[idx] = { ...this.data.courses[idx], ...fields };
      this.save();
    }
  }

  deleteCourse(id) {
    this.data.courses = this.data.courses.filter(c => c.id !== id);
    this.data.timetable = this.data.timetable.filter(t => t.courseId !== id);
    this.save();
  }

  // --- Batch CRUD ---
  addBatch(batch) {
    if (!batch.id) batch.id = "batch_" + Date.now();
    this.data.batches.push(batch);
    this.save();
    return batch;
  }

  updateBatch(id, fields) {
    const idx = this.data.batches.findIndex(b => b.id === id);
    if (idx !== -1) {
      this.data.batches[idx] = { ...this.data.batches[idx], ...fields };
      this.save();
    }
  }

  deleteBatch(id) {
    this.data.batches = this.data.batches.filter(b => b.id !== id);
    this.data.courses = this.data.courses.filter(c => c.batchId !== id);
    this.data.timetable = this.data.timetable.filter(t => t.batchId !== id);
    this.save();
  }

  // --- Room CRUD ---
  addRoom(room) {
    if (!room.id) room.id = "room_" + Date.now();
    this.data.rooms.push(room);
    this.save();
    return room;
  }

  updateRoom(id, fields) {
    const idx = this.data.rooms.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.data.rooms[idx] = { ...this.data.rooms[idx], ...fields };
      this.save();
    }
  }

  deleteRoom(id) {
    this.data.rooms = this.data.rooms.filter(r => r.id !== id);
    this.save();
  }

  // --- Export / Import ---
  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.batches || !parsed.courses || !parsed.faculty || !parsed.rooms) {
        throw new Error("Invalid schema: missing essential fields (batches, courses, faculty, rooms)");
      }
      this.data = parsed;
      this.save();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

// Global instance
const db = new DataStore();

if (typeof globalThis !== "undefined") {
  globalThis.DataStore = DataStore;
  globalThis.db = db;
}
