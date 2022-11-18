export function getInterval(duration: number): [number, number] {
  if (duration < 60) {
    return [duration, 1];
  }
  if (duration % 3600 === 0) {
    return [duration / 3600, 3600];
  }
  if (duration % 60 === 0) {
    return [duration / 60, 60];
  }
  return [duration, 1];
}

/**
 * Wait for an amount of time using async/await
 * @param ms How many milliseconds to wait
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

export default { getInterval };
