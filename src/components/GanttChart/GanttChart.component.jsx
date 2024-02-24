import { useEffect, useRef, useState } from 'react';
import { getReadableTimePeriodShorter } from '../../utils';

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
  const [isDragging, setIsDragging] = useState(false);
  const [startDragPosX, setStartDragPosX] = useState(0);
  const [startDragPosY, setStartDragPosY] = useState(0);
  const [coordinateOriginX, setCoordinateOriginX] = useState(0);
  const [coordinateOriginY, setCoordinateOriginY] = useState(0);

  const coorBasedOnCanSize = (canvasOriginX, canvasOriginY, cw, ch) => (x, y, w, h) => {
    const _x = (cw - x) - canvasOriginX;
    const _y = (ch - y) - canvasOriginY;
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

  const drawLine = (ctx, x1, y1, x2, y2, color = "#fff", lineWidth = 1) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
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

    const canvasOriginX = (coordinateOriginX / zoomFactorX) + (canvas.width - (canvas.width / zoomFactorX));
    const canvasOriginY = (coordinateOriginY / zoomFactorY) + (canvas.height - (canvas.height / zoomFactorY));
    console.log({
      canvasOriginX,
      canvasOriginY,
    });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const coor = coorBasedOnCanSize(canvasOriginX, canvasOriginY, canvas.width, canvas.height);

    const TIMELINE_HEIGHT = 100 / zoomFactorY;
    const TOTAL_MONTHS = 2;
    const TIME_RANGE = TOTAL_MONTHS * (30 * 24 * 3600 * 1000);
    const TRACK_HEIGHT = 40;
    const TRACK_PADDING_TOP = 5;
    const TRACK_PADDING_BOTTOM = 5;
    const CELL_MARGIN_RIGHT = 1;
    const CELL_MARGIN_LEFT = 1;
    const CELL_PADDING_RIGHT = 5;
    const CELL_PADDING_LEFT = 5;
    const TOTAL_TRACKS = Math.ceil((ctxHeight - TIMELINE_HEIGHT) / TRACK_HEIGHT);

    // Draw track lines
    const trackOccupancy = {
      tracks: Array.from({ length: TOTAL_TRACKS }, () => -1),
      findEmptyTrack(x) {
        return this.tracks.findIndex(v => v < x);
      },
      registerInTrack(t, x) {
        this.tracks[t] = x;
      },
    };
    for (let i = 0; i < TOTAL_TRACKS; i++) {
      const [x1, y1] = coor(0, TIMELINE_HEIGHT + TRACK_HEIGHT * i);
      const [x2, y2] = coor(ctxWidth, TIMELINE_HEIGHT + TRACK_HEIGHT * i);
      // drawLine(x1, y1, x2, y2, '#1b1f26', 1 / zoomFactorY);
      drawLine(ctx, x1, y1, x2, y2, '#333', 1 / zoomFactorY);
    }

    // Draw PRs
    const now = Date.now();
    records.forEach(pr => {
      ctx.strokeStyle = colors[pr.state];
      ctx.fillStyle = colors[pr.state];
      const closedAtTime = new Date(pr.closed_at).getTime() || now;
      const createdAtTime = new Date(pr.created_at).getTime();
      const x = (now - closedAtTime) * canvas.width / TIME_RANGE;
      const w = (closedAtTime - createdAtTime) * canvas.width / TIME_RANGE;
      const t = trackOccupancy.findEmptyTrack(x);
      if (t < 0)
        return; // Sorry no empty track to draw
      const y = TIMELINE_HEIGHT + (TRACK_HEIGHT * t + TRACK_PADDING_BOTTOM);
      const h = TRACK_HEIGHT - TRACK_PADDING_BOTTOM - TRACK_PADDING_TOP;

      const [nx, ny, nw, nh] = coor(
        x + CELL_MARGIN_RIGHT,
        y,
        w - (CELL_MARGIN_RIGHT + CELL_MARGIN_LEFT),
        h,
      );
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
        getReadableTimePeriodShorter(pr.longRunning),//.slice(0, (-nw - (CELL_PADDING_LEFT - CELL_PADDING_RIGHT)) / charWidth),
        // `${pr.longRunning} - ${(new Date(pr.closed_at).getTime() || now) - new Date(pr.created_at).getTime()}`,//.slice(0, (-nw - (CELL_PADDING_LEFT - CELL_PADDING_RIGHT)) / charWidth),
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

    // Draw Timeline
    const [x1, y1] = coor(0, TIMELINE_HEIGHT / 2);
    const [x2, y2] = coor(ctxWidth, TIMELINE_HEIGHT / 2);
    drawLine(ctx, x1, y1, x2, y2, 'red', 1 / zoomFactorY);

    const monthRangeWidth = TIME_RANGE / TOTAL_MONTHS * canvas.width / TIME_RANGE;
    for (let i = 0; i < ctxWidth / monthRangeWidth; i++) {
      const p = monthRangeWidth * i;
      const lineLength = 5 / zoomFactorY;
      const [x1, y1] = coor(p, TIMELINE_HEIGHT / 2 - lineLength);
      const [x2, y2] = coor(p, TIMELINE_HEIGHT / 2 + lineLength);
      // console.log([x1, y1], [x2, y2]);
      drawLine(ctx, x1, y1, x2, y2, 'yellow', 1 / zoomFactorX);
    }

  }, [
    records,
    zoomFactorX,
    zoomFactorY,
    coordinateOriginX,
    coordinateOriginY,
  ]);

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
  };

  const onMouseDrag = e => {
    // eslint-disable-next-line default-case
    switch (e.type) {
      case 'mousedown':
        setIsDragging(true);
        setStartDragPosX(e.clientX);
        setStartDragPosY(e.clientY);
        break;
      case 'mouseup':
        setIsDragging(false);
        break;
      case 'mousemove':
        if (isDragging) {
          const x = -(e.clientX - startDragPosX);
          const y = -(e.clientY - startDragPosY);
          console.log('x: %d, y: %d', x, y);
          console.log('coorX: %d, coorY: %d', coordinateOriginX, coordinateOriginY);
          const newCoorX = Math.min(coordinateOriginX + x, 0);
          const newCoorY = Math.min(coordinateOriginY + y, 0);
          setCoordinateOriginX(newCoorX);
          setCoordinateOriginY(newCoorY);
          setStartDragPosX(e.clientX);
          setStartDragPosY(e.clientY);
        }
        break;
    }
  };

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
        onMouseDown={onMouseDrag}
        onMouseMove={onMouseDrag}
        onMouseUp={onMouseDrag}
      />
    </div>
  );
};

export default GanttChart;
