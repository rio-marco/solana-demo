import './globals.css';

export const metadata = {
  title: 'Solana SOL Deposit & Withdrawal System',
  description: 'Solana SOL deposit & withdrawal demo application built with Next.js.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-100 text-slate-900 antialiased font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}
