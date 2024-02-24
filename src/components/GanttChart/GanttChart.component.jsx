import { useEffect, useRef } from 'react';

import './GanttChart.style.scss';

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

const GanttChart = ({ records }) => {
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

    // ctx.fillStyle = "#fe2";
    // ctx.strokeStyle = "red";

    // ctx.fillRect(10, 10, 300, 100);
    // ctx.strokeRect(10, 10, 300, 100);
    // ctx.strokeRect(350, 20, 100, 100);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const colors = {
      open: '#3fba50',
      draft: '#858d97',
      merged: '#a371f7',
      closed: '#f85149',
    };

    const coor = coorBasedOnCanSize(canvas.width, canvas.height);

    console.log('GanttChart > records.length:', records.length, records[100]?.closed_at);
    const prHeight = 1;
    const now = Date.now();
    const timeRange = 12 * (30 * 24 * 3600 * 1000);
    records.slice(0).forEach((pr, i) => {
      ctx.fillStyle = colors[pr.state];
      const closedAtTime = new Date(pr.closed_at).getTime() || now;
      const createdAtTime = new Date(pr.created_at).getTime();
      const x = (now - closedAtTime) * canvas.width / timeRange;
      const y = (prHeight + 1) * i;
      const w = (now - createdAtTime) * canvas.width / timeRange;;
      const h = prHeight;
      ctx.fillRect(...coor(x, y, w, h));
    });

  }, [records]);

  return (
    <div ref={refWrapper} className='grantt-chart-wrapper'>
      <canvas ref={refCanvas} />
    </div>
  );
};

export default GanttChart;
