import { Suspense, useCallback, useEffect, useState } from "react";
import { Bounds, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { RotateCcw } from "lucide-react";

type BodyViewerProps = {
  compact?: boolean;
};

function SkeletonModel({ onLoaded }: { onLoaded: () => void }) {
  const { scene } = useGLTF("/models/skeleton.glb");
  useEffect(() => onLoaded(), [onLoaded]);

  return (
    <Bounds fit clip observe margin={0.7}>
      <primitive object={scene} />
    </Bounds>
  );
}

export function BodyViewer({ compact = false }: BodyViewerProps) {
  const [loading, setLoading] = useState(true);
  const markLoaded = useCallback(() => setLoading(false), []);

  return (
    <div className={`body-viewer ${compact ? "body-viewer-compact" : ""}`}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#0b1720"]} />
        <ambientLight intensity={1.8} />
        <directionalLight position={[4, 5, 6]} intensity={3.2} color="#d9f6f1" />
        <pointLight position={[-4, 0, -3]} intensity={22} color="#4bd2c7" />
        <Suspense fallback={null}>
          <SkeletonModel onLoaded={markLoaded} />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={1.4}
          maxDistance={10}
          rotateSpeed={0.65}
        />
      </Canvas>
      {loading && <div className="viewer-loading-overlay" role="status">Cargando atlas 3D…</div>}
      <div className="viewer-hint">
        <RotateCcw size={13} /> Arrastra para girar · rueda para acercar
      </div>
      {!compact && (
        <p className="model-attribution">
          Modelo de esqueleto de <a href="https://github.com/SeemaBansal1/3d-human-body-anatomy" target="_blank" rel="noreferrer">3D Human Body Anatomy</a>, basado en Z-Anatomy / BodyParts3D. Licencia CC BY-SA 4.0. Este activo no es un modelo clínico ni un gemelo digital.
        </p>
      )}
    </div>
  );
}

useGLTF.preload("/models/skeleton.glb");