import './globals.css';
import Header from './components/Header';
import { Fraunces, DM_Sans } from 'next/font/google';

const display = Fraunces({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-display' });
const sans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' });

export const metadata = { title: 'UBUNTU', description: 'We live for His Glory. The people we have helped.'};

const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Header />
        {children}
       <footer>&copy; UBUNTU. We live for His Glory.</footer>
      </body>
    </html>
  );
}