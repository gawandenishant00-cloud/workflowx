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
    .select('id, employee_id, start_date, end_date, reason, status, created_at, profiles!leave_requests_employee_id_fkey(full_name, department)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/employees', verifyToken, requireRole('admin'), async (req, res) => {
  const { data, error } = await supabase.from('profiles').select('id, full_name, role, department, employment_status, created_at').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/employee-assets', verifyToken, requireRole('admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('purchase_requests')
    .select('id, item_description, amount, status, asset_status, returned_at, created_at, profiles!purchase_requests_requester_id_fkey(full_name, department)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/employees/me/return-asset', verifyToken, async (req, res) => {
  const { purchase_request_id } = req.body;
  if (!purchase_request_id) return res.status(400).json({ error: 'purchase_request_id is required' });
  const { data, error } = await supabase
    .from('purchase_requests')
    .update({ asset_status: 'returned', returned_at: new Date().toISOString() })
    .eq('id', purchase_request_id)
    .eq('requester_id', req.user.id)
    .eq('status', 'approved')
    .eq('asset_status', 'assigned')
    .select('id, item_description, asset_status, returned_at')
    .single();
  if (error || !data) return res.status(404).json({ error: 'Assigned item not found or already returned' });
  res.json({ message: 'Item returned to company', item: data });
});

router.patch('/employees/me/leave-company', verifyToken, async (req, res) => {
  const { data: returnedAssets, error: assetError } = await supabase
    .from('purchase_requests')
    .update({ asset_status: 'returned', returned_at: new Date().toISOString() })
    .eq('requester_id', req.user.id)
    .eq('status', 'approved')
    .eq('asset_status', 'assigned')
    .select('id, item_description');
  if (assetError) return res.status(500).json({ error: assetError.message });
  const { error: profileError } = await supabase.from('profiles').update({ employment_status: 'offboarded' }).eq('id', req.user.id);
  if (profileError) return res.status(500).json({ error: profileError.message });
  res.json({ message: 'Company exit recorded', returned_assets: returnedAssets || [] });
});

router.delete('/leave-requests/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { data: request, error: lookupError } = await supabase.from('leave_requests').select('id, status').eq('id', req.params.id).single();
  if (lookupError || !request) return res.status(404).json({ error: 'Leave request not found' });
  if (request.status === 'pending') return res.status(409).json({ error: 'Pending requests cannot be deleted' });
  const { error: approvalError } = await supabase.from('approval_requests').delete().eq('leave_request_id', request.id);
  if (approvalError) return res.status(500).json({ error: approvalError.message });
  const { error } = await supabase.from('leave_requests').delete().eq('id', request.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Leave request deleted' });
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

router.delete('/employees/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own admin account' });

  const [{ data: leaves, error: leaveLookupError }, { data: purchases, error: purchaseLookupError }] = await Promise.all([
    supabase.from('leave_requests').select('id').eq('employee_id', id),
    supabase.from('purchase_requests').select('id').eq('requester_id', id),
  ]);
  if (leaveLookupError || purchaseLookupError) return res.status(500).json({ error: 'Unable to find employee requests' });

  const leaveIds = (leaves || []).map((item) => item.id);
  const purchaseIds = (purchases || []).map((item) => item.id);
  if (leaveIds.length) await supabase.from('approval_requests').delete().in('leave_request_id', leaveIds);
  if (purchaseIds.length) await supabase.from('approval_requests').delete().in('purchase_request_id', purchaseIds);
  if (leaveIds.length) await supabase.from('leave_requests').delete().in('id', leaveIds);
  if (purchaseIds.length) await supabase.from('purchase_requests').delete().in('id', purchaseIds);
  await supabase.from('notifications').delete().eq('user_id', id);
  const { error: profileError } = await supabase.from('profiles').delete().eq('id', id);
  if (profileError) return res.status(500).json({ error: profileError.message });
  const { error: authError } = await supabase.auth.admin.deleteUser(id);
  if (authError) return res.status(500).json({ error: authError.message });
  res.json({ message: 'Account deleted' });
});

module.exports = router;