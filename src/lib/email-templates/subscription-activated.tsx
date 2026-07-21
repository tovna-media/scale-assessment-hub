import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { brandStyles as s, APP_URL } from './_shared'

interface Props {
  name?: string
  plan?: string
  appUrl?: string
}

const Email = ({ name, plan, appUrl = APP_URL }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Get Fully Resourced subscription is active.</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.header}><Text style={s.brand}>FULLY RESOURCED</Text></Section>
        <Heading style={s.h1}>You're in{name ? `, ${name}` : ''} 🎉</Heading>
        <Text style={s.body}>
          Your {plan ? `${plan} ` : ''}subscription is active. Every section of the
          Optimized Leader Guide, the Fully Resourced AI Coach, and your SCALE Gap
          Reports are now unlocked.
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={s.button} href={`${appUrl}/dashboard`}>Open your dashboard</Button>
        </Section>
        <Text style={s.footer}>Pick the next section and keep momentum.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: "You're in — Get Fully Resourced is active",
  displayName: 'Subscription activated',
  previewData: { name: 'Alex', plan: 'Monthly' },
} satisfies TemplateEntry