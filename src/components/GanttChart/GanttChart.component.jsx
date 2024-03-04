import { useEffect, useRef, useState } from 'react';
import {
  log,
  // getRandomColor,
  // getReadableTimePeriodShorter,
} from '../../utils';
import {
  Engine,
  Keyboard,
  Mouse,
  Scene,
  ObjectGroup,
  Camera,
  Line,
  Rect,
  Text,
} from './engine';

import './GanttChart.style.scss';

const GanttChart = ({ records }) => {
  log({ ComponentRerendered: 'GanttChart' });
  const refWrapper = useRef();
  const refCanvas = useRef();
  const refEngine = useRef();
  const refScene = useRef();
  const refCamera = useRef();
  const refKeyboard = useRef();
  const refMouse = useRef();
  const refTimeline = useRef();

  const [viewport, setViewport] = useState({ size: [0, 0] });
  const [ctx, setCtx] = useState();
  const [NOW, setNOW] = useState(Date.now());
  // let NOW = Date.now();

  const setupViewport = () => {
    const wrapperStyle = window.getComputedStyle(refWrapper.current);
    const paddingTop = parseInt(wrapperStyle.getPropertyValue('padding-top'));
    const paddingRight = parseInt(wrapperStyle.getPropertyValue('padding-right'));
    const paddingBottom = parseInt(wrapperStyle.getPropertyValue('padding-bottom'));
    const paddingLeft = parseInt(wrapperStyle.getPropertyValue('padding-left'));
    const canvas = refCanvas.current;
    canvas.width = refWrapper.current.clientWidth - (paddingRight + paddingLeft);
    canvas.height = refWrapper.current.clientHeight - (paddingTop + paddingBottom);
    setViewport({
      size: [canvas.width, canvas.height],
    });
    setCtx(canvas.getContext('2d'));
    setNOW(Date.now());
  };

  const setupScene = () => {
    const scene = refScene.current = new Scene();
    refEngine.current = new Engine(scene);
    refKeyboard.current = scene.createKeyboard();
    refMouse.current = scene.createMouse();
  };

  useEffect(() => {
    log({ uf: '[]' });
    setupViewport();
    setupScene();
  }, []);

  useEffect(() => {
    log({ uf: `[ctx, viewport]: ${ctx}, ${viewport}` });
    if (!ctx) return;
    const scene = refScene.current;
    const camera = refCamera.current = scene.createCamera({
      ctx, viewport,
      dragPos: null,
      update(dt) {
        const mouse = this.scene.mouse;
        if (!this.dragPos && mouse.isBtnDown('left')) {
          const mousePos = mouse.getPositionOnViewport();
          this.dragPos = mousePos;
        }

        if (mouse.isBtnUp('left')) {
          this.dragPos = null;
        }

        if (this.dragPos) {
          const currMousePos = mouse.getPositionOnViewport();
          const diffX = currMousePos[0] - this.dragPos[0];
          this.transform.position[0] -= diffX;
          this.dragPos = currMousePos;
        }

      },
    }, {
      position: [
        -viewport.size[0] / 2,
        viewport.size[1] / 2,
        Infinity,
      ],
    });

    refEngine.current.run();

    log({ viewSize: viewport.size });

    const MAX_MS_WIDTH = 10;

    const timeline = refTimeline.current = camera.createObject(ObjectGroup, {
      currMSWidth: MAX_MS_WIDTH * .0001,
      update(dt) {
        const camSize = this.scene.camera.getSize();
        this.size = [
          camSize[0],
          camSize[1] * .1,
        ];
        this.transform.position = [
          camSize[0] / 2,
          -camSize[1] / 2,
        ];

        const { scrollDelta } = this.scene.mouse;
        if (this.scene.keyboard.isKeyDown('shift') && scrollDelta) {
          this.currMSWidth += this.currMSWidth * (scrollDelta * .1);
        }
        if (this.scene.keyboard.isKeyDown('alt')) {
          this.transform.position[1] += scrollDelta * dt * 1000;
        }
      },
    }, {
      tag: 'timeline',
    });

    timeline.createObject(Rect, {
      // backgroundColor: '#faa',
      backgroundColor: '#000',
      update(dt) {
        this.size = this.parent.size;
      }
    }, {
      tag: 'timeline-box',
    });

    const getCurrDatePos = (msWidth, posX) => {
      const backInTimeMSs = posX / msWidth;
      const date = new Date(NOW + backInTimeMSs);
        
      const ms = {
        value: date.getMilliseconds(),
        min: 0,
        leftHandWidth: msWidth,
        fullWidth: msWidth,
        begin: posX - msWidth,
        end: posX,
      };
    
      const sec = {
        value: date.getSeconds(),
        min: 0,
        leftHandWidth: ms.value * ms.fullWidth + ms.leftHandWidth,
        fullWidth: ms.fullWidth * 1000,
        get begin() {
          return posX - this.leftHandWidth;
        },
        get end() {
          return posX + (this.fullWidth - this.leftHandWidth);
        },
      };
    
      const min = {
        value: date.getMinutes(),
        min: 0,
        leftHandWidth: sec.value * sec.fullWidth + sec.leftHandWidth,
        fullWidth: sec.fullWidth * 60,
        get begin() {
          return posX - this.leftHandWidth;
        },
        get end() {
          return posX + (this.fullWidth - this.leftHandWidth);
        },
      };
    
      const hour = {
        value: date.getHours(),
        min: 0,
        leftHandWidth: min.value * min.fullWidth + min.leftHandWidth,
        fullWidth: min.fullWidth * 60,
        get begin() {
          return posX - this.leftHandWidth;
        },
        get end() {
          return posX + (this.fullWidth - this.leftHandWidth);
        },
      };
    
      const day = {
        value: date.getDate(),
        min: 1,
        leftHandWidth: hour.value * hour.fullWidth + hour.leftHandWidth,
        fullWidth: hour.fullWidth * 24,
        get begin() {
          return posX - this.leftHandWidth;
        },
        get end() {
          return posX + (this.fullWidth - this.leftHandWidth);
        },
      };
    
      const month = {
        value: date.getMonth(),
        min: 0,
        leftHandWidth: Math.max(day.value - 1, 0) * day.fullWidth + day.leftHandWidth,
        get fullWidth() {
          return getNumOfDaysPerMonth(year.value, this.value) * day.fullWidth;
        },
        get begin() {
          return posX - this.leftHandWidth;
        },
        get end() {
          return posX + (this.fullWidth - this.leftHandWidth);
        },
      };
    
      const year = {
        value: date.getFullYear(),
        min: 0,
        get leftHandWidth() {
          return Array
            .from({
              length: month.value
            })
            .reduce((days, _, month) => days + getNumOfDaysPerMonth(this.value, month), 0) *
            day.fullWidth +
            month.leftHandWidth;
        },
        get fullWidth() {
          return getNumOfDaysPerYear(this.value) * day.fullWidth;
        },
        get begin() {
          return posX - this.leftHandWidth;
        },
        get end() {
          return posX + (this.fullWidth - this.leftHandWidth);
        },
      };
    
      return {
        ms,
        sec,
        min,
        hour,
        day,
        month,
        year,
      };
    };

    const getNumOfDaysPerMonth = (year, month) =>
      new Date(year, month + 1, 0).getDate();

    const getNumOfDaysPerYear = year => Array
      .from({ length: 12 })
      .reduce((days, _, month) =>
        days + getNumOfDaysPerMonth(year, month), 0);

    const minVisibleWidth = 2;

    const getMinimumVisibleTimeRange = msWidth => {
      const secWidth = msWidth * 1000;
      const minWidth = secWidth * 60;
      const hourWidth = minWidth * 60;
      const dayWidth = hourWidth * 24;
      const monthWidth = dayWidth * 30;
      const yearWidth = monthWidth * 12;
      if (msWidth >= minVisibleWidth)
        return { width: msWidth, name: 'ms' };
      if (secWidth >= minVisibleWidth)
        return { width: secWidth, name: 'sec' };
      if (minWidth >= minVisibleWidth)
        return { width: minWidth, name: 'min' };
      if (hourWidth >= minVisibleWidth)
        return { width: hourWidth, name: 'hour' };
      if (dayWidth >= minVisibleWidth)
        return { width: dayWidth, name: 'day' };
      if (monthWidth >= minVisibleWidth)
        return { width: monthWidth, name: 'month' };
      // if (yearWidth >= minVisibleWidth)
      return { width: yearWidth, name: 'year' };
    };

    timeline.createObject(ObjectGroup, {
      size: [0, 0],
      update(dt) {
        this.size = this.parent.size;
      },
      async render() {
        const { currMSWidth } = this.parent;
        const camSize = this.scene.camera.getSize();
        const camEdgePos = this.scene.camera.getEdgePositionsOnScene();
        const startPosition = this.getPositionOnScene();

        const minimumVisibleTimeRange = getMinimumVisibleTimeRange(currMSWidth);
        log({ minimumVisibleTimeRange: minimumVisibleTimeRange.name });
        let i = 1000;
        let linePosX = startPosition[0];
        log({ linePosX, currMSWidth });
        let count = 0;
        while (true && i--) {
          count++;
          const {
            [minimumVisibleTimeRange.name]: currDatePos,
          } = getCurrDatePos(currMSWidth, linePosX);
          linePosX = currDatePos.begin;
          if (linePosX < camEdgePos.l - currDatePos.fullWidth)
            break;

          const linePosition = [
            linePosX,
            startPosition[1] + this.size[1],
          ];

          const color = (currDatePos.value === currDatePos.min)
            ? 'red'
            : 'white';

          this.scene.camera.renderLine({
            position: linePosition,
            vertices: [
              [0, 0],
              [0, -10],
            ],
            color,
            lineWidth: 1,
          });

          this.scene.camera.renderText({
            text: currDatePos.value,
            color: 'white',
            size: 10,
            position: [
              linePosition[0] + (currDatePos.fullWidth / 2),
              linePosition[1] - 20,
            ],
          });
        }
        log({ count, linePosX });
      }
    }, {
      tag: 'timeline-short-lines',
    });

    const pr = scene.createObject(Rect, {
      backgroundColor: '#faf',
      size: [5, 5],
      radius: 10,
    }, {
      tag: 'pr',
      position: [-300, 30],
    });

    const prShape = pr.createObject(Rect,
      {
        backgroundColor: '#ffa',
        size: [200, 50],
      },
      {
        tag: 'prShape',
      }
    );

    const prTitle = pr.createObject(Text,
      {
        text: 'this is a pr title.',
        size: 16,
        weight: 400,
      },
      {
        tag: 'prTitle',
        position: [
          -prShape.size[0] + 10,
          prShape.size[1] / 2,
          20
        ],
      },
    );

    scene.createObject(Line, {
      vertices: [
        [0, 0],
        [200, 100],
      ],
      color: 'red',
      lineWidth: 2,
    }, {
      position: [-400, 300],
    });

  }, [ctx, viewport]);


  useEffect(() => {
    log({ uf: `[records]: ${records.length}` });

  }, [records]);

  return (
    <div ref={refWrapper} className='grantt-chart-wrapper'>
      <canvas
        tabIndex={0}
        ref={refCanvas}
        onMouseEnter={() => refCanvas.current.focus()}
        onMouseLeave={() => refCanvas.current.blur()}
        onKeyDown={e => refKeyboard.current.setKeyState({ [e.key.toLowerCase()]: true })}
        onKeyUp={e => refKeyboard.current.setKeyState({ [e.key.toLowerCase()]: false })}
        onWheel={e => refMouse.current.setScrollDelta(Math.sign(e.deltaY * -1))}
        onMouseDown={() => refMouse.current.setBtnState({ left: true })}
        onMouseUp={() => refMouse.current.setBtnState({ left: false })}
        onMouseMove={e => refMouse.current.setPosition([
          e.clientX - e.target.getBoundingClientRect().left,
          e.clientY - e.target.getBoundingClientRect().top,
        ])}
      />
    </div>
  );
};

export default GanttChart;
