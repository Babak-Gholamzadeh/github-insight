/* eslint-disable no-lone-blocks */
import { useEffect, useRef, useState } from 'react';
import {
  log,
  getHumanReadableTimeAgo,
  getReadableTimePeriod,
  isLightColor,
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

import './GanttChart.style.scss';

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

const GanttChart = ({ NOW, records }) => {
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
  };

  const setupScene = () => {
    const scene = refScene.current = new Scene({
      backgroundColor: '#0d1117',
    });
    refEngine.current = new Engine(scene);
    refKeyboard.current = scene.createKeyboard();
    refMouse.current = scene.createMouse();
  };

  useEffect(() => {
    log({ uf: '[]', NOW });
    setupViewport();
    setupScene();
  }, []);

  useEffect(() => {
    log({ uf: `[ctx, viewport]: ${ctx}, ${viewport}` });
    if (!ctx) return;
    const scene = refScene.current;
    const TIMELINE_HEIGHT = 60;
    const INIT_MS_WIDTH = .00000002;
    // Camera
    const camera = refCamera.current = scene.createCamera({
      ctx, viewport,
      dragPos: null,
      mostLeftPositionX: -(NOW * INIT_MS_WIDTH - (viewport.size[0] / 2)),
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

        if (this.dragPos && this.transform.position[0] > this.mostLeftPositionX) {
          const currMousePos = mouse.getPositionOnViewport();
          const diffX = currMousePos[0] - this.dragPos[0];
          const diffY = currMousePos[1] - this.dragPos[1];
          this.transform.position[0] = Math.max(this.transform.position[0] - diffX, this.mostLeftPositionX);
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
      updateOrder: -10,
      renderOrder: 10,
    });

    refEngine.current.run();

    log({ viewSize: viewport.size });

    // FPS
    camera.createObject(Text, {
      color: 'rgba(255, 255, 255, .6)',
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
        -camera.getSize()[0] / 2 + 2,
        camera.getSize()[1] / 2 - 12,
      ],
    });

    // Timeline
    const MAX_MS_WIDTH = 60;
    const MIN_MS_WIDTH = 0.0000000015;
    const timeline = refTimeline.current = camera.createObject(EmptyObject, {
      currMSWidth: INIT_MS_WIDTH,
      minimumVisibleTimeRange: null,
      size: [
        camera.viewport.size[0],
        TIMELINE_HEIGHT,
      ],
      update(dt) {
        const { mouse, keyboard, camera } = this.scene;
        const { scrollDelta } = mouse;
        if (keyboard.isKeyDown('shift') && scrollDelta) {
          const changeScale = scrollDelta * .1;
          if (
            (changeScale > 0 && this.currMSWidth < MAX_MS_WIDTH) ||
            (changeScale < 0 && this.currMSWidth > MIN_MS_WIDTH)
          ) {
            this.currMSWidth = Math.max(Math.min(this.currMSWidth + this.currMSWidth * changeScale, MAX_MS_WIDTH), MIN_MS_WIDTH);
            const mousePos = mouse.getPositionOnScene();
            camera.mostLeftPositionX = -(NOW * this.currMSWidth - (camera.viewport.size[0] / 2));
            camera.transform.position[0] = Math.max(camera.transform.position[0] + mousePos[0] * changeScale, camera.mostLeftPositionX);
          }
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
      backgroundColor: 'rgba(0, 0, 0, .7)',
      update(dt) {
        this.size = this.parent.size;
      }
    }, {
      tag: 'timeline-box',
    });

    const getNumOfHoursPerDay = (year, month, day) =>
      (new Date(year, month, day + 1).getTime() - new Date(year, month, day).getTime()) / 1000 / 60 / 60;

    const getNumOfHoursPerMonth = (year, month) =>
      (new Date(year, month + 1).getTime() - new Date(year, month).getTime()) / 1000 / 60 / 60;

    const getNumOfHoursPerYear = year =>
      (new Date(year + 1, 0).getTime() - new Date(year, 0).getTime()) / 1000 / 60 / 60;

    const getNumOfHoursPastInDay = (year, month, day, hour) =>
      (new Date(year, month, day, hour).getTime() - new Date(year, month, day).getTime()) / 1000 / 60 / 60;

    const getNumOfHoursPastInMonth = (year, month, day) =>
      (new Date(year, month, day).getTime() - new Date(year, month).getTime()) / 1000 / 60 / 60;

    const getNumOfHoursPastInYear = (year, month) =>
      (new Date(year, month).getTime() - new Date(year, 0).getTime()) / 1000 / 60 / 60;

    const getNumOfDaysPerMonth = (year, month) =>
      new Date(year, month + 1, 0).getDate();

    const getCurrDatePos = (msWidth, posX) => {
      const backInTimeMSs = posX / msWidth;
      const date = new Date(NOW + backInTimeMSs);

      const ms = {
        value: date.getMilliseconds(),
        min: 0,
        max: 999,
        leftHandWidth: msWidth,
        fullWidth: msWidth,
        begin: posX - msWidth,
        end: posX,
        unit: 'ms',
        get fullText() {
          return this.value.toString() + this.unit;
        },
        get shortText() {
          return this.value.toString();
        },
      };

      const sec = {
        value: date.getSeconds(),
        min: 0,
        max: 59,
        leftHandWidth: ms.value * ms.fullWidth + ms.leftHandWidth,
        fullWidth: ms.fullWidth * 1000,
        get begin() {
          return posX - this.leftHandWidth;
        },
        get end() {
          return posX + (this.fullWidth - this.leftHandWidth);
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
        value: date.getMinutes(),
        min: 0,
        max: 59,
        leftHandWidth: sec.value * sec.fullWidth + sec.leftHandWidth,
        fullWidth: sec.fullWidth * 60,
        get begin() {
          return posX - this.leftHandWidth;
        },
        get end() {
          return posX + (this.fullWidth - this.leftHandWidth);
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
        value: date.getHours(),
        min: 0,
        max: 23,
        leftHandWidth: min.value * min.fullWidth + min.leftHandWidth,
        fullWidth: min.fullWidth * 60,
        get begin() {
          return posX - this.leftHandWidth;
        },
        get end() {
          return posX + (this.fullWidth - this.leftHandWidth);
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
        value: date.getDate(),
        min: 1,
        get max() {
          return getNumOfDaysPerMonth(year.value, month.value);
        },
        get leftHandWidth() {
          return getNumOfHoursPastInDay(year.value, month.value, this.value, hour.value) * hour.fullWidth + hour.leftHandWidth;
        },
        get fullWidth() {
          return hour.fullWidth * getNumOfHoursPerDay(year.value, month.value, this.value);
        },
        get begin() {
          return posX - this.leftHandWidth;
        },
        get end() {
          return posX + (this.fullWidth - this.leftHandWidth);
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
        value: date.getMonth(),
        min: 0,
        max: 11,
        get leftHandWidth() {
          return getNumOfHoursPastInMonth(year.value, month.value, day.value) * hour.fullWidth + day.leftHandWidth;
        },
        get fullWidth() {
          return getNumOfHoursPerMonth(year.value, this.value) * hour.fullWidth;
        },
        get begin() {
          return posX - this.leftHandWidth;
        },
        get end() {
          return posX + (this.fullWidth - this.leftHandWidth);
        },
        unit: 'm',
        get fullText() {
          return MONTH_FULL_NAMES[this.value];
        },
        get shortText() {
          return MONTH_SHORT_NAMES[this.value];
        },
      };

      const year = {
        value: date.getFullYear(),
        min: 0,
        max: 10000,
        get leftHandWidth() {
          return getNumOfHoursPastInYear(this.value, month.value) * hour.fullWidth + month.leftHandWidth;
        },
        get fullWidth() {
          return getNumOfHoursPerYear(this.value) * hour.fullWidth;
        },
        get begin() {
          return posX - this.leftHandWidth;
        },
        get end() {
          return posX + (this.fullWidth - this.leftHandWidth);
        },
        unit: 'y',
        get fullText() {
          return this.value.toString();
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

    const MIN_VISIBLE_WIDTH = 2;

    const getMinimumVisibleTimeRange = msWidth => {
      const secWidth = msWidth * 1000;
      const minWidth = secWidth * 60;
      const hourWidth = minWidth * 60;
      const dayWidth = hourWidth * 24;
      const monthWidth = dayWidth * 30;
      const yearWidth = monthWidth * 12;
      if (msWidth >= MIN_VISIBLE_WIDTH)
        return { width: msWidth, name: 'ms' };
      if (secWidth >= MIN_VISIBLE_WIDTH)
        return { width: secWidth, name: 'sec' };
      if (minWidth >= MIN_VISIBLE_WIDTH)
        return { width: minWidth, name: 'min' };
      if (hourWidth >= MIN_VISIBLE_WIDTH)
        return { width: hourWidth, name: 'hour' };
      if (dayWidth >= MIN_VISIBLE_WIDTH)
        return { width: dayWidth, name: 'day' };
      if (monthWidth >= MIN_VISIBLE_WIDTH)
        return { width: monthWidth, name: 'month' };
      // if (yearWidth >= MIN_VISIBLE_WIDTH)
      return { width: yearWidth, name: 'year' };
    };

    // Timeline > shortlines
    timeline.createObject(EmptyObject, {
      size: [0, 0],
      update(dt) {
        this.size = this.parent.size;
      },
      render() {
        const { currMSWidth } = this.parent;
        const camEdgePos = this.scene.camera.getEdgePositionsOnScene();
        const camSize = this.scene.camera.getSize();
        const startPosition = this.getPositionOnScene();

        timeline.minimumVisibleTimeRange = getMinimumVisibleTimeRange(currMSWidth);

        let linePosX = startPosition[0];
        let i = 0;
        let currDatePos;
        ({ [timeline.minimumVisibleTimeRange.name]: currDatePos } = getCurrDatePos(currMSWidth, linePosX));

        const height = 15;
        const maxWidth = 60;
        const currWidth = currDatePos.fullWidth;
        let textColorAlpha = 1;
        let lineLength = height;
        let lineWidth = 1;
        let smallFontSize = 12;
        let largeFontSize = 16;
        let currDateYOffset = height;
        let higherDateYOffset = 0;
        const MAX_BG_HIGHLIGHT_OP = .05;

        while (true && i < 1000) {
          i++;
          ({ [timeline.minimumVisibleTimeRange.name]: currDatePos } = getCurrDatePos(currMSWidth, linePosX));

          linePosX = currDatePos.begin;
          if (linePosX < camEdgePos.l)
            break;

          const linePosition = [
            linePosX,
            startPosition[1] + this.size[1],
          ];

          const itsBeginning = currDatePos.value === currDatePos.min;

          if (currDatePos.higherDate && itsBeginning) {
            const hAlpha = Math.min(currDatePos.higherDate.fullWidth / camSize[0], 1) * MAX_BG_HIGHLIGHT_OP;
            const BG_COLORS = BG_HIGHLIGHT_COLORS(hAlpha);
            this.scene.camera.renderRoundRect({
              backgroundColor: BG_COLORS[currDatePos.higherDate.value % BG_COLORS.length],
              position: [
                currDatePos.higherDate.begin,
                camEdgePos.b,
              ],
              size: [
                -currDatePos.higherDate.fullWidth,
                camSize[1],
              ],
            });

            if (currDatePos.higherDate.higherDate) {
              const hhAlpha = MAX_BG_HIGHLIGHT_OP - hAlpha;
              const itsBeginning = currDatePos.higherDate.value === currDatePos.higherDate.min;
              if (itsBeginning) {
                const BG_COLORS = BG_HIGHLIGHT_COLORS(hhAlpha);
                this.scene.camera.renderRoundRect({
                  backgroundColor: BG_COLORS[currDatePos.higherDate.higherDate.value % BG_COLORS.length],
                  position: [
                    currDatePos.higherDate.higherDate.begin,
                    camEdgePos.b,
                  ],
                  size: [
                    -currDatePos.higherDate.higherDate.fullWidth,
                    camSize[1],
                  ],
                });
              }
            }
          }

          textColorAlpha = 1;
          lineLength = height;
          lineWidth = 1;
          smallFontSize = 12;
          largeFontSize = 16;
          currDateYOffset = height;
          higherDateYOffset = 0;
          if (currWidth < maxWidth) {
            smallFontSize = Math.max((currWidth + 20) / (maxWidth + 20) * 12, 8);
            textColorAlpha = (currWidth - 10) / (maxWidth - 10);
            lineLength = (currWidth + 10) / (maxWidth + 10) * height;
            currDateYOffset = (currWidth + 10) / (maxWidth + 10) * height;
            lineWidth = (currWidth - 0) / maxWidth;
            higherDateYOffset = (1 - currWidth / maxWidth) * 18;
            largeFontSize = (currWidth / maxWidth) * 4 + 12;
            if (itsBeginning) {
              lineLength += (height - lineLength) / 2;
              lineWidth = 1;
            }
          }

          if (lineLength > 0) {
            this.scene.camera.renderLine({
              position: linePosition,
              vertices: [
                [0, 0],
                [0, -lineLength],
              ],
              color: 'white',
              lineWidth,
            });
          }

          // currDate
          if (textColorAlpha > 0) {
            ctx.font = `${smallFontSize}px Segoe UI`;
            const textWidth = ctx.measureText(currDatePos.shortText).width;
            const nearRight = Math.min(currDatePos.end, camEdgePos.r + textWidth);
            const nearLeft = Math.max(currDatePos.begin, camEdgePos.l - textWidth);
            const closestDistance = nearRight - nearLeft;
            const textPositionX = nearLeft + closestDistance / 2;
            const textPositionY = startPosition[1] + this.size[1] - currDateYOffset;
            this.scene.camera.renderText({
              text: currDatePos.shortText,
              color: `rgba(255, 255, 255, ${textColorAlpha})`,
              size: smallFontSize,
              textAlign: 'center',
              position: [
                textPositionX,
                textPositionY,
              ],
            });
          }

          // higherDate
          if (itsBeginning && currDatePos.higherDate) {
            ctx.font = `${largeFontSize}px Segoe UI`;
            const textWidth = ctx.measureText(currDatePos.higherDate.fullText).width;
            const nearRight = Math.min(currDatePos.higherDate.end, camEdgePos.r + textWidth);
            const nearLeft = Math.max(currDatePos.higherDate.begin, camEdgePos.l - textWidth);
            const closestDistance = nearRight - nearLeft;
            const textPositionX = nearLeft + closestDistance / 2;
            const textPositionY = startPosition[1] + this.size[1] - (height * 2) + higherDateYOffset - 3;
            this.scene.camera.renderText({
              text: currDatePos.higherDate.fullText,
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

        if (currDatePos.higherDate) {
          const hAlpha = Math.min(currDatePos.higherDate.fullWidth / camSize[0], 1) * MAX_BG_HIGHLIGHT_OP;
          const BG_COLORS = BG_HIGHLIGHT_COLORS(hAlpha);
          this.scene.camera.renderRoundRect({
            backgroundColor: BG_COLORS[currDatePos.higherDate.value % BG_COLORS.length],
            position: [
              currDatePos.higherDate.end,
              camEdgePos.b,
            ],
            size: [
              currDatePos.higherDate.fullWidth,
              camSize[1],
            ],
          });

          if (currDatePos.higherDate.higherDate) {
            const hhAlpha = MAX_BG_HIGHLIGHT_OP - hAlpha;
            const itsBeginning = currDatePos.higherDate.value === currDatePos.higherDate.min;
            if (itsBeginning) {
              const BG_COLORS = BG_HIGHLIGHT_COLORS(hhAlpha);
              this.scene.camera.renderRoundRect({
                backgroundColor: BG_COLORS[currDatePos.higherDate.higherDate.value % BG_COLORS.length],
                position: [
                  currDatePos.higherDate.higherDate.end,
                  camEdgePos.b,
                ],
                size: [
                  currDatePos.higherDate.higherDate.fullWidth,
                  camSize[1],
                ],
              });
            }
          }
        }

        if (textColorAlpha > 0) {
          ctx.font = `${smallFontSize}px Segoe UI`;
          const textWidth = ctx.measureText(currDatePos.shortText).width;
          const nearRight = Math.min(currDatePos.end, camEdgePos.r + textWidth);
          const nearLeft = Math.max(currDatePos.begin, camEdgePos.l - textWidth);
          const closestDistance = nearRight - nearLeft;
          const textPositionX = nearLeft + closestDistance / 2;
          const textPositionY = startPosition[1] + this.size[1] - currDateYOffset;
          this.scene.camera.renderText({
            text: currDatePos.shortText,
            color: `rgba(255, 255, 255, ${textColorAlpha})`,
            size: smallFontSize,
            textAlign: 'center',
            position: [
              textPositionX,
              textPositionY,
            ],
          });
        }
        if (currDatePos.higherDate) {
          ctx.font = `${largeFontSize}px Segoe UI`;
          const textWidth = ctx.measureText(currDatePos.higherDate.fullText).width;
          const nearRight = Math.min(currDatePos.higherDate.end, camEdgePos.r + textWidth);
          const nearLeft = Math.max(currDatePos.higherDate.begin, camEdgePos.l - textWidth);
          const closestDistance = nearRight - nearLeft;
          const textPositionX = nearLeft + closestDistance / 2;
          const textPositionY = startPosition[1] + this.size[1] - (height * 2) + higherDateYOffset - 3;
          this.scene.camera.renderText({
            text: currDatePos.higherDate.fullText,
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
    }, {
      tag: 'timeline-short-lines',
    });

    // Timeline > cursor
    const timelineCursor = scene.createObject(EmptyObject, {
      cursorTime: new Date(NOW),
      update(dt) {
        const camPos = this.scene.camera.getPositionOnScene();
        const mousePos = this.scene.mouse.getPositionOnScene();
        this.transform.position = [
          mousePos[0],
          camPos[1],
        ];
        this.cursorTime = new Date(NOW + this.transform.position[0] / timeline.currMSWidth);
      }
    }, {
      tag: 'timeline-cursor',
      updateOrder: 20,
      renderOrder: 20,
    });

    timelineCursor.createObject(Line, {
      color: '#1d6bd5',
      lineWidth: .7,
      shadow: {
        // color: 'black',
        blur: 10,
      },
      update(dt) {
        const camSize = this.scene.camera.getSize();
        this.vertices = [
          [0, camSize[1] / 2],
          [0, -camSize[1] / 2 + TIMELINE_HEIGHT],
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
        [35, -5],
        [35, -20],
        [-35, -20],
        [-35, -5],
      ],
      size: [70, 20],
      update(dt) {
        const camSize = this.scene.camera.getSize();
        this.transform.position[1] = -camSize[1] / 2 + TIMELINE_HEIGHT;
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
      update(dt) {
        this.transform.position = [
          0,
          -this.parent.size[1] / 2 - 7,
        ];
        const { cursorTime } = this.parent.parent;
        const year = cursorTime.getFullYear();
        const month = (cursorTime.getMonth() + 1).toString().padStart(2, '0');
        const day = cursorTime.getDate().toString().padStart(2, '0');
        const hour = cursorTime.getHours().toString().padStart(2, '0');
        const min = cursorTime.getMinutes().toString().padStart(2, '0');
        const sec = cursorTime.getSeconds().toString().padStart(2, '0');
        const ms = cursorTime.getMilliseconds().toString().padStart(3, '0');
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

    // Select Area to zoom
    const zoomArea = scene.createObject(Rect, {
      startDragPos: null,
      endDragPos: null,
      visible: false,
      size: [0, 0],
      backgroundColor: [
        `rgba(255, 220, 86, .1)`,
        `rgba(29, 107, 213, .1)`,
      ],
      cursorStartTime: timelineCursor.cursorTime,
      update(dt) {
        const { camera } = this.scene;
        const camEdgePos = camera.getEdgePositionsOnScene();
        const camSize = camera.getSize();
        const { mouse, keyboard } = this.scene;
        this.size = camSize;

        if (!camera.dragPos &&
          !this.startDragPos &&
          mouse.isBtnDown('left') &&
          keyboard.isKeyDown('shift')
        ) {
          camera.enable = false;
          this.startDragPos = mouse.getPositionOnScene();
          this.cursorStartTime = timelineCursor.cursorTime;
          // log({ zoomArea: this.startDragPos });
        }

        if (this.startDragPos && (mouse.isBtnUp('left') || keyboard.isKeyDown('escape'))) {
          if (mouse.isBtnUp('left')) {
            const startPoint = Math.min(this.startDragPos[0], this.endDragPos[0]);
            const endPoint = Math.max(this.startDragPos[0], this.endDragPos[0]);
            const zoomAreaW = startPoint - endPoint;
            const midPoint = endPoint + (zoomAreaW / 2);
            const midPointMS = -midPoint / timeline.currMSWidth;
            const changeScale = camSize[0] / Math.abs(zoomAreaW);
            timeline.currMSWidth = Math.min(timeline.currMSWidth * changeScale, MAX_MS_WIDTH);
            camera.transform.position[0] = -midPointMS * timeline.currMSWidth;
          }
          this.startDragPos = null;
          camera.enable = true;
        }

        if (this.startDragPos) {
          this.endDragPos = mouse.getPositionOnScene();

          this.visible = true;
          this.transform.position = [
            this.startDragPos[0],
            camEdgePos.b,
          ];
          this.size = [
            this.startDragPos[0] - this.endDragPos[0],
            camSize[1],
          ];
        } else {
          this.visible = false;
        }
      }
    }, {
      tag: 'zoom-area',
      renderOrder: 20,
    });

    zoomArea.createObject(Line, {
      color: `rgba(255, 220, 86, .7)`,
      lineWidth: .7,
      shadow: {
        // color: 'black',
        blur: 10,
      },
      update(dt) {
        this.vertices = [
          [0, 0],
          [0, this.parent.size[1]],
        ];
      }
    }, {
      tag: 'zoom-area-start-line',
    });

    const zoomAreaStartTime = zoomArea.createObject(Rect, {
      backgroundColor: `rgba(255, 220, 86, .7)`,
      size: [0, 20],
      visible: false,
      sideToShow: -1,
      displayAnimCompleted: false,
      update(dt) {
        const { startDragPos, endDragPos } = this.parent;
        if (!startDragPos) {
          this.hide();
          return;
        };

        const diffX = startDragPos[0] - endDragPos[0];
        if (Math.abs(diffX) < 5) {
          this.hide();
          return;
        };

        if (diffX < 0) {
          this.sideToShow = -1;
        } else {
          this.sideToShow = 1;
        }

        this.show(dt, .1);
      },
      hide() {
        this.visible = false;
        this.size[0] = 0;
        this.displayAnimCompleted = false;
      },
      show(dt, duration = 1) {
        if (this.displayAnimCompleted) return;
        if (!this.visible) this.visible = true;

        this.size[0] += 70 * (dt / duration);
        if (this.size[0] >= 70) {
          this.size[0] = 70;
          this.displayAnimCompleted = true;
        }
        if (this.sideToShow === -1) {
          this.transform.position[0] = 0;
        } else if (this.sideToShow === 1) {
          this.transform.position[0] = this.size[0];
        }
      }
    }, {
      tag: 'zoom-area-start-time',
    });

    zoomAreaStartTime.createObject(Text, {
      color: 'white',
      size: 12,
      text: '',
      textAlign: 'center',
      weight: 400,
      visible: false,
      update(dt) {
        if (!this.parent.displayAnimCompleted) {
          this.visible = false;
          return;
        };

        this.visible = true;

        this.transform.position = [
          -this.parent.size[0] / 2,
          this.parent.size[1] / 2 - this.size / 2,
        ];
        const { cursorStartTime } = this.parent.parent;
        const year = cursorStartTime.getFullYear();
        const month = (cursorStartTime.getMonth() + 1).toString().padStart(2, '0');
        const day = cursorStartTime.getDate().toString().padStart(2, '0');
        const hour = cursorStartTime.getHours().toString().padStart(2, '0');
        const min = cursorStartTime.getMinutes().toString().padStart(2, '0');
        const sec = cursorStartTime.getSeconds().toString().padStart(2, '0');
        const ms = cursorStartTime.getMilliseconds().toString().padStart(3, '0');
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
      }
    }, {
      tag: 'zoom-area-start-time-txt',
    });

    zoomArea.createObject(Text, {
      color: 'rgba(255, 255, 255, .3)',
      size: 15,
      text: '',
      weight: 400,
      update(dt) {
        const { cursorStartTime } = this.parent;
        const { cursorTime: cursorEndTime } = timelineCursor;
        const areaDuration = Math.abs(cursorEndTime.getTime() - cursorStartTime.getTime());

        if (areaDuration < 60 * 1000) {
          if (areaDuration < 1000) {
            this.text = `${areaDuration} ms`;
          } else {
            this.text = `${Math.floor(areaDuration / 1000)} sec`;
          }
        } else {
          this.text = getReadableTimePeriod(areaDuration);
        }

        this.textAlign = -Math.sign(this.parent.size[0]) > 0 ? 'right' : 'left';

        this.maxWidth = Math.abs(this.parent.size[0]) - 20;
        if (this.maxWidth < 300) {
          const alpha = this.maxWidth / 400 * .3;
          this.color = `rgba(255, 255, 255, ${alpha})`;
        }

        this.transform.position = [
          -this.parent.size[0] * .9,
          10,
        ];
      }
    }, {
      tag: 'zoom-area-duration-time-txt',
    });

    // Tracks
    const tracks = scene.createObject(EmptyObject, {
      trackHeight: 40,
      trackPadding: 2,
      trackLineHeight: 1,
      update(dt) {
        const { scrollDelta } = this.scene.mouse;
        const changeScale = scrollDelta * .1;
        const MAX_HEIGHT = this.scene.camera.getSize()[1] - TIMELINE_HEIGHT;
        const MIN_HEIGHT = .5;
        if (this.scene.keyboard.isKeyDown('alt') &&
          (
            (changeScale > 0 && this.trackHeight < MAX_HEIGHT) ||
            (changeScale < 0 && this.trackHeight > MIN_HEIGHT)
          )
        ) {
          this.trackHeight = Math.max(
            Math.min(this.trackHeight + this.trackHeight * changeScale, MAX_HEIGHT),
            MIN_HEIGHT,
          );
          this.trackLineHeight = this.trackHeight / 40;
        }
      },
      render() {
        if (this.trackLineHeight < .1)
          return;
        const { camera } = this.scene;
        const camSize = camera.getSize();
        const camEdgePos = camera.getEdgePositionsOnScene();
        const offsetY = Math.floor(Math.max(camEdgePos.b, 0) / this.trackHeight);
        for (let i = offsetY; i < camEdgePos.t; i += this.trackHeight) {
          camera.renderLine({
            color: '#333',
            lineWidth: this.trackLineHeight,
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
      renderOrder: -Infinity,
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
        // log({ refPRsUpdate: dt });
        this.trackOccupancy.empty();
        for (let i = 0; i < this.objects.length; i++) {
          const pr = this.objects[i];

          if (!pr.loadRepo.enable || !pr.filterStatus[pr.state]) {
            pr.enable = pr.visible = false;
            continue;
          }
          pr.enable = pr.visible = true;
          const PRBGC = pr.prColor.colorFromRepo
            ? pr.loadRepo.color
            : `rgba(${PR_STATE_COLORS[pr.state]})`;
          pr.backgroundColor = PRBGC;
          pr.title.color = isLightColor(PRBGC) ? '#000' : '#fff';

          const trackIdx = this.trackOccupancy.registerInTrack(pr.x, pr.w);

          pr.transform.position[1] = trackIdx * tracks.trackHeight + tracks.trackPadding;
        }
      },
      updatePRs(records) {
        log({ recordsLen: records.length });

        this.objects = [];
        this.trackOccupancy.empty();

        records.forEach(record => {
          const closedAtTime = new Date(record.closed_at).getTime() || NOW;
          const createdAtTime = new Date(record.created_at).getTime();
          const x = -(NOW - closedAtTime);
          const w = (closedAtTime - createdAtTime);

          const trackIdx = this.trackOccupancy.registerInTrack(x, w);
          // log({ trackIdx });

          const pr = this.createObject(Rect, {
            backgroundColor: `rgba(${PR_STATE_COLORS[record.state]})`,
            radius: 5,
            loadRepo: record.loadRepo,
            prColor: record.prColor,
            filterStatus: record.filterStatus,
            state: record.state,
            x, w,
            update(dt) {
              this.size = [
                w * timeline.currMSWidth,
                tracks.trackHeight - (tracks.trackPadding * 2),
              ];

              this.transform.position[0] = x * timeline.currMSWidth;

              // this.transform.position = [
              //   x * timeline.currMSWidth,
              //   trackIdx * tracks.trackHeight + tracks.trackPadding,
              // ];

              if (this.onMouseHover()) {
                // const BGcolor = [...PR_STATE_COLORS[record.state]];
                // BGcolor[3] = 1;
                // this.backgroundColor = `rgba(${BGcolor})`;
                this.toolTip?.show();
              } else if (this.onMouseOut()) {
                // this.backgroundColor = `rgba(${PR_STATE_COLORS[record.state]})`;
                this.toolTip?.hide();
              }
            },
          }, {
            tag: 'pr-child',
            renderOrder: records.length - trackIdx,
            position: [
              x * timeline.currMSWidth,
              trackIdx * tracks.trackHeight + tracks.trackPadding,
            ],
          });
          pr.userAvatar = pr.createObject(RectImage, {
            url: record.user.avatar_url,
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
              if (squereSize < 5 || this.parent.size[0] < squereSize + (this.margin * 2)) {
                this.visible = false;
              } else if (!this.visible) {
                this.visible = true;
              }
            }
          }, {
            tag: 'pr-avatar',
            position: [-3, 0],
          });
          pr.title = pr.createObject(Text, {
            text: record.title,
            color: '#fff',
            size: 14,
            margin: 5,
            update(dt) {
              this.transform.position = [
                -this.parent.size[0] + this.margin,
                this.parent.size[1] / 2 - this.size / 2,
              ];
              this.maxWidth =
                this.parent.size[0] -
                (
                  this.parent.userAvatar.visible
                    ? this.parent.userAvatar.size[0] + (this.parent.userAvatar.margin * 2)
                    : 0
                ) -
                (this.margin * 2);

              if (this.parent.size[1] < 15)
                this.visible = false;
              else if (!this.visible)
                this.visible = true;
            }
          }, {
            tag: 'pr-title',
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
