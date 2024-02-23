import { useEffect, useRef } from 'react';

import './CanvasWorld.style.scss';

export const Camera = ({children, ...rest}) => {
  console.log('Camera');
};

export const Line = ({children, ...rest}) => {
  console.log('Line');
};

export const Rect = ({children, ...rest}) => {
  console.log('Rect > children:', children);
};

export const Text = ({children, ...rest}) => {
  console.log('Text');
};

export const Scene = ({ children, ...rest }) => {
  const refWrapper = useRef();
  const refCanvas = useRef();

  console.log('Scene > children:', children);

  useEffect(() => {
    const canvas = refCanvas.current;
    canvas.width = refWrapper.current.offsetWidth;
    canvas.height = refWrapper.current.offsetHeight;

    const ctx = canvas.getContext('2d');

    ctx.fillStyle = "#fe2";
    ctx.strokeStyle = "red";

    ctx.fillRect(10, 10, 300, 100);
    ctx.strokeRect(10, 10, 300, 100);
    ctx.strokeRect(350, 20, 100, 100);
    // ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  }, []);

  useEffect(() => {
    const objects = Array.isArray(children) ? children : [children];
    for(const object of objects) {
      object.type();
    }
  }, [children]);

  return (
    <div ref={refWrapper} className='scene-wrapper'>
      <canvas ref={refCanvas} />
    </div>
  );
};
