// Joint state interface for controlling robot joints
export interface JointState {
  [jointName: string]: number;
}

// Re-export types from URDFClasses if needed
export type { URDFRobot, URDFJoint, URDFLink } from '../utils/urdf_loaders/URDFClasses.js';
