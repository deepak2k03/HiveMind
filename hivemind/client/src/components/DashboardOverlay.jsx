import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Cpu, History, LogOut, Play, Plus, Shield, Users } from 'lucide-react';
import { useRoomStore } from '../store/useRoomStore';
import { useFederatedML } from '../hooks/useFederatedML';
import { socket } from '../services/socket';
import { authApi, roomApi, setAuthToken } from '../services/api';
import { setSocketToken } from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';

const formatWhen = (isoDate) => {
  if (!isoDate) return '-';
  return new Date(isoDate).toLocaleString();
};

export const DashboardOverlay = () => {
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [joinCode, setJoinCode] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isRoomLoading, setIsRoomLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [roomError, setRoomError] = useState('');

  const { token, user, isAuthenticated, hasHydrated, setSession, clearSession } = useAuthStore();

  // Connect Zustand state
  const {
    roomId,
    peers,
    isTraining,
    currentRound,
    workHistory,
    setRoomState,
    resetRoom,
    addWorkSnapshot,
  } = useRoomStore();

  // Connect our ML Web Worker logic
  const { startLocalTraining } = useFederatedML();

  const displayName = useMemo(() => user?.name || 'Operator', [user]);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!token) {
      setAuthToken(null);
      setSocketToken(null);
      return;
    }

    let active = true;
    setAuthToken(token);
    setSocketToken(token);

    authApi
      .me()
      .then((response) => {
        if (!active) return;
        setSession({ token, user: response.data.user });
      })
      .catch(() => {
        if (!active) return;
        setAuthToken(null);
        setSocketToken(null);
        clearSession();
        resetRoom();
      });

    return () => {
      active = false;
    };
  }, [hasHydrated, token, setSession, clearSession, resetRoom]);

  // Listen to Server commands
  useEffect(() => {
    socket.on('ROOM_STATE_UPDATE', (data) => {
      setRoomState({ peers: data.peers, currentRound: data.currentRound });
    });

    socket.on('TRAINING_STARTED', () => {
      startLocalTraining();
    });

    socket.on('GLOBAL_WEIGHTS_UPDATED', (data) => {
      setRoomState({ currentRound: data.round, globalWeights: data.globalWeights });
      addWorkSnapshot({ roomId, round: data.round, peers });
      console.log('New Global Brain received! Round:', data.round);
    });

    return () => {
      socket.off('ROOM_STATE_UPDATE');
      socket.off('TRAINING_STARTED');
      socket.off('GLOBAL_WEIGHTS_UPDATED');
    };
  }, [setRoomState, startLocalTraining, addWorkSnapshot, roomId, peers]);

  const handleAuthFieldChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    try {
      const payload = {
        email: authForm.email.trim().toLowerCase(),
        password: authForm.password,
      };

      let response;
      if (authMode === 'signup') {
        response = await authApi.register({ ...payload, name: authForm.name.trim() });
      } else {
        response = await authApi.login(payload);
      }

      const { token: nextToken, user: nextUser } = response.data;
      setAuthToken(nextToken);
      setSocketToken(nextToken);
      setSession({ token: nextToken, user: nextUser });
      setAuthForm({ name: '', email: '', password: '' });
    } catch (error) {
      setAuthError(error?.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setSocketToken(null);
    clearSession();
    resetRoom();
    setJoinCode('');
  };

  const joinRoom = (nextRoomId) => {
    const normalized = String(nextRoomId || '').trim().toUpperCase();
    if (!normalized) {
      setRoomError('Room ID is required.');
      return;
    }

    setRoomError('');
    setRoomState({ roomId: normalized });
    addWorkSnapshot({ roomId: normalized, round: currentRound, peers });
    socket.emit('JOIN_ROOM', { roomId: normalized, userId: user?.id });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    joinRoom(joinCode);
  };

  const handleCreateRoom = async () => {
    setRoomError('');
    setIsRoomLoading(true);
    try {
      const response = await roomApi.create({});
      const createdRoomId = response.data.roomId;
      setJoinCode(createdRoomId);
      joinRoom(createdRoomId);
    } catch (error) {
      setRoomError(error?.response?.data?.message || 'Unable to create room.');
    } finally {
      setIsRoomLoading(false);
    }
  };

  const handleStartEpoch = () => {
    socket.emit('START_TRAINING', { roomId });
  };

  if (!hasHydrated) {
    return (
      <div className="w-full h-full p-8 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto bg-black/40 border border-white/10 px-8 py-4 rounded-xl text-sm text-gray-300">
          Loading session...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 sm:p-8 flex flex-col justify-between pointer-events-none">
      
      {/* Header / Branding */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center flex-wrap gap-3"
      >
        <h1 className="text-2xl sm:text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
          HIVEMIND<span className="text-white text-xl">.OS</span>
        </h1>
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full">
            <Activity size={18} className="text-cyan-400" />
            <span className="text-sm font-medium tracking-wide">Coordinator Status: ONLINE</span>
          </div>
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full text-sm"
            >
              <LogOut size={16} />
              Logout
            </button>
          )}
        </div>
      </motion.div>

      {/* Main Control Panel */}
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <motion.div
            key="auth-state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(420px,calc(100vw-2rem))] bg-black/55 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-2xl pointer-events-auto"
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield size={20} className="text-cyan-400" />
              <h2 className="text-2xl font-bold">Secure Access</h2>
            </div>

            <div className="mb-6 inline-flex rounded-lg border border-white/10 overflow-hidden">
              <button
                onClick={() => setAuthMode('login')}
                className={`px-4 py-2 text-sm ${authMode === 'login' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-transparent text-gray-300'}`}
              >
                Login
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className={`px-4 py-2 text-sm ${authMode === 'signup' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-transparent text-gray-300'}`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              {authMode === 'signup' && (
                <input
                  name="name"
                  type="text"
                  required
                  value={authForm.name}
                  onChange={handleAuthFieldChange}
                  placeholder="Your name"
                  className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-400"
                />
              )}

              <input
                name="email"
                type="email"
                required
                value={authForm.email}
                onChange={handleAuthFieldChange}
                placeholder="Email"
                className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-400"
              />

              <input
                name="password"
                type="password"
                required
                minLength={6}
                value={authForm.password}
                onChange={handleAuthFieldChange}
                placeholder="Password"
                className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-400"
              />

              {authError && <p className="text-red-300 text-sm">{authError}</p>}

              <button
                type="submit"
                disabled={isAuthLoading}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60 text-white font-bold py-3 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
              >
                {isAuthLoading ? 'Please wait...' : authMode === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            </form>
          </motion.div>
        ) : !roomId ? (
          // STATE 1: JOIN ROOM
          <motion.div 
            key="join-state"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(460px,calc(100vw-2rem))] bg-black/40 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-2xl pointer-events-auto"
          >
            <p className="text-xs uppercase tracking-widest text-cyan-300 mb-2">Signed in as {displayName}</p>
            <h2 className="text-2xl font-bold mb-2">Connect to Nexus</h2>
            <p className="text-gray-400 text-sm mb-6">Enter a room code to contribute your GPU to the swarm.</p>
            
            <form onSubmit={handleJoinRoom} className="flex flex-col gap-4">
              <input 
                type="text" 
                placeholder="Room ID (e.g., ALPHA-7)" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-400 transition-colors uppercase font-mono"
              />
              <button 
                type="submit"
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
              >
                Establish Link
              </button>
            </form>

            <button
              type="button"
              onClick={handleCreateRoom}
              disabled={isRoomLoading}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-60 text-cyan-200 font-semibold py-3 rounded-lg"
            >
              <Plus size={16} />
              {isRoomLoading ? 'Creating Room...' : 'Create New Room'}
            </button>

            {roomError && <p className="text-red-300 text-sm mt-3">{roomError}</p>}

            {workHistory.length > 0 && (
              <div className="mt-6 pt-5 border-t border-white/10">
                <div className="inline-flex items-center gap-2 text-gray-300 text-sm mb-3">
                  <History size={16} />
                  Saved Previous Work
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {workHistory.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => joinRoom(item.roomId)}
                      className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2"
                    >
                      <p className="text-cyan-300 font-mono font-semibold">{item.roomId}</p>
                      <p className="text-xs text-gray-400">Round {item.round} | {item.peers} peers | {formatWhen(item.updatedAt)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

        ) : (
          // STATE 2: ACTIVE DASHBOARD
          <motion.div 
            key="dashboard-state"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute bottom-4 left-4 sm:bottom-8 sm:left-8 right-4 sm:right-auto flex flex-col gap-4 pointer-events-auto"
          >
            {/* Stats Panel */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-4 sm:p-6 rounded-2xl w-full sm:w-[320px] flex flex-col gap-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest">Active Nexus</p>
                  <p className="text-xl font-mono font-bold text-cyan-400">{roomId}</p>
                  <p className="text-xs text-gray-500 mt-1">User: {displayName}</p>
                </div>
                <div className="bg-cyan-500/20 p-2 rounded-lg">
                  <Cpu className="text-cyan-400" />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-fuchsia-400" />
                  <span className="text-sm text-gray-300">Swarm Peers</span>
                </div>
                <span className="font-mono text-lg font-bold">{peers}</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-green-400" />
                  <span className="text-sm text-gray-300">Global Round</span>
                </div>
                <span className="font-mono text-lg font-bold">{currentRound}</span>
              </div>
            </div>

            {workHistory.length > 0 && (
              <div className="bg-black/30 backdrop-blur-xl border border-white/10 p-4 rounded-2xl w-full sm:w-[320px]">
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Recent Sessions</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {workHistory.slice(0, 4).map((item) => (
                    <div key={item.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-cyan-300 font-mono text-sm">{item.roomId}</span>
                        <span className="text-xs text-gray-400">R{item.round}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">{formatWhen(item.updatedAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <button 
              onClick={handleStartEpoch}
              disabled={isTraining || peers === 0}
              className={`flex items-center justify-center gap-2 py-4 rounded-xl font-bold tracking-wide transition-all shadow-lg ${
                isTraining 
                  ? 'bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed'
                  : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-[0_0_30px_rgba(192,38,211,0.4)]'
              }`}
            >
              {isTraining ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-gray-500 animate-spin" />
                  Crunching Tensors...
                </>
              ) : (
                <>
                  <Play size={18} fill="currentColor" />
                  Initiate Swarm Epoch
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};