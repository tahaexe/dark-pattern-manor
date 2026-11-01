import { render } from 'preact';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/atkinson-hyperlegible-next/400.css';
import '@fontsource/atkinson-hyperlegible-next/700.css';
import App from './app/App';
import './styles/tokens.css';
import './styles/base.css';
import './styles/look.css';

render(<App />, document.getElementById('app')!);
