/**
 * UniSchedule UI Controller & View Renderer
 */

class UIController {
  constructor(dataStore, solver) {
    this.ds = dataStore;
    this.solver = solver;

    // View state
    this.currentView = "batch"; // 'batch' | 'faculty' | 'room' | 'master' | 'management'
    this.selectedBatchId = null;
    this.selectedFacultyId = null;
    this.selectedRoomId = null;
    this.managementTab = "courses"; // 'courses' | 'faculty' | 'rooms' | 'batches'

    // Drag & Drop tracking
    this.draggedEntryId = null;
  }

  init() {
    // Set default selections
    const batches = this.ds.getBatches();
    if (batches.length > 0) this.selectedBatchId = batches[0].id;

    const faculty = this.ds.getFaculty();
    if (faculty.length > 0) this.selectedFacultyId = faculty[0].id;

    const rooms = this.ds.getRooms();
    if (rooms.length > 0) this.selectedRoomId = rooms[0].id;

    this.render();
  }

  render() {
    this.renderSidebar();
    this.renderTopNav();
    this.renderStats();
    this.renderAuditPill();

    const mainContent = document.getElementById("view-content-area");
    if (!mainContent) return;

    if (this.currentView === "batch") {
      this.renderBatchView(mainContent);
    } else if (this.currentView === "faculty") {
      this.renderFacultyView(mainContent);
    } else if (this.currentView === "room") {
      this.renderRoomView(mainContent);
    } else if (this.currentView === "master") {
      this.renderMasterView(mainContent);
    } else if (this.currentView === "management") {
      this.renderManagementView(mainContent);
    }
  }

  // --- Sidebar & Navigation ---
  renderSidebar() {
    const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
    navItems.forEach(item => {
      const view = item.getAttribute("data-view");
      if (view === this.currentView) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    const inst = this.ds.getInstitution();
    const instEl = document.getElementById("institution-label");
    if (instEl && inst.name) {
      instEl.textContent = inst.name;
    }
  }

  renderTopNav() {
    const headingTitle = document.getElementById("view-title");
    const headingSubtitle = document.getElementById("view-subtitle");
    const selectorContainer = document.getElementById("dynamic-selector-container");

    if (!selectorContainer) return;

    if (this.currentView === "batch") {
      const currentBatch = this.ds.getBatchById(this.selectedBatchId);
      headingTitle.textContent = "Class Timetable";
      headingSubtitle.textContent = currentBatch ? `${currentBatch.name} (Strength: ${currentBatch.studentCount})` : "Select a batch";

      const batches = this.ds.getBatches();
      selectorContainer.innerHTML = `
        <label class="form-label" style="margin:0; font-size:0.75rem;">Class:</label>
        <select id="select-active-batch" class="form-select" style="padding:0.25rem 0.5rem; font-size:0.85rem;">
          ${batches.map(b => `<option value="${b.id}" ${b.id === this.selectedBatchId ? "selected" : ""}>${b.name}</option>`).join("")}
        </select>
      `;
      document.getElementById("select-active-batch").addEventListener("change", (e) => {
        this.selectedBatchId = e.target.value;
        this.render();
      });

    } else if (this.currentView === "faculty") {
      const currentFac = this.ds.getFacultyById(this.selectedFacultyId);
      headingTitle.textContent = "Faculty Schedule";
      headingSubtitle.textContent = currentFac ? `${currentFac.name} (${currentFac.designation})` : "Select instructor";

      const faculty = this.ds.getFaculty();
      selectorContainer.innerHTML = `
        <label class="form-label" style="margin:0; font-size:0.75rem;">Instructor:</label>
        <select id="select-active-faculty" class="form-select" style="padding:0.25rem 0.5rem; font-size:0.85rem;">
          ${faculty.map(f => `<option value="${f.id}" ${f.id === this.selectedFacultyId ? "selected" : ""}>${f.name}</option>`).join("")}
        </select>
      `;
      document.getElementById("select-active-faculty").addEventListener("change", (e) => {
        this.selectedFacultyId = e.target.value;
        this.render();
      });

    } else if (this.currentView === "room") {
      const currentRoom = this.ds.getRoomById(this.selectedRoomId);
      headingTitle.textContent = "Room & Lab Allocation";
      headingSubtitle.textContent = currentRoom ? `${currentRoom.name} (${currentRoom.building} - Cap: ${currentRoom.capacity})` : "Select room";

      const rooms = this.ds.getRooms();
      selectorContainer.innerHTML = `
        <label class="form-label" style="margin:0; font-size:0.75rem;">Room / Lab:</label>
        <select id="select-active-room" class="form-select" style="padding:0.25rem 0.5rem; font-size:0.85rem;">
          ${rooms.map(r => `<option value="${r.id}" ${r.id === this.selectedRoomId ? "selected" : ""}>${r.name} [${r.type.toUpperCase()}]</option>`).join("")}
        </select>
      `;
      document.getElementById("select-active-room").addEventListener("change", (e) => {
        this.selectedRoomId = e.target.value;
        this.render();
      });

    } else if (this.currentView === "master") {
      headingTitle.textContent = "Master Institution Overview";
      headingSubtitle.textContent = "Bird's eye view across all active academic batches";
      selectorContainer.innerHTML = ``;

    } else if (this.currentView === "management") {
      headingTitle.textContent = "Academic Data Management";
      headingSubtitle.textContent = "Manage courses, professors, classrooms, and student batches";
      selectorContainer.innerHTML = ``;
    }
  }

  renderStats() {
    const timetable = this.ds.getTimetable();
    const batches = this.ds.getBatches();
    const faculty = this.ds.getFaculty();
    const rooms = this.ds.getRooms();
    const settings = this.ds.getSettings();

    // 1. Total scheduled hours
    let totalScheduledHours = 0;
    timetable.forEach(e => {
      totalScheduledHours += (e.duration || 1);
    });

    // 2. Active Batches
    const activeBatchesCount = batches.length;

    // 3. Average faculty workload
    let avgFacultyHours = faculty.length > 0 ? (totalScheduledHours / faculty.length).toFixed(1) : 0;

    // 4. Room utilization %
    // Total available academic slots across week: days * academicPeriods * rooms.length
    const academicPeriodsCount = settings.periods.filter(p => !p.isBreak).length;
    const totalPossibleRoomSlots = settings.days.length * academicPeriodsCount * rooms.length;
    let roomUtilization = totalPossibleRoomSlots > 0 ? Math.round((totalScheduledHours / totalPossibleRoomSlots) * 100) : 0;
    if (roomUtilization > 100) roomUtilization = 100;

    const elTotalSlots = document.getElementById("stat-total-slots");
    const elBatches = document.getElementById("stat-batches");
    const elFacultyWorkload = document.getElementById("stat-workload");
    const elRoomUtil = document.getElementById("stat-room-util");

    if (elTotalSlots) elTotalSlots.textContent = totalScheduledHours;
    if (elBatches) elBatches.textContent = activeBatchesCount;
    if (elFacultyWorkload) elFacultyWorkload.textContent = `${avgFacultyHours} hrs/wk`;
    if (elRoomUtil) elRoomUtil.textContent = `${roomUtilization}%`;
  }

  renderAuditPill() {
    const pill = document.getElementById("conflict-status-pill");
    if (!pill) return;

    const conflicts = this.solver.auditSchedule();
    const count = conflicts.length;

    if (count === 0) {
      pill.className = "status-pill status-clean";
      pill.innerHTML = `<span>✓</span> 0 Clashes (Verified)`;
    } else {
      pill.className = "status-pill status-conflict";
      pill.innerHTML = `<span>⚠️</span> ${count} Conflict${count > 1 ? "s" : ""} Detected`;
    }
  }

  // --- Views ---

  renderBatchView(container) {
    const batch = this.ds.getBatchById(this.selectedBatchId);
    if (!batch) {
      container.innerHTML = `<div class="p-8 text-center text-muted">No batch selected.</div>`;
      return;
    }

    const timetable = this.ds.getTimetable().filter(e => e.batchId === batch.id);
    const settings = this.ds.getSettings();

    container.innerHTML = `
      <div class="timetable-container">
        <div class="timetable-header-panel">
          <div class="timetable-title-meta">
            <h3>${batch.name}</h3>
            <p>Academic Schedule • ${settings.days.length} Working Days • Default Hall: ${this._getRoomName(batch.defaultRoom)}</p>
          </div>
          <div class="navbar-actions">
            <button class="btn btn-secondary btn-sm" id="btn-export-csv">
              <span>📊</span> Export CSV
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.print()">
              <span>🖨️</span> Print / PDF
            </button>
          </div>
        </div>
        <div class="table-responsive">
          ${this._buildTimetableHTML(timetable, { type: "batch", id: batch.id })}
        </div>
      </div>
    `;

    this._attachGridEvents();
    const csvBtn = document.getElementById("btn-export-csv");
    if (csvBtn) csvBtn.addEventListener("click", () => this.exportCurrentViewCSV("batch", batch));
  }

  renderFacultyView(container) {
    const fac = this.ds.getFacultyById(this.selectedFacultyId);
    if (!fac) {
      container.innerHTML = `<div class="p-8 text-center text-muted">No faculty member selected.</div>`;
      return;
    }

    const timetable = this.ds.getTimetable().filter(e => e.facultyId === fac.id);
    const settings = this.ds.getSettings();

    let totalHours = 0;
    timetable.forEach(e => totalHours += (e.duration || 1));

    container.innerHTML = `
      <div class="timetable-container">
        <div class="timetable-header-panel">
          <div class="timetable-title-meta">
            <h3>${fac.name}</h3>
            <p>${fac.designation} • Total Teaching Load: <strong>${totalHours} / ${fac.maxHours || 18} hrs/week</strong></p>
          </div>
          <div class="navbar-actions">
            <button class="btn btn-secondary btn-sm" id="btn-export-csv">
              <span>📊</span> Export CSV
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.print()">
              <span>🖨️</span> Print / PDF
            </button>
          </div>
        </div>
        <div class="table-responsive">
          ${this._buildTimetableHTML(timetable, { type: "faculty", id: fac.id })}
        </div>
      </div>
    `;

    this._attachGridEvents();
    const csvBtn = document.getElementById("btn-export-csv");
    if (csvBtn) csvBtn.addEventListener("click", () => this.exportCurrentViewCSV("faculty", fac));
  }

  renderRoomView(container) {
    const room = this.ds.getRoomById(this.selectedRoomId);
    if (!room) {
      container.innerHTML = `<div class="p-8 text-center text-muted">No room selected.</div>`;
      return;
    }

    const timetable = this.ds.getTimetable().filter(e => e.roomId === room.id);
    const settings = this.ds.getSettings();

    let bookedPeriods = 0;
    timetable.forEach(e => bookedPeriods += (e.duration || 1));

    container.innerHTML = `
      <div class="timetable-container">
        <div class="timetable-header-panel">
          <div class="timetable-title-meta">
            <h3>${room.name} (${room.type.toUpperCase()})</h3>
            <p>${room.building} • Seating Capacity: ${room.capacity} • Booked Slots: <strong>${bookedPeriods}</strong></p>
          </div>
          <div class="navbar-actions">
            <button class="btn btn-secondary btn-sm" id="btn-export-csv">
              <span>📊</span> Export CSV
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.print()">
              <span>🖨️</span> Print / PDF
            </button>
          </div>
        </div>
        <div class="table-responsive">
          ${this._buildTimetableHTML(timetable, { type: "room", id: room.id })}
        </div>
      </div>
    `;

    this._attachGridEvents();
    const csvBtn = document.getElementById("btn-export-csv");
    if (csvBtn) csvBtn.addEventListener("click", () => this.exportCurrentViewCSV("room", room));
  }

  renderMasterView(container) {
    const batches = this.ds.getBatches();
    const settings = this.ds.getSettings();
    const allTimetable = this.ds.getTimetable();

    let tabsHTML = batches.map(b => `
      <div style="margin-bottom: 2rem;">
        <div style="margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
          <h4 style="font-weight: 700; color: var(--text-primary);">${b.name}</h4>
          <span style="font-size: 0.8rem; color: var(--text-secondary);">Room: ${this._getRoomName(b.defaultRoom)} | Students: ${b.studentCount}</span>
        </div>
        <div class="timetable-container" style="margin-bottom: 1.5rem;">
          <div class="table-responsive">
            ${this._buildTimetableHTML(allTimetable.filter(e => e.batchId === b.id), { type: "batch", id: b.id })}
          </div>
        </div>
      </div>
    `).join("");

    container.innerHTML = `
      <div>
        <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
          <button class="btn btn-secondary btn-sm" onclick="window.print()">
            <span>🖨️</span> Print Master Schedule
          </button>
        </div>
        ${tabsHTML}
      </div>
    `;

    this._attachGridEvents();
  }

  renderManagementView(container) {
    container.innerHTML = `
      <div class="timetable-container" style="padding: 1.5rem;">
        <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem; margin-bottom: 1.5rem;">
          <button class="btn ${this.managementTab === "courses" ? "btn-primary" : "btn-secondary"} btn-sm" id="tab-btn-courses">Courses / Subjects</button>
          <button class="btn ${this.managementTab === "faculty" ? "btn-primary" : "btn-secondary"} btn-sm" id="tab-btn-faculty">Faculty Members</button>
          <button class="btn ${this.managementTab === "rooms" ? "btn-primary" : "btn-secondary"} btn-sm" id="tab-btn-rooms">Rooms & Labs</button>
          <button class="btn ${this.managementTab === "batches" ? "btn-primary" : "btn-secondary"} btn-sm" id="tab-btn-batches">Batches / Sections</button>
        </div>
        <div id="management-table-content"></div>
      </div>
    `;

    document.getElementById("tab-btn-courses").addEventListener("click", () => { this.managementTab = "courses"; this.render(); });
    document.getElementById("tab-btn-faculty").addEventListener("click", () => { this.managementTab = "faculty"; this.render(); });
    document.getElementById("tab-btn-rooms").addEventListener("click", () => { this.managementTab = "rooms"; this.render(); });
    document.getElementById("tab-btn-batches").addEventListener("click", () => { this.managementTab = "batches"; this.render(); });

    const tableArea = document.getElementById("management-table-content");
    if (this.managementTab === "courses") this._renderCoursesManagement(tableArea);
    else if (this.managementTab === "faculty") this._renderFacultyManagement(tableArea);
    else if (this.managementTab === "rooms") this._renderRoomsManagement(tableArea);
    else if (this.managementTab === "batches") this._renderBatchesManagement(tableArea);
  }

  // --- HTML Timetable Grid Generator ---

  _buildTimetableHTML(entries, viewContext) {
    const settings = this.ds.getSettings();
    const days = settings.days;
    const periods = settings.periods;

    let html = `<table class="timetable-table"><thead><tr><th class="day-header-cell">Day / Time</th>`;

    // Period Header Columns
    periods.forEach(p => {
      if (p.isBreak) {
        html += `<th class="break-col"><div style="font-size:0.7rem; color:#94a3b8;">${p.startTime} - ${p.endTime}</div><div>${p.label}</div></th>`;
      } else {
        html += `<th>
          <div style="font-weight:700; color:var(--text-primary); font-size:0.85rem;">${p.label}</div>
          <div style="font-size:0.7rem; font-weight:500; color:var(--text-muted);">${p.startTime} - ${p.endTime}</div>
        </th>`;
      }
    });
    html += `</tr></thead><tbody>`;

    // Rows for Days
    days.forEach(day => {
      html += `<tr><td class="day-label-cell">${day}</td>`;

      let skipNext = 0; // For spanning continuous 2-hour labs

      for (let pIdx = 0; pIdx < periods.length; pIdx++) {
        if (skipNext > 0) {
          skipNext--;
          continue;
        }

        const period = periods[pIdx];

        if (period.isBreak) {
          html += `<td class="break-col"><span class="break-indicator">BREAK</span></td>`;
          continue;
        }

        // Find entry starting at this slot
        const entry = entries.find(e => e.day === day && e.periodId === period.id);

        if (entry) {
          const duration = entry.duration || 1;
          const colspan = duration > 1 ? `colspan="${duration}"` : "";
          if (duration > 1) {
            skipNext = duration - 1;
          }

          html += `<td ${colspan} class="slot-cell" data-day="${day}" data-period="${period.id}" data-context="${viewContext.type}">
            ${this._renderClassCard(entry, viewContext)}
          </td>`;
        } else {
          // Check if slot is covered by an ongoing previous multi-period entry
          // (Handled by skipNext, but in case of orphan periods):
          html += `<td class="slot-cell" data-day="${day}" data-period="${period.id}" data-context="${viewContext.type}">
            <div class="empty-slot" data-day="${day}" data-period="${period.id}" title="Click to assign class">
              <span>+</span>
            </div>
          </td>`;
        }
      }

      html += `</tr>`;
    });

    html += `</tbody></table>`;
    return html;
  }

  _renderClassCard(entry, viewContext) {
    const course = this.ds.getCourseById(entry.courseId) || { code: "GEN", title: "General Class", color: "#3B82F6" };
    const faculty = this.ds.getFacultyById(entry.facultyId) || { name: "Unassigned", color: "#94a3b8" };
    const room = this.ds.getRoomById(entry.roomId) || { name: "TBA" };
    const batch = this.ds.getBatchById(entry.batchId) || { name: "General" };

    const cardBorderColor = course.color || faculty.color || "#4F46E5";
    const isLab = entry.isLab || course.isLab;

    let subMeta = "";
    if (viewContext.type === "batch") {
      subMeta = `
        <div class="faculty-pill" title="${faculty.name}">
          <span class="faculty-dot" style="background-color: ${faculty.color || "#3b82f6"}"></span>
          <span>${faculty.name}</span>
        </div>
        <div class="room-badge">${room.name}</div>
      `;
    } else if (viewContext.type === "faculty") {
      subMeta = `
        <div class="faculty-pill" title="${batch.name}">
          <span>🎓 ${batch.name}</span>
        </div>
        <div class="room-badge">${room.name}</div>
      `;
    } else if (viewContext.type === "room") {
      subMeta = `
        <div class="faculty-pill" title="${batch.name}">
          <span>🎓 ${batch.name}</span>
        </div>
        <div class="faculty-pill" title="${faculty.name}">
          <span>👨‍🏫 ${faculty.name}</span>
        </div>
      `;
    }

    return `
      <div class="class-card ${isLab ? "is-lab" : ""}" 
           style="border-left-color: ${cardBorderColor};"
           draggable="true" 
           data-entry-id="${entry.id}">
        
        <div class="card-quick-actions">
          <button class="action-icon-btn btn-edit-entry" data-id="${entry.id}" title="Edit Slot">✏️</button>
          <button class="action-icon-btn btn-delete-entry" data-id="${entry.id}" title="Remove Slot">🗑️</button>
        </div>

        <div class="card-top">
          <span class="subject-code" style="color: ${cardBorderColor}; background-color: ${cardBorderColor}18;">${course.code}</span>
          ${isLab ? `<span class="lab-tag">🧪 LAB (${entry.duration || 2}h)</span>` : ""}
        </div>

        <div class="course-title" title="${course.title}">
          ${course.title}
        </div>

        <div class="card-footer">
          ${subMeta}
        </div>
      </div>
    `;
  }

  // --- Attach Grid & Drag Events ---

  _attachGridEvents() {
    // 1. Drag & Drop
    const cards = document.querySelectorAll(".class-card");
    cards.forEach(card => {
      card.addEventListener("dragstart", (e) => {
        this.draggedEntryId = card.getAttribute("data-entry-id");
        card.classList.add("card-dragging");
        e.dataTransfer.setData("text/plain", this.draggedEntryId);
        e.dataTransfer.effectAllowed = "move";
      });

      card.addEventListener("dragend", () => {
        card.classList.remove("card-dragging");
        document.querySelectorAll(".slot-drag-over").forEach(el => el.classList.remove("slot-drag-over"));
      });
    });

    const slots = document.querySelectorAll(".slot-cell");
    slots.forEach(slot => {
      slot.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        slot.classList.add("slot-drag-over");
      });

      slot.addEventListener("dragleave", () => {
        slot.classList.remove("slot-drag-over");
      });

      slot.addEventListener("drop", (e) => {
        e.preventDefault();
        slot.classList.remove("slot-drag-over");
        const entryId = e.dataTransfer.getData("text/plain") || this.draggedEntryId;
        if (!entryId) return;

        const targetDay = slot.getAttribute("data-day");
        const targetPeriodId = parseInt(slot.getAttribute("data-period"), 10);
        this.handleMoveOrSwapSlot(entryId, targetDay, targetPeriodId);
      });
    });

    // 2. Click on empty slot to add
    document.querySelectorAll(".empty-slot").forEach(el => {
      el.addEventListener("click", () => {
        const day = el.getAttribute("data-day");
        const periodId = parseInt(el.getAttribute("data-period"), 10);
        this.openAssignModal(day, periodId);
      });
    });

    // 3. Edit & Delete quick buttons
    document.querySelectorAll(".btn-edit-entry").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        this.openEditModal(id);
      });
    });

    document.querySelectorAll(".btn-delete-entry").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        if (confirm("Remove this class from timetable?")) {
          this.ds.deleteTimetableEntry(id);
          this.showToast("Slot removed", "info");
          this.render();
        }
      });
    });
  }

  handleMoveOrSwapSlot(entryId, targetDay, targetPeriodId) {
    const entry = this.ds.getTimetable().find(e => e.id === entryId);
    if (!entry) return;

    if (entry.day === targetDay && entry.periodId === targetPeriodId) return;

    // Check if destination slot already has a class
    const existingAtTarget = this.ds.getTimetable().find(e => 
      e.day === targetDay && 
      e.periodId === targetPeriodId && 
      (this.currentView === "batch" ? e.batchId === entry.batchId : true)
    );

    if (existingAtTarget && existingAtTarget.id !== entry.id) {
      // Prompt user to swap
      if (confirm(`Target slot already has "${this._getCourseTitle(existingAtTarget.courseId)}". Swap them?`)) {
        // Swap slots
        const oldDay = entry.day;
        const oldPeriodId = entry.periodId;

        this.ds.updateTimetableEntry(entry.id, { day: targetDay, periodId: targetPeriodId });
        this.ds.updateTimetableEntry(existingAtTarget.id, { day: oldDay, periodId: oldPeriodId });

        // Audit check
        const clash = this.solver.checkSinglePlacementClash(entry);
        if (clash.hasClash) {
          this.showToast(`⚠️ Swapped, but conflict detected: ${clash.conflicts[0].message}`, "warning");
        } else {
          this.showToast("Classes successfully swapped!", "success");
        }
        this.render();
      }
      return;
    }

    // Move to empty target slot
    const updatedEntry = { ...entry, day: targetDay, periodId: targetPeriodId };
    const clashCheck = this.solver.checkSinglePlacementClash(updatedEntry, entry.id);

    this.ds.updateTimetableEntry(entry.id, { day: targetDay, periodId: targetPeriodId });

    if (clashCheck.hasClash) {
      this.showToast(`⚠️ Moved, but clash detected: ${clashCheck.conflicts[0].message}`, "warning");
    } else {
      this.showToast("Slot updated successfully!", "success");
    }
    this.render();
  }

  // --- Modals & Actions ---

  openAssignModal(day, periodId) {
    const modal = document.getElementById("general-modal");
    const title = document.getElementById("modal-title");
    const body = document.getElementById("modal-body");
    const saveBtn = document.getElementById("modal-btn-save");

    saveBtn.style.display = "inline-flex";
    title.textContent = `Assign Class (${day} - Period ${periodId})`;

    const batches = this.ds.getBatches();
    const courses = this.ds.getCourses();
    const faculty = this.ds.getFaculty();
    const rooms = this.ds.getRooms();

    const activeBatch = this.currentView === "batch" ? this.selectedBatchId : (batches[0] ? batches[0].id : "");

    body.innerHTML = `
      <form id="assign-class-form" class="form-grid">
        <div class="form-group">
          <label class="form-label">Batch / Section</label>
          <select id="assign-batch" class="form-select">
            ${batches.map(b => `<option value="${b.id}" ${b.id === activeBatch ? "selected" : ""}>${b.name}</option>`).join("")}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Course / Subject</label>
          <select id="assign-course" class="form-select">
            ${courses.map(c => `<option value="${c.id}">${c.code} - ${c.title} (${c.isLab ? "Lab" : "Lecture"})</option>`).join("")}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Instructor</label>
          <select id="assign-faculty" class="form-select">
            ${faculty.map(f => `<option value="${f.id}">${f.name}</option>`).join("")}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Room / Lab</label>
          <select id="assign-room" class="form-select">
            ${rooms.map(r => `<option value="${r.id}">${r.name} (${r.type} - Cap: ${r.capacity})</option>`).join("")}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Duration (Hours)</label>
          <select id="assign-duration" class="form-select">
            <option value="1">1 Period</option>
            <option value="2">2 Continuous Periods (Lab Block)</option>
          </select>
        </div>

        <div class="form-group col-span-2" id="assign-clash-warning" style="display:none; padding: 0.75rem; background: var(--danger-light); border-radius: var(--radius-md); color: var(--danger); font-size: 0.85rem;"></div>
      </form>
    `;

    // Auto-update instructor and room when course changes
    const courseSelect = document.getElementById("assign-course");
    const facultySelect = document.getElementById("assign-faculty");
    const roomSelect = document.getElementById("assign-room");
    const durationSelect = document.getElementById("assign-duration");

    const onCourseChange = () => {
      const c = this.ds.getCourseById(courseSelect.value);
      if (c) {
        if (c.facultyId) facultySelect.value = c.facultyId;
        if (c.preferredRoom) roomSelect.value = c.preferredRoom;
        if (c.isLab) durationSelect.value = "2";
        else durationSelect.value = "1";
      }
    };
    courseSelect.addEventListener("change", onCourseChange);
    onCourseChange();

    saveBtn.onclick = () => {
      const batchId = document.getElementById("assign-batch").value;
      const courseId = document.getElementById("assign-course").value;
      const facultyId = document.getElementById("assign-faculty").value;
      const roomId = document.getElementById("assign-room").value;
      const duration = parseInt(document.getElementById("assign-duration").value, 10);
      const course = this.ds.getCourseById(courseId);

      const newEntry = {
        batchId,
        courseId,
        facultyId,
        roomId,
        day,
        periodId,
        duration,
        isLab: course ? course.isLab : false
      };

      const clash = this.solver.checkSinglePlacementClash(newEntry);
      if (clash.hasClash) {
        if (!confirm(`Warning: Clash detected:\n${clash.conflicts[0].message}\n\nDo you still want to force assign?`)) {
          return;
        }
      }

      this.ds.addTimetableEntry(newEntry);
      this.closeModal();
      this.showToast("Class assigned successfully!", "success");
      this.render();
    };

    modal.classList.add("active");
  }

  openEditModal(entryId) {
    const entry = this.ds.getTimetable().find(e => e.id === entryId);
    if (!entry) return;

    const modal = document.getElementById("general-modal");
    const title = document.getElementById("modal-title");
    const body = document.getElementById("modal-body");
    const saveBtn = document.getElementById("modal-btn-save");

    title.textContent = `Edit Class Slot`;

    const batches = this.ds.getBatches();
    const courses = this.ds.getCourses();
    const faculty = this.ds.getFaculty();
    const rooms = this.ds.getRooms();
    const settings = this.ds.getSettings();

    body.innerHTML = `
      <form id="edit-class-form" class="form-grid">
        <div class="form-group">
          <label class="form-label">Batch</label>
          <select id="edit-batch" class="form-select">
            ${batches.map(b => `<option value="${b.id}" ${b.id === entry.batchId ? "selected" : ""}>${b.name}</option>`).join("")}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Course</label>
          <select id="edit-course" class="form-select">
            ${courses.map(c => `<option value="${c.id}" ${c.id === entry.courseId ? "selected" : ""}>${c.code} - ${c.title}</option>`).join("")}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Faculty</label>
          <select id="edit-faculty" class="form-select">
            ${faculty.map(f => `<option value="${f.id}" ${f.id === entry.facultyId ? "selected" : ""}>${f.name}</option>`).join("")}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Room</label>
          <select id="edit-room" class="form-select">
            ${rooms.map(r => `<option value="${r.id}" ${r.id === entry.roomId ? "selected" : ""}>${r.name}</option>`).join("")}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Day</label>
          <select id="edit-day" class="form-select">
            ${settings.days.map(d => `<option value="${d}" ${d === entry.day ? "selected" : ""}>${d}</option>`).join("")}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Period</label>
          <select id="edit-period" class="form-select">
            ${settings.periods.filter(p => !p.isBreak).map(p => `<option value="${p.id}" ${p.id === entry.periodId ? "selected" : ""}>${p.label} (${p.startTime})</option>`).join("")}
          </select>
        </div>
      </form>
    `;

    saveBtn.onclick = () => {
      const updated = {
        batchId: document.getElementById("edit-batch").value,
        courseId: document.getElementById("edit-course").value,
        facultyId: document.getElementById("edit-faculty").value,
        roomId: document.getElementById("edit-room").value,
        day: document.getElementById("edit-day").value,
        periodId: parseInt(document.getElementById("edit-period").value, 10)
      };

      this.ds.updateTimetableEntry(entryId, updated);
      this.closeModal();
      this.showToast("Class details updated", "success");
      this.render();
    };

    modal.classList.add("active");
  }

  openAuditModal() {
    const modal = document.getElementById("general-modal");
    const title = document.getElementById("modal-title");
    const body = document.getElementById("modal-body");
    const saveBtn = document.getElementById("modal-btn-save");

    title.textContent = `Timetable Conflict Audit`;
    saveBtn.style.display = "none";

    const conflicts = this.solver.auditSchedule();

    if (conflicts.length === 0) {
      body.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <div style="font-size: 3rem; margin-bottom: 0.5rem;">🎉</div>
          <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--success); margin-bottom: 0.25rem;">100% Conflict-Free Schedule!</h3>
          <p style="color: var(--text-secondary); font-size: 0.875rem;">
            No teacher overlaps, no room double-bookings, no batch clashes, and no break violations across the entire institution.
          </p>
        </div>
      `;
    } else {
      body.innerHTML = `
        <div style="margin-bottom: 1rem;">
          <p style="font-size: 0.9rem; color: var(--text-secondary);">
            Found <strong>${conflicts.length}</strong> conflict${conflicts.length > 1 ? "s" : ""} across the institution:
          </p>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 50vh; overflow-y: auto;">
          ${conflicts.map(c => `
            <div style="padding: 0.85rem 1rem; border-radius: var(--radius-md); background: ${c.severity === "critical" ? "var(--danger-light)" : "var(--warning-light)"}; border-left: 4px solid ${c.severity === "critical" ? "var(--danger)" : "var(--warning)"};">
              <div style="font-weight: 700; font-size: 0.85rem; color: ${c.severity === "critical" ? "var(--danger)" : "#b45309"}; margin-bottom: 0.25rem;">
                ${c.type.replace(/_/g, " ")}
              </div>
              <div style="font-size: 0.85rem; color: #334155;">
                ${c.message}
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }

    modal.classList.add("active");
  }

  closeModal() {
    const modal = document.getElementById("general-modal");
    if (modal) {
      modal.classList.remove("active");
      const saveBtn = document.getElementById("modal-btn-save");
      if (saveBtn) saveBtn.style.display = "inline-flex";
    }
  }

  // --- CSV Export ---
  exportCurrentViewCSV(viewType, entity) {
    const settings = this.ds.getSettings();
    const days = settings.days;
    const periods = settings.periods;
    const timetable = this.ds.getTimetable();

    let csv = [];
    // Header row
    let header = ["Day", ...periods.map(p => `"${p.label} (${p.startTime}-${p.endTime})"` )];
    csv.push(header.join(","));

    days.forEach(day => {
      let row = [`"${day}"`];
      periods.forEach(period => {
        if (period.isBreak) {
          row.push('"RECESS / BREAK"');
          return;
        }

        let entry = null;
        if (viewType === "batch") {
          entry = timetable.find(e => e.batchId === entity.id && e.day === day && e.periodId === period.id);
        } else if (viewType === "faculty") {
          entry = timetable.find(e => e.facultyId === entity.id && e.day === day && e.periodId === period.id);
        } else if (viewType === "room") {
          entry = timetable.find(e => e.roomId === entity.id && e.day === day && e.periodId === period.id);
        }

        if (entry) {
          const course = this.ds.getCourseById(entry.courseId);
          const fac = this.ds.getFacultyById(entry.facultyId);
          const room = this.ds.getRoomById(entry.roomId);
          const b = this.ds.getBatchById(entry.batchId);

          let cellText = `${course ? course.code : "GEN"}: ${course ? course.title : "Class"}`;
          if (viewType === "batch") cellText += ` (${fac ? fac.name : ""} in ${room ? room.name : ""})`;
          else if (viewType === "faculty") cellText += ` (${b ? b.name : ""} in ${room ? room.name : ""})`;
          else if (viewType === "room") cellText += ` (${b ? b.name : ""} by ${fac ? fac.name : ""})`;

          row.push(`"${cellText.replace(/"/g, '""')}"`);
        } else {
          row.push('""');
        }
      });
      csv.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csv.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Timetable_${entity.name.replace(/[^a-zA-Z0-9]/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast("CSV timetable downloaded!", "success");
  }

  // --- Management Subviews ---
  _renderCoursesManagement(container) {
    const courses = this.ds.getCourses();
    const faculty = this.ds.getFaculty();
    const batches = this.ds.getBatches();

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h4 style="font-weight: 700;">Courses & Subject Offerings (${courses.length})</h4>
        <button class="btn btn-primary btn-sm" id="btn-add-course">+ Add Course</button>
      </div>
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Course Title</th>
              <th>Batch / Class</th>
              <th>Instructor</th>
              <th>Type / Hours</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${courses.map(c => `
              <tr>
                <td><strong>${c.code}</strong></td>
                <td>${c.title}</td>
                <td>${this._getBatchName(c.batchId)}</td>
                <td>${this._getFacultyName(c.facultyId)}</td>
                <td>${c.isLab ? `<span class="lab-tag">LAB (${c.duration || 2}h)</span>` : `${c.periodsPerWeek || 3} periods/wk`}</td>
                <td>
                  <button class="btn btn-secondary btn-sm btn-delete-course" data-id="${c.id}">Delete</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    document.querySelectorAll(".btn-delete-course").forEach(b => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-id");
        if (confirm("Delete this course and its timetable entries?")) {
          this.ds.deleteCourse(id);
          this.showToast("Course removed", "info");
          this.render();
        }
      });
    });

    document.getElementById("btn-add-course").addEventListener("click", () => this._openAddCourseModal());
  }

  _renderFacultyManagement(container) {
    const faculty = this.ds.getFaculty();
    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h4 style="font-weight: 700;">Faculty Members & Instructors (${faculty.length})</h4>
        <button class="btn btn-primary btn-sm" id="btn-add-faculty">+ Add Faculty</button>
      </div>
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Designation</th>
              <th>Email</th>
              <th>Max Hours / Week</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${faculty.map(f => `
              <tr>
                <td><strong style="color: ${f.color || "#000"}">${f.name}</strong></td>
                <td>${f.designation || "Instructor"}</td>
                <td>${f.email || "-"}</td>
                <td>${f.maxHours || 18} hrs</td>
                <td>
                  <button class="btn btn-secondary btn-sm btn-delete-faculty" data-id="${f.id}">Delete</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    document.querySelectorAll(".btn-delete-faculty").forEach(b => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-id");
        if (confirm("Delete this faculty member?")) {
          this.ds.deleteFaculty(id);
          this.showToast("Faculty deleted", "info");
          this.render();
        }
      });
    });

    document.getElementById("btn-add-faculty").addEventListener("click", () => this._openAddFacultyModal());
  }

  _renderRoomsManagement(container) {
    const rooms = this.ds.getRooms();
    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h4 style="font-weight: 700;">Classrooms & Laboratories (${rooms.length})</h4>
        <button class="btn btn-primary btn-sm" id="btn-add-room">+ Add Room</button>
      </div>
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Room Identifier</th>
              <th>Building / Wing</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rooms.map(r => `
              <tr>
                <td><strong>${r.name}</strong></td>
                <td>${r.building || "Campus"}</td>
                <td><span style="text-transform: uppercase; font-size:0.75rem; font-weight:700; padding:0.2rem 0.5rem; border-radius:4px; background:${r.type === "lab" ? "#d1fae5; color:#065f46;" : "#e0e7ff; color:#3730a3;"}">${r.type}</span></td>
                <td>${r.capacity} students</td>
                <td>
                  <button class="btn btn-secondary btn-sm btn-delete-room" data-id="${r.id}">Delete</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    document.querySelectorAll(".btn-delete-room").forEach(b => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-id");
        if (confirm("Delete this room?")) {
          this.ds.deleteRoom(id);
          this.showToast("Room deleted", "info");
          this.render();
        }
      });
    });

    document.getElementById("btn-add-room").addEventListener("click", () => this._openAddRoomModal());
  }

  _renderBatchesManagement(container) {
    const batches = this.ds.getBatches();
    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h4 style="font-weight: 700;">Student Batches / Sections (${batches.length})</h4>
        <button class="btn btn-primary btn-sm" id="btn-add-batch">+ Add Batch</button>
      </div>
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Class Name</th>
              <th>Semester / Section</th>
              <th>Strength</th>
              <th>Default Classroom</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${batches.map(b => `
              <tr>
                <td><strong>${b.name}</strong></td>
                <td>Sem ${b.semester} (Sec ${b.section})</td>
                <td>${b.studentCount} students</td>
                <td>${this._getRoomName(b.defaultRoom)}</td>
                <td>
                  <button class="btn btn-secondary btn-sm btn-delete-batch" data-id="${b.id}">Delete</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    document.querySelectorAll(".btn-delete-batch").forEach(b => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-id");
        if (confirm("Delete this batch and associated timetable?")) {
          this.ds.deleteBatch(id);
          this.showToast("Batch deleted", "info");
          this.render();
        }
      });
    });

    document.getElementById("btn-add-batch").addEventListener("click", () => this._openAddBatchModal());
  }

  // --- Add Entity Modals ---
  _openAddCourseModal() {
    const modal = document.getElementById("general-modal");
    const title = document.getElementById("modal-title");
    const body = document.getElementById("modal-body");
    const saveBtn = document.getElementById("modal-btn-save");

    title.textContent = "Add New Course / Subject";
    const batches = this.ds.getBatches();
    const faculty = this.ds.getFaculty();
    const rooms = this.ds.getRooms();

    body.innerHTML = `
      <form class="form-grid">
        <div class="form-group">
          <label class="form-label">Course Code (e.g., CS301)</label>
          <input type="text" id="new-c-code" class="form-input" required placeholder="CS301">
        </div>
        <div class="form-group">
          <label class="form-label">Course Title</label>
          <input type="text" id="new-c-title" class="form-input" required placeholder="Data Structures & Algorithms">
        </div>
        <div class="form-group">
          <label class="form-label">Target Batch / Class</label>
          <select id="new-c-batch" class="form-select">
            ${batches.map(b => `<option value="${b.id}">${b.name}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Assigned Instructor</label>
          <select id="new-c-faculty" class="form-select">
            ${faculty.map(f => `<option value="${f.id}">${f.name}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Course Type</label>
          <select id="new-c-islab" class="form-select">
            <option value="false">Lecture / Theory</option>
            <option value="true">Laboratory / Practical</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Lectures / Week</label>
          <input type="number" id="new-c-hours" class="form-input" value="3" min="1" max="6">
        </div>
        <div class="form-group col-span-2">
          <label class="form-label">Preferred Room / Lab</label>
          <select id="new-c-room" class="form-select">
            <option value="">Auto-Assign Any Suitable Room</option>
            ${rooms.map(r => `<option value="${r.id}">${r.name} (${r.type})</option>`).join("")}
          </select>
        </div>
      </form>
    `;

    saveBtn.onclick = () => {
      const code = document.getElementById("new-c-code").value.trim();
      const title = document.getElementById("new-c-title").value.trim();
      if (!code || !title) {
        alert("Please enter course code and title");
        return;
      }

      const isLab = document.getElementById("new-c-islab").value === "true";
      const newCourse = {
        code,
        title,
        batchId: document.getElementById("new-c-batch").value,
        facultyId: document.getElementById("new-c-faculty").value,
        isLab,
        duration: isLab ? 2 : 1,
        periodsPerWeek: isLab ? 2 : parseInt(document.getElementById("new-c-hours").value, 10),
        preferredRoom: document.getElementById("new-c-room").value || null,
        roomType: isLab ? "lab" : "lecture",
        color: isLab ? "#10B981" : "#4F46E5"
      };

      this.ds.addCourse(newCourse);
      this.closeModal();
      this.showToast("Course created successfully", "success");
      this.render();
    };

    modal.classList.add("active");
  }

  _openAddFacultyModal() {
    const modal = document.getElementById("general-modal");
    const title = document.getElementById("modal-title");
    const body = document.getElementById("modal-body");
    const saveBtn = document.getElementById("modal-btn-save");

    title.textContent = "Add Faculty Member";
    body.innerHTML = `
      <form class="form-grid">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" id="new-f-name" class="form-input" placeholder="Dr. Jane Smith" required>
        </div>
        <div class="form-group">
          <label class="form-label">Designation</label>
          <input type="text" id="new-f-desig" class="form-input" placeholder="Associate Professor">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="new-f-email" class="form-input" placeholder="jsmith@apex.edu">
        </div>
        <div class="form-group">
          <label class="form-label">Max Weekly Hours</label>
          <input type="number" id="new-f-hours" class="form-input" value="18" min="5" max="30">
        </div>
      </form>
    `;

    saveBtn.onclick = () => {
      const name = document.getElementById("new-f-name").value.trim();
      if (!name) return alert("Please enter faculty name");

      const colors = ["#2563EB", "#7C3AED", "#059669", "#DB2777", "#D97706", "#4F46E5", "#0D9488", "#DC2626"];
      const randColor = colors[Math.floor(Math.random() * colors.length)];

      this.ds.addFaculty({
        name,
        designation: document.getElementById("new-f-desig").value.trim() || "Instructor",
        email: document.getElementById("new-f-email").value.trim(),
        maxHours: parseInt(document.getElementById("new-f-hours").value, 10),
        color: randColor
      });

      this.closeModal();
      this.showToast("Faculty member added", "success");
      this.render();
    };

    modal.classList.add("active");
  }

  _openAddRoomModal() {
    const modal = document.getElementById("general-modal");
    const title = document.getElementById("modal-title");
    const body = document.getElementById("modal-body");
    const saveBtn = document.getElementById("modal-btn-save");

    title.textContent = "Add Classroom / Lab";
    body.innerHTML = `
      <form class="form-grid">
        <div class="form-group">
          <label class="form-label">Room Identifier / Number</label>
          <input type="text" id="new-r-name" class="form-input" placeholder="LH-301 or Lab 4" required>
        </div>
        <div class="form-group">
          <label class="form-label">Building / Block</label>
          <input type="text" id="new-r-bldg" class="form-input" placeholder="Science Block">
        </div>
        <div class="form-group">
          <label class="form-label">Facility Type</label>
          <select id="new-r-type" class="form-select">
            <option value="lecture">Lecture Hall</option>
            <option value="lab">Computer / Science Lab</option>
            <option value="auditorium">Seminar Hall / Auditorium</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Seating Capacity</label>
          <input type="number" id="new-r-cap" class="form-input" value="60" min="15" max="300">
        </div>
      </form>
    `;

    saveBtn.onclick = () => {
      const name = document.getElementById("new-r-name").value.trim();
      if (!name) return alert("Please enter room identifier");

      this.ds.addRoom({
        name,
        building: document.getElementById("new-r-bldg").value.trim() || "Main Campus",
        type: document.getElementById("new-r-type").value,
        capacity: parseInt(document.getElementById("new-r-cap").value, 10)
      });

      this.closeModal();
      this.showToast("Room added", "success");
      this.render();
    };

    modal.classList.add("active");
  }

  _openAddBatchModal() {
    const modal = document.getElementById("general-modal");
    const title = document.getElementById("modal-title");
    const body = document.getElementById("modal-body");
    const saveBtn = document.getElementById("modal-btn-save");

    title.textContent = "Add Batch / Section";
    const rooms = this.ds.getRooms();

    body.innerHTML = `
      <form class="form-grid">
        <div class="form-group col-span-2">
          <label class="form-label">Full Batch Name</label>
          <input type="text" id="new-b-name" class="form-input" placeholder="B.Tech CSE - 1st Sem (Sec A)" required>
        </div>
        <div class="form-group">
          <label class="form-label">Semester</label>
          <input type="number" id="new-b-sem" class="form-input" value="1" min="1" max="10">
        </div>
        <div class="form-group">
          <label class="form-label">Section (A/B/C)</label>
          <input type="text" id="new-b-sec" class="form-input" value="A">
        </div>
        <div class="form-group">
          <label class="form-label">Student Count</label>
          <input type="number" id="new-b-count" class="form-input" value="50" min="10" max="200">
        </div>
        <div class="form-group">
          <label class="form-label">Default Classroom</label>
          <select id="new-b-room" class="form-select">
            ${rooms.map(r => `<option value="${r.id}">${r.name}</option>`).join("")}
          </select>
        </div>
      </form>
    `;

    saveBtn.onclick = () => {
      const name = document.getElementById("new-b-name").value.trim();
      if (!name) return alert("Please enter batch name");

      const created = this.ds.addBatch({
        name,
        semester: parseInt(document.getElementById("new-b-sem").value, 10),
        section: document.getElementById("new-b-sec").value.trim(),
        studentCount: parseInt(document.getElementById("new-b-count").value, 10),
        defaultRoom: document.getElementById("new-b-room").value
      });

      this.selectedBatchId = created.id;
      this.closeModal();
      this.showToast("Batch added successfully", "success");
      this.render();
    };

    modal.classList.add("active");
  }

  // --- Helper String Lookups ---
  _getRoomName(id) { const r = this.ds.getRoomById(id); return r ? r.name : "TBA"; }
  _getFacultyName(id) { const f = this.ds.getFacultyById(id); return f ? f.name : "Unassigned"; }
  _getCourseTitle(id) { const c = this.ds.getCourseById(id); return c ? c.title : "Class"; }
  _getBatchName(id) { const b = this.ds.getBatchById(id); return b ? b.name : "Batch"; }

  // --- Toasts ---
  showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    let icon = "✓";
    if (type === "error") icon = "✕";
    if (type === "warning") icon = "⚠️";
    if (type === "info") icon = "ℹ️";

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "all 0.25s ease";
      setTimeout(() => toast.remove(), 250);
    }, 3800);
  }
}
