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

    (async function engineLoop() {
      const dt = this.fps.getDelta();

      this.scene.camera.clearViewport();

      this.scene.updateObjects(dt);

      await this.scene.renderObjects();

      // this.scene.keyboard?.reset();
      this.scene.mouse?.reset();

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
  }

  setPosition(newPosition = [0, 0]) {
    this.position = newPosition;
  }

  setScrollDelta(newDelta = 0) {
    this.scrollDelta = newDelta;
  }

  reset() {
    this.position = [0, 0];
    this.scrollDelta = 0;
  }
}

class EngineEntity {
  constructor({ tag, position } = {}) {
    this.tag = tag || this.constructor.name;
    console.log('Engine > Constructor:', this.tag);
    this.transform = {
      position: position || [0, 0, 0], // x, y, z (depth)
      scale: [1, 1, 1],
      rotation: [0, 0, 0],
    };
    this.objects = [];
  }

  getPosition() {
    const thisPostion = this.transform.position.slice(0, 2);
    const parentPosition = this.parent.getPosition();
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

  getObjectsByDepth() {
    return this.objects = this.objects
      .map(o => {
        o.transform.position[2] = o.transform.position[2] ?? 0;
        return o;
      })
      .sort((a, b) =>
        a.transform.position[2] ?? 0 - b.transform.position[2] ?? 0
      );
  }

  createObject(ObjectType, ...options) {
    const object = new ObjectType(...options);
    this.addObject(object);
    return object;
  }

  updateObjects(dt) {
    // log({ updateObjects: 1 });
    this.update(dt);
    for (const object of this.getObjectsByDepth()) {
      object.updateObjects(dt);
    }
  }

  // override
  update(dt) { }

  async renderObjects() {
    // log({ renderObjects: 1 });
    await this.render();
    for (const object of this.getObjectsByDepth()) {
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

  getPosition() {
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
  }

  createMouse(...options) {
    const mouse = new Mouse(...options);
    this.addMouse(mouse);
    return mouse;
  }

  addMouse(mouse) {
    this.mouse = mouse;
  }

  async render() {
    if (this.backgroundColor) {
      const { r, b } = this.camera.getEdgePositions();
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

  getEdgePositions() {
    return {
      r: this.transform.position[0] + this.viewport.size[0] / 2,
      l: this.transform.position[0] - this.viewport.size[0] / 2,
      t: this.transform.position[1] + this.viewport.size[1] / 2,
      b: this.transform.position[1] - this.viewport.size[1] / 2,
    };
  }

  getPositionOnViewport(point) {
    const camPos = this.getPosition();
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
    const posOnViewport = this.getPositionOnViewport(position);
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

  renderText({
    weight = 100,
    size = 14,
    color = '#000',
    text = '',
    position = [0, 0],
  } = {}) {
    const posOnViewport = this.getPositionOnViewport(position);
    this.ctx.font = `${weight} ${size}px Segoe UI`;
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, ...posOnViewport);
  }

  renderLine({
    color = '#fff',
    lineWidth = 1,
    position = [0, 0],
    vertices = [[0, 0]],
  } = {}) {
    const verticesOnViewport = vertices
      .map(vectex => this.getPositionOnViewport([
        position[0] + vectex[0],
        position[1] + vectex[1],
      ]));
    // log({ verticesOnViewport });
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(...verticesOnViewport[0]);
    for (let i = 1; i < verticesOnViewport.length; i++)
      this.ctx.lineTo(...verticesOnViewport[i]);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.stroke();
    this.ctx.restore();
  }
}

export class ObjectGroup extends EngineEntity {
  constructor(objectGroupOptions, options) {
    super(options);
    Object.assign(this, objectGroupOptions);
  }
}

export class Line extends ObjectGroup {
  async render() {
    const position = this.getPosition();
    this.scene.camera.renderLine({
      color: this.color,
      lineWidth: this.lineWidth,
      position,
      vertices: this.vertices,
    });
  }
}

export class Rect extends ObjectGroup {
  constructor(...options) {
    super(...options);
    this.size = this.size || [0, 0];
  }

  getSize() {
    const scale = this.getScale();
    return [
      this.size[0] * scale[0],
      this.size[1] * scale[1],
    ];
  }

  async render() {
    const position = this.getPosition();
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

export class Text extends ObjectGroup {
  async render() {
    this.scene.camera.renderText({
      weight: this.weight,
      size: this.size,
      color: this.color,
      text: this.text,
      position: this.getPosition(),
    });
  }
}
