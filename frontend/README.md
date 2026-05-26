# 🎙️ Narrato: Frontend Application

This directory houses the React and Vite frontend codebase for the **Narrato AudioBook Studio**.

For the master configuration, setup instructions, backend API reference, and full architecture details, please refer to the **[Master README.md](../README.md)** at the root of the project.

---

## 🎨 Technology Stack
- **React 19**
- **Vite 8**
- **Tailwind CSS v4** (via `@tailwindcss/vite` integration)
- **Lucide React** (icons)
- **HTML Audio API**

---

## 🚀 Local Development

While the root-level `./start.sh` script is the recommended way to start both backend and frontend environments concurrently, you can run the frontend developer server independently using standard package scripts.

### Installation
Ensure you are in the `frontend` directory and run:
```bash
npm install
```

### Run Dev Server
Launch Vite's development server (uses Hot Module Replacement):
```bash
npm run dev
```

### Build Production Bundle
To build the optimized static asset files for production deployment:
```bash
npm run build
```
The output files will be written to the `./dist` folder.
