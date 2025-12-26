import { createWebSocketClient } from "./utils/websocket-client";

export const socket = createWebSocketClient(import.meta.env.VITE_API_URL);
