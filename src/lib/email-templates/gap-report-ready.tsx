import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { LOGO_URL } from './_shared'

interface Props {
  name?: string
  reportUrl?: string
}

const Email = ({ name, reportUrl = 'https://scale.richlohman.com/dashboard' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your SCALE Gap Report is ready.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO_URL} alt="Fully Resourced" style={logo} />
        </Section>
        <Heading style={h1}>Your SCALE Gap Report is ready</Heading>
        <Text style={body}>
          {name ? `${name}, ` : ''}your personalized SCALE Gap Report is live.
          Inside you'll find your top priority gap and the highest-leverage move
          to make this week.
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={button} href={reportUrl}>
            View your report
          </Button>
        </Section>
        <Text style={footer}>
          Read it in one sitting, then pick one thing to act on. Momentum beats
          perfection.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your SCALE Gap Report is ready',
  displayName: 'Gap Report ready',
  previewData: { name: 'Alex', reportUrl: 'https://scale.richlohman.com/dashboard' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', color: '#0f1024' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const header = { borderBottom: '2px solid #2a0a64', paddingBottom: '12px', marginBottom: '24px' }
const brand = { color: '#2a0a64', fontSize: '13px', fontWeight: 700, letterSpacing: '2px', margin: 0 }
const logo = { display: 'block', height: '40px', width: 'auto' }
const h1 = { fontSize: '26px', color: '#2a0a64', margin: '8px 0 16px' }
const body = { fontSize: '16px', lineHeight: '24px', color: '#2a0a64' }
const button = {
  backgroundColor: '#5b19bf',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 600,
  textDecoration: 'none',
}
const footer = { fontSize: '13px', color: '#6b6b83', marginTop: '32px' }