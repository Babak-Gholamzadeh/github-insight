/* eslint-disable no-lone-blocks */
import { useEffect, useRef, useState } from 'react';
import {
  log,
  getHumanReadableTimeAgo,
  getReadableTimePeriod,
} from '../../utils';
import {
  Engine,
  Scene,
  EmptyObject,
  Line,
  Ploygon,
  Rect,
  RectImage,
  Text,
} from '../../utils/canvas-engine';
import draftPullRequestIcon from '../../assets/images/git-pull-request-draft-svgrepo-com.svg';
import openPullRequestIcon from '../../assets/images/git-pull-request-open-svgrepo-com.svg';
import mergedPullRequestIcon from '../../assets/images/git-merge-svgrepo-com.svg';
import closedPullRequestIcon from '../../assets/images/git-pull-request-closed-svgrepo-com.svg';

import './BarChart.style.scss';

const PR_STATE_COLORS = {
  open: [63, 186, 80, .9],
  draft: [133, 141, 151, .9],
  merged: [163, 113, 247, .9],
  closed: [248, 81, 73, .9],
};

const PR_STATE_ICONS = {
  open: openPullRequestIcon,
  draft: draftPullRequestIcon,
  merged: mergedPullRequestIcon,
  closed: closedPullRequestIcon,
};

const MONTH_FULL_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const BG_HIGHLIGHT_COLORS = (op) => [
  `rgba(255, 215, 0, ${op})`,     // Gold
  `rgba(255, 105, 180, ${op})`,   // Pink
  `rgba(0, 250, 154, ${op})`,     // Medium Spring Green
  `rgba(30, 144, 255, ${op})`,    // Dodger Blue
  `rgba(255, 140, 0, ${op})`,     // Dark Orange
  `rgba(138, 43, 226, ${op})`,    // Blue Violet
  `rgba(50, 205, 50, ${op})`,     // Lime Green
  `rgba(255, 69, 0, ${op})`,      // Red Orange
  `rgba(255, 99, 71, ${op})`,     // Tomato
  `rgba(139, 69, 19, ${op})`,     // Saddle Brown
  `rgba(75, 0, 130, ${op})`,      // Indigo
  `rgba(85, 107, 47, ${op})`,     // Dark Olive Green
];

const BarChart = ({ records }) => {
  log({ ComponentRerendered: 'GanttChart' });
  const refWrapper = useRef();
  const refCanvas = useRef();
  const refEngine = useRef();
  const refScene = useRef();
  const refCamera = useRef();
  const refKeyboard = useRef();
  const refMouse = useRef();

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
    // Camera
    const camera = refCamera.current = scene.createCamera({
      ctx, viewport,
      dragPos: null,
      update(dt) {
        const { mouse, keyboard } = this.scene;
        if (!this.dragPos &&
          mouse.isBtnDown('left') &&
          !keyboard.isKeyDown('shift') &&
          !keyboard.isKeyDown('alt')
        ) {
          const mousePos = mouse.getPositionOnViewport();
          this.dragPos = mousePos;
        }

        if (mouse.isBtnUp('left')) {
          this.dragPos = null;
        }

        if (this.dragPos) {
          const currMousePos = mouse.getPositionOnViewport();
          const diffX = currMousePos[0] - this.dragPos[0];
          const diffY = currMousePos[1] - this.dragPos[1];
          const camSize = this.getSize();
          this.transform.position[0] = Math.min(
            this.transform.position[0] - diffX,
            -camSize[0] / 2,
          );
          this.transform.position[1] = Math.max(
            this.transform.position[1] + diffY,
            camSize[1] / 2,
          );
          this.dragPos = currMousePos;
        }
      },
    }, {
      position: [
        -viewport.size[0] / 2,
        viewport.size[1] / 2,
      ],
      renderOrder: 10,
    });

    refEngine.current.run();

    log({ viewSize: viewport.size });

    // FPS
    camera.createObject(Text, {
      color: 'rgba(255, 255, 255, .7)',
      size: 12,
      frameCount: 0,
      sumDt: 0,
      fps: 0,
      update(dt) {
        this.frameCount++;
        this.sumDt += dt;
        if (this.sumDt >= .1) {
          this.fps = this.frameCount / this.sumDt;
          this.text = `fps: ${this.fps.toFixed(2)}`;
          this.frameCount = 0;
          this.sumDt = 0;
        }
      },
    }, {
      tag: 'fps',
      position: [
        -camera.getSize()[0] / 2,
        camera.getSize()[1] / 2 - 10,
      ],
    });

    // Do everything here...

    // Tracks
    const tracks = scene.createObject(EmptyObject, {
      trackWidth: 40,
      trackPadding: 2,
      trackLineWidth: 1,
      update(dt) {
        const { scrollDelta } = this.scene.mouse;
        const changeScale = scrollDelta * .1;
        const MAX_WIDTH = this.scene.camera.viewport.size[0];
        const MIN_WIDTH = .5;
        if (this.scene.keyboard.isKeyDown('shift') &&
          (
            (changeScale > 0 && this.trackWidth < MAX_WIDTH) ||
            (changeScale < 0 && this.trackWidth > MIN_WIDTH)
          )
        ) {
          log({ changeScale });
          this.trackWidth = Math.max(Math.min(this.trackWidth + this.trackWidth * changeScale, MAX_WIDTH), MIN_WIDTH);
          this.trackLineWidth = this.trackWidth / 40;
        }
      },
      render() {
        if (this.trackLineWidth < .1)
          return;
        const { camera } = this.scene;
        const camSize = camera.getSize();
        const camEdgePos = camera.getEdgePositionsOnScene();
        const offsetX = Math.floor(Math.max(camEdgePos.r, 0) / this.trackWidth);
        for (let i = offsetX; i > camEdgePos.l; i -= this.trackWidth) {
          camera.renderLine({
            color: '#333',
            lineWidth: this.trackLineWidth,
            position: [
              i,
              camEdgePos.b,
            ],
            vertices: [
              [0, 0],
              [0, camSize[1]],
            ],
          });
        }
      },
    }, {
      tag: 'tracks',
      renderOrder: -Infinity,
    });

    
    scene.createObject(Rect, {
      backgroundColor: 'yellow',
      size: [100, 50],
    }, {
      tag: 'ref-object',
      position: [-400, 100],
    });

  }, [ctx, viewport]);


  useEffect(() => {
    log({ uf: `[records]: ${records.length}` });
    // refPRs.current?.updatePRs(records);
  }, [records]);

  return (
    <div ref={refWrapper} className='bar-chart-wrapper'>
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

export default BarChart;
