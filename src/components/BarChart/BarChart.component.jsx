import { useEffect, useRef } from 'react';

import './BarChart.style.scss';

const list = [{
  id: '1',
  state: 'open',
  title: 'This is a PR title',
  html_url: 'https://github.com',
  user: {
    name: 'username',
    avatar_url: 'https://github.com',
    html_url: 'https://github.com',
  },
  repo: {
    full_name: 'github/repo',
    html_url: 'https://github.com',
  },
  longRunning: 335161035,
  created_at: '2023-01-03',
  closed_at: '2023-02-03',
}];

const BarChart = ({ records }) => {
  const refWrapper = useRef();
  const refCanvas = useRef();

  useEffect(() => {
    const canvas = refCanvas.current;
    canvas.width = refWrapper.current.offsetWidth;
    canvas.height = refWrapper.current.offsetHeight;

    const ctx = canvas.getContext('2d');

    // ctx.fillStyle = "#fe2";
    // ctx.strokeStyle = "red";

    // ctx.fillRect(10, 10, 300, 100);
    // ctx.strokeRect(10, 10, 300, 100);
    // ctx.strokeRect(350, 20, 100, 100);
    // ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    console.log('records.length:', records.length);
    const prWidth = 5;
    const prMaxHeight = 350;
    const prMaxLongRunning = records[0]?.longRunning || 0;
    ctx.fillStyle = "blue";
    records.forEach((pr, i) => {
      const x = canvas.width - ((prWidth + 2) * i);
      const y = canvas.height;
      const w = prWidth;
      const h = -(pr.longRunning * prMaxHeight / prMaxLongRunning);
      // console.log(x, y, w, h);
      ctx.fillRect(x, y, w, h);
    });

  }, [records]);

  return (
    <div ref={refWrapper} className='bar-chart-wrapper'>
      <canvas ref={refCanvas}/>
    </div>
  );
};

export default BarChart;
