const supabase = require('../../config/supabaseClient');

async function createNotification(userId, title, message, type) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    title,
    message,
    type,
  });

  if (error) {
    console.log('Notification creation failed:', error.message);
  }
}

async function notifyManagers(title, message, type) {
  const { data: managers, error } = await supabase.from('profiles').select('id').eq('role', 'manager');
  if (error) {
    console.error('Manager notification lookup failed:', error.message);
    return;
  }
  await Promise.all((managers || []).map((manager) => createNotification(manager.id, title, message, type)));
}

module.exports = { createNotification, notifyManagers };