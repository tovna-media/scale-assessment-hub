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
import { APP_URL, brandStyles, LOGO_URL } from "./_shared";

interface Props {
  orgName: string;
  appUrl?: string;
}

const Email = ({ orgName, appUrl = APP_URL }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been removed from {orgName}'s team on Fully Resourced.</Preview>
    <Body style={brandStyles.main}>
      <Container style={brandStyles.container}>
        <Section style={brandStyles.header}>
          <Img src={LOGO_URL} alt="Fully Resourced" style={brandStyles.logo} />
        </Section>
        <Heading style={brandStyles.h1}>You've been removed from {orgName}'s team</Heading>
        <Text style={brandStyles.body}>
          You've been removed from {orgName}'s team on Fully Resourced. Your account is still yours
          — your assessments and gap report are untouched — it's just moved to the free tier. You
          can reactivate full access anytime.
        </Text>
        <Section style={{ textAlign: "center", margin: "32px 0" }}>
          <Button style={brandStyles.button} href={`${appUrl}/dashboard`}>
            Go to your dashboard
          </Button>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `You've been removed from ${data.orgName ?? "your organization"}'s team`,
  displayName: "Removed from organization",
  previewData: { orgName: "Acme Leadership" },
} satisfies TemplateEntry;
