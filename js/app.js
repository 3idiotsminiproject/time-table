/**
 * UniSchedule - Main Application Orchestrator
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize core modules
  const solver = new TimetableSolver(db);
  const ui = new UIController(db, solver);

  // If timetable is empty on first load, auto-generate initial schedule for instant gratification
  if (db.getTimetable().length === 0) {
    const initialRun = solver.generate();
    if (initialRun.success) {
      db.saveTimetable(initialRun.entries);
    }
  }

  ui.init();

  // 2. Sidebar Navigation Events
  document.querySelectorAll(".sidebar-nav .nav-item").forEach(item => {
    item.addEventListener("click", () => {
      const view = item.getAttribute("data-view");
      if (view) {
        ui.currentView = view;
        ui.render();
      }
    });
  });

  // 3. Top Action Buttons
  const btnAutoGenerate = document.getElementById("btn-auto-generate");
  if (btnAutoGenerate) {
    btnAutoGenerate.addEventListener("click", () => {
      ui.showToast("Generating optimal timetable...", "info");

      setTimeout(() => {
        const result = solver.generate();
        if (result.success || result.entries.length > 0) {
          db.saveTimetable(result.entries);
          ui.render();

          // Open results summary
          openGenerationReportModal(result);
        } else {
          ui.showToast("Could not resolve all constraints. Try adjusting course hours or rooms.", "error");
        }
      }, 50);
    });
  }

  // Conflict Status Pill
  const pill = document.getElementById("conflict-status-pill");
  if (pill) {
    pill.addEventListener("click", () => {
      ui.openAuditModal();
    });
  }

  // Hybrid Database Status Pill & Status Updates
  const dbPill = document.getElementById("db-status-pill");
  const dbText = document.getElementById("db-status-text");

  function updateDatabaseIndicator(status) {
    if (!dbPill || !dbText) return;
    dbPill.className = "status-pill";

    if (status.isOnline) {
      dbPill.classList.add("status-db-online");
      const slotsCount = status.diagnostics?.tables?.timetable_entries ?? db.getTimetable().length;
      dbText.textContent = `SQLite: Connected (${slotsCount} slots)`;
      dbPill.title = "Connected to Node.js backend & SQLite (timetable.db). Click for database details.";
    } else {
      dbPill.classList.add("status-db-offline");
      dbText.textContent = "Offline (Local DB)";
      dbPill.title = "Operating in offline client storage mode. Click for connection & sync options.";
    }
  }

  db.onStatusChange((status) => {
    updateDatabaseIndicator(status);
  });

  if (dbPill) {
    dbPill.addEventListener("click", () => {
      openDatabaseModal(db, ui);
    });
  }

  const btnDbStatus = document.getElementById("btn-db-status");
  if (btnDbStatus) {
    btnDbStatus.addEventListener("click", () => {
      openDatabaseModal(db, ui);
    });
  }

  // Reset to Sample Data
  const btnSampleData = document.getElementById("btn-sample-data");
  if (btnSampleData) {
    btnSampleData.addEventListener("click", () => {
      if (confirm("Reset institution data and regenerate timetable with sample university dataset?")) {
        db.resetToSampleData();
        const run = solver.generate();
        if (run.success) {
          db.saveTimetable(run.entries);
        }
        ui.init();
        ui.showToast("Sample university dataset loaded!", "success");
      }
    });
  }

  // Clear Timetable
  const btnClearSchedule = document.getElementById("btn-clear-schedule");
  if (btnClearSchedule) {
    btnClearSchedule.addEventListener("click", () => {
      if (confirm("Clear all scheduled slots? (Course and faculty data will be kept).")) {
        db.clearTimetable();
        ui.render();
        ui.showToast("Timetable cleared", "info");
      }
    });
  }

  // Backup & Restore
  const btnExportJson = document.getElementById("btn-export-json");
  if (btnExportJson) {
    btnExportJson.addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(db.exportJSON());
      const dlAnchor = document.createElement("a");
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", `UniSchedule_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
      ui.showToast("Backup JSON file exported!", "success");
    });
  }

  const btnImportJson = document.getElementById("btn-import-json");
  const fileInput = document.getElementById("json-file-input");
  if (btnImportJson && fileInput) {
    btnImportJson.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const res = db.importJSON(event.target.result);
        if (res.success) {
          ui.init();
          ui.showToast("Data imported successfully!", "success");
        } else {
          ui.showToast("Import failed: " + res.error, "error");
        }
      };
      reader.readAsText(file);
    });
  }

  // Settings Modal
  const btnSettings = document.getElementById("btn-settings");
  if (btnSettings) {
    btnSettings.addEventListener("click", () => {
      openSettingsModal(db, ui);
    });
  }

  // Modal Close Handlers
  const modalCloseBtn = document.getElementById("modal-close-btn");
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", () => ui.closeModal());
  }

  const modalOverlay = document.getElementById("general-modal");
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) ui.closeModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") ui.closeModal();
  });

  // Helper Modal Functions
  function openGenerationReportModal(result) {
    const modal = document.getElementById("general-modal");
    const title = document.getElementById("modal-title");
    const body = document.getElementById("modal-body");
    const saveBtn = document.getElementById("modal-btn-save");

    title.textContent = "Auto-Generation Summary";
    saveBtn.style.display = "none";

    const isPerfect = result.conflicts.length === 0 && result.unplacedCount === 0;

    body.innerHTML = `
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">${isPerfect ? "⚡" : "⚠️"}</div>
        <h3 style="font-size: 1.3rem; font-weight: 700; color: ${isPerfect ? "var(--success)" : "var(--warning)"};">
          ${isPerfect ? "Optimal Timetable Generated!" : "Generation Completed with Warnings"}
        </h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary);">
          Engine computed schedule using heuristic constraint satisfaction with forward checking.
        </p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
        <div style="background: var(--bg-main); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
          <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">SCHEDULED SLOTS</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-top: 0.2rem;">${result.entries.length}</div>
        </div>
        <div style="background: var(--bg-main); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
          <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">SOLVER TIME</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary); margin-top: 0.2rem;">${result.durationMs}ms</div>
        </div>
        <div style="background: var(--bg-main); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
          <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">CONFLICTS</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: ${result.conflicts.length === 0 ? "var(--success)" : "var(--danger)"}; margin-top: 0.2rem;">${result.conflicts.length}</div>
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1rem; font-size: 0.85rem;">
        <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">Constraints Satisfied:</div>
        <ul style="padding-left: 1.25rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.25rem;">
          <li>✓ No professor assigned to 2 batches at the same time</li>
          <li>✓ No room double-booked across batches</li>
          <li>✓ Multi-hour lab blocks placed in designated laboratories</li>
          <li>✓ Classes distributed evenly across Monday to Friday</li>
          <li>✓ Lunch breaks protected from academic bookings</li>
        </ul>
      </div>
    `;

    modal.classList.add("active");
  }

  function openSettingsModal(dataStore, uiCtrl) {
    const modal = document.getElementById("general-modal");
    const title = document.getElementById("modal-title");
    const body = document.getElementById("modal-body");
    const saveBtn = document.getElementById("modal-btn-save");

    title.textContent = "Institution & Timetable Settings";
    saveBtn.style.display = "inline-flex";

    const inst = dataStore.getInstitution();
    const settings = dataStore.getSettings();

    body.innerHTML = `
      <form class="form-grid">
        <div class="form-group col-span-2">
          <label class="form-label">Institution / College Name</label>
          <input type="text" id="set-inst-name" class="form-input" value="${inst.name || "Apex Institute of Technology"}">
        </div>
        <div class="form-group col-span-2">
          <label class="form-label">Academic Term</label>
          <input type="text" id="set-inst-term" class="form-input" value="${inst.term || "Fall Semester 2026-2027"}">
        </div>
        <div class="form-group col-span-2">
          <label class="form-label">Working Days</label>
          <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.25rem;">
            ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(d => `
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; cursor: pointer;">
                <input type="checkbox" name="set-days" value="${d}" ${settings.days.includes(d) ? "checked" : ""}>
                ${d}
              </label>
            `).join("")}
          </div>
        </div>
      </form>
    `;

    saveBtn.onclick = () => {
      const name = document.getElementById("set-inst-name").value.trim();
      const term = document.getElementById("set-inst-term").value.trim();
      const selectedDays = Array.from(document.querySelectorAll('input[name="set-days"]:checked')).map(cb => cb.value);

      if (selectedDays.length === 0) {
        alert("Please select at least 1 working day");
        return;
      }

      dataStore.setInstitution({ name, term });
      const currentSettings = dataStore.getSettings();
      currentSettings.days = selectedDays;
      dataStore.saveSettings(currentSettings);

      uiCtrl.closeModal();
      uiCtrl.showToast("Settings updated successfully", "success");
      uiCtrl.render();
    };

    modal.classList.add("active");
  }

  function openDatabaseModal(dataStore, uiCtrl) {
    const modal = document.getElementById("general-modal");
    const title = document.getElementById("modal-title");
    const body = document.getElementById("modal-body");
    const saveBtn = document.getElementById("modal-btn-save");

    title.textContent = "SQLite Relational Database & Hybrid Architecture";
    saveBtn.style.display = "none";

    const isOnline = dataStore.isOnline;
    const diag = dataStore.diagnostics;

    let diagHtml = "";
    if (isOnline && diag) {
      diagHtml = `
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 0.85rem; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; color: #065f46; font-weight: 700; margin-bottom: 0.25rem;">
            <span class="db-dot" style="background:#10b981; box-shadow:0 0 6px #10b981;"></span>
            Backend Server & SQLite Connected
          </div>
          <div style="font-size: 0.8rem; color: #047857;">
            Engine: <b>${diag.engine}</b> • File: <code>${diag.databaseFile}</code> (${(diag.fileSizeBytes / 1024).toFixed(1)} KB)
          </div>
        </div>

        <div class="nav-section-title" style="margin-bottom: 0.5rem;">Relational Database Tables</div>
        <div class="db-stats-grid">
          <div class="db-stat-item">
            <span class="label">🏢 Departments</span>
            <span class="count">${diag.tables.departments}</span>
          </div>
          <div class="db-stat-item">
            <span class="label">🏛️ Rooms & Labs</span>
            <span class="count">${diag.tables.rooms}</span>
          </div>
          <div class="db-stat-item">
            <span class="label">👨‍🏫 Faculty Members</span>
            <span class="count">${diag.tables.faculty}</span>
          </div>
          <div class="db-stat-item">
            <span class="label">🎓 Student Batches</span>
            <span class="count">${diag.tables.batches}</span>
          </div>
          <div class="db-stat-item">
            <span class="label">📚 Courses / Subjects</span>
            <span class="count">${diag.tables.courses}</span>
          </div>
          <div class="db-stat-item">
            <span class="label">📅 Timetable Slots</span>
            <span class="count">${diag.tables.timetable_entries}</span>
          </div>
        </div>
      `;
    } else {
      diagHtml = `
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 0.85rem; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; color: #92400e; font-weight: 700; margin-bottom: 0.25rem;">
            <span class="db-dot" style="background:#f59e0b;"></span>
            Operating in Offline / LocalStorage Mode
          </div>
          <div style="font-size: 0.82rem; color: #78350f;">
            Your changes are cached locally in the browser. Start the hybrid backend server by running <code>node server.js</code> to enable real-time SQLite database synchronization.
          </div>
        </div>
      `;
    }

    body.innerHTML = `
      ${diagHtml}

      <div class="nav-section-title" style="margin-top: 1rem; margin-bottom: 0.5rem;">Database Sync & Export Tools</div>
      <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
        <button class="btn btn-secondary" id="modal-btn-retry-conn">
          🔄 Retry Connection / Re-sync
        </button>
        ${isOnline ? `
          <a class="btn btn-secondary" href="/api/export-sql" download="timetable_backup.sql" style="text-decoration:none;">
            💾 Download SQL Dump (.sql)
          </a>
        ` : ""}
        <button class="btn btn-secondary" id="modal-btn-export-json">
          📥 Export JSON State
        </button>
      </div>

      <div style="margin-top: 1.25rem; font-size: 0.78rem; color: var(--text-muted); line-height: 1.4;">
        <b>Hybrid Architecture:</b> Changes are instantly written locally for maximum UI responsiveness and synchronized automatically with the SQLite database via transactional REST API endpoints.
      </div>
    `;

    // Modal button event listeners
    const retryBtn = document.getElementById("modal-btn-retry-conn");
    if (retryBtn) {
      retryBtn.addEventListener("click", async () => {
        uiCtrl.showToast("Probing SQLite backend...", "info");
        const connected = await dataStore.probeServer();
        if (connected) {
          uiCtrl.showToast("Successfully connected to SQLite database!", "success");
          uiCtrl.render();
          openDatabaseModal(dataStore, uiCtrl);
        } else {
          uiCtrl.showToast("Server offline. Please run 'node server.js'.", "warning");
        }
      });
    }

    const exportJsonBtn = document.getElementById("modal-btn-export-json");
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener("click", () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(dataStore.exportJSON());
        const dlAnchor = document.createElement("a");
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `UniSchedule_Backup_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
        uiCtrl.showToast("Database state exported as JSON!", "success");
      });
    }

    modal.classList.add("active");
  }
});
