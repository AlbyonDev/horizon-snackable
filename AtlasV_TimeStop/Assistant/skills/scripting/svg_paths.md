---
name: svg_paths
summary: SVG path data syntax reference for drawing custom shapes with drawPath
include: always
---

# SVG Path Data Reference

The `drawPath()` method accepts SVG path data syntax for drawing custom shapes. This reference covers the most commonly used commands.

## Path Commands

All commands are case-sensitive:
- **Uppercase** = absolute coordinates (from origin)
- **Lowercase** = relative coordinates (from current point)

### Move To (M/m)

Move the pen without drawing.

```
M x,y    Move to absolute position
m dx,dy  Move relative to current position
```

**Example:** `M 100,50` moves to point (100, 50)

### Line To (L/l)

Draw a straight line to a point.

```
L x,y    Line to absolute position
l dx,dy  Line relative to current position
```

**Example:** `M 0,0 L 100,50` draws a line from (0,0) to (100,50)

### Horizontal Line (H/h)

Draw a horizontal line.

```
H x      Horizontal line to absolute X
h dx     Horizontal line relative
```

**Example:** `H 100` draws horizontal line to x=100

### Vertical Line (V/v)

Draw a vertical line.

```
V y      Vertical line to absolute Y
v dy     Vertical line relative
```

**Example:** `V 50` draws vertical line to y=50

### Close Path (Z/z)

Close the path by drawing a line back to the start.

```
Z or z   Close path (no difference between upper/lower)
```

**Example:** `M 0,0 L 100,0 L 50,100 Z` draws a closed triangle

## Common Shape Patterns

### Triangle (Pointing Up)

```typescript
const TRIANGLE_UP = 'M 0 -10 L 10 10 L -10 10 Z';
```
- Start at top center
- Line to bottom right
- Line to bottom left
- Close back to top

### Triangle (Pointing Down)

```typescript
const TRIANGLE_DOWN = 'M 0 10 L 10 -10 L -10 -10 Z';
```

### Triangle (Pointing Right)

```typescript
const TRIANGLE_RIGHT = 'M 10 0 L -10 -10 L -10 10 Z';
```

### Ship Shape (Classic Asteroids)

```typescript
const SHIP = 'M 0 -12 L 8 10 L 0 6 L -8 10 Z';
```
- Nose at top
- Two wings at bottom
- Notch in the middle

### Diamond

```typescript
const DIAMOND = 'M 0 -10 L 10 0 L 0 10 L -10 0 Z';
```

### Arrow

```typescript
const ARROW_RIGHT = 'M 0 -5 L 10 0 L 0 5 L 3 0 Z';
const ARROW_UP = 'M -5 0 L 0 -10 L 5 0 L 0 -3 Z';
```

### Star (5-Point)

```typescript
// Simplified 5-point star
const STAR_5 = 'M 0 -10 L 2.9 -4 L 9.5 -3 L 4.7 2 L 5.9 9 L 0 5.5 L -5.9 9 L -4.7 2 L -9.5 -3 L -2.9 -4 Z';
```

### Hexagon

```typescript
// Regular hexagon centered at origin
const HEXAGON = 'M 10 0 L 5 8.66 L -5 8.66 L -10 0 L -5 -8.66 L 5 -8.66 Z';
```

### Pentagon

```typescript
const PENTAGON = 'M 0 -10 L 9.51 -3.09 L 5.88 8.09 L -5.88 8.09 L -9.51 -3.09 Z';
```

## Generating Shapes Programmatically

### Regular Polygon Generator

```typescript
function generateRegularPolygon(sides: number, radius: number): string {
  const parts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * 2 * Math.PI - Math.PI / 2;  // Start from top
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    parts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

// Usage
const octagon = generateRegularPolygon(8, 15);
const hexagon = generateRegularPolygon(6, 10);
```

### Irregular Asteroid Generator

```typescript
function generateAsteroidPath(radiusMultipliers: number[]): string {
  const n = radiusMultipliers.length;
  const baseRadius = 1;  // Will be scaled when drawing
  const parts: string[] = [];

  for (let i = 0; i < n; i++) {
    const angle = (i / n) * 2 * Math.PI;
    const r = baseRadius * radiusMultipliers[i];
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    parts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

// Usage - varying radii create irregular shape
const asteroid = generateAsteroidPath([1.0, 0.75, 0.85, 0.7, 1.0, 0.8, 0.9, 0.65, 0.95, 0.8]);
```

## Using Paths with Transforms

Paths are typically drawn centered at origin and transformed:

```typescript
// Path defined centered at origin
const SHIP_PATH = 'M 0 -12 L 8 10 L 0 6 L -8 10 Z';

// Draw at position with rotation
private drawShip(): void {
  const brush = new SolidBrush(Color.fromHex('#4CAF50'));
  const pen = new Pen(new SolidBrush(Color.fromHex('#2E7D32')), 2);

  this.builder.pushTranslate(this.shipX, this.shipY);
  this.builder.pushRotate(this.shipAngle, 0, 0);
  this.builder.drawPath(brush, pen, SHIP_PATH);
  this.builder.pop();
  this.builder.pop();
}

// Draw with scale
private drawScaledAsteroid(): void {
  this.builder.pushTranslate(asteroid.x, asteroid.y);
  this.builder.pushRotate(asteroid.rotation, 0, 0);
  this.builder.pushScale(asteroid.size, asteroid.size, 0, 0);  // Scale the normalized path
  this.builder.drawPath(fillBrush, outlinePen, NORMALIZED_ASTEROID_PATH);
  this.builder.pop();
  this.builder.pop();
  this.builder.pop();
}
```

## Advanced Commands (Curves)

### Quadratic Bezier (Q/q)

```
Q cx,cy x,y    Quadratic curve with control point (cx,cy) to endpoint (x,y)
q dcx,dcy dx,dy  Relative quadratic curve
```

**Example:** Smooth curve
```typescript
const CURVED_ARROW = 'M 0 0 Q 25 -15 50 0 L 40 -5 L 50 0 L 40 5 Z';
```

### Cubic Bezier (C/c)

```
C cx1,cy1 cx2,cy2 x,y    Cubic curve with two control points
```

**Example:** S-curve
```typescript
const S_CURVE = 'M 0 0 C 10 -20 40 20 50 0';
```

### Arc (A/a)

```
A rx ry rotation large-arc sweep x y
```
- `rx, ry` - Ellipse radii
- `rotation` - X-axis rotation in degrees
- `large-arc` - 0 or 1 (use larger arc?)
- `sweep` - 0 or 1 (clockwise?)
- `x, y` - Endpoint

**Example:** Semicircle
```typescript
const SEMICIRCLE = 'M -10 0 A 10 10 0 0 1 10 0 Z';
```

## Tips for Path Design

1. **Center at origin** - Define shapes centered at (0,0) for easy rotation
2. **Use consistent scale** - Either use real coordinates or normalized (0-1) with scaling
3. **Keep paths simple** - Complex shapes require more commands and render slower
4. **Test visually** - Draw paths at a fixed position first before adding transforms
5. **Close your paths** - Use `Z` to ensure shapes fill properly

## Common Mistakes

```typescript
// ❌ WRONG - Spaces in wrong places
'M0,0L10,10'  // Missing spaces after commands

// ✅ CORRECT - Spaces after commands
'M 0,0 L 10,10'
'M 0 0 L 10 10'  // Spaces OR commas work

// ❌ WRONG - Forgetting to close
'M 0 0 L 10 0 L 5 10'  // Shape may not fill correctly

// ✅ CORRECT - Close with Z
'M 0 0 L 10 0 L 5 10 Z'

// ❌ WRONG - Not starting with M
'L 10 10'  // Must start with Move command

// ✅ CORRECT - Always start with M
'M 0 0 L 10 10'
```
