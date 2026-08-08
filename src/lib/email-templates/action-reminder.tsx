import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { APP_URL, LOGO_URL, brandStyles as s } from './_shared'

interface ActionItem {
  section: number
  label: string
  text: string
  due: string // pretty string, member-local
  status: 'due-soon' | 'past-due'
}

interface Props {
  name?: string
  pastDue?: ActionItem[]
  dueSoon?: ActionItem[]
}

const Email = ({ name, pastDue = [], dueSoon = [] }: Props) => {
  const greeting = name ? `Hi ${name},` : 'Hi there,'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your action steps for this week</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <Section style={s.header}>
            <Img src={LOGO_URL} alt="Fully Resourced" style={s.logo} />
          </Section>
          <Heading style={s.h1}>Your action steps</Heading>
          <Text style={s.body}>{greeting}</Text>
          <Text style={s.body}>
            Here&rsquo;s where things stand with the actions you committed to.
          </Text>

          {pastDue.length > 0 && (
            <>
              <Text style={{ ...s.body, fontWeight: 700, marginTop: 24, color: '#a1370a' }}>
                Still open — needs your attention
              </Text>
              {pastDue.map((a, i) => (
                <Text key={`p${i}`} style={{ ...s.body, margin: '4px 0' }}>
                  • <strong>{a.label}</strong> (Section {a.section}) — was due {a.due}
                  <br />
                  <span style={{ color: '#6b6b83' }}>{a.text}</span>
                </Text>
              ))}
              <Text style={{ ...s.body, fontSize: 14, color: '#6b6b83', marginTop: 8 }}>
                Complete it, or carry it into this week from your dashboard.
              </Text>
            </>
          )}

          {dueSoon.length > 0 && (
            <>
              <Text style={{ ...s.body, fontWeight: 700, marginTop: 24 }}>Coming up</Text>
              {dueSoon.map((a, i) => (
                <Text key={`d${i}`} style={{ ...s.body, margin: '4px 0' }}>
                  • <strong>{a.label}</strong> (Section {a.section}) — due {a.due}
                  <br />
                  <span style={{ color: '#6b6b83' }}>{a.text}</span>
                </Text>
              ))}
            </>
          )}

          <Text style={{ ...s.body, marginTop: 24 }}>
            <Link href={`${APP_URL}/dashboard`} style={s.button}>
              Open your dashboard
            </Link>
          </Text>

          <Text style={s.footer}>Small consistent action beats a big push. Keep going.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Your action steps this week',
  displayName: 'Action reminder',
  previewData: {
    name: 'Jane',
    pastDue: [
      { section: 3, label: 'Skill Development', text: 'Draft weekly practice plan', due: 'Mon, Nov 3', status: 'past-due' },
    ],
    dueSoon: [
      { section: 4, label: 'Lead Others', text: 'Have alignment conversation', due: 'Fri, Nov 14', status: 'due-soon' },
    ],
  },
} satisfies TemplateEntry