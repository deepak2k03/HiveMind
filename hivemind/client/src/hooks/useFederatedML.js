import { useEffect, useRef } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { socket } from '../services/socket';

export const useFederatedML = () => {
  const workerRef = useRef(null);
  const roomId = useRoomStore((state) => state.roomId);
  const globalWeights = useRoomStore((state) => state.globalWeights);
  const setRoomState = useRoomStore((state) => state.setRoomState);
  const fireTrainingPulse = useRoomStore((state) => state.fireTrainingPulse);
  const roomRef = useRef(roomId);
  const weightsRef = useRef(globalWeights);

  useEffect(() => {
    roomRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    weightsRef.current = globalWeights;
  }, [globalWeights]);

  useEffect(() => {
    // Instantiate the Web Worker
    workerRef.current = new Worker(new URL('../workers/tf.worker.js', import.meta.url), {
      type: 'module'
    });

    workerRef.current.postMessage({ type: 'INIT' });

    workerRef.current.onmessage = (e) => {
      const { type, weights, loss } = e.data;
      
      if (type === 'BATCH_END') {
        // Triggers the 3D laser in DataLasers.jsx without causing a React re-render!
        fireTrainingPulse();
        console.log(`Local Batch Loss: ${loss.toFixed(4)}`);
      }

      if (type === 'TRAIN_COMPLETE') {
        setRoomState({ isTraining: false });
          const activeRoomId = roomRef.current;

          if (!activeRoomId) {
            return;
          }

        console.log("Local training complete. Sending weights to HiveMind Server...");

          // Send plain arrays to keep serialization stable across browsers/server versions.
          const normalized = weights.map((layer) => Array.from(layer));
          socket.emit('SUBMIT_WEIGHTS', { roomId: activeRoomId, weights: normalized });
      }
    };

    return () => workerRef.current?.terminate();
  }, [fireTrainingPulse, setRoomState]);

  const startLocalTraining = () => {
    setRoomState({ isTraining: true });
    
    // Send command to worker to begin
    workerRef.current.postMessage({ 
      type: 'TRAIN', 
      payload: { globalWeights: weightsRef.current } 
    });
  };

  return { startLocalTraining };
};