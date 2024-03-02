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

    const timeline = refTimeline.current = camera.createObject(ObjectGroup, {
      secondRange: 100,
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
        if (this.scene.keyboard.isKeyDown('shift')) {
          this.secondRange += scrollDelta * dt * 200;
        }
        if (this.scene.keyboard.isKeyDown('alt')) {
          this.transform.position[1] += scrollDelta * dt * 1000;
        }
      },
    }, {
      tag: 'timeline',
    });

    const timelineBox = timeline.createObject(Rect, {
      backgroundColor: '#faa',
      update(dt) {
        this.size = this.parent.size;
      }
    }, {
      tag: 'timeline-box',
    });

    const timelineShortLines = timeline.createObject(ObjectGroup, {
      size: [0, 0],
      update(dt) {
        this.size = this.parent.size;
      },
      async render() {
        const camSize = this.scene.camera.getSize();
        const position = this.getPosition();
        const secondRange = this.parent.secondRange;
        for (let i = 0; i < camSize[0] / secondRange; i++) {
          const linePosition = [
            position[0] - (i * secondRange),
            position[1] + this.size[1],
          ];
          this.scene.camera.renderLine({
            position: linePosition,
            vertices: [
              [0, 0],
              [0, -10],
            ],
            color: 'blue',
            lineWidth: 1,
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
