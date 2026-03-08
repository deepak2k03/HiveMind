<p align="center">
  <img src="https://img.shields.io/badge/React-19.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Three.js-0.183.2-000000?style=for-the-badge&logo=threedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/TensorFlow.js-4.22.0-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-4.8.1-010101?style=for-the-badge&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-8.8.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
</p>

<h1 align="center">🧠 HiveMind</h1>
<h3 align="center">Federated Intelligence Platform</h3>
<p align="center"><em>Train AI models collaboratively without ever sharing your data.</em></p>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
  - [Running the App](#running-the-app)
- [Architecture](#architecture)
  - [Federated Learning Flow](#federated-learning-flow)
  - [TensorFlow.js Model](#tensorflowjs-model)
  - [Federated Averaging (FedAvg)](#federated-averaging-fedavg)
- [API Reference](#api-reference)
  - [Auth Routes](#auth-routes)
  - [Room Routes](#room-routes)
  - [Socket.IO Events](#socketio-events)
- [Database Schemas](#database-schemas)
- [Client Architecture](#client-architecture)
  - [State Management](#state-management)
  - [3D Scene & WebGL](#3d-scene--webgl)
  - [Services & Hooks](#services--hooks)
  - [UI Components](#ui-components)
- [Scripts Reference](#scripts-reference)
- [License](#license)

---

## Overview

**HiveMind** is a full-stack federated learning platform where multiple devices collaboratively train a shared AI model in real-time — while **every byte of raw data stays on the user's device**. Only model weights (tiny numeric updates) are transmitted to the server, which aggregates them using **Federated Averaging (FedAvg)** and broadcasts the improved global model back to all participants.

The platform features an immersive **Active Theory–style 3D experience** built with React Three Fiber, custom GLSL shaders, a scroll-driven cinematic camera, and a dark neumorphic design language — creating a visually stunning interface that showcases the power of decentralized AI.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Privacy-Preserving Training** | Raw data never leaves the device. Only model weights are shared. |
| **Real-Time Collaboration** | Socket.IO powers instant communication between all connected peers. |
| **Federated Averaging** | Server aggregates weights from all peers into a smarter global model each round. |
| **In-Browser ML** | TensorFlow.js runs model training directly in the browser via a dedicated Web Worker. |
| **Immersive 3D Visualization** | Custom GLSL shaders, 6000-particle fields, morphing orbs, orbital constellations, and scroll-driven camera. |
| **Dark Neumorphic UI** | Hand-crafted dark theme with frosted glass, gradient borders, scanning animations, and staggered reveals. |
| **Room-Based Sessions** | Create or join training rooms with unique room IDs. |
| **JWT Authentication** | Secure registration/login with bcrypt password hashing and 7-day JWT tokens. |
| **GPU-Accelerated Rendering** | Instanced meshes, additive blending, WebGL 2.0 optimizations via Three.js. |
| **Responsive & Performant** | DPR-adaptive rendering, Web Worker offloading, frame-independent animations. |

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI framework |
| React Three Fiber | 9.5.0 | Declarative Three.js for React |
| Three.js | 0.183.2 | 3D graphics engine |
| @react-three/drei | 10.7.7 | R3F helpers (ScrollControls, shaderMaterial) |
| TensorFlow.js | 4.22.0 | In-browser machine learning |
| Zustand | 5.0.11 | Lightweight state management |
| Framer Motion | 12.35.1 | React animation library |
| Socket.IO Client | 4.8.1 | Real-time WebSocket communication |
| Axios | 1.7.7 | HTTP client |
| Tailwind CSS | 3.4.17 | Utility-first CSS framework |
| Vite | 5.4.10 | Build tool & dev server |
| Lucide React | 0.577.0 | Icon library |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | — | JavaScript runtime |
| Express | 4.21.2 | HTTP server framework |
| MongoDB + Mongoose | 8.8.0 | Database & ODM |
| Socket.IO | 4.8.1 | Real-time bidirectional communication |
| JSON Web Token | 9.0.2 | Authentication tokens |
| bcryptjs | 2.4.3 | Password hashing |
| dotenv | 16.4.5 | Environment variable management |
| CORS | 2.8.5 | Cross-origin resource sharing |
| Nodemon | 3.1.7 | Dev server auto-restart |

---

## Project Structure

```
hivemind/
├── README.md
│
├── client/                          # Frontend (React + Vite)
│   ├── package.json
│   ├── vite.config.js               # Vite configuration
│   ├── tailwind.config.js           # Tailwind CSS configuration
│   ├── postcss.config.js            # PostCSS (Tailwind + Autoprefixer)
│   ├── index.html                   # HTML entry point
│   ├── public/                      # Static assets
│   └── src/
│       ├── main.jsx                 # React DOM root mount
│       ├── App.jsx                  # Root component
│       ├── styles.css               # Global styles, keyframes, fonts
│       │
│       ├── components/
│       │   ├── DashboardOverlay.jsx # Full UI overlay (auth, lobby, dashboard)
│       │   ├── auth/                # Auth components (reserved)
│       │   ├── lobby/               # Lobby components (reserved)
│       │   └── ui/                  # Shared UI components (reserved)
│       │
│       ├── hooks/
│       │   ├── useFederatedML.js    # Web Worker management + training trigger
│       │   └── useSocket.js         # Socket.IO event listener hook
│       │
│       ├── services/
│       │   ├── api.js               # Axios HTTP client + API methods
│       │   └── socket.js            # Socket.IO singleton + token management
│       │
│       ├── store/
│       │   ├── useAuthStore.js      # Zustand auth store (JWT, user, persistence)
│       │   └── useRoomStore.js      # Zustand room store (peers, rounds, visuals)
│       │
│       ├── webgl/
│       │   ├── Scene.jsx            # Main 3D scene (~1050 lines)
│       │   ├── TourCamera.jsx       # Scroll-driven cinematic camera (6 waypoints)
│       │   ├── CyberCore.jsx        # Central rotating wireframe icosahedron
│       │   ├── DataLasers.jsx       # Training pulse visual effects
│       │   └── InstancedPeers.jsx   # GPU-instanced peer representation
│       │
│       └── workers/
│           └── tf.worker.js         # TensorFlow.js training Web Worker
│
└── server/                          # Backend (Express + Socket.IO)
    ├── package.json
    └── src/
        ├── server.js                # Express + Socket.IO server entry
        │
        ├── config/
        │   └── db.js                # MongoDB/Mongoose connection
        │
        ├── controllers/
        │   ├── authController.js    # Register, login, profile logic
        │   └── roomController.js    # Create & join room logic
        │
        ├── middleware/
        │   ├── requireAuth.js       # JWT verification middleware (HTTP)
        │   └── socketAuth.js        # JWT verification middleware (Socket.IO)
        │
        ├── models/
        │   ├── User.js              # User schema (name, email, password)
        │   └── Room.js              # Room schema (roomId, weights, state)
        │
        ├── routes/
        │   ├── authRoutes.js        # /api/auth/* routes
        │   └── roomRoutes.js        # /api/rooms/* routes
        │
        ├── sockets/
        │   └── socketManager.js     # Socket.IO event handlers & FedAvg orchestration
        │
        └── utils/
            └── fedAvg.js            # Federated Averaging algorithm
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+ and npm
- **MongoDB** (local instance or cloud — e.g., MongoDB Atlas)
- A modern browser with WebGL 2.0 support

### Environment Variables

Create a `.env` file in the `server/` directory:

```env
PORT=3001
MONGO_URI=mongodb://127.0.0.1:27017/hivemind
JWT_SECRET=your-strong-secret-key-here
CLIENT_URL=http://localhost:5173
```

Optionally create a `.env` file in the `client/` directory (defaults work for local dev):

```env
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd hivemind

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Running the App

**Terminal 1 — Start the server:**

```bash
cd server
npm run dev
```

Server starts on `http://localhost:3001` with hot reload via nodemon.

**Terminal 2 — Start the client:**

```bash
cd client
npm run dev
```

Client starts on `http://localhost:5173` with Vite HMR.

**Terminal 3 — Ensure MongoDB is running:**

```bash
mongod
```

Or use a MongoDB Atlas connection string in your `.env`.

---

## Architecture

### Federated Learning Flow

```
┌──────────────────────────────────────────────────────────────┐
│                        SERVER (Coordinator)                  │
│                                                              │
│  1. Broadcast TRAINING_STARTED to all peers in room          │
│  2. Collect SUBMIT_WEIGHTS from each peer                    │
│  3. When all peers submit → run FedAvg                       │
│  4. Broadcast GLOBAL_WEIGHTS_UPDATED to all peers            │
│  5. Increment round, repeat                                  │
└───────────────────────┬──────────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          ▼             ▼             ▼
   ┌────────────┐ ┌────────────┐ ┌────────────┐
   │  PEER A    │ │  PEER B    │ │  PEER C    │
   │            │ │            │ │            │
   │ 1. Receive │ │ 1. Receive │ │ 1. Receive │
   │    signal  │ │    signal  │ │    signal  │
   │ 2. Load    │ │ 2. Load    │ │ 2. Load    │
   │    global  │ │    global  │ │    global  │
   │    weights │ │    weights │ │    weights │
   │ 3. Train   │ │ 3. Train   │ │ 3. Train   │
   │    locally │ │    locally │ │    locally │
   │    (GPU    │ │    (GPU    │ │    (GPU    │
   │    Worker) │ │    Worker) │ │    Worker) │
   │ 4. Send    │ │ 4. Send    │ │ 4. Send    │
   │    weights │ │    weights │ │    weights │
   │    only    │ │    only    │ │    only    │
   └────────────┘ └────────────┘ └────────────┘
     Data stays      Data stays      Data stays
     on device       on device       on device
```

**Step-by-step:**

1. A host peer clicks **"Initiate Swarm Epoch"** → emits `START_TRAINING`
2. Server broadcasts `TRAINING_STARTED` to all peers in the room
3. Each peer's browser spawns a **Web Worker** that loads TensorFlow.js
4. The worker syncs global weights (if available), trains on **local data only**
5. After 2 local epochs, the worker extracts weights and sends them back
6. The main thread emits `SUBMIT_WEIGHTS` with the weight arrays via Socket.IO
7. Once **all peers** have submitted, the server runs **Federated Averaging**
8. The averaged global weights are broadcast as `GLOBAL_WEIGHTS_UPDATED`
9. The round counter increments, and the cycle is ready to repeat

### TensorFlow.js Model

The demo model is a **3-layer neural network** for MNIST-style digit classification:

```
┌─────────────────────────────────────────┐
│           INPUT LAYER                   │
│           784 features                  │
│     (28×28 flattened grayscale image)   │
├─────────────────────────────────────────┤
│        DENSE LAYER 1                    │
│        128 neurons, ReLU                │
│        Parameters: 100,480              │
├─────────────────────────────────────────┤
│        DENSE LAYER 2                    │
│        64 neurons, ReLU                 │
│        Parameters: 8,256                │
├─────────────────────────────────────────┤
│        OUTPUT LAYER                     │
│        10 neurons, Softmax              │
│        Parameters: 650                  │
├─────────────────────────────────────────┤
│        TOTAL: ~109,386 parameters       │
│        Optimizer: Adam                  │
│        Loss: Categorical Crossentropy   │
│        Local Epochs: 2                  │
│        Batch Size: 16                   │
└─────────────────────────────────────────┘
```

> **Note:** The current demo uses randomly generated data (64 samples × 784 features) to simulate local training. Replace the data generation in `tf.worker.js` with real local datasets for production use.

### Federated Averaging (FedAvg)

Located in `server/src/utils/fedAvg.js`, the algorithm performs **unweighted averaging** across all client submissions:

```
For each layer L in the network:
    For each weight W in layer L:
        globalWeight[L][W] = (1/N) × Σ clientWeight[i][L][W]
```

Where N = number of participating clients. All clients contribute equally regardless of local dataset size.

**Complexity:** O(L × W × C) where L = layers, W = weights per layer, C = clients.

---

## API Reference

### Auth Routes

Base path: `/api/auth`

| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| `POST` | `/register` | — | `{ name, email, password }` | `{ token, user: { id, name, email } }` |
| `POST` | `/login` | — | `{ email, password }` | `{ token, user: { id, name, email } }` |
| `GET` | `/me` | Bearer JWT | — | `{ id, name, email, createdAt }` |

**Error Codes:**
- `400` — Missing required fields
- `401` — Invalid credentials / expired token
- `409` — Email already registered
- `500` — Internal server error

### Room Routes

Base path: `/api/rooms`

| Method | Endpoint | Auth | Body / Params | Response |
|--------|----------|------|---------------|----------|
| `POST` | `/` | Bearer JWT | `{ roomId? }` (auto-generates if omitted) | `{ roomId, peers, currentRound, isTraining }` |
| `GET` | `/:roomId` | — | URL param: `roomId` | `{ roomId, peers, currentRound, isTraining }` |

**Room ID Format:** `ROOM-XXXXXX` (6 random uppercase alphanumeric characters)

### Health Check

| Method | Endpoint | Response |
|--------|----------|----------|
| `GET` | `/api/health` | `{ status: 'HiveMind Coordinator Online' }` |

### Socket.IO Events

**Connection:** Clients connect with optional JWT via `socket.handshake.auth.token`. Anonymous connections are allowed for demo mode.

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `JOIN_ROOM` | `{ roomId, userId }` | Join a training room. Increments device count. |
| `START_TRAINING` | `{ roomId }` | Host initiates a new training round. |
| `SUBMIT_WEIGHTS` | `{ roomId, weights: Float32Array[] }` | Submit locally trained weights. |
| `disconnect` | — | Auto-handled. Decrements device count. |

#### Server → Client (Broadcasts)

| Event | Payload | Description |
|-------|---------|-------------|
| `ROOM_STATE_UPDATE` | `{ peers, currentRound }` | Broadcast to all in room after join/leave. |
| `TRAINING_STARTED` | `{}` | Tells all peers to begin local training. |
| `GLOBAL_WEIGHTS_UPDATED` | `{ round, globalWeights }` | New averaged weights ready for sync. |
| `ERROR` | `{ message }` | Error notification. |

**Socket.IO Config:**
- Transport: WebSocket only
- Max Buffer Size: 100 MB (supports large tensor payloads)
- Reconnection: Enabled (default Socket.IO behavior)

---

## Database Schemas

### User

```javascript
{
  name:      String    // required, trimmed
  email:     String    // required, unique, lowercase, trimmed
  password:  String    // min 6 chars, bcrypt hashed (10 salt rounds)
  createdAt: Date      // auto (timestamps: true)
  updatedAt: Date      // auto (timestamps: true)
}
```

**Instance Methods:**
- `comparePassword(candidate)` → `Promise<boolean>` — bcrypt comparison

### Room

```javascript
{
  roomId:        String   // required, unique, uppercase, trimmed
  hostUser:      ObjectId // ref: 'User', nullable
  deviceCount:   Number   // default: 0, min: 0
  currentRound:  Number   // default: 0, min: 0
  isTraining:    Boolean  // default: false
  globalWeights: Buffer   // nullable — serialized model weights
  createdAt:     Date     // auto (timestamps: true)
  updatedAt:     Date     // auto (timestamps: true)
}
```

---

## Client Architecture

### State Management

HiveMind uses **Zustand** for state management with localStorage persistence.

#### Auth Store (`useAuthStore`)

```javascript
{
  token:           string | null,    // JWT token
  user:            { id, name, email } | null,
  isAuthenticated: boolean,
  hasHydrated:     boolean,          // Hydration status from localStorage

  // Actions
  setSession({ token, user }),
  clearSession(),
  setHydrated(value)
}
```

Persisted to `localStorage` key: `hivemind-auth`

#### Room Store (`useRoomStore`)

```javascript
// Reactive state (triggers React re-renders)
{
  roomId:        string | null,
  peers:         number,
  isTraining:    boolean,
  currentRound:  number,
  globalWeights: Float32Array[] | null,
  workHistory:   Array<{ roomId, round, peers, ts }>   // last 10 sessions
}

// Mutable state (direct mutation for 60fps 3D, NO re-renders)
{
  visualState: {
    laserPulseIntensity: number,  // 0–1, drives DataLasers effect
    coreRotationSpeed:   number   // Angular velocity for CyberCore
  }
}
```

Persisted to `localStorage` key: `hivemind-room` (roomId, currentRound, workHistory only)

### 3D Scene & WebGL

The 3D experience is built with **React Three Fiber** and lives in `client/src/webgl/`.

#### Scene.jsx (~1050 lines)

The main scene file containing all 3D environments and DOM overlays:

| Component | Description |
|-----------|-------------|
| **ParticleField** | 6,000 flowing particles with continuous motion and additive blending |
| **HeroSphere** | Custom GLSL shader-displaced icosahedron with Simplex noise vertex deformation, Fresnel edge glow, and 3 concentric orbit rings |
| **NetworkConstellation** | 24 Fibonacci-distributed nodes with pulsing connections to a central hub |
| **TrainingGyro** | 7 concentric torus rings spinning on independent axes around an energy core |
| **DataTunnel** | 400 spiraling particles flowing through 12 ring gates — cyan color scheme |
| **EvolveSphere** | Second morphing GLSL sphere with magenta-to-pink gradient |
| **FloatingGeometry** | 30 random wireframe polyhedra (icosahedron, octahedron, torus, tetrahedron) |
| **GroundGrid** | 200-unit pulsing ground grid |

**Custom GLSL Shader (CoreMaterial):**
- **Vertex Shader:** Applies 2-octave Simplex 3D noise displacement along normals for organic morphing
- **Fragment Shader:** Fresnel-based edge glow blended between two colors, multiplied by 2.8× for HDR-like brightness

**DOM Overlay Components:**

| Component | Description |
|-----------|-------------|
| **HeroReveal** | Grand entrance with scale animation (0.85→1.0), radial backdrop blur, cubic-bezier easing |
| **RevealSection** | Directional slide-in (left/right/center) using rAF-driven proximity detection |
| **StickyAuthForm** | Auth form that pins to viewport center at scroll end, with rotating conic-gradient border, orbiting particles, scan line, pulse rings, corner brackets, and 3D staggered entrance |
| **AuthFormItem** | Individual form element with blur dissolve + 3D transform entrance from configurable direction |

#### TourCamera.jsx

Scroll-driven cinematic camera with **6 waypoints** along the Z-axis:

| # | Position | Target | FOV |
|---|----------|--------|-----|
| 1 | (0, 1.5, 28) | (0, 1, 18) | 55° |
| 2 | (-3, 2.5, 14) | (-1, 1, 4) | 50° |
| 3 | (3, 1.5, 0) | (1, 0, -8) | 48° |
| 4 | (-2, 3.5, -14) | (0, 2, -22) | 46° |
| 5 | (1, 5, -26) | (0, 3, -32) | 44° |
| 6 | (0, 2, -36) | (0, 1, -44) | 50° |

Camera uses quaternion slerp for rotation (no gimbal lock) with a damping factor of `1 - exp(-2.5 × delta)` for frame-independent cinematic smoothing.

#### Additional WebGL Components

| File | Purpose |
|------|---------|
| **CyberCore.jsx** | Central rotating wireframe icosahedron. Pulse intensity oscillates during training. Rotation speed driven by `visualState.coreRotationSpeed`. |
| **DataLasers.jsx** | Magenta beam + cyan aura shockwave. Triggered on each training batch via `fireTrainingPulse()`. Exponential decay (~0.3s fade). |
| **InstancedPeers.jsx** | GPU-instanced octahedra (up to 200) orbiting the core. Each peer has unique orbit radius (4–8m), speed, and vertical bobbing. Uses `instancedMesh.setMatrixAt()` for performance. |

### Services & Hooks

#### API Service (`services/api.js`)

Axios instance with:
- Base URL: `VITE_API_URL` or `http://localhost:3001/api`
- Timeout: 15 seconds
- Auth token management via `setAuthToken(token)`

Exported API methods:
```javascript
authApi.register({ name, email, password })
authApi.login({ email, password })
authApi.me()
roomApi.create({ roomId? })
```

#### Socket Service (`services/socket.js`)

Singleton Socket.IO client stored on `globalThis.__hivemind_socket__`:
- Transport: WebSocket only
- Auto-connect enabled
- `setSocketToken(token)` — Updates auth and reconnects

#### useFederatedML Hook (`hooks/useFederatedML.js`)

Manages the TensorFlow.js Web Worker lifecycle:
1. Creates worker on mount, terminates on unmount
2. Sends `INIT` message to construct the model
3. `startLocalTraining()` sends `TRAIN` with current global weights
4. Listens for `BATCH_END` (updates visual pulse) and `TRAIN_COMPLETE` (emits weights to server)

#### useSocket Hook (`hooks/useSocket.js`)

```javascript
useSocket(eventName, handler)
```
Subscribes to a Socket.IO event on mount, cleans up on unmount.

### UI Components

#### DashboardOverlay.jsx (~600 lines)

Three-state animated overlay using Framer Motion's `AnimatePresence`:

| State | Condition | UI |
|-------|-----------|-----|
| **Login/Signup** | Not authenticated | Center modal with email/password form, toggle between login & register |
| **Lobby** | Authenticated, no room | Bottom-left panel with room ID input, create room button, work history |
| **Dashboard** | Authenticated, in room | Stats bar (room ID, peers, round), action button "Initiate Swarm Epoch", work history |

**Features:**
- Form validation (email format, password min 6 chars)
- Error display with auto-dismiss
- Loading spinners during async operations
- Socket.IO integration for room join/leave
- Gradient buttons with cyber glow effects
- HiveMind.OS branding header with online status indicator

---

## Scripts Reference

### Server (`server/package.json`)

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `nodemon src/server.js` | Start dev server with auto-restart |
| `start` | `node src/server.js` | Start production server |

### Client (`client/package.json`)

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite` | Start Vite dev server (port 5173) |
| `build` | `vite build` | Production build to `dist/` |
| `preview` | `vite preview` | Preview production build locally |

---

## License

This project is provided as-is for educational and demonstration purposes.

---

<p align="center">
  <strong>HiveMind</strong> — Your devices. One collective brain.
</p>
