export interface TwitchCredentials {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface TwitchError {
  status: number;
  message: string;
}

/**
 * Retrieve OAuth2 client credentials for Twitch app
 * @param clientId App Client ID
 * @param clientSecret App Client secret
 * @returns Twitch credentials object
 * @throws Credentials are not valid or request failed
 */
export async function twitchAuth(
  clientId: string,
  clientSecret: string,
): Promise<TwitchCredentials> {
  const url = `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;

  const req = await fetch(url, {
    method: 'POST',
  });
  if (!req.ok) {
    const err = (await req.json()) as TwitchError;
    throw new Error(`authentication failed: ${err.message} (${err.status})'`);
  }

  return req.json() as Promise<TwitchCredentials>;
}

/**
 * Check if provided Twitch app credentials are fine by making a simple request
 * @param clientId App Client ID
 * @param clientSecret App Client secret
 * @throws Credentials are not valid or request failed
 */
export async function checkTwitchKeys(
  clientId: string,
  clientSecret: string,
): Promise<void> {
  const creds = await twitchAuth(clientId, clientSecret);
  console.log(creds);
  const req = await fetch('https://api.twitch.tv/helix/streams?first=1', {
    headers: {
      Authorization: `Bearer ${creds.access_token}`,
      'Client-Id': clientId,
    },
  });

  if (!req.ok) {
    const err = (await req.json()) as TwitchError;
    throw new Error(`API test call failed: ${err.message}`);
  }
}
