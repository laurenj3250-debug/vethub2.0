import { Router } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all patients for user
router.get('/', async (req: AuthRequest, res) => {
  try {
    const patients = await query(
      `SELECT p.*,
        json_agg(
          json_build_object(
            'id', t.id,
            'name', t.name,
            'completed', t.completed,
            'date', t.date
          ) ORDER BY t.completed ASC, t.created_at DESC
        ) FILTER (WHERE t.id IS NOT NULL) as tasks
      FROM patients p
      LEFT JOIN tasks t ON p.id = t.patient_id
      WHERE p.user_id = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC`,
      [req.userId]
    );

    res.json(patients.rows);
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Get single patient
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const patient = await query(
      `SELECT p.*,
        json_agg(
          json_build_object(
            'id', t.id,
            'name', t.name,
            'completed', t.completed,
            'date', t.date
          ) ORDER BY t.completed ASC, t.created_at DESC
        ) FILTER (WHERE t.id IS NOT NULL) as tasks
      FROM patients p
      LEFT JOIN tasks t ON p.id = t.patient_id
      WHERE p.id = $1 AND p.user_id = $2
      GROUP BY p.id`,
      [req.params.id, req.userId]
    );

    if (patient.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient.rows[0]);
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// Create patient
router.post('/', async (req: AuthRequest, res) => {
  const {
    name,
    type = 'Admit',
    status = 'New Admit',
    added_time,
    patient_info = {},
    rounding_data = {},
    mri_data = {},
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const result = await query(
      `INSERT INTO patients
        (user_id, name, type, status, added_time, patient_info, rounding_data, mri_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [req.userId, name, type, status, added_time, patient_info, rounding_data, mri_data]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

// Update patient
router.patch('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Build dynamic update query
  const allowedFields = [
    'name',
    'type',
    'status',
    'added_time',
    'patient_info',
    'rounding_data',
    'mri_data',
  ];

  const fields = Object.keys(updates).filter((key) => allowedFields.includes(key));

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const setClause = fields.map((field, idx) => `${field} = $${idx + 3}`).join(', ');
  const values = fields.map((field) => updates[field]);

  try {
    const result = await query(
      `UPDATE patients
       SET ${setClause}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.userId, ...values]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// Delete patient
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'DELETE FROM patients WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json({ message: 'Patient deleted' });
  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

export default router;
