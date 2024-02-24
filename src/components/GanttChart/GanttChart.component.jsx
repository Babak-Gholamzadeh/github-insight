import { useEffect, useRef, useState } from 'react';

import './GanttChart.style.scss';

const colors = {
  open: '#3fba50',
  draft: '#858d97',
  merged: '#a371f7',
  closed: '#f85149',
};

const GanttChart = ({ records }) => {
  const refWrapper = useRef();
  const refCanvas = useRef();
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [zoomFactorX, setZoomFactorX] = useState(1);
  const [zoomFactorY, setZoomFactorY] = useState(1);

  const coorBasedOnCanSize = (originX, originY, cw, ch) => (x, y, w, h) => {
    const _x = (cw - x) - originX;
    const _y = (ch - y) - originY;
    const _w = -w;
    const _h = -h;
    return [_x, _y, _w, _h];
  };

  const drawImgWithRadius = (ctx, imgUrl, x, y, width, height, radius) => {
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ////////
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ////////
      ctx.clip();
      ctx.drawImage(
        img,
        x,
        y,
        width,
        height,
      );
      ctx.restore();
    };
    img.src = imgUrl;
  };

  useEffect(() => {
    const canvas = refCanvas.current;
    canvas.width = refWrapper.current.offsetWidth;
    canvas.height = refWrapper.current.offsetHeight;

    const ctx = canvas.getContext('2d');
    ctx.scale(zoomFactorX, zoomFactorY);

    const ctxWidth = canvas.width / zoomFactorX;
    const ctxHeight = canvas.height / zoomFactorY;
    console.log(
      'zoomFactorX: %f, zoomFactorY: %f',
      zoomFactorX, zoomFactorY
    );
    console.log(
      'ctxW: %f, ctxH: %f, cW: %f, cH: %f',
      ctxWidth, ctxHeight, canvas.width, canvas.height,
    );

    const TRACK_HEIGHT = 40;
    const TRACK_PADDING_TOP = 5;
    const TRACK_PADDING_BOTTOM = 5;
    const CELL_MARGIN_RIGHT = 1;
    const CELL_MARGIN_LEFT = 1;
    const CELL_PADDING_RIGHT = 5;
    const CELL_PADDING_LEFT = 5;
    const TOTAL_TRACKS = Math.ceil(ctxHeight / TRACK_HEIGHT);
    const originX = canvas.width - (canvas.width / zoomFactorX);
    const originY = canvas.height - (canvas.height / zoomFactorY);
    console.log({
      originX,
      originY,
    });

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

    const coor = coorBasedOnCanSize(originX, originY, canvas.width, canvas.height);

    for (let i = 0; i < TOTAL_TRACKS; i++) {
      ctx.beginPath();
      const [x1, y1] = coor(0, TRACK_HEIGHT * i);
      const [x2, y2] = coor(ctxWidth, TRACK_HEIGHT * i);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      // ctx.strokeStyle = '#1b1f26';
      ctx.strokeStyle = '#333';
      // ctx.lineWidth = .1;
      ctx.stroke();
    }

    const now = Date.now();
    const timeRange = 12 * (30 * 24 * 3600 * 1000);
    records.forEach((pr, i) => {
      ctx.strokeStyle = colors[pr.state];
      ctx.fillStyle = colors[pr.state];
      const closedAtTime = new Date(pr.closed_at).getTime() || now;
      const createdAtTime = new Date(pr.created_at).getTime();
      const x = (now - closedAtTime) * canvas.width / timeRange;
      const w = (now - createdAtTime) * canvas.width / timeRange;
      const t = trackOccupancy.findEmptyTrack(x);
      // console.log('i: %d, t: %d, x: %d, w: %d', i, t, x, w);
      const y = TRACK_HEIGHT * t + TRACK_PADDING_BOTTOM;
      const h = TRACK_HEIGHT - TRACK_PADDING_BOTTOM - TRACK_PADDING_TOP;

      const [nx, ny, nw, nh] = coor(x + CELL_MARGIN_RIGHT, y, w - (CELL_MARGIN_RIGHT + CELL_MARGIN_LEFT), h);
      // Draw Rect
      ctx.beginPath();
      ctx.roundRect(nx, ny, nw, nh, 5);
      ctx.stroke();
      ctx.fill();
      // Draw Text
      const fontSize = 14;
      ctx.font = `${fontSize}px Segoe UI`;
      ctx.fillStyle = "white";
      const charWidth = 7;
      ctx.fillText(
        pr.title.slice(0, (-nw - (CELL_PADDING_LEFT - CELL_PADDING_RIGHT)) / charWidth),
        nx + nw + CELL_PADDING_RIGHT,
        ny + (nh / 2) + 5,
      );
      // Draw Image
      const imgWidth = 20;
      const imgHeight = 20;
      drawImgWithRadius(
        ctx,
        pr.user.avatar_url,
        nx - CELL_PADDING_RIGHT - imgWidth,
        ny + (nh / 2) - (imgHeight / 2),
        imgWidth,
        imgHeight,
        imgWidth / 2,
      );
      trackOccupancy.registerInTrack(t, x + w);
    });
  }, [records, zoomFactorX, zoomFactorY]);

  useEffect(() => {
    console.log('isShiftPressed:', isShiftPressed);
  }, [isShiftPressed]);

  useEffect(() => {
    console.log('isAltPressed:', isAltPressed);
  }, [isAltPressed]);

  const onKeyDown = e => {
    if (e.key === 'Shift') {
      setIsShiftPressed(true);
    }
    if (e.key === 'Alt') {
      setIsAltPressed(true);
    }
  };

  const onKeyUp = e => {
    if (e.key === 'Shift') {
      setIsShiftPressed(false);
    }
    if (e.key === 'Alt') {
      setIsAltPressed(false);
    }
  };

  const onWheel = e => {
    const zoomDelta = Math.sign(e.deltaY) * -.1;
    if (isShiftPressed) {
      const newZoomFactorX = Math.max(zoomFactorX + zoomFactorX * zoomDelta, .001);
      setZoomFactorX(newZoomFactorX);
    }
    if (isAltPressed) {
      const newZoomFactorY = Math.max(zoomFactorY + zoomFactorY * zoomDelta, .001);
      setZoomFactorY(newZoomFactorY);
    }
  }

  return (
    <div ref={refWrapper} className='grantt-chart-wrapper'>
      <canvas
        tabIndex={0}
        ref={refCanvas}
        onMouseEnter={() => refCanvas.current.focus()}
        onMouseLeave={() => refCanvas.current.blur()}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onWheel={onWheel}
      />
    </div>
  );
};

export default GanttChart;
