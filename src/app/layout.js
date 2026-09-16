export const metadata = {
  title: 'Solana Rent Reclaim',
  description: 'Scan and claim trapped SOL rent from empty token accounts.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#0f172a', color: '#f8fafc' }}>
        {children}
      </body>
    </html>
  )
}
