# Gemini Project Context: ranchOSv2

This document provides a comprehensive overview of the `ranchOSv2` project, intended to be used as a contextual guide for AI-driven development.

## Project Overview

`ranchOSv2` is a web-based smart ranch management dashboard for "3 Strands Cattle Co., LLC". It provides a real-time, interactive 3D globe view of a cattle ranch, complete with simulated herd movements, sensor data, and security camera feeds.

The application is architected as a monorepo containing:

*   **Frontend**: A React application built with Vite, using Mapbox for the 3D globe visualization.
*   **Backend**: An Express.js server that provides a REST API and a sophisticated cattle herd simulation.
*   **Containerization**: The entire stack is designed to be built and run as a single Docker container.

## Architecture

The project consists of several key components:

*   **`frontend/`**: The React-based user interface.
    *   `src/`: Contains the main application components, including the Mapbox globe (`MapPanel.jsx`), sensor displays (`SensorBoard.jsx`), and various other UI panels.
    *   `vite.config.js`: Configuration for the Vite development server and build process.
    *   `dist/`: The build output directory, which is served by the Express backend in production.

*   **`server/`**: The Node.js Express backend.
    *   `index.js`: The main server file. It serves the frontend, provides the API endpoints, and runs the cattle simulation.
    *   `*.json`: Data files used by the backend to store information about users, pastures, and sensors.

*   **`simulator/`**: A standalone HTML/JavaScript application.
    *   `index.html`: Unified herd + sensor simulation console.

*   **`backend/`**: An unused Python backend.
    *   `app.py`: A FastAPI application that appears to be an alternative or previous version of the backend. It is not currently used by the main application.

*   **`Dockerfile` & `docker-compose.yml`**: Docker configuration for building and running the application.

## Building and Running

The project is designed to be run with Docker.

### Production (Docker)

1.  **Prerequisites**:
    *   Docker 24+
    *   A Mapbox access token.

2.  **Build and Run**:
    ```bash
    docker compose up --build --remove-orphans
    ```
    This command builds the Docker image (which includes running `npm run build` for the frontend) and starts the application. The dashboard will be available at [http://localhost:8082](http://localhost:8082).

### Development

The `package.json` file includes scripts for a hot-reload development environment.

1.  **Run Development Servers**:
    ```bash
    npm run dev
    ```
    This command concurrently starts:
    *   The Express server with `nodemon` for automatic restarts on file changes.
    *   The Vite development server for the React frontend with hot-reloading.

## Development Conventions

*   **Backend**: The backend is written in Node.js with Express. It uses a simulation-driven approach, with data being generated and updated in real-time. Data is stored in JSON files in the `server/` directory.
*   **Frontend**: The frontend is a modern React application built with Vite. It heavily relies on API calls to the Express backend to display data.
*   **Styling**: The project uses plain CSS for styling, with global styles defined in `frontend/src/styles/global.css`.
*   **Dependencies**: The project uses `npm` to manage its Node.js dependencies.

## Key Files

*   **`README.md`**: The main entry point for understanding the project.
*   **`package.json`**: Defines the project's dependencies and scripts.
*   **`server/index.js`**: The core of the backend application, including the simulation logic.
*   **`frontend/src/App.jsx`**: The main React application component.
*   **`frontend/src/components/MapPanel.jsx`**: The component responsible for the 3D globe visualization.
*   **`docker-compose.yml`**: Defines the Docker services.
*   **`simulator/index.html`**: Unified UI for the herd and sensor simulation console.
*   **`backend/app.py`**: An unused FastAPI backend.
