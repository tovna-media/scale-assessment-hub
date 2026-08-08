export const brandStyles = {
  main: { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', color: '#0f1024' },
  container: { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' },
  header: { borderBottom: '2px solid #2a0a64', paddingBottom: '16px', marginBottom: '24px' },
  brand: { color: '#2a0a64', fontSize: '13px', fontWeight: 700, letterSpacing: '2px', margin: 0 },
  logo: { display: 'block', height: '40px', width: 'auto' },
  h1: { fontSize: '26px', color: '#2a0a64', margin: '8px 0 16px' },
  body: { fontSize: '16px', lineHeight: '24px', color: '#2a0a64' },
  button: {
    backgroundColor: '#5b19bf',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    textDecoration: 'none',
  },
  footer: { fontSize: '13px', color: '#6b6b83', marginTop: '32px' },
} as const

export const APP_URL = 'https://app.getfullyresourced.com'

export const LOGO_URL = 'https://app.getfullyresourced.com/logo-light.png'