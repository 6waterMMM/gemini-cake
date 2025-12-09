import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import { useStore } from '../store';
import { GestureType } from '../types';

const VisionController: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const { setGesture, setHandPosition, setRotationOffset } = useStore();
  
  // Refs for loop management to avoid closure staleness
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastVideoTime = useRef<number>(-1);
  const lastTimestampRef = useRef<number>(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    lastTimestampRef.current = 0; // Reset timestamp counter on mount
    
    const setup = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        
        if (!isMounted.current) return;

        // Simplify initialization: Let MediaPipe choose the best delegate automatically.
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            },
            runningMode: "VIDEO",
            numHands: 1
        });
        
        if (!isMounted.current) {
            recognizer.close();
            return;
        }

        gestureRecognizerRef.current = recognizer;
        setLoading(false);
        startWebcam();
        
      } catch (error) {
        console.error("Failed to initialize vision task:", error);
      }
    };

    setup();

    return () => {
      isMounted.current = false;
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
      if (gestureRecognizerRef.current) {
        try {
            gestureRecognizerRef.current.close();
        } catch (e) {
            // Ignore close errors
        }
      }
      if (videoRef.current) {
          videoRef.current.removeEventListener('loadeddata', predictWebcam);
      }
    };
  }, []);

  const startWebcam = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current && isMounted.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', predictWebcam);
        }
      } catch (err) {
        console.error("Webcam error:", err);
      }
    }
  };

  const predictWebcam = () => {
    if (!isMounted.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const recognizer = gestureRecognizerRef.current;

    // Ensure video is ready and has data
    if (!video || !canvas || !recognizer || video.readyState < 2) {
         requestRef.current = requestAnimationFrame(predictWebcam);
         return;
    }

    try {
        if (video.currentTime !== lastVideoTime.current) {
            lastVideoTime.current = video.currentTime;
            
            // Generate a strictly monotonically increasing timestamp
            // MediaPipe in VIDEO mode fails if timestamps are not strictly increasing
            let timestamp = Date.now();
            if (timestamp <= lastTimestampRef.current) {
                timestamp = lastTimestampRef.current + 1;
            }
            lastTimestampRef.current = timestamp;

            const results = recognizer.recognizeForVideo(video, timestamp);

            // Draw helpers (optional, good for feedback)
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

            // Logic
            if (results.gestures.length > 0) {
                const categoryName = results.gestures[0][0].categoryName;
                const handLandmarks = results.landmarks[0];
                
                const wrist = handLandmarks[0];
                const indexTip = handLandmarks[8];
                const thumbTip = handLandmarks[4];

                // 1. Detect Gesture Type
                let detectedGesture = GestureType.NONE;

                if (categoryName === 'Closed_Fist') {
                detectedGesture = GestureType.FIST;
                } else if (categoryName === 'Open_Palm') {
                detectedGesture = GestureType.OPEN_PALM;
                } else {
                // Manual Pinch Detection
                const dx = indexTip.x - thumbTip.x;
                const dy = indexTip.y - thumbTip.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < 0.05) {
                    detectedGesture = GestureType.PINCH;
                } else {
                    detectedGesture = GestureType.POINTING; // Default generic tracking
                }
                }

                setGesture(detectedGesture);

                // 2. Track Position for Rotation (X axis movement)
                // Normalize x from 0..1 to -1..1. Invert X because webcam is mirrored usually
                const normalizedX = (wrist.x - 0.5) * 2; 
                const normalizedY = -(wrist.y - 0.5) * 2; // Y up is positive in 3D
                
                setHandPosition(normalizedX, normalizedY);
                
                // If hand is moving horizontally significantly, add rotation torque
                if (Math.abs(normalizedX) > 0.2) {
                    setRotationOffset(normalizedX * 0.02);
                }
            } else {
                setGesture(GestureType.NONE);
            }
        }
    } catch (e) {
        console.warn("Prediction error:", e);
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-32 h-24 rounded-lg overflow-hidden border-2 border-gold opacity-80 bg-black">
        {loading && <div className="absolute inset-0 flex items-center justify-center text-xs text-white">Loading AI...</div>}
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full transform -scale-x-100" />
    </div>
  );
};

export default VisionController;