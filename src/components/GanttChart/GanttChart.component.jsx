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
  const [timelineCursorX, setTimelineCursorX] = useState(0);

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

  const drawGlowyLine = (ctx, x1, y1, x2, y2, color = "#fff", lineWidth = 1) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  };

  const drawText = (ctx, text, x, y, color, size, weight = 'normal') => {
    ctx.save();
    ctx.scale(1, 1);
    ctx.font = `${weight} ${size}px Segoe UI`;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  };

  const drawNiceText = (ctx, text, x, y, mw, color, size, align = 'center', weight = 'normal') => {
    ctx.font = `${weight} ${size}px Segoe UI`;
    let textWidth = ctx.measureText(text).width;
    log({ p: 1, size, x, mw, tw: textWidth });
    if (textWidth > mw) {
      size = size * mw / textWidth;
      ctx.font = `${weight} ${size}px Segoe UI`;
      textWidth = ctx.measureText(text).width;
    }
    log({ p: 2, size, x, mw, tw: textWidth });
    if (align === 'center') {
      x += (mw / 2) - (textWidth / 2);
    }
    log({ p: 3, size, x, mw, tw: textWidth });

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
          "white",
          14,
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
    const timeLineY = fixedY + TIMELINE_HEIGHT;
    const monthLineY = fixedY + TIMELINE_HEIGHT * .4;
    const yearLineY = fixedY + TIMELINE_HEIGHT * .1;
    // Draw top line
    {
      const [x, y, w, h] = coor(fixedX, fixedY, ctxWidth, TIMELINE_HEIGHT);
      // @TODO: Add gradient color
      // drawRectWithRadius(ctx, x, y, w, h, 0, '#0d1117');
      drawRectWithRadius(ctx, x, y, w, h, 0, '#000');
    }
    // Draw middle line
    {
      const [x1, y1] = coor(fixedX, timeLineY);
      const [x2, y2] = coor(fixedW, timeLineY);
      drawLine(ctx, x1, y1, x2, y2, 'yellow', 1 / zoomFactorY);
    }
    // Draw small vertical short lines
    const oneDayWidth = ONE_DAY * canvas.width / TIME_RANGE;
    const totalDaysVisibleOnCanvas = (ctxWidth / oneDayWidth);
    const shortLineIndex = Math.floor(fixedX / oneDayWidth);
    // log({ fixedX, shortLineIndex, oneDayWidth });
    const dayOffset = getDayOffset(NOW);
    const dayOffsetWidth = dayOffset * oneDayWidth / ONE_DAY;
    let isStartOfMonth, isStartOfYear;
    let nextMonthSectionPosX = fixedX;
    let nextYearSectionPosX = fixedX;
    let day, month, year;
    const monthColorOpacity = .05;
    for (let i = 0, j = shortLineIndex; i <= totalDaysVisibleOnCanvas; i++, j++) {
      day = new Date(NOW - (ONE_DAY * j)).getDate();
      month = new Date(NOW - (ONE_DAY * j)).getMonth();
      year = new Date(NOW - (ONE_DAY * j)).getFullYear();

      isStartOfMonth = day === 1;
      isStartOfYear = isStartOfMonth && month === 0;

      const p = dayOffsetWidth + oneDayWidth * j;

      // Draw short line
      const lineLength = (isStartOfMonth ? 20 : 10) / zoomFactorY;
      const lineColor = '#aaa';
      const lineWidth = (isStartOfMonth ? 2 : 1) * zoomFactorX;
      if (isStartOfYear) {
        const [x1, y1] = coor(p, fixedY);
        const [x2, y2] = coor(p, fixedH);
        drawLine(ctx, x1, y1, x2, y2, MONTH_COLOR(.2)[month], 1 / zoomFactorX);
      } else {
        const [x1, y1] = coor(p, timeLineY - lineLength);
        const [x2, y2] = coor(p, timeLineY);
        drawLine(ctx, x1, y1, x2, y2, lineColor, lineWidth / zoomFactorX);
      }

      // Draw day of the month
      const [tX, tY] = coor(p - 15, timeLineY * .7);
      drawText(ctx, day, tX, tY, "#aaa", 10);

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
          monthLineY,
        );
        // log({here: 1, month, tX, nextMonthSectionPosX, textWidth, monthWidth});
        drawText(ctx, MONTH_NAMES[month], tX, tY, 'white', 14);
        nextMonthSectionPosX = p;
      }

      // Draw year section
      if (isStartOfYear) {
        const yearWidth = p - nextYearSectionPosX;
        // const [mLX, mLY, mLW, mLH] = coor(nextYearSectionPosX, fixedY, yearWidth, fixedH);
        // drawRectWithRadius(ctx, mLX, mLY, mLW, mLH, 0, MONTH_COLOR(monthColorOpacity)[month], MONTH_COLOR(0)[month]);
        const textWidth = year.toString().length * 10;
        const [tX, tY] = coor(
          Math.min(
            nextYearSectionPosX + (yearWidth / 2) + (textWidth / 2),
            nextYearSectionPosX + yearWidth,
          ),
          yearLineY,
        );
        log({ here: 11, year, tX, tY, nextYearSectionPosX, textWidth, yearWidth });
        drawText(ctx, year, tX, tY, 'rgba(255, 255, 255, .4)', 18);
        nextYearSectionPosX = p;
      }
    }
    // Draw most left month section
    {
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
        monthLineY,
      );
      // log({here: 2, month, tX, nextMonthSectionPosX, textWidth, monthWidth});
      drawText(ctx, MONTH_NAMES[month], tX, tY, 'white', 14);
    }

    // Draw most left year section
    {
      if (isStartOfYear) {
        year--;
        if (year < 1)
          return;
      }
      const yearWidth = (fixedW + dayOffsetWidth) - nextYearSectionPosX;
      // const [mLX, mLY, mLW, mLH] = coor(nextYearSectionPosX, fixedY, yearWidth, fixedH);
      // drawRectWithRadius(ctx, mLX, mLY, mLW, mLH, 0, MONTH_COLOR(monthColorOpacity)[year], MONTH_COLOR(0)[year]);
      const textWidth = year.toString().length * 10;
      const [tX, tY] = coor(
        Math.max(
          nextYearSectionPosX + (yearWidth / 2) + (textWidth / 2),
          nextYearSectionPosX + textWidth,
        ),
        yearLineY,
      );
      // log({here: 22, year, tX, nextYearSectionPosX, textWidth, yearWidth});
      drawText(ctx, year, tX, tY, 'rgba(255, 255, 255, .4)', 18);
    }
  };

  useEffect(() => {
    const wrapperStyle = window.getComputedStyle(refWrapper.current);
    const paddingTop = parseInt(wrapperStyle.getPropertyValue('padding-top'));
    const paddingRight = parseInt(wrapperStyle.getPropertyValue('padding-right'));
    const paddingBottom = parseInt(wrapperStyle.getPropertyValue('padding-bottom'));
    const paddingLeft = parseInt(wrapperStyle.getPropertyValue('padding-left'));
    const canvas = refCanvas.current;
    canvas.width = refWrapper.current.clientWidth - (paddingRight + paddingLeft);
    canvas.height = refWrapper.current.clientHeight - (paddingTop + paddingBottom);

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

    // Draw Timeline Cursor
    {
      // Draw the line
      const x = (-coordinateOriginX + timelineCursorX) / zoomFactorX;
      const y = -coordinateOriginYWithZoom + TIMELINE_HEIGHT;
      {
        const [x1, y1] = coor(x, y);
        const [x2, y2] = coor(x, -coordinateOriginYWithZoom + ctxHeight);
        drawGlowyLine(ctx, x1, y1, x2, y2, '#1d6bd5', .61 / zoomFactorX);
      }
      // Draw the exact time
      const w = 50 / zoomFactorX;
      const h = 18 / zoomFactorY;
      const [rx, ry, rw, rh] = coor(x - (w / 2), y, w, -h);
      drawRectWithRadius(ctx, rx, ry, rw, rh, 2, '#1d6bd5');
      const time = '12:34:56';
      const [tx, ty] = coor(x + (w / 2), y - (h / 2) - (8 / zoomFactorY / 2));
      // drawText(ctx, time, tx, ty, 'white', 11);
      drawNiceText(ctx, time, tx, ty, w, 'white', 11);
    }


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
    timelineCursorX,
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
        {
          const bounds = e.target.getBoundingClientRect();
          const mouseX = e.clientX - bounds.left;
          const cursorX = refCanvas.current.width - mouseX;
          setTimelineCursorX(cursorX);
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
