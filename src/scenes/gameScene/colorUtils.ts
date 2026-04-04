import Phaser from 'phaser';

export function hexToColorValue(hex: string): number {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export function mixColor(colorA: number, colorB: number, amount: number): number {
  const a = Phaser.Display.Color.ValueToColor(colorA);
  const b = Phaser.Display.Color.ValueToColor(colorB);
  return Phaser.Display.Color.GetColor(
    Math.round(Phaser.Math.Linear(a.red, b.red, amount)),
    Math.round(Phaser.Math.Linear(a.green, b.green, amount)),
    Math.round(Phaser.Math.Linear(a.blue, b.blue, amount))
  );
}

export function colorValueToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function applyReadableLetterStyle(
  letter: Phaser.GameObjects.Text,
  color: string,
  strokeColor: string,
  shadowColor: string,
  options?: {
    fontStyle?: string;
    strokeWidth?: number;
    shadowOffsetY?: number;
  }
): void {
  letter.setColor(color);
  letter.setFontStyle(options?.fontStyle ?? '');
  letter.setStroke(strokeColor, options?.strokeWidth ?? 1);
  letter.setShadow(0, options?.shadowOffsetY ?? 1, shadowColor, 2, false, true);
}
