import { Router } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Common Problems
router.get('/problems', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT * FROM common_problems WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get common problems error:', error);
    res.status(500).json({ error: 'Failed to fetch common problems' });
  }
});

router.post('/problems', async (req: AuthRequest, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const result = await query(
      'INSERT INTO common_problems (user_id, name) VALUES ($1, $2) RETURNING *',
      [req.userId, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create common problem error:', error);
    res.status(500).json({ error: 'Failed to create common problem' });
  }
});

router.delete('/problems/:id', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'DELETE FROM common_problems WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Common problem not found' });
    }

    res.json({ message: 'Common problem deleted' });
  } catch (error) {
    console.error('Delete common problem error:', error);
    res.status(500).json({ error: 'Failed to delete common problem' });
  }
});

// Common Comments
router.get('/comments', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT * FROM common_comments WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get common comments error:', error);
    res.status(500).json({ error: 'Failed to fetch common comments' });
  }
});

router.post('/comments', async (req: AuthRequest, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const result = await query(
      'INSERT INTO common_comments (user_id, name) VALUES ($1, $2) RETURNING *',
      [req.userId, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create common comment error:', error);
    res.status(500).json({ error: 'Failed to create common comment' });
  }
});

router.delete('/comments/:id', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'DELETE FROM common_comments WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Common comment not found' });
    }

    res.json({ message: 'Common comment deleted' });
  } catch (error) {
    console.error('Delete common comment error:', error);
    res.status(500).json({ error: 'Failed to delete common comment' });
  }
});

// Common Medications
router.get('/medications', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT * FROM common_medications WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get common medications error:', error);
    res.status(500).json({ error: 'Failed to fetch common medications' });
  }
});

router.post('/medications', async (req: AuthRequest, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const result = await query(
      'INSERT INTO common_medications (user_id, name) VALUES ($1, $2) RETURNING *',
      [req.userId, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create common medication error:', error);
    res.status(500).json({ error: 'Failed to create common medication' });
  }
});

router.delete('/medications/:id', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'DELETE FROM common_medications WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Common medication not found' });
    }

    res.json({ message: 'Common medication deleted' });
  } catch (error) {
    console.error('Delete common medication error:', error);
    res.status(500).json({ error: 'Failed to delete common medication' });
  }
});

export default router;
