// ─────────────────────────────────────────────────────────────────────────────
// Add this to your backend server.js (NurseLink / Vyasa backend)
// ─────────────────────────────────────────────────────────────────────────────
// 1. Install dependency:  npm install google-auth-library
// 2. Add GOOGLE_CLIENT_ID to your .env
// 3. Paste the route below into server.js
// ─────────────────────────────────────────────────────────────────────────────

const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/google
// Body: { credential: "<google-id-token>" }
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'No credential provided' });

    // Verify the token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    // Find existing user or auto-create
    let user = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (user.rows.length === 0) {
      // Auto-create a new user with 'doctor' role (pending admin approval)
      const insert = await db.query(
        `INSERT INTO users (name, email, google_id, avatar_url, role, status)
         VALUES ($1, $2, $3, $4, 'doctor', 'pending')
         RETURNING *`,
        [name, email, googleId, picture]
      );
      user = { rows: [insert.rows[0]] };
    }

    const dbUser = user.rows[0];

    // Check if account is approved
    if (dbUser.status === 'pending') {
      return res.status(403).json({
        error: 'pending_approval',
        message: 'Your account is pending admin approval.',
      });
    }

    // Issue Vyasa JWT
    const token = jwt.sign(
      { id: dbUser.id, email: dbUser.email, role: dbUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        avatar: dbUser.avatar_url,
      },
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Invalid Google token' });
  }
});
