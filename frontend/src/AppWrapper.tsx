import { IsFatalError } from '@wailsapp/go/main/App';
import { EventsOn, EventsOff } from '@wailsapp/runtime/runtime';
import { useState, useEffect } from 'react';
import App from './ui/App';
import ErrorWindow from './ui/ErrorWindow';

export default function AppWrapper() {
  const [fatalErrorEncountered, setFatalErrorStatus] = useState(false);
  useEffect(() => {
    void IsFatalError().then(setFatalErrorStatus);
    EventsOn('fatalError', () => {
      setFatalErrorStatus(true);
    });
    return () => {
      EventsOff('fatalError');
    };
  }, []);

  if (fatalErrorEncountered) {
    return <ErrorWindow />;
  }
  return <App />;
}
