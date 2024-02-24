import { useEffect, useRef } from 'react';

import './BarChart.style.scss';

const BarChart = ({ records }) => {
  const refWrapper = useRef();
  const refCanvas = useRef();

  const coorBasedOnCanSize = (cw, ch) => (x, y, w, h) => {
    const _x = cw - x;
    const _y = ch - y;
    const _w = -w;
    const _h = -h;
    return [_x, _y, _w, _h];
  };

  useEffect(() => {
    const canvas = refCanvas.current;
    canvas.width = refWrapper.current.offsetWidth;
    canvas.height = refWrapper.current.offsetHeight;

    const ctx = canvas.getContext('2d');

    const coor = coorBasedOnCanSize(canvas.width, canvas.height);

    console.log('BarChart > records.length:', records.length);
    const prWidth = 2;
    const prMaxHeight = 350;
    const prMaxLongRunning = records[0]?.longRunning || 0;
    const colors = {
      open: '#3fba50',
      draft: '#858d97',
      merged: '#a371f7',
      closed: '#f85149',
    };
    records.forEach((pr, i) => {
      ctx.fillStyle = colors[pr.state];
      const x = (prWidth + 1) * i;
      const y = 0;
      const w = prWidth;
      const h = pr.longRunning * prMaxHeight / prMaxLongRunning;
      // console.log(x, y, w, h);
      ctx.fillRect(...coor(x, y, w, h));
    });

  }, [records]);

  return (
    <div ref={refWrapper} className='bar-chart-wrapper'>
      <canvas ref={refCanvas}/>
    </div>
  );
};

export default BarChart;
