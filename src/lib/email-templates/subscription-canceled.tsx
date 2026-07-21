import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { brandStyles as s, APP_URL } from './_shared'

interface Props {
  name?: string
  endsAt?: string
  appUrl?: string
}

const Email = ({ name, endsAt, appUrl = APP_URL }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your subscription has been canceled.</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.header}><Text style={s.brand}>FULLY RESOURCED</Text></Section>
        <Heading style={s.h1}>Your subscription is canceled</Heading>
        <Text style={s.body}>
          {name ? `${name}, ` : ''}your Get Fully Resourced subscription has been canceled
          {endsAt ? ` and access remains until ${endsAt}` : ''}. Your assessments and
          past Gap Reports stay in your account.
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={s.button} href={`${appUrl}/dashboard`}>Reactivate anytime</Button>
        </Section>
        <Text style={s.footer}>If this was a mistake, reply and we'll sort it out.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your Get Fully Resourced subscription is canceled',
  displayName: 'Subscription canceled',
  previewData: { name: 'Alex', endsAt: 'Dec 31, 2026' },
} satisfies TemplateEntry