/**
 * WebSocket client with socket.io-like API
 * Provides event-based interface compatible with existing socket.io usage
 */

type EventCallback<T = unknown> = (data: T) => void;

interface EventHandlers {
  [event: string]: EventCallback | undefined;
}

export interface WebSocketClient {
  on<T = unknown>(event: string, callback: EventCallback<T>): WebSocketClient;
  off(event: string): WebSocketClient;
  emit(event: string, data?: Record<string, unknown>): WebSocketClient;
  disconnect(): void;
  connected: boolean;
}

export const createWebSocketClient = (url: string): WebSocketClient => {
  let ws: WebSocket | null = null;
  const handlers: EventHandlers = {};

  const connect = (): void => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      return;
    }

    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("WebSocket connected");
      trigger("connect");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as { type?: string };

        if (message.type) {
          trigger(message.type, message);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
      ws = null;
      trigger("disconnect");
    };
  };

  const trigger = <T = unknown>(event: string, data?: T): void => {
    const callback = handlers[event];
    if (callback) {
      try {
        callback(data as T);
      } catch (error) {
        console.error(`Error in ${event} handler:`, error);
      }
    }
  };

  // Initialize connection
  connect();

  const client: WebSocketClient = {
    /**
     * Register an event listener (socket.io-compatible)
     */
    on: <T = unknown>(event: string, callback: EventCallback<T>): WebSocketClient => {
      handlers[event] = callback as EventCallback;
      return client;
    },

    /**
     * Remove an event listener (socket.io-compatible)
     */
    off: (event: string): WebSocketClient => {
      delete handlers[event];
      return client;
    },

    /**
     * Emit an event to the server (socket.io-compatible)
     */
    emit: (event: string, data?: Record<string, unknown>): WebSocketClient => {
      const message = data ? { type: event, ...data } : { type: event };

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      } else {
        console.warn(`Cannot emit "${event}": WebSocket not connected`);
      }

      return client;
    },

    /**
     * Disconnect the WebSocket
     */
    disconnect: (): void => {
      if (ws) {
        ws.close();
        ws = null;
      }
    },

    /**
     * Get connection state
     */
    get connected(): boolean {
      return ws !== null && ws.readyState === WebSocket.OPEN;
    },
  };

  return client;
};
