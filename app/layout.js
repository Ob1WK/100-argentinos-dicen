import { Anton, Oswald } from 'next/font/google';
import './globals.css';

const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton' });
const oswald = Oswald({ weight: ['400', '500', '600', '700'], subsets: ['latin'], variable: '--font-oswald' });

export const metadata = {
  title: '100 Argentinos Dicen',
  description: 'Tablero de juego con panel de operador',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#020a2e',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-AR" className={`${anton.variable} ${oswald.variable}`}>
      <body>{children}</body>
    </html>
  );
}
