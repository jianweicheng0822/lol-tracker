export function movingAverage(data: number[], window: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < window - 1) return null;
    const slice = data.slice(i - window + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export function rollingWinRate(wins: boolean[], window: number): (number | null)[] {
  return wins.map((_, i) => {
    if (i < window - 1) return null;
    const slice = wins.slice(i - window + 1, i + 1);
    const winCount = slice.filter(Boolean).length;
    return Math.round((winCount / slice.length) * 100);
  });
}
