import { useEffect, useState } from 'react';
import { EventsEmit, EventsOff, EventsOn } from '@wailsapp/runtime';
import { CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import DialogContent from './DialogContent';
import {
  Button,
  Dialog,
  DialogActions,
  DialogDescription,
  TextBlock,
  styled,
} from '../theme';
import BrowserLink from './BrowserLink';

interface AuthRequest {
  uid: number;
  info: AppInfo;
  callbackID: string;
}

interface AppInfo {
  name: string;
  author: string;
  verificationCode: string;
  url: string;
  icon: string;
}

const appInfoKeys: Array<keyof AppInfo> = [
  'name',
  'author',
  'verificationCode',
  'url',
  'icon',
];

const AppCard = styled('div', {
  display: 'grid',
  backgroundColor: '$gray3',
  padding: '0.5rem',
  borderRadius: '5px',
  gridTemplateColumns: '90px 1fr',
});

const AppIcon = styled('img', {
  maxWidth: '64px',
  maxHeight: '64px',
  gridColumn: '1',
  gridRow: '1/5',
  alignSelf: 'center',
  justifySelf: 'center',
});

const AppName = styled('div', {
  fontWeight: 'bold',
  fontSize: '18pt',
  gridColumn: '2',
});

const AppInfo = styled('div', {
  gridColumn: '2',
});
const AppCode = styled('div', {
  fontFamily: 'monospace',
  fontSize: '16pt',
  backgroundColor: '$gray3',
  padding: '0.2rem',
  borderRadius: '5px',
  gridTemplateColumns: '90px 1fr',
  textAlign: 'center',
});

function parseAppInfo(message: Record<string, unknown>): AppInfo {
  const info: AppInfo = {
    name: 'Unknown application',
    author: '',
    verificationCode: '',
    url: '',
    icon: '',
  };

  appInfoKeys.forEach((key) => {
    if (key in message) {
      info[key] = String(message[key]) || info[key];
    }
  });

  return info;
}

export default function InteractiveAuthDialog() {
  const [requests, setRequests] = useState<AuthRequest[]>([]);

  useEffect(() => {
    EventsOn(
      'interactiveAuth',
      (uid: number, message: Record<string, unknown>, callbackID: string) => {
        setRequests([
          ...requests,
          { uid, info: parseAppInfo(message), callbackID },
        ]);
      },
    );
    return () => {
      EventsOff('interactiveAuth');
    };
  });

  const answerAuthRequest = (callbackID: string, answer: boolean) => {
    EventsEmit(callbackID, answer);
    setRequests(requests.filter((r) => r.callbackID !== callbackID));
  };

  return (
    <>
      {requests.map(({ uid, info, callbackID }) => (
        <Dialog open={true} key={uid}>
          <DialogContent title="An application is trying to access strimertül">
            <DialogDescription css={{ color: '$teal12' }}>
              <TextBlock>
                An application wants access to strimertül. Allowing this will
                make the application capable of interacting and controlling
                strimertül. This includes accessing sensible data stored in the
                database.
              </TextBlock>
              <TextBlock css={{ fontWeight: 'bold', color: '$red11' }}>
                Only accept if you know and trust the application.
              </TextBlock>
              <TextBlock>
                The application provided the following info for easier
                identification:
              </TextBlock>
              <AppCard>
                {info.icon && <AppIcon src={info.icon} />}
                <AppName>{info.name}</AppName>
                {info.author && <AppInfo>{info.author}</AppInfo>}
                {info.url && (
                  <AppInfo>
                    <BrowserLink href={info.url}>{info.url}</BrowserLink>
                  </AppInfo>
                )}
              </AppCard>
              {info.verificationCode && (
                <>
                  <TextBlock>
                    As an additional security measure, also verify that the
                    application shows this matching code:
                  </TextBlock>
                  <AppCode>{info.verificationCode}</AppCode>
                </>
              )}
            </DialogDescription>
            <DialogActions>
              <Button
                variation="primary"
                onClick={() => answerAuthRequest(callbackID, true)}
              >
                <CheckCircledIcon />
                Allow
              </Button>
              <Button
                variation="danger"
                onClick={() => answerAuthRequest(callbackID, false)}
              >
                <CrossCircledIcon />
                Deny
              </Button>
            </DialogActions>
          </DialogContent>
        </Dialog>
      ))}
    </>
  );
}
