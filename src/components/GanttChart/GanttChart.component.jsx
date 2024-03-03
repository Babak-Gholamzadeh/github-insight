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
      update(dt) {
        // const { scrollDelta } = this.scene.mouse;
        // if (this.scene.keyboard.isKeyDown('shift')) {
        //   this.transform.position[0] += scrollDelta * dt * 1000;
        // }
        // if (this.scene.keyboard.isKeyDown('alt')) {
        //   this.transform.position[1] += scrollDelta * dt * 1000;
        // }
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

    const MAX_SECOND_GAP = 10;

    const timeline = refTimeline.current = camera.createObject(ObjectGroup, {
      currSecGap: MAX_SECOND_GAP,
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
          this.currSecGap += this.currSecGap * (scrollDelta * .1);
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

    timeline.createObject(ObjectGroup, {
      size: [0, 0],
      update(dt) {
        this.size = this.parent.size;
      },
      async render() {
        const camSize = this.scene.camera.getSize();
        const position = this.getPosition();

        const currSecGap = this.parent.currSecGap;
        const currMinGap = currSecGap * 60;
        const currHourGap = currMinGap * 60;
        const currDayGap = currHourGap * 24;

        const totalSeconds = camSize[0] / currSecGap;

        const [currRange, currGap, currStep, nextStep] = (() => {
          if (currSecGap >= 2)
            return ['Sec', currSecGap, 1, 60];
          if (currMinGap >= 2)
            return ['Min', currMinGap, 60, 60];
          if (currHourGap >= 2)
            return ['Hour', currHourGap, 60 * 60, 24];
          if (currDayGap >= 2)
            return ['Day', currDayGap, 24 * 60 * 60, 30];
          return ['N/A', 0, 0];
        })();

        const totalLines = Math.ceil(totalSeconds / currStep);
        const transparency = currGap > 10 ? 255 : Math.floor((currGap - 1) / 10 * 255);
        const height = currGap > 10 ? 10 : ((currGap - 1) / 10 * 10);
        const width = currGap > 10 ? 1 : ((currGap - 1) / 10 * 1);

        log({ currSecGap, currRange, currGap, currStep, nextStep, transparency, height, width, totalLines });


        for (let i = 0; i < totalLines; i++) {
          const linePosition = [
            position[0] - (i * currGap),
            position[1] + this.size[1],
          ];
          const color = !(i % nextStep)
            ? 'white'
            : `rgb(${transparency}, ${transparency}, ${transparency})`;

          const lineHeight = !(i % nextStep)
            ? 10 + height
            : 10;

          const lineWidth = !(i % nextStep)
            ? 1
            : width;

          this.scene.camera.renderLine({
            position: linePosition,
            vertices: [
              [0, 0],
              [0, -lineHeight],
            ],
            color: 'white',
            lineWidth,
          });

        }

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
        onMouseMove={e => refMouse.current.setPosition([
          e.clientX - e.target.getBoundingClientRect().left,
          e.clientY - e.target.getBoundingClientRect().top,
        ])}
      />
    </div>
  );
};

export default GanttChart;
