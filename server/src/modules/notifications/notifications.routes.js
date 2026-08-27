const express = require('express');
const router = express.Router();
const supabase = require('../../config/supabaseClient');
const verifyToken = require('../../middleware/verifyToken');

// Get my notifications
router.get('/', verifyToken, async (req, res) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get unread count (for the bell badge)
router.get('/unread-count', verifyToken, async (req, res) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', req.user.id)
    .eq('is_read', false);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ count });
});

// Mark one as read
router.patch('/:id/read', verifyToken, async (req, res) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Marked as read' });
});

module.exports = router;