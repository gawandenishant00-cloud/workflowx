const express = require('express');
const router = express.Router();
const supabase = require('../../config/supabaseClient');
const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');
const { notifyManagers } = require('../notifications/notifications.service');

// Admin adds a vendor
router.post('/vendors', verifyToken, requireRole('admin'), async (req, res) => {
  const { name, contact_email, category } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const { data, error } = await supabase
    .from('vendors')
    .insert({ name, contact_email, category })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ message: 'Vendor added', vendor: data });
});

router.delete('/vendors/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { error: detachError } = await supabase.from('purchase_requests').update({ vendor_id: null }).eq('vendor_id', req.params.id);
  if (detachError) return res.status(500).json({ error: detachError.message });
  const { error } = await supabase.from('vendors').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Vendor deleted' });
});

// Anyone logged in can view the vendor list
router.get('/vendors', verifyToken, async (req, res) => {
  const { data, error } = await supabase.from('vendors').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Employee submits a purchase request
router.post('/purchase-requests', verifyToken, async (req, res) => {
  const { vendor_id, item_description, amount } = req.body;

  if (!item_description || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'item_description and amount are required' });
  }

  const { data: purchaseRequest, error: purchaseError } = await supabase
    .from('purchase_requests')
    .insert({
      requester_id: req.user.id,
      vendor_id,
      item_description,
      amount,
    })
    .select()
    .single();

  if (purchaseError) return res.status(500).json({ error: purchaseError.message });

  const { error: approvalError } = await supabase
    .from('approval_requests')
    .insert({ purchase_request_id: purchaseRequest.id });

  if (approvalError) return res.status(500).json({ error: approvalError.message });

  // Notify the requester that their purchase request was submitted
  await notifyManagers(
    'Purchase Request Submitted',
    `${req.user.full_name}'s purchase request for "${item_description}" (₹${amount}) is pending approval.`,
    'purchase'
  );

  res.status(201).json({ message: 'Purchase request submitted', purchaseRequest });
});

// Employee views their own purchase requests
router.get('/purchase-requests/mine', verifyToken, async (req, res) => {
  const { data, error } = await supabase
    .from('purchase_requests')
    .select('*')
    .eq('requester_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Manager/Admin views all purchase requests
router.get('/purchase-requests', verifyToken, requireRole('manager', 'admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('purchase_requests')
    .select('*, profiles(full_name, department), vendors(name)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;