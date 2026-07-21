class WebSocketManager {
  constructor() {
    this.socket = null;
    this.url = '';
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 30000;      // 30s ceiling
    this.baseDelay = 1000;               // 1s starting point
    this.reconnectTimer = null;
    this.shouldReconnect = true;         // flips false on intentional disconnect()
    this.eventHandlers = new Set();
    this.statusHandlers = new Set();
  }

  connect(projectId, token) {
    const rawWsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
    const baseWsUrl = rawWsUrl.endsWith("/api/v1") ? rawWsUrl : `${rawWsUrl.replace(/\/+$/, '')}/api/v1`;
    this.url = `${baseWsUrl}/ws/projects/${projectId}?token=${token}`;
    this.shouldReconnect = true;
    this._openSocket();
  }

  _openSocket() {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this._notifyStatus('connected');
    };

    this.socket.onmessage = (msg) => {
        console.log("WS RAW MESSAGE:", msg.data);

      try {
        const data = JSON.parse(msg.data);
            console.log("WS PARSED:", data);

        this.eventHandlers.forEach((handler) => handler(data));
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    this.socket.onclose = (event) => {
      this._notifyStatus('disconnected');
      if (event.code === 1008) {
        this._notifyStatus('auth_failed');
        return;
      }
      if (this.shouldReconnect) {
        this._scheduleReconnect();
      }
    };

    this.socket.onerror = () => {
      console.error('WebSocket error');
    };
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return;

    const exponentialDelay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    const jitter = exponentialDelay * 0.3 * Math.random();
    const delay = exponentialDelay + jitter;

    this._notifyStatus('reconnecting');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      this._openSocket();
    }, delay);
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  onMessage(handler) {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  onStatusChange(handler) {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  _notifyStatus(status) {
    this.statusHandlers.forEach((handler) => handler(status));
  }
}

export const wsManager = new WebSocketManager();