// frontend/router.js
import { Home } from './screens/home.js';
import { Send } from './screens/send.js';
import { Receive } from './screens/receive.js';
import { Connected } from './screens/connected.js';
import { Sending } from './screens/sending.js';
import { Receiving } from './screens/receiving.js';
import { Completed } from './screens/completed.js';
import { Reconnect } from './screens/reconnect.js';

export const router = {
    screens: {
        home: Home,
        send: Send,
        receive: Receive,
        connected: Connected,
        sending: Sending,
        receiving: Receiving,
        completed: Completed,
        reconnect: Reconnect
    },
    
    navigate(screenName, props = {}) {
        const root = document.getElementById('app-root');
        root.style.opacity = '0';
        
        setTimeout(() => {
            const screenFn = this.screens[screenName];
            if (screenFn) {
                root.innerHTML = screenFn(props);
                // Re-initialize specific components like QR or event listeners
                this.initScreenLogic(screenName, props);
            }
            root.style.opacity = '1';
            root.className = "pt-24 pb-12 px-4 max-w-md mx-auto min-h-screen flex flex-col items-center justify-center screen-fade-in";
        }, 200);
    },
};