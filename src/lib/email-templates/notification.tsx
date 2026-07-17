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
  title?: string
  message?: string
  ctaLabel?: string
  ctaUrl?: string
}

const Email = ({
  name,
  title = 'You have a new update',
  message = 'There is new activity in your account.',
  ctaLabel,
  ctaUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{title}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>FULLY RESOURCED</Text>
        </Section>
        <Heading style={h1}>{title}</Heading>
        {name ? <Text style={body}>Hi {name},</Text> : null}
        <Text style={body}>{message}</Text>
        {ctaLabel && ctaUrl ? (
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button style={button} href={ctaUrl}>
              {ctaLabel}
            </Button>
          </Section>
        ) : null}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data) => (data.title as string) || 'You have a new update',
  displayName: 'Generic notification',
  previewData: {
    name: 'Alex',
    title: 'Your coach shared feedback',
    message: 'Log in to review the notes and next steps from your coach.',
    ctaLabel: 'Open dashboard',
    ctaUrl: 'https://scale.richlohman.com/dashboard',
  },
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