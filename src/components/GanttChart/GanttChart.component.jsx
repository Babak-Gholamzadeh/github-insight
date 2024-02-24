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

  const colors = {
    open: '#3fba50',
    draft: '#858d97',
    merged: '#a371f7',
    closed: '#f85149',
  };


  useEffect(() => {
    const canvas = refCanvas.current;
    canvas.width = refWrapper.current.offsetWidth;
    canvas.height = refWrapper.current.offsetHeight;

    const ctx = canvas.getContext('2d');

    const TRACK_HEIGHT = 40;
    const TRACK_PADDING_TOP = 5;
    const TRACK_PADDING_BOTTOM = 5;
    const TOTAL_TRACKS = Math.floor(canvas.height / TRACK_HEIGHT);

    const trackOccupancy = {
      tracks: Array.from({ length: TOTAL_TRACKS }, () => -1),
      findEmptyTrack(x) {
        return this.tracks.findIndex(v => v < x);
      },
      registerInTrack(t, x) {
        this.tracks[t] = x;
      },
    };


    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.lineCap = "round";

    const coor = coorBasedOnCanSize(canvas.width, canvas.height);

    for (let i = 0; i < TOTAL_TRACKS; i++) {
      ctx.beginPath();
      const [x1, y1] = coor(0, TRACK_HEIGHT * i);
      const [x2, y2] = coor(canvas.width, TRACK_HEIGHT * i);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      // ctx.strokeStyle = '#1b1f26';
      ctx.strokeStyle = '#ccc';
      // ctx.lineWidth = .1;
      ctx.stroke();
    }

    const now = Date.now();
    const timeRange = 12 * (30 * 24 * 3600 * 1000);
    records.forEach((pr, i) => {
      ctx.fillStyle = colors[pr.state];
      const closedAtTime = new Date(pr.closed_at).getTime() || now;
      const createdAtTime = new Date(pr.created_at).getTime();
      const x = (now - closedAtTime) * canvas.width / timeRange;
      const w = (now - createdAtTime) * canvas.width / timeRange;
      const t = trackOccupancy.findEmptyTrack(x);
      console.log('i: %d, t: %d, x: %d, w: %d', i, t, x, w);
      const y = TRACK_HEIGHT * t + TRACK_PADDING_BOTTOM;
      const h = TRACK_HEIGHT - TRACK_PADDING_BOTTOM - TRACK_PADDING_TOP;

      ctx.beginPath();
      ctx.roundRect(...coor(x, y, w, h), 5);
      ctx.stroke();
      ctx.fill();

      trackOccupancy.registerInTrack(t, x + w);
    });

  }, [records]);

  return (
    <div ref={refWrapper} className='grantt-chart-wrapper'>
      <canvas ref={refCanvas} />
    </div>
  );
};

export default GanttChart;
