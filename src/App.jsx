import { useEffect, useState } from 'react';
import HomePage from './pages/Home.component';
import { log } from './utils';

import './App.scss';

const App = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    document.documentElement.addEventListener('fullscreenchange', () => {
      log({ fullscreenchange: document.fullscreenElement });
      setIsFullScreen(Boolean(document.fullscreenElement));
    });
    async function toggleFullScreen() {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        } else if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch (err) {
        log({ fullScreenErr: err.message });
      }
      return true;
    }
    let isAltKeyDown = false;
    document.addEventListener('keydown', e => {
      // log({ keydown: e.key });
      if (e.key === 'Alt') {
        isAltKeyDown = true;
      }
      if (isAltKeyDown && e.key === 'Enter') {
        toggleFullScreen();
      }
    }, false);
    document.addEventListener('keyup', e => {
      // log({ keyup: e.key });
      if (e.key === 'Alt') {
        isAltKeyDown = false;
        e.preventDefault();
      }
    }, false);
  }, []);

  useEffect(() => {
    log({ isFullScreen });
  }, [isFullScreen]);

  return (
    <div className={'app' + (isFullScreen ? ' full-screen' : '')}>
      <HomePage isFullScreen={isFullScreen} />
    </div>
  );
};

export default App;
