export interface StulbeOptions {
  controller: AbortController;
}

export default class Stulbe {
  private token: string;

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly endpoint: string,
    private readonly options?: StulbeOptions,
  ) {}

  public async auth(user: string, key: string): Promise<boolean> {
    const res = await (
      await fetch(`${this.endpoint}/api/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user,
          key,
        }),
        signal: this.options?.controller.signal,
      })
    ).json();
    if (!res.ok) {
      throw new Error(res.error);
    }
    this.token = res.token;
    return res.ok;
  }

  public async makeRequest<T>(
    method: string,
    path: string,
    body?: any,
  ): Promise<T> {
    if (!this.token) {
      throw new Error('not authenticated');
    }
    const res = await (
      await fetch(`${this.endpoint}/${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body,
        signal: this.options?.controller.signal,
      })
    ).json();
    return res;
  }
}
