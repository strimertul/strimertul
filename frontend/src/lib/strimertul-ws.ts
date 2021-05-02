export type SubscriptionHandler = (newValue: string) => void;

interface wsError {
  ok: false;
  error: string;
}

interface wsPush {
  type: 'push';
  key: string;
  // eslint-disable-next-line camelcase
  new_value: string;
}

interface wsResponse {
  ok: true;
  type: 'response';
  cmd: string;
  data?: string;
}

export type wsMessage = wsError | wsPush | wsResponse;

export default class StrimertulWS {
  socket: WebSocket;

  pending: Record<string, (...args) => void>;

  onOpen: (() => void)[];

  subscriptions: Record<string, SubscriptionHandler[]>;

  constructor(address = 'ws://localhost:4337/ws') {
    this.pending = {};
    this.subscriptions = {};
    this.onOpen = [];
    this.socket = new WebSocket(address);
    this.socket.addEventListener('open', this.open.bind(this));
    this.socket.addEventListener('message', this.received.bind(this));
  }

  async wait(): Promise<void> {
    return new Promise((resolve) => {
      this.onOpen.push(resolve);
      if (this.socket.readyState === this.socket.OPEN) {
        resolve();
      }
    });
  }

  private open() {
    console.info('connected to server');
    this.onOpen.forEach((res) => res());
    this.onOpen = [];
  }

  private received(event: MessageEvent) {
    const events = (event.data as string)
      .split('\n')
      .map((ev) => ev.trim())
      .filter((ev) => ev.length > 0);
    events.forEach((ev) => {
      const response: wsMessage = JSON.parse(ev ?? '""');
      if ('error' in response) {
        console.error('Received error from ws: ', response.error);
        // TODO show in UI somehow
        return;
      }
      switch (response.type) {
        case 'response':
          if (response.cmd in this.pending) {
            this.pending[response.cmd](response);
            delete this.pending[response.cmd];
          } else {
            console.warn(
              'Received a response for an unregistered request: ',
              response,
            );
          }
          break;
        case 'push': {
          if (response.key in this.subscriptions) {
            this.subscriptions[response.key].forEach((fn) =>
              fn(response.new_value),
            );
          } else {
            console.warn(
              'Received subscription push with no listeners: ',
              response,
            );
          }
          break;
        }
        default:
        // Do nothing
      }
    });
  }

  async send<R, T>(msg: T): Promise<R> {
    return new Promise((resolve) => {
      const payload = JSON.stringify(msg);
      this.socket.send(payload);
      this.pending[payload] = resolve;
    });
  }

  async putKey(key: string, data: string): Promise<wsMessage> {
    return this.send({
      command: 'kset',
      data: {
        key,
        data,
      },
    });
  }

  async putJSON<T>(key: string, data: T): Promise<wsMessage> {
    return this.send({
      command: 'kset',
      data: {
        key,
        data: JSON.stringify(data),
      },
    });
  }

  async getKey(key: string): Promise<string> {
    const response: wsError | wsResponse = await this.send({
      command: 'kget',
      data: {
        key,
      },
    });
    if ('error' in response) {
      throw new Error(response.error);
    }
    return response.data;
  }

  async getJSON<T>(key: string): Promise<T> {
    const response: wsError | wsResponse = await this.send({
      command: 'kget',
      data: {
        key,
      },
    });
    if ('error' in response) {
      throw new Error(response.error);
    }
    return JSON.parse(response.data);
  }

  async subscribe(key: string, fn: SubscriptionHandler): Promise<wsMessage> {
    if (key in this.subscriptions) {
      this.subscriptions[key].push(fn);
    } else {
      this.subscriptions[key] = [fn];
    }

    return this.send({
      command: 'ksub',
      data: {
        key,
      },
    });
  }

  async unsubscribe(key: string, fn: SubscriptionHandler): Promise<boolean> {
    if (!(key in this.subscriptions)) {
      // No subscriptions, just warn and return
      console.warn(
        `Trying to unsubscribe from key "${key}" but no subscriptions could be found!`,
      );
      return false;
    }

    // Get subscriber in list
    const index = this.subscriptions[key].findIndex((subfn) => subfn === fn);
    if (index < 0) {
      // No subscriptions, just warn and return
      console.warn(
        `Trying to unsubscribe from key "${key}" but specified function is not in the subscribers!`,
      );
      return false;
    }

    // Remove subscriber from list
    this.subscriptions[key].splice(index, 1);

    // Check if array is empty
    if (this.subscriptions[key].length < 1) {
      // Send unsubscribe
      const res: wsResponse | wsError = await this.send({
        command: 'kunsub',
        data: {
          key,
        },
      });
      if ('error' in res) {
        console.warn(`unsubscribe failed: ${res.error}`);
      }
      return res.ok;
    }

    return true;
  }
}
