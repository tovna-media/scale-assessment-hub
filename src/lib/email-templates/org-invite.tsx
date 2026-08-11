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
import { brandStyles, LOGO_URL } from "./_shared";

interface Props {
  orgName: string;
  actionUrl: string;
  /** New account: needs to set a password. Existing account: just link to their dashboard. */
  isNewAccount?: boolean;
}

const Email = ({ orgName, actionUrl, isNewAccount = true }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{orgName} has invited you to get full access to the Fully Resourced system.</Preview>
    <Body style={brandStyles.main}>
      <Container style={brandStyles.container}>
        <Section style={brandStyles.header}>
          <Img src={LOGO_URL} alt="Fully Resourced" style={brandStyles.logo} />
        </Section>
        <Heading style={brandStyles.h1}>{orgName} added you to their team</Heading>
        <Text style={brandStyles.body}>
          {isNewAccount ? (
            <>
              {orgName} has invited you to get full access to the Fully Resourced system. Set your
              password below to get started — it only takes a minute.
            </>
          ) : (
            <>
              {orgName} has invited you to get full access to the Fully Resourced system. You
              already have an account with us — it's now part of {orgName}'s team, so head to your
              dashboard to get started.
            </>
          )}
        </Text>
        <Section style={{ textAlign: "center", margin: "32px 0" }}>
          <Button style={brandStyles.button} href={actionUrl}>
            {isNewAccount ? "Set your password" : "Go to your dashboard"}
          </Button>
        </Section>
        <Text style={brandStyles.footer}>
          If the button doesn't work, copy and paste this link into your browser: {actionUrl}
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `${data.orgName ?? "Your team"} has invited you to Fully Resourced`,
  displayName: "Organization invite",
  previewData: {
    orgName: "Acme Leadership",
    actionUrl: "https://app.getfullyresourced.com/set-password/example-token",
    isNewAccount: true,
  },
} satisfies TemplateEntry;
