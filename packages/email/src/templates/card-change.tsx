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

interface CardChangeTemplateProps {
  userName?: string;
  cardTitle?: string;
  cardUrl?: string;
  boardName?: string;
  listName?: string;
  changeType?: string;
  changeDescription?: string;
  changedBy?: string;
  timestamp?: string;
}

export const CardChangeTemplate = ({
  userName = "there",
  cardTitle = "Untitled Card",
  cardUrl = "#",
  boardName = "Board",
  listName = "List",
  changeType = "updated",
  changeDescription = "A card you're subscribed to was updated.",
  changedBy = "Someone",
  timestamp,
}: CardChangeTemplateProps) => {
  const baseUrl = env("NEXT_PUBLIC_BASE_URL") ?? "http://localhost:3000";
  const appName = env("EMAIL_APP_NAME") ?? "kan.bn";

  // Map change types to human-readable descriptions
  const getChangeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CARD_CREATE: "created",
      CARD_UPDATE: "updated",
      CARD_MOVE: "moved",
      CARD_ARCHIVE: "archived",
      TITLE_UPDATE: "renamed",
      DESCRIPTION_UPDATE: "description updated",
      DUE_DATE_ADD: "due date set",
      DUE_DATE_UPDATE: "due date changed",
      DUE_DATE_REMOVE: "due date removed",
      LABEL_ADD: "label added",
      LABEL_REMOVE: "label removed",
      MEMBER_ADD: "member added",
      MEMBER_REMOVE: "member removed",
      COMMENT_ADD: "commented on",
      CHECKLIST_ADD: "checklist added",
      CHECKLIST_COMPLETED: "checklist completed",
    };
    return labels[type] ?? "updated";
  };

  return (
    <Html>
      <Head />
      <Preview>
        Card "{cardTitle}" was {getChangeTypeLabel(changeType)}
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
            A card matching your subscription was{" "}
            {getChangeTypeLabel(changeType)}.
          </Text>

          {/* Card Details */}
          <Section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <Link
              href={cardUrl}
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "#0066cc",
                textDecoration: "none",
              }}
            >
              {cardTitle}
            </Link>

            <Text
              style={{
                fontSize: "13px",
                color: "#888",
                margin: "8px 0 0 0",
              }}
            >
              {boardName} › {listName}
            </Text>

            <Hr
              style={{
                margin: "15px 0",
                borderColor: "#eee",
              }}
            />

            <Text
              style={{
                fontSize: "14px",
                color: "#444",
                margin: "0",
              }}
            >
              <strong>{changedBy}</strong> {getChangeTypeLabel(changeType)} this
              card
              {timestamp && ` on ${timestamp}`}
            </Text>

            {changeDescription && (
              <Text
                style={{
                  fontSize: "13px",
                  color: "#666",
                  margin: "10px 0 0 0",
                  padding: "10px",
                  backgroundColor: "#f9f9f9",
                  borderRadius: "4px",
                }}
              >
                {changeDescription}
              </Text>
            )}
          </Section>

          {/* View Card Button */}
          <Section style={{ textAlign: "center", marginBottom: "20px" }}>
            <Link
              href={cardUrl}
              style={{
                display: "inline-block",
                backgroundColor: "#282828",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                textDecoration: "none",
              }}
            >
              View Card
            </Link>
          </Section>

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
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default CardChangeTemplate;
