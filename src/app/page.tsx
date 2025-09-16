'use client';

import React, { useState, useCallback } from 'react';
import RobotViewer from './components/RobotViewer';
import JointControls from './components/JointControls';
import SerialConnection from './components/SerialConnection';
import { JointState } from './types/robot';

export default function Home() {
  const [jointStates, setJointStates] = useState<JointState>({
    theta1: 0,
    theta2: 0,
    theta3: 0,
    theta4: 0,
    theta5: 0,
    theta6: 0,
  });

  const handleJointChange = useCallback((jointName: string, value: number) => {
    setJointStates(prev => ({
      ...prev,
      [jointName]: value
    }));
  }, []);

  const handleSerialDataReceived = useCallback((newJointStates: JointState) => {
    setJointStates(prev => ({
      ...prev,
      ...newJointStates
    }));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Elbot ROS Controller</h1>
              <span className="ml-3 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                6-DOF Robotic Arm
              </span>
            </div>
            <div className="text-sm text-gray-600">
              3D Visualization & Joint Control
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 3D Robot Viewer - Takes up 2 columns on large screens */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">3D Robot Model</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Interactive visualization of the Elbot robotic arm
                </p>
              </div>
              <div className="h-96 lg:h-[600px]">
                <RobotViewer jointStates={jointStates} />
              </div>
            </div>
          </div>

          {/* Control Panel - Takes up 1 column */}
          <div className="space-y-6">
            {/* Joint Controls */}
            <JointControls
              jointStates={jointStates}
              onJointChange={handleJointChange}
            />

            {/* Serial Connection */}
            <SerialConnection
              jointStates={jointStates}
              onDataReceived={handleSerialDataReceived}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">How to Use</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">🎮 Manual Control</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Use the sliders to control each joint angle</li>
                <li>• Enter precise values in the number inputs</li>
                <li>• Click "Reset All" to return to home position</li>
                <li>• View real-time 3D visualization</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">🔌 Serial Communication</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Click "Connect" to select a COM port</li>
                <li>• Enable "Auto-send" for real-time updates</li>
                <li>• Use "Send Joint States" for manual sending</li>
                <li>• Monitor communication in the log</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">⚠️ Requirements</h4>
            <p className="text-sm text-yellow-700">
              Serial communication requires a Chromium-based browser (Chrome, Edge, Opera) 
              and HTTPS connection for the Web Serial API to work properly.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-600">
            <p>Elbot ROS Controller - 3D Robot Visualization & Control Interface</p>
            <p className="mt-2">Built with Next.js, Three.js, and Web Serial API</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
