import express from 'express';
import supertokens from 'supertokens-node';
import Session from 'supertokens-node/recipe/session/index.js';
import EmailPassword from 'supertokens-node/recipe/emailpassword/index.js';
import { verifySession } from 'supertokens-node/recipe/session/framework/express/index.js';
import { middleware, errorHandler } from 'supertokens-node/framework/express/index.js';
import cors from 'cors';
import { HTTP as Cerbos } from '@cerbos/http';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize SuperTokens
supertokens.init({
  framework: "express",
  supertokens: {
    connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || "http://localhost:3567",
    apiKey: process.env.SUPERTOKENS_API_KEY || "your-api-key-here-wassim-moez-ghassen"
  },
  appInfo: {
    appName: "TestApp",
    apiDomain: "http://localhost:3001",
    websiteDomain: "http://localhost:3001",
    apiBasePath: "/auth",
    websiteBasePath: "/auth"
  },
  recipeList: [
    EmailPassword.init(),
    Session.init({
      override: {
        functions: (originalImplementation) => {
          return {
            ...originalImplementation,
            createNewSession: async function (input) {
              input.accessTokenPayload = {
                ...input.accessTokenPayload,
                role: input.userContext.role || 'user',
                userId: input.userId
              };
              return originalImplementation.createNewSession(input);
            },
          };
        },
      },
    })
  ]
});

// Initialize Cerbos
const cerbos = new Cerbos({
  hostname: process.env.CERBOS_URL || "http://localhost:3592"
});

app.use(cors({
  origin: true,
  allowedHeaders: ['content-type', ...supertokens.getAllCORSHeaders()],
  credentials: true,
}));

app.use(express.json());
app.use(middleware());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Custom signup with role
app.post('/auth/signup-with-role', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const signUpResponse = await EmailPassword.signUp("public", email, password);
    
    if (signUpResponse.status === "OK") {
      const session = await Session.createNewSession(req, res, "public", 
        supertokens.convertToRecipeUserId(signUpResponse.user.id), 
        {}, 
        { role: role || 'user' }
      );
      
      res.json({
        message: 'User created successfully',
        user: {
          id: signUpResponse.user.id,
          email: signUpResponse.user.emails[0],
          role: role || 'user'
        }
      });
    } else {
      res.status(400).json({ error: signUpResponse.status });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protected route with Cerbos authorization
app.get('/api/users/:userId', verifySession(), async (req, res) => {
  try {
    const session = req.session;
    const { userId } = req.params;
    const currentUserId = session.getUserId();
    const role = session.getAccessTokenPayload().role;

    // Check with Cerbos
    const decision = await cerbos.checkResource({
      principal: {
        id: currentUserId,
        roles: [role],
        attr: {}
      },
      resource: {
        kind: "user",
        id: userId,
        attr: {}
      },
      actions: ["read"]
    });

    if (decision.isAllowed("read")) {
      res.json({
        message: 'Access granted',
        user: {
          id: userId,
          email: `user${userId}@example.com`,
          name: `User ${userId}`
        },
        authorization: {
          allowed: true,
          currentUserId,
          requestedUserId: userId,
          role
        }
      });
    } else {
      res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to view this user',
        authorization: {
          allowed: false,
          currentUserId,
          requestedUserId: userId,
          role
        }
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Document endpoints with Cerbos
app.post('/api/documents', verifySession(), async (req, res) => {
  try {
    const session = req.session;
    const currentUserId = session.getUserId();
    const role = session.getAccessTokenPayload().role;
    const { title, content, visibility } = req.body;

    const decision = await cerbos.checkResource({
      principal: {
        id: currentUserId,
        roles: [role],
        attr: {}
      },
      resource: {
        kind: "document",
        id: "new",
        attr: {}
      },
      actions: ["create"]
    });

    if (decision.isAllowed("create")) {
      const newDoc = {
        id: `doc_${Date.now()}`,
        title,
        content,
        visibility: visibility || 'private',
        ownerId: currentUserId,
        createdAt: new Date().toISOString()
      };

      res.json({
        message: 'Document created',
        document: newDoc
      });
    } else {
      res.status(403).json({ error: 'Not authorized to create documents' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/documents/:docId', verifySession(), async (req, res) => {
  try {
    const session = req.session;
    const { docId } = req.params;
    const currentUserId = session.getUserId();
    const role = session.getAccessTokenPayload().role;

    // Mock document data
    const mockDoc = {
      id: docId,
      title: 'Sample Document',
      content: 'This is a test document',
      visibility: 'public',
      ownerId: 'user123',
      sharedWith: ['user456']
    };

    const decision = await cerbos.checkResource({
      principal: {
        id: currentUserId,
        roles: [role, mockDoc.ownerId === currentUserId ? 'owner' : 'viewer'],
        attr: {}
      },
      resource: {
        kind: "document",
        id: docId,
        attr: mockDoc
      },
      actions: ["read"]
    });

    if (decision.isAllowed("read")) {
      res.json({
        message: 'Access granted',
        document: mockDoc,
        authorization: {
          allowed: true,
          action: 'read',
          role
        }
      });
    } else {
      res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to view this document'
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Session info endpoint
app.get('/api/session-info', verifySession(), async (req, res) => {
  try {
    const session = req.session;
    res.json({
      userId: session.getUserId(),
      role: session.getAccessTokenPayload().role,
      sessionHandle: session.getHandle()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use(errorHandler());

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 SuperTokens: ${process.env.SUPERTOKENS_CONNECTION_URI || 'http://localhost:3567'}`);
  console.log(`🔒 Cerbos: ${process.env.CERBOS_URL || 'http://localhost:3592'}`);
});
