const supabase = require('../config/supabaseClient');

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    console.log('AUTH ERROR DETAILS:', error); // <-- new line, prints the real reason
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    console.log('PROFILE ERROR DETAILS:', profileError); // <-- new line too
    return res.status(401).json({ error: 'Profile not found' });
  }

  if (profile.employment_status === 'offboarded') {
    return res.status(403).json({ error: 'This account has been offboarded' });
  }

  req.user = profile;
  next();
}

module.exports = verifyToken;