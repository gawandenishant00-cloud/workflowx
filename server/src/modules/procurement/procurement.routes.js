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

router.post('/vendors/:id/items', verifyToken, requireRole('admin'), async (req, res) => {
  const { item_name, unit_price } = req.body;
  if (!item_name || !Number.isFinite(Number(unit_price)) || Number(unit_price) < 0) return res.status(400).json({ error: 'item_name and a valid unit_price are required' });
  const { data, error } = await supabase.from('vendor_items').insert({ vendor_id: req.params.id, item_name, unit_price: Number(unit_price) }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ message: 'Vendor item added', item: data });
});

router.get('/vendors/:id/items', verifyToken, async (req, res) => {
  const { data, error } = await supabase.from('vendor_items').select('*').eq('vendor_id', req.params.id).order('item_name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Anyone logged in can view the vendor list
router.get('/vendors', verifyToken, async (req, res) => {
  const { data, error } = await supabase.from('vendors').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Employee submits a purchase request
router.post('/purchase-requests', verifyToken, async (req, res) => {
  const { vendor_id, vendor_item_id, item_description, quantity = 1, unit_price, amount } = req.body;
  const parsedQuantity = Number(quantity);
  let parsedUnitPrice = Number(unit_price ?? amount ?? 0);
  let requestedItem = item_description;
  if (vendor_item_id) {
    const { data: catalogItem, error: catalogError } = await supabase.from('vendor_items').select('vendor_id, item_name, unit_price').eq('id', vendor_item_id).single();
    if (catalogError || !catalogItem || catalogItem.vendor_id !== vendor_id) return res.status(400).json({ error: 'Selected catalog item is invalid' });
    requestedItem = catalogItem.item_name;
    parsedUnitPrice = Number(catalogItem.unit_price);
  }
  const totalAmount = parsedQuantity * parsedUnitPrice;

  if (!requestedItem || !Number.isInteger(parsedQuantity) || parsedQuantity <= 0 || !Number.isFinite(parsedUnitPrice) || parsedUnitPrice < 0) {
    return res.status(400).json({ error: 'item_description and quantity are required; price is optional' });
  }

  const { data: purchaseRequest, error: purchaseError } = await supabase
    .from('purchase_requests')
    .insert({
      requester_id: req.user.id,
      vendor_id,
      vendor_item_id: vendor_item_id || null,
      item_description: requestedItem,
      quantity: parsedQuantity,
      unit_price: parsedUnitPrice,
      amount: totalAmount,
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
    `${req.user.full_name}'s purchase request for "${requestedItem}" (${parsedQuantity} item(s), ${parsedUnitPrice ? `total ₹${totalAmount}` : 'price pending'}) is pending approval.`,
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

router.delete('/purchase-requests/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { data: request, error: lookupError } = await supabase
    .from('purchase_requests')
    .select('id, status, item_description')
    .eq('id', req.params.id)
    .single();
  if (lookupError || !request) return res.status(404).json({ error: 'Purchase request not found' });
  if (request.status === 'pending') return res.status(409).json({ error: 'Pending requests cannot be deleted' });

  const { error: approvalError } = await supabase.from('approval_requests').delete().eq('purchase_request_id', request.id);
  if (approvalError) return res.status(500).json({ error: approvalError.message });
  const { error } = await supabase.from('purchase_requests').delete().eq('id', request.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: `Purchase request "${request.item_description}" deleted` });
});

module.exports = router;