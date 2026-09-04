const express = require('express');
const router = express.Router();
const supabase = require('../../config/supabaseClient');
const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');
const { createNotification } = require('../notifications/notifications.service');

// Manager/Admin views all pending approvals (both types, combined)
router.get('/pending', verifyToken, requireRole('manager', 'admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('approval_requests')
    .select(`
      id,
      status,
      comment,
      created_at,
      leave_requests (id, start_date, end_date, reason, employee_id, profiles(full_name)),
      purchase_requests (id, item_description, amount, requester_id, profiles(full_name), vendors(name))
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Manager/Admin approves or rejects a request
router.patch('/:id', verifyToken, requireRole('manager', 'admin'), async (req, res) => {
  const { id } = req.params;
  const { decision, comment } = req.body;

  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be "approved" or "rejected"' });
  }

  const { data: approval, error: fetchError } = await supabase
    .from('approval_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !approval) {
    return res.status(404).json({ error: 'Approval request not found' });
  }

  if (approval.status !== 'pending') {
    return res.status(409).json({ error: 'This approval has already been decided' });
  }

  const { error: updateError } = await supabase
    .from('approval_requests')
    .update({
      status: decision,
      comment,
      approver_id: req.user.id,
      decided_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) return res.status(500).json({ error: updateError.message });

  // Sync status on the original request AND collect the requester's id for the notification
  let requesterId = null;
  let notifTitle = '';

  if (approval.leave_request_id) {
    const { data: leave } = await supabase
      .from('leave_requests')
      .update({ status: decision })
      .eq('id', approval.leave_request_id)
      .select()
      .single();
    requesterId = leave?.employee_id;
    notifTitle = 'Leave Request ' + (decision === 'approved' ? 'Approved' : 'Rejected');
  } else if (approval.purchase_request_id) {
    const { data: purchase } = await supabase
      .from('purchase_requests')
      .update({ status: decision, asset_status: decision === 'approved' ? 'assigned' : 'not_applicable' })
      .eq('id', approval.purchase_request_id)
      .select()
      .single();
    requesterId = purchase?.requester_id;
    notifTitle = 'Purchase Request ' + (decision === 'approved' ? 'Approved' : 'Rejected');
  }

  if (requesterId) {
    await createNotification(
      requesterId,
      notifTitle,
      comment ? `Decision: ${decision}. Comment: ${comment}` : `Your request has been ${decision}.`,
      'approval'
    );
  }

  res.json({ message: `Request ${decision}` });
});

module.exports = router;