import { Body } from "@react-email/body";
import { Container } from "@react-email/container";
import { Head } from "@react-email/head";
import { Heading } from "@react-email/heading";
import { Hr } from "@react-email/hr";
import { Html } from "@react-email/html";
import { Link } from "@react-email/link";
import { Preview } from "@react-email/preview";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import { env } from "next-runtime-env";
import * as React from "react";

interface CardItem {
  title: string;
  listName: string;
  dueDate?: string;
  labels?: string[];
  url: string;
}

interface DigestTemplateProps {
  userName?: string;
  workspaceName?: string;
  boardName?: string;
  cards?: CardItem[];
  subscriptionType?: string;
  filterDescription?: string;
  unsubscribeUrl?: string;
}

export const DigestTemplate = ({
  userName = "there",
  workspaceName = "Your Workspace",
  boardName,
  cards = [],
  subscriptionType = "digest",
  filterDescription,
  unsubscribeUrl,
}: DigestTemplateProps) => {
  const baseUrl = env("NEXT_PUBLIC_BASE_URL") ?? "http://localhost:3000";
  const appName = env("EMAIL_APP_NAME") ?? "kan.bn";
  const cardCount = cards.length;

  return (
    <Html>
      <Head />
      <Preview>
        {cardCount > 0
          ? `You have ${cardCount} card${cardCount !== 1 ? "s" : ""} in your digest`
          : "Your Kan digest summary"}
      </Preview>
      <Body style={{ backgroundColor: "#f6f9fc" }}>
        <Container
          style={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
            margin: "auto",
            padding: "20px",
            maxWidth: "600px",
          }}
        >
          {/* Header */}
          <Heading
            style={{
              marginTop: "30px",
              marginBottom: "10px",
              fontSize: "24px",
              fontWeight: "bold",
              color: "#232323",
            }}
          >
            {appName}
          </Heading>

          {/* Greeting */}
          <Text
            style={{
              fontSize: "16px",
              color: "#232323",
              marginBottom: "5px",
            }}
          >
            Hi {userName},
          </Text>

          <Text
            style={{
              fontSize: "14px",
              color: "#666",
              marginBottom: "20px",
            }}
          >
            Here&apos;s your {subscriptionType} summary for{" "}
            <strong>{boardName ?? workspaceName}</strong>
            {filterDescription && ` (${filterDescription})`}.
          </Text>

          {/* Cards Section */}
          {cardCount > 0 ? (
            <Section
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                padding: "20px",
                marginBottom: "20px",
              }}
            >
              <Text
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#232323",
                  marginBottom: "15px",
                }}
              >
                {cardCount} Card{cardCount !== 1 ? "s" : ""} Matching Your
                Subscription
              </Text>

              {cards.map((card, index) => (
                <Section
                  key={index}
                  style={{
                    borderBottom:
                      index < cards.length - 1 ? "1px solid #eee" : "none",
                    paddingBottom: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <Link
                    href={card.url}
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#0066cc",
                      textDecoration: "none",
                    }}
                  >
                    {card.title}
                  </Link>
                  <Text
                    style={{
                      fontSize: "12px",
                      color: "#888",
                      margin: "4px 0 0 0",
                    }}
                  >
                    in {card.listName}
                    {card.dueDate && ` • Due: ${card.dueDate}`}
                  </Text>
                  {card.labels && card.labels.length > 0 && (
                    <Text
                      style={{
                        fontSize: "11px",
                        color: "#666",
                        margin: "4px 0 0 0",
                      }}
                    >
                      Labels: {card.labels.join(", ")}
                    </Text>
                  )}
                </Section>
              ))}
            </Section>
          ) : (
            <Section
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                padding: "20px",
                marginBottom: "20px",
                textAlign: "center",
              }}
            >
              <Text
                style={{
                  fontSize: "14px",
                  color: "#888",
                }}
              >
                No cards match your subscription filters at this time.
              </Text>
            </Section>
          )}

          {/* Footer */}
          <Hr
            style={{
              marginTop: "30px",
              marginBottom: "20px",
              borderWidth: "1px",
              borderColor: "#eee",
            }}
          />
          <Text style={{ fontSize: "12px", color: "#999" }}>
            You received this email because you have an active notification
            subscription. You can manage your subscriptions in{" "}
            <Link
              href={`${baseUrl}/settings/notifications`}
              style={{ color: "#999", textDecoration: "underline" }}
            >
              Settings
            </Link>
            {unsubscribeUrl && (
              <>
                {" or "}
                <Link
                  href={unsubscribeUrl}
                  style={{ color: "#999", textDecoration: "underline" }}
                >
                  unsubscribe
                </Link>
              </>
            )}
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default DigestTemplate;
