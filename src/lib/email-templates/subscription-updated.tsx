import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { brandStyles as s, APP_URL } from './_shared'

interface Props {
  name?: string
  plan?: string
  changeType?: 'upgrade' | 'downgrade' | 'change'
  appUrl?: string
}

const Email = ({ name, plan, changeType = 'change', appUrl = APP_URL }: Props) => {
  const verb = changeType === 'upgrade' ? 'upgraded' : changeType === 'downgrade' ? 'changed' : 'updated'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Get Fully Resourced plan has been {verb}.</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <Section style={s.header}><Text style={s.brand}>FULLY RESOURCED</Text></Section>
          <Heading style={s.h1}>Your plan was {verb}</Heading>
          <Text style={s.body}>
            {name ? `${name}, ` : ''}your subscription is now on the
            {plan ? ` ${plan} ` : ' new '}plan. Changes are reflected in your account immediately.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button style={s.button} href={`${appUrl}/dashboard`}>Manage subscription</Button>
          </Section>
          <Text style={s.footer}>Questions about billing? Just reply to this email.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Your Get Fully Resourced plan was updated',
  displayName: 'Subscription updated',
  previewData: { name: 'Alex', plan: 'Annual', changeType: 'upgrade' as const },
} satisfies TemplateEntry