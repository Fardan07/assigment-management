const express = require('express');
const router = express.Router();
const db = require('restforgejs/src/utils/db');
const bcrypt = require('bcrypt');

// CORS headers
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

/**
 * POST /api/facility-helpdesk/auth/login
 * Login dengan username/email dan password dari database
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validasi input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password wajib diisi'
      });
    }

    // Query user dari database
    // Username bisa email atau employee_code
    try {
      const query = `
        SELECT user_id, employee_code, full_name, email, password_hash, role, is_active, created_at
        FROM app_user
        WHERE (LOWER(email) = $1 OR LOWER(employee_code) = $1) AND is_active = true
        LIMIT 1
      `;

      const rows = await db.executeQuery(query, [username.toLowerCase().trim()]);

      if (!rows || rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Username atau password salah'
        });
      }

      const user = rows[0];

      // Password verification:
      // - bcrypt hash => compare with bcrypt
      // - plain text seed data => compare as plain text
      const storedPassword = String(user.password_hash || '').trim();
      let passwordMatches = false;

      if (!storedPassword) {
        passwordMatches = true;
      } else if (storedPassword.startsWith('$2')) {
        passwordMatches = await bcrypt.compare(password, storedPassword);
      } else {
        passwordMatches = storedPassword === password;
      }

      if (!passwordMatches) {
        return res.status(401).json({
          success: false,
          message: 'Username atau password salah'
        });
      }

      // Success - return user data
      return res.status(200).json({
        success: true,
        message: 'Login berhasil',
        data: {
          user: {
            id: user.user_id,
            username: user.employee_code,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            is_active: user.is_active,
            created_at: user.created_at
          }
        }
      });

    } catch (queryError) {
      console.error('Query error:', queryError);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? queryError.message : undefined
      });
    }

  } catch (error) {
    console.error('Auth login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/facility-helpdesk/auth/profile/:id
 * Get user profile info
 */
router.get('/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID wajib diisi'
      });
    }

    const query = `
      SELECT user_id, employee_code, full_name, email, role, is_active, created_at
      FROM app_user
      WHERE user_id = $1
      LIMIT 1
    `;

    const rows = await db.executeQuery(query, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    const user = rows[0];

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.user_id,
          username: user.employee_code,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
