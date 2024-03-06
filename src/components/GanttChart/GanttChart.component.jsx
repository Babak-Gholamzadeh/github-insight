import { useEffect, useRef, useState } from 'react';
import {
  log,
  // getRandomColor,
  // getReadableTimePeriodShorter,
} from '../../utils';
import {
  Engine,
  Scene,
  EmptyObject,
  Line,
  Rect,
  RectImage,
  Text,
} from './engine';

import './GanttChart.style.scss';

const PR_STATE_COLORS = {
  open: [63, 186, 80, 1],
  draft: [133, 141, 151, 1],
  merged: [163, 113, 247, 1],
  closed: [248, 81, 73, 1],
};

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
  const refPRs = useRef();

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
    const TIMELINE_HEIGHT = viewport.size[1] * .1;

    // Camera
    const camera = refCamera.current = scene.createCamera({
      ctx, viewport,
      dragPos: null,
      update(dt) {
        // log({ updateCM: dt });
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
          const diffY = currMousePos[1] - this.dragPos[1];
          this.transform.position[0] -= diffX;
          this.transform.position[1] = Math.max(
            this.transform.position[1] + diffY,
            this.getSize()[1] / 2 - TIMELINE_HEIGHT,
          );
          this.dragPos = currMousePos;
        }
      },
    }, {
      position: [
        -viewport.size[0] / 2,
        viewport.size[1] / 2 - TIMELINE_HEIGHT,
      ],
      layerOrder: Infinity,
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

    // Timeline
    const timeline = refTimeline.current = camera.createObject(EmptyObject, {
      currMSWidth: .0000005,
      size: [
        camera.viewport.size[0],
        TIMELINE_HEIGHT,
      ],
      update(dt) {
        const { mouse, keyboard, camera } = this.scene;
        const { scrollDelta } = mouse;
        if (keyboard.isKeyDown('shift') && scrollDelta) {
          const changeScale = scrollDelta * .1;
          this.currMSWidth += this.currMSWidth * changeScale;
          const mousePos = mouse.getPositionOnScene();
          camera.transform.position[0] += mousePos[0] * changeScale;
          // log({ updateTM: this.currMSWidth });
        }
      },
    }, {
      tag: 'timeline',
      position: [
        camera.viewport.size[0] / 2,
        -camera.viewport.size[1] / 2,
      ],
    });

    // Timeline > background
    timeline.createObject(Rect, {
      // backgroundColor: '#faa',
      backgroundColor: 'rgba(0, 0, 0, 1)',
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

    // Timeline > shortlines
    timeline.createObject(EmptyObject, {
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
        let linePosX = startPosition[0];
        while (true) {
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
            textAlign: 'center',
            position: [
              linePosition[0],
              linePosition[1] - 20,
            ],
          });
        }
      }
    }, {
      tag: 'timeline-short-lines',
    });

    // Tracks
    const tracks = scene.createObject(EmptyObject, {
      trackHeight: 40,
      trackPadding: 2,
      update(dt) {
        const { scrollDelta } = this.scene.mouse;
        if (this.scene.keyboard.isKeyDown('alt') && scrollDelta) {
          this.trackHeight += this.trackHeight * (scrollDelta * .1);
          this.trackPadding = 2 * this.trackHeight / 40;
        }
      },
      async render() {
        const { camera } = this.scene;
        const camSize = camera.getSize();
        const camEdgePos = camera.getEdgePositionsOnScene();
        const offsetY = Math.floor(Math.max(camEdgePos.b, 0) / this.trackHeight);
        for (let i = offsetY; i < camEdgePos.t; i += this.trackHeight) {
          camera.renderLine({
            color: '#333',
            lineWidth: 1,
            position: [
              camEdgePos.r,
              i,
            ],
            vertices: [
              [0, 0],
              [-camSize[0], 0],
            ],
          });
        }
      },
    }, {
      tag: 'tracks',
      layerOrder: -Infinity,
    });

    // PRs
    refPRs.current = scene.createObject(EmptyObject, {
      trackOccupancy: {
        tracks: [],
        empty() {
          this.tracks = [];
        },
        registerInTrack(x, w) {
          const tIdx = this.tracks.findIndex(v => x < v);
          if (tIdx === -1) {
            this.tracks.push(x - w);
            return this.tracks.length - 1;
          }
          this.tracks[tIdx] = x - w;
          return tIdx;
        },
      },
      update(dt) {
      },
      updatePRs(records) {
        log({ recordsLen: records.length });

        this.objects = [];
        this.trackOccupancy.empty();

        records.slice(0, 10).forEach(record => {
          const closedAtTime = new Date(record.closed_at).getTime() || NOW;
          const createdAtTime = new Date(record.created_at).getTime();
          const x = -(NOW - closedAtTime);
          const w = (closedAtTime - createdAtTime);

          const trackIdx = this.trackOccupancy.registerInTrack(x, w);
          // log({ trackIdx });

          const pr = this.createObject(Rect, {
            backgroundColor: `rgba(${PR_STATE_COLORS[record.state]})`,
            radius: 5,
            update(dt) {
              this.size = [
                w * timeline.currMSWidth,
                tracks.trackHeight - (tracks.trackPadding * 2),
              ];
              this.transform.position = [
                x * timeline.currMSWidth,
                trackIdx * tracks.trackHeight + tracks.trackPadding,
              ];

              if (this.onMouseHover()) {
                const BGcolor = [...PR_STATE_COLORS[record.state]];
                BGcolor[3] = 1;
                this.backgroundColor = `rgba(${BGcolor})`;
                this.toolTip.show();
              } else if (this.onMouseOut()) {
                this.backgroundColor = `rgba(${PR_STATE_COLORS[record.state]})`;
                this.toolTip.hide();
              }
            },
          }, {
            tag: 'pr-child',
            layerOrder: 100000 - trackIdx,
          });
          pr.toolTip = pr.createObject(Rect, {
            size: [200, 100],
            backgroundColor: 'rgba(255, 255, 255, 1)',
            radius: 20,
            visible: false,
            enable: false,
            show() { this.visible = this.enable = true; },
            hide() { this.visible = this.enable = false; },
            update(dt) {
              const mousePos = this.scene.mouse.getPositionOnScene();
              const parentPos = this.parent.getPositionOnScene();
              const x = mousePos[0] - parentPos[0] + this.size[0];
              this.transform.position = [
                x,
                tracks.trackHeight,
              ];
            }
          }, {
            tag: 'pr-tooltip',
          });
          pr.userAvatar = pr.createObject(RectImage, {
            url: record.user.avatar_url,
            size: [30, 30],
            radius: 30,
            backgroundColor: 'rgba(255, 255, 255, .5)',
            margin: 3,
            update(dt) {
              const squereSize = this.parent.size[1] - (this.margin * 2);
              this.size = [
                squereSize,
                squereSize,
              ];
              this.radius = squereSize;
              this.transform.position[1] = this.parent.size[1] / 2 - this.size[1] / 2;
              if (this.parent.size[0] < squereSize + (this.margin * 2)) {
                this.visible = false;
              } else if (!this.visible) {
                this.visible = true;
              }
            }
          }, {
            position: [-3, 0],
          })
        });
      },
      async renderObjects() {
        for (const object of this.getObjectsByDepth()) {
          await object.renderObjects();
        }
      }
    }, {
      tag: 'PR',
    });

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
    refPRs.current?.updatePRs(records);
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
