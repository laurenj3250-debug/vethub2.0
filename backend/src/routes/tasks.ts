import { Router } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Create task for a patient
router.post('/patients/:patientId/tasks', async (req: AuthRequest, res) => {
  const { patientId } = req.params;
  const { name, completed = false, date } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Task name is required' });
  }

  try {
    // Verify patient belongs to user
    const patientCheck = await query(
      'SELECT id FROM patients WHERE id = $1 AND user_id = $2',
      [patientId, req.userId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const result = await query(
      'INSERT INTO tasks (patient_id, name, completed, date) VALUES ($1, $2, $3, $4) RETURNING *',
      [patientId, name, completed, date || new Date().toISOString().split('T')[0]]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.patch('/patients/:patientId/tasks/:taskId', async (req: AuthRequest, res) => {
  const { patientId, taskId } = req.params;
  const { name, completed, date } = req.body;

  try {
    // Verify patient belongs to user
    const patientCheck = await query(
      'SELECT id FROM patients WHERE id = $1 AND user_id = $2',
      [patientId, req.userId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (completed !== undefined) {
      updates.push(`completed = $${paramCount++}`);
      values.push(completed);
    }
    if (date !== undefined) {
      updates.push(`date = $${paramCount++}`);
      values.push(date);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(taskId, patientId);

    const result = await query(
      `UPDATE tasks
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount} AND patient_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/patients/:patientId/tasks/:taskId', async (req: AuthRequest, res) => {
  const { patientId, taskId } = req.params;

  try {
    // Verify patient belongs to user
    const patientCheck = await query(
      'SELECT id FROM patients WHERE id = $1 AND user_id = $2',
      [patientId, req.userId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const result = await query(
      'DELETE FROM tasks WHERE id = $1 AND patient_id = $2 RETURNING id',
      [taskId, patientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// General tasks (not tied to patients)
router.get('/general', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT * FROM general_tasks WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get general tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch general tasks' });
  }
});

router.post('/general', async (req: AuthRequest, res) => {
  const { name, category = 'Morning', priority = 'Medium' } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Task name is required' });
  }

  try {
    const result = await query(
      'INSERT INTO general_tasks (user_id, name, category, priority) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.userId, name, category, priority]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create general task error:', error);
    res.status(500).json({ error: 'Failed to create general task' });
  }
});

router.patch('/general/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { completed, completed_date } = req.body;

  try {
    const result = await query(
      'UPDATE general_tasks SET completed = $1, completed_date = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *',
      [completed, completed_date, id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'General task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update general task error:', error);
    res.status(500).json({ error: 'Failed to update general task' });
  }
});

router.delete('/general/:id', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'DELETE FROM general_tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'General task not found' });
    }

    res.json({ message: 'General task deleted' });
  } catch (error) {
    console.error('Delete general task error:', error);
    res.status(500).json({ error: 'Failed to delete general task' });
  }
});

export default router;
