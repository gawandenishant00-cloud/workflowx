const express = require('express');
const { notifyManagers } = require('../notifications/notifications.service');
const router = express.Router();
const supabase = require('../../config/supabaseClient');
const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');

// Employee submits a leave request
router.post('/leave-requests', verifyToken, async (req, res) => {
  const { start_date, end_date, reason } = req.body;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date) || end_date < start_date) {
    return res.status(400).json({ error: 'end_date must be a valid date on or after start_date' });
  }

  // 1. Create the leave request
  const { data: leaveRequest, error: leaveError } = await supabase
    .from('leave_requests')
    .insert({
      employee_id: req.user.id,
      start_date,
      end_date,
      reason,
    })
    .select()
    .single();

  if (leaveError) {
    return res.status(500).json({ error: leaveError.message });
  }

  // 2. Create the linked approval request (this is the shared engine piece)
  const { error: approvalError } = await supabase
    .from('approval_requests')
    .insert({
      leave_request_id: leaveRequest.id,
    });

  if (approvalError) {
    return res.status(500).json({ error: approvalError.message });
  }

  // 3. Send a notification
  await notifyManagers(
    'Leave Request Submitted',
    `${req.user.full_name}'s leave request from ${start_date} to ${end_date} is pending approval.`,
    'leave'
  );

  res.status(201).json({ message: 'Leave request submitted', leaveRequest });
});

// Employee views their own leave requests
router.get('/leave-requests/mine', verifyToken, async (req, res) => {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('employee_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Manager/Admin views all leave requests
router.get('/leave-requests', verifyToken, requireRole('manager', 'admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*, profiles(full_name, department)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/employees', verifyToken, requireRole('admin'), async (req, res) => {
  const { data, error } = await supabase.from('profiles').select('id, full_name, role, department, created_at').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Admin creates an employee account and profile
router.post('/employees', verifyToken, requireRole('admin'), async (req, res) => {
  const { email, password, full_name, department, role = 'employee' } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'email, password, and full_name are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }
  if (!['employee', 'manager'].includes(role)) {
    return res.status(400).json({ error: 'role must be employee or manager' });
  }

  const { data: created, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (authError) return res.status(400).json({ error: authError.message });

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: created.user.id, full_name, role, department })
    .select('id, full_name, role, department, created_at')
    .single();

  if (profileError) return res.status(500).json({ error: profileError.message });
  res.status(201).json({ message: `${role} account created`, employee: profile });
});

module.exports = router;