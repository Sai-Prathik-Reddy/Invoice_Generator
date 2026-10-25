import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  X,
  Flashlight,
  FlashlightOff,
  RefreshCw,
  Barcode as BarcodeIcon,
  CheckCircle2,
  AlertCircle,
  Keyboard,
  RotateCcw,
  ZoomIn,
} from 'lucide-react';
import { Button, Input } from './components';
import { scanCanvasForBarcodes } from './barcodeDecoder';

export function playScanFeedback(success = true) {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(success ? 1760 : 440, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch {
    // Ignore audio context errors if not permitted
  }

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(success ? [40, 25, 40] : [100, 50, 100]);
    } catch {
      // Ignore vibration error
    }
  }
}

export interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  /** Callback fired whenever a barcode is successfully detected or entered */
  onScan: (barcode: string) => void;
  title?: string;
  subtitle?: string;
  /**
   * If true, keeps the camera stream open for scanning multiple items sequentially (supermarket POS mode).
   * If false, automatically calls onScan and closes after the first scan (single-item registration mode).
   */
  continuous?: boolean;
  /** Current list of items in the invoice or catalog to show live scan feedback */
  getItemNameByBarcode?: (barcode: string) => string | undefined;
}

export function BarcodeScannerModal({
  open,
  onClose,
  onScan,
  title = 'Scan Product Barcode',
  subtitle = 'Point camera at product barcode (EAN, UPC, Code-128, QR)',
  continuous = false,
  getItemNameByBarcode,
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<1 | 1.5 | 2 | 3>(1.5);
  const [hasHardwareZoom, setHasHardwareZoom] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [lastScanned, setLastScanned] = useState<{
    code: string;
    name?: string;
    time: number;
  } | null>(null);

  // Debouncing refs for continuous mode
  const lastCodeRef = useRef<string | null>(null);
  const lastTimeRef = useRef<number>(0);
  const isScanningRef = useRef<boolean>(false);
  const zoomLevelRef = useRef<number>(1.5);

  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
    setTorchOn(false);
  }, []);

  const handleBarcodeIdentified = useCallback(
    (rawBarcode: string) => {
      const code = rawBarcode.trim();
      if (!code) return;

      const now = Date.now();
      // In continuous mode, debounce duplicate scans of the exact same barcode within 1.3s
      if (continuous) {
        if (lastCodeRef.current === code && now - lastTimeRef.current < 1300) {
          return;
        }
      }

      lastCodeRef.current = code;
      lastTimeRef.current = now;

      playScanFeedback(true);
      const itemName = getItemNameByBarcode ? getItemNameByBarcode(code) : undefined;
      setLastScanned({ code, name: itemName, time: now });
      setScanCount((prev) => prev + 1);

      onScan(code);

      if (!continuous) {
        stopCamera();
        onClose();
      }
    },
    [continuous, getItemNameByBarcode, onScan, onClose, stopCamera]
  );

  // Progressive MediaStream Acquisition
  const acquireCameraStream = useCallback(
    async (preferredFacing: 'environment' | 'user'): Promise<MediaStream> => {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported in this browser or device.');
      }

      // 1. Attempt with ideal facingMode and 1080p/720p resolution
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: preferredFacing },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
          },
          audio: false,
        });
      } catch (err1) {
        console.warn('Attempt 1 (ideal 1080p/720p) failed, trying facingMode only...', err1);
      }

      // 2. Attempt with facingMode only
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: preferredFacing },
          audio: false,
        });
      } catch (err2) {
        console.warn('Attempt 2 (facingMode) failed, trying basic video...', err2);
      }

      // 3. Fallback: Any available camera (ideal for desktop webcams and laptops)
      return await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
    },
    []
  );

  // Apply Hardware Zoom if supported by camera sensor
  const applyHardwareZoom = useCallback(async (z: number) => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const caps = (track as unknown as { getCapabilities?: () => { zoom?: { min: number; max: number } } }).getCapabilities?.();
      if (caps && caps.zoom) {
        const clamped = Math.min(caps.zoom.max, Math.max(caps.zoom.min, z));
        await (track as unknown as { applyConstraints: (c: { advanced: Array<{ zoom: number }> }) => Promise<void> }).applyConstraints({
          advanced: [{ zoom: clamped }],
        });
      }
    } catch {
      // Ignore hardware zoom error
    }
  }, []);

  const handleSetZoom = (z: 1 | 1.5 | 2 | 3) => {
    setZoomLevel(z);
    applyHardwareZoom(z);
  };

  // Start Camera Stream when Modal Opens
  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    let isMounted = true;
    setCameraLoading(true);
    setCameraError(null);
    setScanCount(0);
    setLastScanned(null);
    lastCodeRef.current = null;
    lastTimeRef.current = 0;

    async function startCamera() {
      try {
        const stream = await acquireCameraStream(facingMode);

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        // Attach stream to video element
        const video = videoRef.current;
        if (video) {
          video.muted = true;
          video.defaultMuted = true;
          video.playsInline = true;
          video.setAttribute('playsinline', '');
          video.setAttribute('webkit-playsinline', '');
          video.srcObject = stream;

          try {
            await video.play();
            if (isMounted) {
              setCameraActive(true);
              setCameraLoading(false);
            }
          } catch (playErr) {
            console.warn('Video auto-play postponed until loadedmetadata:', playErr);
          }
        }

        // Check torch & zoom capabilities + continuous autofocus
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const caps = (videoTrack as unknown as {
            getCapabilities?: () => { torch?: boolean; zoom?: { min: number; max: number }; focusMode?: string[] };
          }).getCapabilities?.();
          setHasTorch(Boolean(caps?.torch));
          setHasHardwareZoom(Boolean(caps?.zoom));

          // Enable continuous macro autofocus if supported on mobile
          if (caps && 'focusMode' in caps) {
            try {
              await (videoTrack as unknown as {
                applyConstraints: (c: { advanced: Array<{ focusMode: string }> }) => Promise<void>;
              }).applyConstraints({
                advanced: [{ focusMode: 'continuous' }],
              });
            } catch {
              // Ignore focusMode constraint failure
            }
          }

          // Apply initial zoom
          if (caps?.zoom) {
            applyHardwareZoom(zoomLevelRef.current);
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setCameraLoading(false);
        const msg =
          err instanceof Error
            ? err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
              ? 'Camera permission was denied. Please allow camera access in your browser settings, or enter the barcode number manually below.'
              : err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError'
              ? 'No camera found on this device. Please connect a webcam or type the barcode number below.'
              : err.message
            : 'Could not access the camera.';
        setCameraError(msg);
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [open, facingMode, retryKey, acquireCameraStream, applyHardwareZoom, stopCamera]);

  // Dual-Engine Barcode Detection Loop with High-Resolution RoI (Region-of-Interest) Macro Cropping
  useEffect(() => {
    if (!open || !cameraActive) return;

    let animId: number;
    let nativeDetector: { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> } | null = null;

    const BarcodeDetectorClass = (
      window as unknown as {
        BarcodeDetector?: new (opts?: { formats: string[] }) => {
          detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
        };
      }
    ).BarcodeDetector;

    if (BarcodeDetectorClass) {
      try {
        nativeDetector = new BarcodeDetectorClass({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
        });
      } catch {
        try {
          nativeDetector = new BarcodeDetectorClass();
        } catch {
          nativeDetector = null;
        }
      }
    }

    let lastDetectCheck = 0;

    const detectLoop = async (timestamp: number) => {
      const video = videoRef.current;

      if (!isScanningRef.current && video && video.readyState >= 2) {
        // Run scan every ~100ms (~10 fps)
        if (timestamp - lastDetectCheck > 100) {
          lastDetectCheck = timestamp;
          isScanningRef.current = true;

          try {
            let detectedCode: string | null = null;
            const vw = video.videoWidth || 1280;
            const vh = video.videoHeight || 720;
            const z = zoomLevelRef.current;

            // Compute high-resolution Region of Interest (RoI) matching the central reticle
            // This prevents downscaling small barcodes and provides full 1:1 sensor pixel density!
            const cropW = Math.max(160, Math.floor((vw * 0.54) / z));
            const cropH = Math.max(100, Math.floor((vh * 0.38) / z));
            const cropX = Math.floor((vw - cropW) / 2);
            const cropY = Math.floor((vh - cropH) / 2);

            if (!offscreenCanvasRef.current) {
              offscreenCanvasRef.current = document.createElement('canvas');
            }
            const canvas = offscreenCanvasRef.current;
            canvas.width = cropW;
            canvas.height = cropH;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              // Extract central reticle at 100% full native resolution without downscaling
              ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

              // 1. Try Native BarcodeDetector on the high-res cropped RoI canvas
              if (nativeDetector) {
                try {
                  const results = await nativeDetector.detect(canvas);
                  if (results && results.length > 0 && results[0]?.rawValue) {
                    detectedCode = results[0].rawValue;
                  }
                } catch {
                  // Fall through to scanline decoder
                }
              }

              // 2. If not detected by native engine, run high-pass sharpened Scanline Decoder
              if (!detectedCode) {
                detectedCode = scanCanvasForBarcodes(canvas);
              }
            }

            if (detectedCode) {
              handleBarcodeIdentified(detectedCode);
            }
          } catch {
            // Ignore frame detection failures
          } finally {
            isScanningRef.current = false;
          }
        }
      }

      animId = requestAnimationFrame(detectLoop);
    };

    animId = requestAnimationFrame(detectLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [open, cameraActive, handleBarcodeIdentified]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      await (
        track as unknown as { applyConstraints: (c: { advanced: Array<{ torch: boolean }> }) => Promise<void> }
      ).applyConstraints({
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn(!torchOn);
    } catch {
      // Ignore torch error
    }
  };

  const flipCamera = () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeIdentified(manualCode.trim());
    setManualCode('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl border border-gold/40 bg-slate-950/95 text-foreground shadow-2xl overflow-hidden flex flex-col max-h-[94dvh]">
        {/* Top Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-border/80 bg-slate-900/90 z-20">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold shrink-0">
              <BarcodeIcon className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="font-display text-sm sm:text-base font-bold text-foreground truncate">
                {title}
              </h3>
              <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasTorch && cameraActive ? (
              <button
                type="button"
                onClick={toggleTorch}
                title={torchOn ? 'Turn off torch' : 'Turn on torch'}
                className={`p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                  torchOn
                    ? 'border-gold bg-gold/30 text-gold'
                    : 'border-border/80 bg-muted/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
              </button>
            ) : null}

            {cameraActive ? (
              <button
                type="button"
                onClick={flipCamera}
                title={`Switch to ${facingMode === 'environment' ? 'Front' : 'Rear'} Camera`}
                className="p-2 rounded-xl border border-border/80 bg-muted/40 text-muted-foreground hover:text-foreground cursor-pointer transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-2 rounded-xl border border-border/80 bg-muted/40 text-muted-foreground hover:text-rose-400 cursor-pointer transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Camera Video Viewport */}
        <div className="relative flex-1 min-h-[280px] sm:min-h-[340px] bg-black overflow-hidden flex items-center justify-center">
          {/* Magnified Video Element */}
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-200"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
            }}
          >
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current.play().catch(() => {});
                  setCameraActive(true);
                  setCameraLoading(false);
                }
              }}
              className={`w-full h-full object-cover select-none transition-opacity duration-300 ${
                cameraActive ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>

          {/* Loading Viewfinder State */}
          {cameraLoading && !cameraActive && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-slate-950 p-6 z-10">
              <Camera className="w-9 h-9 animate-pulse text-gold" />
              <span className="text-xs font-medium text-foreground">Starting camera stream...</span>
              <span className="text-[10px] text-muted-foreground">Please allow camera permissions if prompted</span>
            </div>
          )}

          {/* Error Viewfinder State */}
          {cameraError && !cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950/95 z-10">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-amber-200 font-medium max-w-xs">{cameraError}</p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRetryKey((k) => k + 1)}
                  className="h-8 text-xs border-gold/40 text-gold"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Retry Camera
                </Button>
              </div>
            </div>
          )}

          {/* Target Reticle and Laser Sweep (Visible when camera is active) */}
          {cameraActive && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 z-20">
              <div className="relative w-64 sm:w-72 h-44 sm:h-48 rounded-2xl border-2 border-gold/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] flex items-center justify-center">
                {/* Corner Guides */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-gold rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-gold rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-gold rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-gold rounded-br-lg" />

                {/* Animated Sweeping Laser Line */}
                <div
                  className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#ef4444] pointer-events-none"
                  style={{
                    animation: 'scanBeam 2s ease-in-out infinite alternate',
                  }}
                />

                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-white/90 bg-black/70 px-2 py-0.5 rounded-full border border-white/10">
                  Align Barcode Inside Box
                </span>
              </div>
            </div>
          )}

          {/* Floating Macro Zoom Control Pill (1x, 1.5x, 2x, 3x) */}
          {cameraActive && (
            <div className="absolute bottom-3 inset-x-3 z-30 flex items-center justify-center pointer-events-auto">
              <div className="flex items-center gap-1 bg-slate-950/90 border border-gold/40 px-2 py-1 rounded-full shadow-2xl backdrop-blur-md">
                <span className="text-[10px] font-medium text-gold flex items-center gap-1 pr-1 pl-1">
                  <ZoomIn className="w-3 h-3" />
                  <span className="hidden sm:inline">Macro Zoom:</span>
                </span>
                {([1, 1.5, 2, 3] as const).map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => handleSetZoom(z)}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
                      zoomLevel === z
                        ? 'bg-gold text-slate-950 shadow-md scale-105'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                  >
                    {z}x
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Continuous HUD Feedback Banner for Latest Scanned Item */}
          {lastScanned ? (
            <div className="absolute top-3 inset-x-3 z-30 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="bg-emerald-950/90 border border-emerald-400/70 rounded-xl p-2.5 shadow-xl flex items-center justify-between text-emerald-200">
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="truncate text-xs">
                    <span className="font-bold text-white">
                      {lastScanned.name || 'Scanned Item'}:
                    </span>{' '}
                    <span className="font-mono text-emerald-300">{lastScanned.code}</span>
                  </div>
                </div>
                {continuous ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 shrink-0">
                    #{scanCount}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {/* Helpful Guidance Notice for Laptop Webcam Macro Focus */}
        <div className="px-3.5 py-2 bg-slate-900/60 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="truncate">
            💡 <strong className="text-gold">Laptop tip:</strong> Hold item <span className="text-foreground font-semibold">25–35 cm away</span> (in focus) and tap <span className="text-gold font-mono font-bold">2x</span> or <span className="text-gold font-mono font-bold">3x</span> for small barcodes.
          </span>
          {hasHardwareZoom && (
            <span className="text-[10px] text-emerald-400 font-mono hidden sm:inline shrink-0 ml-2">
              Optical Zoom Active
            </span>
          )}
        </div>

        {/* Bottom Panel: Manual Input Bar + Continuous Actions */}
        <div className="p-3.5 sm:p-4 border-t border-border bg-slate-900/95 space-y-3 z-20">
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Type code or scan with barcode gun..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm" className="h-9 px-3 shrink-0">
              Submit
            </Button>
          </form>

          {continuous ? (
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs text-muted-foreground font-mono">
                {scanCount} item(s) scanned this session
              </div>
              <Button
                type="button"
                variant="gold"
                size="sm"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="h-8 text-xs font-semibold"
              >
                Done Scanning ({scanCount})
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes scanBeam {
          0% { top: 6%; opacity: 0.85; }
          50% { opacity: 1; }
          100% { top: 92%; opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
