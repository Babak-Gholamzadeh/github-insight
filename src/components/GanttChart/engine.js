import { log } from "../../utils";

class FPS {
  constructor() {
    this.frameStartTime = 0;
    this.frameCount = 0;
    this.rate = 0;
  }

  init() {
    this.rate = 0;
    this.reset();
  }

  reset() {
    this.frameStartTime = Date.now();
    this.frameCount = 0;
  }

  getDelta() {
    this.frameCount++;
    const delta = (Date.now() - this.frameStartTime) / 1000;
    this.reset();
    return delta;
  }
}

export class Engine {
  constructor(scene) {
    console.log('Engine > Engine');
    this.fps = new FPS();
    this.scene = scene;
  }

  run() {
    console.log('Engine > run');
    this.fps.init();

    let frameCount = 0;

    (async function engineLoop() {
      frameCount++;
      const dt = this.fps.getDelta();

      this.scene.camera.clearViewport();

      this.scene.updateObjects(dt);

      await this.scene.renderObjects();

      // this.scene.keyboard?.reset();
      this.scene.mouse?.reset();

      // await new Promise(res => setTimeout(res, 2000));
      // log({ frameCount });
      requestAnimationFrame(engineLoop.bind(this));
    }).call(this);
  }
}

export class Keyboard {
  constructor() {
    this.states = {};
  }

  setKeyState(newStates = {}) {
    Object.assign(this.states, newStates);
  }

  isKeyDown(key) {
    return !!this.states[key];
  }

  isKeyUp(key) {
    return !this.states[key];
  }

  reset() {
    this.states = {};
  }
}

export class Mouse {
  constructor() {
    this.position = [0, 0];
    this.scrollDelta = 0;
    this.states = {};
  }

  setPosition(newPosition = [0, 0]) {
    this.position = newPosition;
  }

  getPositionOnViewport() {
    return this.position;
  }

  getPositionOnScene() {
    const position = this.getPositionOnViewport();
    const camPos = this.scene.camera.getPositionOnScene();
    const camSize = this.scene.camera.getSize();
    return [
      camPos[0] - ((camSize[0] / 2) - position[0]),
      camPos[1] + ((camSize[1] / 2) - position[1]),
    ];
  }

  setScrollDelta(newDelta = 0) {
    this.scrollDelta = newDelta;
  }

  setBtnState(newStates = {}) {
    Object.assign(this.states, newStates);
  }

  isBtnDown(btn) {
    return !!this.states[btn];
  }

  isBtnUp(btn) {
    return !this.states[btn];
  }

  reset() {
    // this.position = [0, 0];
    // this.states = {};
    this.scrollDelta = 0;
  }
}

class EngineEntity {
  objects = [];
  layerOrder = 0;
  transform = {
    position: [0, 0, 0], // x, y, z (depth)
    scale: [1, 1, 1],
    rotation: [0, 0, 0],
  };
  visible = true;
  enable = true;

  constructor({ tag, position, layerOrder } = {}) {
    this.tag = tag || this.constructor.name;
    console.log('Engine > Constructor:', this.tag);
    position && (this.transform.position = position);
    layerOrder && (this.layerOrder = layerOrder);
  }

  getPositionOnScene() {
    const thisPostion = this.transform.position.slice(0, 2);
    const parentPosition = this.parent.getPositionOnScene();
    return [
      parentPosition[0] + thisPostion[0],
      parentPosition[1] + thisPostion[1],
    ];
  }

  getScale() {
    return this.transform.scale;
  }

  addObject(object, scene) {
    object.parent = this;
    object.scene = scene || this.scene;
    this.objects.push(object);
  }

  getObjectsByDepth(direction = 1) {
    return this.objects
      .sort((a, b) => {
        if (direction)
          return a.layerOrder - b.layerOrder;
        return b.layerOrder - a.layerOrder;
      });
  }

  createObject(ObjectType, ...options) {
    const object = new ObjectType(...options);
    this.addObject(object);
    return object;
  }

  updateObjects(dt) {
    this.internalUpdate(dt);
    this.update(dt);
    for (const object of this.getObjectsByDepth(0)) {
      if (object.enable)
        object.updateObjects(dt);
    }
  }

  // override
  internalUpdate(dt) { }

  // override
  update(dt) { }

  async renderObjects() {
    await this.render();
    for (const object of this.getObjectsByDepth()) {
      if (object.visible)
        await object.renderObjects();
    }
  }

  // override
  async render() { }
}

export class Scene extends EngineEntity {
  constructor(sceneOptions, options) {
    super(options);
    Object.assign(this, sceneOptions);
  }

  getPositionOnScene() {
    return this.transform.position.slice(0, 2);
  }

  addObject(object) {
    super.addObject(object, this);
  }

  createCamera(...options) {
    const camera = new Camera(...options);
    this.addCamera(camera);
    return camera;
  }

  addCamera(camera) {
    this.camera = camera;
    this.addObject(camera);
  }

  createKeyboard(...options) {
    const keyboard = new Keyboard(...options);
    this.addKeyboard(keyboard);
    return keyboard;
  }

  addKeyboard(keyboard) {
    this.keyboard = keyboard;
    keyboard.scene = this;
  }

  createMouse(...options) {
    const mouse = new Mouse(...options);
    this.addMouse(mouse);
    return mouse;
  }

  addMouse(mouse) {
    this.mouse = mouse;
    mouse.scene = this;
  }

  async render() {
    if (this.backgroundColor) {
      const { r, b } = this.camera.getEdgePositionsOnScene();
      this.camera.renderRoundRect({
        backgroundColor: this.backgroundColor,
        position: [r, b],
        size: this.camera.viewport.size,
      });
    }
  }
}

export class Camera extends EngineEntity {
  constructor(cameraOptions, options) {
    super(options);
    Object.assign(this, cameraOptions);
  }

  clearViewport() {
    this.ctx.clearRect(0, 0, ...this.viewport.size);
  }

  getSize() {
    const scale = this.getScale();
    return [
      this.viewport.size[0] * scale[0],
      this.viewport.size[1] * scale[1],
    ];
  }

  getEdgePositionsOnScene() {
    return {
      r: this.transform.position[0] + this.viewport.size[0] / 2,
      l: this.transform.position[0] - this.viewport.size[0] / 2,
      t: this.transform.position[1] + this.viewport.size[1] / 2,
      b: this.transform.position[1] - this.viewport.size[1] / 2,
    };
  }

  convertPosScene2Viewport(point) {
    const camPos = this.getPositionOnScene();
    const camSize = this.getSize();
    return [
      (camSize[0] / 2) + (point[0] - camPos[0]),
      (camSize[1] / 2) - (point[1] - camPos[1]),
    ];
  }

  renderRoundRect({
    backgroundColor,
    borderColor = backgroundColor,
    position = [0, 0],
    size = [0, 0],
    radius = 0,
  } = {}) {
    const posOnViewport = this.convertPosScene2Viewport(position);
    const sizeOnViewport = size.map(v => -v);
    this.ctx.fillStyle = backgroundColor;
    this.ctx.strokeStyle = borderColor;
    this.ctx.beginPath();
    this.ctx.roundRect(
      ...posOnViewport,
      ...sizeOnViewport,
      radius,
    );
    this.ctx.stroke();
    this.ctx.fill();
  }

  renderRoundImg({
    img,
    position = [0, 0],
    size = [0, 0],
    radius = 0,
  } = {}) {
    const posOnViewport = this.convertPosScene2Viewport(position);
    const sizeOnViewport = size.map(v => -v);
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.roundRect(
      ...posOnViewport,
      ...sizeOnViewport,
      radius,
    );
    this.ctx.closePath();
    this.ctx.clip();
    this.ctx.drawImage(
      img,
      ...posOnViewport,
      ...sizeOnViewport,
    );
    this.ctx.restore();
  }

  renderText({
    weight = 100,
    size = 14,
    color = '#000',
    textAlign = 'left',
    text = '',
    position = [0, 0],
    maxWidth = Infinity,
    multiline = false,
    lineHeight = size,
  } = {}) {
    const posOnViewport = this.convertPosScene2Viewport(position);
    this.ctx.font = `${weight} ${size}px Segoe UI`;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = textAlign;

    if (multiline) {
      text.toString().split('\n').forEach((line, i) => {
        this.ctx.fillText(
          line,
          posOnViewport[0],
          posOnViewport[1] + (i * lineHeight),
        );
      });
    } else {
      if (maxWidth <= 0)
        return;

      if (this.ctx.measureText(text).width > maxWidth) {
        const dots = '...';
        const dotsWidth = this.ctx.measureText(dots).width;
        if (dotsWidth > maxWidth)
          return;
        let truncatedText = '';
        let i = 0;
        while (this.ctx.measureText(truncatedText).width + dotsWidth < maxWidth) {
          truncatedText += text[i++];
        }
        text = truncatedText.slice(0, -1) + dots;
      }
      this.ctx.fillText(text, ...posOnViewport);
    }
  }

  renderLine({
    color = '#fff',
    lineWidth = 1,
    position = [0, 0],
    vertices = [[0, 0]],
    shadow = null,

  } = {}) {
    const verticesOnViewport = vertices
      .map(vectex => this.convertPosScene2Viewport([
        position[0] + vectex[0],
        position[1] + vectex[1],
      ]));
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(...verticesOnViewport[0]);
    for (let i = 1; i < verticesOnViewport.length; i++)
      this.ctx.lineTo(...verticesOnViewport[i]);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    if (shadow) {
      this.ctx.shadowColor = shadow.color || color;
      this.ctx.shadowBlur = shadow.blur ?? 10;
    }
    this.ctx.stroke();
    if (shadow) {
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
    }
    this.ctx.restore();
  }

  renderPloygon({
    backgroundColor = '#fff',
    borderColor = backgroundColor,
    lineWidth = 1,
    position = [0, 0],
    vertices = [[0, 0]],
  } = {}) {
    const verticesOnViewport = vertices
      .map(vectex => this.convertPosScene2Viewport([
        position[0] + vectex[0],
        position[1] + vectex[1],
      ]));
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(...verticesOnViewport[0]);
    for (let i = 1; i < verticesOnViewport.length; i++)
      this.ctx.lineTo(...verticesOnViewport[i]);
    this.ctx.fillStyle = backgroundColor;
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = lineWidth;
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.fill();
    this.ctx.restore();
  }
}

export class EmptyObject extends EngineEntity {
  size = [0, 0];
  isMouseHover = false;

  constructor(EmptyObjectOptions, options) {
    super(options);
    Object.assign(this, EmptyObjectOptions);
  }

  getSize() {
    const scale = this.getScale();
    return [
      this.size[0] * scale[0],
      this.size[1] * scale[1],
    ];
  }

  internalUpdate(dt) {
    const mousePos = this.scene.mouse.getPositionOnScene();
    const position = this.getPositionOnScene();
    const size = this.getSize();
    this.isMouseHover = (
      mousePos[0] <= position[0] &&
      mousePos[0] >= position[0] - size[0] &&
      mousePos[1] >= position[1] &&
      mousePos[1] <= position[1] + size[1]
    );
  }

  onMouseHover() {
    return this.isMouseHover;
  }

  onMouseOut() {
    return !this.isMouseHover;
  }
}

export class Line extends EmptyObject {
  async render() {
    const position = this.getPositionOnScene();
    this.scene.camera.renderLine({
      color: this.color,
      lineWidth: this.lineWidth,
      position,
      vertices: this.vertices,
      shadow: this.shadow,
    });
  }
}

export class Ploygon extends EmptyObject {
  async render() {
    const position = this.getPositionOnScene();
    this.scene.camera.renderPloygon({
      backgroundColor: this.backgroundColor,
      borderColor: this.borderColor,
      lineWidth: this.lineWidth,
      position,
      vertices: this.vertices,
    });
  }
}

export class Rect extends EmptyObject {
  constructor(...options) {
    super(...options);
    this.size = this.size || [0, 0];
  }

  async render() {
    const position = this.getPositionOnScene();
    const size = this.getSize();
    this.scene.camera.renderRoundRect({
      backgroundColor: this.backgroundColor,
      borderColor: this.borderColor,
      position,
      size,
      radius: this.radius,
    });
  }
}

export class RectImage extends Rect {
  constructor(...options) {
    super(...options);
    this.loadedImage = null;
    this.img = new Image();
    this.img.src = this.url;
    this.img.onload = () => this.loadedImage = this.img;
  }
  async render() {
    if (!this.loadedImage)
      return super.render();

    const position = this.getPositionOnScene();
    const size = this.getSize();
    this.scene.camera.renderRoundImg({
      img: this.loadedImage,
      position,
      size,
      radius: this.radius,
    });
  }
}

export class Text extends EmptyObject {
  async render() {
    this.scene.camera.renderText({
      weight: this.weight,
      size: this.size,
      color: this.color,
      text: this.text,
      position: this.getPositionOnScene(),
      maxWidth: this.maxWidth,
      textAlign: this.textAlign,
      multiline: this.multiline,
      lineHeight: this.lineHeight,
    });
  }
}
