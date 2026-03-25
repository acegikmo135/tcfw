import { adminMessaging as messaging } from "./admin-db.js";

/**
 * Sends a transaction notification to a specific user token.
 * Uses the Firebase Admin SDK v1 API (messaging().send()).
 * 
 * @param userToken The FCM token of the recipient device.
 * @param amount The transaction amount.
 * @param status The status of the transaction (e.g., 'success', 'pending').
 */
export async function sendTransactionNotification(userToken: string, amount: number, status: string) {
  const message = {
    token: userToken,
    notification: {
      title: 'Transaction Successful',
      body: `A transaction of ₹${amount} has been recorded successfully.`,
    },
    data: {
      type: 'TRANSACTION',
      amount: amount.toString(),
      status: status,
      click_action: 'FLUTTER_NOTIFICATION_CLICK', // Common for mobile, or custom for web
    },
    webpush: {
      fcmOptions: {
        link: '/transactions'
      }
    }
  };

  try {
    const response = await messaging.send(message);
    console.log('Successfully sent transaction notification:', response);
    return response;
  } catch (error) {
    console.error('Error sending transaction notification:', error);
    throw error;
  }
}

/**
 * Sends a notification for a new notice.
 */
export async function sendNoticeNotification(tokens: string[], title: string, body: string) {
  if (tokens.length === 0) return;

  // For multiple tokens, we use sendEach
  const messages = tokens.map(token => ({
    token,
    notification: {
      title: `New Notice: ${title}`,
      body: body.length > 100 ? body.substring(0, 97) + '...' : body,
    },
    data: {
      type: 'NOTICE',
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    },
    webpush: {
      fcmOptions: {
        link: '/notices'
      }
    }
  }));

  try {
    const response = await messaging.sendEach(messages);
    console.log('Successfully sent notice notifications:', response.successCount);
    return response;
  } catch (error) {
    console.error('Error sending notice notifications:', error);
    throw error;
  }
}

/**
 * Sends a notification for a new comment.
 */
export async function sendCommentNotification(userToken: string, transactionId: string, commenterName: string) {
  const message = {
    token: userToken,
    notification: {
      title: 'New Comment',
      body: `${commenterName} commented on your transaction.`,
    },
    data: {
      type: 'COMMENT',
      transactionId: transactionId,
    },
    webpush: {
      fcmOptions: {
        link: `/transactions?id=${transactionId}`
      }
    }
  };

  try {
    const response = await messaging.send(message);
    console.log('Successfully sent comment notification:', response);
    return response;
  } catch (error) {
    console.error('Error sending comment notification:', error);
    throw error;
  }
}
