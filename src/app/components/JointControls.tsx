'use client';

import React from 'react';
import { JointState } from '../types/robot';

interface JointControlsProps {
  jointStates: JointState;
  onJointChange: (jointName: string, value: number) => void;
  onSendToSerial?: () => void;
  isConnected?: boolean;
}

export default function JointControls({
  jointStates,
  onJointChange,
  onSendToSerial,
  isConnected = false
}: JointControlsProps) {
  const jointNames = [
    'theta1',
    'theta2', 
    'theta3',
    'theta4',
    'theta5',
    'theta6'
  ];

  // Joint limits based on robot specifications
  const jointLimits = {
    theta1: { min: -170, max: 170 },
    theta2: { min: -100, max: 130 },
    theta3: { min: -90, max: 75 },
    theta4: { min: -180, max: 180 },
    theta5: { min: -120, max: 120 },
    theta6: { min: -360, max: 360 }
  };

  const handleReset = () => {
    jointNames.forEach(jointName => {
      onJointChange(jointName, 0);
    });
  };

  const radToDeg = (rad: number) => (rad * 180) / Math.PI;
  const degToRad = (deg: number) => (deg * Math.PI) / 180;

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Joint Controls</h3>
      
      <div className="space-y-4">
        {jointNames.map((jointName) => {
          const currentValue = jointStates[jointName] || 0;
          const currentDegrees = radToDeg(currentValue);
          const limits = jointLimits[jointName as keyof typeof jointLimits];
          
          return (
            <div key={jointName} className="flex items-center space-x-4">
              <label className="w-16 text-sm font-medium text-gray-700">
                {jointName}:
              </label>
              
              <div className="flex-1">
                <input
                  type="range"
                  min={limits.min}
                  max={limits.max}
                  step="1"
                  value={Math.max(limits.min, Math.min(limits.max, currentDegrees))}
                  onChange={(e) => {
                    const degrees = parseFloat(e.target.value);
                    const radians = degToRad(degrees);
                    onJointChange(jointName, radians);
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{limits.min}°</span>
                  <span>0°</span>
                  <span>{limits.max}°</span>
                </div>
              </div>
              
              <div className="w-20 text-right">
                <input
                  type="number"
                  min={limits.min}
                  max={limits.max}
                  step="0.1"
                  value={currentDegrees.toFixed(1)}
                  onChange={(e) => {
                    const degrees = parseFloat(e.target.value);
                    if (!isNaN(degrees)) {
                      const clampedDegrees = Math.max(limits.min, Math.min(limits.max, degrees));
                      const radians = degToRad(clampedDegrees);
                      onJointChange(jointName, radians);
                    }
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-xs text-gray-500 text-center">degrees</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex space-x-3">
        <button
          onClick={handleReset}
          className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
        >
          Reset All
        </button>
        
        {onSendToSerial && (
          <button
            onClick={onSendToSerial}
            disabled={!isConnected}
            className={`flex-1 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              isConnected
                ? 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Send to Robot
          </button>
        )}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Current Joint Values (Radians):</h4>
        <div className="text-xs text-gray-600 font-mono">
          {jointNames.map(jointName => (
            <div key={jointName} className="flex justify-between">
              <span>{jointName}:</span>
              <span>{(jointStates[jointName] || 0).toFixed(3)}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 0 2px 0 #555;
          transition: background .15s ease-in-out;
        }

        .slider::-webkit-slider-thumb:hover {
          background: #2563eb;
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 2px 0 #555;
          transition: background .15s ease-in-out;
        }

        .slider::-moz-range-thumb:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
}
