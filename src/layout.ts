export const drawKeyColumn = (two: any, ppm: number, keyCount: number = 4) => {
  const keyWidth = 17 * ppm;
  const keyHeight = keyWidth;
  const gapY = 2 * ppm;
  const originX = 0;
  const originY = 0;

  const keys = [];

  // Home Row (Always present)
  const homeRowKey = two.makeRectangle(originX, originY, keyWidth, keyHeight);
  homeRowKey.stroke = 'black';
  homeRowKey.linewidth = 2;
  homeRowKey.fill = 'transparent';
  keys.push(homeRowKey);

  // Top Row (Present if keyCount >= 2)
  if (keyCount >= 2) {
    const topRowKey = two.makeRectangle(
      originX,
      originY + gapY + keyHeight,
      keyWidth,
      keyHeight,
    );
    topRowKey.stroke = 'black';
    topRowKey.linewidth = 2;
    topRowKey.fill = 'transparent';
    keys.push(topRowKey);
  }

  // Bottom Row (Present if keyCount >= 3)
  if (keyCount >= 3) {
    const bottomRowKey = two.makeRectangle(
      originX,
      originY - gapY - keyHeight,
      keyWidth,
      keyHeight,
    );
    bottomRowKey.stroke = 'black';
    bottomRowKey.linewidth = 2;
    bottomRowKey.fill = 'transparent';
    keys.push(bottomRowKey);
  }

  // Number Row (Present if keyCount >= 4)
  if (keyCount >= 4) {
    const numberRowKey = two.makeRectangle(
      originX,
      originY + (gapY + keyHeight) * 2,
      keyWidth,
      keyHeight,
    );
    numberRowKey.stroke = 'black';
    numberRowKey.linewidth = 2;
    numberRowKey.fill = 'transparent';
    keys.push(numberRowKey);
  }

  const group = two.makeGroup(keys);

  return group;
};
