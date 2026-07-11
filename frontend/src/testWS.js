import { wsManager } from "./lib/websocket";
window.wsManager = wsManager;
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOWUwMzQ0MC1hMzA2LTQ3OGYtOTc1Ny03NTQzNDc1MmU1YmIiLCJ0eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzgzNjU5MjU5fQ.qW8OKALQC5XKH8vyGQNbni86FCDl8byLjnZIMcAv964";
const projectId = "7eee8a0b-78e5-4cbf-9cf3-48b06f44497a";

wsManager.onStatusChange((status) => {
  console.log("STATUS:", status);
});

wsManager.onMessage((event) => {
  console.log("EVENT:", event);
});

wsManager.connect(projectId, token);