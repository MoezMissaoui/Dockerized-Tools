const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors());
app.use(cookieParser());

// SuperTokens and Cerbos configuration
const SUPERTOKENS_URL = process.env.SUPERTOKENS_CONNECTION_URI || 'http://localhost:3567';
const CERBOS_URL = process.env.CERBOS_URL || 'http://localhost:3592';

// Mock user session validation (in real implementation, use SuperTokens SDK)
async function validateSession(sessionToken) {
  try {
    // This is a simplified version - use SuperTokens SDK in production
    const response = await axios.post(`${SUPERTOKENS_URL}/session/verify`, {
      sessionToken
    });
    return response.data;
  } catch (error) {
    return null;
  }
}

// Check permissions with Cerbos
async function checkPermissions(principal, resource, action) {
  try {
    const response = await axios.post(`${CERBOS_URL}/api/check`, {
      principal: {
        id: principal.id,
        roles: principal.roles,
        attributes: principal.attributes
      },
      resource: {
        kind: resource.kind,
        instances: {
          [resource.instanceId]: {
            attributes: resource.attributes
          }
        }
      },
      actions: [action]
    });

    return response.data.results[0].actions[action] === 'EFFECT_ALLOW';
  } catch (error) {
    console.error('Cerbos check failed:', error);
    return false;
  }
}

// Routes
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Mock login - replace with SuperTokens implementation
  if (email && password) {
    // In real implementation, use SuperTokens createNewSession
    const mockSession = {
      sessionToken: 'mock-session-token-' + Date.now(),
      user: {
        id: 'user123',
        email: email,
        roles: email === 'admin@test.com' ? ['admin'] : ['user']
      }
    };
    
    res.json({
      success: true,
      session: mockSession
    });
  } else {
    res.status(400).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/protected', async (req, res) => {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'No session token provided' });
  }

  const session = await validateSession(sessionToken);
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  // Check permissions with Cerbos
  const allowed = await checkPermissions(
    {
      id: session.user.id,
      roles: session.user.roles,
      attributes: { email: session.user.email }
    },
    {
      kind: 'api',
      instanceId: 'protected-endpoint',
      attributes: { sensitive: true }
    },
    'read'
  );

  if (!allowed) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  res.json({
    success: true,
    message: 'Access granted to protected resource',
    user: session.user
  });
});

app.post('/api/admin', async (req, res) => {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'No session token provided' });
  }

  const session = await validateSession(sessionToken);
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  // Check admin permissions with Cerbos
  const allowed = await checkPermissions(
    {
      id: session.user.id,
      roles: session.user.roles,
      attributes: { email: session.user.email }
    },
    {
      kind: 'api',
      instanceId: 'admin-endpoint',
      attributes: { adminOnly: true }
    },
    'write'
  );

  if (!allowed) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  res.json({
    success: true,
    message: 'Admin access granted',
    user: session.user
  });
});

app.listen(PORT, () => {
  console.log(`Test API server running on port ${PORT}`);
});