import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/AppShell';
import { CartProvider } from '@/lib/cart';
import { UserPreferencesProvider } from '@/lib/userPreferences';
import { OrdersProvider } from '@/lib/orders';
import { ScheduledOrdersProvider } from '@/lib/scheduledOrders';
import { MiniCart } from '@/components/MiniCart';
import { PulseAssistant } from '@/components/PulseAssistant';

export const metadata: Metadata = {
  title: 'Amazon Pulse Now — From need to done in seconds',
  description:
    'Amazon Pulse Now is the AI shopping assistant for Amazon Now. Ambient, India-first, voice + photo + handwritten list aware quick commerce.',
  applicationName: 'Amazon Pulse Now',
  keywords: ['Amazon Now', 'Quick Commerce', 'Pulse Now', 'AI Shopping', 'Hackathon'],
  icons: { icon: '/logo.png', apple: '/logo.png' }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FAFAFA'
};

const themeBootScript = `
(function() {
  try {
    var raw = localStorage.getItem('pulse_prefs_v1');
    var theme = 'light';
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && (parsed.theme === 'dark' || parsed.theme === 'light')) theme = parsed.theme;
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <UserPreferencesProvider>
          <OrdersProvider>
            <ScheduledOrdersProvider>
              <CartProvider>
                <AppShell>{children}</AppShell>
                <MiniCart />
                <PulseAssistant />
              </CartProvider>
            </ScheduledOrdersProvider>
          </OrdersProvider>
        </UserPreferencesProvider>
      </body>
    </html>
  );
}
