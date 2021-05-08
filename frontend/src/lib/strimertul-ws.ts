import { EventEmitter } from '@billjs/event-emitter';

export type SubscriptionHandler = (newValue: string) => void;

interface kvError {
  ok: false;
  error: string;
}

interface kvPush {
  type: 'push';
  key: string;
  // eslint-disable-next-line camelcase
  new_value: string;
}

interface kvGenericResponse {
  ok: true;
  type: 'response';
  cmd: string;
  data: string;
}

interface kvEmptyResponse {
  ok: true;
  type: 'response';
  cmd: string;
}

interface kvGet {
  command: 'kget';
  data: { key: string };
}

interface kvSet {
  command: 'kset';
  data: { key: string; data: string };
}
interface kvSubscribe {
  command: 'ksub';
  data: { key: string };
}

interface kvUnsubscribe {
  command: 'kunsub';
  data: { key: string };
}

interface kvVersion {
  command: 'kversion';
}

export type KilovoltRequest =
  | kvGet
  | kvSet
  | kvSubscribe
  | kvUnsubscribe
  | kvVersion;

type KilovoltResponse = kvGenericResponse | kvEmptyResponse;

export type KilovoltMessage = kvError | kvPush | KilovoltResponse;

export default class KilovoltWS extends EventEmitter {
  socket!: WebSocket;

  address: string;

  pending: Record<string, (response: KilovoltMessage) => void>;

  subscriptions: Record<string, SubscriptionHandler[]>;

  /**
   * Create a new Kilovolt client instance and connect to it
   * @param address Kilovolt server endpoint (including path)
   */
  constructor(address = 'ws://localhost:4337/ws') {
    super();
    this.address = address;
    this.pending = {};
    this.subscriptions = {};
    this.connect(address);
  }

  /**
   * Re-connect to kilovolt server
   */
  reconnect(): void {
    this.connect(this.address);
  }

  private connect(address: string): void {
    this.socket = new WebSocket(address);
    this.socket.addEventListener('open', this.open.bind(this));
    this.socket.addEventListener('message', this.received.bind(this));
    this.socket.addEventListener('close', this.closed.bind(this));
  }

  /**
   * Wait for websocket connection to be established
   */
  async wait(): Promise<void> {
    return new Promise((resolve) => {
      if (this.socket.readyState === this.socket.OPEN) {
        resolve();
        return;
      }
      this.once('open', () => resolve());
    });
  }

  private open() {
    console.info('connected to server');
    this.fire('open');
    this.fire('stateChange', this.socket.readyState);
  }

  private closed() {
    console.warn('lost connection to server');
    this.fire('close');
    this.fire('stateChange', this.socket.readyState);
  }

  private received(event: MessageEvent) {
    const events = (event.data as string)
      .split('\n')
      .map((ev) => ev.trim())
      .filter((ev) => ev.length > 0);
    events.forEach((ev) => {
      const response: KilovoltMessage = JSON.parse(ev ?? '""');
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

  /**
   * Send a request to the server
   * @param msg Request to send
   * @returns Response from server
   */
  async send(msg: KilovoltRequest): Promise<KilovoltMessage> {
    return new Promise((resolve) => {
      const payload = JSON.stringify(msg);
      this.socket.send(payload);
      this.pending[payload] = resolve;
    });
  }

  /**
   * Set a key to a specified value
   * @param key Key to set
   * @param data Value to set
   * @returns Reply from server
   */
  async putKey(key: string, data: string): Promise<KilovoltMessage> {
    return this.send({
      command: 'kset',
      data: {
        key,
        data,
      },
    });
  }

  /**
   * Set a key to the JSON representation of an object
   * @param key Key to set
   * @param data Object to save
   * @returns Reply from server
   */
  async putJSON<T>(key: string, data: T): Promise<KilovoltMessage> {
    return this.send({
      command: 'kset',
      data: {
        key,
        data: JSON.stringify(data),
      },
    });
  }

  /**
   * Retrieve value for key
   * @param key Key to retrieve
   * @returns Reply from server
   */
  async getKey(key: string): Promise<string> {
    const response = (await this.send({
      command: 'kget',
      data: {
        key,
      },
    })) as kvError | kvGenericResponse;
    if ('error' in response) {
      throw new Error(response.error);
    }
    return response.data;
  }

  /**
   * Retrieve object from key, deserialized from JSON.
   * It's your responsibility to make sure the object is actually what you expect
   * @param key Key to retrieve
   * @returns Reply from server
   */
  async getJSON<T>(key: string): Promise<T> {
    const response = (await this.send({
      command: 'kget',
      data: {
        key,
      },
    })) as kvError | kvGenericResponse;
    if ('error' in response) {
      throw new Error(response.error);
    }
    return JSON.parse(response.data);
  }

  /**
   * Subscribe to key changes
   * @param key Key to subscribe to
   * @param fn Callback to call when key changes
   * @returns Reply from server
   */
  async subscribe(
    key: string,
    fn: SubscriptionHandler,
  ): Promise<KilovoltMessage> {
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

  /**
   * Stop calling a callback when its related key changes
   * This only
   * @param key Key to unsubscribe from
   * @param fn Callback to stop calling
   * @returns true if a subscription was removed, false otherwise
   */
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
      const res = (await this.send({
        command: 'kunsub',
        data: {
          key,
        },
      })) as kvError | kvGenericResponse;
      if ('error' in res) {
        console.warn(`unsubscribe failed: ${res.error}`);
      }
      return res.ok;
    }

    return true;
  }
}
