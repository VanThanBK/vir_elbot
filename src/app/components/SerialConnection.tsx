'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { JointState } from '../types/robot';

interface SerialConnectionProps {
  jointStates: JointState;
  onDataReceived?: (data: JointState) => void;
}

export default function SerialConnection({ jointStates, onDataReceived }: SerialConnectionProps) {
  const [port, setPort] = useState<any>(null); // SerialPort type
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [reader, setReader] = useState<ReadableStreamDefaultReader | null>(null);
  const [writer, setWriter] = useState<WritableStreamDefaultWriter | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [autoSend, setAutoSend] = useState(false);
  const [commandBuffer, setCommandBuffer] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);
  const [currentJointStates, setCurrentJointStates] = useState<JointState>({
    theta1: 0,
    theta2: 0,
    theta3: 0,
    theta4: 0,
    theta5: 0,
    theta6: 0,
  });

  // Check if Web Serial API is supported - use state to avoid hydration mismatch
  const [isWebSerialSupported, setIsWebSerialSupported] = useState(false);

  useEffect(() => {
    // Check for Web Serial API support on client side only
    setIsWebSerialSupported(typeof navigator !== 'undefined' && 'serial' in navigator);
  }, []);

  const addToLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
  }, []);

  const connectToSerial = async () => {
    if (!isWebSerialSupported) {
      addToLog('Web Serial API is not supported in this browser');
      return;
    }

    try {
      setIsConnecting(true);
      
      // Request a port and open a connection
      const selectedPort = await (navigator as any).serial.requestPort();
      await selectedPort.open({ 
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });

      setPort(selectedPort);
      setIsConnected(true);
      addToLog('Connected to serial port');

      // Set up reader for incoming data
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = selectedPort.readable.pipeTo(textDecoder.writable);
      const portReader = textDecoder.readable.getReader();
      setReader(portReader);

      // Set up writer for outgoing data
      const textEncoder = new TextEncoderStream();
      const writableStreamClosed = textEncoder.readable.pipeTo(selectedPort.writable);
      const portWriter = textEncoder.writable.getWriter();
      setWriter(portWriter);

      // Start reading data
      readSerialData(portReader);

    } catch (error) {
      console.error('Error connecting to serial port:', error);
      addToLog(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const smoothMoveTo = (targetStates: JointState, feedRate: number) => {
    if (isMoving || !onDataReceived) return;

    setIsMoving(true);
    const startStates = { ...jointStates };
    const startTime = Date.now();

    // Calculate movement duration based on feed rate and maximum angle difference
    const maxAngleDiffDeg = Math.max(
      ...Object.keys(targetStates).map(joint => {
        const startRad = startStates[joint] || 0;
        const targetRad = targetStates[joint] || 0;
        return Math.abs((targetRad - startRad) * 180 / Math.PI); // Convert to degrees
      })
    );
    
    // Duration calculation: feedRate is degrees/minute
    // Time = angle / speed = degrees / (degrees/minute) = minutes
    // Convert to milliseconds
    const durationMinutes = maxAngleDiffDeg / feedRate;
    const duration = Math.max(100, durationMinutes * 60 * 1000); // Minimum 100ms
    
    addToLog(`Movement duration: ${duration.toFixed(0)}ms for ${maxAngleDiffDeg.toFixed(1)}° at ${feedRate}°/min`);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Linear movement (no easing for more predictable timing)
      const currentStates: JointState = {};
      
      Object.keys(targetStates).forEach(joint => {
        const start = startStates[joint] || 0;
        const target = targetStates[joint] || 0;
        currentStates[joint] = start + (target - start) * progress;
      });

      onDataReceived(currentStates);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsMoving(false);
        addToLog('Movement completed');
        // Send "Ok" response when movement is complete
        setTimeout(() => {
          sendOkResponse();
        }, 50); // Small delay to ensure state is updated
      }
    };

    requestAnimationFrame(animate);
  };

  const processCommand = (command: string) => {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) return;

    addToLog(`Received: ${trimmedCommand}`);

    // Parse incoming G06 commands
    // Expected format: "G06 X45.0 Y-30.0 Z60.0 W0.0 U90.0 V-180.0 F500"
    if (trimmedCommand.startsWith('G06')) {
      try {
        const degToRad = (deg: number) => (deg * Math.PI) / 180;
        const newJointStates: JointState = {};
        
        // Extract joint values and feed rate using regex
        const xMatch = trimmedCommand.match(/X([-+]?\d*\.?\d+)/);
        const yMatch = trimmedCommand.match(/Y([-+]?\d*\.?\d+)/);
        const zMatch = trimmedCommand.match(/Z([-+]?\d*\.?\d+)/);
        const wMatch = trimmedCommand.match(/W([-+]?\d*\.?\d+)/);
        const uMatch = trimmedCommand.match(/U([-+]?\d*\.?\d+)/);
        const vMatch = trimmedCommand.match(/V([-+]?\d*\.?\d+)/);
        const fMatch = trimmedCommand.match(/F([-+]?\d*\.?\d+)/);
        
        if (xMatch) newJointStates.theta1 = degToRad(parseFloat(xMatch[1]));
        if (yMatch) newJointStates.theta2 = degToRad(parseFloat(yMatch[1]));
        if (zMatch) newJointStates.theta3 = degToRad(parseFloat(zMatch[1]));
        if (wMatch) newJointStates.theta4 = degToRad(parseFloat(wMatch[1]));
        if (uMatch) newJointStates.theta5 = degToRad(parseFloat(uMatch[1]));
        if (vMatch) newJointStates.theta6 = degToRad(parseFloat(vMatch[1]));

        const feedRate = fMatch ? parseFloat(fMatch[1]) : 500; // Default 500 deg/min

        if (Object.keys(newJointStates).length > 0) {
          addToLog(`Moving to: X=${xMatch?.[1] || '0'} Y=${yMatch?.[1] || '0'} Z=${zMatch?.[1] || '0'} W=${wMatch?.[1] || '0'} U=${uMatch?.[1] || '0'} V=${vMatch?.[1] || '0'} F${feedRate}`);
          
          // Start smooth movement
          smoothMoveTo(newJointStates, feedRate);
        }
      } catch (parseError) {
        addToLog(`Parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    }
  };

  const readSerialData = async (portReader: ReadableStreamDefaultReader) => {
    try {
      let buffer = '';
      
      while (true) {
        const { value, done } = await portReader.read();
        if (done) break;

        // Add received data to buffer
        buffer += value;

        // Process complete commands (ending with \n)
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const command = buffer.substring(0, newlineIndex);
          buffer = buffer.substring(newlineIndex + 1);
          
          // Process the complete command
          processCommand(command);
        }
      }
    } catch (error) {
      console.error('Error reading serial data:', error);
      addToLog(`Read error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const disconnectSerial = async () => {
    try {
      if (reader) {
        await reader.cancel();
        setReader(null);
      }
      if (writer) {
        await writer.close();
        setWriter(null);
      }
      if (port) {
        await port.close();
        setPort(null);
      }
      setIsConnected(false);
      addToLog('Disconnected from serial port');
    } catch (error) {
      console.error('Error disconnecting:', error);
      addToLog(`Disconnect error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const sendOkResponse = async () => {
    if (!writer || !isConnected) {
      return;
    }

    try {
      await writer.write('Ok\n');
      addToLog('Sent: Ok');
    } catch (error) {
      console.error('Error sending Ok response:', error);
      addToLog(`Send error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const sendJointStates = async () => {
    if (!writer || !isConnected) {
      addToLog('Not connected to serial port');
      return;
    }

    try {
      // Convert radians to degrees for robot command
      const radToDeg = (rad: number) => (rad * 180) / Math.PI;
      
      // Format: G06 X100.0 Y100.0 Z100.0 W100.0 U100.0 V100.0 F500
      // Order: theta1(X), theta2(Y), theta3(Z), theta4(W), theta5(U), theta6(V)
      const command = `G06 X${radToDeg(jointStates.theta1 || 0).toFixed(1)} Y${radToDeg(jointStates.theta2 || 0).toFixed(1)} Z${radToDeg(jointStates.theta3 || 0).toFixed(1)} W${radToDeg(jointStates.theta4 || 0).toFixed(1)} U${radToDeg(jointStates.theta5 || 0).toFixed(1)} V${radToDeg(jointStates.theta6 || 0).toFixed(1)} F500\n`;
      
      await writer.write(command);
      addToLog(`Sent: ${command.trim()}`);
    } catch (error) {
      console.error('Error sending data:', error);
      addToLog(`Send error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Auto-send joint states when they change (if enabled)
  useEffect(() => {
    if (autoSend && isConnected) {
      const timeoutId = setTimeout(() => {
        sendJointStates();
      }, 100); // Debounce sends
      
      return () => clearTimeout(timeoutId);
    }
  }, [jointStates, autoSend, isConnected]);

  const clearLog = () => {
    setLog([]);
  };

  // Show loading state during hydration to avoid mismatch
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Serial Connection</h3>
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isWebSerialSupported) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-red-800">Serial Connection</h3>
        <p className="text-red-600">
          Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Serial Connection</h3>
      
      <div className="space-y-4">
        {/* Connection Controls */}
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          
          {isMoving && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-sm text-orange-600 font-medium">Moving...</span>
            </div>
          )}
          
          {!isConnected ? (
            <button
              onClick={connectToSerial}
              disabled={isConnecting}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          ) : (
            <button
              onClick={disconnectSerial}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Auto-send Toggle */}
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSend}
              onChange={(e) => setAutoSend(e.target.checked)}
              disabled={!isConnected}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto-send joint states</span>
          </label>
        </div>

        {/* Manual Send Button */}
        <button
          onClick={sendJointStates}
          disabled={!isConnected}
          className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 transition-colors ${
            isConnected
              ? 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Send Joint States
        </button>

        {/* Communication Log */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-gray-700">Communication Log</h4>
            <button
              onClick={clearLog}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Clear
            </button>
          </div>
          
          <div className="h-32 p-2 bg-gray-50 border border-gray-200 rounded-lg overflow-y-auto">
            {log.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No communication yet...</p>
            ) : (
              log.map((entry, index) => (
                <div key={index} className="text-xs text-gray-600 font-mono mb-1">
                  {entry}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Protocol Info */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-1">Communication Protocol</h4>
          <div className="text-xs text-blue-600 space-y-1">
            <div><strong>Baud Rate:</strong> 115200</div>
            <div><strong>Receive Format:</strong> G06 X100.0 Y100.0 Z100.0 W100.0 U100.0 V100.0 F500</div>
            <div><strong>Send Response:</strong> Ok (after movement co