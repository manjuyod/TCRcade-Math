import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { useEffect } from "react";

// Add custom styling to match the design
const CustomStyles = () => {
  useEffect(() => {
    // Add global styles
    const style = document.createElement('style');
    style.innerHTML = `
      body {
        font-family: 'Nunito', sans-serif;
        background-color: #F9F9F9;
        overflow-x: hidden;
      }
      .card {
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      }
      .token-shine {
        background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%);
        width: 50px;
        height: 100%;
        animation: shine 1.5s infinite;
        position: absolute;
        top: 0;
        left: -100%;
      }
      @keyframes shine {
        to {
          left: 200%;
        }
      }
      .streak-badge {
        background: linear-gradient(135deg, #FFCD1F, #FF9A3F);
        border-radius: 50%;
        height: 48px;
        width: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      .arcade-btn {
        border-radius: 12px;
        position: relative;
        overflow: hidden;
        transition: all 0.2s;
      }
      .arcade-btn:active {
        transform: translateY(3px);
      }
      .question-card {
        min-height: 240px;
        perspective: 1000px;
        transition: transform 0.6s;
      }
      .progress-bar {
        height: 12px;
        border-radius: 6px;
        background: #E9ECEF;
        overflow: hidden;
      }
      .progress-value {
        height: 100%;
        border-radius: 6px;
        background: linear-gradient(90deg, #6B4EFF, #9B7DFF);
        transition: width 0.5s ease;
      }
      .leaderboard-item {
        transition: all 0.2s;
      }
      .leaderboard-item:hover {
        transform: translateX(5px);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  return null;
};

createRoot(document.getElementById("root")!).render(
  <>
    <CustomStyles />
    <App />
  </>
);
