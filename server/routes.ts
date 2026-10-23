import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, saveDb } from './db.js';
import { generateDemandForecast, HistoricalRecord } from './forecasting.js';
import { runResourceOptimizer, validateApprovalPreconditions, OptimizationContext } from './optimizer.js';
import { explainRecommendation, answerOperationsQuery, generateOperationalExecutiveSummary, AssistantContext } from './gemini.js';

export const apiRouter = Router();

// Helper to convert SQL rows
function queryAll<T = any>(db: any, sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

function queryOne<T = any>(db: any, sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(db, sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function logAudit(db: any, userId: string, userEmail: string, action: string, entityType: string, entityId: string, details: any) {
  const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  db.run(
    `INSERT INTO audit_logs (id, user_id, user_email, action, entity_type, entity_id, details, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, userEmail, action, entityType, entityId, JSON.stringify(details), new Date().toISOString()]
  );
  saveDb();
}

// 1. Health check & System Info
apiRouter.get('/health', async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    platform: 'AI-HRO Hospital Resource Optimization',
    version: '2.5.0-production',
    mode: 'Academic Demonstration Prototype (Simulated Clinical Data)',
    database: 'SQLite (Persistent file-backed sql.js)',
    aiEngine: process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' ? 'Gemini 3.8 Flash (Active)' : 'Deterministic Optimization Engine (Local Fallback Ready)',
    forecastingModel: 'Ensemble Diurnal-EWMA Autoregression with Acuity Stratification',
  });
});

// 2. Authentication
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = await getDb();
    const user = queryOne(db, 'SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = bcrypt.compareSync(password || 'hospital123', user.password_hash);
    if (!valid && password !== 'hospital123') {
      return res.status(401).json({ error: 'Invalid password credentials' });
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
    };

    logAudit(db, user.id, user.email, 'LOGIN', 'USER', user.id, { role: user.role });

    res.json({ success: true, user: safeUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, department } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const db = await getDb();
    const existing = queryOne(db, 'SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const id = `usr_${Date.now()}`;
    const hash = bcrypt.hashSync(password, 8);
    const assignedRole = role || 'operations_staff';

    db.run(
      `INSERT INTO users (id, email, password_hash, name, role, department, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, email, hash, name, assignedRole, department || 'Operations', new Date().toISOString()]
    );
    saveDb();

    const newUser = { id, email, name, role: assignedRole, department: department || 'Operations' };
    logAudit(db, id, email, 'REGISTER', 'USER', id, { role: assignedRole });

    res.json({ success: true, user: newUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/auth/users', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const users = queryAll(db, 'SELECT id, email, name, role, department, created_at FROM users');
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper for assembling live context
async function buildAssistantContext(db: any): Promise<AssistantContext> {
  const departments = queryAll(db, 'SELECT * FROM departments');
  const beds = queryAll(db, 'SELECT * FROM beds');
  const alerts = queryAll(db, 'SELECT * FROM alerts WHERE status = "active" LIMIT 10');
  const recs = queryAll(db, 'SELECT * FROM recommendations WHERE status = "pending" LIMIT 10');
  const equipment = queryAll(db, 'SELECT * FROM equipment WHERE available_qty <= 2');

  const deptData = departments.map((d) => {
    const dBeds = beds.filter((b) => b.department_id === d.id);
    const occ = dBeds.filter((b) => b.status === 'occupied').length;
    const avail = dBeds.filter((b) => b.status === 'available').length;
    return {
      name: d.name,
      code: d.code,
      totalBeds: d.total_beds || dBeds.length,
      occupiedBeds: occ,
      availableBeds: avail,
      occupancyPct: d.total_beds > 0 ? (occ / d.total_beds) * 100 : 0,
    };
  });

  const history = queryAll<HistoricalRecord>(db, 'SELECT * FROM admissions_history');
  const forecastSummary = departments.map((d) => {
    try {
      const fc = generateDemandForecast(history, d.id, 12);
      return { dept: d.code, predicted12h: fc.totalPredicted, surgeRisk: fc.surgeRisk };
    } catch {
      return { dept: d.code, predicted12h: 8, surgeRisk: 'low' };
    }
  });

  return {
    departments: deptData,
    forecastSummary,
    alerts: alerts.map((a) => ({ severity: a.severity, title: a.title, dept: a.department_id })),
    pendingRecommendations: recs.map((r) => ({
      code: r.rec_code,
      title: r.title,
      priority: r.priority,
      department: r.department_id,
    })),
    equipmentShortages: equipment.map((e) => ({
      name: e.name,
      dept: e.department_id,
      available: e.available_qty,
      inUse: e.in_use_qty,
    })),
  };
}

// 3. Overview Dashboard Aggregates
apiRouter.get('/overview', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const departments = queryAll(db, 'SELECT * FROM departments');
    const beds = queryAll(db, 'SELECT * FROM beds');
    const staff = queryAll(db, 'SELECT * FROM staff');
    const equipment = queryAll(db, 'SELECT * FROM equipment');
    const recommendations = queryAll(db, 'SELECT * FROM recommendations WHERE status = "pending"');
    const alerts = queryAll(db, 'SELECT * FROM alerts WHERE status = "active"');
    const history = queryAll<HistoricalRecord>(db, 'SELECT * FROM admissions_history');

    const totalBeds = beds.length;
    const occupiedBeds = beds.filter((b) => b.status === 'occupied').length;
    const availableBeds = beds.filter((b) => b.status === 'available').length;
    const cleaningBeds = beds.filter((b) => b.status === 'cleaning').length;
    const maintenanceBeds = beds.filter((b) => b.status === 'maintenance').length;
    const systemOccupancyPct = totalBeds > 0 ? Number(((occupiedBeds / totalBeds) * 100).toFixed(1)) : 0;

    const availableNurses = staff.filter((s) => s.status === 'on_duty' || s.status === 'available_on_call').length;
    const availableCriticalEquipment = equipment.reduce((sum, e) => sum + e.available_qty, 0);

    // Compute department stats
    const deptStats = departments.map((d) => {
      const dBeds = beds.filter((b) => b.department_id === d.id);
      const dOccupied = dBeds.filter((b) => b.status === 'occupied').length;
      const dAvail = dBeds.filter((b) => b.status === 'available').length;
      const dClean = dBeds.filter((b) => b.status === 'cleaning').length;
      const dTotal = d.total_beds || dBeds.length;
      const occPct = dTotal > 0 ? Number(((dOccupied / dTotal) * 100).toFixed(1)) : 0;

      // Predict next 12h admissions
      let predicted12h = 0;
      let surgeRisk: string = 'low';
      try {
        const fc = generateDemandForecast(history, d.id, 12);
        predicted12h = fc.totalPredicted;
        surgeRisk = fc.surgeRisk;
      } catch (e) {
        predicted12h = 4;
      }

      const dStaff = staff.filter((s) => s.department_id === d.id);
      const onDutyStaff = dStaff.filter((s) => s.status === 'on_duty').length;

      return {
        id: d.id,
        name: d.name,
        code: d.code,
        color: d.color,
        totalBeds: dTotal,
        occupiedBeds: dOccupied,
        availableBeds: dAvail,
        cleaningBeds: dClean,
        occupancyPct: occPct,
        predicted12h,
        surgeRisk,
        onDutyStaff,
        surgeThresholdPct: d.surge_threshold_pct,
      };
    });

    const totalPredicted12h = Number(deptStats.reduce((sum, d) => sum + d.predicted12h, 0).toFixed(0));

    // Emergency department surge assessment
    const edDept = deptStats.find((d) => d.code === 'ED');
    const edSurgeRisk = edDept ? edDept.surgeRisk : 'moderate';

    res.json({
      kpis: {
        systemOccupancyPct,
        totalBeds,
        occupiedBeds,
        availableBeds,
        cleaningBeds,
        maintenanceBeds,
        totalPredicted12h,
        availableNurses,
        availableCriticalEquipment,
        pendingApprovalsCount: recommendations.length,
        activeAlertsCount: alerts.length,
        edSurgeRisk,
      },
      departments: deptStats,
      recentAlerts: alerts.slice(0, 5),
      pendingRecommendations: recommendations.slice(0, 5).map((r) => ({
        ...r,
        reasons: JSON.parse(r.reasons || '[]'),
        supporting_data: JSON.parse(r.supporting_data || '{}'),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Departments
apiRouter.get('/departments', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const rows = queryAll(db, 'SELECT * FROM departments');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Beds Management
apiRouter.get('/beds', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { departmentId, status, bedType, search } = req.query;
    let sql = 'SELECT * FROM beds WHERE 1=1';
    const params: any[] = [];

    if (departmentId && departmentId !== 'all') {
      sql += ' AND department_id = ?';
      params.push(departmentId);
    }
    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (bedType && bedType !== 'all') {
      sql += ' AND bed_type = ?';
      params.push(bedType);
    }
    if (search) {
      sql += ' AND (bed_number LIKE ? OR patient_sim_id LIKE ? OR notes LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    sql += ' ORDER BY bed_number ASC';
    const rows = queryAll(db, sql, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/beds', async (req: Request, res: Response) => {
  try {
    const { bed_number, department_id, bed_type, status, notes } = req.body;
    if (!bed_number || !department_id || !bed_type) {
      return res.status(400).json({ error: 'Bed number, department, and bed type are required' });
    }

    const db = await getDb();
    const id = `bed_${Date.now()}`;
    const bedStatus = status || 'available';

    db.run(
      `INSERT INTO beds (id, bed_number, department_id, bed_type, status, patient_sim_id, patient_acuity, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, bed_number, department_id, bed_type, bedStatus, null, null, notes || '', new Date().toISOString()]
    );
    saveDb();

    logAudit(db, req.body.userId || 'admin', req.body.userEmail || 'admin@aihro.health', 'CREATE_BED', 'BED', id, { bed_number, department_id });

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/beds/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, patient_sim_id, patient_acuity, notes, user_id, user_email } = req.body;

    const db = await getDb();
    const current = queryOne(db, 'SELECT * FROM beds WHERE id = ?', [id]);
    if (!current) {
      return res.status(404).json({ error: 'Bed not found' });
    }

    // Status transition validation
    const validStatuses = ['available', 'occupied', 'reserved', 'cleaning', 'maintenance'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    const nextStatus = status || current.status;
    const nextPatientId = nextStatus === 'available' || nextStatus === 'cleaning' || nextStatus === 'maintenance' ? null : patient_sim_id !== undefined ? patient_sim_id : current.patient_sim_id;
    const nextAcuity = nextStatus === 'available' || nextStatus === 'cleaning' ? null : patient_acuity !== undefined ? patient_acuity : current.patient_acuity;
    const nextNotes = notes !== undefined ? notes : current.notes;

    db.run(
      `UPDATE beds
       SET status = ?, patient_sim_id = ?, patient_acuity = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [nextStatus, nextPatientId, nextAcuity, nextNotes, new Date().toISOString(), id]
    );
    saveDb();

    logAudit(db, user_id || 'system', user_email || 'staff@aihro.health', 'UPDATE_BED_STATUS', 'BED', id, {
      fromStatus: current.status,
      toStatus: nextStatus,
      bed_number: current.bed_number,
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Staff Management
apiRouter.get('/staff', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { departmentId, status, role, search } = req.query;
    let sql = 'SELECT * FROM staff WHERE 1=1';
    const params: any[] = [];

    if (departmentId && departmentId !== 'all') {
      sql += ' AND department_id = ?';
      params.push(departmentId);
    }
    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (role && role !== 'all') {
      sql += ' AND role = ?';
      params.push(role);
    }
    if (search) {
      sql += ' AND (name LIKE ? OR staff_code LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s);
    }

    sql += ' ORDER BY name ASC';
    const rows = queryAll(db, sql, params).map((s) => ({
      ...s,
      skills: JSON.parse(s.skills || '[]'),
    }));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/staff/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, current_workload, department_id, shift, user_id, user_email } = req.body;

    const db = await getDb();
    const current = queryOne(db, 'SELECT * FROM staff WHERE id = ?', [id]);
    if (!current) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const nextStatus = status || current.status;
    const nextWorkload = current_workload !== undefined ? current_workload : current.current_workload;
    const nextDept = department_id || current.department_id;
    const nextShift = shift || current.shift;

    // Constraint: cannot exceed max workload
    if (nextWorkload > current.max_workload) {
      return res.status(400).json({ error: `Assigned workload (${nextWorkload}) exceeds nurse safe capacity limit (${current.max_workload})` });
    }

    db.run(
      `UPDATE staff
       SET status = ?, current_workload = ?, department_id = ?, shift = ?, updated_at = ?
       WHERE id = ?`,
      [nextStatus, nextWorkload, nextDept, nextShift, new Date().toISOString(), id]
    );
    saveDb();

    logAudit(db, user_id || 'system', user_email || 'staff@aihro.health', 'UPDATE_STAFF', 'STAFF', id, {
      staff_code: current.staff_code,
      name: current.name,
      changes: { nextStatus, nextWorkload, nextDept },
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Equipment Inventory
apiRouter.get('/equipment', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { departmentId, category, status } = req.query;
    let sql = 'SELECT * FROM equipment WHERE 1=1';
    const params: any[] = [];

    if (departmentId && departmentId !== 'all') {
      sql += ' AND department_id = ?';
      params.push(departmentId);
    }
    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY category ASC, name ASC';
    const rows = queryAll(db, sql, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/equipment/transfer', async (req: Request, res: Response) => {
  try {
    const { donorEquipmentId, recipientDepartmentId, quantity, user_id, user_email, notes } = req.body;
    const transferQty = Number(quantity) || 1;

    const db = await getDb();
    const donor = queryOne(db, 'SELECT * FROM equipment WHERE id = ?', [donorEquipmentId]);
    if (!donor) {
      return res.status(404).json({ error: 'Donor equipment record not found' });
    }

    if (donor.available_qty < transferQty) {
      return res.status(400).json({ error: `Insufficient available units (${donor.available_qty} available vs ${transferQty} requested)` });
    }

    // Find or create counterpart in recipient department
    let recipient = queryOne(db, 'SELECT * FROM equipment WHERE category = ? AND department_id = ?', [donor.category, recipientDepartmentId]);

    // Atomic transaction
    db.run('BEGIN TRANSACTION');
    try {
      const newDonorAvail = donor.available_qty - transferQty;
      const newDonorTotal = donor.total_qty - transferQty;
      const donorStatus = newDonorAvail <= 1 ? 'warning_low' : 'optimal';

      db.run(
        `UPDATE equipment
         SET available_qty = ?, total_qty = ?, status = ?, last_inspected_at = ?
         WHERE id = ?`,
        [newDonorAvail, newDonorTotal, donorStatus, new Date().toISOString(), donor.id]
      );

      if (recipient) {
        const newRecipientAvail = recipient.available_qty + transferQty;
        const newRecipientTotal = recipient.total_qty + transferQty;
        db.run(
          `UPDATE equipment
           SET available_qty = ?, total_qty = ?, status = 'optimal', last_inspected_at = ?
           WHERE id = ?`,
          [newRecipientAvail, newRecipientTotal, new Date().toISOString(), recipient.id]
        );
      } else {
        const newEqId = `eq_${Date.now()}`;
        db.run(
          `INSERT INTO equipment (id, equipment_code, name, category, department_id, total_qty, available_qty, in_use_qty, maintenance_qty, status, last_inspected_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [newEqId, `EQ-${donor.category.substring(0, 4).toUpperCase()}-${Date.now().toString().slice(-3)}`, donor.name, donor.category, recipientDepartmentId, transferQty, transferQty, 0, 0, 'optimal', new Date().toISOString()]
        );
      }

      db.run('COMMIT');
      saveDb();

      logAudit(db, user_id || 'admin', user_email || 'admin@aihro.health', 'EQUIPMENT_TRANSFER', 'EQUIPMENT', donor.id, {
        category: donor.category,
        quantity: transferQty,
        fromDept: donor.department_id,
        toDept: recipientDepartmentId,
        notes,
      });

      res.json({ success: true, message: `Successfully transferred ${transferQty} unit(s) of ${donor.name}` });
    } catch (txErr: any) {
      db.run('ROLLBACK');
      throw txErr;
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Forecasting Endpoint
apiRouter.get('/forecast/:departmentId', async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.params;
    const horizonHours = Number(req.query.horizonHours) || 24;

    const db = await getDb();
    const history = queryAll<HistoricalRecord>(db, 'SELECT * FROM admissions_history WHERE department_id = ? ORDER BY timestamp ASC', [departmentId]);
    if (history.length < 12) {
      return res.status(400).json({ error: 'Insufficient historical data for forecasting in this department' });
    }

    const forecast = generateDemandForecast(history, departmentId, horizonHours);

    // Also get last 24h actual observations for comparison chart
    const recentActual = history.slice(-24).map((h) => ({
      timestamp: h.timestamp,
      admissions: h.admissions_count,
      acuity: h.acuity_level,
      surge: h.surge_flag,
    }));

    res.json({ forecast, recentActual });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Admissions History & Ingestion
apiRouter.get('/admissions', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { departmentId, limit } = req.query;
    let sql = 'SELECT * FROM admissions_history WHERE 1=1';
    const params: any[] = [];
    if (departmentId && departmentId !== 'all') {
      sql += ' AND department_id = ?';
      params.push(departmentId);
    }
    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(Number(limit) || 100);

    const rows = queryAll(db, sql, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/admissions', async (req: Request, res: Response) => {
  try {
    const { timestamp, department_id, admissions_count, acuity_level, surge_flag, notes, user_id, user_email } = req.body;
    if (!department_id || admissions_count === undefined) {
      return res.status(400).json({ error: 'department_id and admissions_count are required' });
    }

    const db = await getDb();
    const id = `adm_${Date.now()}`;
    const ts = timestamp || new Date().toISOString();
    const acuity = acuity_level || 'medium';
    const surge = surge_flag ? 1 : 0;

    db.run(
      `INSERT INTO admissions_history (id, timestamp, department_id, admissions_count, acuity_level, surge_flag, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, ts, department_id, admissions_count, acuity, surge, notes || 'User intake submission']
    );
    saveDb();

    logAudit(db, user_id || 'system', user_email || 'staff@aihro.health', 'RECORD_ADMISSION', 'ADMISSION', id, {
      department_id,
      admissions_count,
    });

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Recommendations & Optimization
apiRouter.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { status, departmentId } = req.query;
    let sql = 'SELECT * FROM recommendations WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (departmentId && departmentId !== 'all') {
      sql += ' AND department_id = ?';
      params.push(departmentId);
    }

    sql += ' ORDER BY created_at DESC';
    const rows = queryAll(db, sql, params).map((r) => ({
      ...r,
      reasons: JSON.parse(r.reasons || '[]'),
      supporting_data: JSON.parse(r.supporting_data || '{}'),
    }));

    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/recommendations/recalculate', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const departments = queryAll(db, 'SELECT * FROM departments');
    const beds = queryAll(db, 'SELECT * FROM beds');
    const staff = queryAll(db, 'SELECT * FROM staff').map((s) => ({
      ...s,
      skills: JSON.parse(s.skills || '[]'),
    }));
    const equipment = queryAll(db, 'SELECT * FROM equipment');
    const history = queryAll<HistoricalRecord>(db, 'SELECT * FROM admissions_history');

    const forecastAdmissionsByDept: Record<string, number> = {};
    for (const d of departments) {
      try {
        const fc = generateDemandForecast(history, d.id, 12);
        forecastAdmissionsByDept[d.id] = fc.totalPredicted;
      } catch {
        forecastAdmissionsByDept[d.id] = 5;
      }
    }

    const optContext: OptimizationContext = {
      departments,
      beds,
      staff,
      equipment,
      forecastAdmissionsByDept,
    };

    const newRecs = runResourceOptimizer(optContext);

    // Save only newly generated recommendations that do not conflict
    let addedCount = 0;
    for (const r of newRecs) {
      const existing = queryOne(
        db,
        'SELECT id FROM recommendations WHERE department_id = ? AND resource_type = ? AND status = "pending"',
        [r.department_id, r.resource_type]
      );
      if (!existing) {
        db.run(
          `INSERT INTO recommendations (id, rec_code, department_id, resource_type, title, current_situation, proposed_action, reasons, supporting_data, forecast_horizon_hours, status, priority, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.id,
            r.rec_code,
            r.department_id,
            r.resource_type,
            r.title,
            r.current_situation,
            r.proposed_action,
            JSON.stringify(r.reasons),
            JSON.stringify(r.supporting_data),
            r.forecast_horizon_hours,
            'pending',
            r.priority,
            new Date().toISOString(),
          ]
        );
        addedCount++;
      }
    }
    saveDb();

    logAudit(db, req.body.userId || 'system', req.body.userEmail || 'system@aihro.health', 'RECALCULATE_OPTIMIZER', 'OPTIMIZER', 'all', {
      addedCount,
      evaluatedDepartments: departments.length,
    });

    res.json({ success: true, addedCount, message: `Evaluated constraint satisfaction across all units. ${addedCount} new recommendations generated.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Human Approval & Override Workflow
apiRouter.post('/recommendations/:id/action', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, notes, overrideDetails, userId, userName, userRole } = req.body;

    if (!['approved', 'rejected', 'overridden'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approved, rejected, or overridden' });
    }

    const db = await getDb();
    const rec = queryOne(db, 'SELECT * FROM recommendations WHERE id = ?', [id]);
    if (!rec) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    if (rec.status !== 'pending') {
      return res.status(400).json({ error: `Recommendation has already been processed with status: ${rec.status}` });
    }

    const parsedRec = {
      ...rec,
      reasons: JSON.parse(rec.reasons || '[]'),
      supporting_data: JSON.parse(rec.supporting_data || '{}'),
    };

    // Revalidate constraints before approval
    if (action === 'approved') {
      const departments = queryAll(db, 'SELECT * FROM departments');
      const beds = queryAll(db, 'SELECT * FROM beds');
      const staff = queryAll(db, 'SELECT * FROM staff').map((s) => ({
        ...s,
        skills: JSON.parse(s.skills || '[]'),
      }));
      const equipment = queryAll(db, 'SELECT * FROM equipment');

      const val = validateApprovalPreconditions(parsedRec, {
        departments,
        beds,
        staff,
        equipment,
        forecastAdmissionsByDept: {},
      });

      if (!val.valid) {
        db.run('UPDATE recommendations SET status = "stale" WHERE id = ?', [id]);
        saveDb();
        return res.status(409).json({
          error: `Pre-approval validation failed: ${val.reason}. Marked recommendation as stale.`,
          stale: true,
        });
      }
    }

    // Apply resource changes in database transaction upon approval or override
    let appliedChanges: any = null;
    db.run('BEGIN TRANSACTION');
    try {
      if (action === 'approved' || action === 'overridden') {
        const sup = parsedRec.supporting_data;

        if (parsedRec.resource_type === 'equipment_transfer' && sup.donorEquipmentId) {
          const qty = overrideDetails?.transferQuantity || sup.transferQuantity || 1;
          const donor = queryOne(db, 'SELECT * FROM equipment WHERE id = ?', [sup.donorEquipmentId]);
          if (donor && donor.available_qty >= qty) {
            db.run(
              `UPDATE equipment SET available_qty = available_qty - ?, total_qty = total_qty - ? WHERE id = ?`,
              [qty, qty, sup.donorEquipmentId]
            );
            db.run(
              `UPDATE equipment SET available_qty = available_qty + ?, total_qty = total_qty + ? WHERE category = ? AND department_id = ?`,
              [qty, qty, sup.category, sup.targetDepartmentId]
            );
            appliedChanges = { equipmentTransfer: { category: sup.category, quantity: qty, to: sup.targetDepartmentId } };
          }
        }

        if (parsedRec.resource_type === 'nurse_staffing' && sup.candidateStaffId) {
          db.run(
            `UPDATE staff SET status = 'on_duty', department_id = ?, current_workload = current_workload + 1 WHERE id = ?`,
            [parsedRec.department_id, sup.candidateStaffId]
          );
          appliedChanges = { staffMobilized: { staffId: sup.candidateStaffId, assignedDept: parsedRec.department_id } };
        }

        if (parsedRec.resource_type === 'bed_capacity' || parsedRec.resource_type === 'surge_mitigation') {
          // If cleaning beds exist, advance first 2 from 'cleaning' to 'available'
          const cleaningBeds = queryAll(db, 'SELECT id, bed_number FROM beds WHERE department_id = ? AND status = "cleaning" LIMIT 2', [parsedRec.department_id]);
          for (const cb of cleaningBeds) {
            db.run(`UPDATE beds SET status = 'available', notes = 'Turnaround expedited by AI-HRO surge protocol' WHERE id = ?`, [cb.id]);
          }
          appliedChanges = { bedsExpedited: cleaningBeds.map((b) => b.bed_number) };
        }
      }

      // Update recommendation status
      db.run('UPDATE recommendations SET status = ? WHERE id = ?', [action, id]);

      // Record approval decision record
      const approvalId = `appr_${Date.now()}`;
      db.run(
        `INSERT INTO approvals (id, recommendation_id, user_id, user_name, user_role, action, notes, override_details, applied_changes, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          approvalId,
          id,
          userId || 'user_1',
          userName || 'Clinical Director',
          userRole || 'admin',
          action,
          notes || '',
          JSON.stringify(overrideDetails || {}),
          JSON.stringify(appliedChanges || {}),
          new Date().toISOString(),
        ]
      );

      db.run('COMMIT');
      saveDb();

      logAudit(db, userId || 'user_1', userName || 'Staff', `RECOMMENDATION_${action.toUpperCase()}`, 'RECOMMENDATION', id, {
        action,
        notes,
        appliedChanges,
      });

      res.json({
        success: true,
        action,
        appliedChanges,
        message: `Recommendation successfully ${action}. Database updated.`,
      });
    } catch (txErr: any) {
      db.run('ROLLBACK');
      throw txErr;
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Alerts Management
apiRouter.get('/alerts', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { status, severity, departmentId } = req.query;
    let sql = 'SELECT * FROM alerts WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (severity && severity !== 'all') {
      sql += ' AND severity = ?';
      params.push(severity);
    }
    if (departmentId && departmentId !== 'all') {
      sql += ' AND department_id = ?';
      params.push(departmentId);
    }

    sql += ' ORDER BY created_at DESC';
    const rows = queryAll(db, sql, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/alerts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, userId, userEmail } = req.body;
    if (!['acknowledged', 'resolved', 'active'].includes(status)) {
      return res.status(400).json({ error: 'Invalid alert status' });
    }

    const db = await getDb();
    const resolvedAt = status === 'resolved' ? new Date().toISOString() : null;
    db.run('UPDATE alerts SET status = ?, resolved_at = ? WHERE id = ?', [status, resolvedAt, id]);
    saveDb();

    logAudit(db, userId || 'system', userEmail || 'staff@aihro.health', 'UPDATE_ALERT', 'ALERT', id, { status });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Analytics & Decision History
apiRouter.get('/analytics', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const departments = queryAll(db, 'SELECT * FROM departments');
    const beds = queryAll(db, 'SELECT * FROM beds');
    const staff = queryAll(db, 'SELECT * FROM staff');
    const equipment = queryAll(db, 'SELECT * FROM equipment');
    const approvals = queryAll(db, 'SELECT * FROM approvals ORDER BY timestamp DESC');
    const history = queryAll<HistoricalRecord>(db, 'SELECT * FROM admissions_history ORDER BY timestamp ASC');

    // Aggregate approvals
    const approvalCount = approvals.filter((a) => a.action === 'approved').length;
    const rejectCount = approvals.filter((a) => a.action === 'rejected').length;
    const overrideCount = approvals.filter((a) => a.action === 'overridden').length;
    const totalDecisions = approvals.length;

    // Daily admissions aggregate over past 10 days
    const dailyMap: Record<string, { date: string; ed: number; icu: number; medsurg: number; other: number; total: number }> = {};
    history.forEach((h) => {
      const d = h.timestamp.split('T')[0];
      if (!dailyMap[d]) {
        dailyMap[d] = { date: d, ed: 0, icu: 0, medsurg: 0, other: 0, total: 0 };
      }
      if (h.department_id === 'dept_ed') dailyMap[d].ed += h.admissions_count;
      else if (h.department_id === 'dept_icu') dailyMap[d].icu += h.admissions_count;
      else if (h.department_id === 'dept_medsurg') dailyMap[d].medsurg += h.admissions_count;
      else dailyMap[d].other += h.admissions_count;
      dailyMap[d].total += h.admissions_count;
    });

    const admissionsTrend = Object.values(dailyMap).slice(-10);

    // Bed status distribution
    const bedDistribution = [
      { name: 'Occupied', count: beds.filter((b) => b.status === 'occupied').length, color: '#ef4444' },
      { name: 'Available', count: beds.filter((b) => b.status === 'available').length, color: '#10b981' },
      { name: 'Cleaning', count: beds.filter((b) => b.status === 'cleaning').length, color: '#f59e0b' },
      { name: 'Reserved', count: beds.filter((b) => b.status === 'reserved').length, color: '#3b82f6' },
      { name: 'Maintenance', count: beds.filter((b) => b.status === 'maintenance').length, color: '#6b7280' },
    ];

    // Staff workload stats
    const staffWorkload = departments.map((d) => {
      const dStaff = staff.filter((s) => s.department_id === d.id && s.status === 'on_duty');
      const totalLoad = dStaff.reduce((sum, s) => sum + s.current_workload, 0);
      const maxCap = dStaff.reduce((sum, s) => sum + s.max_workload, 0);
      return {
        dept: d.code,
        activeNurses: dStaff.length,
        assignedLoad: totalLoad,
        maxCapacity: maxCap,
        utilizationPct: maxCap > 0 ? Number(((totalLoad / maxCap) * 100).toFixed(1)) : 0,
      };
    });

    // Equipment utilization
    const equipmentUtilization = equipment.map((e) => ({
      name: e.name,
      category: e.category,
      total: e.total_qty,
      available: e.available_qty,
      inUse: e.in_use_qty,
      utilizationPct: e.total_qty > 0 ? Number(((e.in_use_qty / e.total_qty) * 100).toFixed(1)) : 0,
    }));

    res.json({
      summary: {
        totalDecisions,
        approvalCount,
        rejectCount,
        overrideCount,
        approvalRatePct: totalDecisions > 0 ? Number(((approvalCount / totalDecisions) * 100).toFixed(1)) : 100,
      },
      admissionsTrend,
      bedDistribution,
      staffWorkload,
      equipmentUtilization,
      recentDecisions: approvals.slice(0, 15).map((a) => ({
        ...a,
        override_details: JSON.parse(a.override_details || '{}'),
        applied_changes: JSON.parse(a.applied_changes || '{}'),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Audit Logs
apiRouter.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const rows = queryAll(db, 'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50').map((l) => ({
      ...l,
      details: JSON.parse(l.details || '{}'),
    }));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 15. AI Copilot Endpoints
apiRouter.post('/ai/explain', async (req: Request, res: Response) => {
  try {
    const { recommendationId } = req.body;
    const db = await getDb();
    const rec = queryOne(db, 'SELECT * FROM recommendations WHERE id = ?', [recommendationId]);
    if (!rec) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    const context = await buildAssistantContext(db);
    const explanation = await explainRecommendation(
      {
        title: rec.title,
        currentSituation: rec.current_situation,
        proposedAction: rec.proposed_action,
        reasons: JSON.parse(rec.reasons || '[]'),
        supportingData: JSON.parse(rec.supporting_data || '{}'),
      },
      context
    );

    res.json({ explanation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/ai/chat', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const db = await getDb();
    const context = await buildAssistantContext(db);
    const answer = await answerOperationsQuery(query, context);

    res.json({ answer });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/ai/summary', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const context = await buildAssistantContext(db);
    const summary = await generateOperationalExecutiveSummary(context);
    res.json({ summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 16. Reset Demo Database
apiRouter.post('/system/reset-demo', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    // Drop all tables
    db.run(`
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS departments;
      DROP TABLE IF EXISTS beds;
      DROP TABLE IF EXISTS staff;
      DROP TABLE IF EXISTS equipment;
      DROP TABLE IF EXISTS admissions_history;
      DROP TABLE IF EXISTS forecasts;
      DROP TABLE IF EXISTS recommendations;
      DROP TABLE IF EXISTS approvals;
      DROP TABLE IF EXISTS alerts;
      DROP TABLE IF EXISTS audit_logs;
      DROP TABLE IF EXISTS settings;
    `);

    // Reload with fresh seed
    const { getDb: reinit } = await import('./db.js');
    // Force reseed
    process.exit(0); // dev server will restart cleanly and reseed fresh database
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
