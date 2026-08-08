import React from "react";
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
} from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { brandStyles as s, APP_URL, LOGO_URL } from "./_shared";

interface Props {
  name?: string;
  appUrl?: string;
}

const Email = ({ name, appUrl = APP_URL }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Get Fully Resourced account is active.</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.header}>
          <Img src={LOGO_URL} alt="Fully Resourced" style={s.logo} />
        </Section>
        <Heading style={s.h1}>You're in{name ? `, ${name}` : ""} 🎉</Heading>
        <Text style={s.body}>
          Your account is active. Every section of the Optimized Leader Guide, the Fully Resourced
          AI Coach, and your SCALE Gap Reports are now unlocked.
        </Text>
        <Section style={{ textAlign: "center", margin: "32px 0" }}>
          <Button style={s.button} href={`${appUrl}/dashboard`}>
            Open your dashboard
          </Button>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "You're in. Your free Fully Resourced account is active.",
  displayName: "Subscription activated",
  previewData: { name: "Alex" },
} satisfies TemplateEntry;
