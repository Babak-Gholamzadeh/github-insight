import { useEffect, useRef, useState } from 'react';
import { log, getRandomColor, getReadableTimePeriodShorter } from '../../utils';

import './GanttChart.style.scss';

const COLORS = {
  open: '#3fba50',
  draft: '#858d97',
  merged: '#a371f7',
  closed: '#f85149',
};

const MONTH_COLOR = (op) => [
  `rgba(255, 215, 0, ${op})`,
  `rgba(255, 105, 180, ${op})`,
  `rgba(0, 250, 154, ${op})`,
  `rgba(30, 144, 255, ${op})`,
  `rgba(255, 140, 0, ${op})`,
  `rgba(138, 43, 226, ${op})`,
  `rgba(50, 205, 50, ${op})`,
  `rgba(255, 69, 0, ${op})`,
  `rgba(255, 99, 71, ${op})`,
  `rgba(139, 69, 19, ${op})`,
  `rgba(75, 0, 130, ${op})`,
  `rgba(85, 107, 47, ${op})`,
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ONE_DAY = 24 * 3600 * 1000;

const getDayOffset = NOW => {
  const d = new Date(NOW);
  const h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  const ms = d.getMilliseconds();
  return (((h * 3600) + (m * 60) + s) * 1000) + ms;
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

  const drawRect = (ctx, x, y, w, h, bgColor, strockColor) => {
    ctx.fillStyle = bgColor;
    // ctx.strokeStyle = strockColor || bgColor;
    ctx.rect(x, y, w, h);
    ctx.fill();
  };

  const drawRectWithRadius = (ctx, x, y, w, h, r, bgColor, strockColor) => {
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = strockColor || bgColor;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.stroke();
    ctx.fill();
  };

  const drawImgWithRadius = (ctx, imgUrl, x, y, w, h, r, cb) => {
    const img = new Image();
    img.onload = () => {
      ctx.globalCompositeOperation = 'destination-over';
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        img,
        x,
        y,
        w,
        h,
      );
      ctx.restore();
      cb();
      ctx.globalCompositeOperation = 'source-over';
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
    ctx.lineWidth = 1;
  };

  const drawText = (ctx, text, x, y, size, color) => {
    ctx.font = `${size}px Segoe UI`;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  };

  const drawTracks = (
    ctx, coor, TOTAL_TRACKS, TRACK_HEIGHT, TIMELINE_HEIGHT,
    coordinateOriginXWithZoom, coordinateOriginYWithZoom, ctxWidth, zoomFactorY
  ) => {
    const trackOccupancy = {
      tracks: Array.from({ length: TOTAL_TRACKS }, () => -1),
      findEmptyTrack(x) {
        return this.tracks.findIndex(v => v < x);
      },
      registerInTrack(t, x) {
        this.tracks[t] = x;
      },
    };
    const trackLineIndex = Math.ceil(-coordinateOriginYWithZoom / TRACK_HEIGHT);
    const totalVisibleTracks = TOTAL_TRACKS - trackLineIndex;
    // console.log('TOTAL_TRACKS:', TOTAL_TRACKS, 'trackLineIndex:', trackLineIndex, 'totalVisibleTracks:', totalVisibleTracks);
    for (let i = 0, j = trackLineIndex; i < totalVisibleTracks; i++, j++) {
      const [x1, y1] = coor(-coordinateOriginXWithZoom + 0, TIMELINE_HEIGHT + TRACK_HEIGHT * j);
      const [x2, y2] = coor(-coordinateOriginXWithZoom + ctxWidth, TIMELINE_HEIGHT + TRACK_HEIGHT * j);
      // drawLine(x1, y1, x2, y2, '#1b1f26', 1 / zoomFactorY);
      drawLine(ctx, x1, y1, x2, y2, '#333', 1 / zoomFactorY);
    }
    return trackOccupancy;
  };

  const drawPRs = (
    ctx, coor, canvas, records,
    NOW, TIME_RANGE, TIMELINE_HEIGHT, TRACK_HEIGHT, TRACK_PADDING_BOTTOM, TRACK_PADDING_TOP,
    CELL_MARGIN_RIGHT, CELL_MARGIN_LEFT, CELL_PADDING_RIGHT, CELL_PADDING_LEFT,
    trackOccupancy,
  ) => {
    records.forEach((pr, i) => {
      const closedAtTime = new Date(pr.closed_at).getTime() || NOW;
      const createdAtTime = new Date(pr.created_at).getTime();
      const x = (NOW - closedAtTime) * canvas.width / TIME_RANGE;
      const w = (closedAtTime - createdAtTime) * canvas.width / TIME_RANGE;
      const t = trackOccupancy.findEmptyTrack(x);
      if (t < 0)
        return; // Sorry free track to draw
      trackOccupancy.registerInTrack(t, x + w);
      const y = TIMELINE_HEIGHT + (TRACK_HEIGHT * t + TRACK_PADDING_BOTTOM);
      const h = TRACK_HEIGHT - TRACK_PADDING_BOTTOM - TRACK_PADDING_TOP;

      const [nx, ny, nw, nh] = coor(
        x + CELL_MARGIN_RIGHT,
        y,
        w - (CELL_MARGIN_RIGHT + CELL_MARGIN_LEFT),
        h,
      );
      const drawTheRest = () => {
        // Draw Text
        const charWidth = 7;
        drawText(
          ctx,
          getReadableTimePeriodShorter(pr.longRunning),//.slice(0, (-nw - (CELL_PADDING_LEFT - CELL_PADDING_RIGHT)) / charWidth),
          // `${pr.longRunning} - ${(new Date(pr.closed_at).getTime() || NOW) - new Date(pr.created_at).getTime()}`,//.slice(0, (-nw - (CELL_PADDING_LEFT - CELL_PADDING_RIGHT)) / charWidth),
          nx + nw + CELL_PADDING_RIGHT,
          ny + (nh / 2) + 5,
          14,
          "white",
        );
        // Draw Rect
        drawRectWithRadius(ctx, nx, ny, nw, nh, 5 / zoomFactorX, COLORS[pr.state]);
      };
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
        drawTheRest,
      );
    });
  };

  const drawTimeline = (
    ctx, coor, canvas,
    NOW, TIME_RANGE, TIMELINE_HEIGHT, TOTAL_DAYS,
    coordinateOriginXWithZoom, coordinateOriginYWithZoom, ctxWidth, ctxHeight, zoomFactorX, zoomFactorY,
  ) => {
    const fixedX = -coordinateOriginXWithZoom + 0;
    const fixedW = -coordinateOriginXWithZoom + ctxWidth;
    const fixedY = -coordinateOriginYWithZoom + 0;
    const fixedH = -coordinateOriginYWithZoom + ctxHeight;
    const middleLineY = TIMELINE_HEIGHT * .9;
    // Draw top line
    {
      const [x, y, w, h] = coor(fixedX, fixedY, ctxWidth, TIMELINE_HEIGHT);
      // @TODO: Add gradient color
      // drawRectWithRadius(ctx, x, y, w, h, 0, '#0d1117');
      drawRectWithRadius(ctx, x, y, w, h, 0, '#000');
    }
    // Draw middle line
    {
      const [x1, y1] = coor(fixedX, fixedY + middleLineY);
      const [x2, y2] = coor(fixedW, fixedY + middleLineY);
      drawLine(ctx, x1, y1, x2, y2, '#444', 1 / zoomFactorY);
    }
    // Draw small vertical short lines
    const oneDayWidth = ONE_DAY * canvas.width / TIME_RANGE;
    const totalDaysVisibleOnCanvas = (ctxWidth / oneDayWidth);
    const shortLineIndex = Math.floor(fixedX / oneDayWidth);
    // log({ fixedX, shortLineIndex, oneDayWidth });
    const dayOffset = getDayOffset(NOW);
    const dayOffsetWidth = dayOffset * oneDayWidth / ONE_DAY;
    let nextMonthSectionPosX = fixedX;
    let isStartOfMonth, isStartOfYear;
    let day, month, year;
    const monthColorOpacity = .05;
    for (let i = 0, j = shortLineIndex; i <= totalDaysVisibleOnCanvas; i++, j++) {
      day = new Date(NOW - (ONE_DAY * j)).getDate();
      month = new Date(NOW - (ONE_DAY * j)).getMonth();
      year = new Date(NOW - (ONE_DAY * j)).getFullYear();
      // log({ month });
      isStartOfMonth = day === 1;
      isStartOfYear = isStartOfMonth && month === 0;

      const sectionType = [isStartOfYear, isStartOfMonth, true].findIndex(Boolean);

      const p = dayOffsetWidth + oneDayWidth * j;
      const lineLength = [20, 10, 5][sectionType] / zoomFactorY;
      const lineColor = ['red', 'green', '#aaa'][sectionType];
      const lineWidth = [6, 3, 1][sectionType] * zoomFactorX;
      const [x1, y1] = coor(p, fixedY + middleLineY - lineLength);
      const [x2, y2] = coor(p, fixedY + middleLineY + lineLength);

      // Draw short line
      drawLine(ctx, x1, y1, x2, y2, lineColor, lineWidth / zoomFactorX);

      // Draw day of the month
      const [tX, tY] = coor(p - 15, fixedY + middleLineY - 20);
      drawText(ctx, day, tX, tY, 10, "#aaa");

      // Draw month section
      if (isStartOfMonth) {
        const monthWidth = p - nextMonthSectionPosX;
        const [mLX, mLY, mLW, mLH] = coor(nextMonthSectionPosX, fixedY, monthWidth, fixedH);
        drawRectWithRadius(ctx, mLX, mLY, mLW, mLH, 0, MONTH_COLOR(monthColorOpacity)[month], MONTH_COLOR(0)[month]);
        const textWidth = MONTH_NAMES[month].length * 10;
        const [tX, tY] = coor(
          Math.min(
            nextMonthSectionPosX + (monthWidth / 2) + (textWidth / 2),
            nextMonthSectionPosX + monthWidth,
          ),
          fixedY + (middleLineY / 4),
        );
        // log({here: 1, month, tX, nextMonthSectionPosX, textWidth, monthWidth});
        drawText(ctx, MONTH_NAMES[month], tX, tY, 14, 'white');
        nextMonthSectionPosX = p;
      }
    }
      // Draw most left month section
      if (isStartOfMonth) {
      month--;
      if (month < 0)
        month = 11;
    }
    const monthWidth = (fixedW + dayOffsetWidth) - nextMonthSectionPosX;
    const [mLX, mLY, mLW, mLH] = coor(nextMonthSectionPosX, fixedY, monthWidth, fixedH);
    drawRectWithRadius(ctx, mLX, mLY, mLW, mLH, 0, MONTH_COLOR(monthColorOpacity)[month], MONTH_COLOR(0)[month]);
    const textWidth = MONTH_NAMES[month].length * 10;
    const [tX, tY] = coor(
      Math.max(
        nextMonthSectionPosX + (monthWidth / 2) + (textWidth / 2),
        nextMonthSectionPosX + textWidth,
      ),
      fixedY + (middleLineY / 4),
    );
    // log({here: 2, month, tX, nextMonthSectionPosX, textWidth, monthWidth});
    drawText(ctx, MONTH_NAMES[month], tX, tY, 14, 'white');
  };

  useEffect(() => {
    const canvas = refCanvas.current;
    canvas.width = refWrapper.current.offsetWidth;
    canvas.height = refWrapper.current.offsetHeight;

    const ctx = canvas.getContext('2d');
    ctx.scale(zoomFactorX, zoomFactorY);

    document.addEventListener('mouseup', onMouseDrag);

    const ctxWidth = canvas.width / zoomFactorX;
    const ctxHeight = canvas.height / zoomFactorY;
    // console.log(
    //   'zoomFactorX: %f, zoomFactorY: %f',
    //   zoomFactorX, zoomFactorY
    // );
    // console.log(
    //   'ctxW: %f, ctxH: %f, cW: %f, cH: %f',
    //   ctxWidth, ctxHeight, canvas.width, canvas.height,
    // );

    const coordinateOriginXWithZoom = coordinateOriginX / zoomFactorX;
    const coordinateOriginYWithZoom = coordinateOriginY / zoomFactorY;

    const canvasOriginX = coordinateOriginXWithZoom + (canvas.width - (canvas.width / zoomFactorX));
    const canvasOriginY = coordinateOriginYWithZoom + (canvas.height - (canvas.height / zoomFactorY));
    // console.log({
    //   canvasOriginX,
    //   canvasOriginY,
    // });
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    const coor = coorBasedOnCanSize(canvasOriginX, canvasOriginY, canvas.width, canvas.height);

    const NOW = Date.now();
    const TIMELINE_HEIGHT = 100 / zoomFactorY;
    // const TIMELINE_HEIGHT = 0;
    const TOTAL_MONTHS = 1;
    const TOTAL_DAYS = TOTAL_MONTHS * 30;
    const TIME_RANGE = TOTAL_DAYS * ONE_DAY;
    const TRACK_HEIGHT = 40;
    const TRACK_PADDING_TOP = 5;
    const TRACK_PADDING_BOTTOM = 5;
    const CELL_MARGIN_RIGHT = 1 / zoomFactorX;
    const CELL_MARGIN_LEFT = 1 / zoomFactorX;
    const CELL_PADDING_RIGHT = 5;
    const CELL_PADDING_LEFT = 5;
    const TOTAL_TRACKS = Math.ceil((-coordinateOriginYWithZoom + ctxHeight - TIMELINE_HEIGHT) / TRACK_HEIGHT);

    // Draw track lines
    const trackOccupancy = drawTracks(
      ctx,
      coor,
      TOTAL_TRACKS,
      TRACK_HEIGHT,
      TIMELINE_HEIGHT,
      coordinateOriginXWithZoom,
      coordinateOriginYWithZoom,
      ctxWidth,
      zoomFactorY,
    );

    // Draw PRs
    drawPRs(
      ctx,
      coor,
      canvas,
      records,
      NOW,
      TIME_RANGE,
      TIMELINE_HEIGHT,
      TRACK_HEIGHT,
      TRACK_PADDING_BOTTOM,
      TRACK_PADDING_TOP,
      CELL_MARGIN_RIGHT,
      CELL_MARGIN_LEFT,
      CELL_PADDING_RIGHT,
      CELL_PADDING_LEFT,
      trackOccupancy,
    );

    // Draw Timeline
    drawTimeline(
      ctx,
      coor,
      canvas,
      NOW,
      TIME_RANGE,
      TIMELINE_HEIGHT,
      TOTAL_DAYS,
      coordinateOriginXWithZoom,
      coordinateOriginYWithZoom,
      ctxWidth,
      ctxHeight,
      zoomFactorX,
      zoomFactorY,
    );

    return () => {
      document.removeEventListener('mouseup', onMouseDrag);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    records,
    zoomFactorX,
    zoomFactorY,
    coordinateOriginX,
    coordinateOriginY,
  ]);

  // useEffect(() => {
  //   console.log('isShiftPressed:', isShiftPressed);
  // }, [isShiftPressed]);

  // useEffect(() => {
  //   console.log('isAltPressed:', isAltPressed);
  // }, [isAltPressed]);

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
    const bounds = e.target.getBoundingClientRect();
    if (isShiftPressed) {
      const cursorX = -zoomDelta * (refCanvas.current.width - (e.clientX - bounds.left) - coordinateOriginX);
      setCoordinateOriginX(coordinateOriginX + cursorX);
      const newZoomFactorX = Math.max(zoomFactorX + zoomFactorX * zoomDelta, .001);
      setZoomFactorX(newZoomFactorX);
    }
    if (isAltPressed) {
      // const cursorY = -zoomDelta * (refCanvas.current.height - (e.clientY - bounds.top) - coordinateOriginY);
      // setCoordinateOriginY(coordinateOriginY + cursorY);
      const newZoomFactorY = Math.max(zoomFactorY + zoomFactorY * zoomDelta, .001);
      setZoomFactorY(newZoomFactorY);
    }
  };

  const onMouseDrag = e => {
    // console.log('e.type:', e.type, 'isDragging:', isDragging);
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
          // console.log('x: %d, y: %d', x, y);
          // console.log('coorX: %d, coorY: %d', coordinateOriginX, coordinateOriginY);
          const newCoorX = coordinateOriginX + x;
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
      />
    </div>
  );
};

export default GanttChart;
