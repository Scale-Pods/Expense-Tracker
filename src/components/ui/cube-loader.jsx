'use client'

import React from 'react'

export default function CubeLoader() {
  return (
    <div className='cube-wrapper-fullscreen'>
      <div className='cube-loader-container perspective-container'>
        
        {/* 3D Scene Wrapper */}
        <div className='cube-scene preserve-3d'>
          
          {/* THE SPINNING CUBE CONTAINER */}
          <div className='cube-assembly preserve-3d animate-cube-spin'>
            
            {/* Internal Core (The energy source) */}
            <div className='cube-core animate-pulse-fast' />

            {/* CUBE FACES */}
            {/* Front */}
            <div className='side-wrapper front'>
              <div className='face face-cyan' />
            </div>
            
            {/* Back */}
            <div className='side-wrapper back'>
              <div className='face face-cyan' />
            </div>

            {/* Right */}
            <div className='side-wrapper right'>
              <div className='face face-purple' />
            </div>

            {/* Left */}
            <div className='side-wrapper left'>
              <div className='face face-purple' />
            </div>

            {/* Top */}
            <div className='side-wrapper top'>
              <div className='face face-indigo' />
            </div>

            {/* Bottom */}
            <div className='side-wrapper bottom'>
              <div className='face face-indigo' />
            </div>
          </div>

          {/* Floor Shadow (Scales with the breathing) */}
          <div className='cube-shadow animate-shadow-breathe' />
        </div>

        {/* Loading Text */}
        <div className='cube-loading-text'>
          <h3 className='loading-title'>
            Loading
          </h3>
        </div>
      </div>

      <style>{`
        .cube-wrapper-fullscreen {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          background: rgba(10, 15, 25, 0.4);
          backdrop-filter: blur(12px);
          pointer-events: none;
          /* Center in the content area by offsetting the sidebar width */
          padding-left: 280px; 
        }

        @media (max-width: 1024px) {
          .cube-wrapper-fullscreen {
            padding-left: 0;
          }
        }

        .cube-loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 60px;
          perspective: 1200px;
        }

        .cube-scene {
          position: relative;
          width: 160px;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform-style: preserve-3d;
        }

        .cube-assembly {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
        }

        .cube-core {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 50px;
          height: 50px;
          background: white;
          border-radius: 9999px;
          filter: blur(12px);
          box-shadow: 0 0 60px rgba(255, 255, 255, 0.9);
        }

        .cube-shadow {
          position: absolute;
          bottom: -120px;
          width: 160px;
          height: 40px;
          background: rgba(0, 0, 0, 0.5);
          filter: blur(30px);
          border-radius: 100%;
        }

        .cube-loading-text {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 20px;
        }

        .loading-title {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.5em;
          color: #67e8f9;
          text-transform: uppercase;
          margin: 0;
          text-shadow: 0 0 20px rgba(103, 232, 249, 0.5);
        }

        .preserve-3d {
          transform-style: preserve-3d;
        }

        @keyframes cubeSpin {
          0% { transform: rotateX(0deg) rotateY(0deg); }
          100% { transform: rotateX(360deg) rotateY(360deg); }
        }

        @keyframes breathe {
          0%, 100% { transform: translateZ(80px); opacity: 0.9; }
          50% { transform: translateZ(130px); opacity: 0.4; border-color: rgba(255,255,255,0.8); }
        }

        @keyframes pulse-fast {
            0%, 100% { transform: scale(0.8); opacity: 0.6; }
            50% { transform: scale(1.3); opacity: 1; }
        }

        @keyframes shadow-breathe {
            0%, 100% { transform: scale(1); opacity: 0.4; }
            50% { transform: scale(1.6); opacity: 0.2; }
        }

        .animate-cube-spin {
          animation: cubeSpin 10s linear infinite;
        }

        .animate-pulse-fast {
            animation: pulse-fast 2s ease-in-out infinite;
        }

        .animate-shadow-breathe {
            animation: shadow-breathe 3s ease-in-out infinite;
        }

        .side-wrapper {
          position: absolute;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          transform-style: preserve-3d;
        }

        .face {
          width: 100%;
          height: 100%;
          position: absolute;
          animation: breathe 3s ease-in-out infinite;
          backdrop-filter: blur(4px);
          border: 2px solid transparent;
        }

        .face-cyan {
          background: rgba(6, 182, 212, 0.15);
          border-color: #22d3ee;
          box-shadow: 0 0 25px rgba(34, 211, 238, 0.5);
        }

        .face-purple {
          background: rgba(168, 85, 247, 0.15);
          border-color: #a855f7;
          box-shadow: 0 0 25px rgba(168, 85, 247, 0.5);
        }

        .face-indigo {
          background: rgba(79, 70, 229, 0.15);
          border-color: #818cf8;
          box-shadow: 0 0 25px rgba(99, 102, 241, 0.5);
        }

        .front  { transform: rotateY(0deg); }
        .back   { transform: rotateY(180deg); }
        .right  { transform: rotateY(90deg); }
        .left   { transform: rotateY(-90deg); }
        .top    { transform: rotateX(90deg); }
        .bottom { transform: rotateX(-90deg); }
      `}</style>
    </div>
  )
}
