# İnsangram Satranç

A real-time multiplayer chess application designed for quick matchmaking without user login, built with React and Node.js.

## Features

- **Quick Matchmaking**: Find an opponent and start playing immediately
- **No Login Required**: Play anonymously without account creation
- **Time Controls**: Choose from various time settings (1, 3, 5, 10, 15, 30 minutes)
- **Increments**: Add time increments (0, 1, 2, 3, 5, 10 seconds per move)
- **Real-time Gameplay**: Powered by Socket.io
- **Mobile-Friendly**: Responsive design for all devices
- **In-game Chat**: Communicate with your opponent
- **Move History**: Track the moves played in your game

## Tech Stack

### Frontend
- React.js
- React Router
- Chess.js for chess logic
- React Chessboard for the UI
- Socket.io client for real-time communication

### Backend
- Node.js
- Express.js
- Socket.io for real-time communication
- Chess.js for server-side validation

### Deployment
- Docker & Docker Compose
- Nginx for serving the frontend
- SSL/TLS support

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm (v7 or higher)
- Docker and Docker Compose (for deployment)

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/insangramSatranc.git
cd insangramSatranc
