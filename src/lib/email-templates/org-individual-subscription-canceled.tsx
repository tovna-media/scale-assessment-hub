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
    <Preview>
      Your individual subscription was canceled — {orgName} added you to their team.
    </Preview>
    <Body style={brandStyles.main}>
      <Container style={brandStyles.container}>
        <Section style={brandStyles.header}>
          <Img src={LOGO_URL} alt="Fully Resourced" style={brandStyles.logo} />
        </Section>
        <Heading style={brandStyles.h1}>Your individual plan is canceled</Heading>
        <Text style={brandStyles.body}>
          Your individual Fully Resourced subscription has been canceled because {orgName} added you
          to their team. You no longer need to pay individually — your full access continues through{" "}
          {orgName}'s plan, and nothing about your account, assessments, or gap report has changed.
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
  subject: "Your individual Fully Resourced subscription is canceled",
  displayName: "Individual subscription canceled (merged into org)",
  previewData: { orgName: "Acme Leadership" },
} satisfies TemplateEntry;
