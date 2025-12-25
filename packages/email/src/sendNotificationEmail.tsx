import { render } from "@react-email/render";
import nodemailer from "nodemailer";

import { logger } from "@kan/logger";

import CardChangeTemplate from "./templates/card-change";
import DigestTemplate from "./templates/digest";

// Reuse the transporter from sendEmail
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure:
    process.env.SMTP_SECURE === undefined
      ? true
      : process.env.SMTP_SECURE.toLowerCase() === "true",
  tls: {
    rejectUnauthorized:
      process.env.SMTP_REJECT_UNAUTHORIZED === undefined
        ? true
        : process.env.SMTP_REJECT_UNAUTHORIZED.toLowerCase() === "true",
  },
  ...(process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD && {
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    }),
});

// Types for digest emails
export interface DigestCard {
  title: string;
  listName: string;
  dueDate?: string;
  labels?: string[];
  url: string;
}

export interface DigestEmailData {
  userName: string;
  workspaceName: string;
  boardName?: string;
  cards: DigestCard[];
  filterDescription?: string;
}

// Types for card change emails
export interface CardChangeEmailData {
  userName: string;
  cardTitle: string;
  cardUrl: string;
  boardName: string;
  listName: string;
  changeType: string;
  changeDescription?: string;
  changedBy: string;
  timestamp?: string;
}

/**
 * Send a digest notification email.
 */
export const sendDigestEmail = async (
  to: string,
  data: DigestEmailData,
): Promise<void> => {
  try {
    const cardCount = data.cards.length;
    const subject =
      cardCount > 0
        ? `Kan Digest: ${cardCount} card${cardCount !== 1 ? "s" : ""} in ${data.boardName ?? data.workspaceName}`
        : `Kan Digest: ${data.boardName ?? data.workspaceName}`;

    const html = await render(
      <DigestTemplate
        userName={data.userName}
        workspaceName={data.workspaceName}
        boardName={data.boardName}
        cards={data.cards}
        subscriptionType="digest"
        filterDescription={data.filterDescription}
      />,
      { pretty: true },
    );

    const options = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    };

    const response = await transporter.sendMail(options);

    if (!response.accepted.length) {
      throw new Error(`Failed to send digest email: ${response.response}`);
    }

    logger.info("Digest email sent", { to, cardCount });
  } catch (error) {
    logger.error("Digest email failed", error, { to });
    throw error;
  }
};

/**
 * Send a card change notification email.
 */
export const sendCardChangeEmail = async (
  to: string,
  data: CardChangeEmailData,
): Promise<void> => {
  try {
    const subject = `Card "${data.cardTitle}" was updated`;

    const html = await render(
      <CardChangeTemplate
        userName={data.userName}
        cardTitle={data.cardTitle}
        cardUrl={data.cardUrl}
        boardName={data.boardName}
        listName={data.listName}
        changeType={data.changeType}
        changeDescription={data.changeDescription}
        changedBy={data.changedBy}
        timestamp={data.timestamp}
      />,
      { pretty: true },
    );

    const options = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    };

    const response = await transporter.sendMail(options);

    if (!response.accepted.length) {
      throw new Error(`Failed to send card change email: ${response.response}`);
    }

    logger.info("Card change email sent", {
      to,
      cardTitle: data.cardTitle,
      changeType: data.changeType,
    });
  } catch (error) {
    logger.error("Card change email failed", error, {
      to,
      cardTitle: data.cardTitle,
    });
    throw error;
  }
};
