import {
  BasicElement,
  html,
  css,
  customElement,
  property,
  TemplateResult,
  CSSResult,
  PropertyValues
} from '@refinitiv-ui/core';

import '../icon';

/**
 * Used to display at the top of application to provide a status or information.
 *
 * @slot right - place custom content on the right of bar.
 */
@customElement('ef-appstate-bar')
export class AppstateBar extends BasicElement {
  /**
   * Text to display in heading section.
   */
  @property({ type: String })
  public heading = '';

  /**
   * (optional) Type of state bar. Supported value are `info`, `highlight`.
   */
  @property({ type: String, reflect: true })
  public state = '';

  /**
   * Invoked whenever the element is updated
   *
   * @param {PropertyValues} changedProperties Map of changed properties with old values
   * @returns {void}
   * @protected
   */
  protected updated (changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    // Call this.updateStyles() to update css variables
    if (changedProperties.has('state')) {
      this.updateStyles();
    }
  }

  /**
   * Hide the element when clear button is clicked
   *
   * @param {Event} event - event params
   * @fires AppstateBar#clear
   * @returns {void}
   * @private
   */
  private clear = (event: Event): void => {
    event.stopPropagation();
    this.style.display = 'none';
    /**
     * Clear Event
     * Fired when clear button is clicked
     *
     * @event clear
     */
    this.dispatchEvent(new CustomEvent('clear'));
  }

  /**
   * A `CSSResult` that will be used
   * to style the host, slotted children
   * and the internal template of the element.
   *
   * @returns {(CSSResult|CSSResult[])} CSS template
   */
  static get styles (): CSSResult | CSSResult[] {
    return css`
      :host {
        display: block;
      }
    `;
  }

  /**
   * A `TemplateResult` that will be used
   * to render the updated internal template.
   *
   * @return {TemplateResult} Render template
   */
  protected render (): TemplateResult {
    return html`
      <div part="heading">${this.heading}</div>
      <div part="message"><slot></slot></div>
      <div part="right"><slot name="right"></slot></div>
      <ef-icon part="close"  @tap="${this.clear}" icon="cross"></ef-icon>
    `;
  }
}