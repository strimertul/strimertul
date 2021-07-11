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

export default { getInterval };
