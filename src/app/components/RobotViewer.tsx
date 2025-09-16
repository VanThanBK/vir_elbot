'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { JointState } from '../types/robot';
import URDFLoader from '../utils/urdf_loaders/URDFLoader.js';

interface RobotMeshProps {
  robotModel: any; // URDFRobot from URDFClasses
  jointStates: JointState;
}

function RobotMesh({ robotModel, jointStates }: RobotMeshProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Update joint transformations
  useFrame(() => {
    if (!robotModel) return;

    // Apply joint values to the robot model
    Object.entries(jointStates).forEach(([jointName, angle]) => {
      robotModel.setJointValue(jointName, angle);
    });
  });

  if (!robotModel) return null;

  return (
    <group ref={groupRef}>
      <primitive object={robotModel} />
    </group>
  );
}

interface RobotViewerProps {
  jointStates: JointState;
}

export default function RobotViewer({ jointStates }: RobotViewerProps) {
  const [robotModel, setRobotModel] = useState<any>(null); // URDFRobot
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRobot = () => {
      try {
        setLoading(true);
        const loader = new URDFLoader();
        
        // Set up the working path for mesh files
        loader.workingPath = '/';
        
        loader.load(
          '/elbot_ros.urdf',
          (model: any) => {
            setRobotModel(model);
            setError(null);
            setLoading(false);

            model.rotation.set(-90 * Math.PI / 180, 0, 0);
            model.position.set(0, -0.5, 0);
            
            console.log('Robot loaded:', model);
            console.log('Available joints:', Object.keys(model.joints));
          },
          (progress: any) => {
            // Progress callback - optional
          },
          (err: any) => {
            console.error('Failed to load robot model:', err);
            setError(err instanceof Error ? err.message : 'Failed to load robot model');
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Failed to load robot model:', err);
        setError(err instanceof Error ? err.message : 'Failed to load robot model');
        setLoading(false);
      }
    };

    loadRobot();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading robot model...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!robotModel) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">No robot model loaded</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [2, 2, 2], fov: 50 }}
        style={{ background: '#f0f0f0' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <RobotMesh robotModel={robotModel} jointStates={jointStates} />
        
        <Grid
          position={[0, -0.5, 0]}
          args={[10, 10]}
          cellSize={0.1}
          cellThickness={0.5}
          cellColor="#6f6f6f"
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#9d4b4b"
          fadeDistance={25}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={true}
        />
        
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={0.5}
          maxDistance={10}
        />
      </Canvas>
    </div>
  );
}
