import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { brandStyles as s, APP_URL, LOGO_URL } from './_shared'

interface Props {
  name?: string
  amount?: string
  appUrl?: string
}

const Email = ({ name, amount, appUrl = APP_URL }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment received — you're all set with Fully Resourced.</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.header}><Img src={LOGO_URL} alt="Fully Resourced" style={s.logo} /></Section>
        <Heading style={s.h1}>Payment received {name ? `— thanks, ${name}` : ''}</Heading>
        <Text style={s.body}>
          Your account is active{amount ? ` (${amount})` : ''}.
          You now have full access to the Optimized Leader Guide, the Fully Resourced AI Coach,
          and unlimited SCALE Gap Reports.
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={s.button} href={`${appUrl}/dashboard`}>Go to your dashboard</Button>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Payment received — Fully Resourced',
  displayName: 'Payment succeeded',
  previewData: { name: 'Alex', amount: '$97.00' },
} satisfies TemplateEntry