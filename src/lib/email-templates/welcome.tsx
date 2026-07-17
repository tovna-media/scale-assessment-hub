import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  appUrl?: string
}

const Email = ({ name, appUrl = 'https://scale.richlohman.com' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Fully Resourced — let's build your SCALE Gap Report.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>FULLY RESOURCED</Text>
        </Section>
        <Heading style={h1}>Welcome{name ? `, ${name}` : ''} 👋</Heading>
        <Text style={body}>
          You're in. Your next step is simple: complete all three SCALE
          assessments to unlock your personalized SCALE Gap Report.
        </Text>
        <Text style={body}>
          The Gap Report shows exactly where you're leaking capacity — and what
          to do about it first.
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={button} href={`${appUrl}/dashboard`}>
            Start your assessments
          </Button>
        </Section>
        <Text style={footer}>
          Questions? Just reply to this email — we read every one.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Welcome to Fully Resourced',
  displayName: 'Welcome email',
  previewData: { name: 'Alex' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', color: '#0f1024' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const header = { borderBottom: '2px solid #2a0a64', paddingBottom: '12px', marginBottom: '24px' }
const brand = { color: '#2a0a64', fontSize: '13px', fontWeight: 700, letterSpacing: '2px', margin: 0 }
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