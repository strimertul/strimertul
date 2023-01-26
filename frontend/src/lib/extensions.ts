export class Extension extends EventTarget {
  private readonly worker: Worker;

  constructor(public readonly source: string) {
    super();
    const blob = new Blob([source], { type: 'text/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
    this.worker.onerror = (ev) =>
      this.dispatchEvent(new CustomEvent('error', { detail: ev }));
    this.worker.onmessage = (ev) =>
      this.dispatchEvent(new CustomEvent('message', { detail: ev }));
  }

  stop() {
    this.worker.terminate();
  }
}

export default { Extension };
