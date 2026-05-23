/**
 * hitTest — Coordinate utilities for matching Events.PlayerTap against XAML elements.
 *
 * IMPORTANT: PlayerTap coordinates are in the **inner authoring canvas**
 * (480 × 850, see CANVAS_W / CANVAS_H in Constants.ts), NOT screen pixels and
 * NOT the 1080 × 1920 CustomUiComponent canvas. They have already been mapped
 * by FocusedInteractionSetup.
 *
 * To hit-test a UI element, you need its bounding box in that same 480 × 850
 * space. Most XAML elements in this project sit inside a row of the inner
 * Grid (Width=480 Height=850, three RowDefinitions: 0.15* / 0.45* / 0.4*).
 *   Row 0: y =   0 .. 128   (upgrade-bar area)
 *   Row 1: y = 128 .. 510   (tap zone — main gem, bonus gem, etc.)
 *   Row 2: y = 510 .. 850   (shop)
 *
 * If your element uses HorizontalAlignment="Center" and a TranslateTransform
 * (X, Y) offset, its on-canvas center is (240 + offsetX, anchorY + offsetY)
 * where anchorY depends on VerticalAlignment / Margin.
 */

/**
 * Axis-aligned bounding-box hit test. All coordinates are in the 480 × 850
 * tap canvas.
 *
 * @param tapX  Events.PlayerTapPayload.tapX
 * @param tapY  Events.PlayerTapPayload.tapY
 * @param x     Left edge of the target element
 * @param y     Top edge of the target element
 * @param w     Width of the target element
 * @param h     Height of the target element
 */
export function isHit(
  tapX: number, tapY: number,
  x: number, y: number, w: number, h: number,
): boolean {
  return tapX >= x && tapX <= x + w && tapY >= y && tapY <= y + h;
}

/**
 * Same as isHit but centered: pass the center (cx, cy) and half-extents.
 * Convenient when the element uses HorizontalAlignment="Center" +
 * TranslateTransform — the translation directly gives the center offset
 * from (240, anchorY).
 */
export function isHitCentered(
  tapX: number, tapY: number,
  cx: number, cy: number, w: number, h: number,
): boolean {
  return isHit(tapX, tapY, cx - w / 2, cy - h / 2, w, h);
}
