/* eslint-disable no-lone-blocks */
import { useEffect, useRef, useState } from 'react';
import {
  log,
  getHumanReadableTimeAgo,
  getReadableTimePeriod,
  createPrecisionErrHandler,
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
    const TIMELINE_WIDTH = 60;
    const INIT_MS_HEIGHT = .00000002;
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
            -camSize[0] / 2 + TIMELINE_WIDTH,
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
        -viewport.size[0] / 2 + TIMELINE_WIDTH,
        viewport.size[1] / 2,
      ],
      updateOrder: -10,
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

    // Timeline
    const MAX_MS_HEIGHT = 60;
    const MIN_MS_HEIGHT = 0.0000000015;
    const timeline = refTimeline.current = camera.createObject(EmptyObject, {
      currMSHeight: INIT_MS_HEIGHT,
      minimumVisibleTimeRange: null,
      size: [
        TIMELINE_WIDTH,
        camera.getSize()[1],
      ],
      update(dt) {
        const { mouse, keyboard, camera } = this.scene;
        const { scrollDelta } = mouse;
        if (keyboard.isKeyDown('shift') && scrollDelta) {
          const changeScale = scrollDelta * .1;
          if (
            (changeScale > 0 && this.currMSHeight < MAX_MS_HEIGHT) ||
            (changeScale < 0 && this.currMSHeight > MIN_MS_HEIGHT)
          ) {
            this.currMSHeight = Math.max(Math.min(this.currMSHeight + this.currMSHeight * changeScale, MAX_MS_HEIGHT), MIN_MS_HEIGHT);
            const mousePos = mouse.getPositionOnScene();
            const CAMERA_LOWEST_BOTTOM = viewport.size[1] / 2;
            camera.transform.position[1] = Math.max(
              camera.transform.position[1] + mousePos[1] * changeScale,
              CAMERA_LOWEST_BOTTOM,
            );
          }
        }
      },
    }, {
      tag: 'timeline',
      position: [
        camera.getSize()[0] / 2,
        -camera.getSize()[1] / 2,
      ],
    });

    // Timeline > background
    timeline.createObject(Rect, {
      // backgroundColor: '#faa',
      backgroundColor: 'rgba(0, 0, 0, .3)',
      update(dt) {
        this.size = this.parent.size;
      }
    }, {
      tag: 'timeline-box',
    });

    const getCurrDurationPos = (msHeight, posY) => {
      const handlePrecisionErr = createPrecisionErrHandler(msHeight);

      const secHeight = handlePrecisionErr(msHeight * 1000);
      const minHeight = handlePrecisionErr(msHeight * 1000 * 60);
      const hourHeight = handlePrecisionErr(msHeight * 1000 * 60 * 60);
      const dayHeight = handlePrecisionErr(msHeight * 1000 * 60 * 60 * 24);
      const monthHeight = handlePrecisionErr(msHeight * 1000 * 60 * 60 * 24 * 30);
      const yearHeight = handlePrecisionErr(msHeight * 1000 * 60 * 60 * 24 * 30 * 12);

      const passedMSs = Math.floor(handlePrecisionErr(posY / msHeight));
      const passedSecs = Math.floor(handlePrecisionErr(posY / secHeight));
      const passedMins = Math.floor(handlePrecisionErr(posY / minHeight));
      const passedHours = Math.floor(handlePrecisionErr(posY / hourHeight));
      const passedDays = Math.floor(handlePrecisionErr(posY / dayHeight));
      const passedMonths = Math.floor(handlePrecisionErr(posY / monthHeight));
      const passedYears = Math.floor(handlePrecisionErr(posY / yearHeight));

      const ms = {
        value: passedMSs % 1000,
        min: 0,
        max: 999,
        topHandHeight: msHeight,
        fullHeight: msHeight,
        get begin() {
          return handlePrecisionErr(posY + this.topHandHeight);
        },
        end: posY,
        unit: 'ms',
        get fullText() {
          return this.value.toString() + this.unit;
        },
        get shortText() {
          return this.value.toString();
        },
      };

      const sec = {
        value: passedSecs % 60,
        min: 0,
        max: 59,
        fullHeight: secHeight,
        get topHandHeight() {
          return handlePrecisionErr((ms.max - ms.value) * ms.fullHeight + ms.topHandHeight);
        },
        get begin() {
          return handlePrecisionErr(posY + this.topHandHeight);
        },
        get end() {
          return handlePrecisionErr(posY - (this.fullHeight - this.topHandHeight));
        },
        unit: 's',
        get fullText() {
          return this.value.toString() + this.unit;
        },
        get shortText() {
          return this.value.toString();
        },
      };

      const min = {
        value: passedMins % 60,
        min: 0,
        max: 59,
        fullHeight: handlePrecisionErr(sec.fullHeight * 60),
        get topHandHeight() {
          return handlePrecisionErr((sec.max - sec.value) * sec.fullHeight + sec.topHandHeight);
        },
        get begin() {
          return handlePrecisionErr(posY + this.topHandHeight);
        },
        get end() {
          return handlePrecisionErr(posY - (this.fullHeight - this.topHandHeight));
        },
        unit: 'm',
        get fullText() {
          return this.value.toString() + this.unit;
        },
        get shortText() {
          return this.value.toString();
        },
      };

      const hour = {
        value: passedHours % 24,
        min: 0,
        max: 23,
        fullHeight: handlePrecisionErr(min.fullHeight * 60),
        get topHandHeight() {
          return handlePrecisionErr((min.max - min.value) * min.fullHeight + min.topHandHeight);
        },
        get begin() {
          return handlePrecisionErr(posY + this.topHandHeight);
        },
        get end() {
          return handlePrecisionErr(posY - (this.fullHeight - this.topHandHeight));
        },
        unit: 'h',
        get fullText() {
          return this.value.toString() + this.unit;
        },
        get shortText() {
          return this.value.toString();
        },
      };

      const day = {
        value: passedDays % 30,
        min: 0,
        max: 29,
        fullHeight: hour.fullHeight * 24,
        get topHandHeight() {
          return handlePrecisionErr((hour.max - hour.value) * hour.fullHeight + hour.topHandHeight);
        },
        get begin() {
          return handlePrecisionErr(posY + this.topHandHeight);
        },
        get end() {
          return handlePrecisionErr(posY - (this.fullHeight - this.topHandHeight));
        },
        unit: 'd',
        get fullText() {
          return this.value.toString() + this.unit;
        },
        get shortText() {
          return this.value.toString();
        },
      };

      const month = {
        value: passedMonths % 12,
        min: 0,
        max: 11,
        fullHeight: day.fullHeight * 30,
        get topHandHeight() {
          return handlePrecisionErr((day.max - day.value) * day.fullHeight + day.topHandHeight);
        },
        get begin() {
          return handlePrecisionErr(posY + this.topHandHeight);
        },
        get end() {
          return handlePrecisionErr(posY - (this.fullHeight - this.topHandHeight));
        },
        unit: 'm',
        get fullText() {
          return this.value.toString() + this.unit;
        },
        get shortText() {
          return this.value.toString();
        },
      };

      const year = {
        value: passedYears,
        min: 0,
        max: 10000,
        fullHeight: month.fullHeight * 12,
        get topHandHeight() {
          return handlePrecisionErr((month.max - month.value) * month.fullHeight + month.topHandHeight);
        },
        get begin() {
          return handlePrecisionErr(posY + this.topHandHeight);
        },
        get end() {
          return handlePrecisionErr(posY - (this.fullHeight - this.topHandHeight));
        },
        unit: 'y',
        get fullText() {
          return this.value.toString() + this.unit;
        },
        get shortText() {
          return this.value.toString();
        },
      };

      {
        ms.lowerDate = null;
        ms.higherDate = sec;
        sec.lowerDate = ms;
        sec.higherDate = min;
        min.lowerDate = sec;
        min.higherDate = hour;
        hour.lowerDate = min;
        hour.higherDate = day;
        day.lowerDate = hour;
        day.higherDate = month;
        month.lowerDate = day;
        month.higherDate = year;
        year.lowerDate = month;
        year.higherDate = null;
      }

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

    const MIN_VISIBLE_HEIGHT = 2;

    const getMinimumVisibleTimeRange = msHeight => {
      const secHeight = msHeight * 1000;
      const minHeight = secHeight * 60;
      const hourHeight = minHeight * 60;
      const dayHeight = hourHeight * 24;
      const monthHeight = dayHeight * 30;
      const yearHeight = monthHeight * 12;
      if (msHeight >= MIN_VISIBLE_HEIGHT)
        return { height: msHeight, name: 'ms' };
      if (secHeight >= MIN_VISIBLE_HEIGHT)
        return { height: secHeight, name: 'sec' };
      if (minHeight >= MIN_VISIBLE_HEIGHT)
        return { height: minHeight, name: 'min' };
      if (hourHeight >= MIN_VISIBLE_HEIGHT)
        return { height: hourHeight, name: 'hour' };
      if (dayHeight >= MIN_VISIBLE_HEIGHT)
        return { height: dayHeight, name: 'day' };
      if (monthHeight >= MIN_VISIBLE_HEIGHT)
        return { height: monthHeight, name: 'month' };
      // if (yearHeight >= MIN_VISIBLE_HEIGHT)
      return { height: yearHeight, name: 'year' };
    };

    // Timeline > shortlines
    timeline.createObject(EmptyObject, {
      size: [0, 0],
      update(dt) {
        this.size = this.parent.size;
      },
      render() {
        const { currMSHeight } = this.parent;
        const camEdgePos = this.scene.camera.getEdgePositionsOnScene();
        const camSize = this.scene.camera.getSize();
        const startPosition = this.getPositionOnScene();

        timeline.minimumVisibleTimeRange = getMinimumVisibleTimeRange(currMSHeight);

        let linePosY = startPosition[1];
        let i = 0;
        let currDurationPos;
        ({ [timeline.minimumVisibleTimeRange.name]: currDurationPos } = getCurrDurationPos(currMSHeight, linePosY));

        const width = 15;
        const maxHeight = 60;
        const currHeight = currDurationPos.fullHeight;
        let textColorAlpha = 1;
        let lineLength = width;
        let lineWidth = 1;
        let smallFontSize = 11;
        let largeFontSize = 16;
        let currDateXOffset = width;
        let higherDateXOffset = 0;
        // const MAX_BG_HIGHLIGHT_OP = .05;
        log({ currMSHeight });

        const itsEnding = currDurationPos.value === currDurationPos.max;
        textColorAlpha = 1;
        lineLength = width;
        lineWidth = 1;
        smallFontSize = 11;
        largeFontSize = 16;
        currDateXOffset = width;
        higherDateXOffset = 0;
        if (currHeight < maxHeight) {
          smallFontSize = Math.max((currHeight + 20) / (maxHeight + 20) * 11, 8);
          textColorAlpha = (currHeight - 10) / (maxHeight - 10);
          lineLength = (currHeight) / (maxHeight) * width;
          currDateXOffset = (currHeight + 10) / (maxHeight + 10) * width;
          lineWidth = (currHeight - 0) / maxHeight;
          higherDateXOffset = (1 - currHeight / maxHeight) * 22;
          largeFontSize = (currHeight / maxHeight) * 4 + 12;
          if (itsEnding) {
            lineLength += (width - lineLength);
            lineWidth = 1;
          }
        }

        // higherDate text
        if (
          (currDurationPos.value > currDurationPos.min ||
            currDurationPos.begin < camEdgePos.b) &&
          currDurationPos.higherDate
        ) {
          const nearTop = Math.min(currDurationPos.higherDate.begin - (largeFontSize / 2), camEdgePos.t);
          const nearBottom = Math.max(currDurationPos.higherDate.end, camEdgePos.b - largeFontSize);
          const closestDistance = nearTop - nearBottom;
          const textPositionY = nearBottom + closestDistance / 2;
          const textPositionX = startPosition[0] - this.size[0] + (width * 2) - higherDateXOffset + 10;
          log({ firstHigherText: true, nearBottom, nearTop, closestDistance });
          this.scene.camera.renderText({
            text: currDurationPos.higherDate.fullText,
            color: 'white',
            size: largeFontSize,
            textAlign: 'center',
            position: [
              textPositionX,
              textPositionY,
            ],
          });
        }

        while (true && i < 1000) {
          i++;
          ({ [timeline.minimumVisibleTimeRange.name]: currDurationPos } = getCurrDurationPos(currMSHeight, linePosY));

          linePosY = currDurationPos.begin;
          if (linePosY > camEdgePos.t)
            break;

          const linePosition = [
            startPosition[0] - this.size[0],
            linePosY,
          ];

          const itsBeginning = currDurationPos.value === currDurationPos.min;
          const itsEnding = currDurationPos.value === currDurationPos.max;

          // BG Highlight
          // if (currDatePos.higherDate && itsBeginning) {
          //   const hAlpha = Math.min(currDatePos.higherDate.fullWidth / camSize[0], 1) * MAX_BG_HIGHLIGHT_OP;
          //   const BG_COLORS = BG_HIGHLIGHT_COLORS(hAlpha);
          //   this.scene.camera.renderRoundRect({
          //     backgroundColor: BG_COLORS[currDatePos.higherDate.value % BG_COLORS.length],
          //     position: [
          //       currDatePos.higherDate.begin,
          //       camEdgePos.b,
          //     ],
          //     size: [
          //       -currDatePos.higherDate.fullWidth,
          //       camSize[1],
          //     ],
          //   });

          //   if (currDatePos.higherDate.higherDate) {
          //     const hhAlpha = MAX_BG_HIGHLIGHT_OP - hAlpha;
          //     const itsBeginning = currDatePos.higherDate.value === currDatePos.higherDate.min;
          //     if (itsBeginning) {
          //       const BG_COLORS = BG_HIGHLIGHT_COLORS(hhAlpha);
          //       this.scene.camera.renderRoundRect({
          //         backgroundColor: BG_COLORS[currDatePos.higherDate.higherDate.value % BG_COLORS.length],
          //         position: [
          //           currDatePos.higherDate.higherDate.begin,
          //           camEdgePos.b,
          //         ],
          //         size: [
          //           -currDatePos.higherDate.higherDate.fullWidth,
          //           camSize[1],
          //         ],
          //       });
          //     }
          //   }
          // }

          if (currHeight < maxHeight) {
            lineLength = (currHeight) / (maxHeight) * width;
            lineWidth = (currHeight - 0) / maxHeight;
            if (itsEnding) {
              lineLength += (width - lineLength);
              lineWidth = 1;
            }
          }

          if (lineLength > 0) {
            this.scene.camera.renderLine({
              position: linePosition,
              vertices: [
                [0, 0],
                [lineLength, 0],
              ],
              color: 'white',
              lineWidth,
            });
          }

          // currDate text
          if (textColorAlpha > 0) {
            const nearTop = Math.min(currDurationPos.begin - (smallFontSize / 2), camEdgePos.t);
            const nearBottom = Math.max(currDurationPos.end, camEdgePos.b);
            const closestDistance = nearTop - nearBottom;
            const textPositionY = nearBottom + closestDistance / 2;
            const textPositionX = startPosition[0] - this.size[0] + currDateXOffset;
            this.scene.camera.renderText({
              text: currDurationPos.shortText,
              color: `rgba(255, 255, 255, ${textColorAlpha})`,
              size: smallFontSize,
              textAlign: 'center',
              position: [
                textPositionX,
                textPositionY,
              ],
            });
          }

          // higherDate text
          if (itsBeginning && currDurationPos.higherDate) {
            const nearTop = Math.min(currDurationPos.higherDate.begin - (largeFontSize / 2), camEdgePos.t);
            const nearBottom = Math.max(currDurationPos.higherDate.end, camEdgePos.b);
            const closestDistance = nearTop - nearBottom;
            const textPositionY = nearBottom + closestDistance / 2;
            const textPositionX = startPosition[0] - this.size[0] + (width * 2) - higherDateXOffset + 10;
            this.scene.camera.renderText({
              text: currDurationPos.higherDate.fullText,
              color: 'white',
              size: largeFontSize,
              textAlign: 'center',
              position: [
                textPositionX,
                textPositionY,
              ],
            });
          }

        }

        // if (currDatePos.higherDate) {
        //   const hAlpha = Math.min(currDatePos.higherDate.fullWidth / camSize[0], 1) * MAX_BG_HIGHLIGHT_OP;
        //   const BG_COLORS = BG_HIGHLIGHT_COLORS(hAlpha);
        //   this.scene.camera.renderRoundRect({
        //     backgroundColor: BG_COLORS[currDatePos.higherDate.value % BG_COLORS.length],
        //     position: [
        //       currDatePos.higherDate.end,
        //       camEdgePos.b,
        //     ],
        //     size: [
        //       currDatePos.higherDate.fullWidth,
        //       camSize[1],
        //     ],
        //   });
        //   if (currDatePos.higherDate.higherDate) {
        //     const hhAlpha = MAX_BG_HIGHLIGHT_OP - hAlpha;
        //     const itsBeginning = currDatePos.higherDate.value === currDatePos.higherDate.min;
        //     if (itsBeginning) {
        //       const BG_COLORS = BG_HIGHLIGHT_COLORS(hhAlpha);
        //       this.scene.camera.renderRoundRect({
        //         backgroundColor: BG_COLORS[currDatePos.higherDate.higherDate.value % BG_COLORS.length],
        //         position: [
        //           currDatePos.higherDate.higherDate.end,
        //           camEdgePos.b,
        //         ],
        //         size: [
        //           currDatePos.higherDate.higherDate.fullWidth,
        //           camSize[1],
        //         ],
        //       });
        //     }
        //   }
        // }

        // currDate text
        if (textColorAlpha > 0) {
          const nearTop = Math.min(currDurationPos.begin, camEdgePos.t);
          const nearBottom = Math.max(currDurationPos.end, camEdgePos.b);
          const closestDistance = nearTop - nearBottom;
          const textPositionY = nearBottom + closestDistance / 2;
          const textPositionX = startPosition[0] - this.size[0] + currDateXOffset;
          this.scene.camera.renderText({
            text: currDurationPos.shortText,
            color: `rgba(255, 255, 255, ${textColorAlpha})`,
            size: smallFontSize,
            textAlign: 'center',
            position: [
              textPositionX,
              textPositionY,
            ],
          });
        }
      }
    }, {
      tag: 'timeline-short-lines',
    });

    // Timeline > cursor
    const timelineCursor = scene.createObject(EmptyObject, {
      cursorTime: {
        ms: 0,
        sec: 0,
        min: 0,
        hour: 0,
        day: 0,
        month: 0,
        year: 0,
      },
      update(dt) {
        const camPos = this.scene.camera.getPositionOnScene();
        const mousePos = this.scene.mouse.getPositionOnScene();
        this.transform.position = [
          camPos[0],
          mousePos[1],
        ];
        const handlePrecisionErr = createPrecisionErrHandler(timeline.currMSHeight);

        const passedMSs = Math.floor(Math.abs(this.transform.position[1]) / timeline.currMSHeight);
        const passedSecs = Math.floor(handlePrecisionErr(passedMSs / 1000));
        const passedMins = Math.floor(handlePrecisionErr(passedMSs / 1000 / 60));
        const passedHours = Math.floor(handlePrecisionErr(passedMSs / 1000 / 60 / 60));
        const passedDays = Math.floor(handlePrecisionErr(passedMSs / 1000 / 60 / 60 / 24));
        const passedMonths = Math.floor(handlePrecisionErr(passedMSs / 1000 / 60 / 60 / 24 / 30));
        const passedYears = Math.floor(handlePrecisionErr(passedMSs / 1000 / 60 / 60 / 24 / 30 / 12));

        this.cursorTime.ms = passedMSs % 1000;
        this.cursorTime.sec = passedSecs % 60;
        this.cursorTime.min = passedMins % 60;
        this.cursorTime.hour = passedHours % 24;
        this.cursorTime.day = passedDays % 12;
        this.cursorTime.month = passedMonths % 24;
        this.cursorTime.year = passedYears;
      }
    }, {
      tag: 'timeline-cursor',
      updateOrder: 20,
      renderOrder: 20,
    });

    timelineCursor.createObject(Line, {
      color: '#1d6bd5',
      lineWidth: .8,
      shadow: {
        // color: 'black',
        blur: 10,
      },
      update(dt) {
        const camSize = this.scene.camera.getSize();
        this.vertices = [
          [-camSize[0] / 2, 0],
          [camSize[0] / 2 - TIMELINE_WIDTH, 0],
        ];
      },
    }, {
      tag: 'timeline-cursor-line',
    });

    const timelineCursorPoly = timelineCursor.createObject(Ploygon, {
      borderColor: '#1d6bd5',
      lineWidth: 2,
      backgroundColor: 'rgba(29, 107, 213, .8)',
      shadow: {
        color: 'rgba(29, 107, 213, .7)',
        blur: 100,
      },
      vertices: [
        [0, 0],
        [5, 35],
        [20, 35],
        [20, -35],
        [5, -35],
      ],
      size: [20, 70],
      update(dt) {
        const camSize = this.scene.camera.getSize();
        this.transform.position[0] = camSize[0] / 2 - TIMELINE_WIDTH;
      },
    }, {
      tag: 'timeline-cursor-poly',
    });

    timelineCursorPoly.createObject(Text, {
      color: 'white',
      size: 12,
      text: '',
      textAlign: 'center',
      weight: 400,
      angle: -90,
      update(dt) {
        this.transform.position = [
          this.parent.size[0] / 2 + this.size / 2,
          0,
        ];
        const { cursorTime } = this.parent.parent;
        const year = cursorTime.year.toString().padStart(2, '0');
        const month = cursorTime.month.toString().padStart(2, '0');
        const day = cursorTime.day.toString().padStart(2, '0');
        const hour = cursorTime.hour.toString().padStart(2, '0');
        const min = cursorTime.min.toString().padStart(2, '0');
        const sec = cursorTime.sec.toString().padStart(2, '0');
        const ms = cursorTime.ms.toString().padStart(3, '0');
        // eslint-disable-next-line default-case
        switch (timeline.minimumVisibleTimeRange?.name) {
          case 'ms':
            this.text = `${ms} ms`;
            break;
          case 'sec':
            this.text = `${sec}.${ms} ms`;
            break;
          case 'min':
            this.text = `${hour}:${min}:${sec}`;
            break;
          case 'hour':
            this.text = `${hour}:${min}:${sec}`;
            break;
          case 'day':
            this.text = `${year}-${month}-${day}`;
            break;
          case 'month':
            this.text = `${year}-${month}`;
            break;
          case 'year':
            this.text = `${year}`;
            break;
        }
      },
    }, {
      tag: 'timeline-cursor-line',
    });

    // Tracks
    const tracks = scene.createObject(EmptyObject, {
      trackWidth: 40,
      trackPadding: 2,
      trackLineWidth: 1,
      update(dt) {
        const { scrollDelta } = this.scene.mouse;
        const changeScale = scrollDelta * .1;
        const MAX_WIDTH = this.scene.camera.getSize()[0] - TIMELINE_WIDTH;
        const MIN_WIDTH = .5;
        const MAX_LINE_WIDTH = 15;
        if (this.scene.keyboard.isKeyDown('alt') &&
          (
            (changeScale > 0 && this.trackWidth < MAX_WIDTH) ||
            (changeScale < 0 && this.trackWidth > MIN_WIDTH)
          )
        ) {
          log({ changeScale });
          this.trackWidth = Math.max(
            Math.min(this.trackWidth + this.trackWidth * changeScale, MAX_WIDTH),
            MIN_WIDTH,
          );
          this.trackLineWidth = Math.min(this.trackWidth / 40, MAX_LINE_WIDTH);
        }
      },
      render() {
        if (this.trackLineWidth < .1)
          return;
        const { camera } = this.scene;
        const camSize = camera.getSize();
        const camEdgePos = camera.getEdgePositionsOnScene();
        const offsetX = Math.floor(Math.min(camEdgePos.r, 0) / this.trackWidth);
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

    // PRs
    refPRs.current = scene.createObject(EmptyObject, {
      updatePRs(records) {
        log({ recordsLen: records.length });

        this.objects = [];

        records.forEach((record, i) => {
          const openMS = (new Date(record.closed_at).getTime() || NOW) - new Date(record.created_at).getTime();
          const pr = this.createObject(Rect, {
            backgroundColor: `rgba(${PR_STATE_COLORS[record.state]})`,
            radius: 5,
            // visible: false,
            update(dt) {
              this.size = [
                tracks.trackWidth - (tracks.trackPadding * 2),
                openMS * timeline.currMSHeight,
              ];
              this.transform.position = [
                -(i * tracks.trackWidth + tracks.trackPadding),
                0,
              ];

              if (this.onMouseHover()) {
                const BGcolor = [...PR_STATE_COLORS[record.state]];
                BGcolor[3] = 1;
                this.backgroundColor = `rgba(${BGcolor})`;
                this.toolTip?.show();
              } else if (this.onMouseOut()) {
                this.backgroundColor = `rgba(${PR_STATE_COLORS[record.state]})`;
                this.toolTip?.hide();
              }
            },
          }, {
            tag: 'pr-child',
            renderOrder: records.length - i,
          });
          pr.userAvatar = pr.createObject(RectImage, {
            url: record.user.avatar_url,
            backgroundColor: 'rgba(255, 255, 255, .5)',
            margin: 3,
            update(dt) {
              const squereSize = this.parent.size[0] - (this.margin * 2);
              this.size = [
                squereSize,
                squereSize,
              ];
              this.radius = squereSize;
              this.transform.position = [
                -(this.parent.size[0] / 2 - this.size[0] / 2),
                this.parent.size[1] - this.size[1] - this.margin,
              ];
              if (squereSize < 5 || this.parent.size[1] < squereSize + (this.margin * 2)) {
                this.visible = false;
              } else if (!this.visible) {
                this.visible = true;
              }
            }
          }, {
            tag: 'pr-avatar',
            position: [-3, 0],
          });
          pr.toolTip = pr.createObject(Rect, {
            size: [280, 80],
            backgroundColor: 'rgba(255, 255, 255, 1)',
            radius: 10,
            visible: false,
            enable: false,
            paddingSide: 5,
            paddingTop: 10,
            show() { this.visible = this.enable = true; },
            hide() { this.visible = this.enable = false; },
            update(dt) {
              const mousePos = this.scene.mouse.getPositionOnScene();
              this.transform.position = [
                -tracks.trackWidth,
                mousePos[1],
              ];
            }
          }, {
            tag: 'pr-tooltip',
          });
          const prTooltipIcon = pr.toolTip.createObject(RectImage, {
            url: PR_STATE_ICONS[record.state],
            backgroundColor: 'rgba(255, 255, 255, .5)',
            size: [15, 15],
            marginRight: 5,
            marginBottom: 10,
            update(dt) {
              const x = -this.parent.size[0] + this.size[0] + this.parent.paddingSide;
              const y = this.parent.size[1] - this.size[1] - this.parent.paddingTop;
              this.transform.position = [x, y];
            }
          }, {
            tag: 'pr-tooltip-icon',
          });
          const prTooltipTitle = pr.toolTip.createObject(Text, {
            text: record.title,
            color: '#1d6bd5',
            size: 14,
            maxWidth: pr.toolTip.size[0] - pr.toolTip.paddingSide - prTooltipIcon.size[0] - prTooltipIcon.marginRight - 10 - 25,
            weight: 400,
            marginRight: 10,
            marginBottom: 10,
            update(dt) {
              const x = prTooltipIcon.transform.position[0] + prTooltipIcon.marginRight;
              const y = prTooltipIcon.transform.position[1] + 2;
              this.transform.position = [x, y];
              this.maxWidth = pr.toolTip.size[0] - pr.toolTip.paddingSide - prTooltipIcon.size[0] - prTooltipIcon.marginRight - 10 - 25;
            }
          }, {
            tag: 'pr-tooltip-title',
          });
          pr.toolTip.createObject(RectImage, {
            url: record.user.avatar_url,
            backgroundColor: 'rgba(255, 255, 255, .5)',
            size: [25, 25],
            radius: 25,
            update(dt) {
              const x = -pr.toolTip.paddingSide;
              const y = prTooltipTitle.transform.position[1] - 7;
              this.transform.position = [x, y];
            }
          }, {
            tag: 'pr-tooltip-avatar',
          });
          const prTooltipRepoTitle = pr.toolTip.createObject(Text, {
            text: record.repo.full_name,
            color: '#000',
            size: 10,
            maxWidth: 100,
            marginRight: 10,
            marginBottom: 10,
            weight: 400,
            update(dt) {
              const x = prTooltipIcon.transform.position[0] + prTooltipIcon.marginRight;
              const y = prTooltipIcon.transform.position[1] - prTooltipIcon.marginBottom - this.size + 4;
              this.transform.position = [x, y];
            }
          }, {
            tag: 'pr-tooltip-repo-title',
          });
          pr.toolTip.createObject(Text, {
            text: `Created ${getHumanReadableTimeAgo(record.created_at)}`,
            color: '#333',
            size: 10,
            maxWidth: 100,
            marginRight: 10,
            marginBottom: 10,
            update(dt) {
              const x = prTooltipRepoTitle.transform.position[0] +
                prTooltipRepoTitle.acutalWith +
                prTooltipRepoTitle.marginRight;
              const y = prTooltipRepoTitle.transform.position[1];
              this.transform.position = [x, y];
            }
          }, {
            tag: 'pr-tooltip-createdat',
          });
          pr.toolTip.createObject(Text, {
            text: `It ${record.state === 'open' ? 'has' : 'had'} been open for ${getReadableTimePeriod(record.longRunning)}`,
            color: '#000',
            size: 13,
            weight: 400,
            maxWidth: pr.toolTip.size[0] - pr.toolTip.padding,
            marginRight: 10,
            marginBottom: 10,
            update(dt) {
              const x = prTooltipRepoTitle.transform.position[0];
              const y = prTooltipRepoTitle.transform.position[1] -
                prTooltipRepoTitle.marginBottom -
                this.size;
              this.transform.position = [x, y];
              const stuffSizeInToolTip = (pr.toolTip.paddingSide * 2) + prTooltipIcon.size[0] + prTooltipIcon.marginRight + prTooltipRepoTitle.marginRight;
              // log({ acutalWith: this.acutalWith, prToolW: pr.toolTip.size[0], prS: stuffSizeInToolTip });
              if (this.acutalWith > pr.toolTip.size[0] - stuffSizeInToolTip)
                pr.toolTip.size[0] = this.acutalWith + stuffSizeInToolTip;
            }
          }, {
            tag: 'pr-tooltip-longrunning',
          });
        });
      },
    }, {
      tag: 'PR',
    });
  }, [ctx, viewport]);


  useEffect(() => {
    log({ uf: `[records]: ${records.length}` });
    refPRs.current?.updatePRs(records);
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
