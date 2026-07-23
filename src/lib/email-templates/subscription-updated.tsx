import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { brandStyles as s, APP_URL, LOGO_URL } from './_shared'

interface Props {
  name?: string
  changeType?: 'upgrade' | 'downgrade' | 'change'
  appUrl?: string
}

const Email = ({ name, changeType = 'change', appUrl = APP_URL }: Props) => {
  const verb = changeType === 'upgrade' ? 'upgraded' : changeType === 'downgrade' ? 'changed' : 'updated'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Get Fully Resourced subscription has been {verb}.</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <Section style={s.header}><Img src={LOGO_URL} alt="Fully Resourced" style={s.logo} /></Section>
          <Heading style={s.h1}>Your subscription was {verb}</Heading>
          <Text style={s.body}>
            {name ? `${name}, ` : ''}your Get Fully Resourced subscription has been {verb}.
            Changes are reflected in your account immediately.
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
  subject: 'Your Get Fully Resourced subscription was updated',
  displayName: 'Subscription updated',
  previewData: { name: 'Alex', changeType: 'upgrade' as const },
} satisfies TemplateEntry