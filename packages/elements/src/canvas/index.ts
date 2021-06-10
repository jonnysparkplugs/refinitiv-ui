import {
  ResponsiveElement,
  html,
  css,
  customElement,
  property,
  TemplateResult,
  CSSResult,
  ElementSize
} from '@refinitiv-ui/core';

/**
 * A Component uses
 * to draw graphics on a web page,
 * it works similarly to the normal HTML5 Canvas element.
 */
@customElement('ef-canvas')
export class Canvas extends ResponsiveElement {
  /*
   * Width of canvas
   */
  public width: number;
  /*
   * Height of canvas
   */
  public height: number;
  private frameId: number;
  private _autoloop: boolean;

  constructor () {
    super();
    this.frameId = 0;
    this.width = 0;
    this.height = 0;
    this._autoloop = false;
  }
  /**
   * A `CSSResult` that will be used
   * to style the host, slotted children
   * and the internal template of the element.
   * @return CSS template
   */
  static get styles (): CSSResult {
    return css`
      :host {
        display: block;
        position: relative;
        overflow: hidden;
      }
      canvas {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
      }
    `;
  }

  /**
   * Starts an automatic animation loop.
   * Enabling the frame event.
   */
  @property({ type: Boolean, reflect: true })
  get autoloop (): boolean {
    return this._autoloop;
  }
  set autoloop (val: boolean) {
    const oldValue = this._autoloop;
    this._autoloop = val;
    void this.requestUpdate('autoloop', oldValue);
    this.loop();
  }

  /**
   * Html canvas element
   * @type {HTMLCanvasElement}
   */
  public get canvas (): HTMLCanvasElement {
    return this.shadowRoot?.getElementById('canvas') as HTMLCanvasElement;
  }

  /**
   * Alias of context
   * @type {CanvasRenderingContext2D | null}
   */
  public get ctx (): CanvasRenderingContext2D | null {
    /* istanbul ignore if  */
    if(!this.canvas) {
      return null;
    }
    return this.canvas.getContext('2d');
  }

  /**
   * The 2 dimensional context of the canvas, used for drawing
   * @type {CanvasRenderingContext2D | null}
   */
  public get context (): CanvasRenderingContext2D | null {
    return this.ctx;
  }

  /**
   * Request an animation frame
   * @return {void}
   */
  private loop (): void {
    if(this.autoloop) {
      this.frameId = requestAnimationFrame(this.fireFrame.bind(this));
    }
  }

  /**
   * Dispatch frame event
   * @param t timestamp
   * @return {void}
   */
  protected fireFrame (t: number): void {
    cancelAnimationFrame(this.frameId);
    /**
     * Frame fires next frame event when autoloop is set to true.
     */
    this.dispatchEvent(
      new CustomEvent('frame', {
        detail: { timestamp: t },
        bubbles: false
      })
    );
    this.loop();
  }

  /**
   * Updated canvas size
   * @param width width of canvas
   * @param height height of canvas
   * @return {void}
   */
  private resizeCanvas (width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = width;
    this.height = height;
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    if(this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
  }

  /**
   * Return context of canvas,
   * support only 2D mode
   * @param {String} mode mode of canvas's context
   * @return context of canvas
   */
  public getContext (mode: string): CanvasRenderingContext2D | null {
    if (mode === '2d') {
      return this.canvas.getContext(mode);
    }
    console.warn('ef-canvas does not support the mode ' + mode); // eslint-disable-line
    return null;
  }

  /**
   * private method but can't override
   * access modifiers in typescript.
   * @ignore
   * @param size element dimensions
   * @returns {void}
   */
  public resizedCallback (size: ElementSize): void {
    this.resizeCanvas(size.width, size.height);
  }

  /**
   * A `TemplateResult` that will be used
   * to render the updated internal template.
   * @return Render template
   */
  protected render (): TemplateResult {
    return html`
      <canvas id="canvas"></canvas>
    `;
  }
}