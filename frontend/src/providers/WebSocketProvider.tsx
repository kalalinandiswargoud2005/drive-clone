'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

const WebSocketContext = createContext<WebSocket | null>(null);

export function useWebSocket() {
  return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Connect to the WebSocket server
    const webSocket = new WebSocket('ws://localhost:8000');

    webSocket.onopen = () => {
      console.log('WebSocket connected');
      setWs(webSocket);
    };

    webSocket.onclose = () => {
      console.log('WebSocket disconnected');
      setWs(null);
    };

    // Clean up the connection when the component unmounts
    return () => {
      webSocket.close();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  );
}