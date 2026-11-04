import './styles/tokens.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/three.css';
import { start } from './app.js';
import { checkBackend, initOffline, loadSettings } from './state/actions.js';
import { state } from './state/store.js';
import { renderHeader } from './components/header.js';

loadSettings();
initOffline();           // bundled synthetic fixture: the desk shows meaningful 3D + charts before the API is reachable
start();
checkBackend();
setInterval(() => { checkBackend(); renderHeader(document.getElementById('header')); }, 15000);
window.__AOD__ = state;   // debugging / e2e hook
