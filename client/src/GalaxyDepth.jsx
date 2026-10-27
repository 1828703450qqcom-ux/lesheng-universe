import React, { useEffect, useRef } from 'react';
import './galaxy-depth.css';

const Planet3D = React.lazy(() => import('./Planet3D.jsx'));

const stars = Array.from({ length: 26 }, (_, index) => ({
  left: `${(index * 61 + 17) % 100}%`,
  top: `${(index * 43 + 9) % 92}%`,
  size: `${index % 7 === 0 ? 3 : 1.5}px`,
  delay: `${(index % 9) * -.37}s`,
}));

export default function GalaxyDepth() {
  const sceneRef = useRef(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const world = scene?.querySelector('.galaxy-depth-world');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = window.matchMedia('(min-width: 801px)');
    if (!world || motion.matches || !desktop.matches) return undefined;

    let frame = 0;
    const move = event => {
      if (event.target.closest?.('.galaxy-depth-saturn')) return;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - .5) * 2;
        const y = (event.clientY / window.innerHeight - .5) * 2;
        world.style.transform = `rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg)`;
        frame = 0;
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="galaxy-depth" ref={sceneRef}>
    <div className="galaxy-depth-world">
      <div className="galaxy-depth-stars galaxy-depth-far">{stars.map((star, index) => <i key={index} style={{ left: star.left, top: star.top, width: star.size, height: star.size, animationDelay: star.delay }}/>)}</div>
      <div className="galaxy-depth-aurora"/>
      <div className="galaxy-depth-saturn">
        <React.Suspense fallback={null}><Planet3D/></React.Suspense>
        <span className="planet-css-fallback" aria-hidden="true">
          <span className="galaxy-depth-atmosphere"/>
          <span className="galaxy-depth-ring galaxy-depth-ring-back"/>
          <span className="galaxy-depth-globe">
            <i className="galaxy-depth-bands"/>
            <i className="galaxy-depth-storm"/>
            <i className="galaxy-depth-terminator"/>
          </span>
          <span className="galaxy-depth-ring galaxy-depth-ring-front"/>
          <span className="galaxy-depth-moon"/>
        </span>
        <span className="planet-rotate-hint" aria-hidden="true">拖动星球 · 360°</span>
      </div>
      <div className="galaxy-depth-stars galaxy-depth-near">{stars.slice(0, 12).map((star, index) => <i key={index} style={{ left: `${(index * 79 + 11) % 100}%`, top: `${(index * 37 + 23) % 94}%`, animationDelay: star.delay }}/>)}</div>
    </div>
  </div>;
}
