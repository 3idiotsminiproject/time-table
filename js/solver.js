/**
 * Timetable Constraint Satisfaction Problem (CSP) Solver & Conflict Auditor
 */

class TimetableSolver {
  constructor(dataStore) {
    this.ds = dataStore;
  }

  /**
   * Run automated conflict-free timetable generation
   * Uses heuristic MRV (Minimum Remaining Values) + Backtracking with restarts
   */
  generate() {
    const startTime = performance.now();
    const settings = this.ds.getSettings();
    const days = settings.days;
    // Academic periods (excluding lunch/breaks)
    const allPeriods = settings.periods;
    const academicPeriods = allPeriods.filter(p => !p.isBreak);
    const breakPeriodIds = new Set(allPeriods.filter(p => p.isBreak).map(p => p.id));

    const batches = this.ds.getBatches();
    const courses = this.ds.getCourses();
    const facultyList = this.ds.getFaculty();
    const rooms = this.ds.getRooms();

    // 1. Build discrete units to schedule
    let units = [];
    courses.forEach(course => {
      const batch = batches.find(b => b.id === course.batchId);
      if (!batch) return;

      const duration = course.duration || 1;
      const count = course.isLab ? 1 : (course.periodsPerWeek || 3);

      for (let i = 0; i < count; i++) {
        units.push({
          unitId: `${course.id}_${i}`,
          courseId: course.id,
          batchId: course.batchId,
          facultyId: course.facultyId,
          isLab: course.isLab || false,
          duration: duration,
          roomType: course.roomType || (course.isLab ? "lab" : "lecture"),
          preferredRoom: course.preferredRoom || batch.defaultRoom || null,
          title: course.title,
          code: course.code,
          studentCount: batch.studentCount || 40
        });
      }
    });

    // Heuristic Sort:
    // 1. Multi-period / Labs first (most restrictive)
    // 2. High-demand faculty courses next
    const facultyLoad = {};
    units.forEach(u => {
      if (u.facultyId) {
        facultyLoad[u.facultyId] = (facultyLoad[u.facultyId] || 0) + u.duration;
      }
    });

    units.sort((a, b) => {
      if (a.isLab !== b.isLab) return a.isLab ? -1 : 1; // Labs first
      if (b.duration !== a.duration) return b.duration - a.duration;
      const loadA = facultyLoad[a.facultyId] || 0;
      const loadB = facultyLoad[b.facultyId] || 0;
      return loadB - loadA;
    });

    // 2. Backtracking solver with restarts
    const MAX_RESTARTS = 30;
    const MAX_ITERATIONS_PER_RESTART = 8000;
    let bestResult = null;
    let minUnplaced = Infinity;
    let totalIterations = 0;

    for (let restart = 0; restart < MAX_RESTARTS; restart++) {
      let state = {
        schedule: [], // placed entries
        // fast lookups:
        batchOccupied: {},    // `${batchId}_${day}_${periodId}` => true
        facultyOccupied: {},  // `${facultyId}_${day}_${periodId}` => true
        roomOccupied: {},     // `${roomId}_${day}_${periodId}` => true
        batchDayCourseCount: {}, // `${batchId}_${day}_${courseId}` => count
        unplacedUnits: []
      };

      // Slight randomization on restarts after the first attempt
      let unitsToSchedule = [...units];
      if (restart > 0) {
        // Shuffle within same priority tiers to find alternate search paths
        unitsToSchedule.sort((a, b) => {
          if (a.isLab !== b.isLab) return a.isLab ? -1 : 1;
          return Math.random() - 0.5;
        });
      }

      let iterations = 0;
      const success = this._backtrack(
        0,
        unitsToSchedule,
        state,
        days,
        allPeriods,
        breakPeriodIds,
        rooms,
        () => {
          iterations++;
          totalIterations++;
          return iterations > MAX_ITERATIONS_PER_RESTART;
        }
      );

      if (success) {
        bestResult = state.schedule;
        minUnplaced = 0;
        break;
      } else {
        const unplaced = unitsToSchedule.length - state.schedule.length;
        if (unplaced < minUnplaced) {
          minUnplaced = unplaced;
          bestResult = [...state.schedule];
        }
      }
    }

    const durationMs = Math.round(performance.now() - startTime);

    // Audit generated schedule
    const conflicts = this.auditSchedule(bestResult);

    return {
      success: minUnplaced === 0 && conflicts.length === 0,
      entries: bestResult || [],
      unplacedCount: minUnplaced,
      totalUnits: units.length,
      iterations: totalIterations,
      durationMs: durationMs,
      conflicts: conflicts
    };
  }

  /**
   * Internal recursive backtrack search
   */
  _backtrack(unitIndex, units, state, days, allPeriods, breakPeriodIds, rooms, checkLimit) {
    if (unitIndex >= units.length) {
      return true; // All units placed!
    }

    if (checkLimit()) {
      return false; // Iteration ceiling reached for this restart
    }

    const unit = units[unitIndex];

    // Find valid candidate slots: { day, periodId, room }
    const candidates = this._getCandidates(unit, state, days, allPeriods, breakPeriodIds, rooms);

    for (const cand of candidates) {
      // Try placing
      this._applyPlacement(unit, cand, state);

      if (this._backtrack(unitIndex + 1, units, state, days, allPeriods, breakPeriodIds, rooms, checkLimit)) {
        return true;
      }

      // Revert placement
      this._revertPlacement(unit, cand, state);
    }

    return false;
  }

  _getCandidates(unit, state, days, allPeriods, breakPeriodIds, rooms) {
    const candidates = [];
    const duration = unit.duration;

    // Filter suitable rooms
    let suitableRooms = rooms.filter(r => {
      // Match room type: lab needs lab; lecture needs lecture or auditorium
      if (unit.roomType === "lab" && r.type !== "lab") return false;
      if (unit.roomType !== "lab" && r.type === "lab") return false;
      // Room capacity
      if (r.capacity < unit.studentCount) return false;
      return true;
    });

    if (suitableRooms.length === 0) {
      // Fallback: any room with enough capacity
      suitableRooms = rooms.filter(r => r.capacity >= unit.studentCount);
      if (suitableRooms.length === 0) suitableRooms = [...rooms];
    }

    // Sort rooms to prefer preferredRoom
    suitableRooms.sort((a, b) => {
      if (a.id === unit.preferredRoom) return -1;
      if (b.id === unit.preferredRoom) return 1;
      return 0;
    });

    // Loop through days
    for (const day of days) {
      // Soft constraint: avoid placing same non-lab course twice on same day for same batch
      const courseCountToday = state.batchDayCourseCount[`${unit.batchId}_${day}_${unit.courseId}`] || 0;
      if (!unit.isLab && courseCountToday >= 1) {
        continue; // Keep courses distributed across days
      }

      // Loop through periods
      for (let pIdx = 0; pIdx < allPeriods.length; pIdx++) {
        const startPeriod = allPeriods[pIdx];
        if (startPeriod.isBreak) continue;

        // Check if continuous block fits without crossing breaks or end of day
        if (pIdx + duration > allPeriods.length) continue;

        let blockValid = true;
        let periodIdsInBlock = [];

        for (let offset = 0; offset < duration; offset++) {
          const currentP = allPeriods[pIdx + offset];
          if (currentP.isBreak) {
            blockValid = false;
            break;
          }
          periodIdsInBlock.push(currentP.id);
        }

        if (!blockValid) continue;

        // Check Batch and Faculty availability for all slots in block
        let isBatchFree = true;
        let isFacultyFree = true;

        for (const pId of periodIdsInBlock) {
          if (state.batchOccupied[`${unit.batchId}_${day}_${pId}`]) {
            isBatchFree = false;
            break;
          }
          if (unit.facultyId && state.facultyOccupied[`${unit.facultyId}_${day}_${pId}`]) {
            isFacultyFree = false;
            break;
          }
        }

        if (!isBatchFree || !isFacultyFree) continue;

        // Find an available suitable room for the block
        for (const room of suitableRooms) {
          let isRoomFree = true;
          for (const pId of periodIdsInBlock) {
            if (state.roomOccupied[`${room.id}_${day}_${pId}`]) {
              isRoomFree = false;
              break;
            }
          }

          if (isRoomFree) {
            candidates.push({
              day: day,
              startPeriodId: startPeriod.id,
              periodIds: periodIdsInBlock,
              room: room
            });
            break; // Found best room for this slot, avoid duplicate slot candidates
          }
        }
      }
    }

    return candidates;
  }

  _applyPlacement(unit, cand, state) {
    const entryId = "entry_" + unit.unitId;
    const entry = {
      id: entryId,
      batchId: unit.batchId,
      courseId: unit.courseId,
      facultyId: unit.facultyId,
      roomId: cand.room.id,
      day: cand.day,
      periodId: cand.startPeriodId,
      duration: unit.duration,
      isLab: unit.isLab
    };

    state.schedule.push(entry);

    for (const pId of cand.periodIds) {
      state.batchOccupied[`${unit.batchId}_${cand.day}_${pId}`] = true;
      if (unit.facultyId) {
        state.facultyOccupied[`${unit.facultyId}_${cand.day}_${pId}`] = true;
      }
      state.roomOccupied[`${cand.room.id}_${cand.day}_${pId}`] = true;
    }

    const key = `${unit.batchId}_${cand.day}_${unit.courseId}`;
    state.batchDayCourseCount[key] = (state.batchDayCourseCount[key] || 0) + 1;
  }

  _revertPlacement(unit, cand, state) {
    state.schedule.pop();

    for (const pId of cand.periodIds) {
      delete state.batchOccupied[`${unit.batchId}_${cand.day}_${pId}`];
      if (unit.facultyId) {
        delete state.facultyOccupied[`${unit.facultyId}_${cand.day}_${pId}`];
      }
      delete state.roomOccupied[`${cand.room.id}_${cand.day}_${pId}`];
    }

    const key = `${unit.batchId}_${cand.day}_${unit.courseId}`;
    state.batchDayCourseCount[key] = (state.batchDayCourseCount[key] || 1) - 1;
    if (state.batchDayCourseCount[key] <= 0) {
      delete state.batchDayCourseCount[key];
    }
  }

  /**
   * Audit an existing schedule and identify ALL hard and soft constraint violations
   */
  auditSchedule(timetableEntries) {
    const entries = timetableEntries || this.ds.getTimetable();
    const settings = this.ds.getSettings();
    const allPeriods = settings.periods;
    const breakPeriodIds = new Set(allPeriods.filter(p => p.isBreak).map(p => p.id));
    const conflicts = [];

    // Map: slotKey => list of entries occupying it
    const batchMap = {};
    const facultyMap = {};
    const roomMap = {};

    entries.forEach(entry => {
      const duration = entry.duration || 1;
      const startPIndex = allPeriods.findIndex(p => p.id === entry.periodId);
      if (startPIndex === -1) return;

      for (let offset = 0; offset < duration; offset++) {
        const pObj = allPeriods[startPIndex + offset];
        if (!pObj) continue;
        const pId = pObj.id;

        // Check if scheduled during a break
        if (breakPeriodIds.has(pId)) {
          conflicts.push({
            type: "BREAK_OVERLAP",
            severity: "critical",
            entryId: entry.id,
            message: `Class is scheduled during break period (${pObj.label}) on ${entry.day}.`,
            details: entry
          });
        }

        // Batch clash
        const bKey = `${entry.batchId}_${entry.day}_${pId}`;
        if (!batchMap[bKey]) batchMap[bKey] = [];
        batchMap[bKey].push(entry);

        // Faculty clash
        if (entry.facultyId) {
          const fKey = `${entry.facultyId}_${entry.day}_${pId}`;
          if (!facultyMap[fKey]) facultyMap[fKey] = [];
          facultyMap[fKey].push(entry);
        }

        // Room clash
        if (entry.roomId) {
          const rKey = `${entry.roomId}_${entry.day}_${pId}`;
          if (!roomMap[rKey]) roomMap[rKey] = [];
          roomMap[rKey].push(entry);
        }
      }

      // Check room type mismatch
      const course = this.ds.getCourseById(entry.courseId);
      const room = this.ds.getRoomById(entry.roomId);
      const batch = this.ds.getBatchById(entry.batchId);

      if (course && room) {
        if (course.isLab && room.type !== "lab") {
          conflicts.push({
            type: "LAB_ROOM_MISMATCH",
            severity: "warning",
            entryId: entry.id,
            message: `Lab course '${course.title}' is assigned to non-lab room '${room.name}'.`,
            details: entry
          });
        }
        if (batch && room.capacity < batch.studentCount) {
          conflicts.push({
            type: "ROOM_CAPACITY_EXCEEDED",
            severity: "warning",
            entryId: entry.id,
            message: `Room '${room.name}' capacity (${room.capacity}) is lower than batch strength (${batch.studentCount}).`,
            details: entry
          });
        }
      }
    });

    // Check Batch Overlaps
    Object.keys(batchMap).forEach(key => {
      const list = batchMap[key];
      if (list.length > 1) {
        const batch = this.ds.getBatchById(list[0].batchId);
        const batchName = batch ? batch.name : list[0].batchId;
        conflicts.push({
          type: "BATCH_DOUBLE_BOOKING",
          severity: "critical",
          message: `Class overlap: '${batchName}' has ${list.length} conflicting classes scheduled at ${key.split("_")[1]} period.`,
          entries: list
        });
      }
    });

    // Check Faculty Overlaps
    Object.keys(facultyMap).forEach(key => {
      const list = facultyMap[key];
      if (list.length > 1) {
        const fac = this.ds.getFacultyById(list[0].facultyId);
        const facName = fac ? fac.name : list[0].facultyId;
        const [facId, day, pId] = key.split("_");
        conflicts.push({
          type: "FACULTY_DOUBLE_BOOKING",
          severity: "critical",
          message: `Instructor clash: ${facName} is assigned to teach multiple classes simultaneously on ${day} (Period ID ${pId}).`,
          entries: list
        });
      }
    });

    // Check Room Overlaps
    Object.keys(roomMap).forEach(key => {
      const list = roomMap[key];
      if (list.length > 1) {
        const room = this.ds.getRoomById(list[0].roomId);
        const roomName = room ? room.name : list[0].roomId;
        const [rId, day, pId] = key.split("_");
        conflicts.push({
          type: "ROOM_DOUBLE_BOOKING",
          severity: "critical",
          message: `Room clash: ${roomName} is double-booked by multiple batches on ${day} (Period ID ${pId}).`,
          entries: list
        });
      }
    });

    return conflicts;
  }

  /**
   * Quick clash check for single slot assignment / manual drag-drop
   */
  checkSinglePlacementClash(proposedEntry, ignoreEntryId = null) {
    const existing = this.ds.getTimetable().filter(e => e.id !== ignoreEntryId);
    const simulated = [...existing, proposedEntry];
    const allConflicts = this.auditSchedule(simulated);
    const relevant = allConflicts.filter(c => {
      if (c.entryId === proposedEntry.id) return true;
      if (c.entries && c.entries.some(e => e.id === proposedEntry.id || (e.courseId === proposedEntry.courseId && e.day === proposedEntry.day))) return true;
      return false;
    });

    return {
      hasClash: relevant.length > 0,
      conflicts: relevant
    };
  }
}

if (typeof globalThis !== "undefined") {
  globalThis.TimetableSolver = TimetableSolver;
}
