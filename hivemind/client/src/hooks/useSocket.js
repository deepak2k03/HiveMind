import { useEffect } from 'react';
import { socket } from '../services/socket';

export const useSocket = (eventName, handler) => {
	useEffect(() => {
		if (!eventName || typeof handler !== 'function') {
			return undefined;
		}

		socket.on(eventName, handler);
		return () => {
			socket.off(eventName, handler);
		};
	}, [eventName, handler]);
};
