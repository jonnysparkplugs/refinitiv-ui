import {
  html,
  css,
  customElement,
  property,
  TemplateResult,
  CSSResult,
  PropertyValues,
  BasicElement,
  internalProperty,
  ifDefined,
  WarningNotice,
  query
} from '@refinitiv-ui/core';

import {
  HOURS_IN_DAY,
  MINUTES_IN_HOUR,
  SECONDS_IN_DAY,
  SECONDS_IN_HOUR,
  SECONDS_IN_MINUTE,
  HOURS_IN_HALF_DAY,
  MILLISECONDS_IN_SECOND
} from './utils/timestamps';

import {
  deRegister,
  register
} from './utils/TickManager';

const UP = 'Up';
const DOWN = 'Down';
const VALUE_REGEXP = /^([0-1][0-9]|2[0-3])\:([0-5][0-9])(\:([0-5][0-9]))?$/;

type UpOrDown = typeof UP | typeof DOWN;

/**
 * Splits a time string into segments
 * @param value Time string to parse
 * @returns Array of time segments `[hh, mm, ss]`
 */
const splitSegments = (value: string): number[] => {
  const raw = value.split(':');
  const result = [];
  for (let s = 0; s < 3; s += 1) {
    result[s] = Number(raw[s]) || 0;
  }
  return result;
};

/**
 * Display hours, minutes and seconds as clock interface
 * @fires value-changed - Fired when the value property changes while ticking.
 * @fires offset-changed - Fired when the the user offsets the clock in `interactive` mode.
 */
@customElement('ef-clock')
export class Clock extends BasicElement {
  /**
   * A `CSSResult` that will be used
   * to style the host, slotted children
   * and the internal template of the element.
   * @returns CSS template
   */
  static get styles (): CSSResult | CSSResult[] {
    return css`
      :host {
        display: inline-flex;
        position: relative;
        font-variant-numeric: tabular-nums;
      }

      [part~="hand"] {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        transform-origin: center center;
        pointer-events: none;
      }

      [part="hands"] {
        padding-top: 100%;
      }
    `;
  }

  /**
   * Shared internal function,
   * used for handling notifications from tick manager.
   * @returns {void}
   */
  private onTick = (): void => {
    this.sessionTicks = Math.floor((performance.now() - this.tickTimestamp) / 1000);
    this.notifyPropertyChange('value', this.value);
  }

  /**
   * Current time in seconds
   */
  @internalProperty()
  private get currentTime (): number {
    return this.baseTime + this.sessionTicks;
  }

  /**
   * Base value to use when calculating current time.
   * This value is updated whenever the value property is set.
   */
  @internalProperty()
  private baseTime = 0;

  /**
   * Current amount of ticks in session.
   */
  @internalProperty()
  private sessionTicks = 0;

  /**
   * Timestamp of when the tick property was last updated.
   * Used for accurately ticking time.
   */
  @internalProperty()
  private tickTimestamp = 0;

  /**
   * Get time value in format `hh:mm:ss`
   * @returns value
   */
  @property({ type: String })
  public get value (): string {
    return `${this.formatNumber(this.hours)}:${this.formatNumber(this.minutes)}:${this.formatNumber(this.seconds)}`;
  }

  /**
   * Time to display in hh:mm/h:mm:ss format.
   * @param value new time value
   * @returns {void}
   */
  public set value (value: string) {
    if (typeof value !== 'string' || !VALUE_REGEXP.test(value)) {
      new WarningNotice(`The specified value "${value}" is not valid. The format should be hh:mm or hh:mm:ss.`).show();
      value = '';
    }
    const oldValue = this.value;
    if (oldValue !== value) {
      this.synchronise(); // Required to reset any tick session
      const [hh, mm, ss] = splitSegments(value);
      this.baseTime = hh * SECONDS_IN_HOUR + mm * SECONDS_IN_MINUTE + ss;
      void this.requestUpdate('value', oldValue);
    }
  }

  private _offset = 0;

  /**
   * Get offset value
   * @returns offset
   */
  @property({ type: Number })
  public get offset (): number {
    return this._offset;
  }

  /**
   * Amount to offset value in seconds.
   * @param offset new offset value
   * @returns {void}
   */
  public set offset (offset: number) {

    // Passed value can be null | undefined | number | string
    if (offset && typeof offset !== 'number' && typeof offset !== 'string') {
      return;
    }

    const oldOffset = this.offset;
    const newOffset = Math.round(offset % SECONDS_IN_DAY) || 0;

    if (oldOffset !== newOffset) {
      this._offset = newOffset;
      void this.requestUpdate('offset', oldOffset);
    }
  }

  private _tick = false;

  /**
   * Toggles clock ticking function.
   */
  @property({ type: Boolean })
  public get tick (): boolean {
    return this._tick;
  }
  public set tick (value: boolean) {
    const newValue = !!value;
    const oldValue = this.tick;
    if (oldValue !== newValue) {
      this._tick = newValue;
      this.synchronise();
      this.configureTickManager();
      void this.requestUpdate('tick', oldValue);
    }
  }

  /**
   * Display the digital clock in 12hr format.
   */
  @property({ type: Boolean, attribute: 'am-pm' })
  public amPm = false;

  /**
   * Display the seconds segment.
   */
  @property({ type: Boolean, attribute: 'show-seconds' })
  public showSeconds = false;

  /**
   * Enabled interactive mode. Allowing the user to offset the value.
   */
  @property({ type: Boolean })
  public interactive = false;

  /**
  * Display clock in analogue style.
  */
  @property({ type: Boolean, reflect: true })
  public analogue = false;

  /**
   * Getter for hours part.
   */
  @query('[part~=hours]', true)
  private hoursPart!: HTMLDivElement;

  /**
  * Getter for minutes part.
  */
  @query('[part~=minutes]', true)
  private minutesPart!: HTMLDivElement;

  /**
  * Getter for seconds part.
  */
  @query('[part~=seconds]', true)
  private secondsPart!: HTMLDivElement;

  /**
   * Get the display time in seconds.
   * This value includes any offsets applied.
   * @returns display time
   */
  private get displayTime (): number {
    return (SECONDS_IN_DAY + this.currentTime + this.offset) % SECONDS_IN_DAY;
  }

  /**
   * Get hours portion of value
   * @returns hours value
   */
  private get hours (): number {
    return Math.floor(this.currentTime / SECONDS_IN_HOUR) % HOURS_IN_DAY;
  }

  /**
   * Get minutes portion of value
   * @returns minutes value
   */
  private get minutes (): number {
    return Math.floor(this.currentTime / SECONDS_IN_MINUTE) % MINUTES_IN_HOUR;
  }

  /**
   * Get seconds portion of value
   * @returns seconds value
   */
  private get seconds (): number {
    return this.currentTime % SECONDS_IN_MINUTE;
  }

  /**
   * Get display hours in 24hr format
   * @returns display hours
   */
  private get displayHours24 (): number {
    return Math.floor(this.displayTime / SECONDS_IN_HOUR) % HOURS_IN_DAY;
  }

  /**
   * Get display hours in 12hr format
   * @returns display hours
   */
  private get displayHours12 (): number {
    return (this.displayHours24 % HOURS_IN_HALF_DAY) || HOURS_IN_HALF_DAY;
  }

  /**
   * Get display hours
   * @returns display hours
   */
  private get displayHours (): number {
    return this.amPm ? this.displayHours12 : this.displayHours24;
  }

  /**
   * Get display minutes
   * @returns display minutes
   */
  private get displayMinutes (): number {
    return Math.floor(this.displayTime / SECONDS_IN_MINUTE) % MINUTES_IN_HOUR;
  }

  /**
   * Get display seconds
   * @returns display seconds
   */
  private get displaySeconds (): number {
    return this.displayTime % SECONDS_IN_MINUTE;
  }

  /**
   * Get display AM or PM depending on time
   * @returns `AM` or `PM`
   */
  private get displayAmPm (): string {
    return this.isAM ? 'AM' : 'PM';
  }

  /**
   * Returns `true` or `false` depending on whether the hours are before, or, after noon.
   * @returns Result
   */
  private get isAM (): boolean {
    return this.displayHours24 < HOURS_IN_HALF_DAY;
  }

  /**
   * Format the numbers to a two digit string
   * @param n number
   * @returns number in two digit string
   */
  private formatNumber (n: number): string {
    return `${(n < 10 ? '0' : '')}${n}`;
  }

  /**
   * Configures the tick manager to either start or stop ticking,
   * depending on the state of the element.
   * @param [forceTick=false] forces a tick update
   * @returns {void}
   */
  private configureTickManager (forceTick = false): void {
    if (this.tick && this.isConnected) {
      register(this.onTick);
      forceTick && this.onTick();
    }
    else {
      deRegister(this.onTick);
    }
  }

  /**
   * Synchronises the tick session to the base value
   * and then resets the session.
   * @returns {void}
   */
  private synchronise (): void {
    this.baseTime = this.currentTime;
    this.sessionTicks = 0;
    this.tickTimestamp = Math.floor(performance.now() / MILLISECONDS_IN_SECOND) * MILLISECONDS_IN_SECOND;
  }

  /**
   * Shift the offset by a direction and amount.
   * @param direction direction to shift
   * @param amount value to shift
   * @returns {void}
   */
  private shift (direction: UpOrDown, amount: number): void {
    this.offset = (SECONDS_IN_DAY + this.offset + amount * (direction === UP ? 1 : -1)) % SECONDS_IN_DAY;
    this.notifyPropertyChange('offset', this.offset);
  }

  /**
   * Returns any shift amount assigned to a target.
   * @param target target of an event.
   * @returns {void}
   */
  private getShiftAmountFromTarget (target: EventTarget | null): number {
    if (target === this.hoursPart) {
      return SECONDS_IN_HOUR;
    }
    if (target === this.minutesPart) {
      return SECONDS_IN_MINUTE;
    }
    if (target === this.secondsPart) {
      return 1;
    }
    if (target instanceof HTMLElement && target.parentElement) {
      return this.getShiftAmountFromTarget(target.parentElement);
    }
    return 0;
  }

  /**
   * Handles any keydown events
   * Used for control keys
   * @param event Event Object
   * @returns {void}
   */
  private onKeydown (event: Event): void {
    this.manageControlKeys(event as KeyboardEvent);
  }

  /**
   * Handles any tap events
   * Used for increment/decrement buttons
   * @param event Event Object
   * @returns {void}
   */
  private onTapStart (event: Event): void {
    if (event.target instanceof HTMLElement && event.target.dataset.key) {
      this.shift(event.target.dataset.key as UpOrDown, this.getShiftAmountFromTarget(event.target));
    }
  }

  /**
  * Handle valid control keys and execute their corresponding commands
  * Will stop when readonly is set
  * @param event Event Object
  * @returns {void}
  */
  private manageControlKeys (event: KeyboardEvent): void {
    switch (event.key) {
      case 'Up': // IE
      case 'ArrowUp':
        this.handleUpKey(event);
        break;
      case 'Down': // IE
      case 'ArrowDown':
        this.handleDownKey(event);
        break;
      default:
        return;
    }

    event.preventDefault();
  }

  /**
  * Handles UP key press
  * @param event Event Object
  * @returns {void}
  */
  private handleUpKey (event: KeyboardEvent): void {
    this.shift(UP, this.getShiftAmountFromTarget(event.target));
  }

  /**
  * Handle DOWN key press
  * @param event Event Object
  * @returns {void}
  */
  private handleDownKey (event: KeyboardEvent): void {
    this.shift(DOWN, this.getShiftAmountFromTarget(event.target));
  }

  /**
  * Template for increment and decrement button
  * if interactive mode is enabled.
  * @returns template
  */
  private generateButtonsTemplate (): TemplateResult {
    return html`
      <div part="increment-button" role="button" data-key="${UP}"></div>
      <div part="decrement-button" role="button" data-key="${DOWN}"></div>
    `;
  }

  /**
  * Get template of segment
  * @param name segment's name
  * @param value segment's value
  * @param shiftAmount amount to shift
  * @returns template
  */
  private generateSegmentTemplate (name: string, value: number): TemplateResult {
    return html`
      <div part="segment ${name}" tabindex="${ifDefined(this.interactive ? '0' : undefined)}">
        ${this.formatNumber(value)}
        ${this.interactive ? this.generateButtonsTemplate() : undefined}
      </div>
    `;
  }

  /**
  * Template of divider
  * @returns template
  */
  private get dividerTemplate (): TemplateResult {
    return html`
      <div part="segment divider">:</div>
    `;
  }

  /**
  * Template of amPm segment
  * @returns template
  */
  private get amPmTemplate (): TemplateResult {
    return html`
      <div part="segment am-pm">${this.displayAmPm}</div>
    `;
  }

  /**
  * Template of hours segment
  * @returns template
  */
  private get hoursSegmentTemplate (): TemplateResult {
    return this.generateSegmentTemplate('hours', this.displayHours);
  }

  /**
  * Template of minutes segment
  * @returns template
  */
  private get minutesSegmentTemplate (): TemplateResult {
    return this.generateSegmentTemplate('minutes', this.displayMinutes);
  }

  /**
  * Template of seconds segment
  * @returns template
  */
  private get secondsSegmentTemplate (): TemplateResult {
    return this.generateSegmentTemplate('seconds', this.displaySeconds);
  }

  /**
   * Called when the element has been appended to the DOM
   * @returns {void}
   */
  public connectedCallback (): void {
    super.connectedCallback();
    this.configureTickManager(true);
  }

  /**
   * Called when the element has been disconnected from the DOM
   * @returns {void}
   */
  public disconnectedCallback (): void {
    super.disconnectedCallback();
    this.configureTickManager();
  }

  /**
   * Called after the component is first rendered
   * @param changedProperties Properties which have changed
   * @returns {void}
   */
  protected firstUpdated (changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    this.renderRoot.addEventListener('keydown', (event) => this.onKeydown(event));
    this.renderRoot.addEventListener('tapstart', (event) => this.onTapStart(event));
  }

  /**
  * Template for digital clock
  * @returns template
  */
  protected get digitalClockTemplate (): TemplateResult {
    return html`
      ${this.hoursSegmentTemplate}
      ${this.dividerTemplate}
      ${this.minutesSegmentTemplate}
      ${this.showSeconds ? html`
      ${this.dividerTemplate}
      ${this.secondsSegmentTemplate}
      ` : undefined}
      ${this.amPm ? this.amPmTemplate : undefined}
    `;
  }

  /**
  * Template for analogue clock
  * @returns template
  */
  protected get analogueClockTemplate (): TemplateResult {
    const secAngle = 6 * this.displaySeconds;
    const minAngle = this.showSeconds ? Number((6 * (this.displayMinutes + (1 / 60) * this.displaySeconds)).toFixed(2)) : 6 * this.displayMinutes;
    const hourAngle = Number((30 * (this.displayHours24 + (1 / 60) * this.displayMinutes)).toFixed(2));

    return html`
      <div part="hands">
        <div part="digital">${this.digitalClockTemplate}</div>
        <div part="hand hour" style="transform: rotate(${hourAngle}deg)"></div>
        <div part="hand minute" style="transform: rotate(${minAngle}deg)"></div>
        ${this.showSeconds ? html`<div part="hand second" style="transform: rotate(${secAngle}deg)"></div>` : undefined}
      </div>
    `;
  }

  /**
   * A `TemplateResult` that will be used
   * to render the updated internal template.
   * @returns Render template
   */
  protected render (): TemplateResult {
    return this.analogue ? this.analogueClockTemplate : this.digitalClockTemplate;
  }
}