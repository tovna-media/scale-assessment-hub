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
import { LOGO_URL } from "./_shared";

interface Props {
  name?: string;
  signInUrl?: string;
}

const Email = ({ name, signInUrl = "https://app.getfullyresourced.com" }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Leaders Edge access is active — sign in here.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO_URL} alt="Fully Resourced" style={logo} />
        </Section>
        <Heading style={h1}>You're in{name ? `, ${name}` : ""}</Heading>
        <Text style={body}>
          Your Leaders Edge access is active — the full Fully Resourced app is yours free for the
          next 3 months. Use the button below to sign in; it logs you straight into the app, where
          you can set a password any time from your profile.
        </Text>
        <Section style={{ textAlign: "center", margin: "32px 0" }}>
          <Button style={button} href={signInUrl}>
            Sign in to the app
          </Button>
        </Section>
        <Text style={body}>
          Your first step: complete the three SCALE assessments to unlock your personalized Gap
          Report, then work your 12-week cycle at your own pace.
        </Text>
        <Text style={footer}>
          If the button doesn't work, copy and paste this link into your browser: {signInUrl}
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "Your Leaders Edge access is active",
  displayName: "Leaders Edge access",
  previewData: { name: "Alex", signInUrl: "https://app.getfullyresourced.com" },
} satisfies TemplateEntry;

const main = {
  backgroundColor: "#ffffff",
  fontFamily: "Inter, Arial, sans-serif",
  color: "#0f1024",
};
const container = { maxWidth: "560px", margin: "0 auto", padding: "32px 24px" };
const header = { borderBottom: "2px solid #2a0a64", paddingBottom: "12px", marginBottom: "24px" };
const logo = { display: "block", height: "40px", width: "auto" };
const h1 = { fontSize: "26px", color: "#2a0a64", margin: "8px 0 16px" };
const body = { fontSize: "16px", lineHeight: "24px", color: "#2a0a64" };
const button = {
  backgroundColor: "#5b19bf",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "8px",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
};
const footer = {
  fontSize: "13px",
  color: "#6b6b83",
  marginTop: "32px",
  wordBreak: "break-all" as const,
};
